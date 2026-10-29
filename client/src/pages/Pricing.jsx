import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { subscriptionAPI, settingsAPI } from '../lib/api'
import useStore from '../store/useStore'
import SEO from '../components/SEO'
import {
  Check, Sparkles, Zap, TrendingUp, Crown, Building2, ArrowRight,
  Loader2, Star, Gift, ExternalLink, ShieldCheck, Clock
} from 'lucide-react'

const ICON_MAP = { Sparkles, Zap, TrendingUp, Crown, Building2 }

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

function formatPrice(amount) {
  if (amount === 0 || amount == null) return 'Gratuit'
  return `$${amount}`
}

function PlanCard({ plan, billingCycle, currentPlanSlug, onSelect, settings }) {
  const Icon = ICON_MAP[plan.icon] || Sparkles
  const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
  const monthlyEquivalent = billingCycle === 'yearly' && plan.priceYearly > 0
    ? (plan.priceYearly / 12).toFixed(0)
    : null
  const isCurrent = currentPlanSlug === plan.slug
  const isFree = price === 0
  const isDeriv = plan.category === 'deriv' || plan.slug?.startsWith('deriv')

  // Déterminer le lien de parrainage selon le plan
  const referralLink = isDeriv
    ? settings?.derivReferralLink
    : settings?.binanceReferralLink || settings?.bybitReferralLink

  const isAllFree = Boolean(settings?.allRobotsFree)
  const isPlanDisabled = plan.isActive === false || (settings?.subscriptionsEnabled === false && !isAllFree && !isFree)
  const canUseReferral = !isPlanDisabled && plan.referralEligible !== false && Boolean(referralLink)
  const canUsePaid = !isPlanDisabled && plan.allowPaidSubscription !== false && settings?.subscriptionsEnabled !== false
  const trialDays = settings?.freeTrialDays ?? (settings?.derivTrialDays || 7)
  const trialEnabled = settings?.freeTrialEnabled !== false

  return (
    <motion.div variants={fadeUp} className="h-full">
      <Card className={`relative h-full flex flex-col overflow-hidden transition-all hover:shadow-xl ${
        isPlanDisabled
          ? 'border-slate-800 opacity-70 bg-slate-950/60'
          : plan.popular
          ? 'border-emerald-500 border-2 shadow-lg shadow-emerald-500/10 scale-[1.02]'
          : 'border-slate-800'
      }`}>
        {plan.badge && !isPlanDisabled && (
          <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold py-1.5 text-center">
            <Star className="h-3 w-3 inline mr-1" /> {plan.badge}
          </div>
        )}

        {isPlanDisabled && (
          <div className="absolute top-0 right-0 left-0 bg-rose-900/80 text-rose-200 text-xs font-semibold py-1.5 text-center border-b border-rose-800/40">
            Désactivé par l'administration
          </div>
        )}

        <CardContent className={`p-6 flex flex-col h-full ${plan.badge || isPlanDisabled ? 'pt-12' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${plan.color || 'from-slate-500 to-slate-600'}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            {trialEnabled && trialDays > 0 && !isPlanDisabled && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" /> {trialDays}J Essai Offert
              </Badge>
            )}
            {isAllFree && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 100% Gratuit
              </Badge>
            )}
          </div>

          <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
          {plan.tagline && <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>}

          <div className="mb-5">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{isAllFree ? 'Gratuit' : formatPrice(price)}</span>
              {!isAllFree && price > 0 && (
                <span className="text-sm text-muted-foreground">
                  / {billingCycle === 'yearly' ? 'an' : 'mois'}
                </span>
              )}
            </div>
            {!isAllFree && monthlyEquivalent && (
              <p className="text-xs text-muted-foreground mt-1">
                ≈ ${monthlyEquivalent}/mois — économisez {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%
              </p>
            )}
          </div>

          <ul className="space-y-2.5 mb-6 flex-1">
            {(plan.highlights || []).map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">{h}</span>
              </li>
            ))}
          </ul>

          {/* Message si plan désactivé */}
          {isPlanDisabled && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-3 text-center">
              {plan.activationNotice || 'Ce plan est momentanément fermé aux nouvelles souscriptions.'}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-800">
            {/* OPTION 1 : GRATUIT VIA PARRAINAGE */}
            {canUseReferral && (
              <a
                href={referralLink}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 transition text-center"
              >
                <Gift className="w-3.5 h-3.5" />
                Débloquer Gratuitement (Parrainage)
              </a>
            )}

            {/* OPTION 2 : PAIEMENT MENSUEL / CLASSIQUE */}
            {canUsePaid ? (
              <Button
                onClick={() => onSelect(plan)}
                disabled={isCurrent || isPlanDisabled}
                className={`w-full ${plan.popular ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''}`}
                variant={plan.popular ? 'default' : (isFree ? 'outline' : 'default')}
                size="sm"
              >
                {isCurrent ? 'Plan actuel' : (isFree ? 'Commencer gratuitement' : `Abonnement ($${price}/mois)`)}
                {!isCurrent && <ArrowRight className="h-3.5 w-3.5 ml-1.5" />}
              </Button>
            ) : !isPlanDisabled ? (
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center text-[11px] text-slate-400">
                Paiement direct indisponible · Déblocage par parrainage uniquement
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function Pricing() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useStore()
  const [selectedCategory, setSelectedCategory] = useState('deriv') // 'deriv' par défaut pour le plan tout-en-un
  const [plans, setPlans] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState('monthly')

  const currentPlanSlug = user?.subscription?.plan || 'free'

  useEffect(() => {
    let mounted = true
    Promise.all([
      subscriptionAPI.getPlans(),
      settingsAPI.get().catch(() => ({ data: {} })),
    ])
      .then(([plansRes, setRes]) => {
        if (!mounted) return
        setPlans(plansRes?.data?.plans || [])
        setSettings(setRes?.data?.settings || null)
      })
      .catch((err) => {
        console.error('Erreur chargement:', err)
      })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const filteredPlans = useMemo(() => {
    return plans
      .filter((p) => {
        if (selectedCategory === 'deriv') {
          return p.category === 'deriv' || p.slug?.startsWith('deriv')
        }
        return p.category !== 'deriv' && !p.slug?.startsWith('deriv')
      })
      .sort((a, b) => (a.tier || 0) - (b.tier || 0))
  }, [plans, selectedCategory])

  const handleSelectPlan = (plan) => {
    if (!isAuthenticated) {
      navigate(`/register?redirect=/dashboard/subscription&plan=${plan.slug}`)
      return
    }
    navigate(`/dashboard/subscription?plan=${plan.slug}&cycle=${billingCycle}`)
  }

  const isAllFree = Boolean(settings?.allRobotsFree)

  return (
    <div className="min-h-screen py-20">
      <SEO title="Tarifs & Plans" path="/pricing" description="Choisissez votre formule de trading sur Deriv, Binance et Bybit. Gratuit via parrainage ou abonnement flexible." />

      <div className="container mx-auto px-4">
        <motion.div className="text-center max-w-3xl mx-auto mb-10" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="mb-4 px-3 py-1 text-emerald-400 border-emerald-500/40">
              <Sparkles className="h-3 w-3 mr-1" /> Formule Tout-en-Un : Deriv, Binance & Bybit
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-black mb-4">
            Un abonnement unique pour <span className="gradient-text">tous vos robots</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-base text-muted-foreground mb-6">
            Connectez votre compte Deriv pour trader 24/7 sur les indices synthétiques, ou liez vos clés API Binance & Bybit. Bénéficiez de 7 jours d'essai offerts ou débloquez l'accès à vie via notre lien partenaire.
          </motion.p>

          {isAllFree && (
            <motion.div variants={fadeUp} className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-semibold max-w-xl mx-auto flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Offre Spéciale : Tous les robots sont 100% gratuits actuellement !
            </motion.div>
          )}

          {/* SÉLECTEUR DE FORMULE */}
          <motion.div variants={fadeUp} className="flex justify-center mb-6">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <button
                onClick={() => setSelectedCategory('deriv')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition ${
                  selectedCategory === 'deriv'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" />
                Plan Deriv Brokers (Tout-en-Un)
              </button>
              <button
                onClick={() => setSelectedCategory('crypto')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition ${
                  selectedCategory === 'crypto'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Options Dédiées Binance / Bybit
              </button>
            </div>
          </motion.div>

          {/* Toggle Mensuel / Annuel */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/50 border">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-1.5 rounded-lg text-xs font-medium transition ${billingCycle === 'monthly' ? 'bg-background shadow font-bold' : 'text-muted-foreground'}`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-background shadow font-bold' : 'text-muted-foreground'}`}
            >
              Annuel
              <Badge variant="success" className="text-[10px] px-1.5 py-0">-17%</Badge>
            </button>
          </motion.div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : (
          <motion.div
            className={`grid grid-cols-1 md:grid-cols-2 ${
              selectedCategory === 'deriv' ? 'lg:grid-cols-2 max-w-4xl mx-auto' : 'lg:grid-cols-4'
            } gap-6 mb-16 items-stretch`}
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.slug}
                plan={plan}
                billingCycle={billingCycle}
                currentPlanSlug={currentPlanSlug}
                onSelect={handleSelectPlan}
                settings={settings}
              />
            ))}
          </motion.div>
        )}

        {/* EXPLICATION DU MODÈLE PARTENAIRE */}
        <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center mb-16">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white">Comment fonctionne l'accès 100% gratuit via parrainage ?</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">
            Créez votre compte sur Deriv, Binance ou Bybit en utilisant notre lien partenaire officiel. Lors de la connexion de vos clés API sur la plateforme, le système valide automatiquement votre affiliation et débloque votre plan gratuitement, sans aucun abonnement à payer !
          </p>
        </div>
      </div>
    </div>
  )
}
