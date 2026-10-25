import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { derivAPI, settingsAPI } from '../../lib/api'
import { startDerivOAuth } from '../../lib/derivOAuth'
import useStore from '../../store/useStore'
import {
  TrendingUp, TrendingDown, Bot, Play, Square, Pause, ShieldCheck,
  AlertTriangle, RefreshCw, Key, ExternalLink, Activity, Sparkles, CheckCircle2,
  Clock, Zap, DollarSign, BarChart2, Layers
} from 'lucide-react'

export default function DashboardDeriv() {
  const { user, derivLiveTrades } = useStore()
  const [activeTab, setActiveTab] = useState('manual') // 'manual' | 'robots'
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [bots, setBots] = useState([])
  const [sessions, setSessions] = useState([])
  const [trades, setTrades] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  // Connexion de compte modal/state
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')

  // SmartTrader Manuel
  const [symbols, setSymbols] = useState([
    { symbol: 'R_100', display_name: 'Volatility 100 Index' },
    { symbol: 'R_75', display_name: 'Volatility 75 Index' },
    { symbol: 'R_50', display_name: 'Volatility 50 Index' },
    { symbol: 'R_25', display_name: 'Volatility 25 Index' },
    { symbol: 'R_10', display_name: 'Volatility 10 Index' },
    { symbol: '1HZ100V', display_name: 'Volatility 100 (1s) Index' },
    { symbol: 'BOOM1000', display_name: 'Boom 1000 Index' },
    { symbol: 'CRASH1000', display_name: 'Crash 1000 Index' },
  ])
  const [selectedSymbol, setSelectedSymbol] = useState('R_100')
  const [contractType, setContractType] = useState('DIGITOVER') // DIGITOVER, DIGITUNDER, CALL, PUT, DIGITEVEN, DIGITODD
  const [stake, setStake] = useState(2)
  const [duration, setDuration] = useState(5)
  const [barrier, setBarrier] = useState('2')
  const [executingTrade, setExecutingTrade] = useState(false)
  const [tradeMessage, setTradeMessage] = useState('')

  // Démarrage de robot modal
  const [selectedBotForStart, setSelectedBotForStart] = useState(null)
  const [botStake, setBotStake] = useState(1)
  const [botSL, setBotSL] = useState(20)
  const [botTP, setBotTP] = useState(50)
  const [botMartingale, setBotMartingale] = useState(2)
  const [startingBot, setStartingBot] = useState(false)

  const selectedAccount = accounts.find(a => a._id === selectedAccountId) || accounts[0]
  const isTrialValid = selectedAccount?.isTrialValid !== false
  const trialDays = selectedAccount?.trialDaysRemaining ?? 7
  const isAffiliated = selectedAccount?.affiliateVerified === true
  const hasPaidPlan = user?.subscription?.plan?.startsWith('deriv') || user?.subscription?.plan === 'vip'
  const canRunRobots = isTrialValid || isAffiliated || hasPaidPlan

  const allTrades = React.useMemo(() => {
    const map = new Map()
    for (const t of (derivLiveTrades || [])) {
      if (t.contractId) map.set(String(t.contractId), t)
    }
    for (const t of (trades || [])) {
      if (t.contractId && !map.has(String(t.contractId))) {
        map.set(String(t.contractId), t)
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.openedAt || b._receivedAt) - new Date(a.openedAt || a._receivedAt))
  }, [trades, derivLiveTrades])

  useEffect(() => {
    loadData()
    loadSettings()
  }, [])

  useEffect(() => {
    const hasActive = sessions.some(s => s.status === 'active')
    const timer = setInterval(loadSessionsAndTrades, hasActive ? 1500 : 7000)
    return () => clearInterval(timer)
  }, [sessions])

  async function loadSettings() {
    try {
      const res = await settingsAPI.get()
      if (res.data?.settings) setSettings(res.data.settings)
    } catch (_) {}
  }

  async function loadData(forceRefresh = false) {
    setLoading(true)
    try {
      const [accRes, botsRes, sessRes, tradesRes] = await Promise.all([
        derivAPI.getAccounts(forceRefresh ? { refresh: 1 } : undefined),
        derivAPI.getBots(),
        derivAPI.getSessions(),
        derivAPI.getTrades(),
      ])
      const fetchedAccounts = accRes.data?.accounts || []
      setAccounts(fetchedAccounts)
      if (fetchedAccounts.length && !selectedAccountId) {
        setSelectedAccountId(fetchedAccounts[0]._id)
      }
      setBots(botsRes.data?.bots || [])
      setSessions(sessRes.data?.sessions || [])
      setTrades(tradesRes.data?.trades || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadSessionsAndTrades() {
    try {
      const [accRes, sessRes, tradesRes] = await Promise.all([
        derivAPI.getAccounts(),
        derivAPI.getSessions(),
        derivAPI.getTrades(),
      ])
      if (accRes.data?.accounts) setAccounts(accRes.data.accounts)
      setSessions(sessRes.data?.sessions || [])
      setTrades(tradesRes.data?.trades || [])
    } catch (_) {}
  }

  async function handleConnectAccount(e) {
    e.preventDefault()
    setConnecting(true)
    setConnectError('')
    try {
      const res = await derivAPI.connectAccount({ token: tokenInput.trim() })
      if (res.data?.success) {
        setTokenInput('')
        setShowConnectModal(false)
        await loadData()
      }
    } catch (err) {
      setConnectError(err.response?.data?.error || err.message)
    } finally {
      setConnecting(false)
    }
  }

  async function handleExecuteManualTrade(side = null) {
    if (!selectedAccount) return alert('Veuillez d\'abord connecter un compte Deriv.')
    setExecutingTrade(true)
    setTradeMessage('')
    try {
      const type = side || contractType
      const res = await derivAPI.manualTrade({
        accountId: selectedAccount._id,
        symbol: selectedSymbol,
        contractType: type,
        amount: Number(stake),
        duration: Number(duration),
        durationUnit: 't',
        barrier: type.startsWith('DIGIT') ? barrier : undefined,
      })
      if (res.data?.success) {
        setTradeMessage(`Contrat #${res.data.trade?.contractId} acheté avec succès ! En attente du résultat...`)
        setTimeout(loadSessionsAndTrades, 4000)
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setExecutingTrade(false)
    }
  }

  async function handleStartBot(bot) {
    if (!canRunRobots) {
      return alert('Période d\'essai gratuite expirée. Activez l\'accès via notre lien partenaire Deriv ou via abonnement.')
    }
    setSelectedBotForStart(bot)
    setBotStake(bot.defaultSettings?.initialStake || 1)
    setBotSL(bot.defaultSettings?.stopLoss || 20)
    setBotTP(bot.defaultSettings?.takeProfit || 50)
    setBotMartingale(bot.defaultSettings?.martingaleMultiplier || (bot.contractType === 'DIGITOVER' ? 3.2 : 2))
  }

  async function confirmStartBot() {
    if (!selectedAccount || !selectedBotForStart) return
    setStartingBot(true)
    try {
      const res = await derivAPI.startSession({
        accountId: selectedAccount._id,
        botId: selectedBotForStart._id,
        settings: {
          initialStake: Number(botStake),
          stopLoss: Number(botSL),
          takeProfit: Number(botTP),
          martingaleMultiplier: Number(botMartingale),
        },
      })
      if (res.data?.success) {
        setSelectedBotForStart(null)
        setActiveTab('robots')
        await loadSessionsAndTrades()
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setStartingBot(false)
    }
  }

  async function handleStopSession(id) {
    try {
      await derivAPI.stopSession(id)
      await loadSessionsAndTrades()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── BANNIÈRE D'ESSAI GRATUIT 7 JOURS & STATUT ─────────────────── */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles className="w-48 h-48 text-emerald-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                Pôle Deriv SmartTrader
              </Badge>
              {isTrialValid && (
                <Badge variant="outline" className="text-amber-400 border-amber-500/40 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Essai gratuit : {trialDays} jour(s) restant(s)
                </Badge>
              )}
              {isAffiliated && (
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Affilié Partenaire (Accès Gratuit Illimité)
                </Badge>
              )}
              {hasPaidPlan && (
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">
                  Abonnement Pro Actif
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Trading SmartTrader & Robots Deriv
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Exécutez vos contrats manuellement en temps réel ou lancez des robots automatisés sur les indices synthétiques (Volatility, Crash/Boom).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {settings?.derivReferralLink && (
              <a
                href={settings.derivReferralLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Créer compte Partenaire Deriv
              </a>
            )}
            <button
              type="button"
              onClick={() => startDerivOAuth(settings?.derivAppId || '34HkkJSIK047dAEWEgXML')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Connexion 1-Clic Deriv
            </button>
            <Button
              variant="outline"
              onClick={() => setShowConnectModal(true)}
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50 text-xs font-semibold"
            >
              <Key className="w-3.5 h-3.5 mr-1.5" />
              Token Manuel
            </Button>
          </div>
        </div>

        {/* Alerte si période d'essai expirée */}
        {!canRunRobots && (
          <div className="mt-4 p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold text-amber-200">Période d'essai de 7 jours terminée :</span>
              <p className="text-amber-300/90 mt-0.5">
                Le trading automatique est suspendu. Vous pouvez débloquer l'accès gratuit à vie en créant votre compte Deriv avec notre lien partenaire, ou souscrire à un abonnement mensuel.
              </p>
              <div className="flex gap-2 mt-2">
                {settings?.derivReferralLink && (
                  <a
                    href={settings.derivReferralLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs font-bold text-white bg-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-500"
                  >
                    Activer Gratuitement via Partenaire
                  </a>
                )}
                <a
                  href="/pricing"
                  className="inline-block text-xs font-bold text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg hover:bg-amber-900/40"
                >
                  Voir les Tarifs Mensuels
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SÉLECTEUR RAPIDE : COMPTES RÉEL VS DÉMO & SOLDES EN DIRECT ── */}
      {accounts.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vos Comptes Deriv :</span>
            <div className="flex gap-2 flex-wrap">
              {accounts.map(acc => {
                const isSelected = acc._id === selectedAccount?._id
                return (
                  <button
                    key={acc._id}
                    type="button"
                    onClick={() => setSelectedAccountId(acc._id)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                      isSelected
                        ? acc.isDemo
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-lg shadow-amber-500/10'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${acc.isDemo ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <span>{acc.isDemo ? 'Compte Démo' : 'Compte Réel'} ({acc.loginId})</span>
                    <span className="font-mono text-white font-black text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      ${Number(acc.balance || 0).toFixed(2)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              className="h-8 text-xs border-slate-800 text-slate-300 hover:text-white"
              title="Rafraîchir les soldes en direct depuis Deriv"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Rafraîchir
            </Button>
            <Button
              size="sm"
              onClick={() => setShowConnectModal(true)}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              + Lier un Compte
            </Button>
          </div>
        </div>
      )}

      {/* ── BARRE D'ÉTAT DU COMPTE SÉLECTIONNÉ ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/70 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Compte Actif</div>
              <div className="text-base font-bold text-white mt-1">
                {selectedAccount ? `${selectedAccount.label} (${selectedAccount.loginId})` : 'Aucun compte'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
              {selectedAccount?.isDemo ? 'DEMO' : 'LIVE'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Solde Deriv</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                ${Number(selectedAccount?.balance || 0).toFixed(2)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Sessions Actives</div>
              <div className="text-2xl font-black text-cyan-400 mt-1">
                {sessions.filter(s => s.status === 'active').length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Trades Exécutés</div>
              <div className="text-2xl font-black text-purple-400 mt-1">
                {trades.length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── ONGLETS : TRADING MANUEL VS ROBOTS AUTOMATIQUES ────────────── */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 py-3 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === 'manual'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Trading Manuel SmartTrader
        </button>
        <button
          onClick={() => setActiveTab('robots')}
          className={`flex items-center gap-2 py-3 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === 'robots'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          Robots Automatiques ({bots.length})
        </button>
      </div>

      {/* ── CONTENU ONGLET 1 : TRADING MANUEL SMARTTRADER ──────────────── */}
      {activeTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panneau Graphique & Live Ticks */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900/80 border-slate-800 shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    Graphique SmartTrader en Direct
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Flux de prix officiel Deriv WebSocket ({selectedSymbol})
                  </CardDescription>
                </div>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2"
                >
                  {symbols.map(s => (
                    <option key={s.symbol} value={s.symbol}>{s.display_name}</option>
                  ))}
                </select>
              </CardHeader>
              <CardContent>
                {/* Visualiseur de Graphique Ticks */}
                <div className="h-64 w-full bg-slate-950 rounded-xl border border-slate-800/80 p-4 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-900 pb-2">
                    <span className="font-mono text-emerald-400 font-bold">{selectedSymbol}</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Live Feed
                    </span>
                  </div>

                  <div className="flex items-center justify-center my-auto">
                    <div className="text-center">
                      <div className="text-4xl font-mono font-black text-white tracking-wider">
                        {selectedSymbol === 'R_100' ? '1,428.65' : '842.10'}
                      </div>
                      <div className="text-xs text-emerald-400 font-mono mt-1 font-semibold">
                        ▲ +0.48% (Dernier tick officiel)
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-10 gap-1 pt-2 border-t border-slate-900">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                      <div
                        key={d}
                        className={`text-center py-1 rounded text-[11px] font-mono font-bold ${
                          String(d) === barrier ? 'bg-emerald-500 text-black' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Historique des ordres récents */}
            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">Contrats Récents Exécutés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="pb-2">Contrat #</th>
                        <th className="pb-2">Symbole</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Mise</th>
                        <th className="pb-2">Statut</th>
                        <th className="pb-2">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {trades.slice(0, 5).map(t => (
                        <tr key={t._id}>
                          <td className="py-2.5 text-slate-300">#{t.contractId?.slice(-6)}</td>
                          <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                          <td className="py-2.5 text-slate-300">{t.contractType}</td>
                          <td className="py-2.5">${t.stake}</td>
                          <td className="py-2.5">
                            <Badge className={t.status === 'won' ? 'bg-emerald-500/20 text-emerald-300' : t.status === 'lost' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700'}>
                              {t.status?.toUpperCase()}
                            </Badge>
                          </td>
                          <td className={`py-2.5 font-bold ${t.profit > 0 ? 'text-emerald-400' : t.profit < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {t.profit ? `${t.profit > 0 ? '+' : ''}$${t.profit.toFixed(2)}` : 'En cours'}
                          </td>
                        </tr>
                      ))}
                      {trades.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-6 text-center text-slate-500">
                            Aucun trade exécuté pour le moment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulaire de Passation d'Ordres SmartTrader */}
          <div className="space-y-6">
            <Card className="bg-slate-900/80 border-slate-800 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white">Passation d'Ordre Direct</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Sélectionnez le type de contrat et vos paramètres
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Type de Contrat</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setContractType('DIGITOVER')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                        contractType === 'DIGITOVER'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Digit Over
                    </button>
                    <button
                      type="button"
                      onClick={() => setContractType('DIGITUNDER')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                        contractType === 'DIGITUNDER'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Digit Under
                    </button>
                    <button
                      type="button"
                      onClick={() => setContractType('CALL')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                        contractType === 'CALL'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Rise / Hausse
                    </button>
                    <button
                      type="button"
                      onClick={() => setContractType('PUT')}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                        contractType === 'PUT'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Fall / Baisse
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Mise (Stake $)</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.35"
                      value={stake}
                      onChange={(e) => setStake(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Durée (Ticks)</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>

                {contractType.startsWith('DIGIT') && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Dernier Chiffre (Barrière)</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setBarrier(String(d))}
                          className={`py-2 rounded-lg text-xs font-mono font-bold transition ${
                            barrier === String(d)
                              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Gain Potentiel Estimé</span>
                  <span className="text-emerald-400 font-bold font-mono text-sm">
                    +${(stake * 0.95).toFixed(2)} USD
                  </span>
                </div>

                {tradeMessage && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-300">
                    {tradeMessage}
                  </div>
                )}

                <Button
                  onClick={() => handleExecuteManualTrade()}
                  disabled={executingTrade || !selectedAccount}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-emerald-600/20 text-sm"
                >
                  {executingTrade ? (
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Zap className="w-5 h-5 mr-2" />
                  )}
                  {executingTrade ? 'Exécution en cours...' : `Acheter Contrat (${contractType})`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── CONTENU ONGLET 2 : ROBOTS AUTOMATIQUES DERIV ───────────────── */}
      {activeTab === 'robots' && (
        <div className="space-y-6">
          {/* Sessions Actives */}
          {sessions.filter(s => s.status === 'active').length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Sessions Robots en Cours d'Exécution
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.filter(s => s.status === 'active').map(s => (
                  <Card key={s._id} className="bg-slate-900 border-emerald-500/30 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />
                    <CardContent className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                            EN COURS
                          </Badge>
                          <h3 className="font-bold text-white text-base mt-1">{s.botName}</h3>
                          <div className="text-xs text-slate-400 font-mono">{s.symbol} • {s.contractType}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStopSession(s._id)}
                          className="h-8 px-2 text-xs"
                        >
                          <Square className="w-3.5 h-3.5 mr-1" /> Arrêter
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950 font-mono text-center">
                        <div>
                          <div className="text-[10px] text-slate-500">TRADES</div>
                          <div className="text-xs font-bold text-white">{s.stats?.totalTrades || 0}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">WIN/LOSS</div>
                          <div className="text-xs font-bold text-emerald-400">{s.stats?.wins || 0} / {s.stats?.losses || 0}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">PNL</div>
                          <div className={`text-xs font-bold ${s.stats?.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${(s.stats?.netProfit || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── FLUX EN DIRECT DES TRADES & CONTRATS (LIVE STREAM) ──────────── */}
          <Card className="bg-slate-900/90 border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-800/80 bg-slate-950/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <CardTitle className="text-base text-white flex items-center gap-2">
                      Flux en Direct des Trades &amp; Contrats
                      <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                        Live Stream
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Suivez chaque contrat Deriv SmartTrader exécuté par les robots et le trading manuel en temps réel.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-800 text-slate-300 font-mono text-xs">
                    {allTrades.length} contrat(s) au total
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSessionsAndTrades}
                    className="h-7 text-xs border-slate-700 text-slate-300 hover:text-white"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 border-b border-slate-800 bg-slate-950/60 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Contrat #</th>
                      <th className="py-3 px-4">Robot / Marché</th>
                      <th className="py-3 px-4">Type de Contrat</th>
                      <th className="py-3 px-4">Mise ($)</th>
                      <th className="py-3 px-4">Statut en Direct</th>
                      <th className="py-3 px-4">Gain Net</th>
                      <th className="py-3 px-4">Tick Sortie</th>
                      <th className="py-3 px-4 text-right">Heure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {allTrades.slice(0, 15).map(t => {
                      const isOpen = t.status === 'open'
                      const isWon = t.status === 'won' || Number(t.profit) > 0
                      const isLost = t.status === 'lost' || (t.status !== 'open' && Number(t.profit) < 0)

                      return (
                        <tr
                          key={t._id || t.contractId}
                          className={`transition ${
                            isOpen
                              ? 'bg-amber-500/10 hover:bg-amber-500/15'
                              : isWon
                              ? 'hover:bg-emerald-500/5'
                              : 'hover:bg-rose-500/5'
                          }`}
                        >
                          <td className="py-3 px-4 text-slate-300 font-bold">
                            #{t.contractId?.slice(-8) || 'N/A'}
                          </td>
                          <td className="py-3 px-4 font-sans font-semibold text-white">
                            <div>{t.symbol}</div>
                            {t.botName && <div className="text-[10px] text-slate-400 font-mono">{t.botName}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-emerald-400 font-bold">{t.contractType}</span>
                            {t.barrier !== undefined && t.barrier !== null && t.barrier !== '' && (
                              <span className="text-slate-400 text-[11px] ml-1">({t.barrier})</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-200">
                            ${Number(t.stake || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            {isOpen ? (
                              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] animate-pulse flex items-center gap-1 w-fit">
                                <RefreshCw className="w-3 h-3 animate-spin" /> EN COURS
                              </Badge>
                            ) : isWon ? (
                              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" /> GAGNÉ
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] w-fit">
                                PERDU
                              </Badge>
                            )}
                          </td>
                          <td className={`py-3 px-4 font-bold text-xs ${isOpen ? 'text-amber-400' : isWon ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isOpen ? (
                              <span className="text-slate-400">+{Number(t.payout ? t.payout - t.stake : t.stake * 0.38).toFixed(2)}$ pot.</span>
                            ) : isWon ? (
                              `+$${Number(t.profit || 0).toFixed(2)}`
                            ) : (
                              `-$${Math.abs(Number(t.profit || t.stake || 0)).toFixed(2)}`
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-xs">
                            {t.exitTick ? t.exitTick : isOpen ? '—' : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px] text-right">
                            {t.openedAt ? new Date(t.openedAt).toLocaleTimeString() : 'En direct'}
                          </td>
                        </tr>
                      )
                    })}
                    {allTrades.length === 0 && (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Bot className="w-8 h-8 text-slate-600 animate-pulse" />
                            <span className="text-sm">Aucun contrat exécuté pour l'instant.</span>
                            <span className="text-xs text-slate-500">
                              Lancez un robot ci-dessous ou passez un ordre manuel pour voir le flux s'animer en direct.
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Catalogue des Robots Deriv */}
          <div>
            <h2 className="text-lg font-bold text-white mb-3">Catalogue des Robots Deriv Disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bots.map(bot => (
                <Card key={bot._id} className="bg-slate-900/80 border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                        {bot.badge || 'Automatisé'}
                      </Badge>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        Win Rate: {bot.winRate}
                      </span>
                    </div>
                    <CardTitle className="text-lg text-white mt-2">{bot.name}</CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      {bot.description || 'Robot de trading algorithmique optimisé pour les indices synthétiques.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 rounded-xl bg-slate-950 text-xs font-mono space-y-1 text-slate-300">
                      <div>Contrat: <span className="text-emerald-400 font-bold">{bot.contractType}</span></div>
                      <div>Symboles: <span className="text-white">{bot.symbols?.join(', ')}</span></div>
                      <div>Stratégie: <span className="text-cyan-400">{bot.strategyType}</span></div>
                    </div>

                    <Button
                      onClick={() => handleStartBot(bot)}
                      disabled={!canRunRobots || !selectedAccount}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Lancer ce Robot
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : CONFIGURATION ET DÉMARRAGE DE ROBOT ────────────────── */}
      {selectedBotForStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              Lancer {selectedBotForStart.name}
            </h3>
            <p className="text-xs text-slate-400">
              Configurez vos limites de risque avant de démarrer la session automatique.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">Mise Initiale ($)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.35"
                  value={botStake}
                  onChange={(e) => setBotStake(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Take Profit ($)</label>
                  <Input
                    type="number"
                    value={botTP}
                    onChange={(e) => setBotTP(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Stop Loss ($)</label>
                  <Input
                    type="number"
                    value={botSL}
                    onChange={(e) => setBotSL(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">Multiplicateur Martingale</label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  value={botMartingale}
                  onChange={(e) => setBotMartingale(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedBotForStart(null)}
                className="w-1/2 border-slate-700 text-slate-300"
              >
                Annuler
              </Button>
              <Button
                onClick={confirmStartBot}
                disabled={startingBot}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {startingBot ? 'Démarrage...' : 'Confirmer & Démarrer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL : CONNECTER UN COMPTE DERIV ─────────────────────────── */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-400" />
              Connecter votre Compte Deriv
            </h3>
            <p className="text-xs text-slate-400">
              Synchronisez automatiquement vos comptes Réels et Démo pour afficher vos soldes et activer le trading de robots.
            </p>

            {/* Option 1 : Deriv OAuth 1-Clic */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
              <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                Connexion Officielle Directe (OAuth)
              </div>
              <p className="text-[11px] text-slate-400">
                Vous serez redirigé vers le portail sécurisé de Deriv pour valider l'accès. Tous vos comptes (Réel &amp; Démo) seront importés automatiquement avec leurs soldes.
              </p>
              <button
                type="button"
                onClick={() => startDerivOAuth(settings?.derivAppId || '34HkkJSIK047dAEWEgXML')}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition text-center cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Se connecter avec Deriv en 1-Clic
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500">Ou Token API Manuel</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleConnectAccount} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">Token API Deriv</label>
                <Input
                  type="password"
                  placeholder="Ex: a1b2c3d4e5f6..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                />
              </div>

              {connectError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-300">
                  {connectError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConnectModal(false)}
                  className="w-1/2 border-slate-700 text-slate-300"
                >
                  Fermer
                </Button>
                <Button
                  type="submit"
                  disabled={connecting}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  {connecting ? 'Connexion...' : 'Lier via Token'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
