import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import useStore from '../../store/useStore'
import { derivAPI, binanceAPI, bybitAPI, settingsAPI } from '../../lib/api'
import { startDerivOAuth } from '../../lib/derivOAuth'
import {
  Bot, Play, Square, Pause, ShieldCheck, AlertTriangle, RefreshCw,
  Zap, Bitcoin, Layers, ArrowRight, ExternalLink, CheckCircle2,
  TrendingUp, Clock, Sliders, DollarSign, X, Check, Loader2, Info
} from 'lucide-react'

// Robots de secours Deriv
const DEFAULT_DERIV_BOTS = [
  {
    _id: 'd-1',
    name: 'Digit Over 2 Sniper',
    slug: 'digit-over-2-sniper',
    category: 'deriv',
    contractType: 'DIGITOVER',
    symbols: ['R_100', 'R_75', 'R_50'],
    strategyType: 'digit_analyzer',
    description: 'Sniper algorithmique 1-tick basé sur l\'épuisement statistique des petits chiffres.',
    defaultSettings: { initialStake: 1, maxStake: 30, stopLoss: 20, takeProfit: 50, duration: 1, durationUnit: 't', barrier: '2' },
    winRate: '78-84%',
    badge: 'Sniper 1-Tick Rentable',
  },
  {
    _id: 'd-2',
    name: 'Digit Differ Hunter',
    slug: 'digit-differ-hunter',
    category: 'deriv',
    contractType: 'DIGITDIFF',
    symbols: ['R_100', 'R_50', '1HZ100V'],
    strategyType: 'digit_analyzer',
    description: 'Analyse statistique des 30 derniers ticks pour déterminer le chiffre froid le moins représenté.',
    defaultSettings: { initialStake: 2, maxStake: 50, stopLoss: 30, takeProfit: 60, duration: 1, durationUnit: 't', barrier: '5' },
    winRate: '95-99%',
    badge: 'Ultra Haute Précision',
  },
  {
    _id: 'd-3',
    name: 'Volatility 75 Rise/Fall AI',
    slug: 'v75-rise-fall-ai',
    category: 'deriv',
    contractType: 'CALL',
    symbols: ['R_75', 'R_100'],
    strategyType: 'trend_following',
    description: 'Suivi de tendance momentum par alignement EMA(5)/EMA(13) et confirmation RSI(7).',
    defaultSettings: { initialStake: 1, maxStake: 35, stopLoss: 20, takeProfit: 45, duration: 5, durationUnit: 't' },
    winRate: '72-78%',
    badge: 'Momentum IA',
  },
  {
    _id: 'd-4',
    name: 'Accumulators Scalper Quantum',
    slug: 'accumulators-scalper',
    category: 'deriv',
    contractType: 'ACCU',
    symbols: ['R_50', 'R_100'],
    strategyType: 'accumulator',
    description: 'Croissance exponentielle par tick avec protection automatique de barrière anti-crash.',
    defaultSettings: { initialStake: 1, maxStake: 25, stopLoss: 15, takeProfit: 35, growthRate: 2 },
    winRate: '80-86%',
    badge: 'Accumulator NEW',
  },
  {
    _id: 'd-5',
    name: 'Boom & Crash Spiker',
    slug: 'boom-crash-spiker',
    category: 'deriv',
    contractType: 'PUT',
    symbols: ['BOOM1000', 'CRASH1000'],
    strategyType: 'tick_volatility',
    description: 'Chasseur de pics de volatilité et rebonds post-spike sur Boom 1000 et Crash 1000.',
    defaultSettings: { initialStake: 2, maxStake: 50, stopLoss: 30, takeProfit: 70, duration: 5, durationUnit: 't' },
    winRate: '75-80%',
    badge: 'Spike Hunter',
  },
]

