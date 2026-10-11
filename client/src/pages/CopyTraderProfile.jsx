import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { copyTradingAPI } from '../lib/api'
import useStore from '../store/useStore'
import api from '../lib/api'
import {
  Trophy, TrendingUp, TrendingDown, Users, Shield, Activity, Calendar,
  Loader2, Crown, Zap, BarChart3, ArrowLeft, CheckCircle2, AlertTriangle,
  Copy, X, Settings, Percent, DollarSign, Sliders, Play, ChevronRight
} from 'lucide-react'

const RISK_LABELS = { low: 'Faible', medium: 'Modéré', high: 'Élevé', extreme: 'Extrême' }
const STYLE_LABELS = { scalper: 'Scalper', day_trader: 'Day Trader', swing: 'Swing', position: 'Position', mixed: 'Polyvalent' }

// ─── Larger equity curve with axes ───────────────────────────────────────
function EquityCurve({ data = [], height = 240 }) {
  if (!data.length) return (
    <div style={{ height }} className="flex items-center justify-center bg-muted/20 rounded-xl text-muted-foreground text-sm">
      Pas encore de données de performance
    </div>
  )
  const values = data.map(d => d.equity || 0)
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const w = 600, h = height
  const padding = 20
  const innerW = w - padding * 2, innerH = h - padding * 2
  const pts = values.map((v, i) => {
    const x = padding + (i / (values.length - 1 || 1)) * innerW
    const y = padding + innerH - ((v - min) / range) * innerH
    return `${x},${y}`
  }).join(' ')
  const positive = values[values.length - 1] >= values[0]
  const color = positive ? '#10b981' : '#ef4444'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="equity-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1={padding} x2={w - padding}
          y1={padding + innerH * p} y2={padding + innerH * p}
          stroke="currentColor" strokeOpacity="0.06" />
      ))}
      <polyline fill="url(#equity-grad)"
        points={`${padding},${h - padding} ${pts} ${w - padding},${h - padding}`} />
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
      {/* min/max labels */}
      <text x={padding + 4} y={padding + 12} fontSize="10" fill="currentColor" opacity="0.5">${max.toFixed(0)}</text>
      <text x={padding + 4} y={h - padding - 4} fontSize="10" fill="currentColor" opacity="0.5">${min.toFixed(0)}</text>
    </svg>
  )
}

