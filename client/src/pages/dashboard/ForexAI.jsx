import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { forexAPI } from '../../lib/api'
import {
  Brain, TrendingUp, TrendingDown, Target, Loader2, RefreshCw, Activity,
  Zap, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight, Sparkles, BarChart3,
  Eye, Crosshair, Layers, GitBranch, Waves, AlertCircle, Award
} from 'lucide-react'

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d']
const TF_LABELS = { '1m': 'M1', '5m': 'M5', '15m': 'M15', '1h': 'H1', '4h': 'H4', '1d': 'D1' }

// TradingView symbol mapping
const tvSymbol = (s) => {
  const x = s.toUpperCase()
  if (x === 'XAUUSD') return 'OANDA:XAUUSD'
  if (x === 'XAGUSD') return 'OANDA:XAGUSD'
  if (x === 'BTCUSD') return 'BINANCE:BTCUSDT'
  if (x === 'ETHUSD') return 'BINANCE:ETHUSDT'
  if (/^[A-Z]{6}$/.test(x)) return `FX:${x}`
  return x
}
const tvInterval = (tf) => ({ '1m': '1', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D' }[tf] || '60')

// TradingView Advanced Chart widget
function TradingViewChart({ symbol, timeframe }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''
    const id = `tv_${Math.random().toString(36).slice(2)}`
    const container = document.createElement('div')
    container.id = id
    container.style.height = '500px'
    ref.current.appendChild(container)

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          symbol: tvSymbol(symbol),
          interval: tvInterval(timeframe),
          container_id: id,
          autosize: true,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          style: '1',
          locale: 'fr',
          toolbar_bg: '#1e293b',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
        })
      }
    }
    document.body.appendChild(script)
    return () => { try { document.body.removeChild(script) } catch {} }
  }, [symbol, timeframe])
  return <div ref={ref} className="w-full" style={{ minHeight: 500 }} />
}

const SIGNAL_COLORS = {
  buy:  { bg: 'bg-green-500/10 border-green-500/40', text: 'text-green-500', label: 'ACHAT' },
  sell: { bg: 'bg-red-500/10 border-red-500/40',     text: 'text-red-500',   label: 'VENTE' },
  wait: { bg: 'bg-amber-500/10 border-amber-500/40', text: 'text-amber-500', label: 'ATTENDRE' },
}
const TREND_COLORS = {
  bullish: 'text-green-500', bearish: 'text-red-500', ranging: 'text-amber-500',
}

