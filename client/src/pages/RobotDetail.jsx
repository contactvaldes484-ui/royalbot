import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import useStore from '../store/useStore'
import {
  ArrowLeft, ArrowRight, Shield, Zap, Crown, TrendingUp, Bot,
  BarChart3, Brain, Copy, Users, Bell, Check, Monitor, Smartphone,
  Lock, Globe, Play, ExternalLink, UserPlus, LogIn, Activity
} from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

const allRobots = [
  {
    slug: 'mt-lite', platform: 'binance',
    name: 'Trend Scalper', tier: 'Gratuit', icon: 'Zap',
    color: 'from-amber-400 to-yellow-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20',
    tagline: 'Scalper BTC & ETH — Spot Binance',
    description: "Robot scalper crypto automatique sur BTC et ETH. Exécuté sur notre serveur et connecté à ton compte Binance, contrôlé depuis n'importe quel appareil — mobile, tablette, PC.",
    contracts: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
    symbols: ['BTCUSDT', 'ETHUSDT'],
    strategy: ['Scalper EMA rapide/lente (5m)', 'Filtre RSI surachat/survente', 'Stop Loss dynamique (ATR)', 'Filtre volatilité', 'Protection perte journalière'],
    features: [
      { icon: 'Shield', text: 'Chiffrement AES-256-GCM des clés API Binance' },
      { icon: 'Smartphone', text: 'Contrôle complet depuis le téléphone mobile' },
      { icon: 'BarChart3', text: 'Dashboard temps réel — profits, trades, win rate' },
    ],
    stats: { winRate: '62%', avgProfit: '+$20/jour', maxDrawdown: '10%' },
  },
  {
    slug: 'mt-pro', platform: 'binance',
    name: 'AI SMC Institutional', tier: 'Pro', icon: 'TrendingUp',
    color: 'from-amber-500 to-orange-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20',
    tagline: 'Multi-crypto — Spot & Futures Binance',
    description: "Robot SMC professionnel multi-paires avec gestion du risque avancée, Trailing Stop et analyse multi-timeframe sur Binance Spot & Futures.",
    contracts: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
    strategy: ['SMC multi-indicateurs (5m & 15m)', 'Liquidity sweep + Order Blocks', 'Sizing risque % automatique', 'Trailing Stop automatique', 'Filtre volatilité & volume'],
    features: [
      { icon: 'Brain', text: 'Analyse SMC multi-timeframe pour signal renforcé' },
      { icon: 'Smartphone', text: 'Notifications push mobile à chaque trade' },
      { icon: 'Bell', text: 'Alertes Telegram et email en temps réel' },
    ],
    stats: { winRate: '67%', avgProfit: '+$55/jour', maxDrawdown: '15%' },
  },
  {
    slug: 'mt-elite', platform: 'binance',
    name: 'Quantum AI Multi-TF', tier: 'VIP', icon: 'Crown',
    color: 'from-yellow-500 to-amber-600', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20',
    tagline: 'IA Adaptative — Toutes cryptos Binance',
    description: "Robot IA multi-timeframe sur toutes les paires crypto Binance. Analyse multi-paires, gestion bankroll avancée (Kelly), Spot & Futures, copy trading intégré.",
    contracts: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'],
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'],
    strategy: ['IA adaptative multi-timeframe (5m/15m/1h)', 'Divergences RSI + Fibonacci', 'Sizing Kelly avec protection', 'Détection anomalies & volatilité', 'Stratégie personnalisée selon profil'],
    features: [
      { icon: 'Brain', text: 'IA adaptative — apprend des conditions de marché crypto' },
      { icon: 'Copy', text: 'Copy trading des robots VIP performers' },
      { icon: 'Users', text: "Consultation stratégie 1-on-1 avec l'équipe" },
    ],
    stats: { winRate: '72%', avgProfit: '+$130/jour', maxDrawdown: '20%' },
  },
]

const iconMap = { Zap, TrendingUp, Crown, Shield, BarChart3, Brain, Copy, Users, Bell, Monitor, Smartphone }

