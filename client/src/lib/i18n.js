/**
 * i18n.js — Traduction complète FR <-> EN de toute la plateforme sans exception
 * Utilise un dictionnaire complet + remplacement intelligent des phrases et expressions + MutationObserver sans perte.
 */

const EXACT_MAP = {
  // Navigation & Général
  'Accueil': 'Home',
  'Robots Deriv & Crypto': 'Deriv & Crypto Robots',
  'Marchés': 'Markets',
  'Tarifs & Essai 7j': 'Pricing & 7d Trial',
  'Tarifs': 'Pricing',
  'Leaderboard': 'Leaderboard',
  'Blog': 'Blog',
  'FAQ': 'FAQ',
  'Contact': 'Contact',
  'Connexion': 'Sign In',
  'Se connecter': 'Sign In',
  'Inscription': 'Sign Up',
  "S'inscrire": 'Sign Up',
  'Déconnexion': 'Log Out',
  'Tableau de bord': 'Dashboard',
  'Dashboard': 'Dashboard',
  'Paramètres': 'Settings',
  'Administration': 'Administration',
  'Retour': 'Back',
  'Annuler': 'Cancel',
  'Enregistrer': 'Save',
  'Sauvegarder': 'Save',
  'Supprimer': 'Delete',
  'Modifier': 'Edit',
  'Créer': 'Create',
  'Ajouter': 'Add',
  'Confirmer': 'Confirm',
  'Valider': 'Validate',
  'Actualiser': 'Refresh',
  'Rechercher': 'Search',
  'Copier': 'Copy',
  'Fermer': 'Close',
  'Oui': 'Yes',
  'Non': 'No',
  'Chargement...': 'Loading...',
  'Enregistrement...': 'Saving...',
  'Statut': 'Status',
  'Actions': 'Actions',
  'Date': 'Date',
  'Montant': 'Amount',
  'Devise': 'Currency',
  'Pays': 'Country',
  'Téléphone': 'Phone',
  'Opérateur': 'Operator',

  // Dashboard Utilisateur
  'Robots de Trading': 'Trading Robots',
  'Deriv SmartTrader': 'Deriv SmartTrader',
  'Binance & Bybit': 'Binance & Bybit',
  'Scanner IA': 'AI Scanner',
  'Copy Trading': 'Copy Trading',
  'Mes Positions': 'My Positions',
  'Historique': 'History',
  'Abonnement': 'Subscription',
  'Abonnements': 'Subscriptions',
  'Portefeuille': 'Wallet',
  'Retraits': 'Withdrawals',
  'Notifications': 'Notifications',
  'Profil': 'Profile',
  'Sécurité': 'Security',
  'Trading Manuel': 'Manual Trading',
  'Robots Automatiques': 'Automatic Robots',
  'Bot Builder Studio': 'Bot Builder Studio',
  'Compte Démo': 'Demo Account',
  'Compte Réel': 'Real Account',
  'DÉMO': 'DEMO',
  'RÉEL': 'REAL',
  'Solde': 'Balance',
  'Solde Disponible': 'Available Balance',
  'Solde Deriv': 'Deriv Balance',
  'Solde insuffisant': 'Insufficient balance',
  'Connecter Deriv': 'Connect Deriv',
  'Token Manuel': 'Manual Token',
  'Connexion Deriv 1-Clic': '1-Click Deriv Login',
  'Lancer ce Robot': 'Launch this Robot',
  'Confirmer & Démarrer': 'Confirm & Start',
  'Démarrer': 'Start',
  'Arrêter': 'Stop',
  'Pause': 'Pause',
  'Reprendre': 'Resume',
  'Mise Initiale ($)': 'Initial Stake ($)',
  'Mise ($)': 'Stake ($)',
  'Take Profit ($)': 'Take Profit ($)',
  'Stop Loss ($)': 'Stop Loss ($)',
  'Durée (Ticks)': 'Duration (Ticks)',
  'Barrière': 'Barrier',
  'Statut en Direct': 'Live Status',
  'Gain Net': 'Net Profit',
  'GAGNÉ': 'WON',
  'PERDU': 'LOST',
  'EN COURS': 'OPEN',
  'Flux en Direct des Trades & Contrats': 'Live Trades & Contracts Stream',
  'Vider le flux': 'Clear Stream',
  'Catalogue des Robots Deriv Disponibles': 'Available Deriv Robots Catalog',
  'Sessions Robots en Cours d\'Exécution': 'Running Robot Sessions',
  'Période d\'essai gratuit': 'Free Trial Period',
  'Période d\'essai gratuit expirée :': 'Free trial period expired:',
  'Payer l\'Abonnement Mensuel': 'Pay Monthly Subscription',
  'Créer un compte via le Lien de Parrainage': 'Create Account via Referral Link',
  'Connecter mon Compte Partenaire': 'Connect my Partner Account',
  'Voir les Tarifs Mensuels': 'View Monthly Pricing',
  'Activer Gratuitement via Partenaire': 'Activate Free via Partner',

  // Bot Builder & Admin Deriv
  'Publier pour Utilisateurs': 'Publish for Users',
  'Enregistrer les modifications': 'Save Changes',
  'Revenir à l\'état initial': 'Reset to Initial State',
  'Tester sur Démo Deriv': 'Test on Deriv Demo',
  'Stop Test Démo': 'Stop Demo Test',
  'Ouvrir XML/JSON': 'Open XML/JSON',
  'Code XML': 'XML Code',
  'Blocs Visuels': 'Visual Blocks',
  'Importer un Fichier Robot (.xml / .json)': 'Import Robot File (.xml / .json)',
  'Ajouter un Robot': 'Add Robot',
  'Éditer dans Bot Builder': 'Edit in Bot Builder',
  'Modifier le Robot Deriv': 'Edit Deriv Robot',
  'Ajouter un Nouveau Robot Deriv': 'Add New Deriv Robot',
  'Mettre à jour': 'Update',
  'Créer le Robot': 'Create Robot',
  'Enregistrer la Configuration': 'Save Configuration',
  'Configuration': 'Configuration',
  'Identité': 'Branding',
  'Paiements & Passerelles': 'Payments & Gateways',
  'Page d\'accueil': 'Landing Page',
  'Footer & SEO': 'Footer & SEO',
  'Réseaux sociaux': 'Social Links',
  'Broker & Deriv': 'Broker & Deriv',
  'Revenus': 'Revenue',
  'Commandes': 'Orders',
  'Plans': 'Plans',
  'Utilisateurs': 'Users',
  'Vendeurs': 'Vendors',
  'Portefeuille Admin & Revenus': 'Admin Wallet & Revenue',
  'Portefeuille Abonnements & Retrait Direct iKeePay': 'Subscription Wallet & Direct iKeePay Withdrawal',
  'Total Encaissé (Abonnements)': 'Total Collected (Subscriptions)',
  'Total Retiré': 'Total Withdrawn',
  'Réduction retrait (%) :': 'Withdrawal fee (%) :',
  'Appliquer': 'Apply',
  'Montant Brut': 'Gross Amount',
  'Téléphone (avec indicatif)': 'Phone (with country code)',
  'Retirer via iKeePay': 'Withdraw via iKeePay',
  'Supprimer le Free Trial': 'Delete Free Trial',
  'Période d\'essai gratuit active': 'Free trial period active',
  'Visibilité du Bot Builder Studio chez les Utilisateurs': 'User Bot Builder Studio Visibility',
  'Facteur de Perte (Loss Factor)': 'Loss Factor',
  'Facteur Perte (Loss Factor)': 'Loss Factor',
  'Logique & Conditions Personnalisées Super-Admin': 'Super-Admin Custom Logic & Conditions',
};

