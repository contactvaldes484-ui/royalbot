#!/usr/bin/env node
/**
 * check-metaapi.js — Vérifie que METAAPI_TOKEN est chargé et valide.
 * Lance :  node scripts/check-metaapi.js   (depuis la racine du projet)
 * N'affiche JAMAIS le token en clair.
 */
const path = require('path');
const SERVER_MODULES = path.join(__dirname, '..', 'server', 'node_modules');
require(path.join(SERVER_MODULES, 'dotenv')).config({ path: path.join(__dirname, '..', 'server', '.env') });

(async () => {
  const token = process.env.METAAPI_TOKEN;
  if (!token) {
    console.error('❌ METAAPI_TOKEN absent de server/.env');
    console.error('   → Mets le token avec : node scripts/set-metaapi-token.js');
    process.exit(1);
  }
  console.log(`🔑 Token détecté (${token.length} caractères).`);
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    if (payload.exp) {
      const exp = new Date(payload.exp * 1000);
      console.log(`   Expire le : ${exp.toISOString().slice(0, 10)}`);
    }
  } catch (_) {
    console.warn('   ⚠️  Le token ne ressemble pas à un JWT MetaApi standard — vérifie-le.');
  }

  try {
    const MetaApi = require(path.join(SERVER_MODULES, 'metaapi.cloud-sdk')).default;
    const api = new MetaApi(token);
    console.log('⏳ Connexion à MetaApi (liste des comptes)…');
    const accounts = await api.metatraderAccountApi.getAccountsWithInfiniteScrollPagination();
    console.log(`✅ MetaApi OK — ${accounts.length} compte(s) MT4/MT5 provisionné(s).`);
    accounts.forEach(a => console.log(`   • ${a.name} (login ${a.login} @ ${a.server}) — état: ${a.state}`));
    process.exit(0);
  } catch (err) {
    console.error('❌ Appel MetaApi échoué :', err.message);
    console.error('   Causes possibles : token invalide/expiré, ou pas de réseau.');
    process.exit(2);
  }
})();
