/**
 * Webhooks de paiement (entrants, non authentifiés par JWT).
 *
 * ⚠️ Cette route DOIT être montée AVANT le body-parser JSON global (index.js),
 * avec express.raw(), car la vérification HMAC de SebPay se fait sur le corps BRUT.
 *
 * SebPay POST /api/webhooks/sebpay :
 *   headers: X-SebPay-Signature (HMAC-SHA256 hex du body, clé secrète)
 *   body: { transaction_id, external_reference, status, amount, currency, ... }
 *   external_reference convention interne :
 *     - "sub_<subscriptionId>"   → abonnement
 *     - "order_<orderId>"        → commande marketplace (Phase 4)
 */
const express = require('express');
const sebpay = require('../services/sebpayService');
const subService = require('../services/subscriptionService');
const Subscription = require('../models/Subscription');

const router = express.Router();

router.post('/sebpay', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const signature = req.get('X-SebPay-Signature');
    const rawBody = req.body; // Buffer (express.raw)

    if (!sebpay.verifySignature(rawBody, signature)) {
      console.warn('⚠️  Webhook SebPay: signature invalide, rejeté.');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { external_reference: ref, status, transaction_id } = payload;
    // On répond 200 rapidement ; on n'agit que sur les statuts finaux "approved".
    if (!ref) return res.status(200).json({ received: true });

    const approved = String(status).toLowerCase() === 'approved';

    if (ref.startsWith('sub_')) {
      const subId = ref.slice(4);
      const sub = await Subscription.findById(subId).catch(() => null);
      if (!sub) return res.status(200).json({ received: true, note: 'sub introuvable' });

      if (approved) {
        // Idempotent : confirmPendingSubscription renvoie tel quel si déjà confirmé.
        await subService.confirmPendingSubscription(subId, {
          txHash: transaction_id,
          adminNote: 'Confirmé automatiquement via webhook SebPay',
        });
      } else if (String(status).toLowerCase() === 'rejected') {
        if (sub.paymentStatus === 'pending') {
          sub.paymentStatus = 'failed';
          sub.cancelReason = 'Paiement Mobile Money rejeté (SebPay)';
          await sub.save();
        }
      }
      return res.status(200).json({ received: true });
    }

    if (ref.startsWith('order_')) {
      // Traité en Phase 4 (marketplace). On acquitte pour éviter les retries.
      try {
        const shopFulfill = require('../services/shopFulfill');
        if (shopFulfill?.handleSebpayWebhook) {
          await shopFulfill.handleSebpayWebhook({ ref, status, transaction_id, payload });
        }
      } catch { /* module pas encore présent : on acquitte quand même */ }
      return res.status(200).json({ received: true });
    }

    return res.status(200).json({ received: true, note: 'ref non reconnue' });
  } catch (err) {
    console.error('Webhook SebPay error:', err.message);
    // On renvoie 200 pour éviter des retries en boucle sur erreur interne non-critique.
    return res.status(200).json({ received: true, error: err.message });
  }
});

module.exports = router;
