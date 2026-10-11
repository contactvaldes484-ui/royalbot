import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { copyTradingAPI, binanceAPI } from '../../lib/api'
import {
  Crown, Trophy, Loader2, CheckCircle2, AlertTriangle, Plus, Zap, User,
  Globe, Percent, DollarSign, ArrowRight, Clock, X, Eye, Users
} from 'lucide-react'

const STATUS_COLORS = {
  pending:   'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved:  'bg-green-500/10 text-green-600 border-green-500/30',
  suspended: 'bg-red-500/10 text-red-600 border-red-500/30',
  rejected:  'bg-gray-500/10 text-gray-600 border-gray-500/30',
}
const STATUS_LABELS = { pending: 'En attente de validation', approved: 'Approuvé · Public', suspended: 'Suspendu', rejected: 'Rejeté' }

const STYLE_OPTIONS = [
  { v: 'scalper',    l: '⚡ Scalper',     d: 'Trades très courts' },
  { v: 'day_trader', l: '📊 Day Trader',  d: 'Intra-journalier' },
  { v: 'swing',      l: '🌊 Swing',       d: 'Tenue de plusieurs jours' },
  { v: 'position',   l: '🎯 Position',    d: 'Long terme' },
  { v: 'mixed',      l: '🔀 Polyvalent',  d: 'Multi-style' },
]
const RISK_OPTIONS = [
  { v: 'low',     l: 'Faible',  c: 'border-green-500/30 hover:border-green-500' },
  { v: 'medium',  l: 'Modéré',  c: 'border-amber-500/30 hover:border-amber-500' },
  { v: 'high',    l: 'Élevé',   c: 'border-orange-500/30 hover:border-orange-500' },
  { v: 'extreme', l: 'Extrême', c: 'border-red-500/30 hover:border-red-500' },
]

