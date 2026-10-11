import React, { useState, useEffect } from 'react'
import { binanceAPI, settingsAPI, adminCryptoRobotsAPI } from '../../lib/api'
import {
  BN, BnPage, BnCard, BnButton, BnBadge, BnTabs, BinanceLogo, CryptoTicker, pnlColor,
} from '../../components/binance/BinanceKit'
import {
  RefreshCw, Loader2, Users, Wallet, Activity, Bot, TrendingUp, TrendingDown,
  DollarSign, BarChart3, AlertTriangle, CheckCircle2, Layers, ShieldCheck, Link2, Save, Check,
  Plus, Trash2, Edit, Code, Play, Sparkles, X, Sliders
} from 'lucide-react'

const TABS = [
  { id: 'accounts', label: 'Comptes' },
  { id: 'robots', label: 'Performance' },
  { id: 'catalog', label: 'Stratégies IA & Robots' },
  { id: 'trades', label: 'Trades' },
  { id: 'logs', label: 'Journal' },
  { id: 'referrals', label: 'Parrainages (Binance & Bybit)' },
]

const fmtUSD = (n) => `${(n ?? 0) >= 0 ? '' : '-'}$${Math.abs(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}`

export default function AdminBinance() {
  const [stats, setStats] = useState({})
  const [tab, setTab] = useState('accounts')
  const [accounts, setAccounts] = useState([])
  const [robots, setRobots] = useState([])
  const [trades, setTrades] = useState([])
  const [logs, setLogs] = useState([])
  const [cryptoCatalog, setCryptoCatalog] = useState([])
  const [tradeStatus, setTradeStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal création / édition de robot & stratégie IA
  const [showRobotModal, setShowRobotModal] = useState(false)
  const [editingRobot, setEditingRobot] = useState(null)
  const [catalogSaving, setCatalogSaving] = useState(false)
  const [testPromptLoading, setTestPromptLoading] = useState(false)
  const [testPromptResult, setTestPromptResult] = useState(null)
  const [robotForm, setRobotForm] = useState({
    robotKey: '',
    name: '',
    description: '',
    minPlan: 'free',
    strategyType: 'prompt_nl',
    strategyPrompt: '',
    builtinStrategy: 'scalper_pro',
    symbols: 'BTCUSDT, ETHUSDT, SOLUSDT',
    timeframe: '5m',
    exchanges: ['binance', 'bybit'],
    winRateTarget: 88,
    maxLeverage: 10,
    riskPerTradePct: 2,
    stopLossPct: 1.5,
    takeProfitPct: 3.0,
    isActive: true,
  })

  const [refSettings, setRefSettings] = useState({
    binanceReferralLink: '',
    binanceAffiliateCode: '',
    bybitReferralLink: '',
    bybitAffiliateCode: '',
  })
  const [refSaving, setRefSaving] = useState(false)
  const [refMsg, setRefMsg] = useState('')

  const loadStats = async () => {
    try {
      const { data } = await binanceAPI.adminGetDashboard()
      setStats(data.stats || {})
    } catch (err) { setError(err.response?.data?.error || err.message) }
  }

  const loadTab = async (which = tab) => {
    setError('')
    try {
      if (which === 'accounts') {
        const { data } = await binanceAPI.adminGetAccounts({ limit: 100 })
        setAccounts(data.accounts || [])
      } else if (which === 'robots') {
        const { data } = await binanceAPI.adminGetRobots()
        setRobots(data.robots || [])
      } else if (which === 'catalog') {
        const { data } = await adminCryptoRobotsAPI.getRobots()
        setCryptoCatalog(data.robots || [])
      } else if (which === 'trades') {
        const { data } = await binanceAPI.adminGetTrades({ limit: 80, status: tradeStatus || undefined })
        setTrades(data.trades || [])
      } else if (which === 'logs') {
        const { data } = await binanceAPI.adminGetLogs({ limit: 150 })
        setLogs(data.logs || [])
      } else if (which === 'referrals') {
        const { data } = await settingsAPI.adminGet()
        const s = data.settings || {}
        setRefSettings({
          binanceReferralLink: s.binanceReferralLink || '',
          binanceAffiliateCode: s.binanceAffiliateCode || '',
          bybitReferralLink: s.bybitReferralLink || '',
          bybitAffiliateCode: s.bybitAffiliateCode || '',
        })
      }
    } catch (err) { setError(err.response?.data?.error || err.message) }
  }

  const handleToggleRobot = async (id) => {
    try {
      await adminCryptoRobotsAPI.toggleRobot(id)
      loadTab('catalog')
    } catch (err) { setError(err.response?.data?.error || err.message) }
  }

  const handleDeleteRobot = async (id) => {
    if (!confirm('Supprimer ce robot crypto ?')) return
    try {
      await adminCryptoRobotsAPI.deleteRobot(id)
      loadTab('catalog')
    } catch (err) { setError(err.response?.data?.error || err.message) }
  }

  const handleResetDefaults = async () => {
    if (!confirm('Réinitialiser tous les robots aux stratégies institutionnelles approuvées (>85% Win Rate) ?')) return
    try {
      await adminCryptoRobotsAPI.resetDefaults()
      loadTab('catalog')
      alert('Stratégies institutionnelles réinitialisées avec succès.')
    } catch (err) { setError(err.response?.data?.error || err.message) }
  }

  const handleTestPrompt = async () => {
    if (!robotForm.strategyPrompt) return
    setTestPromptLoading(true)
    setTestPromptResult(null)
    try {
      const { data } = await adminCryptoRobotsAPI.parsePrompt({
        prompt: robotForm.strategyPrompt,
        sampleTicks: [
          { close: 64500, high: 64600, low: 64400, volume: 100 },
          { close: 64600, high: 64750, low: 64500, volume: 140 },
          { close: 64700, high: 64800, low: 64620, volume: 180 },
          { close: 64900, high: 64950, low: 64700, volume: 220 },
          { close: 65150, high: 65200, low: 64850, volume: 290 },
        ],
      })
      setTestPromptResult(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors du test de la stratégie.')
    } finally {
      setTestPromptLoading(false)
    }
  }

  const handleSaveRobot = async (e) => {
    e.preventDefault()
    setCatalogSaving(true)
    try {
      const payload = {
        ...robotForm,
        symbols: typeof robotForm.symbols === 'string'
          ? robotForm.symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
          : robotForm.symbols,
      }
      if (editingRobot) {
        await adminCryptoRobotsAPI.updateRobot(editingRobot._id, payload)
      } else {
        await adminCryptoRobotsAPI.createRobot(payload)
      }
      setShowRobotModal(false)
      setEditingRobot(null)
      loadTab('catalog')
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setCatalogSaving(false)
    }
  }

  const handleSaveReferrals = async (e) => {
    e.preventDefault()
    setRefSaving(true)
    setError('')
    try {
      await settingsAPI.adminUpdate(refSettings)
      setRefMsg('Liens et codes de parrainage enregistrés avec succès.')
      setTimeout(() => setRefMsg(''), 4000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde.')
    } finally {
      setRefSaving(false)
    }
  }

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadStats(), loadTab()])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadTab() }, [tab, tradeStatus])

  useEffect(() => {
    const t = setInterval(() => { loadStats(); loadTab() }, 20_000)
    return () => clearInterval(t)
  }, [tab, tradeStatus])

  if (loading) return <BnPage><div className="py-20 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin" style={{ color: BN.yellow }} /></div></BnPage>

  return (
    <BnPage>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5" style={{ background: `${BN.yellow}1A` }}><BinanceLogo size={28} /></div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: BN.text }}>
                Admin · Binance <BnBadge color={BN.yellow}>Crypto Spot/Futures</BnBadge>
              </h1>
              <p className="text-sm" style={{ color: BN.sub }}>Comptes connectés, robots, trades &amp; journal — temps réel</p>
            </div>
          </div>
          <BnButton variant="dark" onClick={loadAll}><RefreshCw className="h-4 w-4" />Actualiser</BnButton>
        </div>

        <CryptoTicker compact />

        {error && (
          <div className="p-3 rounded-lg flex items-center gap-2 text-sm" style={{ background: `${BN.red}1A`, color: BN.red }}>
            <AlertTriangle className="h-4 w-4" />{error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Users connectés" value={stats.connectedUsers || 0} color={BN.text} />
          <StatCard icon={Wallet} label="Comptes Binance" value={`${stats.activeAccounts || 0}/${stats.totalAccounts || 0}`} color={BN.yellow} />
          <StatCard icon={Bot} label="Robots actifs" value={stats.activeSessions || 0} color={BN.yellow} />
          <StatCard icon={Activity} label="Positions ouvertes" value={stats.openTrades || 0} color={BN.green} />
          <StatCard icon={stats.totalPnl >= 0 ? TrendingUp : TrendingDown} label="P&L total" value={fmtUSD(stats.totalPnl)} color={pnlColor(stats.totalPnl)} />
          <StatCard icon={DollarSign} label="P&L aujourd'hui" value={fmtUSD(stats.dailyPnl)} color={pnlColor(stats.dailyPnl)} />
          <StatCard icon={BarChart3} label="Volume tradé" value={fmtUSD(stats.totalVolume)} color={BN.text} />
          <StatCard icon={CheckCircle2} label="Win rate global" value={`${stats.winRate || 0}%`} color={BN.green} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Layers} label="Trades totaux" value={stats.totalTrades || 0} color={BN.sub} />
          <StatCard icon={DollarSign} label="Commissions" value={fmtUSD(stats.totalCommission)} color={BN.sub} />
          <StatCard icon={Activity} label="Trades du jour" value={stats.dailyTrades || 0} color={BN.sub} />
          <StatCard icon={AlertTriangle} label="Erreurs (24h)" value={stats.errorLogs24h || 0} color={stats.errorLogs24h ? BN.red : BN.sub} />
        </div>

        {/* Tabs */}
        <BnTabs tabs={TABS} active={tab} onChange={setTab} />

        {tab === 'accounts' && <AccountsTable accounts={accounts} />}
        {tab === 'robots' && <RobotsTable robots={robots} />}
        {tab === 'catalog' && (
          <CryptoCatalogView
            catalog={cryptoCatalog}
            onToggle={handleToggleRobot}
            onDelete={handleDeleteRobot}
            onResetDefaults={handleResetDefaults}
            onEdit={(r) => {
              setEditingRobot(r)
              setRobotForm({
                robotKey: r.robotKey,
                name: r.name,
                description: r.description || '',
                minPlan: r.minPlan || 'free',
                strategyType: r.strategyType || 'prompt_nl',
                strategyPrompt: r.strategyPrompt || '',
                builtinStrategy: r.builtinStrategy || 'scalper_pro',
                symbols: (r.symbols || []).join(', '),
                timeframe: r.timeframe || '5m',
                exchanges: r.exchanges || ['binance', 'bybit'],
                winRateTarget: r.winRateTarget || 88,
                maxLeverage: r.maxLeverage || 10,
                riskPerTradePct: r.riskPerTradePct || 2,
                stopLossPct: r.stopLossPct || 1.5,
                takeProfitPct: r.takeProfitPct || 3.0,
                isActive: r.isActive !== false,
              })
              setTestPromptResult(null)
              setShowRobotModal(true)
            }}
            onNew={() => {
              setEditingRobot(null)
              setRobotForm({
                robotKey: '',
                name: '',
                description: '',
                minPlan: 'free',
                strategyType: 'prompt_nl',
                strategyPrompt: '',
                builtinStrategy: 'scalper_pro',
                symbols: 'BTCUSDT, ETHUSDT, SOLUSDT',
                timeframe: '5m',
                exchanges: ['binance', 'bybit'],
                winRateTarget: 88,
                maxLeverage: 10,
                riskPerTradePct: 2,
                stopLossPct: 1.5,
                takeProfitPct: 3.0,
                isActive: true,
              })
              setTestPromptResult(null)
              setShowRobotModal(true)
            }}
          />
        )}
        {tab === 'trades' && <TradesTable trades={trades} status={tradeStatus} setStatus={setTradeStatus} />}
        {tab === 'logs' && <LogsView logs={logs} />}
        {tab === 'referrals' && (
          <ReferralsView
            refSettings={refSettings}
            setRefSettings={setRefSettings}
            onSubmit={handleSaveReferrals}
            saving={refSaving}
            msg={refMsg}
          />
        )}
      </div>

      {showRobotModal && (
        <RobotEditModal
          editingRobot={editingRobot}
          robotForm={robotForm}
          setRobotForm={setRobotForm}
          onClose={() => setShowRobotModal(false)}
          onSave={handleSaveRobot}
          saving={catalogSaving}
          onTestPrompt={handleTestPrompt}
          testLoading={testPromptLoading}
          testResult={testPromptResult}
        />
      )}
    </BnPage>
  )
}

function AccountsTable({ accounts }) {
  return (
    <BnCard>
      <SectionHead title={`Comptes Binance connectés (${accounts.length})`} />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <Thead cols={['Utilisateur', 'Label', 'Marché', 'Env.', 'Spot USDT', 'Futures USDT', 'Permissions', 'Statut', 'Connecté']} rights={[4, 5]} />
          <tbody>
            {accounts.length === 0 && <EmptyRow span={9} />}
            {accounts.map(a => (
              <Row key={a._id}>
                <Td>
                  <div className="font-medium" style={{ color: BN.text }}>{a.user ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim() || a.user.email : '—'}</div>
                  <div className="text-[11px]" style={{ color: BN.sub }}>{a.user?.email}</div>
                </Td>
                <Td style={{ color: BN.text }}>{a.label}</Td>
                <Td><BnBadge color={BN.sub}>{a.market}</BnBadge></Td>
                <Td>{a.isTestnet ? <BnBadge color={BN.yellow}>Testnet</BnBadge> : <BnBadge color={BN.green}>Live</BnBadge>}</Td>
                <Td right style={{ color: BN.text }}>{fmtUSD(a.spotUSDT)}</Td>
                <Td right style={{ color: BN.text }}>{fmtUSD(a.futuresUSDT)}</Td>
                <Td>
                  <div className="flex gap-1 flex-wrap items-center">
                    {a.permissions?.spot && <BnBadge color={BN.green}>spot</BnBadge>}
                    {a.permissions?.futures && <BnBadge color={BN.green}>futures</BnBadge>}
                    {a.permissions?.withdraw
                      ? <BnBadge color={BN.red}>withdraw!</BnBadge>
                      : <ShieldCheck className="h-3.5 w-3.5" style={{ color: BN.green }} />}
                  </div>
                </Td>
                <Td><BnBadge color={a.status === 'active' ? BN.green : BN.sub}>{a.status}</BnBadge></Td>
                <Td className="text-[11px]" style={{ color: BN.sub }}>{a.connectedAt ? new Date(a.connectedAt).toLocaleDateString('fr-FR') : '—'}</Td>
              </Row>
            ))}
          </tbody>
        </table>
      </div>
    </BnCard>
  )
}

function RobotsTable({ robots }) {
  return (
    <BnCard>
      <SectionHead title="Performance par robot" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <Thead cols={['Robot', 'Tier', 'Marchés', 'Sessions actives', 'Trades', 'Win rate', 'P&L', 'Volume']} rights={[3, 4, 5, 6, 7]} />
          <tbody>
            {robots.map(r => (
              <Row key={r.robotKey}>
                <Td className="font-medium" style={{ color: BN.text }}>{r.name}</Td>
                <Td><BnBadge color={BN.yellow}>{r.tier}</BnBadge></Td>
                <Td className="text-[11px]" style={{ color: BN.sub }}>{(r.markets || []).join(', ') || '—'}</Td>
                <Td right style={{ color: BN.text }}>{r.activeSessions}</Td>
                <Td right style={{ color: BN.text }}>{r.trades}</Td>
                <Td right style={{ color: BN.text }}>{r.winRate}%</Td>
                <Td right style={{ color: pnlColor(r.pnl) }}>{fmtUSD(r.pnl)}</Td>
                <Td right style={{ color: BN.sub }}>{fmtUSD(r.volume)}</Td>
              </Row>
            ))}
          </tbody>
        </table>
      </div>
    </BnCard>
  )
}

function TradesTable({ trades, status, setStatus }) {
  return (
    <BnCard>
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${BN.border}` }}>
        <h3 className="text-sm font-semibold" style={{ color: BN.text }}>Trades ({trades.length})</h3>
        <div className="flex gap-1">
          {['', 'open', 'closed', 'error'].map(s => (
            <button key={s} onClick={() => setStatus(s)} className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
              style={{ border: `1px solid ${status === s ? BN.yellow : BN.border}`, background: status === s ? BN.yellow : 'transparent', color: status === s ? '#0B0E11' : BN.sub }}>
              {s === '' ? 'Tous' : s}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <Thead cols={['Date', 'User', 'Robot', 'Paire', 'Sens', 'Marché', 'Qté', 'Entrée', 'Sortie', 'P&L', 'Statut']} rights={[6, 7, 8, 9]} />
          <tbody>
            {trades.length === 0 && <EmptyRow span={11} />}
            {trades.map(t => (
              <Row key={t._id}>
                <Td className="text-[11px] whitespace-nowrap" style={{ color: BN.sub }}>{new Date(t.openedAt).toLocaleString('fr-FR')}</Td>
                <Td className="text-[11px]" style={{ color: BN.text }}>{t.user?.email || '—'}</Td>
                <Td className="text-[11px]" style={{ color: BN.sub }}>{t.robotKey}</Td>
                <Td className="font-mono font-semibold" style={{ color: BN.yellow }}>{t.symbol}</Td>
                <Td><BnBadge color={t.side === 'BUY' ? BN.green : BN.red}>{t.side}</BnBadge></Td>
                <Td className="capitalize text-[11px]" style={{ color: BN.sub }}>{t.market}</Td>
                <Td right style={{ color: BN.text }}>{t.qty}</Td>
                <Td right style={{ color: BN.text }}>{t.entryPrice ?? '—'}</Td>
                <Td right style={{ color: BN.text }}>{t.exitPrice ?? '—'}</Td>
                <Td right style={{ color: pnlColor(t.pnl) }}>{t.status === 'closed' ? fmtUSD(t.pnl) : '—'}</Td>
                <Td><BnBadge color={t.status === 'open' ? BN.green : t.status === 'closed' ? BN.sub : BN.red}>{t.status}</BnBadge></Td>
              </Row>
            ))}
          </tbody>
        </table>
      </div>
    </BnCard>
  )
}

function LogsView({ logs }) {
  return (
    <BnCard>
      <SectionHead title="Journal robots · temps réel" />
      <div className="font-mono text-[10px] max-h-[28rem] overflow-y-auto p-3 space-y-0.5" style={{ background: '#0B0E11' }}>
        {logs.length === 0 ? <p style={{ color: BN.sub }}>Aucun log.</p>
          : logs.map((l) => (
            <div key={l._id} className="leading-relaxed">
              <span style={{ color: BN.sub }}>[{new Date(l.createdAt).toLocaleTimeString('fr-FR')}]</span>{' '}
              <span style={{ color: l.level === 'error' ? BN.red : l.level === 'warn' ? BN.yellow : '#5b8def' }}>[{l.level}]</span>{' '}
              {l.event && <span style={{ color: BN.green }}>{l.event}</span>}{' '}
              <span style={{ color: BN.sub }}>{l.user?.email || ''}</span>{' '}
              <span style={{ color: BN.text }}>{l.message}</span>
            </div>
          ))}
      </div>
    </BnCard>
  )
}

// ── primitives table ──
function SectionHead({ title }) {
  return <div className="p-4" style={{ borderBottom: `1px solid ${BN.border}` }}><h3 className="text-sm font-semibold" style={{ color: BN.text }}>{title}</h3></div>
}
function Thead({ cols, rights = [] }) {
  return (
    <thead className="text-[11px] uppercase" style={{ color: BN.sub, borderBottom: `1px solid ${BN.border}` }}>
      <tr>{cols.map((c, i) => <th key={c} className={`px-3 py-2 font-semibold ${rights.includes(i) ? 'text-right' : 'text-left'}`}>{c}</th>)}</tr>
    </thead>
  )
}
function Row({ children }) {
  return <tr style={{ borderBottom: `1px solid ${BN.border}88` }}>{children}</tr>
}
function Td({ children, right, className = '', style }) {
  return <td className={`px-3 py-2 ${right ? 'text-right' : ''} ${className}`} style={style}>{children}</td>
}
function EmptyRow({ span }) {
  return <tr><td colSpan={span} className="text-center py-8" style={{ color: BN.sub }}>Aucune donnée.</td></tr>
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <BnCard>
      <div className="p-3 flex items-center gap-3">
        <Icon className="h-7 w-7" style={{ color }} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-semibold truncate" style={{ color: BN.sub }}>{label}</p>
          <p className="font-bold text-base truncate" style={{ color }}>{value}</p>
        </div>
      </div>
    </BnCard>
  )
}

function ReferralsView({ refSettings, setRefSettings, onSubmit, saving, msg }) {
  return (
    <BnCard>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
          <div>
            <h3 className="text-base font-semibold" style={{ color: BN.text }}>Configuration des Liens de Parrainage (Binance &amp; Bybit)</h3>
            <p className="text-xs" style={{ color: BN.sub }}>Ces liens et codes de parrainage sont fournis aux utilisateurs pour s'inscrire et débloquer automatiquement l'accès gratuit.</p>
          </div>
        </div>

        {msg && (
          <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ background: `${BN.green}1A`, color: BN.green }}>
            <Check className="h-4 w-4" /> {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Binance */}
          <div className="p-4 rounded-xl space-y-3" style={{ background: BN.surface2, border: `1px solid ${BN.border}` }}>
            <div className="flex items-center gap-2">
              <BinanceLogo size={20} />
              <h4 className="font-semibold text-sm" style={{ color: BN.yellow }}>Programme Affiliation Binance</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Lien de parrainage Binance</label>
                <input
                  type="url"
                  value={refSettings.binanceReferralLink}
                  onChange={e => setRefSettings({ ...refSettings, binanceReferralLink: e.target.value })}
                  placeholder="https://accounts.binance.com/register?ref=..."
                  className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                  style={{ background: BN.surface, color: BN.text, border: `1px solid ${BN.border}` }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Code Referral / ID Binance</label>
                <input
                  type="text"
                  value={refSettings.binanceAffiliateCode}
                  onChange={e => setRefSettings({ ...refSettings, binanceAffiliateCode: e.target.value })}
                  placeholder="ex: 12345678"
                  className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                  style={{ background: BN.surface, color: BN.text, border: `1px solid ${BN.border}` }}
                />
              </div>
            </div>
          </div>

          {/* Bybit */}
          <div className="p-4 rounded-xl space-y-3" style={{ background: BN.surface2, border: `1px solid ${BN.border}` }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded font-black text-xs flex items-center justify-center" style={{ background: '#F7A600', color: '#000' }}>BY</div>
              <h4 className="font-semibold text-sm" style={{ color: '#F7A600' }}>Programme Affiliation Bybit (Crypto + Forex)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Lien de parrainage Bybit</label>
                <input
                  type="url"
                  value={refSettings.bybitReferralLink}
                  onChange={e => setRefSettings({ ...refSettings, bybitReferralLink: e.target.value })}
                  placeholder="https://partner.bybit.com/b/..."
                  className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                  style={{ background: BN.surface, color: BN.text, border: `1px solid ${BN.border}` }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Affiliate ID / Code Bybit</label>
                <input
                  type="text"
                  value={refSettings.bybitAffiliateCode}
                  onChange={e => setRefSettings({ ...refSettings, bybitAffiliateCode: e.target.value })}
                  placeholder="ex: BYBIT_PARTNER_CODE"
                  className="w-full h-10 px-3 rounded-lg text-sm outline-none"
                  style={{ background: BN.surface, color: BN.text, border: `1px solid ${BN.border}` }}
                />
              </div>
            </div>
          </div>

          <BnButton type="submit" variant="primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer les liens de parrainage
          </BnButton>
        </form>
      </div>
    </BnCard>
  )
}

function CryptoCatalogView({ catalog, onToggle, onDelete, onResetDefaults, onEdit, onNew }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: BN.text }}>
            <Bot className="h-5 w-5" style={{ color: BN.yellow }} />
            Catalogue &amp; Moteur des Stratégies Crypto (Binance &amp; Bybit)
          </h2>
          <p className="text-xs" style={{ color: BN.sub }}>
            Robots unifiés tradant sur les comptes Binance et Bybit. Modifiez les stratégies en direct, compilez des descriptions en langage naturel ou utilisez nos algorithmes institutionnels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <BnButton variant="dark" onClick={onResetDefaults} title="Restaurer les stratégies institutionnelles par défaut">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Défauts Institutionnels (&gt;85%)
          </BnButton>
          <BnButton variant="primary" onClick={onNew}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Créer un Robot IA
          </BnButton>
        </div>
      </div>

      <BnCard>
        <SectionHead title={`Robots Déployés dans le Catalogue (${catalog.length})`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <Thead cols={['Robot / Clé', 'Type Stratégie', 'Marchés', 'Paires & TF', 'Win Rate Cible', 'Plan Min.', 'Statut', 'Actions']} rights={[4, 7]} />
            <tbody>
              {catalog.length === 0 && <EmptyRow span={8} />}
              {catalog.map((r) => (
                <Row key={r._id || r.robotKey}>
                  <Td>
                    <div className="font-semibold flex items-center gap-1.5" style={{ color: BN.text }}>
                      <span>{r.name}</span>
                    </div>
                    <div className="font-mono text-[11px]" style={{ color: BN.sub }}>{r.robotKey}</div>
                    {r.description && <div className="text-[11px] truncate max-w-xs mt-0.5" style={{ color: BN.sub }}>{r.description}</div>}
                  </Td>

                  <Td>
                    {r.strategyType === 'prompt_nl' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1 w-fit">
                        <Sparkles className="h-3 w-3" /> IA Langage Naturel
                      </span>
                    ) : r.strategyType === 'builtin' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                        <Sliders className="h-3 w-3" /> Institutionnel ({r.builtinStrategy || 'algo'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center gap-1 w-fit">
                        <Code className="h-3 w-3" /> Règles
                      </span>
                    )}
                  </Td>

                  <Td>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">Binance</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">Bybit</span>
                    </div>
                  </Td>

                  <Td>
                    <div className="font-mono text-[11px] font-semibold" style={{ color: BN.yellow }}>
                      {(r.symbols || []).slice(0, 3).join(', ')}{(r.symbols || []).length > 3 ? ` +${r.symbols.length - 3}` : ''}
                    </div>
                    <div className="text-[10px]" style={{ color: BN.sub }}>TF: {r.timeframe || '5m'} · Lev: {r.maxLeverage || 10}x</div>
                  </Td>

                  <Td right>
                    <span className="font-bold text-sm" style={{ color: BN.green }}>{r.winRateTarget || 85}%</span>
                  </Td>

                  <Td>
                    <BnBadge color={BN.sub}>{r.minPlan || 'free'}</BnBadge>
                  </Td>

                  <Td>
                    <button
                      type="button"
                      onClick={() => onToggle(r._id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                        r.isActive !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {r.isActive !== false ? '🟢 ACTIF' : '🔴 INACTIF'}
                    </button>
                  </Td>

                  <Td right>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(r)}
                        className="p-1 rounded text-xs transition"
                        style={{ color: BN.sub, border: `1px solid ${BN.border}` }}
                        title="Modifier le robot"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(r._id)}
                        className="p-1 rounded text-xs transition text-rose-400 hover:text-rose-300"
                        style={{ border: `1px solid ${BN.border}` }}
                        title="Supprimer le robot"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Td>
                </Row>
              ))}
            </tbody>
          </table>
        </div>
      </BnCard>
    </div>
  )
}

function RobotEditModal({
  editingRobot,
  robotForm,
  setRobotForm,
  onClose,
  onSave,
  saving,
  onTestPrompt,
  testLoading,
  testResult,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-2xl p-6 space-y-4 shadow-2xl my-8 text-sm"
        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
      >
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" style={{ color: BN.yellow }} />
            <h3 className="text-base font-bold" style={{ color: BN.text }}>
              {editingRobot ? `Modifier "${editingRobot.name}"` : 'Créer un Nouveau Robot Crypto & Stratégie IA'}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ color: BN.sub }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          {/* Ligne 1 : Nom & Clé */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Nom du Robot *</label>
              <input
                required
                type="text"
                value={robotForm.name}
                onChange={e => setRobotForm({ ...robotForm, name: e.target.value })}
                placeholder="ex: ICT Liquidity Sniper"
                className="w-full h-9 px-3 rounded-lg text-xs outline-none"
                style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Clé / Slug Unique *</label>
              <input
                required
                type="text"
                value={robotForm.robotKey}
                disabled={!!editingRobot}
                onChange={e => setRobotForm({ ...robotForm, robotKey: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="ex: ict_liquidity_sniper"
                className="w-full h-9 px-3 rounded-lg text-xs outline-none font-mono"
                style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Description du Robot</label>
            <input
              type="text"
              value={robotForm.description}
              onChange={e => setRobotForm({ ...robotForm, description: e.target.value })}
              placeholder="ex: Détection des sweeps de liquidité ICT et entrées sniper avec confirmation EMA."
              className="w-full h-9 px-3 rounded-lg text-xs outline-none"
              style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}
            />
          </div>

          {/* Type de Stratégie */}
          <div className="p-3.5 rounded-xl space-y-3" style={{ background: BN.surface2, border: `1px solid ${BN.border}` }}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: BN.yellow }}>
                Moteur de Stratégie Algorithmique
              </label>
              <span className="text-[11px]" style={{ color: BN.sub }}>Appliqué sur Binance &amp; Bybit</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Type de moteur</label>
                <select
                  value={robotForm.strategyType}
                  onChange={e => setRobotForm({ ...robotForm, strategyType: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg text-xs outline-none"
                  style={{ background: BN.surface, color: BN.text, border: `1px solid ${BN.border}` }}
                >
                  <option value="prompt_nl">🤖 Stratégie Rédigée en Langage Naturel (IA / Compilateur)</option>
                  <option value="builtin">⚡ Moteur Institutionnel Intégré</option>
                  <option value="rule_based">📊 Règle d'Indicateurs Directs</option>
                </select>
              </div>

              {robotForm.strategyType === 'builtin' && (
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Algorithme Institutionnel</label>
                  <select
                    value={robotForm.builtinStrategy}
                    onChange={e => setRobotForm({ ...robotForm, builtinStrategy: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg text-xs outline-none"
                    style={{ background: BN.surface, color: BN.text, border: `1px solid ${BN.border}` }}
                  >
                    <option value="scalper_pro">Scalper Pro (EMA Crossover + RSI Filtre)</option>
                    <option value="trend_master">Trend Master (Multi-EMA 9/21/50 + MACD)</option>
                    <option value="bb_squeeze">Bollinger Bands Squeeze (Breakout Volatilité)</option>
                    <option value="vwap_reversion">VWAP Mean Reversion (Retour à la Moyenne)</option>
                    <option value="smc_liquidity">Smart Money Concepts / ICT (Sweeps &amp; FVG)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Zone Prompt en Langage Naturel */}
            {robotForm.strategyType === 'prompt_nl' && (
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: `${BN.border}88` }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ color: BN.sub }}>
                    Décrivez la logique de trading (indicateurs, conditions d'achat et de vente) :
                  </label>
                  <button
                    type="button"
                    onClick={onTestPrompt}
                    disabled={testLoading || !robotForm.strategyPrompt}
                    className="px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1.5"
                    style={{ background: `${BN.yellow}26`, color: BN.yellow, border: `1px solid ${BN.yellow}4D` }}
                  >
                    {testLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    Tester &amp; Compiler
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={robotForm.strategyPrompt}
                  onChange={e => setRobotForm({ ...robotForm, strategyPrompt: e.target.value })}
                  placeholder="Ex: Acheter quand RSI(14) est inférieur à 30 et EMA(9) croise au-dessus de EMA(21). Vendre quand RSI dépasse 70 ou lorsque le Take Profit de 3% est atteint."
                  className="w-full p-2.5 rounded-lg text-xs outline-none font-mono"
                  style={{ background: BN.surface, color: BN.text, border: `1px solid ${BN.border}` }}
                />

                {testResult && (
                  <div className="p-3 rounded-lg space-y-1.5 text-xs font-mono" style={{ background: '#0B0E11', border: `1px solid ${BN.border}` }}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold" style={{ color: BN.green }}>✓ Compilation réussie</span>
                      <span style={{ color: BN.sub }}>Signal Test : <strong style={{ color: BN.yellow }}>{testResult.testSignal || 'HOLD'}</strong></span>
                    </div>
                    <div className="text-[11px]" style={{ color: BN.sub }}>
                      Indicateurs détectés : {testResult.analysis?.indicatorsDetected?.join(', ') || 'RSI, EMA'}
                    </div>
                    <div className="text-[11px]" style={{ color: BN.sub }}>
                      Règles : {testResult.analysis?.ruleSummary || 'Logique validée'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Paires, Timeframe & Paramètres de Risque */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Symboles Cibles (séparés par virgule)</label>
              <input
                type="text"
                value={robotForm.symbols}
                onChange={e => setRobotForm({ ...robotForm, symbols: e.target.value })}
                placeholder="BTCUSDT, ETHUSDT, SOLUSDT"
                className="w-full h-9 px-3 rounded-lg text-xs outline-none font-mono"
                style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}
              />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Timeframe</label>
              <select
                value={robotForm.timeframe}
                onChange={e => setRobotForm({ ...robotForm, timeframe: e.target.value })}
                className="w-full h-9 px-2 rounded-lg text-xs outline-none"
                style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}
              >
                <option value="1m">1m (Scalping)</option>
                <option value="3m">3m</option>
                <option value="5m">5m (Optimal)</option>
                <option value="15m">15m (Day Trading)</option>
                <option value="1h">1h (Swing)</option>
                <option value="4h">4h (Trend)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Plan Requis</label>
              <select
                value={robotForm.minPlan}
                onChange={e => setRobotForm({ ...robotForm, minPlan: e.target.value })}
                className="w-full h-9 px-2 rounded-lg text-xs outline-none"
                style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}
              >
                <option value="free">free (Accessible à tous)</option>
                <option value="crypto-trader">crypto-trader</option>
                <option value="vip">vip (VIP Trader)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Win Rate Cible (%)</label>
              <input
                type="number"
                min="50"
                max="99"
                value={robotForm.winRateTarget}
                onChange={e => setRobotForm({ ...robotForm, winRateTarget: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg text-xs outline-none"
                style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}
              />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Stop Loss (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.2"
                value={robotForm.stopLossPct}
                onChange={e => setRobotForm({ ...robotForm, stopLossPct: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg text-xs outline-none"
                style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}
              />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Take Profit (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={robotForm.takeProfitPct}
                onChange={e => setRobotForm({ ...robotForm, takeProfitPct: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg text-xs outline-none"
                style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}
              />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: BN.sub }}>Levier Max</label>
              <input
                type="number"
                min="1"
                max="50"
                value={robotForm.maxLeverage}
                onChange={e => setRobotForm({ ...robotForm, maxLeverage: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-lg text-xs outline-none"
                style={{ background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={robotForm.isActive !== false}
                onChange={e => setRobotForm({ ...robotForm, isActive: e.target.checked })}
              />
              <span className="font-semibold" style={{ color: BN.text }}>Robot actif et disponible aux traders</span>
            </label>
          </div>

          <div className="flex gap-2 pt-3" style={{ borderTop: `1px solid ${BN.border}` }}>
            <BnButton type="button" variant="dark" onClick={onClose} className="w-1/2">
              Annuler
            </BnButton>
            <BnButton type="submit" variant="primary" disabled={saving} className="w-1/2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingRobot ? 'Mettre à jour le Robot' : 'Enregistrer et Déployer'}
            </BnButton>
          </div>
        </form>
      </div>
    </div>
  )
}
