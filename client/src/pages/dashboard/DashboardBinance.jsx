import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Input } from '../../components/ui/input'
import useStore from '../../store/useStore'
import { binanceAPI, bybitAPI } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import {
  BN, BnPage, BnCard, BnButton, BnBadge, BnTabs, BinanceLogo, CryptoTicker, pnlColor,
} from '../../components/binance/BinanceKit'
import BinanceConnectGuide from '../../components/guides/BinanceConnectGuide'
import {
  Plus, Trash2, Play, Square, Pause, Settings, Loader2, Check,
  AlertCircle, TrendingUp, Crown, Zap, BarChart3, Activity, Eye, EyeOff,
  ChevronDown, ChevronUp, RefreshCw, Wifi, ShieldCheck, FlaskConical,
  Bot, Coins, Lock, ArrowUpDown, Gauge,
} from 'lucide-react'

const PLAN_RANK = { free: 0, starter: 1, premium: 1, pro: 2, vip: 3, institutional: 4 }
const TIER_ICON = { free: Zap, starter: TrendingUp, pro: TrendingUp, vip: Crown, institutional: BarChart3 }
const MARKETS = [
  { value: 'both', label: 'Spot + Futures' },
  { value: 'spot', label: 'Spot' },
  { value: 'futures', label: 'Futures' },
]

function BybitLogo({ size = 20 }) {
  return (
    <div
      className="inline-flex items-center justify-center font-black rounded select-none shrink-0"
      style={{
        width: size,
        height: size,
        background: '#F7A600',
        color: '#000',
        fontSize: Math.max(8, Math.floor(size * 0.42)),
        letterSpacing: '-0.5px',
        fontWeight: 900
      }}
      title="Bybit"
    >
      BY
    </div>
  )
}

