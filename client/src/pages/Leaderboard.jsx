import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { leaderboardAPI } from '../lib/api'
import { Trophy, Medal, TrendingUp, Crown, User } from 'lucide-react'
import { formatCurrency, formatPercent } from '../lib/utils'
import SEO from '../components/SEO'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { visible: { transition: { staggerChildren: 0.06 } } }

export default function Leaderboard() {
  const [traders, setTraders] = useState([])
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const { data } = await leaderboardAPI.get({ period })
        setTraders(data.leaderboard)
      } catch {
        setTraders([
          { _id: '1', user: { firstName: 'Alex', lastName: 'T.', subscription: { plan: 'vip' } }, totalProfit: 2450.80, totalTrades: 580, winRate: 72.5 },
          { _id: '2', user: { firstName: 'Marie', lastName: 'K.', subscription: { plan: 'premium' } }, totalProfit: 1820.50, totalTrades: 420, winRate: 69.8 },
          { _id: '3', user: { firstName: 'David', lastName: 'M.', subscription: { plan: 'vip' } }, totalProfit: 1540.30, totalTrades: 350, winRate: 71.2 },
          { _id: '4', user: { firstName: 'Sara', lastName: 'L.', subscription: { plan: 'premium' } }, totalProfit: 1200.00, totalTrades: 300, winRate: 67.5 },
          { _id: '5', user: { firstName: 'Nico', lastName: 'B.', subscription: { plan: 'free' } }, totalProfit: 890.40, totalTrades: 250, winRate: 65.3 },
          { _id: '6', user: { firstName: 'Emma', lastName: 'P.', subscription: { plan: 'premium' } }, totalProfit: 750.20, totalTrades: 220, winRate: 64.1 },
          { _id: '7', user: { firstName: 'Lucas', lastName: 'R.', subscription: { plan: 'free' } }, totalProfit: 620.10, totalTrades: 180, winRate: 62.8 },
          { _id: '8', user: { firstName: 'Jade', lastName: 'F.', subscription: { plan: 'vip' } }, totalProfit: 510.90, totalTrades: 160, winRate: 68.0 },
        ])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [period])

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />
    if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{index + 1}</span>
  }

  const planBadge = (plan) => {
    if (plan === 'vip') return <Badge variant="vip" className="text-[10px]">VIP</Badge>
    if (plan === 'premium') return <Badge variant="premium" className="text-[10px]">PRO</Badge>
    return null
  }

  const periods = [
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: '90d', label: '90 jours' },
    { value: 'all', label: 'Tout' },
  ]

  return (
    <div className="min-h-screen py-20">
      <SEO title="Classement" path="/leaderboard" description="Classement des meilleurs traders sur RoyalBot. Performances, profits et statistiques en temps réel." />
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div className="text-center mb-12" initial="hidden" animate="visible" variants={stagger}>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Leaderboard</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-muted-foreground">
            Les meilleurs traders de la plateforme. Copiez leurs stratégies !
          </motion.p>
        </motion.div>

        {/* Period filter */}
        <div className="flex justify-center gap-2 mb-8">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Top 3 */}
        {traders.length >= 3 && (
          <motion.div className="grid grid-cols-3 gap-4 mb-8" initial="hidden" animate="visible" variants={stagger}>
            {[1, 0, 2].map(idx => {
              const t = traders[idx]
              if (!t) return null
              const isFirst = idx === 0
              return (
                <motion.div key={idx} variants={fadeUp} className={isFirst ? 'md:-mt-4' : 'mt-4'}>
                  <Card className={`text-center ${isFirst ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/10' : ''}`}>
                    <CardContent className="p-4 md:p-6">
                      <div className="mx-auto mb-3">
                        {getRankIcon(idx)}
                      </div>
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold mx-auto mb-2">
                        {t.user?.firstName?.[0]}{t.user?.lastName?.[0]}
                      </div>
                      <p className="font-semibold text-sm">{t.user?.firstName} {t.user?.lastName}</p>
                      <div className="mt-1 mb-2">{planBadge(t.user?.subscription?.plan)}</div>
                      <p className="text-lg font-bold text-green-500">{formatCurrency(t.totalProfit)}</p>
                      <p className="text-xs text-muted-foreground">{formatPercent(t.winRate)} win rate</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Full list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Classement complet</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {traders.map((t, i) => (
                  <motion.div
                    key={t._id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 flex justify-center">{getRankIcon(i)}</div>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {t.user?.firstName?.[0]}{t.user?.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{t.user?.firstName} {t.user?.lastName}</span>
                        {planBadge(t.user?.subscription?.plan)}
                      </div>
                      <p className="text-xs text-muted-foreground">{t.totalTrades} trades</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${t.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(t.totalProfit)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatPercent(t.winRate)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
