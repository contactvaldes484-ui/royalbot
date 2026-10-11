# RoyalBot - Plateforme SaaS de Trading Automatisé & Multi-Exchange

Plateforme SaaS complète de robots de trading automatisés connectée à **Deriv** (SmartTrader & Volatility), **Binance** et **ByBit** (Crypto & Forex), avec gestion des abonnements, passerelles de paiement (USDT TRC-20, Binance Pay, SebPay Mobile Money) et dashboard administrateur unifié.

## Stack Technique

- **Frontend**: React.js, Tailwind CSS, shadcn/ui, Recharts, Lightweight Charts, Framer Motion, Zustand
- **Backend**: Node.js, Express.js, WebSocket Deriv API, CCXT (Binance / Bybit), JWT Auth
- **Base de données**: MongoDB
- **Passerelles de paiement**: USDT TRC-20 (TronGrid), Binance Pay API, SebPay Mobile Money
- **Déploiement**: Vercel (Client) & Railway (Server)

## Structure du Projet

```
royalbot/
├── client/                  # Frontend React (Vercel)
│   ├── src/
│   │   ├── components/      # Composants UI + Layout + Trading Charts
│   │   ├── pages/           # Pages publiques + Dashboard + Admin
│   │   ├── store/           # Zustand state management
│   │   ├── lib/             # API client, utils
│   │   └── App.jsx          # Router principal
│   └── ...
├── server/                  # Backend Express
│   ├── src/
│   │   ├── models/          # MongoDB models (User, Trade, Bot, etc.)
│   │   ├── routes/          # API routes (auth, bots, trades, admin, etc.)
│   │   ├── services/        # Deriv WS Manager, Trading Engine
│   │   ├── middleware/      # Auth, rate limiting
│   │   └── index.js         # Entry point
│   └── ...
└── package.json             # Monorepo scripts
```

## Installation

### Prérequis
- Node.js 18+
- MongoDB (local ou Atlas)
- Compte Deriv avec API token

### 1. Cloner et installer

```bash
# Installer toutes les dépendances
npm run install:all
```

### 2. Configuration

Copier le fichier d'exemple et configurer les variables :

```bash
cp server/.env.example server/.env
```

Variables à configurer dans `server/.env` :
- `MONGODB_URI` - URI de connexion MongoDB
- `JWT_SECRET` - Clé secrète JWT
- `ENCRYPTION_KEY` - Clé de chiffrement AES (32 chars)
- `DERIV_APP_ID` - ID de votre app Deriv
- `FRONTEND_URL` - URL du frontend

### 3. Démarrer

```bash
# Mode développement (frontend + backend)
npm run dev

# Ou séparément :
npm run server   # Backend sur port 5000
npm run client   # Frontend sur port 3000
```

### 4. Initialisation

Après le premier démarrage, seed les données de base :

```bash
# Seed les bots (Starter, Pro, Elite)
curl -X POST http://localhost:5000/api/bots/seed

# Seed les articles de blog
curl -X POST http://localhost:5000/api/blog/seed
```

## Robots de Trading

| Robot | Tier | Contrats | Prix | Commission |
|-------|------|----------|------|------------|
| Starter Bot | Gratuit | Digit Over/Under | $0 | 10% sur retraits |
| Pro Bot | Premium | Digit + Rise/Fall | $29.99/mois | 0% |
| Elite Bot | VIP | Tous contrats + IA | $79.99/mois | 0% |

## Pages

- **Landing** - Page d'accueil avec hero, stats, features
- **Pricing** - Tarifs avec toggle mensuel/annuel
- **Robots** - Détail des 3 robots avec stratégies
- **Dashboard** - Aperçu, robots, analytics, trades, retraits, abonnement, paramètres
- **Admin** - Stats plateforme, utilisateurs, robots, retraits, revenus, notifications
- **Blog** - Articles trading éducatifs
- **FAQ** - Questions fréquentes par catégorie
- **Contact** - Formulaire de contact
- **Leaderboard** - Classement des meilleurs traders

## Fonctionnalités

- Trading automatisé via API WebSocket Deriv
- 3 robots avec stratégies différentes (Digit, Rise/Fall, Multi-contrats)
- Analyse historique ticks et probabilités
- Pattern recognition et martingale sécurisée
- Anti-loss protection et pause drawdown
- Dashboard analytics avec equity curve
- Copy trading et leaderboard
- Mode démo avec argent fictif
- Dark/Light mode
- Responsive mobile-first
- JWT Auth + 2FA
- Chiffrement des API tokens
- Rate limiting
- Notifications Telegram/WhatsApp
- Système d'abonnement (Free/Premium/VIP)
- Commission sur retraits (plan gratuit)
- Programme de parrainage

## API Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur

### Bots
- `GET /api/bots` - Liste des robots
- `POST /api/bots/:slug/start` - Démarrer un robot
- `POST /api/bots/session/:id/stop` - Arrêter une session

### Trades
- `GET /api/trades` - Historique trades
- `GET /api/trades/stats/summary` - Statistiques

### Admin
- `GET /api/admin/stats` - Stats plateforme
- `GET /api/admin/users` - Gestion utilisateurs
- `GET /api/admin/revenue` - Rapport revenus

## Licence

Propriétaire - Tous droits réservés.
