import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { copyTradingAPI } from '../lib/api'
import {
  Trophy, TrendingUp, Users, Shield, Search, Filter, Loader2,
  Crown, Zap, Activity, BarChart3, ArrowUpRight, AlertTriangle,
  CheckCircle2, Star, Flame
} from 'lucide-react'

// ─── Mini equity curve sparkline (pure SVG, no deps) ─────────────────
function Sparkline({ data = [], color = '#10b981', height = 40 }) {
  if (!data.length) return <div className="h-10 bg-muted/20 rounded" />
  const values = data.map(d => typeof d === 'object' ? (d.equity || 0) : d)
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const w = 100, h = height
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const last = values[values.length - 1]
  const first = values[0]
  const positive = last >= first
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill={`url(#grad-${color.replace('#', '')})`}
        points={`0,${h} ${pts} ${w},${h}`} stroke="none" />
      <polyline fill="none" stroke={positive ? '#10b981' : '#ef4444'} strokeWidth="1.5" points={pts} />
    </svg>
  )
}

const RISK_COLORS = {
  low: 'bg-green-500/10 text-green-600 border-green-500/30',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  extreme: 'bg-red-500/10 text-red-600 border-red-500/30',
}

const STYLE_LABELS = { scalper: 'Scalper', day_trader: 'Day Trader', swing: 'Swing', position: 'Position', mixed: 'Polyvalent' }
const RISK_LABELS = { low: 'Faible', medium: 'Modéré', high: 'Élevé', extreme: 'Extrême' }

const AI_FLAG = {
  safe:     { color: 'text-green-500', icon: Shield,         label: 'Sain' },
  warning:  { color: 'text-amber-500', icon: AlertTriangle,  label: 'Attention' },
  danger:   { color: 'text-orange-500', icon: AlertTriangle, label: 'Risque' },
  critical: { color: 'text-red-500',   icon: AlertTriangle,  label: 'Critique' },
}