export default function DashboardBinance() {
  const { user } = useStore()

  const userPlan = (user?.subscription?.plan || '').toLowerCase()
  const isDerivUser =
    userPlan.includes('deriv') ||
    user?.subscription?.category === 'deriv' ||
    user?.subscription?.broker === 'deriv' ||
    localStorage.getItem('deriv_oauth_connected') === 'true' ||
    Boolean(user?.derivAccount) ||
    user?.tradingPreferences?.primaryBroker === 'deriv'

  if (isDerivUser) {
    return <Navigate to="/dashboard/deriv" replace />
  }

  const [tab, setTab] = useState('accounts')
  const [accounts, setAccounts] = useState([])
  const [robots, setRobots] = useState([])
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  const [connectExchange, setConnectExchange] = useState('binance') // 'binance' | 'bybit'
  const [showConnectForm, setShowConnectForm] = useState(false)
  const [connectForm, setConnectForm] = useState({ apiKey: '', apiSecret: '', label: '', market: 'both', isTestnet: true })
  const [showSecret, setShowSecret] = useState(false)
  const [connectLoading, setConnectLoading] = useState(false)

  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedRobot, setSelectedRobot] = useState('')
  const [launchMarket, setLaunchMarket] = useState('spot')
  const [robotSettings, setRobotSettings] = useState({ riskPercent: 1, maxOpenTrades: 2, leverage: 5, sizingMode: 'risk', fixedNotionalUsd: 10, lotMultiplier: 1 })
  const [showSettings, setShowSettings] = useState(false)
  const [startLoading, setStartLoading] = useState(false)

  const showMsg = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 6000) }

  const fetchAll = async () => {
    try {
      const [accsRes, bybitRes, robotsRes, sessRes, statsRes] = await Promise.all([
        binanceAPI.getAccounts(),
        bybitAPI.getAccounts().catch(() => ({ data: { accounts: [] } })),
        binanceAPI.getRobots(),
        binanceAPI.getSessions(),
        binanceAPI.getStats(),
      ])
      const bnAccs = (accsRes.data.accounts || []).map(a => ({ ...a, exchange: 'binance' }))
      const byAccs = (bybitRes?.data?.accounts || []).map(a => ({ ...a, exchange: 'bybit' }))
      setAccounts([...bnAccs, ...byAccs])
      setRobots(robotsRes.data.robots || [])
      setSessions(sessRes.data.sessions || [])
      setStats(statsRes.data.stats || null)
    } catch (err) { console.error('Binance fetch error:', err) }
    finally { setLoading(false) }
  }

  const fetchTrades = async () => {
    try { const r = await binanceAPI.getTrades({ limit: 50 }); setTrades(r.data.trades || []) }
    catch (err) { /* silencieux */ }
  }

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { if (tab === 'trades') fetchTrades() }, [tab])

  useEffect(() => {
    if (!sessions.length) return
    const id = setInterval(() => {
      binanceAPI.getSessions().then(r => setSessions(r.data.sessions || [])).catch(() => {})
      binanceAPI.getStats().then(r => setStats(r.data.stats || null)).catch(() => {})
      if (tab === 'trades') fetchTrades()
    }, 15000)
    return () => clearInterval(id)
  }, [sessions.length, tab])

  const handleConnect = async (e) => {
    e.preventDefault()
    setConnectLoading(true)
    try {
      if (connectExchange === 'bybit') {
        const res = await bybitAPI.connectAccount({
          apiKey: connectForm.apiKey.trim(),
          apiSecret: connectForm.apiSecret.trim(),
          label: connectForm.label.trim() || 'Mon compte Bybit',
          isTestnet: connectForm.isTestnet,
        })
        showMsg('success', `Compte Bybit « ${res.data.account?.label || 'Bybit'} » connecté ✅`)
      } else {
        const res = await binanceAPI.connectAccount(connectForm)
        showMsg('success', `Compte « ${res.data.account?.label || 'Binance'} » connecté ✅`)
      }
      setShowConnectForm(false)
      setConnectForm({ apiKey: '', apiSecret: '', label: '', market: 'both', isTestnet: true })
      await fetchAll()
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Connexion échouée. Vérifiez vos clés API.')
    } finally { setConnectLoading(false) }
  }

  const handleDelete = async (id) => {
    const acc = accounts.find(a => a._id === id)
    if (!window.confirm('Supprimer ce compte ? Les robots actifs sur ce compte seront arrêtés.')) return
    try {
      if (acc?.exchange === 'bybit') {
        await bybitAPI.deleteAccount(id)
      } else {
        await binanceAPI.deleteAccount(id)
      }
      showMsg('success', 'Compte supprimé.')
      await fetchAll()
    } catch (err) { showMsg('error', err.response?.data?.error || 'Erreur lors de la suppression.') }
  }

  const handleTest = async (id) => {
    const acc = accounts.find(a => a._id === id)
    try {
      const r = acc?.exchange === 'bybit' ? await bybitAPI.testAccount(id) : await binanceAPI.testAccount(id)
      showMsg(r.data.status === 'active' ? 'success' : 'error',
        r.data.status === 'active' ? 'Connexion OK ✅' : 'Connexion en erreur.')
      await fetchAll()
    } catch (err) { showMsg('error', 'Test de connexion échoué.') }
  }

  const selectRobot = (robot) => {
    if (!canUseRobot(robot.tier)) return
    setSelectedRobot(robot.key)
    setLaunchMarket(robot.markets?.[0] || 'spot')
  }

  const handleStartRobot = async () => {
    if (!selectedAccount || !selectedRobot) return
    setStartLoading(true)
    try {
      const robot = robots.find(r => r.key === selectedRobot)
      const selectedAccObj = accounts.find(a => a._id === selectedAccount)
      const payload = {
        accountId: selectedAccount,
        robotKey: selectedRobot,
        market: launchMarket,
        settings: {
          exchange: selectedAccObj?.exchange || 'binance',
          symbols: robot?.symbols || [],
          timeframe: robot?.timeframe || '5m',
          maxOpenTrades: robotSettings.maxOpenTrades,
          leverage: launchMarket === 'futures' ? robotSettings.leverage : 1,
          sizingMode: robotSettings.sizingMode,
          fixedNotionalUsd: robotSettings.sizingMode === 'fixed' ? robotSettings.fixedNotionalUsd : undefined,
          lotMultiplier: robotSettings.sizingMode === 'multiplier' ? robotSettings.lotMultiplier : undefined,
        },
        risk: { riskPercent: robotSettings.riskPercent },
      }
      await binanceAPI.startSession(payload)
      showMsg('success', 'Robot lancé 🚀')
      setSelectedRobot('')
      setTab('sessions')
      await fetchAll()
    } catch (err) { showMsg('error', err.response?.data?.error || 'Erreur au démarrage.') }
    finally { setStartLoading(false) }
  }

  const handleStop = async (id) => {
    try { await binanceAPI.stopSession(id); showMsg('success', 'Robot arrêté.'); await fetchAll() }
    catch (err) { showMsg('error', 'Erreur à l\'arrêt.') }
  }
  const handlePause = async (id) => {
    try { await binanceAPI.pauseSession(id); await fetchAll() }
    catch (err) { showMsg('error', 'Erreur.') }
  }
  const handleResume = async (id) => {
    try { await binanceAPI.resumeSession(id); await fetchAll() }
    catch (err) { showMsg('error', 'Erreur.') }
  }

  const canUseRobot = (tier) => {
    const plan = user?.subscription?.plan || 'free'
    return (PLAN_RANK[plan] || 0) >= (PLAN_RANK[tier] || 0)
  }

  const selectedRobotObj = robots.find(r => r.key === selectedRobot)
  const winRate = (s) => (s?.totalTrades > 0 ? ((s.wins / s.totalTrades) * 100).toFixed(0) : 0)

  const tabs = [
    { id: 'accounts', label: 'Comptes', icon: Wifi },
    { id: 'robots', label: 'Robots crypto', icon: Bot },
    { id: 'sessions', label: 'Sessions', icon: Play, count: sessions.length },
    { id: 'trades', label: 'Trades', icon: ArrowUpDown },
    { id: 'stats', label: 'Performances', icon: TrendingUp },
  ]

  if (loading) return (
    <BnPage><div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin" style={{ color: BN.yellow }} /></div></BnPage>
  )

  const sub = (s) => ({ color: BN.sub })

  return (
    <BnPage>
      <div className="space-y-5">
        {/* ── HERO ── */}
        <BnCard className="overflow-hidden">
          <div className="p-5 sm:p-6" style={{ background: `linear-gradient(135deg, ${BN.surface} 0%, ${BN.surface2} 100%)` }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="shrink-0 flex items-center gap-1.5 p-2 rounded-2xl" style={{ background: `${BN.yellow}1A` }}>
                  <BinanceLogo size={34} />
                  <BybitLogo size={34} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold" style={{ color: BN.text }}>Binance &amp; Bybit Trading</h1>
                    <BnBadge color={BN.yellow}>Binance Crypto</BnBadge>
                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: '#F7A60026', color: '#F7A600' }}>Bybit Crypto + Forex</span>
                  </div>
                  <p className="text-sm mt-1 max-w-xl" style={{ color: BN.sub }}>
                    Des <strong style={{ color: BN.text }}>robots automatiques</strong> qui tradent vos comptes <strong style={{ color: BN.yellow }}>Binance</strong> et <strong style={{ color: '#F7A600' }}>Bybit</strong> —
                    <strong style={{ color: BN.green }}> Spot</strong>, <strong style={{ color: BN.green }}> Futures</strong> et <strong style={{ color: BN.green }}> Forex Bybit</strong>. Mêmes stratégies algorithmiques, connexions sécurisées indépendantes.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <BnButton variant="dark" size="sm" onClick={fetchAll}><RefreshCw className="h-4 w-4" /> Actualiser</BnButton>
                <BnButton variant="primary" size="sm" onClick={() => setShowConnectForm(!showConnectForm)}>
                  <Plus className="h-4 w-4" /> Connecter un compte
                </BnButton>
              </div>
            </div>

            {/* Ticker live crypto */}
            <div className="mt-4">
              <CryptoTicker compact />
            </div>

            {/* Bandeau confiance */}
            <div className="mt-4 flex items-center gap-x-5 gap-y-1.5 flex-wrap text-xs" style={{ color: BN.sub }}>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" style={{ color: BN.green }} /> Clés API chiffrées AES-256-GCM</span>
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" style={{ color: BN.green }} /> Retrait désactivé (lecture + trading)</span>
              <span className="flex items-center gap-1.5"><Coins className="h-3.5 w-3.5" style={{ color: BN.yellow }} /> Vos fonds restent sur vos exchanges</span>
            </div>
          </div>
        </BnCard>

        {/* ── Stats rapides ── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              { label: 'P&L Total', value: formatCurrency(stats.totalPnl), color: pnlColor(stats.totalPnl) },
              { label: 'P&L du jour', value: formatCurrency(stats.dailyPnl), color: pnlColor(stats.dailyPnl) },
              { label: 'Win Rate', value: `${stats.winRate || 0}%`, color: BN.yellow },
              { label: 'Trades', value: stats.trades || 0, color: BN.text },
              { label: 'Positions ouv.', value: stats.openPositions || 0, color: BN.green },
              { label: 'Drawdown max', value: formatCurrency(stats.maxDrawdown), color: BN.red },
            ].map((s, i) => (
              <BnCard key={i}><div className="p-3 text-center">
                <p className="text-[11px] mb-1" style={{ color: BN.sub }}>{s.label}</p>
                <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
              </div></BnCard>
            ))}
          </div>
        )}

        {/* ── Message ── */}
        {message && (
          <div className="p-3 rounded-lg flex items-center gap-2 text-sm"
            style={{ background: message.type === 'success' ? `${BN.green}1A` : `${BN.red}1A`, color: message.type === 'success' ? BN.green : BN.red }}>
            {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        {/* ── Formulaire de connexion ── */}
        {showConnectForm && (
          <BnCard style={{ borderColor: connectExchange === 'bybit' ? '#F7A600' : BN.yellow }}>
            <div className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: BN.text }}>
                  {connectExchange === 'bybit' ? <BybitLogo size={22} /> : <BinanceLogo size={22} />}
                  Connecter un compte {connectExchange === 'bybit' ? 'Bybit (Crypto + Forex)' : 'Binance (Crypto)'}
                </h3>
                <div className="flex gap-1 p-1 rounded-lg self-start sm:self-auto" style={{ background: BN.surface2 }}>
                  <button
                    type="button"
                    onClick={() => { setConnectExchange('binance'); setConnectForm(f => ({ ...f, label: '' })) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                    style={{
                      background: connectExchange === 'binance' ? BN.yellow : 'transparent',
                      color: connectExchange === 'binance' ? '#000' : BN.sub,
                    }}
                  >
                    <BinanceLogo size={14} /> Binance
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConnectExchange('bybit'); setConnectForm(f => ({ ...f, label: '' })) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                    style={{
                      background: connectExchange === 'bybit' ? '#F7A600' : 'transparent',
                      color: connectExchange === 'bybit' ? '#000' : BN.sub,
                    }}
                  >
                    <BybitLogo size={14} /> Bybit
                  </button>
                </div>
              </div>

              <form onSubmit={handleConnect} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block" style={{ color: BN.text }}>
                      Clé API (API Key {connectExchange === 'bybit' ? 'Bybit' : 'Binance'})
                    </label>
                    <BnInput
                      placeholder={connectExchange === 'bybit' ? 'Votre API Key Bybit' : 'Votre API Key Binance'}
                      value={connectForm.apiKey}
                      onChange={e => setConnectForm({ ...connectForm, apiKey: e.target.value })}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium mb-1.5 block" style={{ color: BN.text }}>
                      Clé secrète (API Secret {connectExchange === 'bybit' ? 'Bybit' : 'Binance'})
                    </label>
                    <div className="relative">
                      <BnInput
                        type={showSecret ? 'text' : 'password'}
                        placeholder={connectExchange === 'bybit' ? 'Votre API Secret Bybit' : 'Votre API Secret Binance'}
                        value={connectForm.apiSecret}
                        onChange={e => setConnectForm({ ...connectForm, apiSecret: e.target.value })}
                        required
                      />
                      <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: BN.sub }}>
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block" style={{ color: BN.text }}>Surnom <span style={{ color: BN.sub }}>(optionnel)</span></label>
                    <BnInput
                      placeholder={connectExchange === 'bybit' ? 'Mon compte Bybit' : 'Mon compte Binance'}
                      value={connectForm.label}
                      onChange={e => setConnectForm({ ...connectForm, label: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block" style={{ color: BN.text }}>Marché</label>
                    {connectExchange === 'bybit' ? (
                      <div className="flex h-10 items-center px-3 rounded-lg text-sm" style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}>
                        Unified (Spot + Futures + Forex)
                      </div>
                    ) : (
                      <select value={connectForm.market} onChange={e => setConnectForm({ ...connectForm, market: e.target.value })}
                        className="flex h-10 w-full rounded-lg px-3 text-sm outline-none"
                        style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}>
                        {MARKETS.map(m => <option key={m.value} value={m.value} style={{ background: BN.surface2 }}>{m.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button type="button" onClick={() => setConnectForm({ ...connectForm, isTestnet: true })}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{
                      border: `2px solid ${connectForm.isTestnet ? (connectExchange === 'bybit' ? '#F7A600' : BN.yellow) : BN.border}`,
                      color: connectForm.isTestnet ? (connectExchange === 'bybit' ? '#F7A600' : BN.yellow) : BN.sub,
                      background: connectForm.isTestnet ? `${BN.yellow}10` : 'transparent'
                    }}>
                    <FlaskConical className="h-4 w-4" /> Testnet (recommandé pour tester)
                  </button>
                  <button type="button" onClick={() => setConnectForm({ ...connectForm, isTestnet: false })}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{
                      border: `2px solid ${!connectForm.isTestnet ? BN.green : BN.border}`,
                      color: !connectForm.isTestnet ? BN.green : BN.sub,
                      background: !connectForm.isTestnet ? `${BN.green}10` : 'transparent'
                    }}>
                    <Wifi className="h-4 w-4" /> Live (argent réel)
                  </button>
                </div>

                <div className="p-3 rounded-lg text-xs space-y-1" style={{ background: `${BN.yellow}0D`, border: `1px solid ${BN.yellow}33`, color: BN.sub }}>
                  <p>🔒 Vos clés sont <strong style={{ color: BN.text }}>chiffrées (AES-256-GCM)</strong> et jamais affichées en clair.</p>
                  {connectExchange === 'bybit' ? (
                    <>
                      <p>⚠️ Bybit : Dans <strong style={{ color: BN.text }}>Bybit &gt; Profil &gt; API Management &gt; Créer clé (Transactions Système)</strong>.</p>
                      <p>Activez <strong style={{ color: BN.text }}>Lecture et Écriture</strong> sur <strong style={{ color: BN.text }}>Contrats (Linear)</strong> et <strong style={{ color: BN.text }}>Spot</strong>. Gardez <strong style={{ color: BN.red }}>Retrait décoché</strong>.</p>
                      {connectForm.isTestnet && <p>🧪 Bybit Testnet : créez vos clés sur <strong style={{ color: '#F7A600' }}>testnet.bybit.com</strong>.</p>}
                    </>
                  ) : (
                    <>
                      <p>⚠️ Binance : Activez uniquement <strong style={{ color: BN.text }}>Lecture</strong> et <strong style={{ color: BN.text }}>Trading Spot/Futures</strong>. La permission <strong style={{ color: BN.text }}>Retrait</strong> doit rester <strong style={{ color: BN.red }}>désactivée</strong>.</p>
                      {connectForm.isTestnet && <p>🧪 Binance Testnet : clés sur <strong style={{ color: BN.yellow }}>testnet.binance.vision</strong> / <strong style={{ color: BN.yellow }}>testnet.binancefuture.com</strong>.</p>}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <BnButton type="submit" variant="primary" disabled={connectLoading}>
                    {connectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                    Connecter &amp; tester {connectExchange === 'bybit' ? 'Bybit' : 'Binance'}
                  </BnButton>
                  <BnButton type="button" variant="ghost" onClick={() => setShowConnectForm(false)}>Annuler</BnButton>
                </div>
              </form>
            </div>
          </BnCard>
        )}

        {/* ── Tabs ── */}
        <BnTabs tabs={tabs} active={tab} onChange={setTab} />

        {/* ── Comptes ── */}
        {tab === 'accounts' && (
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <BnCard><div className="py-16 text-center px-4">
                <div className="inline-flex rounded-2xl p-4 mb-4 gap-3 items-center" style={{ background: `${BN.yellow}14` }}>
                  <BinanceLogo size={36} />
                  <BybitLogo size={36} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: BN.text }}>Aucun compte connecté</h3>
                <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: BN.sub }}>Connectez votre compte Binance ou Bybit via vos clés API pour laisser les robots trader automatiquement à votre place.</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <BnButton variant="primary" onClick={() => { setConnectExchange('binance'); setShowConnectForm(true) }}>
                    <Plus className="h-4 w-4" /> Connecter Binance
                  </BnButton>
                  <button
                    onClick={() => { setConnectExchange('bybit'); setShowConnectForm(true) }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{ background: '#F7A600', color: '#000' }}
                  >
                    <Plus className="h-4 w-4" /> Connecter Bybit
                  </button>
                </div>
              </div></BnCard>
            ) : null}

            {/* Guide illustré si aucun compte */}
            {accounts.length === 0 && <BinanceConnectGuide variant="full" />}

            {accounts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map(acc => {
                  const isBybit = acc.exchange === 'bybit'
                  return (
                    <BnCard key={acc._id} style={{ borderColor: isBybit ? '#F7A60033' : BN.border }}>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: isBybit ? '#F7A60020' : `${BN.yellow}1A` }}>
                              {isBybit ? <BybitLogo size={22} /> : <BinanceLogo size={22} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm" style={{ color: BN.text }}>{acc.label || (isBybit ? 'Bybit' : 'Binance')}</p>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: isBybit ? '#F7A60022' : `${BN.yellow}22`, color: isBybit ? '#F7A600' : BN.yellow }}>
                                  {isBybit ? 'BYBIT' : 'BINANCE'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs capitalize" style={{ color: BN.sub }}>{acc.market || 'Unified'}</span>
                                {acc.isTestnet
                                  ? <BnBadge color={BN.yellow}><FlaskConical className="h-2.5 w-2.5" />Testnet</BnBadge>
                                  : <BnBadge color={BN.green}>Live</BnBadge>}
                              </div>
                            </div>
                          </div>
                          <BnBadge color={acc.status === 'active' ? BN.green : BN.sub}>
                            {acc.status === 'active' ? 'Actif' : acc.status || 'inactif'}
                          </BnBadge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="p-2 rounded-lg" style={{ background: BN.surface2 }}>
                            <p className="text-xs" style={{ color: BN.sub }}>Spot USDT</p>
                            <p className="font-semibold text-sm" style={{ color: BN.text }}>{formatCurrency(acc.spotUSDT || 0)}</p>
                          </div>
                          <div className="p-2 rounded-lg" style={{ background: BN.surface2 }}>
                            <p className="text-xs" style={{ color: BN.sub }}>{isBybit ? 'Linear / Forex USDT' : 'Futures USDT'}</p>
                            <p className="font-semibold text-sm" style={{ color: BN.text }}>{formatCurrency(acc.futuresUSDT || 0)}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {acc.permissions?.spot && <BnBadge color={BN.green}>Spot ✓</BnBadge>}
                          {(acc.permissions?.futures || acc.permissions?.linear) && <BnBadge color={BN.green}>{isBybit ? 'Linear/Forex ✓' : 'Futures ✓'}</BnBadge>}
                          {acc.permissions?.withdraw === false && <BnBadge color={BN.green}>Retrait off ✓</BnBadge>}
                        </div>
                        <div className="flex gap-2">
                          <BnButton variant="primary" size="sm" className="flex-1" onClick={() => { setSelectedAccount(acc._id); setTab('robots') }}>
                            <Play className="h-3 w-3" /> Lancer Robot
                          </BnButton>
                          <BnButton variant="dark" size="sm" onClick={() => handleTest(acc._id)} title="Tester la connexion"><RefreshCw className="h-3 w-3" /></BnButton>
                          <BnButton variant="danger" size="sm" onClick={() => handleDelete(acc._id)}><Trash2 className="h-3 w-3" /></BnButton>
                        </div>
                      </div>
                    </BnCard>
                  )
                })}
              </div>
            )}
          </div>
        )}


        {/* ── Robots ── */}
        {tab === 'robots' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-sm" style={{ color: BN.sub }}>
              <Bot className="h-4 w-4" style={{ color: BN.yellow }} />
              Chaque robot trade des <strong style={{ color: BN.text }}>paires crypto Binance</strong> (USDT) en automatique selon sa stratégie.
            </div>
            {accounts.length === 0 && (
              <div className="space-y-2">
                <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: `${BN.yellow}12`, color: BN.yellow }}>
                  <AlertCircle className="h-4 w-4" /> Connecte d'abord un compte Binance pour pouvoir lancer un robot.
                </div>
                <BinanceConnectGuide variant="compact" />
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {robots.map(robot => {
                const Icon = TIER_ICON[robot.tier] || Zap
                const canUse = canUseRobot(robot.tier)
                const isSelected = selectedRobot === robot.key
                return (
                  <BnCard key={robot.key} hover={canUse}
                    style={{ borderColor: isSelected ? BN.yellow : BN.border, opacity: canUse ? 1 : 0.6 }}
                    onClick={() => selectRobot(robot)}>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${BN.yellow}1A` }}>
                          <Icon className="h-6 w-6" style={{ color: BN.yellow }} />
                        </div>
                        <div className="flex items-center gap-2">
                          <BnBadge color={BN.yellow}>{robot.badge}</BnBadge>
                          {isSelected && <Check className="h-4 w-4" style={{ color: BN.yellow }} />}
                          {!canUse && <Lock className="h-4 w-4" style={{ color: BN.sub }} />}
                        </div>
                      </div>
                      <h3 className="font-bold mb-2" style={{ color: BN.text }}>{robot.name}</h3>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <Metric label="Win Rate" value={robot.winRate} color={BN.green} />
                        <Metric label="Marché" value={(robot.markets || []).join('/')} color={BN.yellow} upper />
                        <Metric label="Capital min" value={`$${robot.minCapital}`} color={BN.text} />
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(robot.symbols || []).slice(0, 3).map(s => (
                          <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold" style={{ background: BN.surface2, color: BN.yellow }}>{s}</span>
                        ))}
                        {(robot.symbols || []).length > 3 && <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: BN.surface2, color: BN.sub }}>+{robot.symbols.length - 3}</span>}
                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: BN.surface2, color: BN.sub }}>{robot.timeframe}</span>
                      </div>
                      <div className="text-xs" style={{ color: BN.sub }}>Stratégie : <span style={{ color: BN.text }} className="font-medium">{robot.strategy}</span></div>
                      {!canUse && <div className="mt-2 text-xs font-medium" style={{ color: BN.yellow }}>Abonnement {robot.planRequired?.toUpperCase()} requis</div>}
                    </div>
                  </BnCard>
                )
              })}
            </div>

            {/* Panneau de lancement */}
            {selectedRobot && selectedAccount && selectedRobotObj && (
              <BnCard style={{ borderColor: BN.green }}>
                <div className="p-5">
                  <h3 className="font-semibold mb-4 text-sm" style={{ color: BN.text }}>Lancer le robot sur le compte sélectionné</h3>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {accounts.filter(a => a._id === selectedAccount).map(a => (
                      <div key={a._id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: BN.surface2, color: BN.text }}>
                        <BinanceLogo size={16} /> {a.label || 'Binance'} {a.isTestnet && <span className="text-[10px]" style={{ color: BN.yellow }}>(testnet)</span>}
                      </div>
                    ))}
                    <span style={{ color: BN.sub }} className="text-sm">→</span>
                    <BnBadge color={BN.yellow}>{selectedRobotObj.name}</BnBadge>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs mb-1.5 block" style={{ color: BN.sub }}>Marché d'exécution</label>
                    <div className="flex gap-2">
                      {(selectedRobotObj.markets || ['spot']).map(m => (
                        <button key={m} type="button" onClick={() => setLaunchMarket(m)}
                          className="px-3 py-1.5 rounded-lg text-sm capitalize transition-colors"
                          style={{ border: `2px solid ${launchMarket === m ? BN.yellow : BN.border}`, color: launchMarket === m ? BN.yellow : BN.sub, background: launchMarket === m ? `${BN.yellow}10` : 'transparent' }}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button className="flex items-center gap-2 text-sm mb-3 transition-colors" style={{ color: BN.sub }} onClick={() => setShowSettings(!showSettings)}>
                    <Settings className="h-4 w-4" /> Paramètres &amp; risque
                    {showSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showSettings && (
                    <div className="p-3 rounded-lg mb-4 space-y-3" style={{ border: `1px solid ${BN.border}` }}>
                      {/* Mode d'ajustement des lots */}
                      <div>
                        <label className="text-xs flex items-center gap-1 mb-1.5" style={{ color: BN.sub }}><Coins className="h-3 w-3" /> Taille des lots</label>
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { v: 'risk', l: 'Auto (risque %)' },
                            { v: 'fixed', l: 'Montant fixe (USDT)' },
                            { v: 'multiplier', l: 'Multiplicateur' },
                          ].map(o => (
                            <button key={o.v} type="button" onClick={() => setRobotSettings({ ...robotSettings, sizingMode: o.v })}
                              className="px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                              style={{ border: `2px solid ${robotSettings.sizingMode === o.v ? BN.yellow : BN.border}`, color: robotSettings.sizingMode === o.v ? BN.yellow : BN.sub, background: robotSettings.sizingMode === o.v ? `${BN.yellow}10` : 'transparent' }}>
                              {o.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {robotSettings.sizingMode === 'risk' && (
                          <div><label className="text-xs" style={{ color: BN.sub }}>Risque % / trade</label><BnInput type="number" value={robotSettings.riskPercent} onChange={e => setRobotSettings({ ...robotSettings, riskPercent: +e.target.value })} className="h-8 text-xs" min={0.1} max={10} step={0.1} /></div>
                        )}
                        {robotSettings.sizingMode === 'fixed' && (
                          <div><label className="text-xs" style={{ color: BN.sub }}>Montant / trade (USDT)</label><BnInput type="number" value={robotSettings.fixedNotionalUsd} onChange={e => setRobotSettings({ ...robotSettings, fixedNotionalUsd: +e.target.value })} className="h-8 text-xs" min={5} step={1} /></div>
                        )}
                        {robotSettings.sizingMode === 'multiplier' && (
                          <>
                            <div><label className="text-xs" style={{ color: BN.sub }}>Risque % base</label><BnInput type="number" value={robotSettings.riskPercent} onChange={e => setRobotSettings({ ...robotSettings, riskPercent: +e.target.value })} className="h-8 text-xs" min={0.1} max={10} step={0.1} /></div>
                            <div><label className="text-xs" style={{ color: BN.sub }}>Multiplicateur ×</label><BnInput type="number" value={robotSettings.lotMultiplier} onChange={e => setRobotSettings({ ...robotSettings, lotMultiplier: +e.target.value })} className="h-8 text-xs" min={0.1} max={10} step={0.1} /></div>
                          </>
                        )}
                        <div><label className="text-xs" style={{ color: BN.sub }}>Max trades simult.</label><BnInput type="number" value={robotSettings.maxOpenTrades} onChange={e => setRobotSettings({ ...robotSettings, maxOpenTrades: +e.target.value })} className="h-8 text-xs" min={1} max={10} /></div>
                        {launchMarket === 'futures' && (
                          <div><label className="text-xs flex items-center gap-1" style={{ color: BN.sub }}><Gauge className="h-3 w-3" />Levier</label><BnInput type="number" value={robotSettings.leverage} onChange={e => setRobotSettings({ ...robotSettings, leverage: +e.target.value })} className="h-8 text-xs" min={1} max={50} /></div>
                        )}
                      </div>
                      <p className="text-[11px]" style={{ color: BN.sub }}>💡 Dépôt minimum : <strong style={{ color: BN.text }}>10 USDT</strong>. Le Stop Loss est toujours appliqué automatiquement.</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <BnButton variant="success" onClick={handleStartRobot} disabled={startLoading}>
                      {startLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Lancer le Robot
                    </BnButton>
                    <BnButton variant="ghost" onClick={() => setSelectedRobot('')}>Annuler</BnButton>
                  </div>
                </div>
              </BnCard>
            )}

            {(!selectedAccount || !selectedRobot) && (
              <p className="text-sm text-center" style={{ color: BN.sub }}>
                {!selectedAccount ? '← Sélectionne d\'abord un compte dans l\'onglet Comptes' : 'Sélectionne un robot ci-dessus pour continuer.'}
              </p>
            )}
          </div>
        )}

        {/* ── Sessions ── */}
        {tab === 'sessions' && (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <BnCard><div className="py-16 text-center">
                <Activity className="h-12 w-12 mx-auto mb-4" style={{ color: BN.sub }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: BN.text }}>Aucune session active</h3>
                <p className="text-sm mb-4" style={{ color: BN.sub }}>Lance un robot depuis l'onglet Robots crypto.</p>
                <BnButton variant="dark" onClick={() => setTab('robots')}>Aller aux Robots</BnButton>
              </div></BnCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessions.map(session => {
                  const robot = robots.find(r => r.key === session.robotKey)
                  const Icon = TIER_ICON[robot?.tier] || Zap
                  const st = session.stats || {}
                  const paused = session.status === 'paused'
                  return (
                    <BnCard key={session._id}>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BN.yellow}1A` }}>
                              <Icon className="h-5 w-5" style={{ color: BN.yellow }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm" style={{ color: BN.text }}>{robot?.name || session.robotKey}</p>
                                <div className={`w-2 h-2 rounded-full ${paused ? '' : 'animate-pulse'}`} style={{ background: paused ? BN.yellow : BN.green }} />
                              </div>
                              <p className="text-xs capitalize" style={{ color: BN.sub }}>
                                <span className="font-semibold" style={{ color: session.exchange === 'bybit' ? '#F7A600' : BN.yellow }}>
                                  {session.exchange === 'bybit' ? 'Bybit' : 'Binance'}
                                </span> : {session.exchange === 'bybit' ? (session.bybitAccount?.label || 'Compte Bybit') : (session.binanceAccount?.label || 'Compte Binance')} — {session.market}
                                {Boolean(session.exchange === 'bybit' ? session.bybitAccount?.isTestnet : session.binanceAccount?.isTestnet) && (
                                  <span style={{ color: BN.yellow }}> (testnet)</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <BnBadge color={paused ? BN.yellow : BN.green}>{paused ? 'En pause' : 'Actif'}</BnBadge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <SessStat value={formatCurrency(st.totalPnl || 0)} label="P&L" color={pnlColor(st.totalPnl || 0)} />
                          <SessStat value={st.totalTrades || 0} label="Trades" color={BN.text} />
                          <SessStat value={`${winRate(st)}%`} label="Win Rate" color={BN.yellow} />
                        </div>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {(session.settings?.symbols || []).slice(0, 5).map(s => (
                            <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold" style={{ background: BN.surface2, color: BN.yellow }}>{s}</span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          {paused ? (
                            <BnButton variant="success" size="sm" className="flex-1" onClick={() => handleResume(session._id)}><Play className="h-3 w-3" /> Reprendre</BnButton>
                          ) : (
                            <BnButton variant="dark" size="sm" className="flex-1" onClick={() => handlePause(session._id)}><Pause className="h-3 w-3" /> Pause</BnButton>
                          )}
                          <BnButton variant="danger" size="sm" onClick={() => handleStop(session._id)}><Square className="h-3 w-3" /> Stop</BnButton>
                        </div>
                      </div>
                    </BnCard>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Trades ── */}
        {tab === 'trades' && (
          <BnCard>
            <div className="p-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${BN.border}` }}>
              <h3 className="text-base font-semibold" style={{ color: BN.text }}>Historique des trades crypto</h3>
              <BnButton variant="dark" size="sm" onClick={fetchTrades}><RefreshCw className="h-3 w-3" /> Actualiser</BnButton>
            </div>
            <div className="p-3">
              {trades.length === 0 ? (
                <p className="text-center py-10 text-sm" style={{ color: BN.sub }}>Aucun trade pour le moment.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[680px]">
                    <thead>
                      <tr className="text-left text-xs uppercase" style={{ color: BN.sub, borderBottom: `1px solid ${BN.border}` }}>
                        {['Date', 'Paire', 'Sens', 'Marché', 'Entrée', 'Sortie', 'P&L', 'Statut'].map(h => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map(t => (
                        <tr key={t._id} style={{ borderBottom: `1px solid ${BN.border}88` }}>
                          <td className="py-2 pr-3 whitespace-nowrap" style={{ color: BN.sub }}>{formatDate(t.openedAt)}</td>
                          <td className="py-2 pr-3 font-mono font-semibold" style={{ color: BN.yellow }}>{t.symbol}</td>
                          <td className="py-2 pr-3"><BnBadge color={t.side === 'BUY' ? BN.green : BN.red}>{t.side}</BnBadge></td>
                          <td className="py-2 pr-3 capitalize" style={{ color: BN.sub }}>{t.market}</td>
                          <td className="py-2 pr-3 font-mono text-xs" style={{ color: BN.text }}>{t.entryPrice ?? '—'}</td>
                          <td className="py-2 pr-3 font-mono text-xs" style={{ color: BN.text }}>{t.exitPrice ?? '—'}</td>
                          <td className="py-2 pr-3 font-semibold" style={{ color: pnlColor(t.pnl || 0) }}>{t.status === 'closed' ? formatCurrency(t.pnl || 0) : '—'}</td>
                          <td className="py-2 pr-3"><BnBadge color={t.status === 'open' ? BN.green : t.status === 'closed' ? BN.sub : BN.red}>{t.status}</BnBadge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </BnCard>
        )}

        {/* ── Statistiques ── */}
        {tab === 'stats' && (
          <BnCard>
            <div className="p-5" style={{ borderBottom: `1px solid ${BN.border}` }}>
              <h3 className="text-base font-semibold" style={{ color: BN.text }}>Performances Binance</h3>
            </div>
            <div className="p-5">
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <BigStat label="P&L Total" value={formatCurrency(stats.totalPnl)} color={pnlColor(stats.totalPnl)} />
                  <BigStat label="P&L du jour" value={formatCurrency(stats.dailyPnl)} color={pnlColor(stats.dailyPnl)} />
                  <BigStat label="Win Rate" value={`${stats.winRate || 0}%`} color={BN.yellow} />
                  <BigStat label="Total Trades" value={stats.trades || 0} color={BN.text} />
                  <BigStat label="Volume tradé" value={formatCurrency(stats.volume)} color={BN.text} />
                  <BigStat label="Drawdown max" value={formatCurrency(stats.maxDrawdown)} color={BN.red} />
                  <BigStat label="ROI" value={`${stats.roi || 0}%`} color={BN.green} />
                  <BigStat label="Positions ouvertes" value={stats.openPositions || 0} color={BN.green} />
                </div>
              ) : <p className="text-center py-8" style={{ color: BN.sub }}>Aucune donnée disponible.</p>}
            </div>
          </BnCard>
        )}
      </div>
    </BnPage>
  )
}

// ── Sous-composants ──
function BnInput(props) {
  const { className = '', style, ...rest } = props
  return (
    <input {...rest}
      className={`flex h-10 w-full rounded-lg px-3 text-sm outline-none transition-colors ${className}`}
      style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}`, ...style }}
      onFocus={(e) => (e.currentTarget.style.borderColor = BN.yellow)}
      onBlur={(e) => (e.currentTarget.style.borderColor = BN.border)}
    />
  )
}

function Metric({ label, value, color, upper }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold ${upper ? 'uppercase' : ''}`} style={{ color }}>{value}</p>
      <p className="text-[10px]" style={{ color: BN.sub }}>{label}</p>
    </div>
  )
}

function SessStat({ value, label, color }) {
  return (
    <div className="text-center p-2 rounded-lg" style={{ background: BN.surface2 }}>
      <p className="font-bold" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: BN.sub }}>{label}</p>
    </div>
  )
}

function BigStat({ label, value, color }) {
  return (
    <div>
      <p className="text-sm" style={{ color: BN.sub }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  )
}
