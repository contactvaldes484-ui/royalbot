# Guide de Déploiement — UltimateBot Platform

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌──────────────┐
│   CLIENT (React)│  ──→    │  SERVER (Node)   │  ──→   │   MongoDB    │
│   Vercel        │  API    │  Render          │        │   Atlas      │
│   Port: 443     │         │  Port: 5000      │        │   Cloud      │
└─────────────────┘         └─────────────────┘         └──────────────┘
```

---

# ÉTAPE 1 : Préparer MongoDB Atlas (Base de données)

1. Allez sur **https://www.mongodb.com/atlas**
2. Créez un compte gratuit (ou connectez-vous)
3. Cliquez **"Build a Database"** → choisissez **"M0 Free"**
4. Région : choisissez la plus proche (ex: Europe West - Paris)
5. Nommez le cluster : `UltimateBot`
6. Cliquez **"Create Cluster"**

### Configurer l'accès :
1. **Database Access** → **"Add New Database User"**
   - Username : `derivadmin`
   - Password : choisissez un mot de passe fort (notez-le !)
   - Rôle : **"Atlas Admin"**
   - Cliquez **"Add User"**

2. **Network Access** → **"Add IP Address"**
   - Cliquez **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Cliquez **"Confirm"**

3. **Récupérer l'URI de connexion** :
   - Retournez dans **"Database"** → cliquez **"Connect"**
   - Choisissez **"Connect your application"**
   - Copiez l'URI, il ressemble à :
   ```
   mongodb+srv://derivadmin:<password>@UltimateBot.xxxxx.mongodb.net/UltimateBot?retryWrites=true&w=majority
   ```
   - Remplacez `<password>` par votre mot de passe réel

**Gardez cette URI, vous en aurez besoin pour Render.**

---

# ÉTAPE 2 : Déployer le Serveur (Backend) sur Render

### 2.1 — Créer un compte Render
1. Allez sur **https://render.com**
2. Cliquez **"Get Started for Free"**
3. Connectez-vous avec votre **compte GitHub** (recommandé)

### 2.2 — Créer un nouveau Web Service
1. Dans le dashboard Render, cliquez **"New +"** → **"Web Service"**
2. Connectez votre repo GitHub : `valdes557/UltimateBot`
3. Configurez :

| Paramètre | Valeur |
|---|---|
| **Name** | `ultimatebot-api` |
| **Region** | `Frankfurt (EU Central)` ou le plus proche |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` (pour commencer) |

### 2.3 — Configurer les variables d'environnement
Dans l'onglet **"Environment"** de votre service, ajoutez ces variables **une par une** :

