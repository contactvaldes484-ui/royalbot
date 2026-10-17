import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { 
  Bot, Zap, TrendingUp, Crown, Shield, BarChart3, Users, 
  ArrowRight, Check, Star, Globe, Clock, Lock, Smartphone,
  Sparkles, Building2, Cpu, ChevronLeft, ChevronRight, ImageIcon, Package
} from 'lucide-react'
import { screenshotAPI, botAPI, subscriptionAPI, shopAPI } from '../lib/api'
import useStore from '../store/useStore'
import SEO from '../components/SEO'
import { BN, BinanceLogo, CryptoTicker } from '../components/binance/BinanceKit'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
}

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } }
}

// ── Animated counter component ──────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', prefix = '', duration = 2000 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  useEffect(() => {
    if (!inView) return
    const num = parseInt(target.replace(/[^0-9]/g, '')) || 0
    if (num === 0) { setCount(target); return }
    let start = 0
    const increment = num / (duration / 16)
    const timer = setInterval(() => {
      start += increment
      if (start >= num) { clearInterval(timer); setCount(num) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])

  return (
    <span ref={ref}>
      {prefix}{typeof count === 'number' ? count.toLocaleString() : count}{suffix}
    </span>
  )
}

// ── Animated trading chart (SVG) ────────────────────────────────────────────
function TradingChart() {
  const [points, setPoints] = useState([])
  const [candles, setCandles] = useState([])

  useEffect(() => {
    // Generate smooth uptrend line
    const pts = []
    let y = 120
    for (let i = 0; i <= 60; i++) {
      y += (Math.random() - 0.42) * 8
      y = Math.max(30, Math.min(170, y))
      pts.push({ x: i * 10, y })
    }
    setPoints(pts)

    // Generate candlesticks
    const c = []
    for (let i = 0; i < 30; i++) {
      const open = 60 + Math.random() * 80
      const close = open + (Math.random() - 0.4) * 30
      const high = Math.max(open, close) + Math.random() * 10
      const low = Math.min(open, close) - Math.random() * 10
      c.push({ x: i * 20 + 10, open, close, high, low, bullish: close > open })
    }
    setCandles(c)
  }, [])

  const linePath = points.length > 0
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
    : ''

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x},200 L ${points[0].x},200 Z`
    : ''

  return (
    <div className="relative w-full h-48 md:h-64 overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 border border-white/5">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        {[40, 80, 120, 160].map(y => (
          <line key={y} x1="0" y1={y} x2="100%" y2={y} stroke="white" strokeWidth="0.5" strokeDasharray="4,4" />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={`${(i + 1) * 8.33}%`} y1="0" x2={`${(i + 1) * 8.33}%`} y2="100%" stroke="white" strokeWidth="0.5" strokeDasharray="4,4" />
        ))}
      </svg>

      {/* Candlesticks */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
        {candles.map((c, i) => (
          <g key={i} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={c.bullish ? '#22c55e' : '#ef4444'} strokeWidth="1" opacity="0.5" />
            <rect x={c.x - 4} y={Math.min(c.open, c.close)} width="8" height={Math.abs(c.close - c.open) || 1}
              fill={c.bullish ? '#22c55e' : '#ef4444'} opacity="0.3" rx="1" />
          </g>
        ))}
      </svg>

      {/* Line chart overlay */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill="url(#areaGrad)" className="animate-chart-draw" />}
        {linePath && (
          <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            className="animate-chart-draw" />
        )}
        {points.length > 0 && (
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4"
            fill="#8b5cf6" className="animate-pulse">
            <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>

      {/* Live indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] text-green-400 font-medium">LIVE</span>
      </div>

      {/* Profit badge */}
      <div className="absolute bottom-3 right-3 bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg px-3 py-1.5">
        <span className="text-green-400 text-sm font-bold">+$1,247.50</span>
        <span className="text-green-400/60 text-[10px] ml-1">aujourd'hui</span>
      </div>
    </div>
  )
}

// ── Profit screenshots marquee carousel ─────────────────────────────────────
function ProfitMarquee({ screenshots }) {
  if (!screenshots || screenshots.length === 0) return null

  // Double the array for seamless loop
  const items = [...screenshots, ...screenshots]

  return (
    <section className="py-16 overflow-hidden bg-muted/30">
      <div className="container mx-auto px-4 mb-10">
        <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="mb-4 px-3 py-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" /> Résultats vérifiés
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-3">
            Nos traders <span className="gradient-text">gagnent chaque jour</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground max-w-xl mx-auto">
            Captures réelles de profits réalisés par nos utilisateurs avec les robots RoyalBot.
          </motion.p>
        </motion.div>
      </div>

      {/* Marquee row 1 — left to right */}
      <div className="relative mb-4">
        <div className="flex gap-4 animate-marquee hover:[animation-play-state:paused]">
          {items.map((s, i) => (
            <div key={`r1-${i}`} className="shrink-0 w-72 md:w-80">
              <div className="bg-background border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group">
                <div className="relative h-44 overflow-hidden">
                  <img src={s.imageData} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {s.profit && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
                      {s.profit}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold truncate">{s.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    {s.trader && <p className="text-xs text-muted-foreground">{s.trader}</p>}
                    <Badge variant="outline" className="text-[10px] capitalize">{s.platform}</Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee row 2 — right to left (if enough screenshots) */}
      {screenshots.length > 3 && (
        <div className="relative">
          <div className="flex gap-4 animate-marquee-reverse hover:[animation-play-state:paused]">
            {[...items].reverse().map((s, i) => (
              <div key={`r2-${i}`} className="shrink-0 w-72 md:w-80">
                <div className="bg-background border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] group">
                  <div className="relative h-44 overflow-hidden">
                    <img src={s.imageData} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {s.profit && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg">
                        {s.profit}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold truncate">{s.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      {s.trader && <p className="text-xs text-muted-foreground">{s.trader}</p>}
                      <Badge variant="outline" className="text-[10px] capitalize">{s.platform}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

const PLAN_ICON_MAP = { Sparkles, Zap, TrendingUp, Crown, Building2 }

// ── Section Binance : robots qui tradent la crypto sur Binance ──────────────
function BinanceSection() {
  const features = [
    { icon: BinanceLogo, title: 'Connexion Binance', text: 'Relie ton compte via clés API (lecture + trading). Tes fonds restent chez Binance.' },
    { icon: TrendingUp, title: 'Spot & Futures', text: 'Les robots tradent BTC, ETH, BNB, SOL… en automatique, jour et nuit.' },
    { icon: Shield, title: 'Clés chiffrées', text: 'AES-256-GCM. Le retrait est impossible : les robots ne peuvent que trader.' },
    { icon: Cpu, title: '15 robots IA', text: 'Stratégies SMC, scalping, swing, quant — chacune sur ses paires crypto.' },
  ]
  return (
    <section className="py-20" style={{ background: BN.bg }}>
      <div className="container mx-auto px-4">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: `${BN.yellow}1A`, color: BN.yellow }}>
              <BinanceLogo size={14} /> Trading crypto automatisé
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: BN.text }}>
              Nos robots tradent la <span style={{ color: BN.yellow }}>crypto sur Binance</span>
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: BN.sub }}>
              Connecte ton compte Binance et laisse nos robots IA trader le marché crypto pour toi —
              <strong style={{ color: BN.green }}> Spot</strong> et <strong style={{ color: BN.green }}> Futures</strong>, en temps réel, avec gestion du risque automatique.
            </p>
          </motion.div>

          {/* Ticker live = preuve "ça trade vraiment de la crypto" */}
          <motion.div variants={fadeUp} className="mb-8 flex justify-center">
            <div className="rounded-xl border px-4 py-3 inline-flex max-w-full" style={{ background: BN.surface, borderColor: BN.border }}>
              <CryptoTicker compact />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {features.map((f, i) => (
              <div key={i} className="p-5 rounded-xl border" style={{ background: BN.surface, borderColor: BN.border }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: `${BN.yellow}1A` }}>
                  <f.icon className="h-5 w-5" style={{ color: BN.yellow }} {...(f.icon === BinanceLogo ? { size: 22 } : {})} />
                </div>
                <p className="font-semibold mb-1" style={{ color: BN.text }}>{f.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: BN.sub }}>{f.text}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="text-center">
            <Link to="/dashboard/binance"
              className="inline-flex items-center gap-2 h-12 px-7 rounded-lg font-semibold transition-transform hover:scale-[1.02]"
              style={{ background: BN.yellow, color: '#0B0E11' }}>
              <BinanceLogo size={20} /> Connecter mon compte Binance <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs mt-3" style={{ color: BN.sub }}>Compatible Testnet (sans risque) et Live. Tes clés sont chiffrées.</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Section Marketplace (robots Forex MT4/MT5 à acheter) ──
function MarketplaceSection() {
  const [robots, setRobots] = useState([])
  useEffect(() => {
    shopAPI.getRobots({ sort: 'popular' }).then(r => setRobots((r.data.robots || []).slice(0, 4))).catch(() => {})
  }, [])
  if (!robots.length) return null
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="mb-4 px-3 py-1"><Package className="h-3 w-3 mr-1" /> Marketplace</Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-3">
            Robots <span className="gradient-text">Forex MT4 / MT5</span> à télécharger
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground max-w-2xl mx-auto">
            Achetez des Expert Advisors prêts à l'emploi (USDT ou Mobile Money). Après paiement, téléchargez le fichier et utilisez-le sur votre plateforme MT4/MT5.
          </motion.p>
        </motion.div>

        <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          {robots.map(robot => (
            <motion.div key={robot._id} variants={fadeUp}>
              <Card className="h-full hover:border-violet-500/30 transition-all">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: (robot.color || '#8b5cf6') + '20' }}>
                      <Bot className="h-5 w-5" style={{ color: robot.color || '#8b5cf6' }} />
                    </div>
                    <div className="flex gap-1">
                      {(robot.platforms || []).map(p => (
                        <span key={p} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium uppercase">{p}</span>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-bold text-base mb-1">{robot.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{robot.description}</p>
                  <div className="mt-auto pt-3 border-t flex items-center justify-between">
                    <span className="text-xl font-bold">${robot.price}</span>
                    <Button size="sm" variant="gradient" asChild>
                      <Link to={`/shop/robots/${robot.slug}`}>Détails <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="text-center mt-8">
          <Button variant="outline" asChild><Link to="/shop"><Package className="h-4 w-4 mr-2" /> Voir toute la marketplace</Link></Button>
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  const [screenshots, setScreenshots] = useState([])
  const [dbBots, setDbBots] = useState([])
  const [plans, setPlans] = useState([])
  const [billingCycle, setBillingCycle] = useState('monthly')
  const { platformSettings } = useStore()

  useEffect(() => {
    screenshotAPI.getAll().then(({ data }) => setScreenshots(data.screenshots || [])).catch(() => {})
    botAPI.getAll().then(({ data }) => setDbBots(data.bots || [])).catch(() => {})
    subscriptionAPI.getPlans().then(({ data }) => setPlans(data.plans || [])).catch(() => {})
  }, [])

  const sortedPlans = [...plans].sort((a, b) => (a.tier || 0) - (b.tier || 0))

  const ps = platformSettings || {}
  const heroBadge = ps.heroBadge || 'Plateforme Multi-Marchés : Binance, Bybit & Deriv'
  const heroTitle = ps.heroTitle || 'Le Trading Automatisé & Manuel Réinventé : Binance, Bybit & Deriv'
  const heroHighlight = ps.heroHighlight || 'Binance, Bybit & Deriv'
  const heroSubtitle = ps.heroSubtitle || 'La seule plateforme qui combine robots crypto Binance & Bybit (avec le Forex), trading manuel SmartTrader en direct, et robots illimités sur Deriv. 7 Jours d\'essai gratuit offerts sur Deriv !'

  const defaultStats = [
    { value: '10000', label: 'Traders actifs', suffix: '+', prefix: '' },
    { value: '2000000', label: 'Trades ex\u00e9cut\u00e9s', suffix: '+', prefix: '' },
    { value: '67', label: 'Win rate moyen', suffix: '%', prefix: '' },
    { value: '24/7', label: 'Trading automatique', suffix: '', prefix: '' },
  ]
  const stats = (ps.stats && ps.stats.length > 0) ? ps.stats : defaultStats

  const features = [
    { icon: Bot, title: 'Trading Automatisé', desc: 'Exécution automatique de trades crypto sur Binance 24/7.' },
    { icon: BarChart3, title: 'Analytics Avancés', desc: 'Dashboard complet avec equity curve, win rate et stats par contrat.' },
    { icon: Shield, title: 'Risk Management', desc: 'Stop loss, take profit, anti-loss protection et pause drawdown.' },
    { icon: Users, title: 'Copy Trading', desc: 'Copiez les meilleurs traders de la plateforme automatiquement.' },
    { icon: Globe, title: 'Multi Cryptos', desc: 'BTC, ETH, BNB, SOL, XRP… toutes les paires USDT sur Binance.' },
    { icon: Lock, title: 'Sécurité Maximale', desc: 'JWT Auth, 2FA, encryption des tokens, rate limiting.' },
    { icon: Clock, title: 'Temps Réel', desc: 'WebSocket pour les ticks, trades et notifications en temps réel.' },
    { icon: Smartphone, title: 'Mobile First', desc: 'Interface responsive optimisée pour mobile et desktop.' },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'RoyalBot',
    url: 'https://royalbot.pro',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: 'Plateforme de robots de trading crypto automatisés sur Binance — BTC, ETH, BNB, Spot & Futures.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Accès gratuit à tous les robots' },
  }

  return (
    <div className="min-h-screen">
      <SEO
        path="/"
        description="Plateforme de robots de trading crypto automatisés sur Binance (Spot & Futures). BTC, ETH, BNB, SOL. Trading automatique, signaux en direct, analytics avancés."
        jsonLd={jsonLd}
      />


      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-violet-500/5 to-transparent" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 pt-20 pb-32 relative">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: text */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.div variants={fadeUp}>
                <Badge variant="outline" className="mb-6 px-4 py-1.5">
                  <Star className="h-3 w-3 mr-1 text-yellow-500" /> {heroBadge}
                </Badge>
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                {heroTitle.split(heroHighlight).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <span className="gradient-text">{heroHighlight}</span>}
                  </span>
                ))}
              </motion.h1>
              
              <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-xl mb-8">
                {heroSubtitle}
              </motion.p>
              
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <Button variant="gradient" size="xl" asChild>
                  <Link to="/robots">
                    Commencer gratuitement <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="xl" asChild>
                  <Link to="/robots">Voir les robots</Link>
                </Button>
              </motion.div>

              <motion.p variants={fadeUp} className="mt-4 text-sm text-muted-foreground">
                100% gratuit. Tous les robots sont accessibles sans paiement.
              </motion.p>
            </motion.div>

            {/* Right: animated trading chart */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <TradingChart />
            </motion.div>
          </div>

          {/* Stats with animated counters */}
          <motion.div 
            className="max-w-4xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {stats.map((stat, i) => (
              <motion.div key={i} variants={fadeUp} className="text-center p-4 rounded-2xl bg-background/50 backdrop-blur border border-border/50 hover:border-violet-500/30 transition-all">
                <p className="text-3xl md:text-4xl font-bold gradient-text">
                  {stat.value === '24/7' ? '24/7' : (
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                  )}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SECTION MARKETING : CHOIX LIBRE DES 3 ACTEURS ── */}
      <section className="py-20 relative overflow-hidden bg-slate-950/60 border-y border-slate-800/80">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 mb-3 px-3 py-1">
              Liberté Totale de Marché
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black text-white">
              Choisissez votre <span className="gradient-text">Exchange ou Broker</span>
            </h2>
            <p className="text-slate-400 text-base mt-3">
              Connectez votre compte existant ou créez-en un avec nos liens partenaires pour débloquer l'accès 100% gratuit à nos robots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* CARTE 1 : BINANCE */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-500 transition-all shadow-xl flex flex-col justify-between group hover:scale-[1.02]">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
                  <span className="text-2xl font-black text-amber-400">BN</span>
                </div>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] mb-2">
                  Exchange #1 Mondial
                </Badge>
                <h3 className="text-2xl font-extrabold text-white mb-2">Binance Crypto</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Automatisez votre trading Crypto sur Spot & Futures. 16 robots algorithmiques avancés (Trend, SMC, Quant, Kelly).
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>BTC, ETH, SOL, BNB, XRP...</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Sécurité maximale (zéro permission de retrait)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Copy trading automatique disponible</span>
                  </li>
                </ul>
              </div>
              <Button asChild className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-5 rounded-xl">
                <Link to="/dashboard/binance">
                  Démarrer sur Binance <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>

            {/* CARTE 2 : BYBIT */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-blue-500/30 hover:border-blue-500 transition-all shadow-xl flex flex-col justify-between group hover:scale-[1.02]">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6">
                  <span className="text-2xl font-black text-blue-400">BY</span>
                </div>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] mb-2">
                  Crypto + Forex & Matières
                </Badge>
                <h3 className="text-2xl font-extrabold text-white mb-2">Bybit Multi-Marchés</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Mêmes robots ultra-performants que Binance, avec l'avantage exclusif de trader également le Forex et les métaux précieux.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Crypto Derivatives + Paires Forex (EURUSD...)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Or (XAUUSD) & Matières premières</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Levier dynamique jusqu'à 100x</span>
                  </li>
                </ul>
              </div>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-xl">
                <Link to="/dashboard/binance">
                  Démarrer sur Bybit <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </div>

            {/* CARTE 3 : DERIV */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border-2 border-emerald-500 hover:border-emerald-400 transition-all shadow-2xl shadow-emerald-500/10 flex flex-col justify-between group hover:scale-[1.03] relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-wider">
                7 Jours Offerts
              </div>
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
                  <span className="text-2xl font-black text-emerald-400">DV</span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] mb-2">
                  SmartTrader & Synthétiques
                </Badge>
                <h3 className="text-2xl font-extrabold text-white mb-2">Deriv Broker</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Trading manuel avec graphiques temps réel et robots automatiques illimités sur les indices synthétiques disponibles 24/7.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Contrats Digits (Over/Under, Even/Odd...)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Indices Volatility, Boom & Crash, Step</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>7 Jours d'essai gratuit sur n'importe quel compte</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <a
                  href={`https://oauth.deriv.com/oauth2/authorize?app_id=${encodeURIComponent(ps.derivAppId || '1089')}&l=FR&brand=deriv`}
                  className="w-full inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition text-sm"
                >
                  Tester Deriv (Essai Gratuit) <ArrowRight className="w-4 h-4 ml-1.5" />
                </a>
                <Link
                  to="/dashboard/deriv"
                  className="w-full inline-flex items-center justify-center text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold py-1"
                >
                  Déjà connecté ? Ouvrir le terminal Deriv →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans (subscription tiers) */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-10"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <Badge variant="outline" className="mb-4 px-3 py-1">
                <Star className="h-3 w-3 mr-1 text-yellow-500" /> 5 plans pour chaque profil
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
              Nos <span className="gradient-text">Plans Robots Crypto Binance</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Du Gratuit à l'Institutionnel — choisissez le plan qui correspond à vos ambitions de trading.
            </motion.p>

            <motion.div variants={fadeUp} className="inline-flex items-center gap-1 p-1 rounded-xl bg-background border">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-muted shadow' : 'text-muted-foreground'}`}
              >Mensuel</button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-muted shadow' : 'text-muted-foreground'}`}
              >
                Annuel
                <Badge variant="success" className="text-[10px] px-1.5 py-0">-17%</Badge>
              </button>
            </motion.div>
          </motion.div>

          {sortedPlans.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Chargement des plans...</div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 items-stretch max-w-7xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              {sortedPlans.map((plan) => {
                const Icon = PLAN_ICON_MAP[plan.icon] || Zap
                const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
                const isFree = price === 0
                const popular = plan.popular

                return (
                  <motion.div key={plan.slug} variants={fadeUp} className="h-full">
                    <Card className={`relative h-full flex flex-col overflow-hidden transition-all hover:shadow-xl ${popular ? 'border-violet-500 border-2 shadow-lg shadow-violet-500/10 scale-[1.02]' : ''}`}>
                      {plan.badge && (
                        <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-semibold py-1.5 text-center">
                          <Star className="h-3 w-3 inline mr-1" /> {plan.badge}
                        </div>
                      )}
                      <CardContent className={`p-6 flex flex-col h-full ${plan.badge ? 'pt-12' : ''}`}>
                        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${plan.color || 'from-slate-500 to-slate-600'} mb-4`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>

                        <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                        {plan.tagline && <p className="text-sm text-muted-foreground mb-4">{plan.tagline}</p>}

                        <div className="mb-5">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold">{isFree ? 'Gratuit' : `$${price}`}</span>
                            {price > 0 && (
                              <span className="text-sm text-muted-foreground">
                                /{billingCycle === 'yearly' ? 'an' : 'mois'}
                              </span>
                            )}
                          </div>
                        </div>

                        <ul className="space-y-2 mb-6 flex-1">
                          {(plan.highlights || []).slice(0, 5).map((h, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>

                        <Button
                          variant={popular ? 'gradient' : (isFree ? 'outline' : 'default')}
                          className="w-full"
                          asChild
                        >
                          <Link to={`/dashboard/subscription?plan=${plan.slug}&cycle=${billingCycle}`}>
                            {isFree ? 'Commencer gratuitement' : 'Choisir ce plan'}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          <motion.div
            className="text-center mt-10"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          >
            <Button variant="outline" asChild>
              <Link to="/pricing">Voir les détails complets <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
              Fonctionnalités puissantes
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour un trading automatisé performant.
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            {features.map((feature, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Binance crypto trading section */}
      <BinanceSection />

      {/* Marketplace robots MT4/MT5 */}
      <MarketplaceSection />

      {/* BackTest CTA Section */}
      <section className="py-16 bg-gradient-to-b from-violet-500/5 via-blue-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-8">
              <Badge variant="outline" className="mb-4 px-3 py-1">
                <Bot className="h-3 w-3 mr-1" /> Testez avant d'acheter
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Testez notre <span className="gradient-text">Robot IA</span> gratuitement
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Exécutez un backtest crypto en temps réel sur données Binance avec notre version démo. Aucun paiement requis.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-background/50">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Mode Démo</p>
                  <p className="text-xs text-muted-foreground">Trading sans risque, données simulées</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-background/50">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Binance Spot & Futures</p>
                  <p className="text-xs text-muted-foreground">BTC, ETH, BNB, SOL — paires USDT</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-background/50">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Cpu className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold">4 Stratégies IA</p>
                  <p className="text-xs text-muted-foreground">Scalper, MACD, RSI, Multi-TF</p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="text-center">
              <Button variant="gradient" size="xl" asChild>
                <Link to="/backtest">
                  Lancer un Backtest gratuit <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Aucun compte requis. Résultats instantanés.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Profit Screenshots Marquee */}
      <ProfitMarquee screenshots={screenshots} />

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-purple-500/10 rounded-2xl p-12 border">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à automatiser votre trading ?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Rejoignez des milliers de traders qui utilisent RoyalBot pour générer des profits automatiquement.
            </p>
            <Button variant="gradient" size="xl" asChild>
              <Link to="/robots">
                Commencer gratuitement <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