export default function CopyTraderProfile() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useStore()
  const [master, setMaster] = useState(null)
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [followModal, setFollowModal] = useState(false)
  const [followerAccounts, setFollowerAccounts] = useState([])
  const [following, setFollowing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    binanceAccountId: '',
    lotMode: 'proportional',
    fixedLot: 0.01,
    multiplier: 1.0,
    maxLotPerTrade: 0,
    copySL: true,
    copyTP: true,
    reverseDirection: false,
    maxAllocation: 1000,
    maxDrawdownPct: 20,
    globalSL: 0,
    globalTP: 0,
    aiGuardEnabled: true,
    aiPauseOnMasterDanger: true,
  })

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [{ data: mData }, { data: tData }] = await Promise.all([
          copyTradingAPI.getMaster(slug),
          copyTradingAPI.getMasterTrades(slug),
        ])
        setMaster(mData.master)
        setTrades(tData.trades || [])
      } catch (err) {
        setError(err.response?.data?.error || 'Master introuvable')
      } finally { setLoading(false) }
    })()
  }, [slug])

  const openFollowModal = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    try {
      const { data } = await api.get('/binance/accounts')
      setFollowerAccounts(data.accounts || [])
      if (data.accounts?.[0]) setForm(f => ({ ...f, binanceAccountId: data.accounts[0]._id }))
      setFollowModal(true)
    } catch (_) { setError('Impossible de charger vos comptes Binance') }
  }

  const submitFollow = async () => {
    setFollowing(true); setError('')
    try {
      await copyTradingAPI.follow(master._id, { binanceAccountId: form.binanceAccountId, settings: form })
      setSuccess(true)
      setTimeout(() => { setFollowModal(false); setSuccess(false); navigate('/dashboard/copy-trading') }, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la souscription')
    } finally { setFollowing(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
    </div>
  )

  if (!master) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Trophy className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">{error || 'Master introuvable'}</p>
      <Link to="/copy-trading"><Button variant="outline">← Retour</Button></Link>
    </div>
  )

  const s = master.stats || {}
  const ai = master.aiRisk || { flag: 'safe', score: 0, reason: 'OK' }
  const initials = (master.displayName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-violet-500/5 pb-12">
      {/* Back nav */}
      <div className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <Link to="/copy-trading" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit">
            <ArrowLeft className="h-4 w-4" /> Retour au classement
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-violet-500/20 via-blue-500/20 to-cyan-500/20" />
          <CardContent className="p-6 -mt-12 relative">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-background shadow-xl">
                  {master.avatar ? <img src={master.avatar} alt="" className="w-full h-full rounded-2xl object-cover" /> : initials}
                </div>
                {master.sourceType === 'bot' && (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold">{master.displayName}</h1>
                  {master.badges?.includes('verified') && (
                    <Badge variant="success" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Vérifié</Badge>
                  )}
                  {master.badges?.includes('top_trader') && (
                    <Badge className="text-xs bg-amber-500/20 text-amber-600 border-amber-500/30"><Crown className="h-3 w-3 mr-1" /> Top Trader</Badge>
                  )}
                  {master.sourceType === 'bot' && <Badge variant="outline" className="text-xs">🤖 Robot IA</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{master.country || 'International'} · {STYLE_LABELS[master.tradingStyle]} · Risque {RISK_LABELS[master.riskLevel]}</p>
                {master.bio && <p className="text-sm">{master.bio}</p>}
              </div>
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <Button variant="gradient" size="lg" onClick={openFollowModal} className="shadow-lg">
                  <Copy className="h-4 w-4 mr-2" /> Copier ce trader
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Capital min recommandé : <strong>{master.minCapital || 100}$</strong>
                  {master.feePct > 0 && <> · Frais perf. <strong>{master.feePct}%</strong></>}
                </p>
              </div>
            </div>

            {/* AI risk status */}
            <div className={`mt-4 p-3 rounded-xl border flex items-center gap-3 ${
              ai.flag === 'safe' ? 'bg-green-500/5 border-green-500/30' :
              ai.flag === 'warning' ? 'bg-amber-500/5 border-amber-500/30' :
              ai.flag === 'danger' ? 'bg-orange-500/5 border-orange-500/30' :
              'bg-red-500/5 border-red-500/30'
            }`}>
              {ai.flag === 'safe' ? <Shield className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase">
                  IA · {ai.flag === 'safe' ? 'Trader sain' : ai.flag === 'warning' ? 'Surveillance' : ai.flag === 'danger' ? 'Risque détecté' : 'Risque critique'}
                </p>
                <p className="text-xs text-muted-foreground">{ai.reason || 'Score IA : ' + ai.score + '/100'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Score IA</p>
                <p className="text-lg font-bold">{ai.score}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <StatBox icon={TrendingUp} label="ROI" value={`${(s.roi || 0) >= 0 ? '+' : ''}${(s.roi || 0).toFixed(2)}%`}
            color={(s.roi || 0) >= 0 ? 'text-green-500' : 'text-red-500'} />
          <StatBox icon={Trophy} label="Profit total" value={`$${(s.totalProfit || 0).toFixed(0)}`}
            color={(s.totalProfit || 0) >= 0 ? 'text-green-500' : 'text-red-500'} />
          <StatBox icon={Activity} label="Winrate" value={`${(s.winRate || 0).toFixed(1)}%`} />
          <StatBox icon={BarChart3} label="Profit Factor" value={(s.profitFactor || 0).toFixed(2)} />
          <StatBox icon={TrendingDown} label="Max Drawdown" value={`${(s.maxDrawdown || 0).toFixed(1)}%`} color="text-orange-500" />
          <StatBox icon={Users} label="Copieurs" value={master.followersCount || 0} />
        </div>

        {/* Equity curve */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-500" /> Courbe de performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EquityCurve data={master.equityCurve || []} height={260} />
          </CardContent>
        </Card>

        {/* Detailed stats + recent trades */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Statistiques détaillées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ['Trades totaux', s.totalTrades || 0],
                ['Trades gagnants', s.wins || 0],
                ['Trades perdants', s.losses || 0],
                ['Gain moyen', `$${(s.avgWin || 0).toFixed(2)}`],
                ['Perte moyenne', `$${(s.avgLoss || 0).toFixed(2)}`],
                ['Drawdown actuel', `${(s.currentDrawdown || 0).toFixed(1)}%`],
                ['Sharpe Ratio', (s.sharpe || 0).toFixed(2)],
                ['Capital initial', `$${(s.startBalance || 0).toFixed(0)}`],
                ['Equity actuel', `$${(s.currentEquity || 0).toFixed(0)}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Derniers trades</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {trades.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Aucun trade pour le moment.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-2 font-medium">Date</th>
                        <th className="text-left p-2 font-medium">Symbole</th>
                        <th className="text-center p-2 font-medium">Type</th>
                        <th className="text-right p-2 font-medium">Lot</th>
                        <th className="text-right p-2 font-medium">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, 30).map((t, i) => (
                        <tr key={t.ticket || i} className="border-b hover:bg-muted/20">
                          <td className="p-2 text-muted-foreground whitespace-nowrap">
                            {t.closeTime ? new Date(t.closeTime).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td className="p-2 font-medium">{t.symbol}</td>
                          <td className="p-2 text-center">
                            <Badge variant={t.type === 'buy' ? 'success' : 'destructive'} className="text-[9px]">
                              {t.type?.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-2 text-right">{(t.volume || 0).toFixed(2)}</td>
                          <td className={`p-2 text-right font-bold ${(t.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {(t.profit || 0) >= 0 ? '+' : ''}${(t.profit || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Follow modal */}
      {followModal && (
        <FollowModal
          master={master} accounts={followerAccounts} form={form} setForm={setForm}
          onClose={() => setFollowModal(false)} onSubmit={submitFollow}
          loading={following} error={error} success={success}
        />
      )}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color = '' }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold mb-1">
          <Icon className="h-3 w-3" /> {label}
        </div>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function FollowModal({ master, accounts, form, setForm, onClose, onSubmit, loading, error, success }) {
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (success) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-10">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Copie activée !</h2>
          <p className="text-sm text-muted-foreground">Redirection vers vos copies...</p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">Copier {master.displayName}</h2>
            <p className="text-xs text-muted-foreground">Configurez votre copie automatique</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5 space-y-4">
          {accounts.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm">
              <p className="font-semibold mb-1">Aucun compte Binance connecté</p>
              <p className="text-muted-foreground mb-3">Vous devez d'abord connecter un compte Binance pour copier ce robot.</p>
              <Link to="/dashboard/binance"><Button size="sm" variant="gradient">Connecter un compte Binance →</Button></Link>
            </div>
          ) : (
            <>
              {/* Broker execution notice */}
              <div className="bg-blue-500/5 border border-blue-500/30 rounded-lg p-3 text-xs">
                <p className="font-semibold mb-0.5">🔒 Vos fonds restent chez votre broker</p>
                <p className="text-muted-foreground">
                  Les trades sont exécutés en direct sur le compte Binance sélectionné via tes clés API. La plateforme ne touche jamais à ton solde — elle envoie uniquement des ordres de trading.
                </p>
              </div>

              {/* Account selection */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Compte Binance à utiliser</label>
                <select value={form.binanceAccountId} onChange={e => update('binanceAccountId', e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {accounts.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.label || 'Binance'} · {a.market}{a.isTestnet ? ' (testnet)' : ''} · ${(((a.spotUSDT || 0) + (a.futuresUSDT || 0))).toFixed(0)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lot mode */}
              <div>
                <label className="text-sm font-medium mb-2 block">Mode de taille de lot</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'proportional', l: 'Proportionnel', d: 'Selon ton capital' },
                    { v: 'fixed', l: 'Fixe', d: 'Lot constant' },
                    { v: 'multiplier', l: 'Multiplicateur', d: 'x master lot' },
                  ].map(m => (
                    <button key={m.v} type="button" onClick={() => update('lotMode', m.v)}
                      className={`p-2.5 rounded-lg border text-xs text-center transition-all ${
                        form.lotMode === m.v ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/30'
                      }`}>
                      <p className="font-semibold">{m.l}</p>
                      <p className="text-[9px] text-muted-foreground">{m.d}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.lotMode === 'fixed' && (
                <div>
                  <label className="text-xs text-muted-foreground">Lot fixe</label>
                  <Input type="number" step="0.01" min="0.01" max="100" value={form.fixedLot}
                    onChange={e => update('fixedLot', +e.target.value)} />
                </div>
              )}
              {form.lotMode === 'multiplier' && (
                <div>
                  <label className="text-xs text-muted-foreground">Multiplicateur (x master lot)</label>
                  <Input type="number" step="0.1" min="0.01" max="10" value={form.multiplier}
                    onChange={e => update('multiplier', +e.target.value)} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Lot max par trade</label>
                  <Input type="number" step="0.01" min="0.01" value={form.maxLotPerTrade}
                    onChange={e => update('maxLotPerTrade', +e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Capital alloué max ($)</label>
                  <Input type="number" min="0" value={form.maxAllocation}
                    onChange={e => update('maxAllocation', +e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max Drawdown (%)</label>
                  <Input type="number" min="0" max="100" value={form.maxDrawdownPct}
                    onChange={e => update('maxDrawdownPct', +e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Stop Loss global ($)</label>
                  <Input type="number" min="0" value={form.globalSL}
                    onChange={e => update('globalSL', +e.target.value)} placeholder="0 = désactivé" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Take Profit global ($)</label>
                  <Input type="number" min="0" value={form.globalTP}
                    onChange={e => update('globalTP', +e.target.value)} placeholder="0 = désactivé" />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t">
                <Toggle label="Copier le Stop Loss du master" value={form.copySL} onChange={v => update('copySL', v)} />
                <Toggle label="Copier le Take Profit du master" value={form.copyTP} onChange={v => update('copyTP', v)} />
                <Toggle label="Inverser la direction (contrarian)" value={form.reverseDirection} onChange={v => update('reverseDirection', v)} />
                <Toggle label="🤖 IA Protection (recommandé)" value={form.aiGuardEnabled} onChange={v => update('aiGuardEnabled', v)} />
                <Toggle label="Pause auto si master en danger" value={form.aiPauseOnMasterDanger} onChange={v => update('aiPauseOnMasterDanger', v)} />
              </div>

              {error && (
                <div className="bg-red-500/10 text-red-500 text-sm rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </div>
              )}

              <Button variant="gradient" className="w-full" onClick={onSubmit} disabled={loading || !form.binanceAccountId}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Démarrer la copie automatique
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors text-sm">
      <span>{label}</span>
      <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${value ? 'bg-violet-500' : 'bg-muted'}`}>
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  )
}
