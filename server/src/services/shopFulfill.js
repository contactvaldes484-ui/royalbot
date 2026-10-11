'use strict';
/**
 * shopFulfill — confirmation & attribution des commandes marketplace.
 * Centralise la logique partagée entre : confirmation admin, vérif USDT auto,
 * et webhook Mobile Money (SebPay). Idempotent.
 */
const Order = require('../models/Order');
const User = require('../models/User');
const Bot = require('../models/Bot');
const VendorProfile = require('../models/VendorProfile');

/**
 * Confirme une commande payée : marque confirmée, attribue les robots à l'acheteur,
 * crédite les vendeurs. Ne fait rien si déjà confirmée.
 * @returns {Promise<Order|null>}
 */
async function confirmOrderPaid(orderId, { confirmedBy = null, txRef = null, note = null } = {}) {
  const order = await Order.findById(orderId).populate('items.bot');
  if (!order) return null;
  if (order.paymentStatus === 'confirmed') return order; // idempotent

  const vendorTotals = {};
  const vendorSalesCount = {};
  for (const item of order.items) {
    const bot = item.bot;
    if (bot && bot.vendor) {
      const rate = typeof bot.commissionRate === 'number' ? bot.commissionRate : 0;
      const platformCommission = rate > 0 ? (item.price * rate) / 100 : 0;
      const vendorRevenue = item.price - platformCommission;
      item.vendor = bot.vendor;
      item.vendorRevenue = vendorRevenue;
      item.platformCommission = platformCommission;
      const vId = bot.vendor.toString();
      vendorTotals[vId] = (vendorTotals[vId] || 0) + vendorRevenue;
      vendorSalesCount[vId] = (vendorSalesCount[vId] || 0) + 1;
    }
  }

  order.paymentStatus = 'confirmed';
  if (confirmedBy) order.confirmedBy = confirmedBy;
  order.confirmedAt = new Date();
  if (txRef && !order.transactionHash && !order.sebpayTransactionId) order.transactionHash = txRef;
  if (note) order.adminNotes = note;
  await order.save();

  const botIds = order.items.map(i => (i.bot && i.bot._id) || i.bot);
  await User.findByIdAndUpdate(order.user, { $addToSet: { purchasedBots: { $each: botIds } } });
  for (const botId of botIds) {
    await Bot.findByIdAndUpdate(botId, { $inc: { totalUsers: 1 } });
  }

  for (const vendorId of Object.keys(vendorTotals)) {
    const amount = vendorTotals[vendorId];
    const sales = vendorSalesCount[vendorId] || 0;
    if (amount > 0) {
      await User.findByIdAndUpdate(vendorId, { $inc: { vendorEarnings: amount, vendorAvailable: amount } });
      await VendorProfile.findOneAndUpdate({ user: vendorId }, { $inc: { totalSales: sales, totalRevenue: amount } });
    }
  }

  // Notifie l'acheteur (best-effort)
  try {
    if (global.broadcastToUser) {
      global.broadcastToUser(order.user.toString(), { type: 'order_confirmed', orderId: order._id, items: order.items.map(i => i.name) });
    }
  } catch { /* noop */ }

  return order;
}

/**
 * Handler webhook SebPay pour une commande (external_reference = "order_<id>").
 */
async function handleSebpayWebhook({ ref, status, transaction_id }) {
  if (!ref || !ref.startsWith('order_')) return;
  const orderId = ref.slice(6);
  const order = await Order.findById(orderId).catch(() => null);
  if (!order) return;

  const s = String(status).toLowerCase();
  if (s === 'approved') {
    await confirmOrderPaid(orderId, { txRef: transaction_id, note: 'Confirmé via webhook SebPay' });
  } else if (s === 'rejected' && order.paymentStatus === 'pending') {
    order.paymentStatus = 'rejected';
    order.rejectionReason = 'Paiement Mobile Money rejeté (SebPay)';
    await order.save();
  }
}

module.exports = { confirmOrderPaid, handleSebpayWebhook };
