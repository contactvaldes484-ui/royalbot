import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { copyTradingAPI } from '../../lib/api'
import useStore from '../../store/useStore'
import {
  DollarSign, TrendingUp, Wallet, Loader2, ArrowDownToLine, AlertTriangle,
  CheckCircle2, Clock, Users, BarChart3, X, Save, Crown, Activity, ArrowUpRight, ChevronRight
} from 'lucide-react'

// Sparkline for daily earnings timeline
function MiniBars({ data = [], height = 80 }) {
  if (!data.length) return <div style={{ height }} className="flex items-center justify-center text-xs text-muted-foreground">Pas de données</div>
  const max = Math.max(...data.map(d => d.total), 1)
  const w = 600
  const barW = w / data.length - 2
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      {data.map((d, i) => {
        const h = (d.total / max) * (height - 4)
        return <rect key={i} x={i * (barW + 2)} y={height - h - 2} width={barW} height={h}
          fill="#10b981" rx="1" opacity="0.85" />
      })}
    </svg>
  )
}

const TYPE_LABELS = { earn: 'Gain', payout: 'Retrait', adjust: 'Ajustement' }
const TYPE_COLORS = {
  earn:   'bg-green-500/10 text-green-600 border-green-500/30',
  payout: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  adjust: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
}
const PAYOUT_STATUS = {
  pending:    'bg-amber-500/10 text-amber-600 border-amber-500/30',
  processing: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  completed:  'bg-green-500/10 text-green-600 border-green-500/30',
  rejected:   'bg-red-500/10 text-red-600 border-red-500/30',
}

