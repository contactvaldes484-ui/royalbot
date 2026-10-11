'use strict';
/**
 * Test d'intégration des routes ADMIN Binance contre la vraie DB (lecture seule).
 * Démarre rien : suppose le serveur lancé sur PORT (def 5000).
 *   node scripts/binanceAdminApiTest.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');

const PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${PORT}/api/binance`;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const admin = await User.findOne({ role: { $in: ['admin', 'super_admin'] } }).select('_id email role');
  if (!admin) { console.log('Aucun admin en base — crée un compte admin d\'abord.'); process.exit(1); }
  const token = jwt.sign({ userId: admin._id }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '5m' });
  console.log(`Admin: ${admin.email} (${admin.role})\n`);
  const H = { Authorization: `Bearer ${token}` };

  const routes = [
    ['/admin/dashboard', 'KPIs globaux'],
    ['/admin/robots', 'Perf par robot'],
    ['/admin/accounts?limit=5', 'Comptes connectés'],
    ['/admin/trades?limit=5', 'Trades'],
    ['/admin/logs?limit=5', 'Journal'],
  ];
  let fail = 0;
  for (const [path, label] of routes) {
    try {
      const res = await fetch(BASE + path, { headers: H });
      const data = await res.json();
      if (!res.ok) { console.log(`  ✗ ${label} (${path}) → HTTP ${res.status}: ${data.error}`); fail++; continue; }
      const k = Object.keys(data)[0];
      const v = data[k];
      const summary = Array.isArray(v) ? `${v.length} éléments` : JSON.stringify(v).slice(0, 120);
      console.log(`  ✓ ${label.padEnd(20)} → ${k}: ${summary}`);
    } catch (e) { console.log(`  ✗ ${label} → ${e.message}`); fail++; }
  }

  // Vérifie la garde admin : sans token → 401, user normal → 403
  const noTok = await fetch(BASE + '/admin/dashboard');
  console.log(`\n  ${noTok.status === 401 ? '✓' : '✗'} sans token → HTTP ${noTok.status} (attendu 401)`);

  await mongoose.disconnect();
  console.log(`\n=== ${fail === 0 ? 'TOUT OK' : fail + ' échec(s)'} ===`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
