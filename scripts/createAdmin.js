/**
 * Script: Create / reset the admin account
 * Usage:  node scripts/createAdmin.js  (from any directory)
 *
 * Reads MONGODB_URI from server/.env (or falls back to localhost default).
 */

// Resolve all dependencies from server/node_modules
const path = require('path');
module.paths.unshift(path.join(__dirname, '../server/node_modules'));

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/UltimateBot';

// ─── Admin credentials (change before going to production) ───────────────────
const ADMIN = {
  firstName: 'Admin',
  lastName:  'UltimateBot',
  email:     'admin@ultimatebot.com',
  password:  'Admin@UB2026!',
  role:      'admin',
};
// ─────────────────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB connected:', MONGODB_URI);

  const User = require(require('path').join(__dirname, '../server/src/models/User'));

  const existing = await User.findOne({ email: ADMIN.email });

  if (existing) {
    // Reset: hash once here, then bypass the pre-save hook via findByIdAndUpdate
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(ADMIN.password, salt);
    await User.findByIdAndUpdate(existing._id, {
      role: 'admin',
      isActive: true,
      isVerified: true,
      password: hashed,          // already hashed — hook not triggered by findByIdAndUpdate
    });
    console.log('🔄 Admin account updated (password reset).');
  } else {
    // New user: pass plain password — Mongoose pre-save hook will hash it once
    await User.create({
      ...ADMIN,
      // password comes from ADMIN.password (plain) — the hook handles hashing
      referralCode: 'UBADMIN',
      isActive: true,
      isVerified: true,
    });
    console.log('✨ Admin account created.');
  }

  console.log('\n──────────────────────────────────────────');
  console.log('  📧  Email    :', ADMIN.email);
  console.log('  🔑  Password :', ADMIN.password);
  console.log('  🛡️   Role     : admin');
  console.log('  🌐  URL      : /login  →  /admin');
  console.log('──────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
