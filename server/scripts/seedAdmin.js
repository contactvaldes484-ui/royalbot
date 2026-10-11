'use strict';
/**
 * Seed / promotion d'un compte SUPER ADMIN (idempotent).
 *
 * Crée un utilisateur super_admin s'il n'existe pas, sinon le met à jour
 * (rôle, mot de passe si fourni, plan institutional, actif/vérifié).
 *
 * Identifiants (par ordre de priorité) :
 *   1. Arguments CLI :  node scripts/seedAdmin.js <email> <password> [prenom] [nom]
 *   2. Variables env :  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_FIRSTNAME / SEED_ADMIN_LASTNAME
 *   3. Valeurs par défaut (à CHANGER après première connexion).
 *
 * Exemples :
 *   node scripts/seedAdmin.js
 *   node scripts/seedAdmin.js admin@ultimatebot.io 'MonMotDePasseFort!'
 *   SEED_ADMIN_EMAIL=boss@x.io SEED_ADMIN_PASSWORD='...' node scripts/seedAdmin.js
 *
 * Le mot de passe est hashé automatiquement (hook pre-save bcrypt du modèle User).
 */
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../src/models/User');

const argv = process.argv.slice(2);

const email = (argv[0] || process.env.SEED_ADMIN_EMAIL || 'admin@ultimatebot.io')
  .toLowerCase()
  .trim();
const password = argv[1] || process.env.SEED_ADMIN_PASSWORD || 'UltimateBot@2026';
const firstName = argv[2] || process.env.SEED_ADMIN_FIRSTNAME || 'Super';
const lastName = argv[3] || process.env.SEED_ADMIN_LASTNAME || 'Admin';

if (!password || password.length < 6) {
  console.error('❌ Le mot de passe doit faire au moins 6 caractères.');
  process.exit(1);
}

function genReferralCode() {
  return 'ADM' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI manquant (server/.env).');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connecté');

  let user = await User.findOne({ email });
  let created = false;

  if (user) {
    // Promotion / mise à jour idempotente
    user.role = 'super_admin';
    user.isActive = true;
    user.isVerified = true;
    if (!user.firstName) user.firstName = firstName;
    if (!user.lastName) user.lastName = lastName;
    if (!user.referralCode) user.referralCode = genReferralCode();
    // (Re)définir le mot de passe uniquement s'il est passé explicitement
    const passwordProvided = Boolean(argv[1] || process.env.SEED_ADMIN_PASSWORD);
    if (passwordProvided) {
      user.password = password; // re-hashé par le hook pre-save
    }
    user.subscription = user.subscription || {};
    user.subscription.plan = 'institutional';
    user.subscription.isActive = true;
    await user.save();
    console.log(`🔁 Compte existant promu super_admin : ${email}`);
  } else {
    user = new User({
      firstName,
      lastName,
      email,
      password, // hashé par le hook pre-save
      role: 'super_admin',
      isActive: true,
      isVerified: true,
      referralCode: genReferralCode(),
      subscription: { plan: 'institutional', isActive: true },
    });
    await user.save();
    created = true;
    console.log(`🎉 Compte super_admin créé : ${email}`);
  }

  console.log('\n===============================================');
  console.log('  IDENTIFIANTS SUPER ADMIN');
  console.log('===============================================');
  console.log(`  Email       : ${email}`);
  console.log(`  Mot de passe: ${(argv[1] || process.env.SEED_ADMIN_PASSWORD) ? password : (created ? password : '(inchangé)')}`);
  console.log(`  Rôle        : super_admin`);
  console.log(`  Plan        : institutional`);
  console.log('===============================================');
  console.log('⚠️  Changez ce mot de passe après la première connexion.\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Erreur seed admin :', e.message);
  process.exit(1);
});
