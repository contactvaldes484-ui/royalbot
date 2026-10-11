# Guide de test des robots UltimateBot (sur le déploiement)

Ce guide explique comment **déployer** UltimateBot sur Railway puis **tester les robots
Binance directement sur le site en ligne**, en toute sécurité grâce au **Testnet**.

- Déploiement backend détaillé : [`RAILWAY_DEPLOY.md`](./RAILWAY_DEPLOY.md)
- Procédure de vérification technique bas niveau : [`server/scripts/VERIFY_ROBOTS.md`](./server/scripts/VERIFY_ROBOTS.md)

---

## PARTIE 1 — Déployer (Render → Railway)

> Backend = dossier `server/` (Node 20, `npm start`, healthcheck `/api/health`, config `server/railway.json`).
> Frontend = Vercel. Le code est déjà poussé sur `main` (`valdes557/ultimatebot`).

### ⚠️ Règle d'or
Copier **à l'identique depuis Render** ces 3 valeurs, sinon la prod casse :
- `ENCRYPTION_KEY` — sinon les clés API Binance des users (chiffrées AES-256-GCM) sont illisibles → robots KO.
- `JWT_SECRET` — sinon tous les utilisateurs sont déconnectés.
- `MONGODB_URI` — la **même** base Atlas (pas une base neuve).

### Étapes
1. **Atlas** → Network Access → Add IP `0.0.0.0/0` (Railway n'a pas d'IP fixe).
2. **Railway** → New Project → Deploy from GitHub → `valdes557/ultimatebot`.
3. Service → **Settings → Root Directory = `server`** (indispensable).
4. Onglet **Variables** → coller les variables (voir liste ci-dessous). **Ne pas définir `PORT`** (Railway l'injecte).
5. Settings → **Networking → Generate Domain** → ex. `https://ultimatebot-production.up.railway.app`.
6. **Vercel** → Settings → Environment Variables → `VITE_API_URL = https://<domaine-railway>/api` → **Redeploy**.
7. Vérifier : `https://<domaine-railway>/api/health` → `{"status":"ok"}` ; logs Railway → `✅ MongoDB connected` + `🚀 Server running`.
8. **Cutover** : une fois OK, désactiver/supprimer le service Render (`render.yaml` obsolète).

### Variables Railway
**Obligatoires :** `NODE_ENV=production`, `MONGODB_URI`*, `JWT_SECRET`*, `JWT_EXPIRE=7d`,
`ENCRYPTION_KEY`*, `FRONTEND_URL=https://<app>.vercel.app` (sans slash final),
`BINANCE_USE_TESTNET` (`true` pour tester, `false` en réel), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`.
*(\* = copier de Render à l'identique)*

**Paiements auto (optionnel) :** `USDT_TRON_ADDRESS`, `TRONGRID_API_KEY`,
`SEBPAY_BASE_URL=https://newapi.sebpay.bj/api/v1`, `SEBPAY_PUBLIC_KEY`, `SEBPAY_SECRET_KEY`,
`XOF_PER_USD=600`, `PUBLIC_URL=https://<domaine-railway>`.
→ Webhook SebPay à régler sur `https://<domaine-railway>/api/webhooks/sebpay`.

### Compte super admin
Après déploiement, créer l'admin (idempotent) :
```
cd server && node scripts/seedAdmin.js <email> "<mot_de_passe>"
```
Défaut si sans argument : `admin@ultimatebot.io` / `UltimateBot@2026` (**à changer**).

> 💡 Pour tester la fonctionnalité robots, mettez `BINANCE_USE_TESTNET=true` sur Railway
> (les robots tradent alors sur le Testnet Binance, sans argent réel).

---

## PARTIE 2 — Tester les robots sur le site en ligne

### 1. Générer des clés API **Testnet**
- **Spot** : https://testnet.binance.vision → login GitHub → *Generate HMAC_SHA256 Key* → noter `API Key` + `Secret` (soldes fictifs auto-crédités).
- **Futures** : https://testnet.binancefuture.com → *API Key* → générer `Key`+`Secret`, puis **Faucet** pour recevoir des USDT de test.
- ✅ Activer **Enable Trading**  ·  ❌ **ne jamais activer Withdraw** (le backend refuse la clé sinon).

### 2. Connecter le compte (site déployé)
1. Se connecter sur `https://<app>.vercel.app`.
2. **Dashboard → Binance → Connecter un compte** :
   - coller `API Key` / `API Secret`,
   - marché : `spot`, `futures` ou `both`,
   - **cocher « Testnet »**.
3. Un **test de connexion automatique** valide les clés + permissions (échoue si Withdraw actif).

### 3. Vérifier le solde minimum
Avoir **≥ 10 USDT** sur le compte testnet (sinon le lancement du robot est refusé).

### 4. Lancer un robot et observer un vrai trade
1. **Dashboard → Binance** → choisir un robot.
2. **Taille des lots** : Auto (risk) / Montant fixe / Multiplicateur.
3. **Lancer** la session, puis surveiller (auto-refresh) :
   - **Positions ouvertes** dès qu'un signal se déclenche,
   - **Journal** : `signal`, `open`, `close`, `risk_block`,
   - **Trades** : entrée/sortie, quantité, **P&L réel**.
4. **Arrêter** la session → ferme les positions, finalise le P&L.

> Sur **Spot**, 10 USDT est juste (certains symboles exigent plus via `minNotional`) —
> pour un petit capital, privilégier les **Futures** avec levier.

### 5. (Option) Copy-trading
1. Sur une session active → **Devenir Master**.
2. Avec un autre compte testnet connecté → **Suivre** ce master.
3. Les trades du maître se **répliquent** automatiquement chez le suiveur (P&L réel).

### 6. Vue admin
Connecté en **super_admin** → **Admin → Binance** : comptes connectés, robots actifs,
trades en direct, journal (auto-refresh 20 s).

### 7. Passage en **réel** (après validation testnet)
1. Générer des clés sur le **vrai** Binance (Trading ✅, Withdraw ❌).
2. Sur Railway : `BINANCE_USE_TESTNET=false` (ou connecter le compte avec **Testnet décoché**).
3. Commencer avec un **petit capital** et des lots réduits.
4. Recommandé : **whitelist IP** du serveur côté Binance.

---

## Checklist de validation
- [ ] Backend Railway en ligne (`/api/health` = ok) + frontend Vercel pointant dessus
- [ ] Compte super_admin créé (`seedAdmin.js`), mot de passe changé
- [ ] Compte Binance **testnet** connecté (Testnet ON, sans Withdraw)
- [ ] Solde ≥ 10 USDT
- [ ] Robot lancé → trade ouvert visible (positions + journal + trades)
- [ ] Modes de lot `risk` / `fixed` / `multiplier` OK
- [ ] Trade fermé → P&L réel enregistré
- [ ] (option) copy-trading maître → suiveur réplique
- [ ] Admin → Binance affiche les données en direct
