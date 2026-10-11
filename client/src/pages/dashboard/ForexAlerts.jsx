import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { forexAPI } from '../../lib/api'
import {
  Bell, Plus, Trash2, Loader2, Save, X, Edit2, Power, PowerOff,
  CheckCircle2, AlertTriangle, MessageSquare, Mail, Send, Globe, Smartphone
} from 'lucide-react'

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d']
const TF_LABELS = { '1m': 'M1', '5m': 'M5', '15m': 'M15', '1h': 'H1', '4h': 'H4', '1d': 'D1' }
const SMC_TRIGGERS = [
  { v: 'bos', l: 'BOS' },
  { v: 'choch', l: 'CHoCH' },
  { v: 'fvg', l: 'FVG' },
  { v: 'order_block', l: 'Order Block' },
  { v: 'breakout', l: 'Breakout' },
  { v: 'fake_breakout', l: 'Fake breakout' },
]

const DEFAULT_FORM = {
  label: '',
  symbols: [],
  timeframes: [],
  signals: ['buy', 'sell'],
  minConfidence: 70,
  triggerOn: ['bos', 'choch', 'fvg', 'order_block', 'breakout', 'fake_breakout'],
  channels: { push: true, email: false, telegram: false, websocket: true },
  cooldownMinutes: 30,
  enabled: true,
}