// Robots Binance Crypto
const DEFAULT_BINANCE_BOTS = [
  {
    _id: 'b-1',
    name: 'BTC Grid Master Spot',
    slug: 'btc-grid-spot',
    category: 'binance',
    exchange: 'binance',
    market: 'spot',
    symbol: 'BTC/USDT',
    strategyType: 'grid',
    description: 'Achat à bas prix et revente en continu par quadrillage d\'ordres dans le canal de volatilité.',
    defaultSettings: { initialStake: 20, stopLoss: 50, takeProfit: 100 },
    winRate: '75-82%',
    badge: 'Spot Grid',
  },
  {
    _id: 'b-2',
    name: 'ETH Futures Trend Scalper',
    slug: 'eth-futures-scalper',
    category: 'binance',
    exchange: 'binance',
    market: 'futures',
    symbol: 'ETH/USDT',
    strategyType: 'scalping',
    description: 'Scalping haute fréquence sur cassures de bandes de Bollinger et divergence RSI.',
    defaultSettings: { initialStake: 15, stopLoss: 30, takeProfit: 60, leverage: 5 },
    winRate: '74-80%',
    badge: 'Futures 5x',
  },
  {
    _id: 'b-3',
    name: 'SOL Momentum Surge',
    slug: 'sol-momentum',
    category: 'binance',
    exchange: 'binance',
    market: 'both',
    symbol: 'SOL/USDT',
    strategyType: 'momentum',
    description: 'Détection des poussées de volume anormales et suivi directionnel avec trailing stop.',
    defaultSettings: { initialStake: 10, stopLoss: 25, takeProfit: 50 },
    winRate: '70-76%',
    badge: 'High Volatility',
  },
  {
    _id: 'b-4',
    name: 'BNB Smart DCA Accumulator',
    slug: 'bnb-dca-smart',
    category: 'binance',
    exchange: 'binance',
    market: 'spot',
    symbol: 'BNB/USDT',
    strategyType: 'dca',
    description: 'Dollar Cost Averaging intelligent lors des creux de marché avec sortie progressive à l\'objectif.',
    defaultSettings: { initialStake: 25, stopLoss: 40, takeProfit: 80 },
    winRate: '85-90%',
    badge: 'DCA Sécurisé',
  },
]

// Robots Bybit Multi-Marchés
const DEFAULT_BYBIT_BOTS = [
  {
    _id: 'by-1',
    name: 'Gold (XAU/USDT) Super Trend',
    slug: 'gold-xau-supertrend',
    category: 'bybit',
    exchange: 'bybit',
    market: 'linear',
    symbol: 'XAUUSDT',
    strategyType: 'supertrend',
    description: 'Trading automatique sur l\'Or (XAU) basé sur le SuperTrend H1 et l\'ATR multi-temporel.',
    defaultSettings: { initialStake: 20, stopLoss: 40, takeProfit: 90, leverage: 10 },
    winRate: '76-82%',
    badge: 'Or & Matières Premières',
  },
  {
    _id: 'by-2',
    name: 'EUR/USD Forex Pulse Bybit',
    slug: 'eurusd-pulse-bybit',
    category: 'bybit',
    exchange: 'bybit',
    market: 'linear',
    symbol: 'EURUSDT',
    strategyType: 'forex_pulse',
    description: 'Exploitation des sessions Londres/New York avec cassures de ranges asiatiques sur l\'Euro/Dollar.',
    defaultSettings: { initialStake: 15, stopLoss: 25, takeProfit: 50, leverage: 10 },
    winRate: '73-77%',
    badge: 'Forex Bybit',
  },
  {
    _id: 'by-3',
    name: 'US500 Index Momentum',
    slug: 'us500-index-momentum',
    category: 'bybit',
    exchange: 'bybit',
    market: 'linear',
    symbol: 'SP500USDT',
    strategyType: 'index_flow',
    description: 'Suivi de flux institutionnel sur les indices américains à l\'ouverture des marchés US.',
    defaultSettings: { initialStake: 25, stopLoss: 50, takeProfit: 120, leverage: 5 },
    winRate: '72-78%',
    badge: 'Indices Boursiers',
  },
  {
    _id: 'by-4',
    name: 'Crude Oil (USDT) Breakout',
    slug: 'oil-crude-breakout',
    category: 'bybit',
    exchange: 'bybit',
    market: 'linear',
    symbol: 'OILUSDT',
    strategyType: 'breakout',
    description: 'Stratégie de cassure de volatilité sur le pétrole brut lors des annonces de stocks d\'énergie.',
    defaultSettings: { initialStake: 20, stopLoss: 35, takeProfit: 80, leverage: 5 },
    winRate: '71-75%',
    badge: 'Énergie & Pétrole',
  },
]

