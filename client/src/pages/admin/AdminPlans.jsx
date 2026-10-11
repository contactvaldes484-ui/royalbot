import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { adminAPI } from '../../lib/api'
import {
  Loader2, Plus, Pencil, Trash2, RefreshCw, Star, Save, X,
  Sparkles, Zap, TrendingUp, Crown, Building2, AlertCircle, Check, Power, PowerOff
} from 'lucide-react'

const ICON_OPTIONS = ['Sparkles', 'Zap', 'TrendingUp', 'Crown', 'Building2']
const COLOR_OPTIONS = [
  'from-slate-500 to-slate-600',
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-pink-500 to-rose-500',
]

const FEATURE_KEYS = [
  { key: 'aiAccess', label: 'IA Access' },
  { key: 'aiAdvanced', label: 'IA Avancée' },
  { key: 'signalsBasic', label: 'Signaux basiques' },
  { key: 'signalsPremium', label: 'Signaux premium' },
  { key: 'copyTrading', label: 'Copy Trading' },
  { key: 'backtesting', label: 'Backtesting' },
  { key: 'marketplaceAccess', label: 'Marketplace' },
  { key: 'multiAccount', label: 'Multi-comptes' },
  { key: 'apiAccess', label: 'API Access' },
  { key: 'prioritySupport', label: 'Support prioritaire' },
  { key: 'dedicatedManager', label: 'Manager dédié' },
  { key: 'whiteLabel', label: 'White Label' },
]

const emptyPlan = () => ({
  slug: '',
  name: '',
  tagline: '',
  description: '',
  tier: 0,
  priceMonthly: 0,
  priceYearly: 0,
  currency: 'USD',
  limits: { maxRobots: 0, maxBinanceAccounts: 0, maxTradesPerDay: 0, maxBacktestsPerMonth: 0 },
  features: FEATURE_KEYS.reduce((acc, f) => ({ ...acc, [f.key]: false }), {}),
  highlights: [],
  badge: '',
  color: 'from-slate-500 to-slate-600',
  icon: 'Sparkles',
  popular: false,
  order: 0,
  trialDays: 0,
  category: 'crypto',
  broker: 'all',
  referralEligible: true,
  allowPaidSubscription: true,
  activationNotice: '',
  referralUnlockNote: '',
  isActive: true,
  isPublic: true,
})