| Variable | Valeur | Description |
|---|---|---|
| `NODE_ENV` | `production` | Mode production |
| `PORT` | `5000` | Port du serveur |
| `MONGODB_URI` | `mongodb+srv://derivadmin:VOTREMDP@UltimateBot.xxxxx.mongodb.net/UltimateBot?retryWrites=true&w=majority` | URI MongoDB Atlas (étape 1) |
| `JWT_SECRET` | `votre_cle_secrete_longue_aleatoire_32chars` | Clé secrète JWT (générez une chaîne aléatoire de 32+ caractères) |
| `JWT_EXPIRE` | `7d` | Durée de validité du token |
| `ENCRYPTION_KEY` | `votre_cle_encryption_32_caracteres` | Clé d'encryption (exactement 32 caractères) |
| `DERIV_APP_ID` | `votre_deriv_app_id` | ID app Deriv (obtenir sur https://api.deriv.com) |
| `DERIV_WS_URL` | `wss://ws.binaryws.com/websockets/v3` | URL WebSocket Deriv |
| `METAAPI_TOKEN` | `votre_token_metaapi` | Token MetaApi (https://metaapi.cloud) |
| `SMTP_HOST` | `smtp.gmail.com` | Serveur SMTP |
| `SMTP_PORT` | `587` | Port SMTP |
| `SMTP_USER` | `votre_email@gmail.com` | Email SMTP |
| `SMTP_PASS` | `votre_mot_de_passe_app` | Mot de passe d'application Gmail |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Clé secrète Stripe |
| `USDT_TRON_ADDRESS` | `TXxx...` | Adresse USDT TRC-20 |
| `FRONTEND_URL` | `https://votre-app.vercel.app` | URL du frontend Vercel (à remplir après étape 3) |
| `VAPID_PUBLIC_KEY` | `votre_cle_publique` | Clé VAPID publique |
| `VAPID_PRIVATE_KEY` | `votre_cle_privee` | Clé VAPID privée |
| `VAPID_EMAIL` | `mailto:votre_email@gmail.com` | Email VAPID |

> **Astuce pour générer les clés VAPID** : exécutez localement `npx web-push generate-vapid-keys`

> **Astuce pour le JWT_SECRET** : allez sur https://randomkeygen.com et copiez un "256-bit WEP Key"

### 2.4 — Déployer
1. Cliquez **"Create Web Service"**
2. Render va automatiquement :
   - Cloner le repo
   - Exécuter `npm install` dans le dossier `server/`
   - Lancer `npm start`
3. Attendez que le statut passe à **"Live"** (environ 2-5 minutes)
4. **Notez l'URL** affichée, par exemple : `https://ultimatebot-api.onrender.com`

### 2.5 — Vérifier le déploiement
Ouvrez dans votre navigateur :
```
https://ultimatebot-api.onrender.com/api/health
```
Vous devriez voir :
```json
{"status":"ok","timestamp":"2026-03-06T..."}
```

---

# ÉTAPE 3 : Déployer le Frontend (Client) sur Vercel

### 3.1 — Créer un compte Vercel
1. Allez sur **https://vercel.com**
2. Cliquez **"Sign Up"**
3. Connectez-vous avec votre **compte GitHub**

### 3.2 — Importer le projet
1. Cliquez **"Add New..."** → **"Project"**
2. Sélectionnez le repo : `valdes557/UltimateBot`
3. Configurez :

| Paramètre | Valeur |
|---|---|
| **Framework Preset** | `Vite` |
| **Root Directory** | `client` (cliquez "Edit" pour changer) |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 3.3 — Configurer les variables d'environnement
Dans la section **"Environment Variables"**, ajoutez :

| Variable | Valeur |
|---|---|
| `VITE_API_URL` | `https://ultimatebot-api.onrender.com/api` |
| `VITE_USDT_TRON_ADDRESS` | `TXxx...` (votre adresse USDT TRC-20) |
| `VITE_BINANCE_PAY_MERCHANT_ID` | `votre_merchant_id` (optionnel) |

> **IMPORTANT** : `VITE_API_URL` doit pointer vers votre URL Render de l'étape 2.4, suivi de `/api`

### 3.4 — Déployer
1. Cliquez **"Deploy"**
2. Vercel va automatiquement :
   - Cloner le repo
   - Installer les dépendances
   - Exécuter `npm run build`
   - Déployer les fichiers statiques
3. Attendez que le déploiement finisse (environ 1-2 minutes)
4. **Notez l'URL** affichée, par exemple : `https://UltimateBot.vercel.app`

### 3.5 — Vérifier
Ouvrez l'URL Vercel dans votre navigateur. La landing page devrait s'afficher.

---

# ÉTAPE 4 : Mettre à jour le FRONTEND_URL sur Render

**C'est crucial !** Maintenant que vous avez l'URL Vercel :

1. Retournez sur **Render** → votre service `ultimatebot-api`
2. Allez dans **"Environment"**
3. Modifiez la variable `FRONTEND_URL` :
   ```
   https://UltimateBot.vercel.app
   ```
   (remplacez par votre URL Vercel réelle)
4. Cliquez **"Save Changes"**
5. Render va redéployer automatiquement

---

# ÉTAPE 5 : Créer le compte administrateur

1. Ouvrez votre site Vercel
2. Allez sur `/register` et créez un compte normal
3. Connectez-vous à MongoDB Atlas :
   - **Database** → **Browse Collections** → `users`
   - Trouvez votre utilisateur
   - Modifiez le champ `role` de `"user"` à `"admin"`
4. Déconnectez-vous et reconnectez-vous — vous serez redirigé vers `/admin`

> **Alternative** : utilisez MongoDB Compass (GUI) ou le script `scripts/createAdmin.js` localement.

---

# ÉTAPE 6 : Domaine personnalisé (optionnel)

### Sur Vercel :
1. **Settings** → **Domains** → **Add Domain**
2. Entrez votre domaine (ex: `ultimatebot.com`)
3. Ajoutez les enregistrements DNS indiqués chez votre registraire

### Sur Render :
1. **Settings** → **Custom Domains** → **Add Custom Domain**
2. Entrez votre sous-domaine API (ex: `api.ultimatebot.com`)
3. Ajoutez l'enregistrement CNAME indiqué

N'oubliez pas de mettre à jour `FRONTEND_URL` sur Render si vous changez le domaine du frontend.

---

# Résolution de problèmes courants

| Problème | Solution |
|---|---|
| Erreur CORS | Vérifiez que `FRONTEND_URL` sur Render contient l'URL exacte du frontend Vercel |
| Erreur 401 sur l'API | Vérifiez que `JWT_SECRET` est le même en local et en production |
| MongoDB connection error | Vérifiez l'URI MongoDB Atlas et que l'accès réseau est configuré sur 0.0.0.0/0 |
| Page blanche sur Vercel | Vérifiez que le Root Directory est bien `client` |
| Variables VITE_ non lues | Les variables Vite doivent commencer par `VITE_` et Vercel doit être redéployé après modification |
| Render met longtemps | Le plan gratuit Render met en veille après 15min d'inactivité. Le premier accès peut prendre 30-60s |

---

# Commandes utiles en local

```bash
# Démarrer le serveur local
cd server
npm run dev

# Démarrer le client local
cd client
npm run dev

# Générer les clés VAPID
npx web-push generate-vapid-keys

# Build le client pour production
cd client
npm run build
```
