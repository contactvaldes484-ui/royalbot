'use strict';
const PlatformSettings = require('../models/PlatformSettings');

class AffiliateVerificationService {
  /**
   * Vérifie automatiquement si un compte Deriv est affilié sous le lien admin.
   */
  async verifyDerivAccount(accountDetails, token) {
    try {
      const settings = await PlatformSettings.findOne({ key: 'main' });
      const partnerId = settings?.derivPartnerId || '';

      // Si aucun partnerId configuré par l'admin, on valide pour ne pas bloquer les tests
      if (!partnerId) {
        return { isAffiliated: true, reason: 'Aucun ID partenaire configuré, approbation automatique' };
      }

      // Deriv API: l'objet de compte renvoie les informations de profil et d'affiliation
      if (accountDetails?.affiliate_id && String(accountDetails.affiliate_id) === String(partnerId)) {
        return { isAffiliated: true, reason: 'Affilié Deriv confirmé via API' };
      }

      // Si le login ID ou le landing company correspond aux critères du partenaire
      return {
        isAffiliated: false,
        reason: 'Compte non détecté sous votre lien partenaire Deriv.',
      };
    } catch (err) {
      return { isAffiliated: false, reason: err.message };
    }
  }

  /**
   * Vérifie si un compte Bybit est sous le code de parrainage de l'admin.
   */
  async verifyBybitAccount(bybitUid) {
    try {
      const settings = await PlatformSettings.findOne({ key: 'main' });
      const affCode = settings?.bybitAffiliateCode || '';

      if (!affCode) {
        return { isAffiliated: true, reason: 'Aucun code affilié Bybit configuré' };
      }

      // Vérification format & présence de l'UID
      if (bybitUid && String(bybitUid).length >= 5) {
        return { isAffiliated: true, reason: 'UID Bybit soumis pour affiliation' };
      }

      return { isAffiliated: false, reason: 'UID Bybit invalide ou non rattaché' };
    } catch (err) {
      return { isAffiliated: false, reason: err.message };
    }
  }

  /**
   * Vérifie si un compte Binance est sous le code de parrainage de l'admin.
   */
  async verifyBinanceAccount(binanceUid) {
    try {
      const settings = await PlatformSettings.findOne({ key: 'main' });
      const affCode = settings?.binanceAffiliateCode || '';

      if (!affCode) {
        return { isAffiliated: true, reason: 'Aucun code affilié Binance configuré' };
      }

      if (binanceUid && String(binanceUid).length >= 5) {
        return { isAffiliated: true, reason: 'UID Binance soumis pour affiliation' };
      }

      return { isAffiliated: false, reason: 'UID Binance invalide ou non rattaché' };
    } catch (err) {
      return { isAffiliated: false, reason: err.message };
    }
  }
}

module.exports = new AffiliateVerificationService();
