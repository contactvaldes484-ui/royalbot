import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { copyTradingAPI } from '../../lib/api'
import {
  Copy, Play, Pause, Square, Trash2, Loader2, Settings, TrendingUp, TrendingDown,
  Users, Activity, AlertTriangle, Shield, ChevronRight, Plus, Zap, BarChart3, X, Save
} from 'lucide-react'

const STATUS_COLORS = {
  active:  'bg-green-500/10 text-green-600 border-green-500/30',
  paused:  'bg-amber-500/10 text-amber-600 border-amber-500/30',
  stopped: 'bg-red-500/10 text-red-600 border-red-500/30',
}
const STATUS_LABELS = { active: 'Active', paused: 'En pause', stopped: 'Arrêtée' }
const PAUSED_BY = { user: 'Vous', ai: '🤖 IA', admin: 'Admin' }

export default function MyCopyTrading() {
  const [subs, setSubs] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [editSub, setEditSub] = useState(null)
  const [tradesModal, setTradesModal] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: subsData }, { data: statsData }] = await Promise.all([
        copyTradingAPI.getMySubscriptions(),
        copyTradingAPI.getMyStats(),
      ])
      setSubs(subsData.subscriptions || [])
      setStats(statsData.stats || {})
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const act = async (id, fn) => {
    setActionId(id)
    try { await fn(); await load() }
    catch (err) { alert(err.response?.data?.error || 'Erreur') }
    finally { setActionId(null) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Copy className="h-6 w-6 text-violet-500" /> Mes Copy Trading
          </h1>
          <p className="text-sm text-muted-foreground">Gérez vos copies automatiques de traders et robots IA</p>
        </div>
        <Link to="/copy-trading">
          <Button variant="gradient"><Plus className="h-4 w-4 mr-2" /> Découvrir des traders</Button>
        </Link>
      </div>

      {/* Aggregated stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatBox icon={Users} label="Copies actives" value={stats.activeSubscriptions || 0} color="text-green-500" />
        <StatBox icon={Pause} label="En pause" value={stats.pausedSubscriptions || 0} color="text-amber-500" />
        <StatBox icon={Activity} label="Trades copiés" value={stats.copied || 0} />
        <StatBox icon={BarChart3} label="Trades ouverts" value={stats.open || 0} />
        <StatBox icon={TrendingUp} label="P/L Net"
          value={`${(stats.netPnl || 0) >= 0 ? '+' : ''}$${(stats.netPnl || 0).toFixed(2)}`}
          color={(stats.netPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'} />
        <StatBox icon={Activity} label="Winrate" value={`${(stats.winRate || 0).toFixed(0)}%`} />
      </div>

      {/* Subscriptions list */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
      ) : subs.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Copy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-bold mb-1">Aucune copie en cours</h3>
          <p className="text-sm text-muted-foreground mb-4">Découvrez les meilleurs traders et copiez leurs trades automatiquement.</p>
          <Link to="/copy-trading"><Button variant="gradient">Explorer le classement →</Button></Link>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {subs.map(sub => {
            const m = sub.master || {}
            const s = sub.stats || {}
            const ai = m.aiRisk || {}
            const isAI = ai.flag === 'danger' || ai.flag === 'critical'
            return (
              <Card key={sub._id} className={isAI ? 'border-red-500/40' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Master info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-bold">
                          {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full rounded-xl object-cover" /> : (m.displayName || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </div>
                        {isAI && <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
                          <AlertTriangle className="h-3 w-3 text-white" />
                        </div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link to={`/copy-trading/${m.slug}`} className="font-bold text-sm hover:text-violet-500 truncate">
                            {m.displayName || 'Master'}
                          </Link>
                          <Badge className={`text-[9px] border ${STATUS_COLORS[sub.status]}`} variant="outline">
                            {STATUS_LABELS[sub.status]}{sub.pausedBy && sub.status === 'paused' ? ` (${PAUSED_BY[sub.pausedBy]})` : ''}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Compte: {sub.followerBinanceAccount?.label || 'Binance'} · {sub.followerBinanceAccount?.market}{sub.followerBinanceAccount?.isTestnet ? ' (testnet)' : ''} · ${(((sub.followerBinanceAccount?.spotUSDT || 0) + (sub.followerBinanceAccount?.futuresUSDT || 0))).toFixed(0)}
                        </p>
                        {sub.pauseReason && <p className="text-[10px] text-amber-600 mt-0.5 truncate">⚠ {sub.pauseReason}</p>}
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-4 gap-3 md:gap-5 text-center md:text-right">
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">P/L Net</p>
                        <p className={`text-sm font-bold ${(s.netPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${(s.netPnl || 0).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Copiés</p>
                        <p className="text-sm font-bold">{s.copiedTrades || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">Ouverts</p>
                        <p className="text-sm font-bold text-blue-500">{s.openTrades || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase">DD</p>
                        <p className="text-sm font-bold text-orange-500">${(s.maxDrawdown || 0).toFixed(0)}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {sub.status === 'active' && (
                        <Button size="sm" variant="outline" className="h-8 text-xs px-2"
                          disabled={actionId === sub._id}
                          onClick={() => act(sub._id, () => copyTradingAPI.pauseSubscription(sub._id))}>
                          {actionId === sub._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                        </Button>
                      )}
                      {sub.status === 'paused' && (
                        <Button size="sm" variant="outline" className="h-8 text-xs px-2"
                          disabled={actionId === sub._id}
                          onClick={() => act(sub._id, () => copyTradingAPI.resumeSubscription(sub._id))}>
                          {actionId === sub._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={() => setEditSub(sub)}>
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs px-2" onClick={() => setTradesModal(sub)}>
                        <BarChart3 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs px-2 text-red-500"
                        disabled={actionId === sub._id}
                        onClick={() => {
                          if (!window.confirm('Arrêter définitivement cette copie ?')) return
                          act(sub._id, () => copyTradingAPI.stopSubscription(sub._id))
                        }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {editSub && <SettingsModal sub={editSub} onClose={() => setEditSub(null)} onSaved={() => { setEditSub(null); load() }} />}
      {tradesModal && <TradesModal sub={tradesModal} onClose={() => setTradesModal(null)} />}
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

function SettingsModal({ sub, onClose, onSaved }) {
  const [form, setForm] = useState({ ...sub.settings })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true); setError('')
    try {
      await copyTradingAPI.updateSubscription(sub._id, { settings: form })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg">Réglages — {sub.master?.displayName}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Mode de lot</label>
            <select value={form.lotMode} onChange={e => update('lotMode', e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="proportional">Proportionnel (selon ton capital)</option>
              <option value="fixed">Lot fixe</option>
              <option value="multiplier">Multiplicateur</option>
            </select>
          </div>
          {form.lotMode === 'fixed' && (
            <div><label className="text-xs text-muted-foreground">Lot fixe</label>
              <Input type="number" step="0.01" min="0.01" value={form.fixedLot} onChange={e => update('fixedLot', +e.target.value)} /></div>
          )}
          {form.lotMode === 'multiplier' && (
            <div><label className="text-xs text-muted-foreground">Multiplicateur</label>
              <Input type="number" step="0.1" min="0.01" value={form.multiplier} onChange={e => update('multiplier', +e.target.value)} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Lot max</label>
              <Input type="number" step="0.01" value={form.maxLotPerTrade} onChange={e => update('maxLotPerTrade', +e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Capital max ($)</label>
              <Input type="number" value={form.maxAllocation} onChange={e => update('maxAllocation', +e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Max DD (%)</label>
              <Input type="number" value={form.maxDrawdownPct} onChange={e => update('maxDrawdownPct', +e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">SL global ($)</label>
              <Input type="number" value={form.globalSL} onChange={e => update('globalSL', +e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">TP global ($)</label>
              <Input type="number" value={form.globalTP} onChange={e => update('globalTP', +e.target.value)} /></div>
          </div>
          <div className="space-y-1 border-t pt-3">
            {[
              ['copySL', 'Copier SL master'],
              ['copyTP', 'Copier TP master'],
              ['reverseDirection', 'Inverser direction'],
              ['aiGuardEnabled', '🤖 IA Protection'],
              ['aiPauseOnMasterDanger', 'Pause auto si master en danger'],
            ].map(([k, l]) => (
              <button key={k} type="button" onClick={() => update(k, !form[k])}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 text-sm">
                <span>{l}</span>
                <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${form[k] ? 'bg-violet-500' : 'bg-muted'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${form[k] ? 'translate-x-5' : ''}`} />
                </div>
              </button>
            ))}
          </div>
          {error && <div className="bg-red-500/10 text-red-500 text-sm rounded-lg p-3">{error}</div>}
          <Button variant="gradient" className="w-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  )
}

function TradesModal({ sub, onClose }) {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    copyTradingAPI.getSubscriptionTrades(sub._id, { limit: 50 })
      .then(({ data }) => setTrades(data.trades || []))
      .finally(() => setLoading(false))
  }, [sub._id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg">Trades copiés — {sub.master?.displayName}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-0">
          {loading ? <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          : trades.length === 0 ? <p className="p-10 text-center text-sm text-muted-foreground">Aucun trade copié pour le moment.</p>
          : (
            <table className="w-full text-xs">
              <thead className="bg-muted/30 sticky top-[68px]">
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Symbole</th>
                  <th className="text-center p-2">Type</th>
                  <th className="text-right p-2">Lot</th>
                  <th className="text-center p-2">Statut</th>
                  <th className="text-right p-2">Profit</th>
                  <th className="text-right p-2">Fee</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t._id} className="border-b hover:bg-muted/20">
                    <td className="p-2 text-muted-foreground whitespace-nowrap">{new Date(t.openTime).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-2 font-medium">{t.symbol}</td>
                    <td className="p-2 text-center"><Badge variant={t.type === 'buy' ? 'success' : 'destructive'} className="text-[9px]">{t.type?.toUpperCase()}</Badge></td>
                    <td className="p-2 text-right">{(t.followerLot || 0).toFixed(2)}</td>
                    <td className="p-2 text-center"><Badge variant="outline" className="text-[9px]">{t.status}</Badge></td>
                    <td className={`p-2 text-right font-bold ${(t.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {t.status === 'closed' ? `${(t.profit || 0) >= 0 ? '+' : ''}$${(t.profit || 0).toFixed(2)}` : '—'}
                    </td>
                    <td className="p-2 text-right text-muted-foreground">${(t.fee || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
