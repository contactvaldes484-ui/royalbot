# Déploiement du backend UltimateBot sur Railway

Migration du backend **Render → Railway** (le frontend reste sur Vercel).

Le backend est dans le dossier `server/` (entrée `src/index.js`, `npm start`).
Config Railway : `server/railway.json` (Nixpacks, healthcheck `/api/health`).

---

## ⚠️ À NE SURTOUT PAS OUBLIER (sinon casse en production)

- **`ENCRYPTION_KEY`** : réutilisez **EXACTEMENT** la même valeur que sur Render.
  Les clés API Binance/MetaApi des utilisateurs sont chiffrées en base (AES-256-GCM).
  Une clé différente = impossible de déchiffrer = les robots des utilisateurs cassent.
- **`JWT_SECRET`** : réutilisez la **même** valeur → les utilisateurs restent connectés.
- **`MONGODB_URI`** : pointez vers la **même** base MongoDB Atlas (pas une base vide neuve).
- **`PORT`** : ne PAS le définir manuellement. Railway l'injecte automatiquement.

---

## 1) MongoDB Atlas — autoriser Railway

Railway n'a pas d'IP fixe sur les plans standards.
Atlas → **Network Access** → **Add IP Address** → `0.0.0.0/0` (Allow from anywhere).

## 2) Créer le service Railway

1. https://railway.app → **New Project** → **Deploy from GitHub repo** → `valdes557/ultimatebot`.
2. Ouvrez le service → **Settings** :
   - **Root Directory** = `server`  ← indispensable (le backend est dans un sous-dossier).
   - Railway lit alors `server/railway.json` : builder Nixpacks, `npm start`, healthcheck `/api/health`.
   - Node 20.x est fixé via `engines` dans `server/package.json`.

## 3) Variables d'environnement (onglet **Variables**)

**Obligatoires :**
```
NODE_ENV=production
MONGODB_URI=<votre URI Atlas — la MÊME que sur Render>
JWT_SECRET=<le MÊME que sur Render>
JWT_EXPIRE=7d
ENCRYPTION_KEY=<le MÊME que sur Render, 32 caractères>
FRONTEND_URL=https://<votre-app>.vercel.app
BINANCE_USE_TESTNET=false
VAPID_PUBLIC_KEY=<...>
VAPID_PRIVATE_KEY=<...>
VAPID_EMAIL=mailto:votre@email.com
```

**Paiements automatiques (USDT TRC-20 + Mobile Money SebPay) :**
```
# USDT TRON (TRC-20) — vérification on-chain automatique
USDT_TRON_ADDRESS=<votre adresse de réception USDT TRC-20>
TRONGRID_API_KEY=<clé gratuite sur https://www.trongrid.io>   # sans elle -> repli manuel admin
# TRONGRID_BASE_URL=https://api.trongrid.io                   # override optionnel

# Mobile Money — SebPay (encaissement + webhook auto)
SEBPAY_BASE_URL=https://newapi.sebpay.bj/api/v1
SEBPAY_PUBLIC_KEY=pk_live_<...>
SEBPAY_SECRET_KEY=sk_live_<...>
XOF_PER_USD=600                                               # taux de conversion USD -> XOF
PUBLIC_URL=https://<domaine-railway>                          # backend public, pour le webhook SebPay
```
> ⚠️ Après déploiement, dans le tableau de bord **SebPay**, réglez l'URL de webhook sur :
> `https://<domaine-railway>/api/webhooks/sebpay` (la signature HMAC est vérifiée côté serveur).
> Sans `TRONGRID_API_KEY`/clés SebPay, les paiements basculent en **validation manuelle admin**.

**Optionnelles (selon fonctionnalités utilisées) :**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<...>
SMTP_PASS=<...>
TELEGRAM_BOT_TOKEN=<...>
STRIPE_SECRET_KEY=<...>
BINANCE_PAY_MERCHANT_ID=<...>
BINANCE_PAY_API_KEY=<...>
BINANCE_PAY_SECRET_KEY=<...>
```
> Legacy (plus nécessaires depuis la migration Binance, ne pas reporter) : `METAAPI_TOKEN`, `DERIV_APP_ID`, `DERIV_WS_URL`.
> `FRONTEND_URL` accepte plusieurs origines séparées par des virgules, **sans slash final**.
> Ex : `https://ultimatebot.vercel.app,https://www.mondomaine.com`

## Compte super admin (après déploiement)

Créer / promouvoir un `super_admin` (idempotent) :
```
cd server && node scripts/seedAdmin.js <email> "<mot_de_passe>"
```
Sans arguments, utilise les valeurs par défaut (`admin@ultimatebot.io` / `UltimateBot@2026`) — **à changer**.

## Vérifier les robots

Procédure de test complète (testnet Binance, min 10 USDT, modes de lots, trade réel) :
voir **`server/scripts/VERIFY_ROBOTS.md`**.

## 4) Déployer + domaine public

1. Railway build et démarre automatiquement.
2. **Settings → Networking → Generate Domain** → vous obtenez p.ex.
   `https://ultimatebot-production.up.railway.app`.

## 5) Reconfigurer le frontend (Vercel)

1. Vercel → projet → **Settings → Environment Variables** :
   - `VITE_API_URL = https://<domaine-railway>/api`
   - (le WebSocket est dérivé automatiquement → `wss://<domaine-railway>/ws`)
2. **Redeploy** le frontend sur Vercel (pour prendre la nouvelle variable).

## 6) Vérifications (santé du déploiement)

- Ouvrir `https://<domaine-railway>/api/health` → doit renvoyer `{"status":"ok",...}`.
- Logs Railway → doivent afficher :
  `✅ MongoDB connected` puis `🚀 Server running on port XXXX`.
- Sur le site (Vercel) : se connecter, ouvrir la console navigateur →
  `[WS] Connecting to: wss://<domaine-railway>/ws...` puis connexion OK.
- Tester une action authentifiée (dashboard, robots) et le temps réel (groupes/trades).

## 7) Bascule finale (cutover)

- Une fois tout vérifié : sur Render, désactivez l'auto-deploy ou supprimez le service.
- `render.yaml` est désormais **obsolète** (conservé pour référence).

---

## Dépannage rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| Build échoue « no start command » | Root Directory non réglé | Régler **Root Directory = server** |
| `❌ MongoDB connection error` puis crash | `MONGODB_URI` absent/erroné ou IP Atlas non autorisée | Vérifier l'URI + Atlas `0.0.0.0/0` |
| Erreurs CORS dans le navigateur | `FRONTEND_URL` ≠ URL exacte Vercel | Mettre l'URL exacte (sans slash final) |
| WebSocket ne connecte pas | `VITE_API_URL` pas mis à jour sur Vercel | Le régler + redeploy Vercel |
| Utilisateurs déconnectés après migration | `JWT_SECRET` différent | Réutiliser le même secret que Render |
| Robots utilisateurs KO | `ENCRYPTION_KEY` différent | Réutiliser la même clé que Render |
| App redémarre en boucle | Healthcheck échoue (DB non prête) | Vérifier variables DB ; le timeout est déjà à 300s |