export default function DashboardBots() {
  const { user, platformSettings } = useStore()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('deriv') // 'deriv' | 'binance' | 'bybit'
  const [derivBots, setDerivBots] = useState([])
  const [binanceBots, setBinanceBots] = useState([])
  const [bybitBots, setBybitBots] = useState([])
  const [loading, setLoading] = useState(true)

  // Comptes connectés
  const [derivAccounts, setDerivAccounts] = useState([])
  const [binanceAccounts, setBinanceAccounts] = useState([])
  const [bybitAccounts, setBybitAccounts] = useState([])

  // Modal de lancement
  const [selectedBotForStart, setSelectedBotForStart] = useState(null)
  const [stake, setStake] = useState(1)
  const [stopLoss, setStopLoss] = useState(20)
  const [takeProfit, setTakeProfit] = useState(50)
  const [useMartingale, setUseMartingale] = useState(false)
  const [martingaleMultiplier, setMartingaleMultiplier] = useState(2)
  const [starting, setStarting] = useState(false)

  const derivAppId = platformSettings?.derivAppId || '34HkkJSIK047dAEWEgXML'
  const derivReferralLink = platformSettings?.derivReferralLink || 'https://track.deriv.com/_DEFAULT/'
  const binanceReferralLink = platformSettings?.binanceReferralLink || ''
  const bybitReferralLink = platformSettings?.bybitReferralLink || ''

  // Statut de connexion des 3 brokers
  const isDerivConnected = derivAccounts.length > 0
  const isBinanceConnected = binanceAccounts.some(a => a.exchange === 'binance' || !a.exchange)
  const isBybitConnected = bybitAccounts.length > 0 || binanceAccounts.some(a => a.exchange === 'bybit')

  const derivAccount = derivAccounts[0]
  const isTrialValid = derivAccount?.isTrialValid !== false
  const trialDaysRemaining = derivAccount?.trialDaysRemaining ?? 7
  const isOwner = user?.email === 'valdeslando15@gmail.com' || user?.role === 'admin' || user?.role === 'super_admin'

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // 1. Deriv Bots & Comptes
      const [dBotsRes, dAccRes] = await Promise.all([
        derivAPI.getBots().catch(() => ({ data: { bots: [] } })),
        derivAPI.getAccounts().catch(() => ({ data: { accounts: [] } })),
      ])
      setDerivBots(dBotsRes.data?.bots?.length ? dBotsRes.data.bots : DEFAULT_DERIV_BOTS)
      setDerivAccounts(dAccRes.data?.accounts || [])

      // 2. Binance & Bybit Comptes
      const [bAccRes, byAccRes] = await Promise.all([
        binanceAPI.getAccounts().catch(() => ({ data: { accounts: [] } })),
        bybitAPI.getAccounts().catch(() => ({ data: { accounts: [] } })),
      ])
      setBinanceAccounts(bAccRes.data?.accounts || [])
      setBybitAccounts(byAccRes.data?.accounts || [])

      setBinanceBots(DEFAULT_BINANCE_BOTS)
      setBybitBots(DEFAULT_BYBIT_BOTS)
    } catch (_) {
      setDerivBots(DEFAULT_DERIV_BOTS)
      setBinanceBots(DEFAULT_BINANCE_BOTS)
      setBybitBots(DEFAULT_BYBIT_BOTS)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenStartModal(bot) {
    setSelectedBotForStart(bot)
    setStake(bot.defaultSettings?.initialStake || (bot.category === 'deriv' ? 1 : 20))
    setStopLoss(bot.defaultSettings?.stopLoss || 20)
    setTakeProfit(bot.defaultSettings?.takeProfit || 50)
    setUseMartingale(false)
    setMartingaleMultiplier(2)
  }

  async function handleConfirmStart() {
    if (!selectedBotForStart) return
    setStarting(true)

    try {
      if (selectedBotForStart.category === 'deriv') {
        if (!isDerivConnected) {
          startDerivOAuth(derivAppId)
          return
        }
        await derivAPI.startSession({
          accountId: derivAccount._id,
          botId: selectedBotForStart._id,
          settings: {
            initialStake: Number(stake),
            stopLoss: Number(stopLoss),
            takeProfit: Number(takeProfit),
            martingaleEnabled: useMartingale,
            martingaleMultiplier: useMartingale ? Number(martingaleMultiplier) : 1,
          },
        })
        setSelectedBotForStart(null)
        navigate('/dashboard/deriv')
      } else {
        // Binance ou Bybit
        navigate('/dashboard/binance')
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Hub des Robots de Trading Automatisés
          </h1>
          <p className="text-muted-foreground text-sm">
            Tous les robots dans un seul dashboard, organisés par marché : Deriv SmartTrader, Binance Crypto et Bybit Multi-Marchés.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner ? (
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1">
              👑 Propriétaire — Accès à Vie Illimité
            </Badge>
          ) : isTrialValid ? (
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1">
              ⏱️ Essai Gratuit : {trialDaysRemaining} jours restants
            </Badge>
          ) : (
            <Badge variant="destructive" className="px-3 py-1">
              Essai Expiré
            </Badge>
          )}
        </div>
      </div>

      {/* ── BROKER CONNECTION STATUS PILLS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Deriv Status */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
          isDerivConnected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-card border-border'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                Deriv SmartTrader
                {isDerivConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isDerivConnected
                  ? `Connecté · Solde: $${Number(derivAccount?.balance || 0).toFixed(2)} USD`
                  : 'Compte non connecté'}
              </div>
            </div>
          </div>
          {isDerivConnected ? (
            <Link to="/dashboard/deriv">
              <Button size="sm" variant="outline" className="h-7 text-xs">Ouvrir</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={() => startDerivOAuth(derivAppId)} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
              Connecter
            </Button>
          )}
        </div>

        {/* Binance Status */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
          isBinanceConnected ? 'bg-amber-500/10 border-amber-500/30' : 'bg-card border-border'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              <Bitcoin className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                Binance Crypto
                {isBinanceConnected && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isBinanceConnected ? 'Clés API actives (Spot/Futures)' : 'API non connectée'}
              </div>
            </div>
          </div>
          <Link to="/dashboard/binance">
            <Button size="sm" variant={isBinanceConnected ? 'outline' : 'default'} className="h-7 text-xs">
              {isBinanceConnected ? 'Gérer' : 'Connecter'}
            </Button>
          </Link>
        </div>

        {/* Bybit Status */}
        <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
          isBybitConnected ? 'bg-orange-500/10 border-orange-500/30' : 'bg-card border-border'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                Bybit Multi-Marchés
                {isBybitConnected && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isBybitConnected ? 'Clés API actives (Forex/Commodities)' : 'API non connectée'}
              </div>
            </div>
          </div>
          <Link to="/dashboard/binance">
            <Button size="sm" variant={isBybitConnected ? 'outline' : 'default'} className="h-7 text-xs">
              {isBybitConnected ? 'Gérer' : 'Connecter'}
            </Button>
          </Link>
        </div>
      </div>

      {/* ── CATEGORY TABS ── */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('deriv')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'deriv'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-card hover:bg-accent text-muted-foreground'
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>Robots Deriv SmartTrader ({derivBots.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('binance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'binance'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-card hover:bg-accent text-muted-foreground'
          }`}
        >
          <Bitcoin className="h-4 w-4" />
          <span>Robots Binance Crypto ({binanceBots.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('bybit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'bybit'
              ? 'bg-orange-600 text-white shadow-md'
              : 'bg-card hover:bg-accent text-muted-foreground'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Robots Bybit Multi-Marchés ({bybitBots.length})</span>
        </button>
      </div>

      {/* ── ROBOTS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(activeTab === 'deriv' ? derivBots : activeTab === 'binance' ? binanceBots : bybitBots).map(bot => {
          const isConnected =
            activeTab === 'deriv' ? isDerivConnected : activeTab === 'binance' ? isBinanceConnected : isBybitConnected

          return (
            <Card key={bot._id} className="flex flex-col justify-between hover:border-primary/50 transition shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${
                      activeTab === 'deriv' ? 'bg-emerald-500/10 text-emerald-400' : activeTab === 'binance' ? 'bg-amber-500/10 text-amber-400' : 'bg-orange-500/10 text-orange-400'
                    }`}>
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">{bot.name}</CardTitle>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {bot.symbol || bot.symbols?.join(', ') || 'Multi-marchés'}
                      </span>
                    </div>
                  </div>
                  {bot.badge && (
                    <Badge variant="outline" className="text-[10px] shrink-0 font-bold border-emerald-500/40 text-emerald-400">
                      {bot.badge}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs pt-2 line-clamp-2">
                  {bot.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-muted/40 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Winrate</span>
                    <span className="font-mono font-bold text-emerald-500">{bot.winRate || '75-80%'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Mise Base</span>
                    <span className="font-mono font-bold">${bot.defaultSettings?.initialStake || 1}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Marché</span>
                    <span className="font-mono font-bold capitalize">{bot.market || 'Deriv'}</span>
                  </div>
                </div>

                {isConnected ? (
                  <Button
                    onClick={() => handleOpenStartModal(bot)}
                    className="w-full text-xs font-bold"
                    variant="gradient"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Configurer &amp; Lancer
                  </Button>
                ) : (
                  <div className="space-y-1.5">
                    <Button
                      onClick={() => {
                        if (activeTab === 'deriv') startDerivOAuth(derivAppId)
                        else navigate('/dashboard/binance')
                      }}
                      variant="outline"
                      className="w-full text-xs font-semibold border-dashed"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Connecter {activeTab === 'deriv' ? 'Deriv' : activeTab === 'binance' ? 'Binance' : 'Bybit'} pour lancer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── MODAL DE LANCEMENT SÉCURISÉ ── */}
      {selectedBotForStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base">Lancer {selectedBotForStart.name}</h3>
              </div>
              <button onClick={() => setSelectedBotForStart(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Mise initiale (Stake USD)</label>
                <Input
                  type="number"
                  min="0.35"
                  step="0.5"
                  value={stake}
                  onChange={e => setStake(parseFloat(e.target.value) || 1)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Take Profit (USD)</label>
                  <Input
                    type="number"
                    min="1"
                    value={takeProfit}
                    onChange={e => setTakeProfit(parseFloat(e.target.value) || 50)}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Stop Loss (USD)</label>
                  <Input
                    type="number"
                    min="1"
                    value={stopLoss}
                    onChange={e => setStopLoss(parseFloat(e.target.value) || 20)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              {/* CONTRÔLE STRICT DE LA MARTINGALE */}
              <div className="p-3.5 rounded-xl border bg-card space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={useMartingale}
                    onChange={e => setUseMartingale(e.target.checked)}
                    className="rounded accent-emerald-500 w-4 h-4"
                  />
                  <span>Activer la Martingale en cas de perte</span>
                </label>
                <p className="text-[10px] text-muted-foreground">
                  {useMartingale
                    ? 'La mise sera multipliée uniquement selon le multiplicateur défini ci-dessous.'
                    : 'Martingale désactivée : la mise reste strictement constante (aucune augmentation après perte !)'}
                </p>

                {useMartingale && (
                  <div>
                    <label className="font-semibold block mb-1">Multiplicateur Martingale</label>
                    <Input
                      type="number"
                      min="1.1"
                      max="5"
                      step="0.1"
                      value={martingaleMultiplier}
                      onChange={e => setMartingaleMultiplier(parseFloat(e.target.value) || 2)}
                      className="font-mono text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedBotForStart(null)} className="w-1/2">
                Annuler
              </Button>
              <Button
                variant="gradient"
                onClick={handleConfirmStart}
                disabled={starting}
                className="w-1/2"
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                Démarrer le robot
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
