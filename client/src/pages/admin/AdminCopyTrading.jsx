import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { copyTradingAPI } from '../../lib/api'
import {
  Trophy, Users, Activity, DollarSign, Loader2, Check, X, Pause, Play,
  AlertTriangle, Trash2, RefreshCw, Eye, Shield, Zap, Clock, Search,
  ArrowDownToLine, Copy, Wallet, ExternalLink
} from 'lucide-react'

const STATUS_COLORS = {
  pending:   'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved:  'bg-green-500/10 text-green-600 border-green-500/30',
  suspended: 'bg-red-500/10 text-red-600 border-red-500/30',
  rejected:  'bg-gray-500/10 text-gray-600 border-gray-500/30',
}
const STATUS_LABELS = { pending: 'En attente', approved: 'Approuvé', suspended: 'Suspendu', rejected: 'Rejeté' }
const AI_LABELS = { safe: 'Sain', warning: 'Attention', danger: 'Risque', critical: 'Critique' }
const AI_COLORS = { safe: 'text-green-500', warning: 'text-amber-500', danger: 'text-orange-500', critical: 'text-red-500' }

export default function AdminCopyTrading() {
  const [tab, setTab] = useState('masters')
  const [masters, setMasters] = useState([])
  const [globalStats, setGlobalStats] = useState({})
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [pendingCount, setPendingCount] = useState(0)
  const [actionId, setActionId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [suspendModal, setSuspendModal] = useState(null)
  const [reason, setReason] = useState('')
  const [showLogs, setShowLogs] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = statusFilter === 'all' ? {} : { status: statusFilter }
      const [{ data: m }, { data: s }] = await Promise.all([
        copyTradingAPI.adminGetMasters({ ...params, limit: 50 }),
        copyTradingAPI.adminGetStats(),
      ])
      setMasters(m.masters || [])
      setPendingCount(m.pendingCount || 0)
      setGlobalStats(s.stats || {})
    } finally { setLoading(false) }
  }

  const loadLogs = async () => {
    const { data } = await copyTradingAPI.adminGetLogs(100)
    setLogs(data.logs || [])
  }

  useEffect(() => { load() }, [statusFilter])

  const act = async (id, fn) => {
    setActionId(id)
    try { await fn(); await load() }
    catch (err) { alert(err.response?.data?.error || 'Erreur') }
    finally { setActionId(null) }
  }

  const onApprove = (m) => {
    if (!window.confirm(`Approuver ${m.displayName} et le rendre public ?`)) return
    act(m._id, () => copyTradingAPI.adminApprove(m._id, { badges: m.badges || [] }))
  }
  const onUnsuspend = (m) => act(m._id, () => copyTradingAPI.adminUnsuspend(m._id))
  const onDelete = (m) => {
    if (!window.confirm(`Supprimer définitivement ${m.displayName} ?`)) return
    act(m._id, () => copyTradingAPI.adminDelete(m._id))
  }
  const onRecheck = (m) => act(m._id, () => copyTradingAPI.adminRecheck(m._id))

  const submitReject = async () => {
    if (!rejectModal) return
    setActionId(rejectModal._id)
    try {
      await copyTradingAPI.adminReject(rejectModal._id, { reason })
      setRejectModal(null); setReason(''); await load()
    } catch (err) { alert(err.response?.data?.error || 'Erreur') }
    finally { setActionId(null) }
  }

  const submitSuspend = async () => {
    if (!suspendModal) return
    setActionId(suspendModal._id)
    try {
      await copyTradingAPI.adminSuspend(suspendModal._id, { reason })
      setSuspendModal(null); setReason(''); await load()
    } catch (err) { alert(err.response?.data?.error || 'Erreur') }
    finally { setActionId(null) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-violet-500" /> Copy Trading
          </h1>
          <p className="text-sm text-muted-foreground">Gestion des masters & monitoring temps réel</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setShowLogs(true); loadLogs() }}>
            <Activity className="h-3.5 w-3.5 mr-1" /> Logs moteur
          </Button>
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatBox icon={Users} label="Masters totaux" value={globalStats.totalMasters || 0} />
        <StatBox icon={Check} label="Approuvés" value={globalStats.approvedMasters || 0} color="text-green-500" />
        <StatBox icon={Clock} label="En attente" value={globalStats.pendingMasters || 0} color="text-amber-500" />
        <StatBox icon={AlertTriangle} label="Suspendus" value={globalStats.suspendedMasters || 0} color="text-red-500" />
        <StatBox icon={Copy} label="Souscriptions" value={globalStats.totalSubs || 0} />
        <StatBox icon={Activity} label="Actives" value={globalStats.activeSubs || 0} color="text-green-500" />
        <StatBox icon={Activity} label="Trades copiés" value={globalStats.totalCopyTrades || 0} />
        <StatBox icon={DollarSign} label="Commissions" value={`$${(globalStats.totalCommissions || 0).toFixed(2)}`} color="text-green-500" />
      </div>

      {/* Tab nav */}
      <div className="border-b flex gap-1">
        {[
          { v: 'masters', l: 'Masters', icon: Trophy },
          { v: 'payouts', l: 'Demandes de paiement', icon: ArrowDownToLine },
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              tab === t.v ? 'border-violet-500 text-violet-500' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="h-4 w-4" /> {t.l}
          </button>
        ))}
      </div>

      {tab === 'payouts' ? <PayoutsPanel /> : (
      <>
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'approved', 'suspended', 'rejected'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              statusFilter === f ? 'bg-violet-500 text-white border-violet-500' : 'border-border text-muted-foreground hover:border-violet-500/40'
            }`}>
            {f === 'all' ? 'Tous' : STATUS_LABELS[f]}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Masters table */}
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          : masters.length === 0 ? <div className="py-16 text-center text-muted-foreground">Aucun master.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3 text-xs text-muted-foreground">Master</th>
                  <th className="text-center p-3 text-xs text-muted-foreground">Source</th>
                  <th className="text-center p-3 text-xs text-muted-foreground">Statut</th>
                  <th className="text-right p-3 text-xs text-muted-foreground">ROI</th>
                  <th className="text-right p-3 text-xs text-muted-foreground">Trades</th>
                  <th className="text-right p-3 text-xs text-muted-foreground">Copieurs</th>
                  <th className="text-center p-3 text-xs text-muted-foreground">IA</th>
                  <th className="text-center p-3 text-xs text-muted-foreground">Actions</th>
                </tr></thead>
                <tbody>
                  {masters.map(m => {
                    const ai = m.aiRisk || {}
                    return (
                      <tr key={m._id} className="border-b hover:bg-muted/20">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                              {(m.displayName || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <p className="font-medium">{m.displayName}</p>
                              <p className="text-[11px] text-muted-foreground">{m.user?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {m.sourceType === 'bot' ? <><Zap className="h-2.5 w-2.5 mr-0.5" /> Bot</> : '👤 Trader'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`text-[10px] border ${STATUS_COLORS[m.status]}`} variant="outline">
                            {STATUS_LABELS[m.status]}
                          </Badge>
                        </td>
                        <td className={`p-3 text-right font-bold ${(m.stats?.roi || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {(m.stats?.roi || 0) >= 0 ? '+' : ''}{(m.stats?.roi || 0).toFixed(1)}%
                        </td>
                        <td className="p-3 text-right">{m.stats?.totalTrades || 0}</td>
                        <td className="p-3 text-right">{m.followersCount || 0}</td>
                        <td className="p-3 text-center">
                          <span className={`text-xs font-medium ${AI_COLORS[ai.flag] || ''}`}>
                            {AI_LABELS[ai.flag] || '—'}
                          </span>
                          <p className="text-[9px] text-muted-foreground">{ai.score || 0}/100</p>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setDetail(m)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => onRecheck(m)}
                              disabled={actionId === m._id} title="Recalculer IA">
                              {actionId === m._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                            </Button>
                            {m.status === 'pending' && (
                              <>
                                <Button size="sm" variant="gradient" className="h-7 px-2" onClick={() => onApprove(m)} disabled={actionId === m._id}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => setRejectModal(m)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {m.status === 'approved' && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-orange-500" onClick={() => setSuspendModal(m)}>
                                <Pause className="h-3 w-3" />
                              </Button>
                            )}
                            {m.status === 'suspended' && (
                              <Button size="sm" variant="outline" className="h-7 px-2 text-green-500" onClick={() => onUnsuspend(m)} disabled={actionId === m._id}>
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500" onClick={() => onDelete(m)} disabled={actionId === m._id}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      </>
      )}

      {/* Modals */}
      {detail && <DetailModal master={detail} onClose={() => setDetail(null)} />}
      {rejectModal && (
        <ReasonModal title={`Rejeter ${rejectModal.displayName}`} onClose={() => { setRejectModal(null); setReason('') }}
          reason={reason} setReason={setReason} onSubmit={submitReject} loading={actionId === rejectModal._id} confirmLabel="Rejeter" danger />
      )}
      {suspendModal && (
        <ReasonModal title={`Suspendre ${suspendModal.displayName}`} onClose={() => { setSuspendModal(null); setReason('') }}
          reason={reason} setReason={setReason} onSubmit={submitSuspend} loading={actionId === suspendModal._id} confirmLabel="Suspendre" danger
          warning="Toutes les souscriptions actives seront mises en pause automatiquement." />
      )}
      {showLogs && <LogsModal logs={logs} onClose={() => setShowLogs(false)} onRefresh={loadLogs} />}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color = '' }) {
  return (
    <Card><CardContent className="p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold mb-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </CardContent></Card>
  )
}

function DetailModal({ master, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg">{master.displayName}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Slug', master.slug],
              ['Style', master.tradingStyle],
              ['Risque', master.riskLevel],
              ['Source', master.sourceType],
              ['Robot plan', master.robotPlan || '—'],
              ['Frais perf', `${master.feePct || 0}%`],
              ['Capital min', `$${master.minCapital || 0}`],
              ['Email user', master.user?.email],
              ['ROI', `${(master.stats?.roi || 0).toFixed(2)}%`],
              ['Profit total', `$${(master.stats?.totalProfit || 0).toFixed(2)}`],
              ['Winrate', `${(master.stats?.winRate || 0).toFixed(1)}%`],
              ['Max DD', `${(master.stats?.maxDrawdown || 0).toFixed(1)}%`],
              ['Copieurs', master.followersCount || 0],
              ['Score IA', `${master.aiRisk?.score || 0}/100`],
            ].map(([k, v]) => (
              <div key={k} className="bg-muted/20 rounded-lg p-2.5">
                <p className="text-[9px] text-muted-foreground uppercase">{k}</p>
                <p className="font-medium text-sm">{v}</p>
              </div>
            ))}
          </div>
          {master.bio && <div className="bg-muted/20 rounded-lg p-3">
            <p className="text-[9px] text-muted-foreground uppercase mb-1">Bio</p>
            <p className="text-sm">{master.bio}</p>
          </div>}
          {master.aiRisk?.reason && <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-[9px] text-amber-600 uppercase mb-1">Évaluation IA</p>
            <p className="text-sm">{master.aiRisk.reason}</p>
          </div>}
          {master.rejectionReason && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-[9px] text-red-500 uppercase mb-1">Motif rejet/suspension</p>
            <p className="text-sm">{master.rejectionReason}</p>
          </div>}
        </div>
      </div>
    </div>
  )
}

