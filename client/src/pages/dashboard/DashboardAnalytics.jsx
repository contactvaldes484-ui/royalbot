import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { tradeAPI } from '../../lib/api'
import { formatCurrency, formatPercent } from '../../lib/utils'
import {
  BarChart3, TrendingUp, TrendingDown, Target, Loader2, Bot, Zap,
  Bitcoin, Layers, ShieldCheck, PieChart as PieIcon
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts'

const CATEGORIES = [
  { id: 'all', label: 'Toutes les catégories', icon: Layers },
  { id: 'deriv_manual', label: 'Trading Manuel SmartTrader', icon: Zap },
  { id: 'deriv_robot', label: 'Robots Deriv SmartTrader', icon: Bot },
  { id: 'binance', label: 'Robots Binance Crypto', icon: Bitcoin },
  { id: 'bybit', label: 'Robots Bybit Multi-Marchés', icon: Layers },
]

export default function DashboardAnalytics() {
  const [stats, setStats] = useState(null)
  const [byCategory, setByCategory] = useState(null)
  const [dailyProfits, setDailyProfits] = useState([])
  const [period, setPeriod] = useState('30d')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const params = { period }
        if (selectedCategory !== 'all') params.category = selectedCategory

        const { data } = await tradeAPI.getStats(params)
        setStats(data.stats)
        setByCategory(data.byCategory || null)

        if (data.dailyProfits) {
          setDailyProfits(Object.entries(data.dailyProfits).map(([date, profit]) => ({
            date: date.slice(5),
            profit: Number(profit.toFixed(2))
          })))
        }
      } catch (err) {
        console.error('Analytics fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [period, selectedCategory])

  const periods = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7J' },
    { value: '30d', label: '30J' },
    { value: '90d', label: '90J' },
    { value: 'all', label: 'Tout' },
  ]

  const pieData = stats ? [
    { name: 'Wins', value: stats.wins },
    { name: 'Losses', value: stats.losses }
  ] : []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics de Trading</h1>
          <p className="text-muted-foreground text-sm">
            Analysez vos performances de trading par catégorie : Trading Manuel, Robots Deriv SmartTrader, Binance &amp; Bybit.
          </p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* SÉLECTEUR DE CATÉGORIE ANALYTICS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const isActive = selectedCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card hover:bg-accent text-muted-foreground border-border'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Profit Net</p>
            <p className={`text-xl font-bold ${(stats?.totalProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {(stats?.totalProfit || 0) >= 0 ? '+' : ''}{formatCurrency(stats?.totalProfit || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Taux de Réussite</p>
            <p className="text-xl font-bold text-blue-500">{formatPercent(stats?.winRate || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
            <p className="text-xl font-bold">{stats?.totalTrades || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Meilleur Trade</p>
            <p className="text-xl font-bold text-green-500">+{formatCurrency(stats?.bestTrade || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Pire Trade</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(stats?.worstTrade || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* BILAN COMPARATIF PAR CATÉGORIE DE TRADING */}
      {byCategory && selectedCategory === 'all' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Répartition des Performances par Catégorie de Robot &amp; Trading
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Deriv Manuel */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Manuel SmartTrader
                </span>
                <Badge variant="outline" className="text-[10px]">{byCategory.deriv_manual?.totalTrades || 0} trades</Badge>
              </div>
              <div className="flex justify-between items-end pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground">Profit Net</p>
                  <p className={`font-mono text-sm font-bold ${(byCategory.deriv_manual?.profit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(byCategory.deriv_manual?.profit || 0) >= 0 ? '+' : ''}${byCategory.deriv_manual?.profit || 0} USD
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Winrate</p>
                  <p className="font-mono text-sm font-bold text-emerald-400">{byCategory.deriv_manual?.winRate || 0}%</p>
                </div>
              </div>
            </div>

            {/* Deriv Robots */}
            <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-violet-400 flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" /> Robots Deriv
                </span>
                <Badge variant="outline" className="text-[10px]">{byCategory.deriv_robot?.totalTrades || 0} trades</Badge>
              </div>
              <div className="flex justify-between items-end pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground">Profit Net</p>
                  <p className={`font-mono text-sm font-bold ${(byCategory.deriv_robot?.profit || 0) >= 0 ? 'text-violet-400' : 'text-rose-400'}`}>
                    {(byCategory.deriv_robot?.profit || 0) >= 0 ? '+' : ''}${byCategory.deriv_robot?.profit || 0} USD
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Winrate</p>
                  <p className="font-mono text-sm font-bold text-violet-400">{byCategory.deriv_robot?.winRate || 0}%</p>
                </div>
              </div>
            </div>

            {/* Binance Crypto */}
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                  <Bitcoin className="h-3.5 w-3.5" /> Robots Binance
                </span>
                <Badge variant="outline" className="text-[10px]">{byCategory.binance?.totalTrades || 0} trades</Badge>
              </div>
              <div className="flex justify-between items-end pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground">Profit Net</p>
                  <p className={`font-mono text-sm font-bold ${(byCategory.binance?.profit || 0) >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {(byCategory.binance?.profit || 0) >= 0 ? '+' : ''}${byCategory.binance?.profit || 0} USD
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Winrate</p>
                  <p className="font-mono text-sm font-bold text-amber-400">{byCategory.binance?.winRate || 0}%</p>
                </div>
              </div>
            </div>

            {/* Bybit Multi-Marchés */}
            <div className="p-3.5 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-orange-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Robots Bybit
                </span>
                <Badge variant="outline" className="text-[10px]">{byCategory.bybit?.totalTrades || 0} trades</Badge>
              </div>
              <div className="flex justify-between items-end pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground">Profit Net</p>
                  <p className={`font-mono text-sm font-bold ${(byCategory.bybit?.profit || 0) >= 0 ? 'text-orange-400' : 'text-rose-400'}`}>
                    {(byCategory.bybit?.profit || 0) >= 0 ? '+' : ''}${byCategory.bybit?.profit || 0} USD
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Winrate</p>
                  <p className="font-mono text-sm font-bold text-orange-400">{byCategory.bybit?.winRate || 0}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily P&L */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profit &amp; Perte Quotidien</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyProfits.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyProfits}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="profit" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {dailyProfits.map((entry, index) => (
                      <Cell key={index} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée pour cette période.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Win/Loss pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ratio Gains/Pertes</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 && (pieData[0].value > 0 || pieData[1].value > 0) ? (
              <div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Gains ({stats?.wins || 0})
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    Pertes ({stats?.losses || 0})
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
