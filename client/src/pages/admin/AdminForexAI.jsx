import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { forexAPI } from '../../lib/api'
import {
  Brain, Settings, Save, Loader2, Power, PowerOff, RefreshCw, Play, Activity,
  Database, Bell, Zap, Clock, TrendingUp, BarChart3, AlertTriangle, CheckCircle2,
  Sliders, X
} from 'lucide-react'

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']

export default function AdminForexAI() {
  const [config, setConfig] = useState(null)
  const [stats, setStats] = useState({})
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: c }, { data: s }, { data: l }] = await Promise.all([
        forexAPI.adminGetConfig(),
        forexAPI.adminGetStats(),
        forexAPI.adminGetLogs(50),
      ])
      setConfig(c.config)
      setStats(s)
      setLogs(l.logs || [])
    } catch (err) { setError(err.response?.data?.error || err.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Auto-refresh stats + logs every 15s
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const [{ data: s }, { data: l }] = await Promise.all([
          forexAPI.adminGetStats(), forexAPI.adminGetLogs(50),
        ])
        setStats(s)
        setLogs(l.logs || [])
      } catch {}
    }, 15_000)
    return () => clearInterval(t)
  }, [])

  const update = (k, v) => setConfig(c => ({ ...c, [k]: v }))

  const save = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload = { ...config }
      // Don't send masked API key
      if (payload.twelveDataApiKey?.startsWith('***')) delete payload.twelveDataApiKey
      await forexAPI.adminUpdateConfig(payload)
      setSuccess('Configuration enregistrée')
      setTimeout(() => setSuccess(''), 3000)
      await load()
    } catch (err) { setError(err.response?.data?.error || err.message) }
    finally { setSaving(false) }
  }

  const scanNow = async () => {
    setScanning(true)
    try { await forexAPI.adminScanNow(); setSuccess('Scan déclenché'); setTimeout(() => setSuccess(''), 3000) }
    catch (err) { setError(err.response?.data?.error || err.message) }
    finally { setScanning(false) }
  }

  const toggleSymbol = (s) => update('symbols', config.symbols.includes(s) ? config.symbols.filter(x => x !== s) : [...config.symbols, s])
  const toggleTF = (tf) => update('timeframes', config.timeframes.includes(tf) ? config.timeframes.filter(x => x !== tf) : [...config.timeframes, tf])

  if (loading || !config) return <div className="py-20 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-violet-500" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-violet-500" /> Admin · IA Forex</h1>
          <p className="text-sm text-muted-foreground">Configuration du moteur IA, sensibilité, monitoring & logs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={scanNow} disabled={scanning}><Play className="h-4 w-4 mr-2" />Scanner maintenant</Button>
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Actualiser</Button>
        </div>
      </div>

      {success && <Card className="border-green-500/40 bg-green-500/5"><CardContent className="p-3 flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500" />{success}</CardContent></Card>}
      {error && <Card className="border-red-500/40 bg-red-500/5"><CardContent className="p-3 flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-red-500" />{error}</CardContent></Card>}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={config.enabled ? Power : PowerOff} label="État" value={config.enabled ? 'Actif' : 'Arrêté'} color={config.enabled ? 'text-green-500' : 'text-red-500'} />
        <StatCard icon={Activity} label="Scans totaux" value={stats.totalScansRun || 0} color="text-violet-500" />
        <StatCard icon={Database} label="Analyses générées" value={stats.totalAnalysesGenerated || 0} color="text-blue-500" />
        <StatCard icon={Bell} label="Alertes déclenchées" value={stats.totalAlertsFired || 0} color="text-orange-500" />
        <StatCard icon={Zap} label="Règles d'alertes actives" value={stats.activeAlertRules || 0} color="text-amber-500" />
        <StatCard icon={Database} label="Analyses en cache" value={stats.cachedAnalyses || 0} color="text-cyan-500" />
        <StatCard icon={Clock} label="Dernier scan" value={stats.lastScanAt ? new Date(stats.lastScanAt).toLocaleTimeString('fr-FR') : '—'} color="text-muted-foreground" />
        <StatCard icon={TrendingUp} label="Durée dernier scan" value={`${((stats.lastScanDurationMs || 0) / 1000).toFixed(1)}s`} color="text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engine config */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sliders className="h-4 w-4 text-violet-500" /> Configuration du moteur</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="font-semibold text-sm">Moteur IA</p>
                <p className="text-[11px] text-muted-foreground">Active/désactive le scanner périodique</p>
              </div>
              <ToggleSwitch checked={config.enabled} onChange={v => update('enabled', v)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="font-semibold text-sm">Alertes utilisateurs</p>
                <p className="text-[11px] text-muted-foreground">Autorise l'envoi de notifications</p>
              </div>
              <ToggleSwitch checked={config.alertsEnabled} onChange={v => update('alertsEnabled', v)} />
            </div>

            <Slider label="Sensibilité IA" value={config.sensitivity} onChange={v => update('sensitivity', v)} min={0} max={100} step={5}
              help="Plus haut = moins de signaux mais plus stricts" />
            <Slider label="Confiance min (scanner)" value={config.minConfidence} onChange={v => update('minConfidence', v)} min={0} max={100} step={5} />
            <Slider label="Confiance min (alertes)" value={config.alertMinConfidence} onChange={v => update('alertMinConfidence', v)} min={0} max={100} step={5} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Lookback swings (bars)</label>
                <Input type="number" min="2" max="10" value={config.swingLookback} onChange={e => update('swingLookback', +e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Bougies / analyse</label>
                <Input type="number" min="50" max="500" step="10" value={config.candleCount} onChange={e => update('candleCount', +e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Intervalle scan (ms)</label>
                <Input type="number" min="60000" step="60000" value={config.scannerIntervalMs} onChange={e => update('scannerIntervalMs', +e.target.value)} />
                <p className="text-[9px] text-muted-foreground mt-0.5">{Math.round(config.scannerIntervalMs / 60000)} min</p>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Cache TTL (ms)</label>
                <Input type="number" min="30000" step="30000" value={config.cacheTtlMs} onChange={e => update('cacheTtlMs', +e.target.value)} />
                <p className="text-[9px] text-muted-foreground mt-0.5">{Math.round(config.cacheTtlMs / 60000)} min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Symbols & TFs */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-500" /> Marchés surveillés</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium block mb-2">Symboles ({config.symbols.length})</label>
              <div className="flex flex-wrap gap-1">
                {['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF',
                  'EURJPY', 'GBPJPY', 'EURGBP', 'AUDJPY', 'GBPAUD',
                  'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD'].map(s => (
                  <button key={s} type="button" onClick={() => toggleSymbol(s)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border ${
                      config.symbols.includes(s) ? 'bg-violet-500 text-white border-violet-500' : 'border-border'
                    }`}>{s}</button>
                ))}
              </div>
              <Input className="mt-2" placeholder="Ajouter un symbole personnalisé (Enter)" onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  toggleSymbol(e.target.value.trim().toUpperCase())
                  e.target.value = ''
                }
              }} />
            </div>

            <div>
              <label className="text-xs font-medium block mb-2">Timeframes ({config.timeframes.length})</label>
              <div className="flex gap-1">
                {TIMEFRAMES.map(tf => (
                  <button key={tf} type="button" onClick={() => toggleTF(tf)}
                    className={`px-2 py-1.5 rounded text-xs font-bold border ${
                      config.timeframes.includes(tf) ? 'bg-violet-500 text-white border-violet-500' : 'border-border'
                    }`}>{tf}</button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t">
              <label className="text-xs font-medium block mb-2">Fournisseur de données</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { v: 'yahoo', l: 'Yahoo Finance', d: 'Gratuit' },
                  { v: 'twelvedata', l: 'Twelve Data', d: 'Clé API requise' },
                  { v: 'synthetic', l: 'Synthétique', d: 'Dev/fallback' },
                ].map(p => (
                  <button key={p.v} type="button" onClick={() => update('dataProvider', p.v)}
                    className={`p-2 rounded-lg border text-left ${config.dataProvider === p.v ? 'border-violet-500 bg-violet-500/10' : 'border-border'}`}>
                    <p className="font-bold text-xs">{p.l}</p>
                    <p className="text-[9px] text-muted-foreground">{p.d}</p>
                  </button>
                ))}
              </div>
              {config.dataProvider === 'twelvedata' && (
                <Input placeholder="Twelve Data API Key" value={config.twelveDataApiKey || ''}
                  onChange={e => update('twelveDataApiKey', e.target.value)} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button variant="gradient" onClick={save} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer la configuration
        </Button>
      </div>

      {/* Logs */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-violet-500" /> Logs IA · temps réel</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="font-mono text-[10px] max-h-96 overflow-y-auto bg-black/95 dark:bg-black text-green-400 p-3 space-y-0.5">
            {logs.length === 0 ? <p className="text-muted-foreground">Aucun log pour le moment.</p>
            : logs.map((l, i) => (
              <div key={i} className="leading-relaxed">
                <span className="text-muted-foreground">[{new Date(l.t).toLocaleTimeString('fr-FR')}]</span>{' '}
                <span className={l.level === 'error' ? 'text-red-400' : l.level === 'info' ? 'text-blue-400' : 'text-amber-400'}>[{l.level}]</span>{' '}
                {l.message}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = '' }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={`h-7 w-7 ${color}`} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold truncate">{label}</p>
          <p className={`font-bold text-base truncate ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-violet-500' : 'bg-muted'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}

function Slider({ label, value, onChange, min = 0, max = 100, step = 5, help }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-medium mb-1">
        <span>{label}</span>
        <span className="text-violet-500 font-bold">{value}{label.toLowerCase().includes('confiance') || label.toLowerCase().includes('sensibilité') ? '%' : ''}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} className="w-full accent-violet-500" />
      {help && <p className="text-[10px] text-muted-foreground mt-0.5">{help}</p>}
    </div>
  )
}