export default function ForexAI() {
  const [symbols, setSymbols] = useState([])
  const [symbol, setSymbol] = useState('EURUSD')
  const [timeframe, setTimeframe] = useState('1h')
  const [strategies, setStrategies] = useState([])
  const [strategy, setStrategy] = useState('smc')
  const [analysis, setAnalysis] = useState(null)
  const [mtfResults, setMtfResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [quota, setQuota] = useState(null)
  const [quotaError, setQuotaError] = useState(null)

  const loadSymbols = async () => {
    const { data } = await forexAPI.symbols()
    setSymbols(data.symbols || [])
  }

  const loadStrategies = async () => {
    try {
      const { data } = await forexAPI.strategies()
      setStrategies(data.strategies || [])
    } catch (err) { console.error(err) }
  }

  const loadAnalysis = async (fresh = false) => {
    setLoading(true)
    setQuotaError(null)
    try {
      const [{ data: single }, { data: mtf }] = await Promise.all([
        forexAPI.analyze({ symbol, timeframe, strategy, fresh: fresh ? 1 : 0 }),
        forexAPI.analyzeMTF({ symbol, timeframes: '5m,15m,1h,4h,1d', strategy }),
      ])
      setAnalysis(single.analysis)
      setMtfResults(mtf.results || {})
      if (single.quota) setQuota(single.quota)
    } catch (err) {
      if (err?.response?.status === 403) {
        setQuotaError(err.response.data?.error || 'Quota atteint.')
      } else {
        console.error(err)
      }
    } finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { loadSymbols(); loadStrategies() }, [])
  useEffect(() => { loadAnalysis() }, [symbol, timeframe, strategy])

  const a = analysis || {}
  const sigInfo = SIGNAL_COLORS[a.signal] || SIGNAL_COLORS.wait
  const activeStrat = strategies.find(s => s.key === strategy)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-violet-500" /> IA Forex
            <Badge variant="outline" className="text-[10px] ml-1">Multi-stratégies</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Analyse à la demande · paire · timeframe · stratégie au choix</p>
        </div>
        <div className="flex items-center gap-3">
          {quota && quota.limit !== -1 && (
            <Badge variant="outline" className="text-[10px]">
              Analyses restantes : {quota.remaining}/{quota.limit}
            </Badge>
          )}
          <Button variant="outline" onClick={() => { setRefreshing(true); loadAnalysis(true) }} disabled={loading || refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
        </div>
      </div>

      {/* Strategy selector */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="text-xs font-bold uppercase text-muted-foreground">Stratégie d'analyse</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {strategies.map(s => (
              <button key={s.key} onClick={() => setStrategy(s.key)}
                title={s.description}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all text-left ${
                  strategy === s.key ? 'bg-violet-500 text-white border-violet-500' : 'border-border hover:border-violet-500/40'
                }`}>{s.label}</button>
            ))}
          </div>
          {activeStrat && <p className="text-[11px] text-muted-foreground mt-2">{activeStrat.description}</p>}
        </CardContent>
      </Card>

      {quotaError && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-500">Quota d'analyses IA atteint</p>
              <p className="text-xs text-muted-foreground">{quotaError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Symbol + TF selectors */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex gap-1 flex-wrap">
              {symbols.map(s => (
                <button key={s} onClick={() => setSymbol(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    symbol === s ? 'bg-violet-500 text-white border-violet-500' : 'border-border hover:border-violet-500/40'
                  }`}>{s}</button>
              ))}
            </div>
            <div className="ml-auto flex gap-1">
              {TIMEFRAMES.map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    timeframe === tf ? 'bg-violet-500 text-white border-violet-500' : 'border-border hover:border-violet-500/40'
                  }`}>{TF_LABELS[tf] || tf}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TradingView Chart */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Graphique TradingView — {symbol} · {TF_LABELS[timeframe]}
                </span>
                {a.lastPrice && <span className="font-mono">{a.lastPrice}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <TradingViewChart symbol={symbol} timeframe={timeframe} />
            </CardContent>
          </Card>

          {/* Multi-TF panel */}
          <MTFPanel results={mtfResults} active={timeframe} onPick={setTimeframe} />
        </div>

        {/* AI Panel */}
        <div className="space-y-4">
          {loading && !analysis ? (
            <Card><CardContent className="py-20 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-violet-500" /></CardContent></Card>
          ) : analysis ? (
            <>
              {/* Signal card */}
              <Card className={`border-2 ${sigInfo.bg}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Signal IA</p>
                      <p className={`text-3xl font-black ${sigInfo.text}`}>{sigInfo.label}</p>
                    </div>
                    {a.signal === 'buy' && <ArrowUpRight className="h-12 w-12 text-green-500" />}
                    {a.signal === 'sell' && <ArrowDownRight className="h-12 w-12 text-red-500" />}
                    {a.signal === 'wait' && <AlertCircle className="h-12 w-12 text-amber-500" />}
                  </div>
                  <ConfidenceBar label="Confiance IA" value={a.confidence} color={sigInfo.text} />
                  <ConfidenceBar label="Probabilité" value={a.probability} color={sigInfo.text} />
                  {a.entry && (
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-current/20 text-xs">
                      <Stat label="Entrée" value={a.entry} />
                      <Stat label="R:R" value={a.riskReward ? `1:${a.riskReward}` : '—'} />
                      <Stat label="Stop Loss" value={a.stopLoss} color="text-red-500" />
                      <Stat label="TP1" value={a.takeProfit1} color="text-green-500" />
                      <Stat label="TP2" value={a.takeProfit2} color="text-green-500" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trend & Bias */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-violet-500" /> Structure de marché</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <Row label="Tendance" value={a.trend} valueClass={TREND_COLORS[a.trend]} bold />
                  <Row label="Force tendance" value={`${a.trendStrength}%`} />
                  <Row label="Bias IA" value={a.bias} valueClass={a.bias === 'long' ? 'text-green-500' : a.bias === 'short' ? 'text-red-500' : ''} />
                  <Row label="Alignement HTF" value={`${a.htfAlignment > 0 ? '+' : ''}${a.htfAlignment || 0}`}
                    valueClass={a.htfAlignment > 30 ? 'text-green-500' : a.htfAlignment < -30 ? 'text-red-500' : 'text-amber-500'} />
                </CardContent>
              </Card>

              {/* Indicators */}
              {a.indicators && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-500" /> Indicateurs</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-xs">
                    <Stat label="EMA 9" value={a.indicators.emaFast ?? '—'} />
                    <Stat label="EMA 50" value={a.indicators.emaMid ?? '—'} />
                    <Stat label="EMA 200" value={a.indicators.emaSlow ?? '—'} />
                    <Stat label="RSI 14" value={a.indicators.rsi ?? '—'}
                      color={a.indicators.rsi > 70 ? 'text-red-500' : a.indicators.rsi < 30 ? 'text-green-500' : ''} />
                    <Stat label="ATR" value={a.indicators.atr ?? '—'} />
                  </CardContent>
                </Card>
              )}

              {/* AI Summary */}
              <Card className="border-violet-500/30 bg-violet-500/5">
                <CardContent className="p-4">
                  <p className="text-[10px] uppercase font-bold text-violet-500 mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Résumé IA</p>
                  <p className="text-xs leading-relaxed">{a.aiSummary}</p>
                </CardContent>
              </Card>

              {/* Reasons */}
              <ReasonsCard reasons={a.reasonsBullish} type="bull" />
              <ReasonsCard reasons={a.reasonsBearish} type="bear" />

              {/* Scenarios */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4 text-blue-500" /> Scénarios</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    <p className="font-bold text-green-500 mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Scénario haussier</p>
                    <p className="text-muted-foreground leading-relaxed">{a.scenarioBullish}</p>
                  </div>
                  <div>
                    <p className="font-bold text-red-500 mb-1 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Scénario baissier</p>
                    <p className="text-muted-foreground leading-relaxed">{a.scenarioBearish}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>

      {/* Detected patterns */}
      {analysis && <PatternsGrid a={analysis} />}
    </div>
  )
}