export default function CopyTrading() {
  const [masters, setMasters] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('roi')
  const [tradingStyle, setTradingStyle] = useState('')
  const [riskLevel, setRiskLevel] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const params = { sort, page, limit: 24 }
      if (tradingStyle) params.tradingStyle = tradingStyle
      if (riskLevel) params.riskLevel = riskLevel
      if (search.trim()) params.search = search.trim()
      const { data } = await copyTradingAPI.getMasters(params)
      setMasters(data.masters || [])
      setPagination(data.pagination || {})
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [sort, tradingStyle, riskLevel, page])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-violet-500/5">
      {/* Hero */}
      <section className="border-b bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Copy Trading IA</h1>
              <p className="text-muted-foreground text-sm md:text-base">Copiez automatiquement les meilleurs traders & robots IA</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {[
              { icon: Users, label: 'Traders', value: pagination.total || 0, color: 'from-violet-500 to-purple-600' },
              { icon: Zap, label: 'Robots IA', value: masters.filter(m => m.sourceType === 'bot').length, color: 'from-blue-500 to-cyan-600' },
              { icon: TrendingUp, label: 'Top ROI', value: masters[0]?.stats?.roi ? `${masters[0].stats.roi.toFixed(1)}%` : '—', color: 'from-green-500 to-emerald-600' },
              { icon: Shield, label: 'IA Protection', value: '24/7', color: 'from-amber-500 to-orange-600' },
            ].map((s, i) => (
              <div key={i} className="bg-card/50 backdrop-blur border rounded-2xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">{s.label}</p>
                  <p className="font-bold text-lg leading-none">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* How it works banner */}
        <Card className="mb-6 border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 flex-wrap md:flex-nowrap">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-bold mb-1">⚡ Copies exécutées en direct sur votre compte Binance</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Connectez votre compte <strong>Binance</strong> via vos clés API (Spot &amp; Futures).
                  Quand un robot master ouvre un trade crypto, la copie s'exécute instantanément sur <strong>votre propre compte Binance</strong>.
                  La plateforme ne détient jamais vos fonds — tout reste chez Binance.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">Binance Spot</Badge>
                <Badge variant="outline" className="text-[10px]">Binance Futures</Badge>
                <Badge variant="outline" className="text-[10px]">BTC · ETH · SOL</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && load()}
                  placeholder="Rechercher un trader..." className="pl-9" />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="px-3 py-2 rounded-md border bg-background text-sm">
                  <option value="roi">📈 ROI</option>
                  <option value="winrate">🎯 Winrate</option>
                  <option value="followers">👥 Copieurs</option>
                  <option value="profit">💰 Profit</option>
                  <option value="drawdown">🛡️ Faible drawdown</option>
                  <option value="recent">🆕 Récents</option>
                </select>
                <select value={tradingStyle} onChange={e => setTradingStyle(e.target.value)}
                  className="px-3 py-2 rounded-md border bg-background text-sm">
                  <option value="">Tous les styles</option>
                  <option value="scalper">Scalper</option>
                  <option value="day_trader">Day Trader</option>
                  <option value="swing">Swing</option>
                  <option value="position">Position</option>
                  <option value="mixed">Polyvalent</option>
                </select>
                <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)}
                  className="px-3 py-2 rounded-md border bg-background text-sm">
                  <option value="">Tous les risques</option>
                  <option value="low">Risque faible</option>
                  <option value="medium">Modéré</option>
                  <option value="high">Élevé</option>
                  <option value="extreme">Extrême</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : masters.length === 0 ? (
          <Card><CardContent className="p-16 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            Aucun trader ne correspond à vos critères.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {masters.map((m, idx) => <MasterCard key={m._id} m={m} rank={(page - 1) * 24 + idx + 1} />)}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              ← Précédent
            </Button>
            <span className="text-sm text-muted-foreground px-3">Page {page} / {pagination.pages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}>
              Suivant →
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Master card ─────────────────────────────────────────────────────────
function MasterCard({ m, rank }) {
  const s = m.stats || {}
  const ai = AI_FLAG[m.aiRisk?.flag || 'safe']
  const AiIcon = ai.icon
  const initials = (m.displayName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
  const positive = (s.totalProfit || 0) >= 0

  return (
    <Link to={`/copy-trading/${m.slug}`} className="block group">
      <Card className="h-full hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                  {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initials}
                </div>
                {m.sourceType === 'bot' && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center">
                    <Zap className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                {m.badges?.includes('verified') && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm truncate group-hover:text-violet-500 transition-colors">{m.displayName}</h3>
                <p className="text-[11px] text-muted-foreground">{m.country || 'International'} · {STYLE_LABELS[m.tradingStyle] || m.tradingStyle}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">{rankBadge}</Badge>
          </div>

          {/* Equity curve */}
          <div className="bg-muted/20 rounded-lg p-2 mb-3">
            <Sparkline data={(m.equityCurve || []).slice(-40)} height={50} />
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase">ROI</p>
              <p className={`text-base font-bold ${(s.roi || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(s.roi || 0) >= 0 ? '+' : ''}{(s.roi || 0).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase">Winrate</p>
              <p className="text-base font-bold">{(s.winRate || 0).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase">Max DD</p>
              <p className="text-base font-bold text-orange-500">{(s.maxDrawdown || 0).toFixed(1)}%</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" /> {m.followersCount || 0}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Activity className="h-3 w-3" /> {s.totalTrades || 0}
              </span>
              <span className={`flex items-center gap-1 ${ai.color}`}>
                <AiIcon className="h-3 w-3" /> {ai.label}
              </span>
            </div>
            <Badge className={`text-[9px] border ${RISK_COLORS[m.riskLevel] || RISK_COLORS.medium}`} variant="outline">
              {RISK_LABELS[m.riskLevel] || m.riskLevel}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
