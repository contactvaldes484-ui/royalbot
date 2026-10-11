import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { tradeAPI } from '../../lib/api'
import { formatCurrency, formatPercent } from '../../lib/utils'
import { BarChart3, TrendingUp, TrendingDown, Target, Loader2 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#10b981']

export default function DashboardAnalytics() {
  const [stats, setStats] = useState(null)
  const [dailyProfits, setDailyProfits] = useState([])
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const { data } = await tradeAPI.getStats({ period })
        setStats(data.stats)
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
  }, [period])

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
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Analysez vos performances de trading en détail.</p>
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

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Profit Total</p>
            <p className={`text-xl font-bold ${(stats?.totalProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(stats?.totalProfit || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
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
            <p className="text-xl font-bold text-green-500">{formatCurrency(stats?.bestTrade || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Pire Trade</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(stats?.worstTrade || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily P&L */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profit & Perte Quotidien</CardTitle>
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
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Gains ({stats?.wins || 0})
                  </div>
                  <div className="flex items-center gap-2 text-sm">
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

      {/* Additional stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Mise Moyenne</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(stats?.avgStake || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Total Misé</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(stats?.totalStaked || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">ROI</span>
            </div>
            <p className="text-lg font-bold">
              {stats?.totalStaked > 0 ? formatPercent((stats.totalProfit / stats.totalStaked) * 100) : '0%'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">Profit Factor</span>
            </div>
            <p className="text-lg font-bold">
              {stats?.losses > 0 && stats?.worstTrade !== 0 
                ? Math.abs((stats.bestTrade * stats.wins) / (stats.worstTrade * stats.losses)).toFixed(2) 
                : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative P&L + Drawdown */}
      {dailyProfits.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Profit Cumulé</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dailyProfits.reduce((acc, d, i) => {
                  const prev = i > 0 ? acc[i - 1].cumProfit : 0
                  acc.push({ ...d, cumProfit: Number((prev + d.profit).toFixed(2)) })
                  return acc
                }, [])}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px', fontSize: '12px'
                  }} />
                  <Area type="monotone" dataKey="cumProfit" stroke="#8b5cf6" fill="rgba(139,92,246,0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Drawdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={(() => {
                  let peak = 0, cum = 0
                  return dailyProfits.map(d => {
                    cum += d.profit
                    if (cum > peak) peak = cum
                    const dd = peak > 0 ? ((cum - peak) / peak) * 100 : 0
                    return { date: d.date, drawdown: Number(dd.toFixed(2)) }
                  })
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px', fontSize: '12px'
                  }} />
                  <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="rgba(239,68,68,0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
