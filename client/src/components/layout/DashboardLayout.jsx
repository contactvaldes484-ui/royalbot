import React, { useState, Suspense } from 'react'
import { Link, useLocation, Outlet, Navigate } from 'react-router-dom'
import useStore from '../../store/useStore'
import { BinanceLogo } from '../binance/BinanceKit'
import {
  LayoutDashboard, Bot, BarChart3, History, Wallet, Settings,
  CreditCard, Users, ChevronLeft, ChevronRight, LogOut, Crown,
  Sun, Moon, Monitor, BookOpen, MessageCircle, Copy, DollarSign, Brain, Radar, Bell, Bitcoin, Zap
} from 'lucide-react'

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, isAuthenticated, logout, theme, toggleTheme, platformSettings } = useStore()
  const location = useLocation()
  const pName = platformSettings?.platformName || 'RoyalBot'
  const pLogo = platformSettings?.logoUrl

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isDerivConnected =
    localStorage.getItem('deriv_oauth_connected') === 'true' ||
    Boolean(user?.derivAccount) ||
    Boolean(user?.subscription?.plan?.startsWith('deriv')) ||
    user?.tradingPreferences?.primaryBroker === 'deriv'

  // Si l'utilisateur est connecté via Deriv ou a souscrit à un plan Deriv, masquer Binance & Bybit
  const showBinance = isAdmin || !isDerivConnected

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Zap, label: 'Deriv SmartTrader', href: '/dashboard/deriv', highlight: true },
    showBinance ? { icon: Bitcoin, label: 'Binance & Bybit', href: '/dashboard/binance', highlight: true } : null,
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
    { icon: History, label: 'Historique', href: '/dashboard/trades' },
    { icon: MessageCircle, label: 'Groupes', href: '/dashboard/groups', highlight: true },
    isAdmin ? { icon: Bot, label: 'Gestion Marketplace (Admin)', href: '/admin/bots', highlight: true } : null,
    { icon: CreditCard, label: 'Mon accès', href: '/dashboard/subscription' },
    { icon: Settings, label: 'Paramètres', href: '/dashboard/settings' },
    { icon: BookOpen, label: 'Guide', href: '/dashboard/guide', highlight: false },
    isAdmin ? { icon: Crown, label: 'Administration', href: '/admin', highlight: true } : null,
  ].filter(Boolean)

  const isActive = (href) => {
    if (href === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} flex flex-col border-r bg-card transition-all duration-300 hidden md:flex`}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2">
              {pLogo ? (
                <img src={pLogo} alt={pName} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCD535]/10">
                  <BinanceLogo size={22} />
                </div>
              )}
              <span className="text-lg font-bold gradient-text">{pName}</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-accent">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* User info */}
        <div className={`p-4 border-b ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                <div className="flex items-center gap-1">
                  <Crown className="h-3 w-3 text-violet-500" />
                  <span className="text-xs text-muted-foreground">Accès gratuit</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary font-medium'
                  : item.highlight
                  ? 'text-blue-500 hover:bg-blue-500/10'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              } ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="flex-1">{item.label}</span>
              )}
              {!collapsed && item.highlight && (
                <span className="text-[9px] bg-blue-500 text-white px-1 py-0.5 rounded font-bold">NEW</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t space-y-1">
          {platformSettings?.whatsappLink && (
            <a
              href={platformSettings.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-emerald-500 hover:bg-emerald-500/10 transition-colors ${collapsed ? 'justify-center px-2' : ''}`}
              title="Groupe WhatsApp Support"
            >
              <MessageCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              {!collapsed && <span className="font-semibold text-xs text-emerald-500">Groupe WhatsApp</span>}
            </a>
          )}
          <button onClick={toggleTheme} className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent ${collapsed ? 'justify-center px-2' : ''}`}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsed && <span>Thème</span>}
          </button>
          <button onClick={logout} className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-accent ${collapsed ? 'justify-center px-2' : ''}`}>
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden flex h-14 items-center justify-between px-4 border-b bg-card">
          <Link to="/" className="flex items-center gap-2">
            {pLogo ? (
              <img src={pLogo} alt={pName} className="h-7 w-7 rounded-lg object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FCD535]/10">
                <BinanceLogo size={18} />
              </div>
            )}
            <span className="font-bold gradient-text">{pName}</span>
          </Link>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card flex justify-around py-2">
          {[menuItems[0], menuItems[1], menuItems[2], menuItems[3], menuItems[4]].map(item => item && (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 text-xs ${
                isActive(item.href) ? 'text-primary' : item.highlight ? 'text-blue-500' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 md:p-6 pb-20 md:pb-6">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
