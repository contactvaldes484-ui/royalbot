import React, { useState, useEffect, Suspense } from 'react'
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import useStore from '../../store/useStore'
import { adminAPI, botAPI, groupAPI, reviewAPI } from '../../lib/api'
import { formatCurrency, formatDate, formatNumber } from '../../lib/utils'
import {
  LayoutDashboard, Users, Bot, Wallet, BarChart3, Bell, Settings,
  TrendingUp, Crown, Activity, DollarSign, Loader2, Search,
  Check, X, AlertCircle, ChevronLeft, ChevronRight, Send,
  Sun, Moon, LogOut, Square, PlayCircle, StopCircle, RefreshCw,
  CreditCard, Coins, Gift, Ban, Menu, Shield, Eye, ArrowUpRight,
  ArrowDownRight, Clock, UserCheck, Zap, Globe, Copy, MoreVertical,
  ChevronDown, CircleDot, ImageIcon, Trash2, Upload, Plus, MessageCircle, Hash, Trophy, Brain, Bitcoin
} from 'lucide-react'

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
//  ADMIN LAYOUT â€” Professional dark sidebar with mobile nav + top header
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
export function AdminLayout() {
  const { user, isAuthenticated, logout, theme, toggleTheme, platformSettings } = useStore()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const pName = platformSettings?.platformName || 'RoyalBot'
  const pLogo = platformSettings?.logoUrl

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!['admin', 'super_admin'].includes(user?.role)) return <Navigate to="/dashboard" replace />

  const menuItems = [
    { icon: LayoutDashboard, label: 'Vue d\'ensemble', href: '/admin', badge: null },
    { icon: Users,           label: 'Utilisateurs',    href: '/admin/users', badge: null },
    { icon: CreditCard,      label: 'Abonnements',     href: '/admin/subscriptions', badge: null },
    { icon: Gift,            label: 'Plans',           href: '/admin/plans', badge: null },
    { icon: Bot,             label: 'Robots',          href: '/admin/bots', badge: null },
    { icon: Coins,           label: 'Commandes',       href: '/admin/orders', badge: null },
    { icon: DollarSign,      label: 'Vendeurs',        href: '/admin/vendors', badge: null },
    { icon: Wallet,          label: 'Retraits',        href: '/admin/withdrawals', badge: null },
    { icon: BarChart3,       label: 'Revenus',         href: '/admin/revenue', badge: null },
    { icon: Shield,          label: 'SÃ©curitÃ©',        href: '/admin/security', badge: null },
    { icon: Bell,            label: 'Notifications',   href: '/admin/notifications', badge: null },
    { icon: MessageCircle,    label: 'Groupes',         href: '/admin/groups', badge: null },
    { icon: Trophy,           label: 'Copy Trading',    href: '/admin/copy-trading', badge: null },
    { icon: MessageCircle,    label: 'Avis robots',     href: '/admin/reviews', badge: null },
    { icon: Brain,            label: 'IA Forex',        href: '/admin/forex-ai', badge: null },
    { icon: Bitcoin,          label: 'Binance',         href: '/admin/binance', badge: null },
    { icon: Zap,              label: 'Deriv Broker',    href: '/admin/deriv', badge: 'Essais 7j' },
    { icon: ImageIcon,        label: 'Marketing',       href: '/admin/screenshots', badge: null },
    { icon: Settings,          label: 'Paramètres',      href: '/admin/settings', badge: null },
  ]

  const isActive = (href) => {
    if (href === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center px-5 border-b border-white/10">
        <Link to="/admin" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          {pLogo ? (
            <img src={pLogo} alt={pName} className="h-9 w-9 rounded-xl object-cover shadow-lg" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 shadow-lg shadow-violet-500/25">
              <Shield className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <span className="text-sm font-bold text-white tracking-wide">{pName}</span>
            <p className="text-[10px] text-violet-300 font-medium -mt-0.5">ADMIN PANEL</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-violet-300/60 uppercase tracking-widest px-3 mb-2">Menu Principal</p>
        {menuItems.map(item => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
              isActive(item.href)
                ? 'bg-gradient-to-r from-violet-500/20 to-indigo-500/10 text-white font-semibold shadow-sm border border-violet-500/20'
                : 'text-violet-200/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              isActive(item.href) ? 'bg-violet-500 shadow-lg shadow-violet-500/30' : 'bg-white/5 group-hover:bg-white/10'
            }`}>
              <item.icon className={`h-4 w-4 ${isActive(item.href) ? 'text-white' : ''}`} />
            </div>
            <span>{item.label}</span>
            {isActive(item.href) && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
          </Link>
        ))}
      </nav>
      <div className="px-3 pb-4 space-y-1 border-t border-white/10 pt-3">
        <button onClick={toggleTheme} className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-violet-200/70 hover:bg-white/5 hover:text-white transition-all">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </div>
          ThÃ¨me
        </button>
        <button onClick={logout} className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <LogOut className="h-4 w-4" />
          </div>
          DÃ©connexion
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="w-72 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 hidden md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header bar */}
        <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-accent">
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-violet-500" />
              <span className="font-semibold">Administration</span>
              <ChevronLeft className="h-3 w-3 text-muted-foreground rotate-180" />
              <span className="text-muted-foreground capitalize">
                {location.pathname === '/admin' ? 'Vue d\'ensemble' : location.pathname.split('/').pop()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-500 text-xs font-medium">
              <CircleDot className="h-3 w-3 animate-pulse" />
              En ligne
            </div>
            <div className="flex items-center gap-2 pl-3 border-l">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-muted-foreground">Administrateur</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

// ─── Admin Vendors (marketplace sellers) ─────────────────────────────────────

export function AdminVendors() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await adminAPI.getVendors()
        setVendors(data.vendors || [])
      } catch (err) {
        console.error('Admin vendors error', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      await adminAPI.approveVendor(id)
      setVendors(vendors.map(v => v._id === id ? { ...v, status: 'approved', rejectionReason: '' } : v))
    } catch (err) {
      console.error('Approve vendor error', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id) => {
    const reason = window.prompt('Raison du refus ? (optionnel)') || ''
    setActionLoading(id)
    try {
      await adminAPI.rejectVendor(id, { reason })
      setVendors(vendors.map(v => v._id === id ? { ...v, status: 'rejected', rejectionReason: reason } : v))
    } catch (err) {
      console.error('Reject vendor error', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Chargement des vendeurs...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendeurs marketplace</h1>
          <p className="text-sm text-muted-foreground">Gérez les demandes vendeurs, leurs statuts et revenus.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          {vendors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun vendeur trouvé.</p>
          ) : (
            <div className="space-y-3">
              {vendors.map(v => (
                <div key={v._id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-lg border bg-card/40">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-violet-500/10 flex items-center justify-center text-xs font-bold text-violet-500">
                      {v.user?.firstName?.[0]}{v.user?.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{v.displayName}</p>
                      <p className="text-xs text-muted-foreground">{v.user?.firstName} {v.user?.lastName} · {v.user?.email}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate max-w-[380px]">{v.bio}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <p>Total robots: <span className="font-semibold">{v.totalRobots || 0}</span></p>
                      <p>Ventes: <span className="font-semibold">{v.totalSales || 0}</span></p>
                      <p>Revenus: <span className="font-semibold">{formatCurrency(v.totalRevenue || 0)}</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={v.status === 'approved' ? 'success' : v.status === 'rejected' ? 'destructive' : 'outline'}
                        className="capitalize text-[10px]"
                      >
                        {v.status}
                      </Badge>
                      {v.rejectionReason && (
                        <p className="text-[10px] text-red-400 max-w-[220px] text-right">{v.rejectionReason}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={actionLoading === v._id}
                          onClick={() => handleApprove(v._id)}
                        >
                          {actionLoading === v._id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                          Approuver
                        </Button>
                        <Button
                          size="xs"
                          variant="destructive"
                          disabled={actionLoading === v._id}
                          onClick={() => handleReject(v._id)}
                        >
                          Refuser
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Admin Reviews moderation ────────────────────────────────────────────────

export function AdminReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await reviewAPI.getReported()
        setReviews(data.reviews || [])
      } catch (err) {
        console.error('Admin reviews error', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleVisibility = async (id, status) => {
    setUpdatingId(id)
    try {
      await reviewAPI.setVisibility(id, status)
      setReviews(reviews.filter(r => r._id !== id))
    } catch (err) {
      console.error('Update review visibility error', err)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Chargement des avis signalés...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Avis robots signalés</h1>
          <p className="text-sm text-muted-foreground">Modérez les avis abusifs ou inappropriés.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun avis signalé.</p>
          ) : (
            reviews.map(r => (
              <div key={r._id} className="p-3 rounded-lg border bg-card/40 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center text-[11px] font-bold text-violet-500">
                      {r.user?.firstName?.[0]}{r.user?.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.user?.firstName} {r.user?.lastName}</p>
                      <p className="text-[11px] text-muted-foreground">{r.user?.email}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Robot: <span className="font-semibold">{r.robot?.name}</span> ({r.robot?.slug})
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-right">
                    <p>Note: <span className="font-semibold">{r.rating}/5</span></p>
                    <p>Date: <span className="font-semibold">{new Date(r.createdAt).toLocaleString()}</span></p>
                  </div>
                </div>
                {r.title && <p className="text-xs font-semibold">{r.title}</p>}
                {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                {r.abuseReason && (
                  <p className="text-[11px] text-red-400">Signalement: {r.abuseReason}</p>
                )}
                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={updatingId === r._id}
                    onClick={() => handleVisibility(r._id, 'hidden')}
                  >
                    Masquer
                  </Button>
                  <Button
                    size="xs"
                    variant="success"
                    disabled={updatingId === r._id}
                    onClick={() => handleVisibility(r._id, 'visible')}
                  >
                    Conserver
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
//  ADMIN OVERVIEW â€” Rich analytics dashboard
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
export default function AdminOverview() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useStore()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await adminAPI.getStats()
        setStats(data)
      } catch (err) {
        console.error('Admin stats error:', err)
      } finally { setLoading(false) }
    }
    fetchStats()
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      <p className="text-sm text-muted-foreground">Chargement du tableau de bord...</p>
    </div>
  )

  const kpis = [
    { title: 'Total Utilisateurs',  value: formatNumber(stats?.totalUsers || 0),         icon: Users,      color: 'from-blue-500 to-cyan-500',    trend: '+12%', up: true },
    { title: 'Premium / VIP',       value: formatNumber(stats?.premiumUsers || 0),        icon: Crown,      color: 'from-violet-500 to-purple-500', trend: '+8%',  up: true },
    { title: 'Sessions Actives',    value: stats?.activeSessions || 0,                    icon: Zap,        color: 'from-amber-500 to-orange-500',  trend: 'Live', up: true },
    { title: 'Total Trades',        value: formatNumber(stats?.totalTrades || 0),         icon: Activity,   color: 'from-green-500 to-emerald-500', trend: '+23%', up: true },
    { title: 'Revenus Abonnements', value: formatCurrency(stats?.totalRevenue || 0),      icon: DollarSign, color: 'from-emerald-500 to-teal-500',  trend: '+15%', up: true },
    { title: 'Commissions',         value: formatCurrency(stats?.totalCommissions || 0),  icon: TrendingUp, color: 'from-cyan-500 to-blue-500',     trend: '+5%',  up: true },
    { title: 'Retraits en attente', value: stats?.pendingWithdrawals || 0,                icon: Clock,      color: 'from-orange-500 to-red-500',    trend: 'Action', up: false },
    { title: 'Profit Total',        value: formatCurrency(stats?.totalProfit || 0),       icon: BarChart3,  color: 'from-pink-500 to-rose-500',     trend: '+18%', up: true },
  ]

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon aprÃ¨s-midi' : 'Bonsoir'

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{greeting}, {user?.firstName}</h1>
          <p className="text-muted-foreground mt-1">
            Voici un aperÃ§u de votre plateforme Â· <span className="text-xs">{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/users">
            <Button variant="outline" size="sm" className="gap-2"><Users className="h-4 w-4" /> Utilisateurs</Button>
          </Link>
          <Link to="/admin/withdrawals">
            <Button variant="outline" size="sm" className="gap-2">
              <Wallet className="h-4 w-4" />
              Retraits
              {(stats?.pendingWithdrawals || 0) > 0 && (
                <span className="ml-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{stats.pendingWithdrawals}</span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-transparent hover:border-violet-500/20">
            <CardContent className="p-5 relative">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${kpi.color} opacity-5 rounded-bl-[4rem] group-hover:opacity-10 transition-opacity`} />
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-lg`}>
                  <kpi.icon className="h-5 w-5 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  kpi.up ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                }`}>
                  {kpi.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.trend}
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/admin/subscriptions">
          <Card className="group cursor-pointer hover:shadow-lg transition-all hover:border-violet-500/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">GÃ©rer les abonnements</h3>
                <p className="text-xs text-muted-foreground">Activer, dÃ©sactiver, accorder des plans</p>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/bots">
          <Card className="group cursor-pointer hover:shadow-lg transition-all hover:border-violet-500/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Robots de trading</h3>
                <p className="text-xs text-muted-foreground">Activer/dÃ©sactiver les robots globaux</p>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/notifications">
          <Card className="group cursor-pointer hover:shadow-lg transition-all hover:border-violet-500/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Notifications globales</h3>
                <p className="text-xs text-muted-foreground">Envoyer un message Ã  tous les utilisateurs</p>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Platform status */}
      <Card className="border-violet-500/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-violet-500" />
            <h3 className="font-semibold">Ã‰tat de la plateforme</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-xs font-medium">Serveur API</p>
                <p className="text-[10px] text-muted-foreground">OpÃ©rationnel</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-xs font-medium">Base de donnÃ©es</p>
                <p className="text-[10px] text-muted-foreground">MongoDB Atlas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-xs font-medium">Trading API</p>
                <p className="text-[10px] text-muted-foreground">ConnectÃ©</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
              <div>
                <p className="text-xs font-medium">MetaApi (MT5)</p>
                <p className="text-[10px] text-muted-foreground">Config requise</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// â”€â”€â”€ User Robot Sessions Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function UserSessionsModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl w-full max-w-md flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg">Robots de {user.firstName} {user.lastName}</h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-6 text-center space-y-3">
          <Bot className="h-10 w-10 mx-auto text-amber-500" />
          <p className="text-sm text-muted-foreground">
            La gestion des robots se fait désormais sur <strong>Binance</strong>.
          </p>
          <Link to="/admin/binance" onClick={onClose}>
            <Button variant="gradient" size="sm">Ouvrir l'admin Binance</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// Admin Users Page
export function AdminUsers() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)

  const fetchUsers = async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (search) params.search = search
      const { data } = await adminAPI.getUsers(params)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  const toggleUserStatus = async (userId, isActive) => {
    try {
      await adminAPI.updateUser(userId, { isActive: !isActive })
      fetchUsers(pagination.page)
    } catch {}
  }

  return (
    <div className="space-y-6">
      {selectedUser && (
        <UserSessionsModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Utilisateurs</h1>
          <p className="text-muted-foreground text-sm">{pagination.total} utilisateurs inscrits</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button type="submit">Rechercher</Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Utilisateur</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Trades</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Profit</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">MT5</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Statut</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Compte</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Robots</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <span className="font-medium">{u.firstName} {u.lastName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3 text-center">
                        <Badge variant={u.subscription?.plan === 'vip' ? 'vip' : u.subscription?.plan === 'premium' ? 'premium' : 'success'} className="text-xs capitalize">
                          {u.subscription?.plan || 'free'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{u.totalTrades || 0}</td>
                      <td className={`p-3 text-right font-medium ${(u.totalProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(u.totalProfit || 0)}
                      </td>
                      <td className="p-3 text-center">
                        {u.mt5Accounts?.length > 0 ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={u.isActive ? 'success' : 'destructive'} className="text-xs">
                          {u.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="sm" onClick={() => toggleUserStatus(u._id, u.isActive)}>
                          {u.isActive ? 'DÃ©sactiver' : 'Activer'}
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                          onClick={() => setSelectedUser(u)}>
                          <Bot className="h-3 w-3" /> GÃ©rer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-xs text-muted-foreground">Page {pagination.page}/{pagination.pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fetchUsers(pagination.page - 1)} disabled={pagination.page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => fetchUsers(pagination.page + 1)} disabled={pagination.page >= pagination.pages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
//  ADMIN BOTS â€” Full robot management: catalog CRUD + sessions + activate
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
export function AdminBots() {
  const [tab, setTab] = useState('catalog') // 'catalog' | 'sessions'

  // â”€â”€ Catalog state â”€â”€
  const [bots, setBots] = useState([])
  const [botsLoading, setBotsLoading] = useState(true)
  const [showBotForm, setShowBotForm] = useState(false)
  const [editingBot, setEditingBot] = useState(null)
  const [botForm, setBotForm] = useState({
    name: '', tier: '', description: '', platforms: ['mt4', 'mt5'],
    supportedContracts: [], supportedSymbols: '',
    price: 0, billingCycle: 'monthly', commissionRate: 0,
    minCapital: 0, minTradeAmount: 0.35,
    features: '', icon: 'Bot', color: '#8b5cf6', badge: '', isPopular: false,
    defaultSettings: {
      initialStake: 1, maxStake: 50, stopLoss: 50, takeProfit: 100,
      maxTradesPerSession: 50, martingaleEnabled: false, martingaleMultiplier: 2,
      martingaleMaxSteps: 4, cooldownSeconds: 3, riskPercent: 1, maxLotSize: 0.1,
    },
    mt5Settings: { strategy: 'scalper_ema', maxOpenTrades: 3, trailingStop: true, trailingStopPips: 15, maxDailyLoss: 5, newsFilter: false },
    robotFile: '', robotFileName: '', robotFileType: '', isUploaded: false,
  })
  const [botSubmitting, setBotSubmitting] = useState(false)

  // â”€â”€ Sessions state â”€â”€
  const [sessions, setSessions] = useState({ mt5Sessions: [] })
  const [totals, setTotals] = useState({ mt5: 0, all: 0 })
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [filters, setFilters] = useState({ status: 'all', platform: 'all', search: '' })
  const [activateModal, setActivateModal] = useState(false)
  const [activatePlatform, setActivatePlatform] = useState('mt5')
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [activateForm, setActivateForm] = useState({ botTier: 'starter', robotPlan: 'pulse' })
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const allContracts = ['BUY','SELL','BUY_LIMIT','SELL_LIMIT','BUY_STOP','SELL_STOP']
  const billingOptions = [
    { value: 'free', label: 'Gratuit' },
    { value: 'monthly', label: 'Mensuel' },
    { value: 'quarterly', label: 'Trimestriel' },
    { value: 'yearly', label: 'Annuel' },
    { value: 'lifetime', label: 'Ã€ vie' },
  ]

  // â”€â”€ Load catalog â”€â”€
  const loadBots = async () => {
    setBotsLoading(true)
    try {
      const { data } = await adminAPI.getBotsCatalog()
      setBots(data.bots || [])
    } catch {} finally { setBotsLoading(false) }
  }

  // â”€â”€ Sessions robots : voir l'admin Binance (les robots tournent sur Binance) â”€â”€
  const loadSessions = async () => {
    setSessionsLoading(true)
    setSessions({ mt5Sessions: [] })
    setSessionsLoading(false)
  }

  useEffect(() => { loadBots() }, [])
  useEffect(() => { if (tab === 'sessions') loadSessions() }, [tab, filters.status, filters.platform])

  const resetBotForm = () => {
    setBotForm({
      name: '', tier: '', description: '', platforms: ['mt4', 'mt5'],
      supportedContracts: [], supportedSymbols: '',
      price: 0, billingCycle: 'monthly', commissionRate: 0,
      minCapital: 0, minTradeAmount: 0.35,
      features: '', icon: 'Bot', color: '#8b5cf6', badge: '', isPopular: false,
      defaultSettings: {
        initialStake: 1, maxStake: 50, stopLoss: 50, takeProfit: 100,
        maxTradesPerSession: 50, martingaleEnabled: false, martingaleMultiplier: 2,
        martingaleMaxSteps: 4, cooldownSeconds: 3, riskPercent: 1, maxLotSize: 0.1,
      },
      mt5Settings: { strategy: 'scalper_ema', maxOpenTrades: 3, trailingStop: true, trailingStopPips: 15, maxDailyLoss: 5, newsFilter: false },
      robotFile: '', robotFileName: '', robotFileType: '', isUploaded: false,
    })
    setEditingBot(null)
  }

  const openEditBot = (bot) => {
    setEditingBot(bot)
    setBotForm({
      name: bot.name, tier: bot.tier, description: bot.description || '',
      platforms: bot.platforms || ['mt5'],
      supportedContracts: bot.supportedContracts || [],
      supportedSymbols: (bot.supportedSymbols || []).join(', '),
      price: bot.price || 0, billingCycle: bot.billingCycle || 'monthly',
      commissionRate: bot.commissionRate || 0,
      minCapital: bot.minCapital || 0, minTradeAmount: bot.minTradeAmount || 0.35,
      features: (bot.features || []).join('\n'),
      icon: bot.icon || 'Bot', color: bot.color || '#8b5cf6',
      badge: bot.badge || '', isPopular: bot.isPopular || false,
      defaultSettings: { ...bot.defaultSettings },
      mt5Settings: { ...(bot.mt5Settings || {}) },
      robotFile: bot.robotFile || '', robotFileName: bot.robotFileName || '',
      robotFileType: bot.robotFileType || '', isUploaded: bot.isUploaded || false,
    })
    setShowBotForm(true)
  }

  const handleBotSubmit = async (e) => {
    e.preventDefault()
    if (!botForm.name || !botForm.tier) return
    setBotSubmitting(true)
    try {
      const payload = {
        ...botForm,
        supportedSymbols: botForm.supportedSymbols.split(',').map(s => s.trim()).filter(Boolean),
        features: botForm.features.split('\n').map(s => s.trim()).filter(Boolean),
        isUploaded: !!botForm.robotFile,
      }
      if (editingBot) {
        await adminAPI.updateBot(editingBot._id, payload)
      } else {
        await adminAPI.createBot(payload)
      }
      setShowBotForm(false)
      resetBotForm()
      setSuccessMsg(editingBot ? 'Robot mis Ã  jour !' : 'Robot crÃ©Ã© avec succÃ¨s !')
      loadBots()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {} finally { setBotSubmitting(false) }
  }

  const handleDeleteBot = async (id) => {
    if (!window.confirm('Supprimer ce robot ?')) return
    try {
      await adminAPI.deleteBot(id)
      loadBots()
      setSuccessMsg('Robot supprimÃ©.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  const handleToggleBot = async (id) => {
    try {
      await adminAPI.toggleBot(id)
      loadBots()
    } catch {}
  }

  // â”€â”€ Sessions helpers â”€â”€
  const handleSearchSessions = (e) => { e.preventDefault(); loadSessions() }
  const handleSearchUsers = async (q) => {
    setUserSearch(q)
    if (q.length < 2) { setUserResults([]); return }
    try { const { data } = await adminAPI.searchUsersForRobot(q); setUserResults(data.users) } catch {}
  }
  const handleActivate = async () => {
    // Les robots s'activent désormais côté utilisateur sur Binance (admin → onglet Binance).
    setActivateModal(false); setSelectedUser(null); setUserSearch(''); setUserResults([])
    setSuccessMsg('La gestion des robots se fait sur Binance (onglet Admin · Binance).')
    setTimeout(() => setSuccessMsg(''), 4000)
  }
  const handleStopSession = async () => { /* géré dans l\'admin Binance */ }
  const statusColor = (s) => s === 'running' || s === 'active' ? 'success' : s === 'paused' ? 'warning' : 'destructive'

  const togglePlatform = (p) => {
    const cur = botForm.platforms
    setBotForm({ ...botForm, platforms: cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p] })
  }
  const toggleContract = (c) => {
    const cur = botForm.supportedContracts
    setBotForm({ ...botForm, supportedContracts: cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c] })
  }

  return (
    <div className="space-y-6">
      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <Check className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* â”€â”€â”€ Bot Form Modal â”€â”€â”€ */}
      {showBotForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-background z-10">
              <h2 className="font-bold text-lg">{editingBot ? 'Modifier le robot' : 'CrÃ©er un nouveau robot'}</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowBotForm(false); resetBotForm() }}><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleBotSubmit} className="p-5 space-y-5">
              {/* Name + Tier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nom du robot *</label>
                  <Input value={botForm.name} onChange={e => setBotForm({...botForm, name: e.target.value})} placeholder="Ex: GoldenScalper" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Plan / Tier *</label>
                  <Input value={botForm.tier} onChange={e => setBotForm({...botForm, tier: e.target.value})} placeholder="Ex: starter, pro, elite, gold..." required />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea value={botForm.description} onChange={e => setBotForm({...botForm, description: e.target.value})}
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Description courte du robot..." />
              </div>

              {/* Platforms */}
              <div>
                <label className="text-sm font-medium mb-2 block">Plateformes supportÃ©es *</label>
                <div className="flex gap-2">
                  {['mt4', 'mt5'].map(p => (
                    <button key={p} type="button" onClick={() => togglePlatform(p)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        botForm.platforms.includes(p) ? 'bg-violet-500 text-white border-violet-500' : 'border-border text-muted-foreground hover:border-violet-500/50'
                      }`}>
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pricing row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Prix ($)</label>
                  <Input type="number" step="0.01" min="0" value={botForm.price}
                    onChange={e => setBotForm({...botForm, price: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Cycle de facturation</label>
                  <select value={botForm.billingCycle} onChange={e => setBotForm({...botForm, billingCycle: e.target.value})}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {billingOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Commission (%)</label>
                  <Input type="number" step="0.1" min="0" max="100" value={botForm.commissionRate}
                    onChange={e => setBotForm({...botForm, commissionRate: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              {/* Capital & Trade minimums */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Capital minimum ($)</label>
                  <Input type="number" step="1" min="0" value={botForm.minCapital}
                    onChange={e => setBotForm({...botForm, minCapital: parseFloat(e.target.value) || 0})} />
                  <p className="text-[10px] text-muted-foreground mt-1">Balance min requise pour utiliser ce robot</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Montant min par trade ($)</label>
                  <Input type="number" step="0.01" min="0" value={botForm.minTradeAmount}
                    onChange={e => setBotForm({...botForm, minTradeAmount: parseFloat(e.target.value) || 0})} />
                  <p className="text-[10px] text-muted-foreground mt-1">Mise minimum par opÃ©ration</p>
                </div>
              </div>

              {/* Default settings */}
              <div>
                <label className="text-sm font-medium mb-2 block">ParamÃ¨tres par dÃ©faut</label>
                <div className="grid grid-cols-3 gap-3 p-4 border rounded-xl bg-muted/20">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Mise initiale</label>
                    <Input type="number" step="0.01" min="0" value={botForm.defaultSettings.initialStake}
                      onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, initialStake: parseFloat(e.target.value) || 0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Mise max</label>
                    <Input type="number" step="0.01" min="0" value={botForm.defaultSettings.maxStake}
                      onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, maxStake: parseFloat(e.target.value) || 0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Stop Loss ($)</label>
                    <Input type="number" step="1" min="0" value={botForm.defaultSettings.stopLoss}
                      onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, stopLoss: parseFloat(e.target.value) || 0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Take Profit ($)</label>
                    <Input type="number" step="1" min="0" value={botForm.defaultSettings.takeProfit}
                      onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, takeProfit: parseFloat(e.target.value) || 0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Max Trades/Session</label>
                    <Input type="number" step="1" min="1" value={botForm.defaultSettings.maxTradesPerSession}
                      onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, maxTradesPerSession: parseInt(e.target.value) || 50}})} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Cooldown (sec)</label>
                    <Input type="number" step="1" min="1" value={botForm.defaultSettings.cooldownSeconds}
                      onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, cooldownSeconds: parseInt(e.target.value) || 3}})} />
                  </div>
                  <div className="col-span-3 flex flex-wrap gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={botForm.defaultSettings.martingaleEnabled}
                        onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, martingaleEnabled: e.target.checked}})}
                        className="rounded" />
                      Martingale
                    </label>
                    {botForm.defaultSettings.martingaleEnabled && (
                      <>
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-muted-foreground">x</label>
                          <Input type="number" step="0.1" min="1" className="w-16 h-7 text-xs"
                            value={botForm.defaultSettings.martingaleMultiplier}
                            onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, martingaleMultiplier: parseFloat(e.target.value) || 2}})} />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-muted-foreground">Max steps</label>
                          <Input type="number" step="1" min="1" className="w-16 h-7 text-xs"
                            value={botForm.defaultSettings.martingaleMaxSteps}
                            onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, martingaleMaxSteps: parseInt(e.target.value) || 4}})} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* MT5 settings (if mt4/mt5 platform selected) */}
              {(botForm.platforms.includes('mt4') || botForm.platforms.includes('mt5')) && (
                <div>
                  <label className="text-sm font-medium mb-2 block">ParamÃ¨tres MT4/MT5</label>
                  <div className="grid grid-cols-3 gap-3 p-4 border rounded-xl bg-blue-500/5">
                    <div>
                      <label className="text-[10px] text-muted-foreground">StratÃ©gie</label>
                      <select value={botForm.mt5Settings.strategy} onChange={e => setBotForm({...botForm, mt5Settings: {...botForm.mt5Settings, strategy: e.target.value}})}
                        className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs">
                        <option value="scalper_ema">Scalper EMA</option>
                        <option value="macd_bb">MACD + Bollinger</option>
                        <option value="multi_tf_ai">Multi-TF AI</option>
                        <option value="rsi_stochastic">RSI + Stochastic</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Max Open Trades</label>
                      <Input type="number" step="1" min="1" value={botForm.mt5Settings.maxOpenTrades}
                        onChange={e => setBotForm({...botForm, mt5Settings: {...botForm.mt5Settings, maxOpenTrades: parseInt(e.target.value) || 3}})} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Max Daily Loss (%)</label>
                      <Input type="number" step="0.1" min="0" value={botForm.mt5Settings.maxDailyLoss}
                        onChange={e => setBotForm({...botForm, mt5Settings: {...botForm.mt5Settings, maxDailyLoss: parseFloat(e.target.value) || 5}})} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Trailing Stop (pips)</label>
                      <Input type="number" step="1" min="0" value={botForm.mt5Settings.trailingStopPips}
                        onChange={e => setBotForm({...botForm, mt5Settings: {...botForm.mt5Settings, trailingStopPips: parseInt(e.target.value) || 15}})} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Risk % / trade</label>
                      <Input type="number" step="0.1" min="0" value={botForm.defaultSettings.riskPercent}
                        onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, riskPercent: parseFloat(e.target.value) || 1}})} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Max Lot Size</label>
                      <Input type="number" step="0.01" min="0.01" value={botForm.defaultSettings.maxLotSize}
                        onChange={e => setBotForm({...botForm, defaultSettings: {...botForm.defaultSettings, maxLotSize: parseFloat(e.target.value) || 0.1}})} />
                    </div>
                    <div className="col-span-3 flex gap-4 mt-1">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={botForm.mt5Settings.trailingStop}
                          onChange={e => setBotForm({...botForm, mt5Settings: {...botForm.mt5Settings, trailingStop: e.target.checked}})} className="rounded" />
                        Trailing Stop
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={botForm.mt5Settings.newsFilter}
                          onChange={e => setBotForm({...botForm, mt5Settings: {...botForm.mt5Settings, newsFilter: e.target.checked}})} className="rounded" />
                        News Filter
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Robot file upload (.ex4/.ex5) — marketplace */}
              {(botForm.platforms.includes('mt4') || botForm.platforms.includes('mt5')) && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Fichier robot (Expert Advisor .ex4 / .ex5)</label>
                  <div className="p-4 border rounded-xl bg-amber-500/5 space-y-2">
                    <input
                      type="file"
                      accept=".ex4,.ex5,.mq4,.mq5,.zip"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 8 * 1024 * 1024) { alert('Fichier trop volumineux (max 8 Mo).'); return }
                        const reader = new FileReader()
                        reader.onload = () => setBotForm(prev => ({
                          ...prev,
                          robotFile: reader.result,
                          robotFileName: file.name,
                          robotFileType: file.type || 'application/octet-stream',
                          isUploaded: true,
                        }))
                        reader.readAsDataURL(file)
                      }}
                      className="text-xs"
                    />
                    {botForm.robotFileName ? (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <Check className="h-3.5 w-3.5" /> Fichier chargé : <strong>{botForm.robotFileName}</strong>
                        <button type="button" className="text-red-500 ml-2"
                          onClick={() => setBotForm(prev => ({ ...prev, robotFile: '', robotFileName: '', robotFileType: '', isUploaded: false }))}>
                          Retirer
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">L'acheteur pourra télécharger ce fichier après paiement confirmé. Formats : .ex4, .ex5, .mq4, .mq5, .zip (max 8 Mo).</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order types */}
              <div>
                <label className="text-sm font-medium mb-2 block">Types d'ordres supportÃ©s</label>
                <div className="flex flex-wrap gap-2">
                  {allContracts.map(c => (
                    <button key={c} type="button" onClick={() => toggleContract(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        botForm.supportedContracts.includes(c) ? 'bg-violet-500 text-white border-violet-500' : 'border-border text-muted-foreground'
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symbols */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Symboles supportÃ©s</label>
                <Input value={botForm.supportedSymbols} onChange={e => setBotForm({...botForm, supportedSymbols: e.target.value})}
                  placeholder="XAUUSD, BTCUSD, EURUSD, GBPUSD (sÃ©parÃ©s par des virgules)" />
              </div>

              {/* Features */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">FonctionnalitÃ©s (une par ligne)</label>
                <textarea value={botForm.features} onChange={e => setBotForm({...botForm, features: e.target.value})}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={"Trading automatique 24/7\nMartingale contrÃ´lÃ©e\nAlerts Telegram"} />
              </div>

              {/* Robot file upload */}
              <div>
                <label className="text-sm font-medium mb-2 block">Fichier Robot (optionnel)</label>
                <div className="p-4 border rounded-xl bg-muted/20 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Uploadez un fichier robot externe (EA MT4/MT5 ou autre). Ce fichier sera disponible pour les utilisateurs du plan.
                  </p>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted/50 text-sm font-medium transition-all">
                      <Upload className="h-4 w-4" />
                      {botForm.robotFileName ? 'Changer le fichier' : 'Charger un fichier robot'}
                      <input type="file" accept=".xml,.ex4,.ex5,.mq4,.mq5,.txt,.json" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 5 * 1024 * 1024) { alert('Le fichier ne doit pas dÃ©passer 5 Mo.'); return }
                        const reader = new FileReader()
                        reader.onload = () => setBotForm({...botForm, robotFile: reader.result, robotFileName: file.name, robotFileType: file.type || 'application/octet-stream', isUploaded: true})
                        reader.readAsDataURL(file)
                      }} className="hidden" />
                    </label>
                    {botForm.robotFileName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">{botForm.robotFileName}</Badge>
                        <button type="button" onClick={() => setBotForm({...botForm, robotFile: '', robotFileName: '', robotFileType: '', isUploaded: false})}
                          className="text-xs text-red-500 hover:underline">Supprimer</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Display row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Badge</label>
                  <Input value={botForm.badge} onChange={e => setBotForm({...botForm, badge: e.target.value})} placeholder="Ex: Premium, VIP, Gratuit" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Couleur</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={botForm.color} onChange={e => setBotForm({...botForm, color: e.target.value})} className="w-9 h-9 rounded cursor-pointer" />
                    <Input value={botForm.color} onChange={e => setBotForm({...botForm, color: e.target.value})} className="flex-1" />
                  </div>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={botForm.isPopular} onChange={e => setBotForm({...botForm, isPopular: e.target.checked})} className="rounded" />
                    Populaire
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <Button type="submit" variant="gradient" className="flex-1" disabled={botSubmitting || !botForm.name || !botForm.tier}>
                  {botSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  {editingBot ? 'Mettre Ã  jour' : 'CrÃ©er le robot'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowBotForm(false); resetBotForm() }}>Annuler</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€â”€ Activate Robot Modal â”€â”€â”€ */}
      {activateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">Activer un robot pour un client</h2>
              <Button variant="ghost" size="sm" onClick={() => { setActivateModal(false); setSelectedUser(null); setUserSearch(''); setUserResults([]) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex gap-2 p-1 bg-muted rounded-xl">
                <button onClick={() => setActivatePlatform('mt5')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activatePlatform === 'mt5' ? 'bg-background shadow text-blue-500' : 'text-muted-foreground'}`}>
                  MT4 / MT5
                </button>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Rechercher un client</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={userSearch} onChange={e => handleSearchUsers(e.target.value)} placeholder="Nom, prÃ©nom ou email..." className="pl-9" />
                </div>
                {userResults.length > 0 && !selectedUser && (
                  <div className="mt-2 border rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {userResults.map(u => (
                      <button key={u._id} onClick={() => { setSelectedUser(u); setUserResults([]) }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{u.subscription?.plan || 'free'}</Badge>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="mt-2 flex items-center gap-3 p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                      {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                      <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setUserSearch('') }}><X className="h-3 w-3" /></Button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Choisir le robot</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bots.filter(b => b.isActive).map(b => (
                    <button key={b._id}
                      onClick={() => setActivateForm({...activateForm, robotPlan: b.tier})}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        activateForm.robotPlan === b.tier
                          ? 'border-violet-500 bg-violet-500/5 shadow-sm' : 'border-border hover:border-violet-500/30'
                      }`}>
                      <div className="w-3 h-3 rounded-full border-2" style={{
                        borderColor: activateForm.robotPlan === b.tier ? '#8b5cf6' : '#888',
                        backgroundColor: activateForm.robotPlan === b.tier ? '#8b5cf6' : 'transparent',
                      }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{b.name} <span className="text-xs text-muted-foreground capitalize">({b.tier})</span></p>
                        <p className="text-xs text-muted-foreground">{b.platforms?.join(', ')} Â· {b.price > 0 ? `$${b.price}` : 'Gratuit'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="gradient" className="flex-1" disabled={!selectedUser || actionLoading} onClick={handleActivate}>
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Activer le robot
                </Button>
                <Button variant="outline" onClick={() => { setActivateModal(false); setSelectedUser(null) }}>Annuler</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€ Header â”€â”€â”€ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Robots</h1>
          <p className="text-muted-foreground text-sm">{bots.length} robot(s) dans le catalogue</p>
        </div>
        <div className="flex gap-2">
          <Button variant="gradient" onClick={() => { resetBotForm(); setShowBotForm(true) }} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau robot
          </Button>
          <Button variant="outline" onClick={() => setActivateModal(true)} className="gap-2">
            <Zap className="h-4 w-4" /> Activer pour un client
          </Button>
        </div>
      </div>

      {/* â”€â”€â”€ Tabs â”€â”€â”€ */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        <button onClick={() => setTab('catalog')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'catalog' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
          <Bot className="inline h-4 w-4 mr-1.5" />Catalogue Robots
        </button>
        <button onClick={() => setTab('sessions')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'sessions' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
          <Activity className="inline h-4 w-4 mr-1.5" />Sessions actives
        </button>
      </div>

      {/* â•â•â• TAB: CATALOG â•â•â• */}
      {tab === 'catalog' && (
        botsLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
        ) : bots.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold mb-1">Aucun robot</h3>
              <p className="text-sm text-muted-foreground mb-4">CrÃ©ez votre premier robot de trading.</p>
              <Button variant="gradient" onClick={() => { resetBotForm(); setShowBotForm(true) }} className="gap-2">
                <Plus className="h-4 w-4" /> CrÃ©er un robot
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {bots.map(b => (
              <Card key={b._id} className={`overflow-hidden transition-all ${!b.isActive ? 'opacity-50' : ''} ${b.isPopular ? 'border-violet-500 shadow-lg shadow-violet-500/10' : ''}`}>
                {b.isPopular && (
                  <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] font-bold text-center py-1">POPULAIRE</div>
                )}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: b.color + '20' }}>
                        <Bot className="h-5 w-5" style={{ color: b.color }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">{b.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] capitalize">{b.tier}</Badge>
                          <Badge variant={b.isActive ? 'success' : 'destructive'} className="text-[10px]">{b.isActive ? 'Actif' : 'Inactif'}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{b.description || 'â€”'}</p>

                  {/* Platforms */}
                  <div className="flex gap-1 mb-3">
                    {(b.platforms || []).map(p => (
                      <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">
                        {p.toUpperCase()}
                      </span>
                    ))}
                  </div>

                  {/* Price + Capital */}
                  <div className="grid grid-cols-3 gap-2 mb-3 p-2 bg-muted/30 rounded-lg text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Prix</p>
                      <p className="text-xs font-bold">{b.price > 0 ? `$${b.price}` : 'Gratuit'}</p>
                      {b.billingCycle && b.billingCycle !== 'free' && (
                        <p className="text-[9px] text-muted-foreground capitalize">{b.billingCycle}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Capital min</p>
                      <p className="text-xs font-bold">${b.minCapital || 0}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Trade min</p>
                      <p className="text-xs font-bold">${b.minTradeAmount || 0.35}</p>
                    </div>
                  </div>

                  {/* Features count */}
                  <p className="text-[10px] text-muted-foreground mb-3">
                    {(b.features || []).length} fonctionnalitÃ©(s) Â· {(b.supportedSymbols || []).length} symbole(s)
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openEditBot(b)}>
                      <Settings className="h-3 w-3 mr-1" /> Modifier
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={() => handleToggleBot(b._id)}>
                      {b.isActive ? <Ban className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 text-xs px-2" onClick={() => handleDeleteBot(b._id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* â•â•â• TAB: SESSIONS â•â•â• */}
      {tab === 'sessions' && (
        <>
          <div className="flex flex-wrap gap-3">
            <form onSubmit={handleSearchSessions} className="flex gap-2 flex-1 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un client..." value={filters.search}
                  onChange={e => setFilters({...filters, search: e.target.value})} className="pl-9" />
              </div>
              <Button type="submit" size="sm">Filtrer</Button>
            </form>
            <select value={filters.platform} onChange={e => setFilters({...filters, platform: e.target.value})}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">Toutes plateformes</option>
              <option value="mt4">MT4</option>
              <option value="mt5">MT5</option>
            </select>
            <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">Tous statuts</option>
              <option value="active">Actif / Running</option>
              <option value="paused">En pause</option>
              <option value="stopped">ArrÃªtÃ©</option>
            </select>
          </div>

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    Sessions MT4 / MT5
                    <Badge variant="outline" className="ml-2 text-xs">{totals.mt5}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {sessions.mt5Sessions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">Aucune session MT5.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Robot</th>
                          <th className="text-center p-3 font-medium text-muted-foreground">Symboles</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Trades</th>
                          <th className="text-right p-3 font-medium text-muted-foreground">Profit</th>
                          <th className="text-center p-3 font-medium text-muted-foreground">Statut</th>
                          <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                        </tr></thead>
                        <tbody>
                          {sessions.mt5Sessions.map(s => (
                            <tr key={s._id} className="border-b hover:bg-muted/30">
                              <td className="p-3"><div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{s.user?.firstName?.[0]}{s.user?.lastName?.[0]}</div>
                                <div><p className="text-sm font-medium">{s.user?.firstName} {s.user?.lastName}</p><p className="text-[10px] text-muted-foreground">{s.user?.email}</p></div>
                              </div></td>
                              <td className="p-3"><span className="font-medium capitalize">{s.robotPlan}</span> <span className="text-xs text-muted-foreground">({s.settings?.strategy})</span></td>
                              <td className="p-3 text-center text-xs">{s.settings?.symbols?.join(', ') || 'â€”'}</td>
                              <td className="p-3 text-right">{s.stats?.totalTrades || 0}</td>
                              <td className={`p-3 text-right font-medium ${(s.stats?.totalProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>${(s.stats?.totalProfit || 0).toFixed(2)}</td>
                              <td className="p-3 text-center"><Badge variant={statusColor(s.status)} className="text-xs capitalize">{s.status}</Badge></td>
                              <td className="p-3 text-center">
                                {(s.status === 'active' || s.status === 'paused') && (
                                  <Button size="sm" variant="destructive" className="h-7 text-xs px-2" disabled={actionLoading === s._id} onClick={() => handleStopSession(s, 'mt5')}>
                                    {actionLoading === s._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <StopCircle className="h-3 w-3 mr-1" />} ArrÃªter
                                  </Button>
                                )}
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
          )}
        </>
      )}
    </div>
  )
}

// Admin Withdrawals Page
export function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchWithdrawals = async () => {
    setLoading(true)
    try {
      const { data } = await adminAPI.getWithdrawals({})
      setWithdrawals(data.withdrawals)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchWithdrawals() }, [])

  const processWithdrawal = async (id, status) => {
    try {
      await adminAPI.processWithdrawal(id, { status })
      fetchWithdrawals()
    } catch {}
  }

  const statusColors = { pending: 'warning', processing: 'premium', completed: 'success', rejected: 'destructive' }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestion des Retraits</h1>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Utilisateur</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Montant</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Commission</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Net</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">MÃ©thode</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Statut</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w._id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{w.user?.firstName} {w.user?.lastName}</td>
                    <td className="p-3 text-right">{formatCurrency(w.amount)}</td>
                    <td className="p-3 text-right text-yellow-500">{formatCurrency(w.commission)}</td>
                    <td className="p-3 text-right text-green-500 font-medium">{formatCurrency(w.netAmount)}</td>
                    <td className="p-3 text-center">
                      {w.source === 'vendor' ? (
                        <Badge variant="premium" className="text-[11px]">Vendeur marketplace</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px]">Utilisateur</Badge>
                      )}
                    </td>
                    <td className="p-3 text-center capitalize">{w.method}</td>
                    <td className="p-3 text-center">
                      <Badge variant={statusColors[w.status]} className="text-xs capitalize">{w.status}</Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{formatDate(w.createdAt)}</td>
                    <td className="p-3 text-center">
                      {w.status === 'pending' && (
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" className="text-green-500 h-7 px-2" onClick={() => processWithdrawal(w._id, 'completed')}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 h-7 px-2" onClick={() => processWithdrawal(w._id, 'rejected')}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {withdrawals.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">Aucun retrait.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Admin Revenue Page â€” MRR / ARR / Churn + per-period revenue
export function AdminRevenue() {
  const [data, setData] = useState({ subscriptionRevenue: [], commissionRevenue: [] })
  const [subStats, setSubStats] = useState(null)
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const [revRes, statsRes] = await Promise.all([
          adminAPI.getRevenue({ period }),
          adminAPI.getRevenueStats().catch(() => ({ data: { stats: null } })),
        ])
        setData(revRes.data)
        setSubStats(statsRes.data?.stats || null)
      } catch {} finally { setLoading(false) }
    }
    fetch()
  }, [period])

  const totalSub = data.subscriptionRevenue.reduce((sum, d) => sum + d.total, 0)
  const totalComm = data.commissionRevenue.reduce((sum, d) => sum + d.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Revenus</h1>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {['7d', '30d', '90d', '1y'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${period === p ? 'bg-background shadow' : 'text-muted-foreground'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards â€” subscription business metrics */}
      {subStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">MRR</p>
              <p className="text-2xl font-bold text-emerald-500">{formatCurrency(subStats.mrr || 0)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Revenu mensuel rÃ©current</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">ARR</p>
              <p className="text-2xl font-bold text-blue-500">{formatCurrency(subStats.arr || 0)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Revenu annuel rÃ©current</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Churn rate (30j)</p>
              <p className={`text-2xl font-bold ${(subStats.churnRate || 0) > 10 ? 'text-red-500' : 'text-amber-500'}`}>
                {(subStats.churnRate || 0).toFixed(2)}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Taux d'annulation</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Abonnements actifs</p>
              <p className="text-2xl font-bold text-violet-500">{formatNumber(subStats.activeSubscriptions || 0)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{subStats.pendingPayments || 0} paiements en attente</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Revenus Abonnements ({period})</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(totalSub)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Commissions Retraits ({period})</p>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(totalComm)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Revenu Total ({period})</p>
            <p className="text-2xl font-bold text-violet-500">{formatCurrency(totalSub + totalComm)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative totals */}
      {subStats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cumul abonnements</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Ce mois-ci</p>
              <p className="text-lg font-bold">{formatCurrency(subStats.monthlyRevenue || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cette annÃ©e</p>
              <p className="text-lg font-bold">{formatCurrency(subStats.yearlyRevenue || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total depuis le dÃ©but</p>
              <p className="text-lg font-bold">{formatCurrency(subStats.totalRevenue || 0)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-plan breakdown */}
      {subStats?.perPlan?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">RÃ©partition par plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 font-medium">Plan</th>
                    <th className="text-right py-2 font-medium">AbonnÃ©s</th>
                    <th className="text-right py-2 font-medium">Revenus</th>
                  </tr>
                </thead>
                <tbody>
                  {subStats.perPlan.map((p) => (
                    <tr key={p._id} className="border-b last:border-0">
                      <td className="py-2 capitalize font-medium">{p._id}</td>
                      <td className="py-2 text-right">{p.count}</td>
                      <td className="py-2 text-right text-emerald-500 font-medium">{formatCurrency(p.revenue || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>}
    </div>
  )
}

// Admin Subscriptions Page
export function AdminSubscriptions() {
  const [subs, setSubs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ plan: '', status: '', method: '' })
  const [grantModal, setGrantModal] = useState(false)
  const [grantForm, setGrantForm] = useState({ userId: '', plan: 'premium', durationDays: 30, adminNote: '' })
  const [confirmModal, setConfirmModal] = useState(null)
  const [txHash, setTxHash] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const load = async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (filters.plan) params.plan = filters.plan
      if (filters.status) params.status = filters.status
      if (filters.method) params.method = filters.method
      const { data } = await adminAPI.getSubscriptions(params)
      setSubs(data.subscriptions)
      setPagination(data.pagination)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters])

  const handleToggle = async (id) => {
    setActionLoading(id)
    try { await adminAPI.toggleSubscription(id); load(pagination.page) }
    catch {} finally { setActionLoading(null) }
  }

  const handlePlanChange = async (id, plan) => {
    setActionLoading(id)
    try { await adminAPI.changeSubscriptionPlan(id, plan); load(pagination.page) }
    catch {} finally { setActionLoading(null) }
  }

  const handleGrant = async (e) => {
    e.preventDefault()
    try {
      await adminAPI.grantSubscription(grantForm)
      setGrantModal(false)
      setGrantForm({ userId: '', plan: 'premium', durationDays: 30, adminNote: '' })
      load()
    } catch {}
  }

  const handleConfirmPayment = async () => {
    try {
      await adminAPI.confirmCryptoPayment(confirmModal._id, { txHash })
      setConfirmModal(null); setTxHash('')
      load(pagination.page)
    } catch {}
  }

  const planColor = (p) => p === 'vip' ? 'vip' : p === 'premium' ? 'premium' : 'success'
  const methodLabel = { stripe: 'Stripe', usdt_tron: 'USDT Tron', binance_pay: 'BinancePay', crypto: 'Crypto', card: 'Carte', mobile_money: 'Mobile Money' }
  const methodColor = { usdt_tron: 'text-green-500', binance_pay: 'text-yellow-500' }

  return (
    <div className="space-y-6">
      {/* Grant modal */}
      {grantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Accorder un abonnement</h2>
              <Button variant="ghost" size="sm" onClick={() => setGrantModal(false)}><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">ID Utilisateur</label>
                <Input value={grantForm.userId} onChange={e => setGrantForm({...grantForm, userId: e.target.value})} placeholder="MongoDB ObjectId..." required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Plan</label>
                <select value={grantForm.plan} onChange={e => setGrantForm({...grantForm, plan: e.target.value})} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">DurÃ©e (jours)</label>
                <Input type="number" value={grantForm.durationDays} onChange={e => setGrantForm({...grantForm, durationDays: parseInt(e.target.value)})} min="1" max="365" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Note admin (optionnel)</label>
                <Input value={grantForm.adminNote} onChange={e => setGrantForm({...grantForm, adminNote: e.target.value})} placeholder="Raison..." />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="gradient" className="flex-1"><Gift className="h-4 w-4 mr-2" /> Accorder</Button>
                <Button type="button" variant="outline" onClick={() => setGrantModal(false)}>Annuler</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm crypto payment modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="font-bold text-lg mb-4">Confirmer paiement crypto</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Utilisateur : <strong>{confirmModal.user?.firstName} {confirmModal.user?.lastName}</strong> Â· Plan : <strong className="capitalize">{confirmModal.plan}</strong>
            </p>
            <div className="mb-4">
              <label className="text-sm font-medium mb-1.5 block">Hash de transaction (optionnel)</label>
              <Input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x..." />
            </div>
            <div className="flex gap-2">
              <Button variant="gradient" className="flex-1" onClick={handleConfirmPayment}><Check className="h-4 w-4 mr-2" /> Confirmer</Button>
              <Button variant="outline" onClick={() => { setConfirmModal(null); setTxHash('') }}>Annuler</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abonnements</h1>
          <p className="text-muted-foreground text-sm">{pagination.total} abonnements</p>
        </div>
        <Button variant="gradient" onClick={() => setGrantModal(true)}>
          <Gift className="h-4 w-4 mr-2" /> Accorder un plan
        </Button>
      </div>

      {/* Crypto payment addresses info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold text-sm">USDT Tron (TRC-20)</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Adresse de rÃ©ception :</p>
            <p className="text-xs font-mono bg-muted rounded px-2 py-1 break-all">
              {import.meta.env.VITE_USDT_TRON_ADDRESS || 'Configurer VITE_USDT_TRON_ADDRESS dans .env'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold text-sm">BinancePay</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-1">Merchant ID :</p>
            <p className="text-xs font-mono bg-muted rounded px-2 py-1">
              {import.meta.env.VITE_BINANCE_PAY_MERCHANT_ID || 'Configurer VITE_BINANCE_PAY_MERCHANT_ID dans .env'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filters.plan} onChange={e => setFilters({...filters, plan: e.target.value})} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Tous les plans</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
          <option value="vip">VIP</option>
        </select>
        <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Tous statuts</option>
          <option value="active">Actif</option>
          <option value="inactive">Inactif</option>
        </select>
        <select value={filters.method} onChange={e => setFilters({...filters, method: e.target.value})} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Tous paiements</option>
          <option value="stripe">Stripe</option>
          <option value="usdt_tron">USDT Tron</option>
          <option value="binance_pay">BinancePay</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Utilisateur</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Paiement</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Statut paiement</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Expire</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Actif</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map(s => (
                    <tr key={s._id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{s.user?.firstName} {s.user?.lastName}</p>
                        <p className="text-xs text-muted-foreground">{s.user?.email}</p>
                        {s.grantedByAdmin && <span className="text-xs text-violet-500">Admin grant</span>}
                      </td>
                      <td className="p-3 text-center">
                        <select
                          className="h-7 rounded border border-input bg-background px-2 text-xs"
                          value={s.plan}
                          disabled={actionLoading === s._id}
                          onChange={e => handlePlanChange(s._id, e.target.value)}
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                          <option value="vip">VIP</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-medium ${methodColor[s.paymentMethod] || 'text-muted-foreground'}`}>
                          {methodLabel[s.paymentMethod] || s.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {s.paymentStatus === 'pending' ? (
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2 text-yellow-500 border-yellow-500/30"
                            onClick={() => setConfirmModal(s)}>
                            En attente
                          </Button>
                        ) : (
                          <Badge variant={s.paymentStatus === 'confirmed' ? 'success' : 'destructive'} className="text-xs">
                            {s.paymentStatus === 'confirmed' ? 'ConfirmÃ©' : 'Ã‰chouÃ©'}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {s.endDate ? new Date(s.endDate).toLocaleDateString('fr-FR') : 'â€”'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={s.isActive ? 'success' : 'destructive'} className="text-xs">
                          {s.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm" variant="ghost"
                          className={`h-7 text-xs ${s.isActive ? 'text-red-500' : 'text-green-500'}`}
                          disabled={actionLoading === s._id}
                          onClick={() => handleToggle(s._id)}
                        >
                          {actionLoading === s._id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : s.isActive ? <><Ban className="h-3 w-3 mr-1" />DÃ©sactiver</> : <><Check className="h-3 w-3 mr-1" />Activer</>
                          }
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {subs.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">Aucun abonnement.</div>}
            </div>
          )}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-xs text-muted-foreground">Page {pagination.page}/{pagination.pages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.pages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Admin Notifications Page
export function AdminNotifications() {
  const [form, setForm] = useState({ title: '', message: '', type: 'info' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminAPI.sendNotification(form)
      setSent(true)
      setForm({ title: '', message: '', type: 'info' })
      setTimeout(() => setSent(false), 3000)
    } catch {} finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications Globales</h1>
      <Card className="max-w-lg">
        <CardHeader><CardTitle className="text-base">Envoyer une notification</CardTitle></CardHeader>
        <CardContent>
          {sent && <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm mb-4 flex items-center gap-2"><Check className="h-4 w-4" /> Notification envoyÃ©e !</div>}
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Titre</label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Titre de la notification" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Message</label>
              <textarea
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Message..."
                rows={4}
                required
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="info">Information</option>
                <option value="warning">Avertissement</option>
                <option value="success">SuccÃ¨s</option>
                <option value="error">Erreur</option>
              </select>
            </div>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer Ã  tous
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
//  ADMIN SCREENSHOTS â€” Marketing profit screenshots management
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
export function AdminScreenshots() {
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', profit: '', trader: '', platform: 'mt5', imageData: '' })
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [preview, setPreview] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await adminAPI.getScreenshots()
      setScreenshots(data.screenshots || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image trop volumineuse (max 5 MB)'); return }
    const reader = new FileReader()
    reader.onloadend = () => {
      setForm({ ...form, imageData: reader.result })
      setPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.imageData) return
    setSubmitting(true)
    try {
      await adminAPI.addScreenshot(form)
      setForm({ title: '', description: '', profit: '', trader: '', platform: 'mt5', imageData: '' })
      setPreview(null)
      setShowAdd(false)
      setSuccessMsg('Capture ajoutÃ©e avec succÃ¨s !')
      load()
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {} finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette capture ?')) return
    try {
      await adminAPI.deleteScreenshot(id)
      load()
    } catch {}
  }

  const handleToggle = async (id, isActive) => {
    try {
      await adminAPI.updateScreenshot(id, { isActive: !isActive })
      load()
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <Check className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* Add Screenshot Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">Ajouter une capture de profit</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setPreview(null) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Image upload */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Image de la capture *</label>
                {preview ? (
                  <div className="relative">
                    <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl border" />
                    <button type="button" onClick={() => { setPreview(null); setForm({ ...form, imageData: '' }) }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl cursor-pointer hover:border-violet-500/50 hover:bg-muted/30 transition-all">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Cliquez pour uploader</span>
                    <span className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP (max 5 MB)</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Titre *</label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Profit du jour - XAUUSD" required />
              </div>

              {/* Profit + Trader */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Montant du profit</label>
                  <Input value={form.profit} onChange={e => setForm({ ...form, profit: e.target.value })}
                    placeholder="Ex: +$1,250" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nom du trader</label>
                  <Input value={form.trader} onChange={e => setForm({ ...form, trader: e.target.value })}
                    placeholder="Ex: Jean D." />
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Plateforme</label>
                <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="mt4">MT4</option>
                  <option value="mt5">MT5</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description (optionnel)</label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="DÃ©tails supplÃ©mentaires..." />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="gradient" className="flex-1" disabled={submitting || !form.title || !form.imageData}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Ajouter la capture
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setPreview(null) }}>Annuler</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Marketing â€” Captures de profits</h1>
          <p className="text-muted-foreground text-sm">
            {screenshots.length} capture(s) Â· Les captures actives dÃ©filent sur la page d'accueil.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter une capture
        </Button>
      </div>

      {/* Screenshots grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
      ) : screenshots.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-1">Aucune capture de profit</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ajoutez des captures d'Ã©cran de profits pour les afficher sur la page d'accueil.
            </p>
            <Button variant="gradient" onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Ajouter la premiÃ¨re capture
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {screenshots.map(s => (
            <Card key={s._id} className={`overflow-hidden transition-all ${!s.isActive ? 'opacity-50' : ''}`}>
              <div className="relative h-48 overflow-hidden">
                <img src={s.imageData} alt={s.title} className="w-full h-full object-cover" />
                {s.profit && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow">
                    {s.profit}
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant={s.isActive ? 'success' : 'destructive'} className="text-[10px]">
                    {s.isActive ? 'Visible' : 'MasquÃ©'}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm truncate">{s.title}</h3>
                <div className="flex items-center justify-between mt-1 mb-3">
                  {s.trader && <p className="text-xs text-muted-foreground">{s.trader}</p>}
                  <Badge variant="outline" className="text-[10px] capitalize">{s.platform}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs"
                    onClick={() => handleToggle(s._id, s.isActive)}>
                    {s.isActive ? <Eye className="h-3 w-3 mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
                    {s.isActive ? 'Masquer' : 'Afficher'}
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8 text-xs px-2"
                    onClick={() => handleDelete(s._id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
//  ADMIN SETTINGS â€” Platform branding, logo, hero, footer, social links
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
export function AdminSettings() {
  const { platformSettings, fetchPlatformSettings } = useStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({
    platformName: '', logoUrl: '', faviconUrl: '', tagline: '', description: '',
    primaryColor: '#8b5cf6', secondaryColor: '#3b82f6', gradientFrom: '#3b82f6', gradientTo: '#7c3aed',
    heroTitle: '', heroHighlight: '', heroSubtitle: '', heroBadge: '',
    footerText: '', copyrightName: '',
    contactEmail: '', contactPhone: '',
    whatsappLink: '', telegramLink: '', twitterLink: '', facebookLink: '',
    instagramLink: '', youtubeLink: '',
    brokerSignupUrl: '',
    metaTitle: '', metaDescription: '',
    usdtTronAddress: '',
    trongridApiKey: '',
    binancePayId: '',
    binancePayMerchantId: '',
    binancePayApiKey: '',
    binancePaySecretKey: '',
    sebpayBaseUrl: 'https://newapi.sebpay.bj/api/v1',
    sebpayPublicKey: '',
    sebpaySecretKey: '',
    derivAppId: '1089',
    derivWsUrl: 'wss://ws.binaryws.com/websockets/v3',
  })
  const [showSecrets, setShowSecrets] = useState({})
  const toggleSecret = (field) => setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
  const [activeTab, setActiveTab] = useState('branding')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await adminAPI.getSettings()
        if (data.settings) {
          const s = data.settings
          setForm({
            platformName: s.platformName || '',
            logoUrl: s.logoUrl || '',
            faviconUrl: s.faviconUrl || '',
            tagline: s.tagline || '',
            description: s.description || '',
            primaryColor: s.primaryColor || '#8b5cf6',
            secondaryColor: s.secondaryColor || '#3b82f6',
            gradientFrom: s.gradientFrom || '#3b82f6',
            gradientTo: s.gradientTo || '#7c3aed',
            heroTitle: s.heroTitle || '',
            heroHighlight: s.heroHighlight || '',
            heroSubtitle: s.heroSubtitle || '',
            heroBadge: s.heroBadge || '',
            footerText: s.footerText || '',
            copyrightName: s.copyrightName || '',
            contactEmail: s.contactEmail || '',
            contactPhone: s.contactPhone || '',
            whatsappLink: s.whatsappLink || '',
            telegramLink: s.telegramLink || '',
            twitterLink: s.twitterLink || '',
            facebookLink: s.facebookLink || '',
            instagramLink: s.instagramLink || '',
            youtubeLink: s.youtubeLink || '',
            brokerSignupUrl: s.brokerSignupUrl || '',
            metaTitle: s.metaTitle || '',
            metaDescription: s.metaDescription || '',
            usdtTronAddress: s.usdtTronAddress || '',
            trongridApiKey: s.trongridApiKey || '',
            binancePayId: s.binancePayId || '',
            binancePayMerchantId: s.binancePayMerchantId || '',
            binancePayApiKey: s.binancePayApiKey || '',
            binancePaySecretKey: s.binancePaySecretKey || '',
            sebpayBaseUrl: s.sebpayBaseUrl || 'https://newapi.sebpay.bj/api/v1',
            sebpayPublicKey: s.sebpayPublicKey || '',
            sebpaySecretKey: s.sebpaySecretKey || '',
            derivAppId: s.derivAppId || '1089',
            derivWsUrl: s.derivWsUrl || 'wss://ws.binaryws.com/websockets/v3',
          })
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Impossible de charger les paramÃ¨tres.' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Le logo ne doit pas dÃ©passer 2 Mo.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm({ ...form, logoUrl: reader.result })
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await adminAPI.updateSettings(form)
      await fetchPlatformSettings()
      setMessage({ type: 'success', text: 'ParamÃ¨tres sauvegardÃ©s ! Les modifications sont appliquÃ©es partout.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur lors de la sauvegarde.' })
    } finally {
      setSaving(false)
    }
  }

  const update = (field, value) => setForm({ ...form, [field]: value })

  const tabs = [
    { key: 'branding', label: 'IdentitÃ©', icon: Shield },
    { key: 'payments', label: 'Paiements & Passerelles', icon: CreditCard },
    { key: 'hero', label: 'Page d\'accueil', icon: Globe },
    { key: 'footer', label: 'Footer & SEO', icon: Settings },
    { key: 'social', label: 'RÃ©seaux sociaux', icon: Globe },
    { key: 'broker', label: 'Broker & Deriv', icon: Bot },
  ]

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ParamÃ¨tres de la plateforme</h1>
          <p className="text-sm text-muted-foreground">Modifiez le nom, le logo et tous les dÃ©tails de la plateforme. Les changements s'appliquent partout.</p>
        </div>
        <Button variant="gradient" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
          message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.key ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB: Branding */}
      {activeTab === 'branding' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Shield className="h-4 w-4 text-violet-500" /> IdentitÃ© de la plateforme</h3>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom de la plateforme *</label>
                <Input value={form.platformName} onChange={e => update('platformName', e.target.value)}
                  placeholder="Ex: RoyalBot" />
                <p className="text-[10px] text-muted-foreground mt-1">AffichÃ© dans la navbar, le footer, le dashboard et le panneau admin.</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Slogan / Tagline</label>
                <Input value={form.tagline} onChange={e => update('tagline', e.target.value)}
                  placeholder="Ex: Plateforme de trading automatisÃ©" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Description courte</label>
                <textarea value={form.description} onChange={e => update('description', e.target.value)}
                  rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Description affichÃ©e dans le footer et les mÃ©tadonnÃ©es" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2"><ImageIcon className="h-4 w-4 text-violet-500" /> Logo</h3>

              {/* Logo preview */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <Bot className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-muted/30 hover:bg-muted/50 text-sm font-medium transition-all">
                    <Upload className="h-4 w-4" />
                    Charger un logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {form.logoUrl && (
                    <button onClick={() => update('logoUrl', '')} className="text-xs text-red-500 hover:underline block">
                      Supprimer le logo
                    </button>
                  )}
                  <p className="text-[10px] text-muted-foreground">Format: PNG, JPG, SVG. Max 2 Mo. CarrÃ© recommandÃ©.</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Ou URL du logo</label>
                <Input value={form.logoUrl} onChange={e => update('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png" />
              </div>

              <h3 className="font-bold flex items-center gap-2 pt-4 border-t"><Zap className="h-4 w-4 text-violet-500" /> Couleurs</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground">Couleur primaire</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                    <Input value={form.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="flex-1 h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Couleur secondaire</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.secondaryColor} onChange={e => update('secondaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                    <Input value={form.secondaryColor} onChange={e => update('secondaryColor', e.target.value)} className="flex-1 h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Gradient dÃ©but</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.gradientFrom} onChange={e => update('gradientFrom', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                    <Input value={form.gradientFrom} onChange={e => update('gradientFrom', e.target.value)} className="flex-1 h-8 text-xs" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Gradient fin</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.gradientTo} onChange={e => update('gradientTo', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                    <Input value={form.gradientTo} onChange={e => update('gradientTo', e.target.value)} className="flex-1 h-8 text-xs" />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-xl border bg-muted/20">
                <p className="text-[10px] text-muted-foreground mb-2">AperÃ§u</p>
                <div className="flex items-center gap-3">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${form.gradientFrom}, ${form.gradientTo})` }}>
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <span className="text-lg font-bold" style={{ background: `linear-gradient(135deg, ${form.gradientFrom}, ${form.gradientTo})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {form.platformName || 'RoyalBot'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: Hero / Landing Page */}
      {activeTab === 'hero' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2"><Globe className="h-4 w-4 text-violet-500" /> Section Hero â€” Page d'accueil</h3>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Badge du hero</label>
              <Input value={form.heroBadge} onChange={e => update('heroBadge', e.target.value)}
                placeholder="Ex: Plateforme #1 de Trading AutomatisÃ©" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Titre principal</label>
              <Input value={form.heroTitle} onChange={e => update('heroTitle', e.target.value)}
                placeholder="Ex: Automatisez votre trading Forex avec l'IA" />
              <p className="text-[10px] text-muted-foreground mt-1">Le texte complet du titre H1 de la landing page.</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Mot(s) mis en valeur (gradient)</label>
              <Input value={form.heroHighlight} onChange={e => update('heroHighlight', e.target.value)}
                placeholder="Ex: trading Forex" />
              <p className="text-[10px] text-muted-foreground mt-1">Ce texte sera affichÃ© avec un effet gradient dans le titre.</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Sous-titre</label>
              <textarea value={form.heroSubtitle} onChange={e => update('heroSubtitle', e.target.value)}
                rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Description sous le titre principal" />
            </div>

            {/* Preview */}
            <div className="p-6 rounded-xl border bg-gradient-to-b from-violet-500/5 to-transparent">
              <p className="text-[10px] text-muted-foreground mb-3">AperÃ§u du Hero</p>
              <div className="inline-block px-3 py-1 rounded-full border text-xs mb-3">{form.heroBadge || 'Badge'}</div>
              <h2 className="text-2xl font-bold mb-2">
                {(form.heroTitle || 'Votre titre ici').split(form.heroHighlight || '___NONE___').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="gradient-text">{form.heroHighlight}</span>}
                  </span>
                ))}
              </h2>
              <p className="text-sm text-muted-foreground">{form.heroSubtitle || 'Votre sous-titre ici'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB: Footer & SEO */}
      {activeTab === 'footer' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Settings className="h-4 w-4 text-violet-500" /> Footer</h3>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom du copyright</label>
                <Input value={form.copyrightName} onChange={e => update('copyrightName', e.target.value)}
                  placeholder="Ex: RoyalBot" />
                <p className="text-[10px] text-muted-foreground mt-1">AffichÃ© comme : Â© 2026 [Nom]. Tous droits rÃ©servÃ©s.</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Texte d'avertissement footer</label>
                <textarea value={form.footerText} onChange={e => update('footerText', e.target.value)}
                  rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Le trading comporte des risques..." />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Email de contact</label>
                <Input type="email" value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)}
                  placeholder="contact@royalbot.pro" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">TÃ©lÃ©phone</label>
                <Input value={form.contactPhone} onChange={e => update('contactPhone', e.target.value)}
                  placeholder="+33 1 23 45 67 89" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Globe className="h-4 w-4 text-violet-500" /> SEO & MÃ©tadonnÃ©es</h3>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Meta Title</label>
                <Input value={form.metaTitle} onChange={e => update('metaTitle', e.target.value)}
                  placeholder="RoyalBot â€” Trading AutomatisÃ©" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Meta Description</label>
                <textarea value={form.metaDescription} onChange={e => update('metaDescription', e.target.value)}
                  rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Plateforme de robots de trading automatisÃ©s..." />
                <p className="text-[10px] text-muted-foreground mt-1">{(form.metaDescription || '').length}/160 caractÃ¨res recommandÃ©s</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: Social Links */}
      {activeTab === 'social' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold flex items-center gap-2"><Globe className="h-4 w-4 text-violet-500" /> RÃ©seaux sociaux & Liens</h3>
            <p className="text-sm text-muted-foreground">Les liens remplis seront affichÃ©s dans le footer du site.</p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <label className="text-sm font-semibold mb-1 block text-emerald-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Lien Groupe WhatsApp / Assistance Utilisateurs
                </label>
                <Input value={form.whatsappLink} onChange={e => update('whatsappLink', e.target.value)}
                  placeholder="https://chat.whatsapp.com/xxx ou https://wa.me/..." className="bg-background" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ce lien alimente directement le bouton flottant d'assistance WhatsApp affiché pour tous les utilisateurs.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telegram</label>
                <Input value={form.telegramLink} onChange={e => update('telegramLink', e.target.value)}
                  placeholder="https://t.me/votre_canal" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Twitter / X</label>
                <Input value={form.twitterLink} onChange={e => update('twitterLink', e.target.value)}
                  placeholder="https://twitter.com/votre_compte" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Facebook</label>
                <Input value={form.facebookLink} onChange={e => update('facebookLink', e.target.value)}
                  placeholder="https://facebook.com/votre_page" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Instagram</label>
                <Input value={form.instagramLink} onChange={e => update('instagramLink', e.target.value)}
                  placeholder="https://instagram.com/votre_compte" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">YouTube</label>
                <Input value={form.youtubeLink} onChange={e => update('youtubeLink', e.target.value)}
                  placeholder="https://youtube.com/@votre_chaine" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB: Payments & Gateways */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Section USDT TRC-20 */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
                    ₮
                  </div>
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      Passerelle USDT TRC-20 (RÃ©seau TRON)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Paiements cryptos directs sur la blockchain TRON avec dÃ©tection automatique des dÃ©pÃ´ts.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs">
                  TRC-20 DÃ©tecteur
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Adresse Portefeuille TRON USDT (USDT_TRON_ADDRESS) *
                  </label>
                  <Input
                    value={form.usdtTronAddress}
                    onChange={e => update('usdtTronAddress', e.target.value)}
                    placeholder="ex: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t..."
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Adresse de rÃ©ception des paiements en USDT TRC-20 affichÃ©e aux clients.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center justify-between">
                    <span>ClÃ© API TronGrid (TRONGRID_API_KEY)</span>
                    <button
                      type="button"
                      onClick={() => toggleSecret('trongridApiKey')}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      {showSecrets.trongridApiKey ? 'Masquer' : 'Afficher'}
                    </button>
                  </label>
                  <Input
                    type={showSecrets.trongridApiKey ? 'text' : 'password'}
                    value={form.trongridApiKey}
                    onChange={e => update('trongridApiKey', e.target.value)}
                    placeholder="ex: a1b2c3d4-e5f6-7890-..."
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    ClÃ© TronGrid optionnelle pour accÃ©lÃ©rer la vÃ©rification des transactions TRON.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Binance Pay */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                    <Bitcoin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      Passerelle Binance Pay (Marchand Officiel)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      IntÃ©gration directe avec l'API marchand Binance Pay pour paiement instantanÃ© sans frais de gaz.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-xs">
                  Binance Pay API
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Binance Pay ID (BINANCE_PAY_ID)
                  </label>
                  <Input
                    value={form.binancePayId}
                    onChange={e => update('binancePayId', e.target.value)}
                    placeholder="ex: 123456789"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    ID Binance Pay affichÃ© comme identifiant de paiement direct aux utilisateurs.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Merchant ID (BINANCE_PAY_MERCHANT_ID)
                  </label>
                  <Input
                    value={form.binancePayMerchantId}
                    onChange={e => update('binancePayMerchantId', e.target.value)}
                    placeholder="ex: 987654321"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Identifiant de marchand enregistrÃ© sur le portail Binance Pay Merchant.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center justify-between">
                    <span>API Key Binance Pay (BINANCE_PAY_API_KEY)</span>
                    <button
                      type="button"
                      onClick={() => toggleSecret('binancePayApiKey')}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      {showSecrets.binancePayApiKey ? 'Masquer' : 'Afficher'}
                    </button>
                  </label>
                  <Input
                    type={showSecrets.binancePayApiKey ? 'text' : 'password'}
                    value={form.binancePayApiKey}
                    onChange={e => update('binancePayApiKey', e.target.value)}
                    placeholder="ex: binance_pay_api_key_..."
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    ClÃ© API publique du compte marchand Binance Pay.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center justify-between">
                    <span>Secret Key Binance Pay (BINANCE_PAY_SECRET_KEY)</span>
                    <button
                      type="button"
                      onClick={() => toggleSecret('binancePaySecretKey')}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      {showSecrets.binancePaySecretKey ? 'Masquer' : 'Afficher'}
                    </button>
                  </label>
                  <Input
                    type={showSecrets.binancePaySecretKey ? 'text' : 'password'}
                    value={form.binancePaySecretKey}
                    onChange={e => update('binancePaySecretKey', e.target.value)}
                    placeholder="ex: binance_pay_secret_..."
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    ClÃ© secrÃ¨te de signature d'ordres Binance Pay.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section SebPay Mobile Money */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-bold">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      Passerelle Mobile Money SebPay (BÃ©nin & Afrique)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Collecte et paiement Mobile Money instantanÃ© (MTN, Moov) pour l'Afrique.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs">
                  SebPay v1
                </Badge>
              </div>

              <div className="grid md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    URL API SebPay (SEBPAY_BASE_URL)
                  </label>
                  <Input
                    value={form.sebpayBaseUrl}
                    onChange={e => update('sebpayBaseUrl', e.target.value)}
                    placeholder="https://newapi.sebpay.bj/api/v1"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Endpoint API officiel SebPay.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Public Key SebPay (SEBPAY_PUBLIC_KEY)
                  </label>
                  <Input
                    value={form.sebpayPublicKey}
                    onChange={e => update('sebpayPublicKey', e.target.value)}
                    placeholder="ex: sebpay_pk_..."
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    ClÃ© publique SebPay fournie dans votre dashboard.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center justify-between">
                    <span>Secret Key SebPay (SEBPAY_SECRET_KEY)</span>
                    <button
                      type="button"
                      onClick={() => toggleSecret('sebpaySecretKey')}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      {showSecrets.sebpaySecretKey ? 'Masquer' : 'Afficher'}
                    </button>
                  </label>
                  <Input
                    type={showSecrets.sebpaySecretKey ? 'text' : 'password'}
                    value={form.sebpaySecretKey}
                    onChange={e => update('sebpaySecretKey', e.target.value)}
                    placeholder="ex: sebpay_sk_..."
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    ClÃ© secrÃ¨te SebPay pour signer et initier les collectes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: Broker Integration */}
      {activeTab === 'broker' && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <h3 className="font-bold flex items-center gap-2"><Bot className="h-4 w-4 text-violet-500" /> IntÃ©gration Brokers (MT4/MT5 & Deriv)</h3>
            <p className="text-sm text-muted-foreground">
              Configurez le lien d'inscription broker pour permettre aux utilisateurs de crÃ©er un compte MT4/MT5, ainsi que les paramÃ¨tres de connexion au Broker Deriv.
            </p>

            <div>
              <label className="text-sm font-medium mb-1.5 block">URL d'inscription broker (MT4/MT5)</label>
              <Input value={form.brokerSignupUrl} onChange={e => update('brokerSignupUrl', e.target.value)}
                placeholder="https://www.xm.com/register/real-account" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Lien pour la crÃ©ation de compte broker. Vous pouvez utiliser votre lien d'affiliation ici.
              </p>
            </div>

            <div className="pt-4 border-t space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-cyan-400">
                <Zap className="h-4 w-4" /> Connexion API Deriv (DERIV_APP_ID & DERIV_WS_URL)
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Deriv App ID (DERIV_APP_ID)</label>
                  <Input value={form.derivAppId} onChange={e => update('derivAppId', e.target.value)}
                    placeholder="1089" className="font-mono text-xs" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    ID d'application enregistrÃ© sur api.deriv.com (dÃ©faut: 1089).
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Deriv WebSocket URL (DERIV_WS_URL)</label>
                  <Input value={form.derivWsUrl} onChange={e => update('derivWsUrl', e.target.value)}
                    placeholder="wss://ws.binaryws.com/websockets/v3" className="font-mono text-xs" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Adresse WebSocket pour les cotations et l'exÃ©cution des bots Deriv.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom save button (mobile friendly) */}
      <div className="flex justify-end">
        <Button variant="gradient" onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Sauvegarder les modifications
        </Button>
      </div>
    </div>
  )
}

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
//  ADMIN ORDERS â€” Marketplace order management (confirm/reject payments)
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
export function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [stats, setStats] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => { fetchOrders(); fetchStats() }, [filter])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter) params.status = filter
      const { data } = await adminAPI.getOrders(params)
      setOrders(data.orders || [])
    } catch {}
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const { data } = await adminAPI.getOrderStats()
      setStats(data)
    } catch {}
  }

  const handleConfirm = async (id) => {
    setActionLoading(id)
    try {
      await adminAPI.confirmOrder(id, {})
      fetchOrders()
      fetchStats()
    } catch {}
    setActionLoading(null)
  }

  const handleReject = async (id) => {
    const reason = prompt('Raison du rejet :')
    if (!reason) return
    setActionLoading(id)
    try {
      await adminAPI.rejectOrder(id, { rejectionReason: reason })
      fetchOrders()
      fetchStats()
    } catch {}
    setActionLoading(null)
  }

  const statusColors = {
    pending: 'bg-amber-500/10 text-amber-500',
    confirmed: 'bg-green-500/10 text-green-500',
    rejected: 'bg-red-500/10 text-red-500',
    expired: 'bg-gray-500/10 text-gray-500',
  }

  const statusLabels = {
    pending: 'En attente',
    confirmed: 'ConfirmÃ©',
    rejected: 'RejetÃ©',
    expired: 'ExpirÃ©',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Commandes Marketplace</h2>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total commandes</p>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">En attente</p>
            <p className="text-2xl font-bold text-amber-500">{stats.pendingOrders}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">ConfirmÃ©es</p>
            <p className="text-2xl font-bold text-green-500">{stats.confirmedOrders}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Revenu total</p>
            <p className="text-2xl font-bold text-violet-500">${stats.totalRevenue?.toFixed(2)}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'pending', 'confirmed', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filter === f ? 'bg-violet-500 text-white border-violet-500' : 'border-border text-muted-foreground'
            }`}>
            {f === '' ? 'Toutes' : statusLabels[f]}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
      ) : orders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune commande</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Card key={order._id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${statusColors[order.paymentStatus]}`}>
                        {statusLabels[order.paymentStatus]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {order.paymentMethod === 'usdt_trc20' ? 'USDT TRC-20' : 'Binance Pay'}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {order.user?.firstName} {order.user?.lastName} â€” <span className="text-muted-foreground">{order.user?.email}</span>
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(order.items || []).map((item, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{item.name}</Badge>
                      ))}
                    </div>
                    {order.transactionHash && (
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono break-all">
                        TxID: {order.transactionHash}
                      </p>
                    )}
                    {order.binanceOrderId && (
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                        Binance ID: {order.binanceOrderId}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">${order.totalAmount?.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {order.paymentStatus === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="gradient" onClick={() => handleConfirm(order._id)}
                        disabled={actionLoading === order._id}>
                        {actionLoading === order._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                        Confirmer
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(order._id)}
                        disabled={actionLoading === order._id}>
                        <X className="h-3 w-3 mr-1" /> Rejeter
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
//  ADMIN SECURITY â€” IP/email binding logs, blocked attempts, user unblock
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
export function AdminSecurity() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [blockedOnly, setBlockedOnly] = useState(false)
  const [blockedCount, setBlockedCount] = useState(0)

  useEffect(() => { fetchLogs() }, [filter, blockedOnly])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = { limit: 100 }
      if (filter) params.action = filter
      if (blockedOnly) params.blocked = 'true'
      const { data } = await adminAPI.getSecurityLogs(params)
      setLogs(data.logs || [])
      setBlockedCount(data.blockedCount || 0)
    } catch {}
    setLoading(false)
  }

  const handleUnblock = async (userId) => {
    const newIp = prompt('Nouvelle IP autorisÃ©e (laisser vide pour reset) :')
    try {
      await adminAPI.unblockUserIp(userId, { newIp: newIp || undefined })
      fetchLogs()
      alert('Utilisateur dÃ©bloquÃ©.')
    } catch {}
  }

  const actionColors = {
    register: 'bg-blue-500/10 text-blue-500',
    login: 'bg-green-500/10 text-green-500',
    login_failed: 'bg-amber-500/10 text-amber-500',
    ip_blocked: 'bg-red-500/10 text-red-500',
    multi_account_blocked: 'bg-red-500/10 text-red-500',
    multi_ip_blocked: 'bg-red-500/10 text-red-500',
    suspicious: 'bg-orange-500/10 text-orange-500',
  }

  const actionLabels = {
    register: 'Inscription',
    login: 'Connexion',
    login_failed: 'Ã‰chec connexion',
    ip_blocked: 'IP bloquÃ©e',
    multi_account_blocked: 'Multi-compte bloquÃ©',
    multi_ip_blocked: 'Multi-IP bloquÃ©',
    suspicious: 'Suspect',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SÃ©curitÃ©</h2>
          <p className="text-sm text-muted-foreground">Logs de sÃ©curitÃ©, IP binding, tentatives bloquÃ©es</p>
        </div>
        <Badge variant="destructive" className="text-sm">{blockedCount} bloquÃ©(s)</Badge>
      </div>

      {/* Security rules info */}
      <Card className="border-amber-500/20">
        <CardContent className="p-4">
          <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" /> RÃ¨gles de sÃ©curitÃ© actives
          </h4>
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/30">
              <p className="font-medium text-red-500">1 IP = 1 Compte</p>
              <p className="text-muted-foreground">Impossible de crÃ©er plusieurs comptes depuis la mÃªme IP</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30">
              <p className="font-medium text-red-500">1 Email = Max 2 IPs</p>
              <p className="text-muted-foreground">Un compte ne peut Ãªtre utilisÃ© que depuis 2 IPs maximum</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/30">
              <p className="font-medium text-amber-500">Rate Limiting</p>
              <p className="text-muted-foreground">20 tentatives auth / 15min, 100 req / 15min</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'register', 'login', 'login_failed', 'multi_account_blocked', 'multi_ip_blocked'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filter === f ? 'bg-violet-500 text-white border-violet-500' : 'border-border text-muted-foreground'
            }`}>
            {f === '' ? 'Tous' : actionLabels[f] || f}
          </button>
        ))}
        <button onClick={() => setBlockedOnly(!blockedOnly)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            blockedOnly ? 'bg-red-500 text-white border-red-500' : 'border-border text-muted-foreground'
          }`}>
          BloquÃ©s uniquement
        </button>
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun log de sÃ©curitÃ©</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <Card key={log._id} className={log.blocked ? 'border-red-500/30' : ''}>
              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${actionColors[log.action] || 'bg-muted'}`}>
                    {actionLabels[log.action] || log.action}
                  </span>
                  {log.blocked && <Badge variant="destructive" className="text-[9px]">BLOQUÃ‰</Badge>}
                  <span className="text-xs font-mono text-muted-foreground">{log.ip}</span>
                  <span className="text-xs">{log.email || log.user?.email || 'â€”'}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(log.createdAt).toLocaleString('fr-FR')}
                  </span>
                  {log.blocked && log.user?._id && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleUnblock(log.user._id)}>
                      DÃ©bloquer
                    </Button>
                  )}
                </div>
                {log.details && (
                  <p className="text-[10px] text-muted-foreground mt-1">{log.details}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
//  ADMIN GROUPS â€” Create, manage, and delete private groups
// â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
export function AdminGroups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editGroup, setEditGroup] = useState(null)
  const [form, setForm] = useState({
    name: '', slug: '', description: '', platform: 'mt5',
    type: 'private', color: '#8b5cf6', rules: '',
    autoDeleteHours: 24, maxMembers: 500
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadGroups() }, [])

  const loadGroups = async () => {
    setLoading(true)
    try {
      const res = await groupAPI.getMyGroups()
      setGroups(res.data.groups || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', platform: 'mt5', type: 'private', color: '#8b5cf6', rules: '', autoDeleteHours: 24, maxMembers: 500 })
    setEditGroup(null)
    setShowCreate(false)
  }

  const handleCreate = async () => {
    if (!form.name || !form.slug) return
    setSaving(true)
    try {
      await groupAPI.createGroup(form)
      resetForm()
      await loadGroups()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
    setSaving(false)
  }

  const handleUpdate = async () => {
    if (!editGroup) return
    setSaving(true)
    try {
      await groupAPI.updateGroup(editGroup.slug, form)
      resetForm()
      await loadGroups()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur')
    }
    setSaving(false)
  }

  const openEdit = (g) => {
    setForm({
      name: g.name, slug: g.slug, description: g.description || '',
      platform: g.platform, type: g.type || 'private', color: g.color || '#8b5cf6',
      rules: g.rules || '', autoDeleteHours: g.autoDeleteHours || 24,
      maxMembers: g.maxMembers || 500
    })
    setEditGroup(g)
    setShowCreate(true)
  }

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const platformColors = {
    mt4: 'bg-violet-500', mt5: 'bg-blue-500', forex: 'bg-indigo-500', general: 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Groupes</h1>
          <p className="text-sm text-muted-foreground">CrÃ©ez et gÃ©rez les groupes privÃ©s Forex et MT4/MT5.</p>
        </div>
        <Button variant="gradient" onClick={() => { resetForm(); setShowCreate(true) }}>
          <Plus className="h-4 w-4 mr-1" /> CrÃ©er un groupe
        </Button>
      </div>

      {/* Create / Edit form */}
      {showCreate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editGroup ? 'Modifier le groupe' : 'Nouveau groupe'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nom du groupe *</label>
                <Input value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm(f => ({ ...f, name, slug: editGroup ? f.slug : generateSlug(name) }))
                  }}
                  placeholder="Signaux Forex VIP" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Slug *</label>
                <Input value={form.slug}
                  onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="signaux-forex-vip" disabled={!!editGroup} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Plateforme</label>
                <select value={form.platform} onChange={(e) => setForm(f => ({ ...f, platform: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border text-sm">
                  <option value="mt4">MT4</option>
                  <option value="mt5">MT5</option>
                  <option value="forex">Forex</option>
                  <option value="general">GÃ©nÃ©ral</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Type</label>
                <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border text-sm">
                  <option value="private">PrivÃ©</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Auto-delete (heures)</label>
                <Input type="number" value={form.autoDeleteHours} min={1} max={168}
                  onChange={(e) => setForm(f => ({ ...f, autoDeleteHours: parseInt(e.target.value) || 24 }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Max membres</label>
                <Input type="number" value={form.maxMembers} min={2} max={10000}
                  onChange={(e) => setForm(f => ({ ...f, maxMembers: parseInt(e.target.value) || 500 }))} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border text-sm resize-none" rows={2}
                  placeholder="Signaux de trading et analyses pour traders Forex..." />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">RÃ¨gles du groupe</label>
                <textarea value={form.rules}
                  onChange={(e) => setForm(f => ({ ...f, rules: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-background border text-sm resize-none" rows={2}
                  placeholder="1. Pas de spam\n2. Respectez les autres membres..." />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="gradient" onClick={editGroup ? handleUpdate : handleCreate} disabled={saving || !form.name || !form.slug}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editGroup ? 'Modifier' : 'CrÃ©er le groupe'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <h3 className="font-bold mb-1">Aucun groupe</h3>
            <p className="text-sm text-muted-foreground">CrÃ©ez votre premier groupe pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <Card key={g._id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${platformColors[g.platform] || 'bg-gray-500'} flex items-center justify-center shrink-0`}>
                    <Hash className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-sm">{g.name}</h3>
                      <Badge variant="outline" className="text-[8px]">{g.platform}</Badge>
                      <Badge variant={g.type === 'public' ? 'success' : 'secondary'} className="text-[8px]">{g.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{g.description || 'Pas de description'}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> {g.memberCount} membres
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> {g.messageCount || 0} messages
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Auto-delete {g.autoDeleteHours || 24}h
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(g)}>
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

