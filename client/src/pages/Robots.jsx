import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { 
  Sparkles, Zap, TrendingUp, Crown, Building2, Check, ArrowRight,
  Monitor, Smartphone, Loader2, Star
} from 'lucide-react'
import SEO from '../components/SEO'
import { subscriptionAPI } from '../lib/api'
import useStore from '../store/useStore'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

const ICON_MAP = { Sparkles, Zap, TrendingUp, Crown, Building2 }

function formatPrice(amount) {
  if (amount === 0 || amount == null) return 'Gratuit'
  return `$${amount}`
}

export default function Robots() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useStore()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState('monthly')

  const currentPlanSlug = user?.subscription?.plan || 'free'

  useEffect(() => {
    let mounted = true
    subscriptionAPI.getPlans()
      .then(({ data }) => { if (mounted) setPlans(data.plans || []) })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const sortedPlans = useMemo(() => [...plans].sort((a, b) => (a.tier || 0) - (b.tier || 0)), [plans])

  const handleSelectPlan = (plan) => {
    if (!isAuthenticated) {
      navigate(`/register?redirect=/dashboard/subscription&plan=${plan.slug}`)
      return
    }
    navigate(`/dashboard/subscription?plan=${plan.slug}&cycle=${billingCycle}`)
  }

  return (
    <div className="min-h-screen py-20">
      <SEO title="Robots & Plans de Trading Crypto Binance" path="/robots" description="Découvrez nos 5 plans d'abonnement aux robots de trading crypto automatisés sur Binance (Spot & Futures) — du Gratuit à l'Institutionnel." />
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-10" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="mb-4 px-3 py-1">
              <Sparkles className="h-3 w-3 mr-1" /> 5 plans pour chaque profil
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-4">
            Nos <span className="gradient-text">Robots Crypto Binance</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Robots de trading crypto automatisés exécutés sur nos serveurs et connectés à ton compte Binance. Contrôlés depuis ton téléphone, tablette ou PC. <strong>Aucune installation requise.</strong>
          </motion.p>
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 mb-8">
            <Badge variant="outline" className="px-3 py-1">
              <Monitor className="h-3 w-3 mr-1" />
              <span className="text-amber-500 font-bold">Binance Spot</span> / <span className="text-amber-500 font-bold">Futures</span>
            </Badge>
            <Badge variant="success" className="px-3 py-1">
              <Smartphone className="h-3 w-3 mr-1" /> Mobile Ready
            </Badge>
          </motion.div>

          {/* Billing toggle */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/50 border">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-background shadow' : 'text-muted-foreground'}`}
            >Mensuel</button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-background shadow' : 'text-muted-foreground'}`}
            >
              Annuel
              <Badge variant="success" className="text-[10px] px-1.5 py-0">-17%</Badge>
            </button>
          </motion.div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedPlans.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Aucun plan disponible pour le moment.</div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 items-stretch"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {sortedPlans.map((plan) => {
              const Icon = ICON_MAP[plan.icon] || Sparkles
              const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
              const monthlyEquivalent = billingCycle === 'yearly' && plan.priceYearly > 0
                ? (plan.priceYearly / 12).toFixed(0)
                : null
              const isCurrent = plan.slug === currentPlanSlug
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
                          <span className="text-4xl font-bold">{formatPrice(price)}</span>
                          {price > 0 && (
                            <span className="text-sm text-muted-foreground">
                              / {billingCycle === 'yearly' ? 'an' : 'mois'}
                            </span>
                          )}
                        </div>
                        {monthlyEquivalent && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ≈ ${monthlyEquivalent}/mois
                          </p>
                        )}
                      </div>

                      <ul className="space-y-2.5 mb-6 flex-1">
                        {(plan.highlights || []).map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isCurrent}
                        className={`w-full ${popular ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90' : ''}`}
                        variant={popular ? 'default' : (isFree ? 'outline' : 'default')}
                      >
                        {isCurrent ? 'Plan actuel' : (isFree ? 'Commencer gratuitement' : 'Choisir ce plan')}
                        {!isCurrent && <ArrowRight className="h-4 w-4 ml-2" />}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Disclaimer */}
        <div className="mt-16 p-6 border rounded-lg bg-muted/30 text-center">
          <p className="text-sm text-muted-foreground">
            <strong>Avertissement :</strong> Le trading comporte des risques. Les performances passées ne garantissent pas les résultats futurs. Tradez de manière responsable.
          </p>
        </div>
      </div>
    </div>
  )
}
