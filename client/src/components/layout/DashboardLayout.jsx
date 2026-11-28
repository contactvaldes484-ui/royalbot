import React, { useState, useRef, useEffect, Suspense } from 'react'
import { Link, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom'
import useStore from '../../store/useStore'
import { BinanceLogo } from '../binance/BinanceKit'
import PWAInstallBanner from '../PWAInstallBanner'
import BackButton from '../ui/BackButton'
import {
  LayoutDashboard, Bot, BarChart3, History, Wallet, Settings,
  CreditCard, Users, ChevronLeft, ChevronRight, LogOut, Crown,
  Sun, Moon, Monitor, BookOpen, MessageCircle, Copy, DollarSign, Brain, Activity, Bell, Bitcoin, Zap, Send
} from 'lucide-react'

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, isAuthenticated, logout, theme, toggleTheme, language, toggleLanguage, platformSettings } = useStore()
  const location = useLocation()
  const navigate = useNavigate()
  const loggedOutRef = useRef(false)
  const pName = platformSettings?.platformName || 'RoyalBot'
  const pLogo = platformSettings?.logoUrl

  useEffect(() => {
    if (isAuthenticated) {
      loggedOutRef.current = false
      sessionStorage.removeItem('royalbot_logged_out')
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    loggedOutRef.current = true
    sessionStorage.setItem('royalbot_logged_out', '1')
    logout()
    navigate('/', { replace: true })
  }

  if (!isAuthenticated) {
    const goHome = loggedOutRef.current || sessionStorage.getItem('royalbot_logged_out') === '1'
    return <Navigate to={goHome ? '/' : '/login'} replace />
  }

  const isOwner = user?.email?.toLowerCase().trim() === 'valdeslando15@gmail.com'
  const isAdmin = isOwner || user?.role === 'admin' || user?.role === 'super_admin'

  const aiScannerUrl = platformSettings?.aiScannerUrl || 'https://tradingkit.com/'

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Bot, label: 'Robots de Trading', href: '/dashboard/bots', highlight: true },
    { icon: Zap, label: 'Deriv SmartTrader', href: '/dashboard/deriv', highlight: true },
    { icon: Bitcoin, label: 'Binance & Bybit', href: '/dashboard/binance' },
    { icon: Activity, label: 'Scanner IA', href: aiScannerUrl, external: true, highlight: true },
    { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics' },
    { icon: History, label: 'Historique', href: '/dashboard/trades' },
    { icon: MessageCircle, label: 'Groupes', href: '/dashboard/groups' },
    isAdmin ? { icon: Bot, label: 'Marketplace (Admin)', href: '/admin/bots', highlight: true } : null,
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
      <aside className={`${collapsed ? 'w-16' : 'w-64'} flex flex-col border-r border-indigo-400/20 bg-[#090D24]/95 backdrop-blur-xl transition-all duration-300 hidden md:flex`}>
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
          {menuItems.map(item => {
            if (item.external) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 ${collapsed ? 'justify-center px-2' : ''}`}
                  title={item.label}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-cyan-400" />
                  {!collapsed && (
                    <span className="flex-1 font-medium">{item.label}</span>
                  )}
                  {!collapsed && (
                    <span className="text-[9px] bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-1.5 py-0.5 rounded font-extrabold uppercase">
                      IA
                    </span>
                  )}
                </a>
              )
            }
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#4F46E5] text-white font-semibold shadow-lg shadow-violet-600/30'
                    : item.highlight
                    ? 'text-violet-300 hover:bg-indigo-500/15 hover:text-white'
                    : 'text-slate-300/80 hover:bg-indigo-500/10 hover:text-white'
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
            )
          })}
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
          {platformSettings?.telegramLink && (
            <a
              href={platformSettings.telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-sky-400 hover:bg-sky-500/10 transition-colors ${collapsed ? 'justify-center px-2' : ''}`}
              title="Canal / Groupe Telegram"
            >
              <Send className="h-4 w-4 text-sky-400 shrink-0" />
              {!collapsed && <span className="font-semibold text-xs text-sky-400">Rejoindre Telegram</span>}
            </a>
          )}
          <button onClick={toggleLanguage} className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-accent ${collapsed ? 'justify-center px-2' : ''}`}>
            <span>{language === 'en' ? '🇬🇧' : '🇫🇷'}</span>
            {!collapsed && <span>{language === 'en' ? 'English (EN)' : 'Français (FR)'}</span>}
          </button>
          <button onClick={handleLogout} className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-accent ${collapsed ? 'justify-center px-2' : ''}`}>
            <i className="fa-solid fa-right-from-bracket w-4 text-center" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden flex h-14 items-center justify-between px-3 border-b bg-card gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            {pLogo ? (
              <img src={pLogo} alt={pName} className="h-7 w-7 rounded-lg object-cover" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FCD535]/10">
                <BinanceLogo size={18} />
              </div>
            )}
            <span className="font-bold gradient-text">{pName}</span>
          </Link>
          <div className="flex items-center gap-1.5">
            {platformSettings?.telegramLink && (
              <a
                href={platformSettings.telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded-md border border-sky-500/40 bg-sky-500/10 text-sky-400 text-xs font-bold flex items-center gap-1 hover:bg-sky-500/20 transition"
                title="Rejoindre notre Telegram"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Telegram</span>
              </a>
            )}
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 rounded-md border border-border text-xs font-bold hover:bg-accent"
            >
              {language === 'en' ? '🇬🇧 EN' : '🇫🇷 FR'}
            </button>
            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="px-2.5 py-1 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs font-bold flex items-center gap-1 hover:bg-destructive/20 transition"
            >
              <i className="fa-solid fa-right-from-bracket" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-indigo-400/20 bg-[#090D24]/95 backdrop-blur-xl flex justify-around py-2">
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
          <div className="flex items-center justify-between gap-2 mb-3">
            <BackButton fallback="/dashboard" />
            {platformSettings?.telegramLink && (
              <a
                href={platformSettings.telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-400 hover:bg-sky-500/25 text-xs font-bold transition shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Rejoindre Telegram</span>
              </a>
            )}
          </div>
          <PWAInstallBanner />
          <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
