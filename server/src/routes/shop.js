const express = require('express');
const Bot = require('../models/Bot');
const Order = require('../models/Order');
const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const { authenticate } = require('../middleware/auth');
const usdtVerifier = require('../services/usdtVerifier');
const sebpay = require('../services/sebpayService');
const shopFulfill = require('../services/shopFulfill');

const router = express.Router();

// ─── PUBLIC: Get all robots available for sale ──────────────────────
router.get('/robots', async (req, res) => {
  try {
    const { category, sort, search, vendor } = req.query;
    const query = { isActive: true, price: { $gt: 0 }, listingStatus: 'approved' };

    if (category) {
      if (category === 'mt4') query.platforms = 'mt4';
      else if (category === 'mt5') query.platforms = 'mt5';
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tier: new RegExp(search, 'i') },
      ];
    }

    if (vendor) {
      query.vendor = vendor;
    }

    let sortOption = { order: 1, createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    else if (sort === 'price_desc') sortOption = { price: -1 };
    else if (sort === 'popular') sortOption = { totalUsers: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };

    const robots = await Bot.find(query)
      .select('-robotFile') // Don't expose robot file to public
      .sort(sortOption)
      .populate('vendor', 'firstName lastName');

    res.json({ robots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUBLIC: List approved vendors for filters ───────────────────────
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await VendorProfile.find({ status: 'approved' })
      .select('displayName slug user')
      .populate('user', 'firstName lastName');
    res.json({ vendors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUBLIC: Get single vendor public profile + robots (by slug or userId) ───────────────
router.get('/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await VendorProfile.findOne({
      status: 'approved',
      $or: [
        { slug: id },
        { user: id },
      ],
    })
      .populate('user', 'firstName lastName');
    if (!profile) return res.status(404).json({ error: 'Vendor not found.' });

    const robots = await Bot.find({ vendor: profile.user, isActive: true, price: { $gt: 0 }, listingStatus: 'approved' })
      .select('-robotFile')
      .sort({ createdAt: -1 })
      .populate('vendor', 'firstName lastName');

    res.json({ vendor: profile, robots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUBLIC: Get single robot details ───────────────────────────────
router.get('/robots/:slug', async (req, res) => {
  try {
    const robot = await Bot.findOne({ slug: req.params.slug, isActive: true })
      .select('-robotFile');
    if (!robot) return res.status(404).json({ error: 'Robot not found.' });
    res.json({ robot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AUTH: Create order (checkout) ──────────────────────────────────
router.post('/orders', authenticate, async (req, res) => {
  try {
    const {
      items, paymentMethod,
      transactionHash,                                   // USDT (auto-vérif immédiate si fourni)
      mobileMoneyProvider, mobileMoneyNumber, mobileMoneyCountry, mobileMoneyOtp,
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Votre panier est vide.' });
    }

    if (!['usdt_trc20', 'binance_pay', 'mobile_money'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Méthode de paiement invalide. Choisissez USDT (TRC-20), Binance Pay ou Mobile Money.' });
    }

    // Validate all items exist and get current prices
    const botIds = items.map(i => i.botId);
    const bots = await Bot.find({ _id: { $in: botIds }, isActive: true });

    if (bots.length !== items.length) {
      return res.status(400).json({ error: 'Un ou plusieurs robots sont indisponibles.' });
    }

    // Check if user already owns any of these robots
    const user = await User.findById(req.user._id);
    const alreadyOwned = bots.filter(b => user.purchasedBots?.includes(b._id.toString()));
    if (alreadyOwned.length > 0) {
      return res.status(400).json({
        error: `Vous possédez déjà : ${alreadyOwned.map(b => b.name).join(', ')}`,
      });
    }

    // Build order items with server-side prices (prevent price manipulation)
    const orderItems = bots.map(bot => ({
      bot: bot._id,
      name: bot.name,
      price: bot.price,
      slug: bot.slug,
      vendor: bot.vendor || null,
    }));

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price, 0);

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      totalAmount,
      paymentMethod,
      mobileMoneyProvider: paymentMethod === 'mobile_money' ? (mobileMoneyProvider || '') : '',
      mobileMoneyNumber: paymentMethod === 'mobile_money' ? (mobileMoneyNumber || '') : '',
    });

    // ── Mobile Money : encaissement automatique via SebPay ──
    if (paymentMethod === 'mobile_money') {
      if (!sebpay.isConfigured()) {
        await Order.deleteOne({ _id: order._id });
        return res.status(503).json({ error: 'Le paiement Mobile Money est momentanément indisponible.' });
      }
      if (!mobileMoneyNumber || !mobileMoneyProvider) {
        await Order.deleteOne({ _id: order._id });
        return res.status(400).json({ error: 'Numéro et opérateur Mobile Money requis.' });
      }
      try {
        const collection = await sebpay.initCollection({
          amountUsd: totalAmount,
          phone: mobileMoneyNumber,
          operator: mobileMoneyProvider,
          country: mobileMoneyCountry || 'BJ',
          externalRef: `order_${order._id}`,
          otpCode: mobileMoneyOtp,
        });
        order.sebpayTransactionId = collection.transactionId;
        await order.save();
        return res.status(201).json({
          order,
          paymentInstructions: { method: 'Mobile Money', providerLink: collection.providerLink, amountXof: collection.amount, currency: 'XOF' },
          message: 'Demande de paiement Mobile Money envoyée. Validez sur votre téléphone.',
        });
      } catch (err) {
        await Order.deleteOne({ _id: order._id });
        return res.status(502).json({ error: `Échec de l'initiation du paiement Mobile Money: ${err.message}` });
      }
    }

    // ── USDT : auto-vérif on-chain immédiate si un hash est fourni ──
    if (paymentMethod === 'usdt_trc20' && transactionHash && usdtVerifier.isConfigured()) {
      const dup = await Order.findOne({ _id: { $ne: order._id }, transactionHash, paymentStatus: 'confirmed' });
      if (!dup) {
        const check = await usdtVerifier.verifyPayment({ txHash: transactionHash, expectedUsd: totalAmount });
        if (check.ok) {
          order.transactionHash = transactionHash;
          await order.save();
          const confirmed = await shopFulfill.confirmOrderPaid(order._id, { txRef: transactionHash, note: 'USDT on-chain auto' });
          return res.status(201).json({ order: confirmed, confirmed: true, message: 'Paiement USDT confirmé. Robots débloqués !' });
        }
      }
    }

    // Return payment instructions based on method
    const PlatformSettings = require('../models/PlatformSettings');
    const settings = await PlatformSettings.findOne({ key: 'main' });

    let paymentInstructions = {};
    if (paymentMethod === 'usdt_trc20') {
      paymentInstructions = {
        method: 'USDT (TRC-20)',
        address: process.env.USDT_TRON_ADDRESS || settings?.usdtTronAddress || '',
        amount: totalAmount,
        currency: 'USDT',
        autoVerify: usdtVerifier.isConfigured(),
        note: `Envoyez exactement $${totalAmount} USDT (TRC-20) à l'adresse ci-dessus. Collez le hash de la transaction pour confirmer.`,
      };
    } else {
      paymentInstructions = {
        method: 'Binance Pay',
        binanceId: process.env.BINANCE_PAY_ID || settings?.binancePayId || '',
        amount: totalAmount,
        currency: 'USDT',
        note: `Envoyez $${totalAmount} via Binance Pay à l'ID ci-dessus. Collez l'ID de transaction pour confirmer.`,
      };
    }

    res.status(201).json({
      order,
      paymentInstructions,
      message: 'Commande créée. Veuillez effectuer le paiement.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AUTH: Submit payment proof for order ───────────────────────────
router.put('/orders/:id/pay', authenticate, async (req, res) => {
  try {
    const { transactionHash, binanceOrderId, paymentProof } = req.body;

    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    if (order.paymentStatus !== 'pending') {
      return res.status(400).json({ error: 'Cette commande a déjà été traitée.' });
    }

    if (order.paymentMethod === 'usdt_trc20' && !transactionHash) {
      return res.status(400).json({ error: 'Le hash de transaction est requis.' });
    }

    if (order.paymentMethod === 'binance_pay' && !binanceOrderId) {
      return res.status(400).json({ error: 'L\'ID de commande Binance est requis.' });
    }

    order.transactionHash = transactionHash || '';
    order.binanceOrderId = binanceOrderId || '';
    order.paymentProof = paymentProof || '';
    await order.save();

    res.json({ order, message: 'Preuve de paiement soumise. En attente de confirmation par l\'administrateur.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AUTH: Verify USDT payment on-chain for an order ────────────────
router.put('/orders/:id/verify-usdt', authenticate, async (req, res) => {
  try {
    const { transactionHash } = req.body;
    if (!transactionHash) return res.status(400).json({ error: 'Le hash de transaction est requis.' });

    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    if (order.paymentStatus === 'confirmed') return res.json({ order, confirmed: true, message: 'Commande déjà confirmée.' });
    if (order.paymentMethod !== 'usdt_trc20') return res.status(400).json({ error: 'Cette commande n\'est pas un paiement USDT.' });
    if (!usdtVerifier.isConfigured()) return res.status(503).json({ error: 'Vérification USDT indisponible. Un admin validera votre paiement.' });

    const dup = await Order.findOne({ _id: { $ne: order._id }, transactionHash, paymentStatus: 'confirmed' });
    if (dup) return res.status(409).json({ error: 'Ce hash de transaction a déjà été utilisé.' });

    const check = await usdtVerifier.verifyPayment({ txHash: transactionHash, expectedUsd: order.totalAmount });
    if (!check.ok) return res.status(402).json({ error: check.reason || 'Paiement USDT non confirmé.' });

    order.transactionHash = transactionHash;
    await order.save();
    const confirmed = await shopFulfill.confirmOrderPaid(order._id, { txRef: transactionHash, note: 'USDT on-chain auto' });
    res.json({ order: confirmed, confirmed: true, message: 'Paiement USDT confirmé. Robots débloqués !' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AUTH: Download a purchased robot file ──────────────────────────
router.get('/robots/:id/download', authenticate, async (req, res) => {
  try {
    const botId = req.params.id;
    const user = await User.findById(req.user._id).select('purchasedBots');
    const owns = (user.purchasedBots || []).some(b => b.toString() === botId);
    if (!owns) return res.status(403).json({ error: 'Vous devez acheter ce robot avant de le télécharger.' });

    const bot = await Bot.findById(botId).select('name robotFile robotFileName robotFileType isUploaded');
    if (!bot || !bot.robotFile) return res.status(404).json({ error: 'Fichier robot indisponible. Contactez le support.' });

    // robotFile est stocké en base64 (éventuellement préfixé data:...;base64,)
    const raw = String(bot.robotFile);
    const b64 = raw.includes(',') ? raw.split(',').pop() : raw;
    const buffer = Buffer.from(b64, 'base64');
    const filename = bot.robotFileName || `${bot.slug || 'robot'}.ex5`;

    res.setHeader('Content-Type', bot.robotFileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AUTH: Get user's orders ────────────────────────────────────────
router.get('/orders', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.bot', 'name slug icon color');
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AUTH: Get user's purchased robots ──────────────────────────────
router.get('/my-robots', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('purchasedBots', '-robotFile');
    res.json({ robots: user.purchasedBots || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