function ConfidenceBar({ label, value, color }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-muted-foreground uppercase font-semibold">{label}</span>
        <span className={`font-bold ${color}`}>{value}%</span>
      </div>
      <div className="h-1.5 bg-current/10 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${color.replace('text-', 'bg-')}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function Stat({ label, value, color = '' }) {
  return <div><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className={`font-bold font-mono ${color}`}>{value}</p></div>
}

function Row({ label, value, valueClass = '', bold = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${bold ? 'font-bold' : ''} ${valueClass} capitalize`}>{value}</span>
    </div>
  )
}

function ReasonsCard({ reasons, type }) {
  if (!reasons?.length) return null
  const config = type === 'bull'
    ? { color: 'text-green-500', border: 'border-green-500/30', icon: TrendingUp, title: 'Pourquoi acheter' }
    : { color: 'text-red-500',   border: 'border-red-500/30',   icon: TrendingDown, title: 'Pourquoi vendre' }
  const Icon = config.icon
  return (
    <Card className={`${config.border}`}>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className={`h-4 w-4 ${config.color}`} /> {config.title}</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {reasons.map((r, i) => (
            <li key={i} className="text-xs flex gap-2 items-start">
              <CheckCircle2 className={`h-3 w-3 ${config.color} shrink-0 mt-0.5`} />
              <span className="text-muted-foreground">{r}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function MTFPanel({ results, active, onPick }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Layers className="h-4 w-4 text-blue-500" /> Analyse Multi-Timeframe</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {['5m', '15m', '1h', '4h', '1d'].map(tf => {
            const r = results[tf]
            return (
              <button key={tf} onClick={() => onPick(tf)}
                className={`p-3 rounded-lg border text-left transition-all ${active === tf ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">{TF_LABELS[tf]}</span>
                  {r && <Badge variant="outline" className={`text-[9px] border ${
                    r.signal === 'buy' ? 'border-green-500/40 text-green-500' :
                    r.signal === 'sell' ? 'border-red-500/40 text-red-500' :
                    'border-amber-500/40 text-amber-500'
                  }`}>{r.signal === 'buy' ? '↑ ACHAT' : r.signal === 'sell' ? '↓ VENTE' : 'ATTENDRE'}</Badge>}
                </div>
                {r ? (
                  <>
                    <p className="text-[10px] text-muted-foreground capitalize">Tendance: <span className={TREND_COLORS[r.trend]}>{r.trend}</span></p>
                    <p className="text-[10px] text-muted-foreground">Confiance: <strong>{r.confidence}%</strong></p>
                  </>
                ) : <p className="text-[10px] text-muted-foreground">Pas de données</p>}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function PatternsGrid({ a }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <PatternBox title="Support" icon={Target} color="text-green-500" items={a.supportLevels || []}
        renderItem={s => `${s.price} (${s.touches} touches · ${s.strength}%)`} />
      <PatternBox title="Résistance" icon={Target} color="text-red-500" items={a.resistanceLevels || []}
        renderItem={r => `${r.price} (${r.touches} touches · ${r.strength}%)`} />
      <PatternBox title="Order Blocks" icon={Crosshair} color="text-violet-500" items={a.orderBlocks || []}
        renderItem={o => `${o.side === 'bullish' ? '🟢' : '🔴'} ${o.bottom}–${o.top} ${o.mitigated ? '(mitigé)' : ''}`} />
      <PatternBox title="Fair Value Gaps" icon={Eye} color="text-blue-500" items={a.fvgs || []}
        renderItem={f => `${f.side === 'bullish' ? '🟢' : '🔴'} ${f.bottom}–${f.top} ${f.mitigated ? '(comblé)' : ''}`} />
      <PatternBox title="Liquidité" icon={Waves} color="text-cyan-500" items={a.liquidityZones || []}
        renderItem={l => `${l.side === 'sell_side' ? '⬆ Sell-side' : '⬇ Buy-side'} @ ${l.price} (${l.touches}x)`} />
      <PatternBox title="BOS / CHoCH" icon={GitBranch} color="text-amber-500" items={[
        ...(a.bos || []).map(b => ({ ...b, kind: 'BOS' })),
        ...(a.choch || []).map(c => ({ ...c, kind: 'CHoCH' })),
      ]}
        renderItem={x => `${x.kind} ${x.side === 'bullish' ? '↑' : '↓'} @ ${x.price}`} />
      <PatternBox title="Breakouts" icon={Zap} color="text-orange-500" items={a.breakouts || []}
        renderItem={b => `${b.fake ? '⚠ Faux' : '✓ Vrai'} ${b.side === 'bullish' ? '↑' : '↓'} @ ${b.price}`} />
    </div>
  )
}

function PatternBox({ title, icon: Icon, color, items, renderItem }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><Icon className={`h-3.5 w-3.5 ${color}`} /> {title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-[10px] text-muted-foreground">Aucun détecté</p> : (
          <ul className="space-y-1 text-[11px] font-mono">
            {items.slice(0, 5).map((it, i) => (
              <li key={i} className="text-muted-foreground">{renderItem(it)}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