export default function BecomeMaster() {
  const [myMasters, setMyMasters] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [sessions, setSessions] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    robotSessionId: '',
    displayName: '',
    bio: '',
    country: '',
    tradingStyle: 'mixed',
    riskLevel: 'medium',
    feePct: 20,
    minCapital: 100,
  })

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: m }, { data: s }] = await Promise.all([
        copyTradingAPI.getMyMasters(),
        binanceAPI.getSessions(),
      ])
      setMyMasters(m.masters || [])
      setSessions(s.sessions || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setError(''); setSuccess(''); setSubmitting(true)
    try {
      if (!form.displayName.trim()) throw new Error('Nom public requis')
      if (!form.robotSessionId) throw new Error('Sélectionnez une session robot Binance')

      await copyTradingAPI.apply(form)
      setSuccess('Candidature envoyée ! Notre équipe va la valider sous peu.')
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erreur')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" /> Devenir Master
          </h1>
          <p className="text-sm text-muted-foreground">Publiez vos performances et gagnez des commissions sur chaque trade copié</p>
        </div>
        <Button variant="gradient" onClick={() => { setShowForm(true); setError(''); setSuccess('') }}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle candidature
        </Button>
      </div>

      {/* Hero benefits */}
      {myMasters.length === 0 && !loading && (
        <Card className="overflow-hidden border-amber-500/30">
          <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" />
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { icon: Users, title: 'Trouvez des copieurs', desc: 'Votre profil apparaît dans le classement public' },
                { icon: DollarSign, title: 'Gagnez des commissions', desc: 'Pourcentage sur chaque trade copié profitable' },
                { icon: Zap, title: 'Bots IA & manuel', desc: 'Publiez un robot ou tradez manuellement' },
              ].map((b, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm mb-0.5">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-500/40 bg-green-500/5"><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="text-sm">{success}</span>
        </CardContent></Card>
      )}

      {/* My master profiles */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
      ) : myMasters.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Crown className="h-12 w-12 mx-auto text-amber-500/30 mb-3" />
          <h3 className="font-bold mb-1">Aucun profil master</h3>
          <p className="text-sm text-muted-foreground mb-4">Postulez pour devenir master et apparaître dans le classement public.</p>
          <Button variant="gradient" onClick={() => setShowForm(true)}>Postuler maintenant →</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {myMasters.map(m => (
            <Card key={m._id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                      {(m.displayName || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm">{m.displayName}</h3>
                        <Badge variant="outline" className="text-[9px]">🤖 Robot Binance</Badge>
                        <Badge className={`text-[9px] border ${STATUS_COLORS[m.status]}`} variant="outline">
                          {STATUS_LABELS[m.status]}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">/{m.slug} · {m.tradingStyle} · Risque {m.riskLevel} · Frais {m.feePct}%</p>
                      {m.rejectionReason && <p className="text-[10px] text-red-500 mt-0.5">⚠ {m.rejectionReason}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center min-w-fit">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Copieurs</p>
                      <p className="text-sm font-bold">{m.followersCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">ROI</p>
                      <p className={`text-sm font-bold ${(m.stats?.roi || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {(m.stats?.roi || 0) >= 0 ? '+' : ''}{(m.stats?.roi || 0).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Trades</p>
                      <p className="text-sm font-bold">{m.stats?.totalTrades || 0}</p>
                    </div>
                  </div>
                  {m.status === 'approved' && (
                    <Link to={`/copy-trading/${m.slug}`} target="_blank">
                      <Button size="sm" variant="outline"><Eye className="h-3 w-3 mr-1" /> Voir profil public</Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Apply form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> Devenir Master</h2>
                <p className="text-xs text-muted-foreground">Remplissez le formulaire pour postuler</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>

            <div className="p-5 space-y-5">
              {/* Session robot Binance à publier */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Session robot Binance à publier</label>
                {sessions.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs">
                    Aucune session robot active. <Link to="/dashboard/binance" className="text-violet-500 underline">Démarrer un robot Binance →</Link>
                  </div>
                ) : (
                  <select value={form.robotSessionId} onChange={e => update('robotSessionId', e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option value="">— Choisir une session —</option>
                    {sessions.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.robotKey} · {s.market} · {(s.settings?.symbols || []).join(', ') || 'auto'} · {s.stats?.totalTrades || 0} trades · {s.status}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Identity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nom public *</label>
                  <Input value={form.displayName} onChange={e => update('displayName', e.target.value)} placeholder="Alex Trader" maxLength={50} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Pays</label>
                  <Input value={form.country} onChange={e => update('country', e.target.value)} placeholder="France" maxLength={50} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Bio (optionnel)</label>
                <textarea value={form.bio} onChange={e => update('bio', e.target.value)} rows={3} maxLength={500}
                  placeholder="Décrivez votre stratégie en quelques mots..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
                <p className="text-[10px] text-muted-foreground text-right mt-1">{form.bio.length}/500</p>
              </div>

              {/* Trading style */}
              <div>
                <label className="text-sm font-medium mb-2 block">Style de trading</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {STYLE_OPTIONS.map(s => (
                    <button key={s.v} type="button" onClick={() => update('tradingStyle', s.v)}
                      className={`p-2 rounded-lg border text-xs text-left ${form.tradingStyle === s.v ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/30'}`}>
                      <p className="font-semibold">{s.l}</p>
                      <p className="text-[9px] text-muted-foreground">{s.d}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk level */}
              <div>
                <label className="text-sm font-medium mb-2 block">Niveau de risque</label>
                <div className="grid grid-cols-4 gap-2">
                  {RISK_OPTIONS.map(r => (
                    <button key={r.v} type="button" onClick={() => update('riskLevel', r.v)}
                      className={`px-2 py-2 rounded-lg border text-xs font-semibold ${form.riskLevel === r.v ? 'border-violet-500 bg-violet-500/10' : r.c}`}>
                      {r.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Commercial */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1"><Percent className="h-3 w-3" /> Commission perf.</label>
                  <Input type="number" min="0" max="50" value={form.feePct} onChange={e => update('feePct', +e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">% prélevé sur chaque trade copié profitable</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Capital min</label>
                  <Input type="number" min="0" value={form.minCapital} onChange={e => update('minCapital', +e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">Recommandation aux copieurs (USD)</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 text-red-500 text-sm rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="gradient" className="flex-1" onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                  Soumettre la candidature
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Votre candidature sera examinée par l'équipe sous 24-48h. Une fois approuvée, votre profil apparaîtra publiquement dans le classement.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