const PHRASE_REPLACEMENTS = [
  [/Tableau de bord/gi, 'Dashboard'],
  [/Robots Automatiques/gi, 'Automatic Robots'],
  [/Trading Manuel/gi, 'Manual Trading'],
  [/Période d'essai gratuit/gi, 'Free trial period'],
  [/Période d'essai/gi, 'Free trial'],
  [/Essai gratuit/gi, 'Free trial'],
  [/Abonnement mensuel/gi, 'Monthly subscription'],
  [/Abonnements/gi, 'Subscriptions'],
  [/Abonnement/gi, 'Subscription'],
  [/Compte Partenaire/gi, 'Partner Account'],
  [/Lien de Parrainage/gi, 'Referral Link'],
  [/Solde Disponible/gi, 'Available Balance'],
  [/Solde insuffisant/gi, 'Insufficient balance'],
  [/Mise Initiale/gi, 'Initial Stake'],
  [/Statut en Direct/gi, 'Live Status'],
  [/Gain Net/gi, 'Net Profit'],
  [/Enregistrer les modifications/gi, 'Save Changes'],
  [/Revenir à l'état initial/gi, 'Reset to Initial State'],
  [/Tester sur Démo Deriv/gi, 'Test on Deriv Demo'],
  [/Éditer dans Bot Builder/gi, 'Edit in Bot Builder'],
  [/Importer un (?:Fichier )?Robot/gi, 'Import Robot File'],
  [/Paramètres/gi, 'Settings'],
  [/Utilisateurs/gi, 'Users'],
  [/Utilisateur/gi, 'User'],
  [/Administrateur/gi, 'Administrator'],
  [/Transactions/gi, 'Transactions'],
  [/Portefeuille/gi, 'Wallet'],
  [/Retraits/gi, 'Withdrawals'],
  [/Retrait/gi, 'Withdrawal'],
  [/Revenus/gi, 'Revenue'],
  [/Paiements/gi, 'Payments'],
  [/Paiement/gi, 'Payment'],
  [/Actualiser/gi, 'Refresh'],
  [/Confirmer/gi, 'Confirm'],
  [/Annuler/gi, 'Cancel'],
  [/Supprimer/gi, 'Delete'],
  [/Modifier/gi, 'Edit'],
  [/Enregistrer/gi, 'Save'],
  [/Ajouter/gi, 'Add'],
  [/Créer/gi, 'Create'],
  [/Activé/gi, 'Enabled'],
  [/Désactivé/gi, 'Disabled'],
  [/Activer/gi, 'Enable'],
  [/Désactiver/gi, 'Disable'],
  [/Gagné/gi, 'Won'],
  [/Perdu/gi, 'Lost'],
  [/En attente/gi, 'Pending'],
  [/Complété/gi, 'Completed'],
  [/Échoué/gi, 'Failed'],
  [/Heures/gi, 'Hours'],
  [/Jours/gi, 'Days'],
  [/Minutes/gi, 'Minutes'],
];

const originalTextMap = new WeakMap();
const originalAttrMap = new WeakMap();
let activeObserver = null;

export function translateFrenchToEnglish(str) {
  if (!str || typeof str !== 'string') return str;
  const trimmed = str.trim();
  if (!trimmed) return str;

  if (EXACT_MAP[trimmed]) {
    return str.replace(trimmed, EXACT_MAP[trimmed]);
  }

  let out = str;
  for (const [regex, replacement] of PHRASE_REPLACEMENTS) {
    if (regex.test(out)) {
      out = out.replace(regex, replacement);
    }
  }
  return out;
}

function processNode(node, lang) {
  if (!node) return;
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (!parent) return;
    const tag = parent.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE' || tag === 'PRE') return;

    if (!originalTextMap.has(node)) {
      originalTextMap.set(node, node.nodeValue);
    }
    const orig = originalTextMap.get(node);
    const targetVal = lang === 'en' ? translateFrenchToEnglish(orig) : orig;
    if (node.nodeValue !== targetVal) {
      node.nodeValue = targetVal;
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.hasAttribute('placeholder')) {
      const stored = originalAttrMap.get(node) || {};
      if (stored.placeholder === undefined) stored.placeholder = node.getAttribute('placeholder');
      originalAttrMap.set(node, stored);
      const nextPh = lang === 'en' ? translateFrenchToEnglish(stored.placeholder) : stored.placeholder;
      if (node.getAttribute('placeholder') !== nextPh) node.setAttribute('placeholder', nextPh);
    }
    if (node.hasAttribute('title')) {
      const stored = originalAttrMap.get(node) || {};
      if (stored.title === undefined) stored.title = node.getAttribute('title');
      originalAttrMap.set(node, stored);
      const nextTitle = lang === 'en' ? translateFrenchToEnglish(stored.title) : stored.title;
      if (node.getAttribute('title') !== nextTitle) node.setAttribute('title', nextTitle);
    }
  }
}

function walkAndTranslate(root, lang) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let cur = walker.currentNode;
  while (cur) {
    processNode(cur, lang);
    cur = walker.nextNode();
  }
}

export function applyLanguage(lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang === 'en' ? 'en' : 'fr';

  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }

  walkAndTranslate(document.body, lang);

  if (lang === 'en') {
    activeObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => walkAndTranslate(n, 'en'));
        } else if (m.type === 'characterData' && m.target) {
          processNode(m.target, 'en');
        }
      }
    });
    activeObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
}