export default function ForexAlerts() {
  const [alerts, setAlerts] = useState([])
  const [symbols, setSymbols] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: a }, { data: s }] = await Promise.all([
        forexAPI.getAlerts(),
        forexAPI.symbols(),
      ])
      setAlerts(a.alerts || [])
      setSymbols(s.symbols || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(DEFAULT_FORM); setError(''); setShowForm(true) }
  const openEdit = (a) => {
    setEditing(a)
    setForm({
      label: a.label || '',
      symbols: a.symbols || [],
      timeframes: a.timeframes || [],
      signals: a.signals || ['buy', 'sell'],
      minConfidence: a.minConfidence || 70,
      triggerOn: a.triggerOn || [],
      channels: a.channels || DEFAULT_FORM.channels,
      cooldownMinutes: a.cooldownMinutes || 30,
      enabled: a.enabled,
    })
    setError(''); setShowForm(true)
  }

  const submit = async () => {
    setSaving(true); setError('')
    try {
      if (editing) await forexAPI.updateAlert(editing._id, form)
      else         await forexAPI.createAlert(form)
      setShowForm(false)
      await load()
    } catch (err) { setError(err.response?.data?.error || err.message) }
    finally { setSaving(false) }
  }

  const toggle = async (a) => {
    await forexAPI.updateAlert(a._id, { enabled: !a.enabled })
    await load()
  }

  const remove = async (a) => {
    if (!window.confirm(`Supprimer l'alerte "${a.label || 'Sans nom'}" ?`)) return
    await forexAPI.deleteAlert(a._id)
    await load()
  }

  const toggleArrayItem = (arr, item) =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-violet-500" /> Alertes IA Forex</h1>
          <p className="text-sm text-muted-foreground">Notifications push / email / Telegram / temps réel sur les signaux IA</p>
        </div>
        <Button variant="gradient" onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nouvelle alerte</Button>
      </div>

      {loading ? <Card><CardContent className="py-16 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-violet-500" /></CardContent></Card>
      : alerts.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-bold mb-1">Aucune alerte configurée</h3>
          <p className="text-sm text-muted-foreground mb-4">Créez votre première alerte pour être notifié des meilleurs setups détectés par l'IA.</p>
          <Button variant="gradient" onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Créer une alerte</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map(a => (
            <Card key={a._id} className={a.enabled ? '' : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-sm">{a.label || 'Alerte sans nom'}</h3>
                      {a.enabled ? <Badge variant="outline" className="text-[9px] border-green-500/40 text-green-500">Actif</Badge>
                                 : <Badge variant="outline" className="text-[9px]">Désactivé</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {a.symbols?.length ? a.symbols.join(', ') : 'Tous symboles'} ·{' '}
                      {a.timeframes?.length ? a.timeframes.map(t => TF_LABELS[t] || t).join(', ') : 'Tous TF'} ·{' '}
                      Confiance ≥ {a.minConfidence}%
                    </p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {a.signals?.includes('buy') && <Badge variant="outline" className="text-[9px] border-green-500/40 text-green-500">↑ Achat</Badge>}
                      {a.signals?.includes('sell') && <Badge variant="outline" className="text-[9px] border-red-500/40 text-red-500">↓ Vente</Badge>}
                    </div>
                    <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
                      {a.channels?.push && <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> Push</span>}
                      {a.channels?.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>}
                      {a.channels?.telegram && <span className="flex items-center gap-1"><Send className="h-3 w-3" /> Telegram</span>}
                      {a.channels?.websocket && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> WS</span>}
                    </div>
                    {a.triggered > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {a.triggered} déclenchement(s) · dernière fois : {a.lastTriggeredAt ? new Date(a.lastTriggeredAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggle(a)} title={a.enabled ? 'Désactiver' : 'Activer'}>
                      {a.enabled ? <Power className="h-3 w-3 text-green-500" /> : <PowerOff className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(a)}><Edit2 className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => remove(a)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2"><Bell className="h-5 w-5 text-violet-500" /> {editing ? 'Modifier' : 'Créer'} une alerte</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom de l'alerte</label>
                <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Ex: Setups EURUSD H1+" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Symboles (vide = tous)</label>
                <div className="flex flex-wrap gap-1">
                  {symbols.map(s => (
                    <button key={s} type="button" onClick={() => setForm({ ...form, symbols: toggleArrayItem(form.symbols, s) })}
                      className={`px-2 py-1 rounded text-[10px] font-bold border ${
                        form.symbols.includes(s) ? 'bg-violet-500 text-white border-violet-500' : 'border-border'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Timeframes (vide = tous)</label>
                <div className="flex gap-1">
                  {TIMEFRAMES.map(tf => (
                    <button key={tf} type="button" onClick={() => setForm({ ...form, timeframes: toggleArrayItem(form.timeframes, tf) })}
                      className={`px-2 py-1 rounded text-[10px] font-bold border ${
                        form.timeframes.includes(tf) ? 'bg-violet-500 text-white border-violet-500' : 'border-border'
                      }`}>{TF_LABELS[tf]}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Signaux</label>
                  <div className="flex gap-1">
                    {['buy', 'sell', 'wait'].map(s => (
                      <button key={s} type="button" onClick={() => setForm({ ...form, signals: toggleArrayItem(form.signals, s) })}
                        className={`flex-1 px-2 py-1.5 rounded text-xs font-bold border ${
                          form.signals.includes(s) ? (s === 'buy' ? 'bg-green-500 text-white border-green-500' : s === 'sell' ? 'bg-red-500 text-white border-red-500' : 'bg-violet-500 text-white border-violet-500') : 'border-border'
                        }`}>
                        {s === 'buy' ? '↑ Achat' : s === 'sell' ? '↓ Vente' : 'Attendre'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Confiance min ({form.minConfidence}%)</label>
                  <input type="range" min="0" max="100" step="5" value={form.minConfidence}
                    onChange={e => setForm({ ...form, minConfidence: +e.target.value })} className="w-full" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Déclencheurs SMC</label>
                <div className="grid grid-cols-3 gap-1">
                  {SMC_TRIGGERS.map(t => (
                    <button key={t.v} type="button" onClick={() => setForm({ ...form, triggerOn: toggleArrayItem(form.triggerOn, t.v) })}
                      className={`px-2 py-1.5 rounded text-xs border ${
                        form.triggerOn.includes(t.v) ? 'bg-violet-500 text-white border-violet-500' : 'border-border'
                      }`}>{t.l}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Canaux de notification</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { k: 'push', l: 'Push (PWA)', icon: Smartphone },
                    { k: 'websocket', l: 'Temps réel (WS)', icon: Globe },
                    { k: 'email', l: 'Email', icon: Mail },
                    { k: 'telegram', l: 'Telegram', icon: Send },
                  ].map(c => (
                    <label key={c.k} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${form.channels[c.k] ? 'border-violet-500 bg-violet-500/10' : 'border-border'}`}>
                      <input type="checkbox" checked={form.channels[c.k]}
                        onChange={e => setForm({ ...form, channels: { ...form.channels, [c.k]: e.target.checked } })} />
                      <c.icon className="h-4 w-4" />
                      <span className="text-xs">{c.l}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Cooldown anti-spam (minutes)</label>
                <Input type="number" min="0" max="1440" value={form.cooldownMinutes}
                  onChange={e => setForm({ ...form, cooldownMinutes: +e.target.value })} />
                <p className="text-[10px] text-muted-foreground mt-1">Délai minimum entre 2 alertes pour le même (symbole, TF, signal)</p>
              </div>

              {error && <div className="bg-red-500/10 text-red-500 text-sm rounded-lg p-3">{error}</div>}

              <div className="flex gap-2">
                <Button variant="gradient" className="flex-1" onClick={submit} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {editing ? 'Enregistrer' : 'Créer l\'alerte'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
