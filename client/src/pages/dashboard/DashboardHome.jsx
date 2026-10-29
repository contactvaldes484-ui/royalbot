import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import useStore from '../../store/useStore'
import { userAPI, tradeAPI } from '../../lib/api'
import { formatCurrency, formatPercent } from '../../lib/utils'
import {
  TrendingUp, TrendingDown, BarChart3, Bot, Wallet, Activity,
  ArrowUpRight, ArrowDownRight, Zap, Crown, RefreshCw, Wifi, WifiOff
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import BinanceConnectGuide from '../../components/guides/BinanceConnectGuide'

export default function DashboardHome() {
  const { user, activeSessions, fetchActiveSessions } = useStore()
  const [stats, setStats] = useState(null)
  const [equityCurve, setEquityCurve] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, tradeStatsRes] = await Promise.all([
          userAPI.getStats(),
          tradeAPI.getStats({ period: '30d' })
        ])
        setStats(statsRes.data)
        if (statsRes.data.equityCurve) {
          setEquityCurve(statsRes.data.equityCurve.map((p, i) => ({
            name: i,
            equity: p.equity,
            date: new Date(p.date).toLocaleDateString('fr-FR')
          })))
        }
        fetchActiveSessions()
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const userPlan = (user?.subscription?.plan || '').toLowerCase()
  const isDerivUser =
    userPlan.includes('deriv') ||
    user?.subscription?.category === 'deriv' ||
    user?.subscription?.broker === 'deriv' ||
    localStorage.getItem('deriv_oauth_connected') === 'true' ||
    Boolean(user?.derivAccount) ||
    user?.tradingPreferences?.primaryBroker === 'deriv'

  const statCards = [
    {
      title: 'Profit Total',
      value: formatCurrency(stats?.totalProfit || 0),
      icon: TrendingUp,
      color: (stats?.totalProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500',
      bg: (stats?.totalProfit || 0) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
    },
    {
      title: 'Win Rate',
      value: formatPercent(stats?.winRate || 0),
      icon: BarChart3,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'Total Trades',
      value: stats?.totalTrades || 0,
      icon: Activity,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10'
    },
    {
      title: 'Balance',
      value: formatCurrency(0),
      icon: Wallet,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bonjour, {user?.firstName} !</h1>
          <p className="text-muted-foreground text-sm">Voici un résumé de votre activité trading.</p>
        </div>
        <div className="flex items-center gap-2">
          {isDerivUser ? (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 flex items-center gap-1.5 px-3 py-1 font-semibold">
              <Zap className="h-3.5 w-3.5 text-emerald-400" /> Mode Deriv SmartTrader Actif
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> Binance
            </Badge>
          )}
        </div>
      </div>

      {/* Guide Deriv ou Guide Binance selon le profil */}
      {isDerivUser ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Robots Automatisés &amp; Terminal Deriv</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Exécution en direct sur indices synthétiques (Volatility 100/75/50, Boom &amp; Crash).
              </p>
            </div>
          </div>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0">
            <Link to="/dashboard/deriv">
              Accéder au Pôle Deriv <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      ) : (
        <BinanceConnectGuide variant="compact" />
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity curve */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Courbe d'Equity</CardTitle>
          </CardHeader>
          <CardContent>
            {equityCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={equityCurve}>
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
                  <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Aucune donnée disponible. Lancez un robot pour commencer !
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active sessions / Quick actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4" /> Robots Actifs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <div className="text-center py-6">
                  <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Aucun robot actif</p>
                  <Button size="sm" variant={isDerivUser ? "default" : "gradient"} className={isDerivUser ? "bg-emerald-600 hover:bg-emerald-500 text-white font-bold" : ""} asChild>
                    <Link to={isDerivUser ? "/dashboard/deriv" : "/dashboard/bots"}>Lancer un robot</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map((session, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 pulse-dot" />
                        <span className="text-sm font-medium">{session.botId}</span>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${session.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(session.profit || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">{session.tradeCount} trades</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Win/Loss */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Résumé W/L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-green-500/10">
                  <ArrowUpRight className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-green-500">{stats?.wins || 0}</p>
                  <p className="text-xs text-muted-foreground">Gains</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-500/10">
                  <ArrowDownRight className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-red-500">{stats?.losses || 0}</p>
                  <p className="text-xs text-muted-foreground">Pertes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats by contract */}
      {stats?.contractStats && Object.keys(stats.contractStats).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Statistiques par contrat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.contractStats).map(([type, data]) => (
                <div key={type} className="p-3 rounded-lg border">
                  <Badge variant="outline" className="mb-2 text-xs">{type}</Badge>
                  <p className={`text-lg font-bold ${data.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(data.profit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.wins}W / {data.losses}L ({data.total > 0 ? ((data.wins / data.total) * 100).toFixed(1) : 0}%)
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
