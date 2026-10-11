import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { forexAPI } from '../../lib/api'
import {
  Radar, Loader2, TrendingUp, TrendingDown, Flame, Zap, RefreshCw, Search,
  ArrowUpRight, ArrowDownRight, Brain, ChevronRight, Filter, Clock
} from 'lucide-react'

const TF_LABELS = { '1m': 'M1', '5m': 'M5', '15m': 'M15', '1h': 'H1', '4h': 'H4', '1d': 'D1' }
const TF_ORDER = ['1m', '5m', '15m', '1h', '4h', '1d']

export default function ForexScanner() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [signalFilter, setSignalFilter] = useState('all')
  const [tfFilter, setTfFilter] = useState('all')
  const [minConfidence, setMinConfidence] = useState(60)
  const [lastScan, setLastScan] = useState(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = { limit: 100 }
      if (signalFilter !== 'all') params.signal = signalFilter
      if (minConfidence) params.minConfidence = minConfidence
      const { data } = await forexAPI.scanner(params)
      setResults(data.results || [])
      setLastScan(data.lastScanAt)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [signalFilter, minConfidence])

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [signalFilter, minConfidence])

  const filtered = results.filter(r => {
    if (tfFilter !== 'all' && r.timeframe !== tfFilter) return false
    if (search && !r.symbol.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const buyCount = results.filter(r => r.signal === 'buy').length
  const sellCount = results.filter(r => r.signal === 'sell').length
  const hotCount = results.filter(r => r.confidence >= 80).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radar className="h-6 w-6 text-violet-500" /> Scanner Marché IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Meilleurs setups détectés sur tous les actifs · {lastScan && (
              <>Dernier scan : <Clock className="inline h-3 w-3" /> {new Date(lastScan).toLocaleTimeString('fr-FR')}</>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Signaux Achat" value={buyCount} color="text-green-500" border="border-green-500/30" />
        <StatCard icon={TrendingDown} label="Signaux Vente" value={sellCount} color="text-red-500" border="border-red-500/30" />
        <StatCard icon={Flame} label="Setups chauds" value={hotCount} color="text-orange-500" border="border-orange-500/30" />
        <StatCard icon={Brain} label="Total analyses" value={results.length} color="text-violet-500" border="border-violet-500/30" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher symbole..."
                className="w-full rounded-md border bg-background pl-9 pr-3 py-1.5 text-sm" />
            </div>
            <div className="flex gap-1">
              {['all', 'buy', 'sell', 'wait'].map(s => (
                <button key={s} onClick={() => setSignalFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    signalFilter === s ? 'bg-violet-500 text-white border-violet-500' : 'border-border'
                  }`}>{s === 'all' ? 'Tous' : s === 'buy' ? '↑ Achat' : s === 'sell' ? '↓ Vente' : 'Attendre'}</button>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setTfFilter('all')}
                className={`px-2 py-1.5 rounded-lg text-xs border ${tfFilter === 'all' ? 'bg-violet-500 text-white border-violet-500' : 'border-border'}`}>Tous TF</button>
              {TF_ORDER.map(tf => (
                <button key={tf} onClick={() => setTfFilter(tf)}
                  className={`px-2 py-1.5 rounded-lg text-xs border ${tfFilter === tf ? 'bg-violet-500 text-white border-violet-500' : 'border-border'}`}>
                  {TF_LABELS[tf]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Min conf.</span>
              <input type="range" min="0" max="100" step="5" value={minConfidence}
                onChange={e => setMinConfidence(+e.target.value)} className="w-20" />
              <span className="text-xs font-bold w-8">{minConfidence}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          {loading && !results.length ? <div className="py-12 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-violet-500" /></div>
          : filtered.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Aucun résultat. Ajustez les filtres.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3">Rang</th>
                  <th className="text-left p-3">Symbole</th>
                  <th className="text-center p-3">TF</th>
                  <th className="text-center p-3">Signal</th>
                  <th className="text-center p-3">Confiance</th>
                  <th className="text-center p-3">Prob.</th>
                  <th className="text-center p-3">Tendance</th>
                  <th className="text-right p-3">Entrée</th>
                  <th className="text-right p-3">SL</th>
                  <th className="text-right p-3">TP1</th>
                  <th className="text-center p-3">R:R</th>
                  <th className="text-center p-3"></th>
                </tr></thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={`${r.symbol}-${r.timeframe}`} className="border-b hover:bg-muted/20">
                      <td className="p-3">
                        <span className={`font-bold ${i < 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>#{i + 1}</span>
                        {i < 3 && <Flame className="inline h-3 w-3 ml-1 text-orange-500" />}
                      </td>
                      <td className="p-3 font-bold">{r.symbol}</td>
                      <td className="p-3 text-center"><Badge variant="outline" className="text-[10px]">{TF_LABELS[r.timeframe] || r.timeframe}</Badge></td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] font-bold ${
                          r.signal === 'buy' ? 'bg-green-500/20 text-green-500 border-green-500/40' :
                          r.signal === 'sell' ? 'bg-red-500/20 text-red-500 border-red-500/40' :
                          'bg-amber-500/20 text-amber-500 border-amber-500/40'
                        }`} variant="outline">
                          {r.signal === 'buy' ? '↑ ACHAT' : r.signal === 'sell' ? '↓ VENTE' : 'ATTENDRE'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <ConfidenceBadge value={r.confidence} />
                      </td>
                      <td className="p-3 text-center font-mono">{r.probability}%</td>
                      <td className="p-3 text-center capitalize">
                        <span className={r.trend === 'bullish' ? 'text-green-500' : r.trend === 'bearish' ? 'text-red-500' : 'text-amber-500'}>
                          {r.trend === 'bullish' ? '↑' : r.trend === 'bearish' ? '↓' : '→'} {r.trend}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">{r.entry || '—'}</td>
                      <td className="p-3 text-right font-mono text-red-500">{r.stopLoss || '—'}</td>
                      <td className="p-3 text-right font-mono text-green-500">{r.takeProfit1 || '—'}</td>
                      <td className="p-3 text-center font-bold">{r.riskReward ? `1:${r.riskReward}` : '—'}</td>
                      <td className="p-3 text-center">
                        <Link to={`/dashboard/forex-ai?symbol=${r.symbol}&tf=${r.timeframe}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2"><ChevronRight className="h-3 w-3" /></Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, border }) {
  return (
    <Card className={border}>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-8 w-8 ${color}`} />
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ConfidenceBadge({ value }) {
  const color = value >= 80 ? 'text-orange-500' : value >= 65 ? 'text-violet-500' : 'text-muted-foreground'
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${value >= 80 ? 'bg-orange-500' : value >= 65 ? 'bg-violet-500' : 'bg-muted-foreground'}`}
          style={{ width: `${value}%` }} />
      </div>
      <span className={`font-bold ${color} w-8 text-right`}>{value}%</span>
    </div>
  )
}