export default function MasterEarnings() {
  const [data, setData] = useState({ earnings: {}, timeline: [], byMaster: [] })
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPayout, setShowPayout] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const copyEarningsTotal = useStore(s => s.copyEarningsTotal)

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: earn }, { data: led }] = await Promise.all([
        copyTradingAPI.getMasterEarnings(),
        copyTradingAPI.getMasterLedger({ limit: 50, ...(filterType !== 'all' && { type: filterType }) }),
      ])
      setData(earn)
      setLedger(led.entries || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterType])

  // Auto-refresh on real-time commission events
  useEffect(() => {
    if (copyEarningsTotal > 0) {
      const t = setTimeout(load, 500)
      return () => clearTimeout(t)
    }
  }, [copyEarningsTotal])

  const e = data.earnings || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" /> Mes Commissions Master
          </h1>
          <p className="text-sm text-muted-foreground">Suivez vos gains de copy trading en temps réel</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/become-master"><Button variant="outline"><Crown className="h-4 w-4 mr-2" /> Mes profils</Button></Link>
          <Button variant="gradient" onClick={() => setShowPayout(true)} disabled={(e.available || 0) <= 0}>
            <ArrowDownToLine className="h-4 w-4 mr-2" /> Demander un paiement
          </Button>
        </div>
      </div>

      {/* Clarification banner */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-3 flex gap-3 items-start">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
            <Wallet className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-semibold mb-0.5">Vos commissions ≠ vos retraits Binance</p>
            <p className="text-muted-foreground">
              Les commissions affichées ici sont des <strong>revenus dus par la plateforme</strong> (versés en crypto, virement ou PayPal sur demande). Vos retraits sur votre compte Binance sont gérés directement depuis votre compte Binance — la plateforme n'y a pas accès.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Earnings overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase font-semibold text-muted-foreground">Disponible</p>
              <Wallet className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-500">${(e.available || 0).toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Prêt à être retiré</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase font-semibold text-muted-foreground">Total gagné</p>
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-3xl font-bold">${(e.total || 0).toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Depuis le début (lifetime)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase font-semibold text-muted-foreground">Déjà retiré</p>
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">${(e.paidOut || 0).toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Total des retraits effectués</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily earnings chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-violet-500" /> Gains journaliers (30 derniers jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MiniBars data={data.timeline || []} height={100} />
          {(data.timeline?.length || 0) > 0 && (
            <div className="flex items-center justify-between mt-3 text-[11px] text-muted-foreground">
              <span>{data.timeline[0]._id}</span>
              <span>Total période: <strong className="text-green-500">${data.timeline.reduce((s, d) => s + d.total, 0).toFixed(2)}</strong></span>
              <span>{data.timeline[data.timeline.length - 1]._id}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings breakdown by master profile */}
      {data.byMaster?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" /> Répartition par profil master
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.byMaster.map(m => (
                <div key={m._id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {(m.displayName || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{m.displayName}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <Users className="h-3 w-3" /> {m.followersCount || 0} copieurs · {m.count} trades commissionnés
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">+${m.total.toFixed(2)}</p>
                    {m.slug && (
                      <Link to={`/copy-trading/${m.slug}`} target="_blank"
                        className="text-[10px] text-muted-foreground hover:text-violet-500">
                        Voir profil →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-500" /> Historique
            </CardTitle>
            <div className="flex gap-1">
              {['all', 'earn', 'payout', 'adjust'].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-2 py-1 rounded text-[10px] font-medium border transition-all ${
                    filterType === t ? 'bg-violet-500 text-white border-violet-500' : 'border-border text-muted-foreground'
                  }`}>
                  {t === 'all' ? 'Tous' : TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          : ledger.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">Aucune entrée.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Source</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Montant</th>
                  <th className="text-center p-2">Statut</th>
                </tr></thead>
                <tbody>
                  {ledger.map(l => (
                    <tr key={l._id} className="border-b hover:bg-muted/20">
                      <td className="p-2 text-muted-foreground whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-2">
                        <Badge className={`text-[9px] border ${TYPE_COLORS[l.type]}`} variant="outline">{TYPE_LABELS[l.type]}</Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {l.masterAccount?.displayName || '—'}
                        {l.symbol && <span className="text-[9px] ml-1">· {l.symbol}</span>}
                      </td>
                      <td className="p-2 text-muted-foreground max-w-xs truncate">{l.description}</td>
                      <td className={`p-2 text-right font-bold ${l.amount >= 0 ? 'text-green-500' : 'text-blue-500'}`}>
                        {l.amount >= 0 ? '+' : ''}${l.amount.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        {l.payoutStatus ? (
                          <Badge className={`text-[9px] border ${PAYOUT_STATUS[l.payoutStatus]}`} variant="outline">
                            {l.payoutStatus}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout modal */}
      {showPayout && <PayoutModal available={e.available || 0} onClose={() => setShowPayout(false)} onDone={() => { setShowPayout(false); load() }} />}
    </div>
  )
}

const PAYOUT_METHODS = [
  { v: 'crypto',        l: '₿ Crypto',      placeholder: 'Adresse wallet (USDT TRC20, BTC, ETH...)', help: 'Indiquez le réseau dans les notes (TRC20, ERC20, BSC...)' },
  { v: 'bank_transfer', l: '🏦 Virement',   placeholder: 'IBAN + BIC/SWIFT', help: 'Précisez la devise dans les notes' },
  { v: 'paypal',        l: '💳 PayPal',     placeholder: 'Email PayPal', help: 'Le compte PayPal doit être au même nom' },
  { v: 'other',         l: '⋯ Autre',       placeholder: 'Détails du moyen de paiement', help: 'Décrivez votre méthode dans les notes' },
]

function PayoutModal({ available, onClose, onDone }) {
  const [amount, setAmount] = useState(available)
  const [method, setMethod] = useState('crypto')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true); setError('')
    try {
      await copyTradingAPI.requestPayout({ amount: +amount, method, address, notes })
      onDone()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally { setLoading(false) }
  }

  const selectedMethod = PAYOUT_METHODS.find(m => m.v === method)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-green-500" /> Demande de paiement</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5 space-y-4">
          {/* Clarification banner */}
          <div className="bg-blue-500/5 border border-blue-500/30 rounded-lg p-3 text-xs">
            <p className="font-semibold mb-1 flex items-center gap-1.5">ℹ️ Comment fonctionne le paiement</p>
            <p className="text-muted-foreground leading-relaxed">
              Vos commissions sont des revenus dus par la plateforme. Elles sont payées <strong>manuellement par notre équipe</strong> (crypto, virement, PayPal) selon la méthode de votre choix. La plateforme ne contrôle pas vos retraits broker (XM, etc.).
            </p>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Solde disponible</p>
            <p className="text-2xl font-bold text-green-500">${available.toFixed(2)}</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Montant ($)</label>
            <Input type="number" step="0.01" min="0" max={available} value={amount} onChange={e => setAmount(e.target.value)} />
            <div className="flex gap-1 mt-1">
              <button type="button" onClick={() => setAmount((available * 0.25).toFixed(2))} className="text-[10px] text-muted-foreground hover:text-violet-500">25%</button>
              <button type="button" onClick={() => setAmount((available * 0.5).toFixed(2))} className="text-[10px] text-muted-foreground hover:text-violet-500">50%</button>
              <button type="button" onClick={() => setAmount((available * 0.75).toFixed(2))} className="text-[10px] text-muted-foreground hover:text-violet-500">75%</button>
              <button type="button" onClick={() => setAmount(available.toFixed(2))} className="text-[10px] text-muted-foreground hover:text-violet-500">Max</button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Méthode de paiement</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYOUT_METHODS.map(m => (
                <button key={m.v} type="button" onClick={() => setMethod(m.v)}
                  className={`p-2.5 rounded-lg border text-xs text-left transition-all ${method === m.v ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/30'}`}>
                  <p className="font-semibold">{m.l}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Adresse de paiement *</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder={selectedMethod?.placeholder} />
            <p className="text-[10px] text-muted-foreground mt-1">{selectedMethod?.help}</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes (réseau, devise, contact...)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Ex: Réseau TRC20 / Devise EUR / Telegram @username"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none" />
          </div>

          <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-2.5 text-[11px] text-muted-foreground">
            ⏱ Délai de traitement : <strong>24-72h ouvrées</strong>. Le solde sera débité immédiatement et restitué automatiquement en cas de rejet.
          </div>

          {error && <div className="bg-red-500/10 text-red-500 text-sm rounded-lg p-3">{error}</div>}

          <Button variant="gradient" className="w-full" onClick={submit} disabled={loading || amount <= 0 || amount > available || !address.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Soumettre la demande
          </Button>
        </div>
      </div>
    </div>
  )
}
