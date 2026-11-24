import React, { useEffect, useState, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { subscriptionAPI, settingsAPI } from '../lib/api'
import { startDerivOAuth } from '../lib/derivOAuth'
import useStore from '../store/useStore'
import SEO from '../components/SEO'
import {
  Check, Sparkles, Zap, TrendingUp, Crown, Building2, ArrowRight,
  Loader2, Star, Gift, ExternalLink, ShieldCheck, Clock
} from 'lucide-react'

const ICON_MAP = { Sparkles, Zap, TrendingUp, Crown, Building2 }

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

function formatPrice(amount, currency = 'XAF') {
  if (amount === 0 || amount == null) return 'Gratuit'
  if (currency === 'USD') return `$${amount}`
  return `${Number(amount).toLocaleString('fr-FR')} ${currency}`
}

function PlanCard({ plan, billingCycle, currentPlanSlug, onSelect, settings }) {
  const Icon = ICON_MAP[plan.icon] || Sparkles
  const annualDiscount = settings?.annualDiscountPercent !== undefined ? Number(settings.annualDiscountPercent) : 10
  const computedYearly = plan.priceYearly > 0
    ? plan.priceYearly
    : Math.round((plan.priceMonthly || 0) * 12 * (1 - Math.max(0, annualDiscount) / 100))
  const price = billingCycle === 'yearly' ? computedYearly : plan.priceMonthly
  const monthlyEquivalent = billingCycle === 'yearly' && price > 0
    ? (price / 12).toFixed(0)
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
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold">{isAllFree ? 'Gratuit' : formatPrice(price, plan.currency || 'XAF')}</span>
              {!isAllFree && price > 0 && (
                <span className="text-sm text-muted-foreground">
                  / {billingCycle === 'yearly' ? 'an' : 'mois'}
                </span>
              )}
            </div>
            {!isAllFree && monthlyEquivalent && (
              <p className="text-xs text-muted-foreground mt-1">
                ≈ {formatPrice(monthlyEquivalent, plan.currency || 'XAF')}/mois
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
                {isCurrent ? 'Plan actuel' : (isFree ? 'Commencer gratuitement' : `Abonnement (${formatPrice(price, plan.currency || 'XAF')}/${billingCycle === 'yearly' ? 'an' : 'mois'})`)}
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
  const location = useLocation()
  const isDerivConnectFlow = new URLSearchParams(location.search).get('deriv_connect') === '1' || sessionStorage.getItem('deriv_connect_pending') === '1'
  const { user, isAuthenticated } = useStore()
  const [selectedCategory, setSelectedCategory] = useState('deriv') // 'deriv' par défaut pour le plan tout-en-un
  const [plans, setPlans] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [checkoutPlan, setCheckoutPlan] = useState(null)
  const [payForm, setPayForm] = useState({ country: 'CM', operator: 'ORANGE', phoneNumber: '', email: '' })
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState('')
  const [payStep, setPayStep] = useState('form') // 'form' | 'pending' | 'paid'
  const [paySession, setPaySession] = useState(null)

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
    if (isAuthenticated) {
      const targetUrl = `/dashboard/subscription?plan=${plan.slug}&cycle=${billingCycle}&method=ikeepay${isDerivConnectFlow ? '&deriv_connect=1' : ''}`
      navigate(targetUrl)
      return
    }
    setCheckoutPlan(plan)
    setPayStep('form')
    setPayError('')
    setPaySession(null)
  }

  const handleGuestIkeepaySubmit = async (e) => {
    e.preventDefault()
    if (!checkoutPlan) return
    setPayLoading(true)
    setPayError('')
    try {
      const { data } = await subscriptionAPI.publicIkeepay({
        planSlug: checkoutPlan.slug,
        billingCycle,
        country: payForm.country,
        operator: payForm.operator,
        phoneNumber: payForm.phoneNumber,
        customerEmail: payForm.email,
        redirectUrl: `${window.location.origin}/pricing?deriv_connect=1`,
      })
      if (data?.orderId) {
        localStorage.setItem('royalbot_paid_order', data.orderId)
      }
      setPaySession(data)
      setPayStep('pending')
    } catch (err) {
      setPayError(err.response?.data?.error || err.message || 'Erreur lors de l\'initialisation du paiement iKeePay.')
    } finally {
      setPayLoading(false)
    }
  }

  const handleVerifyGuestPayment = async () => {
    if (!paySession?.orderId) return
    setPayLoading(true)
    setPayError('')
    try {
      const { data } = await subscriptionAPI.verifyPublicIkeepay({
        orderId: paySession.orderId,
        subscriptionId: paySession.subscriptionId,
      })
      if (data?.confirmed) {
        localStorage.setItem('royalbot_paid_order', paySession.orderId)
        sessionStorage.setItem('deriv_plan_paid', '1')
        sessionStorage.removeItem('deriv_connect_pending')
        setPayStep('paid')
      } else {
        setPayError('Paiement encore en attente de confirmation. Validez sur votre téléphone puis réessayez.')
      }
    } catch (err) {
      setPayError(err.response?.data?.error || err.message)
    } finally {
      setPayLoading(false)
    }
  }

  const isAllFree = Boolean(settings?.allRobotsFree)

  return (
    <div className="min-h-screen py-20">
      <SEO title="Tarifs & Plans" path="/pricing" description="Choisissez votre formule de trading sur Deriv, Binance et Bybit. Gratuit via parrainage ou abonnement flexible." />

      <div className="container mx-auto px-4">
        {isDerivConnectFlow && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-950 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-emerald-300">
                Étape 1/2 : Choisissez votre plan payant pour continuer votre connexion Deriv
              </p>
              <p className="text-xs text-slate-300 mt-0.5">
                Sélectionnez et payez un plan ci-dessous (ou utilisez votre accès partenaire) puis poursuivez vers Deriv OAuth.
              </p>
            </div>
            {(user?.subscription?.isActive && user?.subscription?.plan !== 'free') && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                onClick={() => {
                  sessionStorage.removeItem('deriv_connect_pending')
                  startDerivOAuth(settings?.derivAppId, { skipPlanGate: true })
                }}
              >
                Continuer la connexion Deriv <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        )}

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

          {/* SÉLECTEUR DE FORMULE — Uniquement Deriv Brokers (Binance/Bybit masqué) */}
          <motion.div variants={fadeUp} className="flex justify-center mb-6">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
              <button
                onClick={() => setSelectedCategory('deriv')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30"
              >
                <Zap className="w-4 h-4" />
                Plan Deriv Brokers (Tout-en-Un)
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
              {(settings?.annualDiscountPercent ?? 10) > 0 && (
                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                  -{settings?.annualDiscountPercent ?? 10}%
                </Badge>
              )}
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

      {/* Modal Paiement iKeePay Direct (Pré-connexion Deriv) */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {payStep === 'paid' ? 'Paiement Confirmé !' : `Paiement iKeePay — ${checkoutPlan.name}`}
                </h3>
                <p className="text-xs text-emerald-400 font-semibold">
                  {formatPrice(
                    billingCycle === 'yearly'
                      ? (checkoutPlan.priceYearly > 0 ? checkoutPlan.priceYearly : Math.round((checkoutPlan.priceMonthly || 0) * 12 * (1 - Math.max(0, settings?.annualDiscountPercent ?? 10) / 100)))
                      : checkoutPlan.priceMonthly,
                    checkoutPlan.currency || 'XAF'
                  )} / {billingCycle === 'yearly' ? 'an' : 'mois'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            {payError && (
              <div className="p-2.5 rounded-lg bg-rose-950 border border-rose-500/40 text-xs text-rose-300">
                {payError}
              </div>
            )}

            {payStep === 'form' && (
              <form onSubmit={handleGuestIkeepaySubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Pays</label>
                    <select
                      value={payForm.country}
                      onChange={e => setPayForm({ ...payForm, country: e.target.value })}
                      className="w-full h-9 rounded-lg bg-slate-950 border border-slate-700 px-2.5 text-white"
                    >
                      <option value="CM">Cameroun (CM)</option>
                      <option value="CI">Côte d&apos;Ivoire (CI)</option>
                      <option value="SN">Sénégal (SN)</option>
                      <option value="BF">Burkina Faso (BF)</option>
                      <option value="BJ">Bénin (BJ)</option>
                      <option value="TG">Togo (TG)</option>
                      <option value="GA">Gabon (GA)</option>
                      <option value="CG">Congo (CG)</option>
                      <option value="CD">RDC (CD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1 font-semibold">Opérateur</label>
                    <select
                      value={payForm.operator}
                      onChange={e => setPayForm({ ...payForm, operator: e.target.value })}
                      className="w-full h-9 rounded-lg bg-slate-950 border border-slate-700 px-2.5 text-white"
                    >
                      <option value="ORANGE">Orange Money</option>
                      <option value="MTN">MTN MoMo</option>
                      <option value="WAVE">Wave</option>
                      <option value="MOOV">Moov Money</option>
                      <option value="AIRTEL">Airtel Money</option>
                      <option value="VODACOM">Vodacom M-Pesa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Numéro Mobile Money (avec indicatif, ex: 2376...)</label>
                  <input
                    type="tel"
                    required
                    placeholder="2376XXXXXXXX"
                    value={payForm.phoneNumber}
                    onChange={e => setPayForm({ ...payForm, phoneNumber: e.target.value })}
                    className="w-full h-9 rounded-lg bg-slate-950 border border-slate-700 px-3 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Email (optionnel)</label>
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={payForm.email}
                    onChange={e => setPayForm({ ...payForm, email: e.target.value })}
                    className="w-full h-9 rounded-lg bg-slate-950 border border-slate-700 px-3 text-white"
                  />
                </div>

                <Button type="submit" disabled={payLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  {payLoading ? 'Initialisation iKeePay...' : 'Payer maintenant via iKeePay'}
                </Button>
              </form>
            )}

            {payStep === 'pending' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-amber-950 border border-amber-500/40 text-amber-200">
                  {paySession?.message || 'Validez le paiement sur votre téléphone puis cliquez sur Vérifier ci-dessous.'}
                </div>
                {(paySession?.paymentLink || paySession?.checkoutUrl) && (
                  <a
                    href={paySession.paymentLink || paySession.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    Ouvrir la page de paiement iKeePay <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <Button
                  type="button"
                  onClick={handleVerifyGuestPayment}
                  disabled={payLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {payLoading ? 'Vérification...' : 'Vérifier mon paiement & Continuer'}
                </Button>
              </div>
            )}

            {payStep === 'paid' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-semibold">
                  Votre paiement est confirmé ! Créez maintenant votre compte (ou connectez-vous) pour accéder à votre Dashboard, puis connectez votre compte Deriv.
                </div>
                <Button
                  type="button"
                  onClick={() => navigate(`/register?paid_order=${encodeURIComponent(paySession?.orderId || '')}`)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  S&apos;inscrire maintenant (Email) <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/login?paid_order=${encodeURIComponent(paySession?.orderId || '')}`)}
                  className="w-full border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold"
                >
                  J&apos;ai déjà un compte — Me connecter
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
