import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { derivAPI, settingsAPI, subscriptionAPI } from '../../lib/api'
import { startDerivOAuth } from '../../lib/derivOAuth'
import useStore from '../../store/useStore'
import ManualTradingWorkstation from '../../components/deriv/ManualTradingWorkstation'
import BotBuilder from '../../components/deriv/BotBuilder'
import {
  TrendingUp, TrendingDown, Bot, Play, Square, Pause, ShieldCheck,
  AlertTriangle, RefreshCw, Key, ExternalLink, Activity, Sparkles, CheckCircle2,
  Clock, Zap, DollarSign, BarChart2, Layers
} from 'lucide-react'

export default function DashboardDeriv() {
  const { user, derivLiveTrades, derivStreamClearedAt, derivSessionStatuses } = useStore()
  const [activeTab, setActiveTab] = useState('manual') // 'manual' | 'robots'
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [bots, setBots] = useState([])
  const [sessions, setSessions] = useState([])
  const [trades, setTrades] = useState([])
  const [plans, setPlans] = useState([])
  const [nowTs, setNowTs] = useState(Date.now())
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
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [selectedUnlockPlan, setSelectedUnlockPlan] = useState(null)
  const [unlockBillingCycle, setUnlockBillingCycle] = useState('monthly')
  const [unlockCountry, setUnlockCountry] = useState('CM')
  const [unlockPhone, setUnlockPhone] = useState('')
  const [unlockOperator, setUnlockOperator] = useState('MTN')
  const [unlockPaying, setUnlockPaying] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [unlockMsg, setUnlockMsg] = useState('')
  const [payOptions, setPayOptions] = useState(null)
  const [ikeepayUrl, setIkeepayUrl] = useState('')
  const [ikeepayModalOpen, setIkeepayModalOpen] = useState(false)
  const ikeepaySessionRef = useRef({ orderId: '', subId: '' })
  const [botStake, setBotStake] = useState(1)
  const [botSL, setBotSL] = useState(20)
  const [botTP, setBotTP] = useState(50)
  const [useBotMartingale, setUseBotMartingale] = useState(false)
  const [botMartingale, setBotMartingale] = useState(2)
  const [startingBot, setStartingBot] = useState(false)

  const selectedAccount = accounts.find(a => a._id === selectedAccountId) || accounts[0]
  const isOwner = user?.email?.toLowerCase().trim() === 'valdeslando15@gmail.com'
  const isAdmin = isOwner || user?.role === 'admin' || user?.role === 'super_admin'
  const isBotBuilderVisible = settings?.derivBotBuilderEnabled !== false
  const liveTradesRef = useRef(null)
  const hasActivePaidPlanCatalog =
    settings?.subscriptionsEnabled !== false &&
    !settings?.allRobotsFree &&
    plans.some(p => p.isActive !== false && !p.isFree && p.allowPaidSubscription !== false && Number(p.priceMonthly) > 0)
  const freeTrialActiveGlobal = settings ? (settings.freeTrialEnabled !== false && Number(settings.derivTrialDays ?? settings.freeTrialDays ?? 7) > 0) : true
  const rawTrialValid = selectedAccount?.trialExpiresAt
    ? new Date(selectedAccount.trialExpiresAt).getTime() > nowTs
    : selectedAccount?.isTrialValid !== false
  const isTrialValid = isOwner || (freeTrialActiveGlobal && rawTrialValid)
  const trialDays = isOwner ? 9999 : (freeTrialActiveGlobal ? (selectedAccount?.trialDaysRemaining ?? 7) : 0)
  const isAffiliated = selectedAccount?.affiliateVerified === true
  const isSubExpired = user?.subscription?.endDate ? new Date(user.subscription.endDate) <= new Date() : false
  const hasPaidPlan = isAdmin || (!isSubExpired && (user?.subscription?.plan?.startsWith('deriv') || user?.subscription?.plan === 'vip' || user?.subscription?.plan === 'institutional' || (user?.subscription?.isActive && user?.subscription?.plan !== 'free')))
  const canRunRobots = !hasActivePaidPlanCatalog || isAdmin || isTrialValid || isAffiliated || hasPaidPlan

  const trialCountdownText = React.useMemo(() => {
    if (!selectedAccount?.trialExpiresAt) return `${trialDays}j`
    const diff = Math.max(0, new Date(selectedAccount.trialExpiresAt).getTime() - nowTs)
    if (diff <= 0) return '0s (Expiré)'
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    if (d > 0) return `${d}j ${h}h ${m}m ${s}s`
    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
  }, [selectedAccount?.trialExpiresAt, nowTs, trialDays])

  useEffect(() => {
    if (!hasActivePaidPlanCatalog || !selectedAccount?.trialExpiresAt) return
    const timer = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [hasActivePaidPlanCatalog, selectedAccount?.trialExpiresAt])

  const allTrades = React.useMemo(() => {
    const map = new Map()
    const cutoff = derivStreamClearedAt ? new Date(derivStreamClearedAt).getTime() : 0

    for (const t of (derivLiveTrades || [])) {
      if (!t.contractId) continue
      const tTime = new Date(t.openedAt || t._receivedAt || t.createdAt || Date.now()).getTime()
      if (cutoff && tTime < cutoff) continue
      map.set(String(t.contractId), t)
    }

    for (const t of (trades || [])) {
      if (!t.contractId || map.has(String(t.contractId))) continue
      const tTime = new Date(t.openedAt || t._receivedAt || t.createdAt || Date.now()).getTime()
      if (cutoff && tTime < cutoff) continue
      map.set(String(t.contractId), t)
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.openedAt || b._receivedAt) - new Date(a.openedAt || a._receivedAt))
  }, [trades, derivLiveTrades, derivStreamClearedAt])

  useEffect(() => {
    loadData()
    loadSettings()
  }, [])

  useEffect(() => {
    if (!isBotBuilderVisible && activeTab === 'builder') {
      setActiveTab('manual')
    }
  }, [isBotBuilderVisible, activeTab])

  const pollCounterRef = useRef(0)

  useEffect(() => {
    const hasActive = sessions.some(s => s.status === 'active')
    const intervalMs = hasActive ? 2500 : 8000
    const timer = setInterval(loadSessionsAndTrades, intervalMs)
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
      const [accRes, botsRes, sessRes, tradesRes, plansRes] = await Promise.all([
        derivAPI.getAccounts(forceRefresh ? { refresh: 1 } : undefined),
        derivAPI.getBots(),
        derivAPI.getSessions(),
        derivAPI.getTrades(),
        subscriptionAPI.getPlans().catch(() => ({ data: { plans: [] } })),
      ])
      setPlans(plansRes?.data?.plans || [])
      const fetchedAccounts = accRes.data?.accounts || []
      setAccounts(fetchedAccounts)
      if (fetchedAccounts.length && !selectedAccountId) {
        setSelectedAccountId(fetchedAccounts[0]._id)
      }
      setBots(botsRes.data?.bots || [])
      setSessions(sessRes.data?.sessions || [])
      const rawTrades = tradesRes.data?.trades || []
      const cutoff = useStore.getState().derivStreamClearedAt ? new Date(useStore.getState().derivStreamClearedAt).getTime() : 0
      const filtered = cutoff ? rawTrades.filter(t => new Date(t.openedAt || t.createdAt).getTime() >= cutoff) : rawTrades
      setTrades(filtered)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadSessionsAndTrades() {
    try {
      pollCounterRef.current += 1
      const shouldRefreshAccounts = pollCounterRef.current % 4 === 0

      const promises = [
        derivAPI.getSessions(),
        derivAPI.getTrades(),
      ]
      if (shouldRefreshAccounts) {
        promises.push(derivAPI.getAccounts())
      }

      const results = await Promise.all(promises)
      const sessRes = results[0]
      const tradesRes = results[1]
      const accRes = shouldRefreshAccounts ? results[2] : null

      if (accRes?.data?.accounts) setAccounts(accRes.data.accounts)
      if (sessRes?.data?.sessions) setSessions(sessRes.data.sessions)
      const rawTrades = tradesRes?.data?.trades || []
      const cutoff = useStore.getState().derivStreamClearedAt ? new Date(useStore.getState().derivStreamClearedAt).getTime() : 0
      const filtered = cutoff ? rawTrades.filter(t => new Date(t.openedAt || t.createdAt).getTime() >= cutoff) : rawTrades
      setTrades(filtered)
    } catch (err) {
      if (err.response?.status === 429) {
        console.warn('[DashboardDeriv] Rate limited, temporisation du rafraîchissement...')
      }
    }
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

  async function handleExecuteManualTrade(tradeParams = {}) {
    if (!selectedAccount) throw new Error('Veuillez d\'abord connecter un compte Deriv.')
    setExecutingTrade(true)
    setTradeMessage('')
    try {
      const type = tradeParams.contractType || contractType
      const res = await derivAPI.manualTrade({
        accountId: selectedAccount._id,
        symbol: tradeParams.symbol || selectedSymbol,
        contractType: type,
        amount: Number(tradeParams.amount !== undefined ? tradeParams.amount : stake),
        duration: Number(tradeParams.duration !== undefined ? tradeParams.duration : duration),
        durationUnit: tradeParams.durationUnit || 't',
        barrier: tradeParams.barrier !== undefined ? tradeParams.barrier : (type.startsWith('DIGIT') ? barrier : undefined),
      })
      if (res.data?.success) {
        setTradeMessage(`Contrat #${res.data.trade?.contractId} acheté avec succès ! En attente du résultat...`)
        setTimeout(loadSessionsAndTrades, 2500)
        return res.data
      }
      throw new Error(res.data?.error || 'Achat de contrat échoué')
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      alert(msg)
      throw new Error(msg)
    } finally {
      setExecutingTrade(false)
    }
  }

  useEffect(() => {
    if (!showUnlockModal) return
    subscriptionAPI.getPaymentOptions().then(({ data }) => setPayOptions(data)).catch(() => {})
  }, [showUnlockModal])

  useEffect(() => {
    const onMsg = async (e) => {
      if (e.data === 'ikeepay-success') {
        const { orderId, subId } = ikeepaySessionRef.current
        if (subId || orderId) {
          try {
            const { data } = await subscriptionAPI.verifyIkeepay({ subscriptionId: subId, orderId })
            if (data?.confirmed) {
              setIkeepayModalOpen(false)
              setIkeepayUrl('')
              setShowUnlockModal(false)
              setSelectedUnlockPlan(null)
              await useStore.getState().loadUser?.().catch(() => {})
              await loadData()
              return
            }
          } catch (_) {}
        }
        setIkeepayModalOpen(false)
      } else if (e.data === 'ikeepay-close') {
        setIkeepayModalOpen(false)
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  async function handleUnlockMobilePay(e) {
    e.preventDefault()
    if (!selectedUnlockPlan) return
    setUnlockError('')
    setUnlockMsg('')
    setUnlockPaying(true)
    try {
      const useIkeepay = payOptions?.ikeepay?.enabled !== false
      const payload = {
        planSlug: selectedUnlockPlan.slug,
        billingCycle: unlockBillingCycle,
        paymentMethod: useIkeepay ? 'ikeepay' : 'mobile_money',
        country: unlockCountry,
        mobileMoneyCountry: unlockCountry,
        phoneNumber: unlockPhone.trim(),
        mobileMoneyNumber: unlockPhone.trim(),
        operator: unlockOperator,
        mobileMoneyProvider: unlockOperator,
      }
      const { data } = await subscriptionAPI.subscribe(payload)
      if (data?.subscription?.paymentStatus === 'confirmed') {
        setUnlockMsg('Paiement confirmé ! Robots débloqués immédiatement.')
        await useStore.getState().loadUser?.().catch(() => {})
        await loadData()
        setTimeout(() => {
          setShowUnlockModal(false)
          setSelectedUnlockPlan(null)
        }, 1200)
        return
      }
      if (data?.checkoutUrl) {
        ikeepaySessionRef.current = {
          orderId: data.orderId || data.subscription?.ikeepayOrderId || '',
          subId: data.subscription?._id || '',
        }
        setIkeepayUrl(data.checkoutUrl)
        setIkeepayModalOpen(true)
      } else {
        setUnlockMsg(data?.message || 'Demande Mobile Money envoyée. Validez sur votre téléphone puis cliquez sur Vérifier.')
      }
    } catch (err) {
      setUnlockError(err.response?.data?.error || err.message || 'Erreur lors du paiement Mobile Money.')
    } finally {
      setUnlockPaying(false)
    }
  }

  async function handleStartBot(bot) {
    if (!selectedAccount) {
      setShowConnectModal(true)
      return alert('Veuillez d\'abord connecter un compte Deriv (Connexion 1-Clic ou Token) pour lancer ce robot.')
    }
    if (!canRunRobots) {
      setShowUnlockModal(true)
      return
    }
    setSelectedBotForStart(bot)
    setBotStake(bot.defaultSettings?.initialStake || 1)
    setBotSL(bot.defaultSettings?.stopLoss || 20)
    setBotTP(bot.defaultSettings?.takeProfit || 50)
    setUseBotMartingale(Boolean(bot.defaultSettings?.martingaleEnabled))
    setBotMartingale(bot.defaultSettings?.martingaleMultiplier || 2)
  }

  async function confirmStartBot() {
    if (!selectedAccount || !selectedBotForStart) return
    setStartingBot(true)
    try {
      // Vider automatiquement le flux en direct du robot précédent avant le démarrage d'une nouvelle session
      useStore.getState().clearDerivLiveTrades?.()
      setTrades([])
      derivAPI.clearTrades?.().catch(() => {})

      const res = await derivAPI.startSession({
        accountId: selectedAccount._id,
        botId: selectedBotForStart._id,
        settings: {
          initialStake: Number(botStake),
          stopLoss: Number(botSL),
          takeProfit: Number(botTP),
          martingaleEnabled: useBotMartingale,
          martingaleMultiplier: useBotMartingale ? Number(botMartingale) : 1,
          virtualHook: selectedBotForStart.defaultSettings?.virtualHook,
          martiStart: selectedBotForStart.defaultSettings?.martiStart,
          martiFactor: selectedBotForStart.defaultSettings?.martiFactor,
          maxMartingaleSteps: selectedBotForStart.defaultSettings?.maxMartingaleSteps,
        },
      })
      if (res.data?.success) {
        setSelectedBotForStart(null)
        setActiveTab('robots')
        await loadSessionsAndTrades()
        setTimeout(() => {
          liveTradesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 150)
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
      <div className="rounded-2xl p-5 sm:p-6 bg-[#061813] border border-emerald-500/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                Pôle Deriv SmartTrader
              </Badge>
              {!hasActivePaidPlanCatalog ? (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Accès 100% Gratuit
                </Badge>
              ) : (
                <>
                  {isTrialValid && !isAffiliated && !hasPaidPlan && !isAdmin && (
                    <Badge variant="outline" className="text-amber-400 border-amber-500/40 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> Free Trial : {trialCountdownText}
                    </Badge>
                  )}
                  {!isTrialValid && !isAffiliated && !hasPaidPlan && !isAdmin && (
                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Free Trial expiré
                    </Badge>
                  )}
                </>
              )}
              {isAffiliated && (
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Affilié Partenaire (Accès Gratuit à Vie)
                </Badge>
              )}
              {hasPaidPlan && (
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">
                  Abonnement Actif
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
              className="bg-slate-800 hover:bg-slate-700 border-emerald-500/40 text-emerald-300 text-xs font-semibold"
            >
              <Key className="w-3.5 h-3.5 mr-1.5" />
              Token Manuel
            </Button>
          </div>
        </div>

        {/* Alerte si période d'essai expirée ou désactivée */}
        {!canRunRobots && (
          <div className="mt-4 p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <span className="font-bold text-amber-200">
                {freeTrialActiveGlobal ? "Période d'essai gratuit expirée :" : "Abonnement ou Compte Partenaire requis :"}
              </span>
              <p className="text-amber-300/90">
                Pour continuer à utiliser les robots Deriv SmartTrader, choisissez l'une des deux options ci-dessous :
              </p>
              <ul className="text-xs text-amber-200/80 list-disc pl-4 space-y-0.5">
                <li><strong>Option 1 :</strong> Payez un abonnement mensuel pour débloquer l'accès sur n'importe quel compte Deriv.</li>
                <li><strong>Option 2 (100% Gratuit à vie) :</strong> Créez un nouveau compte Deriv via notre lien de parrainage et connectez-vous <strong>toujours avec ce compte partenaire</strong>.</li>
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(true)}
                  className="inline-block text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-500 cursor-pointer"
                >
                  Débloquer (Voir les plans activés / Parrainage)
                </button>
                {settings?.derivReferralLink && (
                  <a
                    href={settings.derivReferralLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs font-bold text-white bg-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-500"
                  >
                    Créer un compte via le Lien de Parrainage
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowConnectModal(true)}
                  className="inline-block text-xs font-bold text-amber-200 border border-amber-500/40 px-3 py-1.5 rounded-lg hover:bg-amber-900/40"
                >
                  Connecter mon Compte Partenaire
                </button>
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

      {/* ── ONGLETS : TRADING MANUEL VS ROBOTS AUTOMATIQUES VS BOT BUILDER ── */}
      <div className="flex flex-wrap border-b border-slate-800 gap-1.5 pb-1">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-1.5 py-2.5 px-3 sm:px-5 font-bold text-xs sm:text-sm border-b-2 transition rounded-t-lg ${
            activeTab === 'manual'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <BarChart2 className="w-4 h-4 shrink-0" />
          <span>Trading Manuel SmartTrader</span>
        </button>
        <button
          onClick={() => setActiveTab('robots')}
          className={`flex items-center gap-1.5 py-2.5 px-3 sm:px-5 font-bold text-xs sm:text-sm border-b-2 transition rounded-t-lg ${
            activeTab === 'robots'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4 shrink-0" />
          <span>Robots Automatiques ({bots.length})</span>
        </button>
        {isBotBuilderVisible && (
          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-1.5 py-2.5 px-3 sm:px-5 font-bold text-xs sm:text-sm border-b-2 transition rounded-t-lg ${
              activeTab === 'builder'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Bot Builder Studio</span>
          </button>
        )}
      </div>

      {/* ── CONTENU ONGLET 1 : TRADING MANUEL SMARTTRADER (4 MODES DYNAMIQUES) ──── */}
      {activeTab === 'manual' && (
        <ManualTradingWorkstation
          selectedAccount={selectedAccount}
          symbols={symbols}
          onExecuteTrade={handleExecuteManualTrade}
          trades={trades}
          derivLiveTrades={derivLiveTrades}
          onRefreshData={() => loadData(true)}
        />
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
                {sessions.filter(s => s.status === 'active').map(s => {
                  const statusMsg = derivSessionStatuses?.[s._id]
                  return (
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

                        {statusMsg && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 animate-pulse">
                            <Activity className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                            <span className="truncate">{statusMsg}</span>
                          </div>
                        )}

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
                  )
                })}
              </div>
            </div>
          )}

          {/* ── FLUX EN DIRECT DES TRADES & CONTRATS (LIVE STREAM) ──────────── */}
          <div ref={liveTradesRef}>
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

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-800 text-slate-300 font-mono text-xs whitespace-nowrap">
                    {allTrades.length} contrat(s) au total
                  </Badge>
                  <button
                    type="button"
                    onClick={loadSessionsAndTrades}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 whitespace-nowrap transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Actualiser
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Voulez-vous vider le flux des contrats en direct ?')) {
                        useStore.getState().clearDerivLiveTrades?.()
                        setTrades([])
                        try {
                          await derivAPI.clearTrades?.()
                        } catch (_) {}
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-xs font-semibold text-rose-300 whitespace-nowrap transition cursor-pointer"
                  >
                    Vider le flux
                  </button>
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
                            ) : t.status === 'failed' ? (
                              <Badge className="bg-slate-500/20 text-slate-300 border border-slate-500/40 text-[10px] w-fit" title={t.errorMessage || 'Position échouée et remboursée'}>
                                ÉCHOUÉ (Remboursé)
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] w-fit">
                                PERDU
                              </Badge>
                            )}
                          </td>
                          <td className={`py-3 px-4 font-bold text-xs ${isOpen ? 'text-amber-400' : isWon ? 'text-emerald-400' : t.status === 'failed' ? 'text-slate-300' : 'text-rose-400'}`}>
                            {isOpen ? (
                              <span className="text-slate-400">+{Number(t.payout ? t.payout - t.stake : t.stake * 0.38).toFixed(2)}$ pot.</span>
                            ) : isWon ? (
                              `+$${Number(t.profit || 0).toFixed(2)}`
                            ) : t.status === 'failed' ? (
                              '$0.00 (Remboursé)'
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
          </div>

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
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {!selectedAccount
                        ? 'Connecter Deriv pour lancer'
                        : (!canRunRobots ? 'Débloquer pour lancer' : 'Lancer ce Robot')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENU ONGLET 3 : BOT BUILDER STUDIO DERIV ─────────────────── */}
      {isBotBuilderVisible && activeTab === 'builder' && (
        <div className="space-y-4">
          <BotBuilder onBotPublished={loadData} />
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
              {/* CONTRÔLE STRICT DE LA MARTINGALE */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={useBotMartingale}
                    onChange={e => setUseBotMartingale(e.target.checked)}
                    className="rounded accent-emerald-500 w-4 h-4"
                  />
                  <span>Activer le multiplicateur Martingale après perte</span>
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {useBotMartingale
                    ? `Si activé : après une perte, le multiplicateur s'applique 1 seule fois (mise : ${(Number(botStake || 1) * Number(botMartingale || 1)).toFixed(2)}). Si ce trade gagne, la mise revient immédiatement au prix initial (${botStake || 1}).`
                    : 'Martingale désactivée : la mise reste strictement fixe au prix initial (aucune augmentation après perte).'}
                </p>

                {useBotMartingale && (
                  <div className="pt-1">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-slate-300 font-semibold block">Multiplicateur Martingale (ex: 2, 3, 5)</label>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {`Mise après perte : ${(Number(botStake || 1) * Number(botMartingale || 1)).toFixed(2)}`}
                      </span>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      min="1.1"
                      max="100"
                      value={botMartingale}
                      onChange={(e) => setBotMartingale(e.target.value)}
                      className="bg-slate-900 border-slate-700 text-white font-mono text-xs"
                      placeholder="ex: 5"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {`Appliqué 1 fois après chaque perte. Retour immédiat à ${botStake || 1} dès que le trade suivant est gagné.`}
                    </p>
                  </div>
                )}
                {selectedBotForStart.defaultSettings?.virtualHook?.enabled && (
                  <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-xs text-emerald-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-200">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Virtual Hook &amp; Simulation Active</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Ce robot exécute d'abord une simulation en arrière-plan et attend <strong>{selectedBotForStart.defaultSettings.virtualHook.trigger || 3} pertes virtuelles consécutives</strong> avant de placer des trades réels sur votre compte Deriv.
                    </p>
                  </div>
                )}
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

      {/* ── MODAL DÉBLOCAGE : PLANS ACTIVÉS + LIEN DE PARRAINAGE ──────── */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  Débloquer l&apos;accès aux Robots Deriv SmartTrader
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {freeTrialActiveGlobal
                    ? "Votre période d'essai gratuit est terminée. Choisissez un plan activé ou utilisez le lien de parrainage pour un accès à vie."
                    : "L'essai gratuit est désactivé. Choisissez un plan d'abonnement activé ou inscrivez-vous via le lien de parrainage pour débloquer les robots à vie."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Option 1 : Plans Deriv activés (créés par l'admin) + Paiement Mobile Money immédiat */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Option 1 — Payer un abonnement Deriv via Mobile Money
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {plans
                  .filter(p =>
                    p.isActive !== false &&
                    p.isPublic !== false &&
                    !p.isFree &&
                    Number(p.priceMonthly) > 0 &&
                    (p.category === 'deriv' || p.broker === 'deriv' || p.slug?.startsWith('deriv')) &&
                    (p.currency || 'XAF') !== 'USD' &&
                    (p.currency || 'XAF') !== '$'
                  )
                  .map(plan => {
                    const isSelected = selectedUnlockPlan?.slug === plan.slug
                    const cur = plan.currency || 'XAF'
                    return (
                      <div
                        key={plan._id || plan.slug}
                        className={`p-4 rounded-xl bg-slate-950 border flex flex-col justify-between gap-3 transition ${
                          isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/40' : 'border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-white text-sm">{plan.name}</span>
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                              {Number(plan.priceMonthly || 0).toLocaleString()} {cur}/mois
                            </Badge>
                          </div>
                          {plan.description && (
                            <p className="text-[11px] text-slate-400 mt-1">{plan.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUnlockPlan(plan)
                            setUnlockError('')
                            setUnlockMsg('')
                          }}
                          className={`w-full inline-flex items-center justify-center py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isSelected ? '✓ Plan sélectionné' : 'Sélectionner & Payer (Mobile Money)'}
                        </button>
                      </div>
                    )
                  })}
              </div>

              {selectedUnlockPlan && (
                <form onSubmit={handleUnlockMobilePay} className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-emerald-300">
                      Paiement Mobile Money — {selectedUnlockPlan.name} (
                      {Number(
                        unlockBillingCycle === 'yearly'
                          ? (selectedUnlockPlan.priceYearly || selectedUnlockPlan.priceMonthly * 10)
                          : selectedUnlockPlan.priceMonthly
                      ).toLocaleString()}{' '}
                      {selectedUnlockPlan.currency || 'XAF'})
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setUnlockBillingCycle('monthly')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${unlockBillingCycle === 'monthly' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                      >
                        Mensuel
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnlockBillingCycle('yearly')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${unlockBillingCycle === 'yearly' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                      >
                        Annuel
                      </button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">Pays</label>
                      <select
                        value={unlockCountry}
                        onChange={(e) => setUnlockCountry(e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-xs text-white"
                      >
                        <option value="CM">🇨🇲 Cameroun (CM)</option>
                        <option value="CI">🇨🇮 Côte d&apos;Ivoire (CI)</option>
                        <option value="SN">🇸🇳 Sénégal (SN)</option>
                        <option value="BJ">🇧🇯 Bénin (BJ)</option>
                        <option value="TG">🇹🇬 Togo (TG)</option>
                        <option value="BF">🇧🇫 Burkina Faso (BF)</option>
                        <option value="ML">🇲🇱 Mali (ML)</option>
                        <option value="GN">🇬🇳 Guinée (GN)</option>
                        <option value="GA">🇬🇦 Gabon (GA)</option>
                        <option value="CG">🇨🇬 Congo-Brazzaville (CG)</option>
                        <option value="CD">🇨🇩 RD Congo (CD)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">Opérateur Mobile Money</label>
                      <select
                        value={unlockOperator}
                        onChange={(e) => setUnlockOperator(e.target.value)}
                        className="w-full h-9 rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-xs text-white"
                      >
                        <option value="MTN">MTN Mobile Money</option>
                        <option value="ORANGE">Orange Money</option>
                        <option value="MOOV">Moov Money</option>
                        <option value="WAVE">Wave</option>
                        <option value="AIRTEL">Airtel Money</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-300 font-semibold block mb-1">Numéro de téléphone</label>
                      <Input
                        type="tel"
                        placeholder="Ex: 6XXXXXXXX"
                        value={unlockPhone}
                        onChange={(e) => setUnlockPhone(e.target.value)}
                        required
                        className="bg-slate-950 border-slate-700 text-white text-xs h-9"
                      />
                    </div>
                  </div>
                  {unlockError && <p className="text-xs text-rose-400 font-medium">{unlockError}</p>}
                  {unlockMsg && <p className="text-xs text-emerald-400 font-medium">{unlockMsg}</p>}
                  <Button
                    type="submit"
                    disabled={unlockPaying}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9"
                  >
                    {unlockPaying ? 'Initialisation du paiement...' : 'Payer immédiatement via Mobile Money'}
                  </Button>
                </form>
              )}
            </div>

            {/* Option 2 : Lien de parrainage Deriv */}
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Option 2 — Accès 100% Gratuit à Vie via Lien de Parrainage
              </h4>
              <p className="text-xs text-slate-300">
                Inscrivez-vous sur Deriv via notre lien de parrainage administrateur puis connectez votre nouveau compte Deriv ici pour débloquer tous les robots gratuitement à vie.
              </p>
              <div className="flex flex-wrap gap-2">
                {settings?.derivReferralLink && (
                  <a
                    href={settings.derivReferralLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center text-xs font-bold text-white bg-amber-600 px-3.5 py-2 rounded-lg hover:bg-amber-500"
                  >
                    S&apos;inscrire via le Lien de Parrainage
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowUnlockModal(false)
                    setShowConnectModal(true)
                  }}
                  className="inline-flex items-center justify-center text-xs font-bold text-amber-200 border border-amber-500/40 px-3.5 py-2 rounded-lg hover:bg-amber-900/40 cursor-pointer"
                >
                  Se connecter avec mon Compte Partenaire
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── IFRAME TUNNEL MOBILE MONEY IKEEPAY ──────── */}
      {ikeepayModalOpen && ikeepayUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-sm font-bold text-white">Paiement Mobile Money sécurisé</span>
              <button
                type="button"
                onClick={() => setIkeepayModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
            <iframe
              src={ikeepayUrl}
              title="Paiement Mobile Money"
              className="w-full h-[520px] bg-white"
            />
          </div>
        </div>
      )}
    </div>
  )
}
