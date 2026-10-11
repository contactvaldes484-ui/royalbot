# UltimateBot — Documentation Complète de la Plateforme

## Version 1.0 — Mars 2026

---

# TABLE DES MATIÈRES

1. [Présentation Générale](#1-présentation-générale)
2. [Architecture Technique](#2-architecture-technique)
3. [Fonctionnalités Utilisateur](#3-fonctionnalités-utilisateur)
4. [Fonctionnalités Administrateur](#4-fonctionnalités-administrateur)
5. [Robots de Trading](#5-robots-de-trading)
6. [Système d'Abonnement et Paiements](#6-système-dabonnement-et-paiements)
7. [Backtest — Robot de Test](#7-backtest--robot-de-test)
8. [Sécurité](#8-sécurité)
9. [API Backend — Routes](#9-api-backend--routes)
10. [Base de Données — Modèles](#10-base-de-données--modèles)
11. [Déploiement](#11-déploiement)
12. [Variables d'Environnement](#12-variables-denvironnement)

---

# 1. PRÉSENTATION GÉNÉRALE

**UltimateBot** est une plateforme SaaS de trading automatisé qui permet aux utilisateurs d'exécuter des robots de trading sur :

- **Deriv SmartTrader** — contrats Digit Over/Under, Rise/Fall, etc.
- **MetaTrader 4 (MT4)** — Forex, Gold, BTC, indices synthétiques
- **MetaTrader 5 (MT5)** — Forex, Gold, BTC, indices synthétiques

La plateforme offre :
- Des robots préconfigurés avec différentes stratégies
- Un système d'abonnement multi-plans (gratuit, premium, VIP, personnalisé)
- Un dashboard utilisateur complet avec analytics
- Un panneau d'administration complet
- Un système de backtest pour tester les robots avant achat
- Le paiement par crypto (USDT TRC-20) et Mobile Money

### Stack Technique

| Composant | Technologie |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Zustand, Framer Motion |
| Backend | Node.js, Express.js |
| Base de données | MongoDB (Mongoose ODM) |
| Trading Deriv | WebSocket API Deriv (SmartTrader) |
| Trading MT4/MT5 | MetaApi Cloud SDK |
| Authentification | JWT + bcrypt + 2FA (TOTP) |
| Temps réel | WebSocket natif (ws) |
| Paiements | Stripe, USDT TRC-20, Mobile Money |
| Hébergement | Vercel (frontend) + Render (backend) |

---

# 2. ARCHITECTURE TECHNIQUE

## 2.1 Structure des dossiers

```
UltimateBot/
├── client/                    # Frontend React (Vite)
│   ├── src/
│   │   ├── components/        # Composants réutilisables (UI, Layout)
│   │   │   ├── layout/        # Navbar, Footer, DashboardLayout
│   │   │   └── ui/            # Button, Card, Badge, Input, etc.
│   │   ├── lib/               # API client, utilitaires
│   │   ├── pages/             # Pages publiques
│   │   │   ├── admin/         # Pages admin (AdminDashboard.jsx)
│   │   │   └── dashboard/     # Pages dashboard utilisateur
│   │   ├── store/             # Zustand store (état global)
│   │   ├── App.jsx            # Routeur principal
│   │   └── index.css          # Styles globaux + animations
│   ├── vercel.json            # Config déploiement Vercel
│   └── package.json
│
├── server/                    # Backend Node.js (Express)
│   ├── src/
│   │   ├── middleware/        # Auth, admin guard, rate limiting
│   │   ├── models/            # Modèles Mongoose (User, Bot, etc.)
│   │   ├── routes/            # Routes API (auth, bots, admin, etc.)
│   │   ├── services/          # DerivWSManager, MT5Manager, TradingEngine
│   │   └── index.js           # Point d'entrée serveur
│   ├── render.yaml            # Config déploiement Render
│   └── package.json
│
├── scripts/                   # Scripts utilitaires (createAdmin.js)
├── GUIDE_DEPLOIEMENT.md       # Guide de déploiement pas à pas
└── DOCUMENTATION_PLATEFORME.md # Ce document
```

## 2.2 Flux de données

```
Utilisateur (navigateur)
    │
    ▼
Frontend React (Vercel)
    │  Requêtes HTTP (axios)
    ▼
Backend Express (Render)
    │
    ├──→ MongoDB Atlas (données)
    ├──→ Deriv WebSocket API (trading SmartTrader)
    ├──→ MetaApi Cloud (trading MT4/MT5)
    ├──→ Stripe (paiements carte)
    └──→ SMTP / Telegram (notifications)
```

---

# 3. FONCTIONNALITÉS UTILISATEUR

## 3.1 Pages Publiques

### Landing Page (`/`)
- Hero animé avec graphique de trading en temps réel (SVG)
- Compteurs animés (traders actifs, trades exécutés, win rate)
- Catalogue de robots avec switch Deriv / MT4-MT5
- Section BackTest — CTA pour tester le robot gratuitement
- Carrousel défilant de captures de profits (marquee)
- Section fonctionnalités (8 features)
- CTA final d'inscription

### Page Tarifs (`/pricing`)
- 3 plans Deriv : Starter (gratuit), Premium ($29.99/mois), VIP ($79.99/mois)
- 3 plans MT5 : MT Lite (gratuit), MT Pro ($29.99/mois), MT Elite ($79.99/mois)
- Switch Mensuel/Annuel avec -17% de réduction
- Bouton "Choisir ce plan" → redirige vers la page de détails du plan

### Page Détails du Plan (`/plan/:slug`)
- Affiche toutes les informations du robot : nom, description, plateformes, capital minimum, mise minimum, fonctionnalités, paramètres par défaut
- Formulaire de paiement avec 2 méthodes :
  - **USDT TRC-20** : adresse affichée + champ TxID
  - **Mobile Money** : instructions manuelles
- Soumission du paiement → en attente de vérification admin

### Page Backtest (`/backtest`)
- Interface de test du robot en mode DEMO uniquement
- Configuration : stratégie, symboles, capital, risk %, lot size, SL/TP
- Simulation en temps réel avec progression
- Résultats : win rate, profit, drawdown, profit factor
- Tableau des trades simulés
- **Mode réel BLOQUÉ** — message d'erreur si tentative

### Autres pages publiques
- **Robots** (`/robots`) — catalogue complet des robots
- **FAQ** (`/faq`) — questions fréquentes
- **Blog** (`/blog`) — articles et actualités
- **Contact** (`/contact`) — formulaire de contact
- **Leaderboard** (`/leaderboard`) — classement des meilleurs traders
- **Connexion** (`/login`) — avec support 2FA
- **Inscription** (`/register`)

## 3.2 Dashboard Utilisateur (`/dashboard`)

### Accueil (`/dashboard`)
- Résumé du compte : balance, profit total, win rate, trades
- Graphique equity curve
- Sessions actives en cours
- Actions rapides

### Robots Deriv (`/dashboard/bots`)
- Liste des robots disponibles selon le plan
- Démarrer / Arrêter / Pause / Reprendre un robot
- Paramètres personnalisables : mise, stop loss, take profit, martingale
- Sessions actives et historique

### MT4 / MT5 (`/dashboard/mt5`)
- Connecter un compte MT4 ou MT5 (via MetaApi)
- Voir les positions ouvertes
- Lancer un robot sur le compte connecté
- Paramètres : stratégie, lot size, risk %, trailing stop, news filter
- Sessions actives et historique des trades

### Analytics (`/dashboard/analytics`)
- Equity curve
- Statistiques par contrat, par symbole
- Win rate par période
- Graphiques interactifs (Recharts)

### Trades (`/dashboard/trades`)
- Historique complet des trades avec filtres
- Détails de chaque trade : symbole, type, montant, profit, durée

### Abonnement (`/dashboard/subscription`)
- Plan actuel et date d'expiration
- Changer de plan
- Annuler l'abonnement
- Historique des paiements

### Retraits (`/dashboard/withdrawals`)
- Demander un retrait
- Historique des retraits et statuts

### Paramètres (`/dashboard/settings`)
- Modifier le profil (nom, email)
- Changer le mot de passe
- Activer/Désactiver le 2FA
- Mode démo/réel
- Connexion Deriv (token API)

### Guide (`/dashboard/guide`)
- Guide d'utilisation pas à pas de la plateforme

---

# 4. FONCTIONNALITÉS ADMINISTRATEUR

## 4.1 Accès Admin (`/admin`)

L'administrateur accède au panneau via `/admin`. Seuls les utilisateurs avec `role: "admin"` y ont accès. Les autres sont redirigés vers `/dashboard`.

### Vue d'ensemble (`/admin`)
- KPIs : utilisateurs totaux, revenus, trades, sessions actives
- Tendances et graphiques rapides
- Actions rapides (gérer utilisateurs, retraits)

### Gestion des Utilisateurs (`/admin/users`)
- Liste paginée de tous les utilisateurs
- Recherche par nom/email
- Modifier un utilisateur : plan, rôle, statut
- Voir les sessions d'un utilisateur
- Bannir/Débannir

### Gestion des Robots (`/admin/bots`)

#### Onglet "Catalogue Robots"
- **Créer un robot** : formulaire complet avec :
  - Nom, description, plan/tier (texte libre)
  - Plateformes supportées (Deriv, MT4, MT5 — boutons toggle)
  - Prix, cycle de facturation (gratuit, mensuel, trimestriel, annuel, à vie)
  - Capital minimum, montant minimum par trade
  - Taux de commission sur retraits
  - Paramètres par défaut (mise initiale, max, stop loss, take profit, martingale, max trades)
  - Paramètres MT5 (stratégie, trailing stop, news filter, max daily loss, risk %)
  - Contrats Deriv supportés (toggle buttons)
  - Symboles, fonctionnalités, badge, couleur, popularité
- **Modifier un robot** — même formulaire pré-rempli
- **Activer/Désactiver un robot**
- **Supprimer un robot** (bloqué si sessions actives)
- Grille de cards avec aperçu rapide de chaque robot

#### Onglet "Sessions actives"
- Tableau de toutes les sessions Deriv et MT5 en cours
- Filtres par plateforme, statut, recherche
- Arrêter une session à distance
- Modal pour activer un robot pour un client spécifique

### Gestion des Abonnements (`/admin/subscriptions`)
- Liste de tous les abonnements
- Accorder un abonnement gratuit à un utilisateur
- Changer le plan d'un utilisateur
- Confirmer un paiement crypto manuellement
- Activer/Désactiver un abonnement

### Gestion des Retraits (`/admin/withdrawals`)
- Liste des demandes de retrait
- Approuver ou rejeter un retrait
- Historique des retraits traités

### Revenus (`/admin/revenue`)
- Graphique des revenus par période
- Statistiques financières

### Notifications (`/admin/notifications`)
- Envoyer une notification push à tous les utilisateurs
- Envoyer une notification ciblée

### Marketing / Screenshots (`/admin/screenshots`)
- Ajouter des captures d'écran de profits (base64)
- Titre, description, montant du profit, trader, plateforme
- Activer/Désactiver une capture
- Les captures actives s'affichent sur la landing page en carrousel

---

# 5. ROBOTS DE TRADING

## 5.1 Robots Deriv (SmartTrader)

Les robots Deriv se connectent à l'API WebSocket SmartTrader pour exécuter des contrats automatiquement.

**Contrats supportés** :
- Digit Over / Under
- Digit Match / Differs
- Digit Odd / Even
- Rise / Fall
- Higher / Lower

**Fonctionnement** :
1. L'utilisateur connecte son compte Deriv (token API)
2. Il choisit un robot disponible dans son plan
3. Il configure les paramètres (mise, SL, TP, martingale)
4. Le robot exécute les trades automatiquement
5. Les résultats sont affichés en temps réel via WebSocket

## 5.2 Robots MT4 / MT5

Les robots MT4/MT5 se connectent via MetaApi Cloud pour exécuter des ordres sur les plateformes MetaTrader.

**Stratégies disponibles** :
- **Scalper EMA** : EMA(8/21) crossover + RSI(14)
- **MACD + Bollinger** : MACD histogram + Bollinger Bands breakout
- **RSI + Stochastic** : RSI oversold/overbought + Stochastic %K/%D
- **Multi-TF AI** : Analyse multi-timeframe M1/M5/M15/H1

**Symboles supportés** :
- XAUUSD (Or), BTCUSD
- EURUSD, GBPUSD, USDJPY
- Volatility 75, Volatility 100
- Crash 1000, Boom 1000
- Step Index, Range Break, Jump indices

**Paramètres configurables** :
- Lot size, Risk % par trade
- Stop Loss / Take Profit
- Trailing Stop dynamique
- Max trades simultanés
- Max daily loss
- News filter
- Martingale (niveaux configurables)

## 5.3 Modèle de données Bot

Chaque robot en base de données contient :

| Champ | Type | Description |
|---|---|---|
| `name` | String | Nom du robot |
| `slug` | String | Identifiant URL unique |
| `tier` | String | Plan associé (texte libre) |
| `description` | String | Description |
| `platforms` | Array | `['deriv', 'mt4', 'mt5']` |
| `price` | Number | Prix de l'abonnement |
| `billingCycle` | String | `free/monthly/quarterly/yearly/lifetime` |
| `minCapital` | Number | Capital minimum requis |
| `minTradeAmount` | Number | Mise minimum par trade |
| `commissionRate` | Number | Commission sur retraits (%) |
| `supportedContracts` | Array | Contrats Deriv supportés |
| `supportedSymbols` | Array | Symboles tradables |
| `defaultSettings` | Object | Paramètres par défaut |
| `mt5Settings` | Object | Paramètres MT5 spécifiques |
| `features` | Array | Liste des fonctionnalités |
| `isActive` | Boolean | Robot actif/inactif |
| `isPopular` | Boolean | Badge "Populaire" |

---

# 6. SYSTÈME D'ABONNEMENT ET PAIEMENTS

## 6.1 Plans disponibles

L'administrateur peut créer n'importe quel plan via le catalogue robots. Les plans par défaut :

| Plan | Prix | Plateforme | Fonctionnalités clés |
|---|---|---|---|
| Starter | Gratuit | Deriv | Digit Over/Under, 30 trades/session, commission 10% |
| Premium | $29.99/mois | Deriv | Digit + Rise/Fall, Martingale, 100 trades |
| VIP | $79.99/mois | Deriv | Tous contrats, IA, Copy trading, 200 trades |
| MT Lite | Gratuit | MT4/MT5 | XAUUSD & BTCUSD, 1 trade simultané |
| MT Pro | $29.99/mois | MT4/MT5 | Multi-paires, 3 trades, Martingale |
| MT Elite | $79.99/mois | MT4/MT5 | Tous marchés, IA, 5 trades |

## 6.2 Flux de paiement

```
Utilisateur clique "Choisir ce plan"
        │
        ▼
Page détails du plan (/plan/:slug)
        │
        ├── USDT TRC-20 : copie l'adresse, envoie, colle le TxID
        │
        └── Mobile Money : suit les instructions, contacte le support
        │
        ▼
Soumission du paiement au backend
        │
        ▼
Admin vérifie et confirme le paiement (/admin/subscriptions)
        │
        ▼
Abonnement activé → accès au robot et dashboard
```

## 6.3 Méthodes de paiement

1. **USDT TRC-20** : L'utilisateur envoie le montant exact en USDT sur l'adresse Tron affichée, puis colle le hash de transaction. L'admin vérifie sur la blockchain et active l'abonnement.

2. **Mobile Money** : L'utilisateur effectue le virement via Mobile Money selon les instructions, envoie la preuve au support, et l'admin active manuellement.

3. **Stripe** (optionnel) : Paiement par carte bancaire automatisé via Stripe Checkout.

---

# 7. BACKTEST — ROBOT DE TEST

## 7.1 Fonctionnement

La page `/backtest` permet à tout visiteur (même non inscrit) de tester le robot en mode démo.

**Caractéristiques :**
- **Mode DEMO uniquement** — le mode réel est strictement bloqué
- Si l'utilisateur tente de lancer en mode réel → erreur bloquante avec message explicite
- Simulation entièrement côté client (navigateur), aucune connexion à un broker
- 4 stratégies IA disponibles
- 7 symboles sélectionnables
- Paramètres configurables : capital, risk %, lot size, SL/TP, nombre de trades

**Résultats affichés :**
- Nombre de trades, wins, losses
- Win rate (%)
- Profit total et balance finale
- Max drawdown (%)
- Profit factor
- Tableau détaillé de chaque trade simulé

## 7.2 Objectif commercial

Le backtest sert de **démonstration** pour convaincre les visiteurs de la performance du robot. Après avoir vu les résultats, un CTA les invite à souscrire un plan payant pour trader en réel.

## 7.3 Administration des robots de test

L'administrateur peut :
- Ajouter des robots de test supplémentaires via le catalogue (`/admin/bots`)
- Configurer les paramètres et stratégies
- Le robot de test par défaut est intégré dans la page Backtest

---

# 8. SÉCURITÉ

| Mesure | Implémentation |
|---|---|
| Authentification | JWT (JSON Web Token) avec expiration configurable |
| Hachage mot de passe | bcryptjs (10 rounds de salage) |
| 2FA | TOTP via speakeasy (Google Authenticator compatible) |
| Rate limiting | express-rate-limit (100 req/15min global, 20/15min auth) |
| Headers sécurisés | helmet.js |
| CORS | Origines autorisées configurables |
| Encryption tokens | crypto-js pour les tokens Deriv stockés |
| Validation | Validation côté serveur sur toutes les routes |
| Admin guard | Middleware `requireAdmin` sur toutes les routes admin |
| XSS Protection | Sanitisation des entrées |

---

# 9. API BACKEND — ROUTES

## 9.1 Routes Publiques (sans authentification)

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/screenshots` | Captures de profits pour la landing page |
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion (avec 2FA si activé) |
| GET | `/api/bots` | Liste des robots actifs |
| GET | `/api/bots/:slug` | Détails d'un robot par slug |
| GET | `/api/blog` | Articles de blog |
| GET | `/api/leaderboard` | Classement traders |

## 9.2 Routes Utilisateur (authentification requise)

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/auth/me` | Profil utilisateur courant |
| PUT | `/api/users/profile` | Mettre à jour le profil |
| POST | `/api/users/connect-deriv` | Connecter un compte Deriv |
| POST | `/api/users/toggle-demo` | Basculer mode démo/réel |
| POST | `/api/bots/:slug/start` | Démarrer un robot Deriv |
| POST | `/api/bots/session/:id/stop` | Arrêter une session |
| GET | `/api/bots/sessions/active` | Sessions actives |
| GET | `/api/trades` | Historique des trades |
| GET | `/api/trades/stats/summary` | Statistiques trading |
| POST | `/api/subscriptions/subscribe` | Souscrire à un plan |
| POST | `/api/subscriptions/cancel` | Annuler l'abonnement |
| POST | `/api/mt5/accounts/connect` | Connecter un compte MT5 |
| POST | `/api/mt5/sessions/start` | Démarrer un robot MT5 |
| POST | `/api/withdrawals` | Demander un retrait |

## 9.3 Routes Admin (authentification + rôle admin)

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/admin/stats` | Statistiques globales |
| GET | `/api/admin/users` | Liste des utilisateurs |
| PUT | `/api/admin/users/:id` | Modifier un utilisateur |
| GET | `/api/admin/bots/catalog` | Catalogue de tous les robots |
| POST | `/api/admin/bots/catalog` | Créer un robot |
| PUT | `/api/admin/bots/catalog/:id` | Modifier un robot |
| DELETE | `/api/admin/bots/catalog/:id` | Supprimer un robot |
| PUT | `/api/admin/bots/catalog/:id/toggle` | Activer/Désactiver |
| GET | `/api/admin/robots/sessions` | Toutes les sessions actives |
| POST | `/api/admin/robots/activate-deriv` | Activer robot Deriv pour un client |
| POST | `/api/admin/robots/activate-mt5` | Activer robot MT5 pour un client |
| GET | `/api/admin/subscriptions` | Liste des abonnements |
| POST | `/api/admin/subscriptions/grant` | Accorder un abonnement |
| PUT | `/api/admin/subscriptions/:id/confirm-payment` | Confirmer paiement crypto |
| GET | `/api/admin/withdrawals` | Demandes de retrait |
| PUT | `/api/admin/withdrawals/:id` | Approuver/Rejeter retrait |
| POST | `/api/admin/notifications` | Envoyer notification |
| GET | `/api/admin/screenshots` | Captures marketing |
| POST | `/api/admin/screenshots` | Ajouter une capture |
| DELETE | `/api/admin/screenshots/:id` | Supprimer une capture |

---

# 10. BASE DE DONNÉES — MODÈLES

## 10.1 User
```
- email, password (hashé), name
- role: 'user' | 'admin'
- subscription: { plan, startDate, endDate, paymentMethod }
- deriv: { token (encrypté), accountId, isDemo }
- twoFactor: { enabled, secret }
- wallet: { balance, totalDeposits, totalWithdrawals }
- referralCode, referredBy
- isActive, isBanned
```

## 10.2 Bot
```
- name, slug, tier, description
- platforms: ['deriv', 'mt4', 'mt5']
- price, billingCycle, commissionRate
- minCapital, minTradeAmount
- supportedContracts, supportedSymbols
- defaultSettings: { initialStake, maxStake, stopLoss, takeProfit, martingale, maxTradesPerSession }
- mt5Settings: { strategy, maxOpenTrades, trailingStop, newsFilter, maxDailyLoss, riskPercent, lotSize }
- features, color, badge, isPopular, isActive, order
```

## 10.3 BotSession (Deriv)
```
- user (ref), bot (ref)
- settings: { stake, stopLoss, takeProfit, martingale, contractType, symbol }
- stats: { totalTrades, wins, losses, profit }
- status: 'active' | 'paused' | 'stopped' | 'error'
```

## 10.4 MT5Session
```
- user (ref), mt5Account (ref)
- robotPlan, platform: 'mt4' | 'mt5'
- settings: { strategy, lotSize, riskPercent, stopLoss, takeProfit, trailingStop, maxOpenTrades, newsFilter }
- stats: { totalTrades, wins, losses, profit, maxDrawdown }
- status, trades[]
```

## 10.5 Trade
```
- user (ref), session (ref)
- type, contractType, symbol
- amount, payout, profit
- entryPrice, exitPrice
- result: 'win' | 'loss'
- timestamps
```

## 10.6 ProfitScreenshot
```
- title, description, imageData (base64)
- profit, trader, platform
- isActive, order
```

---

# 11. DÉPLOIEMENT

Voir le fichier `GUIDE_DEPLOIEMENT.md` pour les instructions détaillées étape par étape.

**Résumé :**

| Composant | Service | URL Type |
|---|---|---|
| Frontend (React) | Vercel | `https://votre-app.vercel.app` |
| Backend (Node.js) | Render | `https://votre-api.onrender.com` |
| Base de données | MongoDB Atlas | `mongodb+srv://...` |

---

# 12. VARIABLES D'ENVIRONNEMENT

## Server (Render)

| Variable | Obligatoire | Description |
|---|---|---|
| `PORT` | Oui | Port du serveur (5000) |
| `MONGODB_URI` | Oui | URI MongoDB Atlas |
| `JWT_SECRET` | Oui | Clé secrète JWT (32+ caractères) |
| `JWT_EXPIRE` | Oui | Durée token (ex: 7d) |
| `ENCRYPTION_KEY` | Oui | Clé encryption (32 caractères exactement) |
| `DERIV_APP_ID` | Oui | ID application Deriv |
| `DERIV_WS_URL` | Oui | URL WebSocket Deriv |
| `METAAPI_TOKEN` | Oui | Token MetaApi Cloud |
| `FRONTEND_URL` | Oui | URL du frontend Vercel |
| `SMTP_HOST` | Non | Serveur email |
| `SMTP_PORT` | Non | Port email |
| `SMTP_USER` | Non | Email expéditeur |
| `SMTP_PASS` | Non | Mot de passe email |
| `STRIPE_SECRET_KEY` | Non | Clé Stripe |
| `USDT_TRON_ADDRESS` | Non | Adresse USDT TRC-20 |
| `VAPID_PUBLIC_KEY` | Non | Clé VAPID push |
| `VAPID_PRIVATE_KEY` | Non | Clé VAPID push |

## Client (Vercel)

| Variable | Obligatoire | Description |
|---|---|---|
| `VITE_API_URL` | Oui | URL de l'API backend (ex: `https://api.onrender.com/api`) |
| `VITE_USDT_TRON_ADDRESS` | Non | Adresse USDT affichée dans le paiement |
| `VITE_BINANCE_PAY_MERCHANT_ID` | Non | ID marchand BinancePay |

---

# FIN DU DOCUMENT

**UltimateBot Platform v1.0** — Mars 2026
Développé avec React, Node.js, MongoDB, MetaApi, Deriv API