function ReasonModal({ title, reason, setReason, onSubmit, onClose, loading, confirmLabel, danger, warning }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-5">
          <h2 className="font-bold text-lg mb-3">{title}</h2>
          {warning && <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs mb-3">{warning}</div>}
          <label className="text-sm font-medium block mb-1.5">Motif</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
            placeholder="Expliquez la raison..." />
          <div className="flex gap-2 mt-4">
            <Button variant={danger ? 'destructive' : 'gradient'} className="flex-1" onClick={onSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {confirmLabel}
            </Button>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LogsModal({ logs, onClose, onRefresh }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2"><Activity className="h-4 w-4" /> Logs moteur copy trading</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRefresh}><RefreshCw className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
          {logs.length === 0 ? <p className="p-6 text-center text-muted-foreground">Aucun log.</p>
          : logs.map((l, i) => (
            <div key={i} className={`px-3 py-1.5 border-b border-border/40 ${
              l.level === 'error' ? 'text-red-500' : l.level === 'warn' ? 'text-amber-500' : ''
            }`}>
              <span className="text-muted-foreground">[{new Date(l.t).toLocaleTimeString('fr-FR')}]</span>{' '}
              <span className="font-semibold">[{l.level}]</span>{' '}
              {l.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Payouts management panel ─────────────────────────────────────────────────
const PAYOUT_STATUS_COLORS = {
  pending:    'bg-amber-500/10 text-amber-600 border-amber-500/30',
  processing: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  completed:  'bg-green-500/10 text-green-600 border-green-500/30',
  rejected:   'bg-red-500/10 text-red-600 border-red-500/30',
}
const METHOD_ICONS = { crypto: '₿', bank_transfer: '🏦', paypal: '💳', other: '⋯' }

function PayoutsPanel() {
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [pendingSummary, setPendingSummary] = useState({ amount: 0, count: 0 })
  const [completeModal, setCompleteModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [actionId, setActionId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await copyTradingAPI.adminGetPayouts({ status: statusFilter, limit: 50 })
      setPayouts(data.payouts || [])
      setPendingSummary(data.pendingSummary || { amount: 0, count: 0 })
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const onProcess = async (id) => {
    setActionId(id)
    try { await copyTradingAPI.adminProcessPayout(id); await load() }
    catch (err) { alert(err.response?.data?.error || 'Erreur') }
    finally { setActionId(null) }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {statusFilter === 'pending' && pendingSummary.count > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-6 w-6 text-amber-500" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{pendingSummary.count} demande(s) en attente</p>
              <p className="text-xs text-muted-foreground">Total à traiter : <strong className="text-amber-600">${pendingSummary.amount.toFixed(2)}</strong></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['pending', 'processing', 'completed', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              statusFilter === s ? 'bg-violet-500 text-white border-violet-500' : 'border-border text-muted-foreground hover:border-violet-500/40'
            }`}>
            {s === 'all' ? 'Tous' : s === 'pending' ? 'En attente' : s === 'processing' ? 'En cours' : s === 'completed' ? 'Payés' : 'Rejetés'}
          </button>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          : payouts.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">Aucune demande.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Master</th>
                  <th className="text-center p-3">Méthode</th>
                  <th className="text-left p-3">Adresse / Notes</th>
                  <th className="text-right p-3">Montant</th>
                  <th className="text-center p-3">Statut</th>
                  <th className="text-center p-3">Actions</th>
                </tr></thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p._id} className="border-b hover:bg-muted/20">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{p.master?.firstName} {p.master?.lastName}</p>
                          <p className="text-[10px] text-muted-foreground">{p.master?.email}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Solde dispo: <strong>${(p.master?.copyTradingAvailable || 0).toFixed(2)}</strong> ·
                            Total: ${(p.master?.copyTradingEarnings || 0).toFixed(2)}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {METHOD_ICONS[p.payoutMethod]} {p.payoutMethod}
                        </Badge>
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="font-mono text-[10px] break-all">{p.payoutAddress}</p>
                        {p.payoutNotes && <p className="text-[10px] text-muted-foreground mt-1 italic">{p.payoutNotes}</p>}
                        {p.payoutTxRef && <p className="text-[10px] text-green-600 mt-1">TX: {p.payoutTxRef}</p>}
                      </td>
                      <td className="p-3 text-right">
                        <p className="font-bold text-base">${Math.abs(p.amount).toFixed(2)}</p>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={`text-[10px] border ${PAYOUT_STATUS_COLORS[p.payoutStatus]}`} variant="outline">
                          {p.payoutStatus}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          {p.payoutStatus === 'pending' && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-blue-500"
                              onClick={() => onProcess(p._id)} disabled={actionId === p._id}
                              title="Marquer en cours">
                              {actionId === p._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
                            </Button>
                          )}
                          {(p.payoutStatus === 'pending' || p.payoutStatus === 'processing') && (
                            <>
                              <Button size="sm" variant="gradient" className="h-7 px-2"
                                onClick={() => setCompleteModal(p)} title="Marquer payé">
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 px-2"
                                onClick={() => setRejectModal(p)} title="Rejeter">
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {p.payoutTxRef && (
                            <Button size="sm" variant="ghost" className="h-7 px-2"
                              onClick={() => navigator.clipboard?.writeText(p.payoutTxRef)} title="Copier TX">
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {completeModal && <CompletePayoutModal payout={completeModal} onClose={() => setCompleteModal(null)} onDone={() => { setCompleteModal(null); load() }} />}
      {rejectModal && <RejectPayoutModal payout={rejectModal} onClose={() => setRejectModal(null)} onDone={() => { setRejectModal(null); load() }} />}
    </div>
  )
}

function CompletePayoutModal({ payout, onClose, onDone }) {
  const [txRef, setTxRef] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true); setError('')
    try {
      await copyTradingAPI.adminCompletePayout(payout._id, { txRef, notes })
      onDone()
    } catch (err) { setError(err.response?.data?.error || 'Erreur') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="border-b px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" /> Confirmer le paiement
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
            <p><strong>Master :</strong> {payout.master?.firstName} {payout.master?.lastName} ({payout.master?.email})</p>
            <p><strong>Montant :</strong> ${Math.abs(payout.amount).toFixed(2)}</p>
            <p><strong>Méthode :</strong> {payout.payoutMethod}</p>
            <p><strong>Adresse :</strong> <span className="font-mono break-all">{payout.payoutAddress}</span></p>
            {payout.payoutNotes && <p><strong>Notes master :</strong> {payout.payoutNotes}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Référence transaction (TX hash, ID virement...)</label>
            <Input value={txRef} onChange={e => setTxRef(e.target.value)} placeholder="0x... / numéro virement / ID PayPal" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes admin (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Détails sur le paiement..." />
          </div>

          {error && <div className="bg-red-500/10 text-red-500 text-sm rounded-lg p-3">{error}</div>}

          <p className="text-[10px] text-muted-foreground">
            ⚠ Le master sera notifié et le solde sera marqué comme payé. Cette action est irréversible.
          </p>

          <Button variant="gradient" className="w-full" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Confirmer le paiement effectué
          </Button>
        </div>
      </div>
    </div>
  )
}

function RejectPayoutModal({ payout, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setLoading(true); setError('')
    try {
      await copyTradingAPI.adminRejectPayout(payout._id, { reason })
      onDone()
    } catch (err) { setError(err.response?.data?.error || 'Erreur') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-5">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <X className="h-5 w-5 text-red-500" /> Rejeter la demande
          </h2>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs mb-3">
            Le solde de <strong>${Math.abs(payout.amount).toFixed(2)}</strong> sera <strong>automatiquement restitué</strong> au master.
          </div>
          <label className="text-sm font-medium block mb-1.5">Motif du rejet</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
            placeholder="Adresse invalide, problème de vérification..." />
          {error && <div className="bg-red-500/10 text-red-500 text-sm rounded-lg p-3 mt-3">{error}</div>}
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" className="flex-1" onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
              Rejeter et restituer
            </Button>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
