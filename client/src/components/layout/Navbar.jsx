import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import useStore from '../../store/useStore'
import { BinanceLogo } from '../binance/BinanceKit'
import {
  Menu, X, Sun, Moon, Bot, ChevronDown, User, LogOut,
  LayoutDashboard, Settings
} from 'lucide-react'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { isAuthenticated, user, logout, theme, toggleTheme, platformSettings } = useStore()
  const navigate = useNavigate()
  const pName = platformSettings?.platformName || 'RoyalBot'
  const pLogo = platformSettings?.logoUrl

  const navLinks = [
    { label: 'Accueil', href: '/' },
    { label: 'Robots Deriv & Crypto', href: '/robots' },
    { label: 'Marchés', href: '/markets' },
    { label: 'Tarifs & Essai 7j', href: '/pricing' },
    { label: 'Leaderboard', href: '/leaderboard' },
    { label: 'Blog', href: '/blog' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
  ]

  const handleLogout = () => {
    logout()
    navigate('/')
    setProfileOpen(false)
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          {pLogo ? (
            <img src={pLogo} alt={pName} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCD535]/10">
              <BinanceLogo size={22} />
            </div>
          )}
          <span className="text-xl font-bold gradient-text">{pName}</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link 
              key={link.href} 
              to={link.href} 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-accent transition-colors">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {isAuthenticated ? (
            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)} 
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <span className="hidden sm:block text-sm font-medium">{user?.firstName}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-popover p-2 shadow-lg">
                  <div className="px-3 py-2 border-b mb-2">
                    <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <Link to="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  <Link to="/dashboard/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent">
                    <Settings className="h-4 w-4" /> Paramètres
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-violet-500">
                      <Settings className="h-4 w-4" /> Admin Panel
                    </Link>
                  )}
                  <div className="border-t mt-2 pt-2">
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent text-destructive">
                      <LogOut className="h-4 w-4" /> Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Connexion</Link>
              </Button>
              <Button variant="gradient" size="sm" asChild>
                <Link to="/robots">Commencer</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background p-4">
          <div className="flex flex-col gap-3">
            {navLinks.map(link => (
              <Link 
                key={link.href} 
                to={link.href} 
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground py-2"
              >
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="flex flex-col gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Connexion</Link>
                </Button>
                <Button variant="gradient" size="sm" asChild>
                  <Link to="/robots" onClick={() => setMobileOpen(false)}>Commencer gratuitement</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
