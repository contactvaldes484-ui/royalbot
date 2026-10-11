import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import useStore from '../../store/useStore'
import { subscriptionAPI } from '../../lib/api'
import { PlanRobotInstructions } from '../../components/guides/BinanceConnectGuide'
import {
  Crown, Check, X, ArrowRight, Loader2, AlertCircle, Calendar, CreditCard,
  Sparkles, Zap, TrendingUp, Building2, Activity, Receipt, RefreshCw
} from 'lucide-react'

const ICON_MAP = { Sparkles, Zap, TrendingUp, Crown, Building2 }

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatMoney(amount, currency = 'USD') {
  if (!amount) return '—'
  return `$${amount.toFixed ? amount.toFixed(2) : amount}`
}

function statusBadge(status) {
  const map = {
    confirmed: { variant: 'success', label: 'Confirmé' },
    pending: { variant: 'secondary', label: 'En attente' },
    failed: { variant: 'destructive', label: 'Échec' },
    refunded: { variant: 'outline', label: 'Remboursé' },
  }
  const cfg = map[status] || { variant: 'outline', label: status }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

function methodLabel(m) {
  return ({
    usdt_tron: 'USDT (TRC-20)',
    binance_pay: 'Binance Pay',
    crypto: 'Crypto',
    mobile_money: 'Mobile Money',
    manual: 'Gratuit',
    admin_grant: 'Admin',
  }[m] || m)
}

export default function DashboardSubscription() {
  const { user, fetchUser } = useStore()
  const [searchParams] = useSearchParams()
  const requestedPlan = searchParams.get('plan')
  const requestedCycle = searchParams.get('cycle') || 'monthly'

  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(null)
  const [plans, setPlans] = useState([])
  const [history, setHistory] = useState([])
  const [usage, setUsage] = useState({})
  const [planForCheckout, setPlanForCheckout] = useState(null)
  const [billingCycle, setBillingCycle] = useState(requestedCycle)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [payOptions, setPayOptions] = useState(null)

  // Checkout form
  const [paymentMethod, setPaymentMethod] = useState('usdt_tron')
  const [cryptoTxHash, setCryptoTxHash] = useState('')
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('orange')
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('')
  const [mobileMoneyTxRef, setMobileMoneyTxRef] = useState('')

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [c, p, h, u, po] = await Promise.all([
        subscriptionAPI.getCurrent(),
        subscriptionAPI.getPlans(),
        subscriptionAPI.getHistory(),
        subscriptionAPI.getUsage().catch(() => ({ data: {} })),
        subscriptionAPI.getPaymentOptions().catch(() => ({ data: null })),
      ])
      setCurrent(c.data)
      setPlans(p.data.plans || [])
      setHistory(h.data.subscriptions || [])
      setUsage(u.data || {})
      setPayOptions(po.data || null)

      if (requestedPlan && (p.data.plans || []).some(pl => pl.slug === requestedPlan)) {
        const target = p.data.plans.find(pl => pl.slug === requestedPlan)
        if (target && target.tier > 0) setPlanForCheckout(target)
      }
    } catch (err) {
      showMessage('error', 'Erreur de chargement.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const submitCheckout = async (e) => {
    e.preventDefault()
    if (!planForCheckout) return
    setSubmitting(true)
    try {
      const payload = {
        planSlug: planForCheckout.slug,
        billingCycle,
        paymentMethod,
        cryptoTxHash: cryptoTxHash || undefined,
        mobileMoneyProvider: paymentMethod === 'mobile_money' ? mobileMoneyProvider : undefined,
        mobileMoneyNumber: paymentMethod === 'mobile_money' ? mobileMoneyNumber : undefined,
        mobileMoneyTxRef: paymentMethod === 'mobile_money' ? mobileMoneyTxRef : undefined,
      }
      const { data } = await subscriptionAPI.subscribe(payload)
      showMessage('success', data.message || 'Demande envoyée.')
      // Mobile Money SebPay : ouvrir le lien de validation opérateur (ex: Wave) si fourni
      if (data.providerLink) {
        window.open(data.providerLink, '_blank', 'noopener')
      }
      setPlanForCheckout(null)
      setCryptoTxHash('')
      setMobileMoneyTxRef('')
      setMobileMoneyNumber('')
      await fetchUser?.()
      await load()
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Erreur lors de l\'envoi.')
    } finally {
      setSubmitting(false)
    }
  }

  const cancel = async () => {
    if (!window.confirm('Annuler votre abonnement ? Vous repasserez au plan gratuit.')) return
    try {
      await subscriptionAPI.cancel({ reason: 'User cancelled from dashboard' })
      showMessage('success', 'Abonnement annulé.')
      await fetchUser?.()
      await load()
    } catch (err) {
      showMessage('error', 'Erreur d\'annulation.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const plan = current?.plan
  const Icon = ICON_MAP[plan?.icon] || Sparkles
  const sub = current?.userSubscription || {}
  const isPaid = (plan?.tier || 0) > 0
  const isExpired = sub.endDate && new Date(sub.endDate) < new Date()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon abonnement</h1>
        <p className="text-muted-foreground text-sm">Gérez votre plan, vos paiements et votre consommation.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg border text-sm ${message.type === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-green-500/30 bg-green-500/10 text-green-600'}`}>
          {message.text}
        </div>
      )}

      {/* Current plan card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan?.color || 'from-slate-500 to-slate-600'} flex items-center justify-center`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{plan?.name || 'Plan inconnu'}</h2>
                  {isPaid && <Badge variant="premium">Premium</Badge>}
                  {isExpired && <Badge variant="destructive">Expiré</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{plan?.tagline || 'Plan actuel'}</p>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1 text-sm">
              {sub.endDate && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Expire le {formatDate(sub.endDate)}
                </p>
              )}
              {sub.billingCycle && (
                <p className="text-xs text-muted-foreground capitalize">Cycle : {sub.billingCycle === 'yearly' ? 'Annuel' : 'Mensuel'}</p>
              )}
            </div>
          </div>

          {isPaid && (
            <div className="flex flex-wrap gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={cancel}>Annuler l'abonnement</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage / Limits */}
      {plan?.limits && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Consommation
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <UsageBlock label="Robots autorisés" value={plan.limits.maxRobots} unit="" />
            <UsageBlock label="Comptes Binance" value={plan.limits.maxBinanceAccounts ?? plan.limits.maxMT5Accounts} unit="" />
            <UsageBlock label="Trades / jour" value={plan.limits.maxTradesPerDay} unit="" current={usage.usage?.tradesToday} />
            <UsageBlock label="Backtests / mois" value={plan.limits.maxBacktestsPerMonth} unit="" current={usage.usage?.backtestsThisMonth} />
          </CardContent>
        </Card>
      )}

      {/* Instructions : comment utiliser les robots de ce plan */}
      <PlanRobotInstructions />

      {/* Available plans (upgrade) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Changer de plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit mb-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${billingCycle === 'monthly' ? 'bg-background shadow' : 'text-muted-foreground'}`}
            >Mensuel</button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${billingCycle === 'yearly' ? 'bg-background shadow' : 'text-muted-foreground'}`}
            >Annuel <span className="text-green-500">-17%</span></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map((p) => {
              const PIcon = ICON_MAP[p.icon] || Sparkles
              const isCurrent = p.slug === current?.planSlug
              const price = billingCycle === 'yearly' ? p.priceYearly : p.priceMonthly
              return (
                <div key={p.slug} className={`p-4 rounded-xl border ${isCurrent ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${p.color || 'from-slate-500 to-slate-600'} flex items-center justify-center`}>
                      <PIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {price === 0 ? 'Gratuit' : `$${price}/${billingCycle === 'yearly' ? 'an' : 'mois'}`}
                      </p>
                    </div>
                    {isCurrent && <Badge variant="success" className="text-[10px]">Actuel</Badge>}
                  </div>
                  {!isCurrent && (
                    <Button
                      size="sm"
                      variant={p.popular ? 'default' : 'outline'}
                      className="w-full text-xs"
                      onClick={() => setPlanForCheckout(p)}
                      disabled={p.tier === 0}
                    >
                      {p.tier === 0 ? 'Plan gratuit' : 'Sélectionner'}
                      {p.tier > 0 && <ArrowRight className="h-3 w-3 ml-1" />}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Checkout panel */}
      {planForCheckout && (
        <Card className="border-violet-500/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paiement — {planForCheckout.name} ({billingCycle === 'yearly' ? 'Annuel' : 'Mensuel'})
              <Badge variant="outline" className="ml-2">
                ${billingCycle === 'yearly' ? planForCheckout.priceYearly : planForCheckout.priceMonthly}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitCheckout} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Mode de paiement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                >
                  <option value="usdt_tron">USDT (TRC-20)</option>
                  <option value="binance_pay">Binance Pay</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>

              {paymentMethod !== 'mobile_money' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/40 text-xs space-y-1">
                    <p className="font-semibold">Adresse de réception USDT (réseau {payOptions?.usdt?.network || 'TRC-20 (TRON)'}) :</p>
                    <p className="font-mono break-all">{payOptions?.usdt?.address || 'Adresse non configurée — contactez le support.'}</p>
                    <p className="text-muted-foreground">Envoyez exactement <strong>${billingCycle === 'yearly' ? planForCheckout.priceYearly : planForCheckout.priceMonthly}</strong>, puis collez votre hash de transaction ci-dessous.
                    {payOptions?.usdt?.autoVerify && <span className="text-green-500"> Vérification automatique on-chain.</span>}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Hash de transaction *</label>
                    <Input
                      placeholder="hash TRC-20 (ex: a1b2c3...)"
                      value={cryptoTxHash}
                      onChange={(e) => setCryptoTxHash(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'mobile_money' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Opérateur</label>
                    <select
                      value={mobileMoneyProvider}
                      onChange={(e) => setMobileMoneyProvider(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
                    >
                      <option value="orange">Orange Money</option>
                      <option value="mtn">MTN Mobile Money</option>
                      <option value="moov">Moov Money</option>
                      <option value="wave">Wave</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Numéro de téléphone {payOptions?.mobileMoney?.enabled && '*'}</label>
                    <Input
                      placeholder="22997000000 (format international, sans +)"
                      value={mobileMoneyNumber}
                      onChange={(e) => setMobileMoneyNumber(e.target.value)}
                      required
                    />
                  </div>
                  {payOptions?.mobileMoney?.enabled ? (
                    <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                      Une demande de paiement sera envoyée sur votre téléphone. Validez-la (code PIN Mobile Money) pour activer votre plan automatiquement.
                      {payOptions?.mobileMoney?.xofPerUsd && (
                        <> Montant ≈ <strong>{Math.round((billingCycle === 'yearly' ? planForCheckout.priceYearly : planForCheckout.priceMonthly) * payOptions.mobileMoney.xofPerUsd).toLocaleString()} XOF</strong>.</>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Référence de transaction *</label>
                      <Input
                        placeholder="Ex: MP240515.1234.A56789"
                        value={mobileMoneyTxRef}
                        onChange={(e) => setMobileMoneyTxRef(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const auto = paymentMethod === 'mobile_money'
                  ? payOptions?.mobileMoney?.enabled
                  : payOptions?.usdt?.autoVerify
                return (
                  <div className={`flex items-start gap-2 p-3 rounded-lg text-xs border ${auto ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                    <AlertCircle className={`h-4 w-4 shrink-0 mt-0.5 ${auto ? 'text-green-500' : 'text-amber-500'}`} />
                    <p>{auto
                      ? 'Votre paiement est vérifié automatiquement. Votre plan s\'active dès confirmation (quelques secondes à quelques minutes).'
                      : 'Votre paiement sera vérifié par un administrateur (généralement sous 1-24h). Vous recevrez une notification dès l\'activation.'}</p>
                  </div>
                )
              })()}

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Envoyer le paiement
                </Button>
                <Button type="button" variant="outline" onClick={() => setPlanForCheckout(null)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun paiement pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 font-medium">Plan</th>
                    <th className="py-2 font-medium">Cycle</th>
                    <th className="py-2 font-medium">Méthode</th>
                    <th className="py-2 font-medium text-right">Montant</th>
                    <th className="py-2 font-medium text-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h._id} className="border-b last:border-0">
                      <td className="py-2.5 text-xs">{formatDate(h.createdAt)}</td>
                      <td className="py-2.5 capitalize">{h.plan}</td>
                      <td className="py-2.5 text-xs capitalize">{h.billingCycle}</td>
                      <td className="py-2.5 text-xs">{methodLabel(h.paymentMethod)}</td>
                      <td className="py-2.5 text-right font-mono">{formatMoney(h.amount, h.currency)}</td>
                      <td className="py-2.5 text-center">{statusBadge(h.paymentStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center pt-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/pricing">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Comparer tous les plans
          </Link>
        </Button>
      </div>
    </div>
  )
}

function UsageBlock({ label, value, unit, current }) {
  const isUnlimited = value === -1
  const display = isUnlimited ? '∞' : `${value}${unit ? ' ' + unit : ''}`
  const pct = (typeof current === 'number' && value > 0 && !isUnlimited) ? Math.min(100, (current / value) * 100) : null

  return (
    <div className="p-3 rounded-lg border bg-muted/20">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold">
        {typeof current === 'number' ? `${current}/` : ''}{display}
      </p>
      {pct !== null && (
        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
