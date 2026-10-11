# Vérifier que les robots fonctionnent (Testnet Binance)

Ce guide décrit comment vérifier de bout en bout qu'un robot ouvre et ferme
réellement des positions sur Binance, **sans risquer d'argent réel** grâce au
**Testnet**. Il couvre aussi le dépôt minimum (10 USDT) et les modes de taille de lot.

> Dossier : `server/`. Boot local recommandé : `PORT=5055 node src/index.js`
> (⚠️ un process pm2 `restaurant-server` peut occuper le port 5000).

---

## 0. Pré-requis

- `server/.env` configuré avec au minimum :
  - `MONGODB_URI` (Atlas ou local)
  - `JWT_SECRET`, `ENCRYPTION_KEY` (32 caractères/hex)
- Dépendances installées : `cd server && npm install`
- Build client si test via l'UI : `cd client && npm run build`

---

## 1. Générer des clés API Testnet

Le Testnet Binance est séparé du site réel — il faut des clés dédiées.

- **Spot Testnet** : https://testnet.binance.vision
  - Se connecter avec GitHub → **Generate HMAC_SHA256 Key** → noter `API Key` + `Secret Key`.
  - Le testnet crédite automatiquement des soldes fictifs (USDT, BTC…).
- **Futures Testnet** : https://testnet.binancefuture.com
  - Créer un compte testnet → menu **API Key** → générer `Key` + `Secret`.
  - Utiliser le **Faucet** pour recevoir des USDT de test.

> Permissions : activer **Enable Trading** (Spot et/ou Futures). **Ne jamais activer Withdraw.**
> Notre backend **refuse** la connexion si la permission de retrait est active.

---

## 2. Smoke-test bas niveau (sans UI)

Vérifie chiffrement + filtres + connectivité testnet directement.

```bash
cd server
# Test complet (AES-256-GCM, arrondi filtres, ping/klines/price/exchangeInfo testnet)
BX_KEY=<clé_testnet> BX_SECRET=<secret_testnet> node scripts/binanceSmokeTest.js
```

Attendu : **15/15 OK**. En cas d'échec de connectivité, vérifier l'heure système
(erreur `-1021 timestamp`) et que les clés sont bien des clés **testnet**.

---

## 3. Connecter le compte via l'UI

1. Lancer le serveur (`PORT=5055 node src/index.js`) et le client (`npm run dev` ou build servi).
2. Se connecter, aller dans **Dashboard → Binance**.
3. Le **guide de connexion illustré** s'affiche s'il n'y a aucun compte.
4. **Connecter un compte** :
   - `API Key` / `API Secret` (clés testnet)
   - Marché : `spot`, `futures` ou `both`
   - **Cocher « Testnet »** (`isTestnet = true`)
5. La connexion effectue un **test automatique** (ping + permissions). Elle échoue si :
   - clés invalides,
   - permission **Withdraw** active (refus volontaire),
   - solde illisible.

Endpoint correspondant : `POST /api/binance/accounts/connect`
puis `POST /api/binance/accounts/:id/test`.

---

## 4. Vérifier le dépôt minimum (10 USDT)

- Tous les robots ont `minCapital = 10` (`config/binanceRobots.js`, `MIN_DEPOSIT_USDT = 10`).
- `RobotEngine.startSession` **refuse** de démarrer si le solde disponible `< 10 USDT`.
- Assurez-vous que le compte testnet a **≥ 10 USDT** (faucet si besoin).

---

## 5. Lancer un robot et observer un trade réel (testnet)

1. Dashboard → Binance → choisir un robot → **Taille des lots** :
   - **Auto (risk)** : taille calculée depuis `riskPercent` et la distance au SL.
   - **Montant fixe (fixed)** : `fixedNotionalUsd` (ex. 10 USDT par trade).
   - **Multiplicateur (multiplier)** : base `risk` × `lotMultiplier`.
2. **Lancer** la session (`POST /api/binance/sessions/start`).
3. Vérifier dans l'UI (auto-refresh) :
   - **Positions ouvertes** apparaissent quand un signal se déclenche,
   - **Journal** (`GET /sessions/:id/logs`) : `signal`, `open`, `close`, éventuels `risk_block`,
   - **Trades** (`GET /sessions/:id/trades`) : entrée/sortie, quantité, **P&L réel**,
   - respect des filtres Binance (`minNotional`/`minQty`).
4. **Arrêter** la session (`POST /sessions/:id/stop`) : les positions ouvertes sont fermées,
   le P&L est finalisé.

> Un ordre doit respecter `minNotional` : sur **Spot**, 10 USDT est juste (certains
> symboles exigent plus) — privilégier les **Futures** avec levier pour les petits capitaux.
> Un message clair est renvoyé si le symbole exige plus que le solde.

---

## 6. Vérifier le copy-trading (optionnel)

1. Sur une session robot active, **Devenir Master** (crée un `MasterAccount`).
2. Avec un **autre compte** testnet connecté, **Suivre** ce master (`/follow`).
3. Quand le robot maître ouvre/ferme un trade, le suiveur doit **répliquer**
   automatiquement (quantité selon `lotMode`/`multiplier`), avec P&L réel.

---

## 7. Vérifier les routes admin

Avec un compte **admin/super_admin** (voir `scripts/seedAdmin.js`) :

```bash
cd server
# Serveur lancé, puis :
node scripts/binanceAdminApiTest.js
```

Attendu : **5 routes admin OK** (`/admin/dashboard|robots|accounts|trades|logs`)
+ garde `401` sans token. Dans l'UI : **Admin → Binance** montre KPIs, comptes,
robots, trades et journal (auto-refresh 20 s).

---

## 8. Checklist de validation

- [ ] `binanceSmokeTest.js` → 15/15 OK
- [ ] Compte testnet connecté via l'UI (Testnet ON, sans Withdraw)
- [ ] Solde ≥ 10 USDT respecté (start refusé sous 10)
- [ ] Robot lancé → trade ouvert visible (positions + journal + trades)
- [ ] Modes de lot `risk` / `fixed` / `multiplier` fonctionnels
- [ ] Trade fermé → P&L réel enregistré
- [ ] (option) copy-trading maître → suiveur réplique
- [ ] `binanceAdminApiTest.js` → 5 routes OK + 401 sans token
- [ ] Admin → Binance affiche les données en direct

---

## Passage en LIVE (après validation testnet)

1. Générer des clés API sur le **vrai** Binance (Trading activé, **Withdraw désactivé**).
2. Connecter le compte avec **Testnet décoché** (`isTestnet = false`).
3. Commencer avec un **petit capital** et des lots réduits.
4. (Recommandé) **Whitelist IP** côté Binance sur l'IP du serveur.
