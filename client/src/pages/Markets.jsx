import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import {
  Activity, ArrowRight, Globe, TrendingUp, Coins, LineChart, BarChart3
} from 'lucide-react'
import SEO from '../components/SEO'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

const marketGroups = [
  {
    title: 'Major Crypto',
    icon: Coins,
    color: 'from-amber-500 to-yellow-500',
    pairs: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'],
  },
  {
    title: 'Altcoins',
    icon: TrendingUp,
    color: 'from-amber-400 to-orange-500',
    pairs: ['ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'MATICUSDT', 'ATOMUSDT'],
  },
  {
    title: 'DeFi & Layer 1',
    icon: LineChart,
    color: 'from-yellow-500 to-amber-600',
    pairs: ['UNIUSDT', 'AAVEUSDT', 'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT'],
  },
  {
    title: 'Binance Futures (perp)',
    icon: BarChart3,
    color: 'from-amber-500 to-yellow-600',
    pairs: ['BTCUSDT.P', 'ETHUSDT.P', 'SOLUSDT.P', 'BNBUSDT.P', 'XRPUSDT.P'],
  },
  {
    title: 'Memecoins & Tendances',
    icon: Globe,
    color: 'from-yellow-400 to-amber-500',
    pairs: ['DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'WIFUSDT', 'FLOKIUSDT'],
  },
]

export default function Markets() {
  return (
    <div className="min-h-screen py-20">
      <SEO
        title="Marchés Crypto Binance"
        path="/markets"
        description="Toutes les paires crypto disponibles sur Binance Spot & Futures : BTC, ETH, BNB, SOL, altcoins, DeFi et perpétuels."
      />
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-12" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="mb-4 px-3 py-1">
              <Activity className="h-3 w-3 mr-1" /> Binance Spot & Futures
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-4">
            Marchés <span className="gradient-text">crypto disponibles</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nos robots tradent plus de 100+ paires crypto directement sur Binance : Major Crypto, Altcoins, DeFi, Futures perpétuels et tendances.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {marketGroups.map((group) => (
            <motion.div key={group.title} variants={fadeUp}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${group.color} mb-4`}>
                    <group.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{group.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {group.pairs.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="text-center"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <Button asChild size="lg" variant="gradient">
            <Link to="/dashboard/binance">
              Connecter mon compte Binance
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