export default function AdminPlans() {
  const [plans, setPlans] = useState([])
  const [filterCategory, setFilterCategory] = useState('all') // 'all' | 'crypto' | 'deriv'
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // plan being edited (or empty for create)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await adminAPI.getPlans()
      setPlans(data.plans || [])
    } catch (err) {
      showMessage('error', 'Erreur de chargement des plans.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startCreate = () => setEditing(emptyPlan())
  const startEdit = (plan) => setEditing({ ...plan, highlights: plan.highlights || [], features: plan.features || {} })
  const cancelEdit = () => setEditing(null)

  const submitPlan = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editing._id) {
        await adminAPI.updatePlan(editing._id, editing)
        showMessage('success', 'Plan mis à jour.')
      } else {
        await adminAPI.createPlan(editing)
        showMessage('success', 'Plan créé.')
      }
      setEditing(null)
      await load()
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Erreur lors de l\'enregistrement.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (plan) => {
    try {
      const { data } = await adminAPI.togglePlanActive(plan._id)
      showMessage('success', data.isActive ? `Plan "${plan.name}" activé.` : `Plan "${plan.name}" désactivé.`)
      await load()
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Action impossible.')
    }
  }

  const toggleReferral = async (plan) => {
    try {
      const { data } = await adminAPI.togglePlanReferral(plan._id)
      showMessage('success', data.referralEligible ? `Parrainage activé pour "${plan.name}".` : `Parrainage désactivé pour "${plan.name}".`)
      await load()
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Action impossible.')
    }
  }

  const togglePayment = async (plan) => {
    try {
      const { data } = await adminAPI.togglePlanPayment(plan._id)
      showMessage('success', data.allowPaidSubscription ? `Paiement direct activé pour "${plan.name}".` : `Paiement direct désactivé pour "${plan.name}".`)
      await load()
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Action impossible.')
    }
  }

  const deletePlan = async (plan) => {
    if (!confirm(`Supprimer le plan "${plan.name}" ?`)) return
    try {
      await adminAPI.deletePlan(plan._id)
      showMessage('success', 'Plan supprimé.')
      await load()
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Suppression impossible.')
    }
  }

  const resetDefaults = async () => {
    if (!confirm('Réinitialiser les plans aux valeurs par défaut ? Cela écrasera tous les plans existants.')) return
    try {
      await adminAPI.resetPlansDefaults()
      showMessage('success', 'Plans réinitialisés.')
      await load()
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Réinitialisation impossible.')
    }
  }

  const updateField = (path, value) => {
    setEditing((prev) => {
      const next = { ...prev }
      const parts = path.split('.')
      let target = next
      for (let i = 0; i < parts.length - 1; i++) {
        target[parts[i]] = { ...(target[parts[i]] || {}) }
        target = target[parts[i]]
      }
      target[parts[parts.length - 1]] = value
      return next
    })
  }

  const updateHighlight = (idx, value) => {
    setEditing((prev) => {
      const list = [...(prev.highlights || [])]
      list[idx] = value
      return { ...prev, highlights: list }
    })
  }
  const addHighlight = () => setEditing((p) => ({ ...p, highlights: [...(p.highlights || []), ''] }))
  const removeHighlight = (idx) => setEditing((p) => ({ ...p, highlights: p.highlights.filter((_, i) => i !== idx) }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestion des plans</h1>
          <p className="text-sm text-muted-foreground">Créez, modifiez et supprimez les plans d'abonnement.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetDefaults}>
            <RefreshCw className="h-4 w-4 mr-2" /> Réinitialiser défauts
          </Button>
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau plan
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30'
        }`}>
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Filtrage par catégorie */}
      <div className="flex gap-2 border-b pb-3">
        {[
          { id: 'all', label: 'Tous les plans' },
          { id: 'crypto', label: '🪙 Crypto (Binance & Bybit)' },
          { id: 'deriv', label: '⚡ Broker Deriv' },
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {plans.filter(p => filterCategory === 'all' || (p.category || 'crypto') === filterCategory).map((plan) => (
            <Card key={plan._id} className={`relative flex flex-col justify-between ${plan.popular ? 'border-violet-500 border-2' : ''} ${!plan.isActive ? 'opacity-80 bg-muted/20' : ''}`}>
              {plan.popular && (
                <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-semibold py-1 text-center">
                  <Star className="h-3 w-3 inline mr-1" /> Populaire
                </div>
              )}
              <CardContent className={`p-4 flex flex-col justify-between h-full ${plan.popular ? 'pt-9' : ''}`}>
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{plan.name}</h3>
                        <Badge variant={plan.isActive ? 'success' : 'secondary'} className="text-[10px]">
                          {plan.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.slug} · tier {plan.tier}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          plan.category === 'deriv' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {plan.category === 'deriv' ? 'DERIV' : 'CRYPTO'}
                        </span>
                        {plan.referralEligible !== false ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                            Parrainage ON
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">
                            Parrainage OFF
                          </span>
                        )}
                        {plan.allowPaidSubscription !== false ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500">
                            Paiement ON
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400">
                            Paiement OFF
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xl font-bold">${plan.priceMonthly}<span className="text-xs font-normal text-muted-foreground">/mois</span></p>
                    <p className="text-xs text-muted-foreground">${plan.priceYearly}/an</p>
                  </div>

                  <div className="text-xs space-y-1 text-muted-foreground mb-3">
                    <div>Robots: {plan.limits?.maxRobots ?? 0}</div>
                    <div>Comptes: {plan.limits?.maxBinanceAccounts ?? plan.limits?.maxMT5Accounts ?? 0}</div>
                    <div>Trades/j: {plan.limits?.maxTradesPerDay ?? 0}</div>
                  </div>

                  {/* ── INTERRUPTEURS RAPIDES D'ACTIVATION ADMIN ── */}
                  <div className="p-2.5 rounded-lg bg-muted/40 border space-y-2 mb-3 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contrôles d'Activation Rapides</div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium">Disponibilité :</span>
                      <button
                        type="button"
                        onClick={() => toggleActive(plan)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          plan.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {plan.isActive ? '🟢 ACTIF' : '🔴 INACTIF'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium">Parrainage :</span>
                      <button
                        type="button"
                        onClick={() => toggleReferral(plan)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          plan.referralEligible !== false ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-700/40 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {plan.referralEligible !== false ? '🟢 AUTORISÉ' : '🔴 BLOQUÉ'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium">Paiement Direct :</span>
                      <button
                        type="button"
                        onClick={() => togglePayment(plan)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          plan.allowPaidSubscription !== false ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-slate-700/40 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {plan.allowPaidSubscription !== false ? '🟢 AUTORISÉ' : '🔴 BLOQUÉ'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(plan)}>
                    <Pencil className="h-3 w-3 mr-1" /> Modifier
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deletePlan(plan)} className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Card className="border-violet-500/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{editing._id ? 'Modifier le plan' : 'Nouveau plan'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitPlan} className="space-y-4">
              {/* Identification */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Slug *</label>
                  <Input value={editing.slug} onChange={(e) => updateField('slug', e.target.value.toLowerCase())} required disabled={!!editing._id} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Nom *</label>
                  <Input value={editing.name} onChange={(e) => updateField('name', e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Tier (ordre)</label>
                  <Input type="number" value={editing.tier} onChange={(e) => updateField('tier', parseInt(e.target.value) || 0)} />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-medium mb-1 block">Tagline</label>
                  <Input value={editing.tagline} onChange={(e) => updateField('tagline', e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-medium mb-1 block">Description</label>
                  <textarea
                    value={editing.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full text-sm border rounded-md p-2 bg-background min-h-[60px]"
                  />
                </div>
              </div>

              {/* Catégorie & Parrainage & Activation */}
              <div className="p-3 rounded-lg border bg-muted/20 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">CATÉGORIE &amp; PARAMÈTRES D'ACTIVATION ADMIN</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Catégorie d'exchange / broker *</label>
                    <select
                      value={editing.category || 'crypto'}
                      onChange={(e) => updateField('category', e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="crypto">Crypto (Binance &amp; Bybit)</option>
                      <option value="deriv">Broker Deriv (SmartTrader &amp; Bots)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Broker ciblé</label>
                    <select
                      value={editing.broker || 'all'}
                      onChange={(e) => updateField('broker', e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="all">Tous / Global</option>
                      <option value="binance">Binance</option>
                      <option value="bybit">Bybit</option>
                      <option value="deriv">Deriv</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
                  <label className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded bg-background border">
                    <input
                      type="checkbox"
                      checked={editing.isActive !== false}
                      onChange={(e) => updateField('isActive', e.target.checked)}
                    />
                    <span className="font-semibold">Plan Actif &amp; Visible</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded bg-background border">
                    <input
                      type="checkbox"
                      checked={editing.referralEligible !== false}
                      onChange={(e) => updateField('referralEligible', e.target.checked)}
                    />
                    <span className="font-semibold">Déblocage Parrainage</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded bg-background border">
                    <input
                      type="checkbox"
                      checked={editing.allowPaidSubscription !== false}
                      onChange={(e) => updateField('allowPaidSubscription', e.target.checked)}
                    />
                    <span className="font-semibold">Abonnement Payant</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Consigne de parrainage (optionnel)</label>
                    <Input
                      value={editing.referralUnlockNote || ''}
                      onChange={(e) => updateField('referralUnlockNote', e.target.value)}
                      placeholder="ex: Inscrivez-vous avec notre lien partenaire"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Notice si plan désactivé (optionnel)</label>
                    <Input
                      value={editing.activationNotice || ''}
                      onChange={(e) => updateField('activationNotice', e.target.value)}
                      placeholder="ex: Temporairement fermé aux nouveaux abonnés"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Prix mensuel ($)</label>
                  <Input type="number" min="0" value={editing.priceMonthly} onChange={(e) => updateField('priceMonthly', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Prix annuel ($)</label>
                  <Input type="number" min="0" value={editing.priceYearly} onChange={(e) => updateField('priceYearly', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Devise</label>
                  <Input value={editing.currency} onChange={(e) => updateField('currency', e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Jours d'essai</label>
                  <Input type="number" min="0" value={editing.trialDays} onChange={(e) => updateField('trialDays', parseInt(e.target.value) || 0)} />
                </div>
              </div>

              {/* Limits */}
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground">LIMITES (-1 = illimité)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs mb-1 block">Robots max</label>
                    <Input type="number" value={editing.limits?.maxRobots ?? 0} onChange={(e) => updateField('limits.maxRobots', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block">Comptes Binance max</label>
                    <Input type="number" value={editing.limits?.maxBinanceAccounts ?? editing.limits?.maxMT5Accounts ?? 0} onChange={(e) => updateField('limits.maxBinanceAccounts', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block">Trades / jour</label>
                    <Input type="number" value={editing.limits?.maxTradesPerDay ?? 0} onChange={(e) => updateField('limits.maxTradesPerDay', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block">Backtests / mois</label>
                    <Input type="number" value={editing.limits?.maxBacktestsPerMonth ?? 0} onChange={(e) => updateField('limits.maxBacktestsPerMonth', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground">FONCTIONNALITÉS</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {FEATURE_KEYS.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={!!editing.features?.[f.key]}
                        onChange={(e) => updateField(`features.${f.key}`, e.target.checked)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Highlights */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">POINTS FORTS (affichés sur la carte)</p>
                  <Button type="button" size="sm" variant="outline" onClick={addHighlight}>
                    <Plus className="h-3 w-3 mr-1" /> Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editing.highlights || []).map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={h} onChange={(e) => updateHighlight(i, e.target.value)} placeholder="ex: 3 robots actifs" />
                      <Button type="button" size="sm" variant="outline" onClick={() => removeHighlight(i)} className="text-red-500">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Display */}
              <div>
                <p className="text-xs font-semibold mb-2 text-muted-foreground">AFFICHAGE</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs mb-1 block">Icône</label>
                    <select value={editing.icon} onChange={(e) => updateField('icon', e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                      {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block">Couleur (gradient)</label>
                    <select value={editing.color} onChange={(e) => updateField('color', e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                      {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block">Badge (ex: "Le plus populaire")</label>
                    <Input value={editing.badge || ''} onChange={(e) => updateField('badge', e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!editing.popular} onChange={(e) => updateField('popular', e.target.checked)} />
                    Populaire
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editing.isActive !== false} onChange={(e) => updateField('isActive', e.target.checked)} />
                    Actif
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editing.isPublic !== false} onChange={(e) => updateField('isPublic', e.target.checked)} />
                    Public (visible sur Pricing)
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  {editing._id ? 'Enregistrer' : 'Créer le plan'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>Annuler</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
