'use strict';
/**
 * emailService.js
 *
 * Service d'envoi d'emails transactionnels pour RoyalBot :
 * - Envoi automatique du fichier robot et du lien de téléchargement après achat.
 * - Guide d'installation MT4 / MT5 / Deriv inclus.
 * - Idempotent, tolérant aux pannes (enregistre une notification in-app si SMTP indisponible).
 */
const nodemailer = require('nodemailer');
const PlatformSettings = require('../models/PlatformSettings');
const Notification = require('../models/Notification');

class EmailService {
  /**
   * Crée un transporteur nodemailer à partir des variables d'environnement ou des PlatformSettings
   */
  async getTransporter() {
    let settings = null;
    try {
      settings = await PlatformSettings.findOne({ key: 'main' });
    } catch (_) {}

    const host = process.env.SMTP_HOST || settings?.smtpHost || '';
    const port = parseInt(process.env.SMTP_PORT || settings?.smtpPort || '587', 10);
    const user = process.env.SMTP_USER || settings?.smtpUser || '';
    const pass = process.env.SMTP_PASS || settings?.smtpPass || '';
    const secure = port === 465;

    if (host && user && pass) {
      return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
    }

    // Si pas de SMTP configuré, créer un transporteur de test ou null
    return null;
  }

  /**
   * Envoie le robot acheté par email à l'utilisateur
   * @param {object} user - Utilisateur acheteur ({ email, firstName, lastName, _id })
   * @param {object} order - Commande validée
   * @param {Array} bots - Liste des robots achetés (modèles Bot avec robotFile éventuel)
   */
  async sendRobotPurchaseEmail(user, order, bots = []) {
    if (!user || !user.email) return { success: false, error: 'Email utilisateur manquant.' };

    const recipientEmail = String(user.email).toLowerCase().trim();
    const recipientName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Trader';
    const clientUrl = process.env.CLIENT_URL || 'https://royalbot-navy.vercel.app';
    const serverUrl = process.env.SERVER_URL || 'https://web-production-19f31.up.railway.app';

    // Préparation des pièces jointes et des liens
    const attachments = [];
    const botItemsHtml = [];

    for (const bot of bots) {
      if (!bot) continue;
      const botName = bot.name || 'Robot de Trading';
      const fileName = bot.robotFileName || `${(bot.slug || 'robot').replace(/[^a-z0-9]/gi, '_')}.ex5`;
      const downloadUrl = `${serverUrl}/api/shop/download/${bot._id}`;

      // Si le fichier est stocké en base64, on l'ajoute en pièce jointe directe à l'email
      if (bot.robotFile && typeof bot.robotFile === 'string') {
        try {
          const cleanBase64 = bot.robotFile.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(cleanBase64, 'base64');
          if (buffer.length > 0) {
            attachments.push({
              filename: fileName,
              content: buffer,
              contentType: bot.robotFileType || 'application/octet-stream',
            });
          }
        } catch (e) {
          console.warn('[emailService] Erreur attachement fichier robot:', e.message);
        }
      }

      botItemsHtml.push(`
        <tr style="border-bottom: 1px solid #2d3748;">
          <td style="padding: 12px 8px; font-weight: bold; color: #ffffff;">${botName}</td>
          <td style="padding: 12px 8px; color: #a0aec0; text-transform: uppercase;">${(bot.platforms || ['MT5']).join(', ')}</td>
          <td style="padding: 12px 8px; color: #48bb78; font-weight: bold;">$${bot.price || order.totalAmount || 0}</td>
          <td style="padding: 12px 8px; text-align: right;">
            <a href="${downloadUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 6px 14px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px; display: inline-block;">
              📥 Télécharger
            </a>
          </td>
        </tr>
      `);
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Votre Robot RoyalBot est Prêt !</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #121827; border: 1px solid #2d3748; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #6d28d9, #4f46e5); padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                🚀 Félicitations pour votre Achat !
              </h1>
              <p style="margin: 8px 0 0 0; color: #e9d5ff; font-size: 14px;">
                Votre robot de trading automatisé est prêt à l'emploi.
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin-top: 0;">
                Bonjour <strong>${recipientName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Nous vous confirmons la réception de votre commande <strong>#${String(order._id).slice(-8).toUpperCase()}</strong>.
                ${attachments.length > 0
                  ? 'Vos fichiers de robots (.ex4 / .ex5 / .xml) sont <strong>joints directement à cet email</strong> et également téléchargeables ci-dessous.'
                  : 'Vous pouvez télécharger directement vos fichiers de robots ci-dessous.'}
              </p>

              <!-- ROBOTS TABLE -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid #4a5568; text-align: left; color: #a0aec0;">
                    <th style="padding: 8px;">Robot</th>
                    <th style="padding: 8px;">Plateforme</th>
                    <th style="padding: 8px;">Prix</th>
                    <th style="padding: 8px; text-align: right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${botItemsHtml.join('')}
                </tbody>
              </table>

              <!-- INSTRUCTIONS BOX -->
              <div style="background-color: #1a2234; border: 1px solid #2e3852; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #38bdf8; display: flex; align-items: center;">
                  📖 Guide d'installation rapide (MT4 / MT5) :
                </h3>
                <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #cbd5e1;">
                  <li>Ouvrez votre plateforme MetaTrader (MT4 ou MT5).</li>
                  <li>Cliquez sur <strong>Fichier</strong> &gt; <strong>Ouvrir le dossier des données</strong>.</li>
                  <li>Ouvrez le dossier <strong>MQL5</strong> (ou MQL4) &gt; <strong>Experts</strong>.</li>
                  <li>Collez le fichier du robot (téléchargé en pièce jointe ou via le bouton ci-dessus).</li>
                  <li>Dans MetaTrader, faites clic droit sur <em>Navigateur &gt; Conseillers Experts</em> puis <strong>Actualiser</strong>.</li>
                  <li>Glissez le robot sur votre graphique et assurez-vous d'avoir coché <strong>« Autoriser le trading automatique » (Algo Trading)</strong>.</li>
                </ol>
              </div>

              <!-- BUTTON TO DASHBOARD -->
              <div style="text-align: center; margin: 30px 0 15px 0;">
                <a href="${clientUrl}/dashboard" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
                  Accéder à mon Espace Client
                </a>
              </div>

              <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 25px;">
                Besoin d'aide pour l'installation ? Notre support VIP est à votre disposition 24/7 via WhatsApp ou Telegram depuis votre espace client.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #0b0f19; padding: 20px; text-align: center; border-top: 1px solid #1f2937; font-size: 11px; color: #64748b;">
              © ${new Date().getFullYear()} RoyalBot Trading Automated. Tous droits réservés.<br/>
              Cet email vous a été envoyé automatiquement suite à votre confirmation de commande.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 1. Enregistre une notification in-app garantie pour l'utilisateur
    try {
      await Notification.create({
        user: user._id,
        type: 'robot_purchased',
        title: '🎉 Vos robots achetés sont prêts !',
        message: `Votre commande #${String(order._id).slice(-8).toUpperCase()} est confirmée. Vos fichiers robots ont été envoyés par email à ${recipientEmail}.`,
        link: '/dashboard',
        channels: ['inapp', 'email'],
      });
    } catch (_) {}

    // 2. Envoi réel de l'email via Nodemailer
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        console.log(`[emailService] Pas de SMTP configuré. Email préparé pour ${recipientEmail} avec ${attachments.length} pièce(s) jointe(s).`);
        return { success: true, delivered: false, reason: 'SMTP non configuré' };
      }

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"RoyalBot Trading" <noreply@royalbot.pro>`,
        to: recipientEmail,
        subject: `🚀 Vos Robots de Trading RoyalBot [Commande #${String(order._id).slice(-8).toUpperCase()}]`,
        html,
        attachments,
      });

      console.log(`[emailService] Email envoyé avec succès à ${recipientEmail}. MessageId:`, info.messageId);
      return { success: true, delivered: true, messageId: info.messageId };
    } catch (err) {
      console.error('[emailService] Erreur lors de l\'envoi de l\'email :', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new EmailService();