export default function RobotDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, platformSettings } = useStore()

  const robot = allRobots.find(r => r.slug === slug)
  if (!robot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Robot introuvable</h1>
          <Button variant="outline" asChild><Link to="/robots"><ArrowLeft className="h-4 w-4 mr-2" /> Retour aux robots</Link></Button>
        </div>
      </div>
    )
  }

  const Icon = iconMap[robot.icon] || Bot

  const binanceSignupUrl = 'https://accounts.binance.com/register'

  const handleUseRobot = () => {
    if (isAuthenticated) {
      navigate('/dashboard/binance')
    } else {
      navigate('/register?redirect=/dashboard/binance')
    }
  }

  const handleSignup = () => {
    window.open(binanceSignupUrl, '_blank')
  }

  const markets = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT',
    'AVAXUSDT', 'DOGEUSDT', 'LINKUSDT', 'DOTUSDT', 'MATICUSDT', 'ATOMUSDT',
  ]

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/robots"><ArrowLeft className="h-4 w-4 mr-2" /> Retour aux robots</Link>
        </Button>

        <motion.div className="max-w-5xl mx-auto" initial="hidden" animate="visible" variants={stagger}>
          {/* Hero */}
          <motion.div variants={fadeUp} className={`rounded-2xl p-8 md:p-12 ${robot.bgColor} border ${robot.borderColor} mb-8`}>
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${robot.color} flex items-center justify-center shrink-0`}>
                <Icon className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold">{robot.name}</h1>
                  <Badge variant="success" className="text-sm px-3 py-1">100% Gratuit</Badge>
                  <Badge variant="outline"><Monitor className="h-3 w-3 mr-1" /> Binance Spot & Futures</Badge>
                </div>
                <p className="text-lg text-muted-foreground mb-4">{robot.tagline}</p>
                <p className="text-muted-foreground mb-6">{robot.description}</p>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-4 rounded-xl bg-background/50 border">
                    <p className="text-2xl font-bold text-green-500">{robot.stats.winRate}</p>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-background/50 border">
                    <p className="text-2xl font-bold text-blue-500">{robot.stats.avgProfit}</p>
                    <p className="text-xs text-muted-foreground">Profit Moyen</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-background/50 border">
                    <p className="text-2xl font-bold text-yellow-500">{robot.stats.maxDrawdown}</p>
                    <p className="text-xs text-muted-foreground">Max Drawdown</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="gradient" size="lg" className="flex-1 text-base" onClick={handleUseRobot}>
                    <Play className="h-5 w-5 mr-2" />
                    {isAuthenticated ? 'Lancer ce robot' : "S'inscrire pour commencer"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleSignup}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Créer un compte Binance
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Strategy + Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.div variants={fadeUp}>
              <Card className="h-full">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-violet-500" /> Stratégie de Trading
                  </h3>
                  <ul className="space-y-3">
                    {robot.strategy.map((s, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>

                  <h4 className="font-medium text-sm mt-6 mb-3 text-muted-foreground">Contrats / Instruments</h4>
                  <div className="flex flex-wrap gap-2">
                    {robot.contracts.map((c, j) => (
                      <Badge key={j} variant="outline">{c}</Badge>
                    ))}
                  </div>

                  <h4 className="font-medium text-sm mt-4 mb-3 text-muted-foreground">Symboles supportés</h4>
                  <div className="flex flex-wrap gap-2">
                    {robot.symbols.map((s, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="h-full">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" /> Fonctionnalités
                  </h3>
                  <div className="space-y-5">
                    {robot.features.map((f, j) => {
                      const FIcon = iconMap[f.icon] || Shield
                      return (
                        <div key={j} className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <FIcon className="h-5 w-5 text-primary" />
                          </div>
                          <p className="text-sm mt-2">{f.text}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-8 p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-4 w-4 text-green-500" />
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">Sécurité & Contrôle</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vos clés API Binance sont chiffrées en AES-256-GCM (jamais affichées en clair, permission retrait désactivée). Le robot s'exécute sur nos serveurs sécurisés.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Markets */}
          <motion.div variants={fadeUp} className="mb-8">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-violet-500" />
                  Marchés disponibles après connexion
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Toutes les paires crypto USDT de Binance (Spot & Futures) seront accessibles.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {markets.map(m => (
                    <div key={m} className="px-3 py-2 rounded-lg border bg-muted/20 text-center">
                      <p className="text-xs font-semibold">{m}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA Bottom */}
          <motion.div variants={fadeUp} className="text-center py-8">
            <h2 className="text-2xl font-bold mb-3">Prêt à trader gratuitement ?</h2>
            <p className="text-muted-foreground mb-6">Aucun paiement requis. Commencez maintenant.</p>
            <Button variant="gradient" size="xl" onClick={handleUseRobot}>
              <Play className="h-5 w-5 mr-2" /> Utiliser {robot.name} gratuitement <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
