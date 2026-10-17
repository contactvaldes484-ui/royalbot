import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { adminDerivAPI, settingsAPI } from '../../lib/api'
import {
  Bot, Plus, ShieldCheck, Clock, CheckCircle2, XCircle, Trash2,
  Edit, RefreshCw, ExternalLink, Settings, Activity, Users, Layers,
  Upload, FileCode, FileText, Check, AlertCircle, Loader2
} from 'lucide-react'

export default function AdminDeriv() {
  const [activeTab, setActiveTab] = useState('bots') // 'bots' | 'accounts' | 'settings'
  const [bots, setBots] = useState([])
  const [accounts, setAccounts] = useState([])
  const [stats, setStats] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modal création manuelle de robot
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBot, setEditingBot] = useState(null)
  const [botForm, setBotForm] = useState({
    name: '',
    slug: '',
    tier: 'all',
    contractType: 'DIGITOVER',
    symbols: 'R_100, R_75, R_50, R_25, R_10',
    strategyType: 'digit_analyzer',
    initialStake: 1,
    maxStake: 50,
    stopLoss: 20,
    takeProfit: 50,
    duration: 5,
    barrier: '2',
    martingaleMultiplier: 2,
    maxMartingaleSteps: 4,
    winRate: '75-80%',
    badge: 'Automatisé',
  })

  // Modal Upload de Fichier Robot Deriv (.xml / .json)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [parsedPreview, setParsedPreview] = useState(null)
  const [parsingLoading, setParsingLoading] = useState(false)
  const [uploadPlanTier, setUploadPlanTier] = useState('deriv-starter')
  const [uploadBotName, setUploadBotName] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Settings parrainage & API
  const [derivReferralLink, setDerivReferralLink] = useState('')
  const [derivPartnerId, setDerivPartnerId] = useState('')
  const [derivAppId, setDerivAppId] = useState('1089')
  const [derivWsUrl, setDerivWsUrl] = useState('wss://ws.binaryws.com/websockets/v3')
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [botsRes, accsRes, statsRes, setRes] = await Promise.all([
        adminDerivAPI.getBots(),
        adminDerivAPI.getAccounts(),
        adminDerivAPI.getStats(),
        settingsAPI.get(),
      ])
      setBots(botsRes.data?.bots || [])
      setAccounts(accsRes.data?.accounts || [])
      setStats(statsRes.data || null)
      if (setRes.data?.settings) {
        setSettings(setRes.data.settings)
        setDerivReferralLink(setRes.data.settings.derivReferralLink || '')
        setDerivPartnerId(setRes.data.settings.derivPartnerId || '')
        setDerivAppId(setRes.data.settings.derivAppId || '1089')
        setDerivWsUrl(setRes.data.settings.derivWsUrl || 'wss://ws.binaryws.com/websockets/v3')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    setParsingLoading(true)
    setParsedPreview(null)
    setUploadError('')
    try {
      const text = await file.text()
      const { data } = await adminDerivAPI.parseBotFile({ fileName: file.name, fileContent: text })
      setParsedPreview(data)
      setUploadBotName(data.parsed?.name || file.name.replace(/\.[^/.]+$/, ''))
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Erreur lors de la lecture du fichier robot.')
    } finally {
      setParsingLoading(false)
    }
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!uploadFile) return
    setUploading(true)
    setUploadError('')
    try {
      const text = await uploadFile.text()
      await adminDerivAPI.uploadBotFile({
        fileName: uploadFile.name,
        fileContent: text,
        planTier: uploadPlanTier,
        botName: uploadBotName,
        customDescription: uploadDescription,
      })
      setShowUploadModal(false)
      setUploadFile(null)
      setParsedPreview(null)
      await loadData()
      alert('Robot Deriv importé avec succès et activé sur le catalogue !')
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSaveBot(e) {
    e.preventDefault()
    try {
      const payload = {
        name: botForm.name,
        slug: botForm.slug.toLowerCase().trim(),
        tier: botForm.tier,
        contractType: botForm.contractType,
        symbols: botForm.symbols.split(',').map(s => s.trim()).filter(Boolean),
        strategyType: botForm.strategyType,
        defaultSettings: {
          initialStake: Number(botForm.initialStake),
          maxStake: Number(botForm.maxStake),
          stopLoss: Number(botForm.stopLoss),
          takeProfit: Number(botForm.takeProfit),
          duration: Number(botForm.duration),
          durationUnit: 't',
          barrier: botForm.barrier,
          martingaleMultiplier: Number(botForm.martingaleMultiplier),
          maxMartingaleSteps: Number(botForm.maxMartingaleSteps),
        },
        winRate: botForm.winRate,
        badge: botForm.badge,
      }

      if (editingBot) {
        await adminDerivAPI.updateBot(editingBot._id, payload)
      } else {
        await adminDerivAPI.createBot(payload)
      }

      setShowCreateModal(false)
      setEditingBot(null)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    }
  }

  async function handleDeleteBot(id) {
    if (!confirm('Supprimer ce robot Deriv ?')) return
    try {
      await adminDerivAPI.deleteBot(id)
      await loadData()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    }
  }

  async function handleToggleAffiliate(id) {
    try {
      await adminDerivAPI.toggleAffiliate(id)
      await loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleExtendTrial(id) {
    try {
      await adminDerivAPI.extendTrial(id, 7)
      await loadData()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault()
    setSavingSettings(true)
    try {
      // Endpoint admin settings
      const api = (await import('../../lib/api')).default
      await api.put('/admin/settings', {
        derivReferralLink,
        derivPartnerId,
        derivAppId,
        derivWsUrl,
      })
      alert('Paramètres Deriv enregistrés !')
      await loadData()
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  function openEditModal(bot) {
    setEditingBot(bot)
    setBotForm({
      name: bot.name,
      slug: bot.slug,
      tier: bot.tier || 'all',
      contractType: bot.contractType || 'DIGITOVER',
      symbols: bot.symbols?.join(', ') || 'R_100, R_75',
      strategyType: bot.strategyType || 'digit_analyzer',
      initialStake: bot.defaultSettings?.initialStake || 1,
      maxStake: bot.defaultSettings?.maxStake || 50,
      stopLoss: bot.defaultSettings?.stopLoss || 20,
      takeProfit: bot.defaultSettings?.takeProfit || 50,
      duration: bot.defaultSettings?.duration || 5,
      barrier: bot.defaultSettings?.barrier || '2',
      martingaleMultiplier: bot.defaultSettings?.martingaleMultiplier || 2,
      maxMartingaleSteps: bot.defaultSettings?.maxMartingaleSteps || 4,
      winRate: bot.winRate || '75-80%',
      badge: bot.badge || 'Automatisé',
    })
    setShowCreateModal(true)
  }

  return (
    <div className="space-y-6">
      {/* ── EN-TÊTE ADMIN DERIV ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30">
        <div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 mb-2">
            Panneau d'Administration Dédié
          </Badge>
          <h1 className="text-2xl font-extrabold text-white">Gestion Deriv Broker & SmartTrader</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gérez vos robots Deriv en quantité illimitée, suivez les essais gratuits de 7 jours et validez les parrainages.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => {
              setUploadFile(null)
              setParsedPreview(null)
              setUploadBotName('')
              setUploadDescription('')
              setUploadError('')
              setShowUploadModal(true)
            }}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importer un Fichier Robot (.xml / .json)
          </Button>

          <Button
            onClick={() => {
              setEditingBot(null)
              setBotForm({
                name: '',
                slug: '',
                tier: 'all',
                contractType: 'DIGITOVER',
                symbols: 'R_100, R_75, R_50, R_25, R_10',
                strategyType: 'digit_analyzer',
                initialStake: 1,
                maxStake: 50,
                stopLoss: 20,
                takeProfit: 50,
                duration: 5,
                barrier: '2',
                martingaleMultiplier: 2,
                maxMartingaleSteps: 4,
                winRate: '75-80%',
                badge: 'Automatisé',
              })
              setShowCreateModal(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un Robot
          </Button>
        </div>
      </div>

      {/* ── KPIS DERIV ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Comptes Deriv</div>
              <div className="text-2xl font-bold text-white mt-1">{stats?.totalAccounts || 0}</div>
            </div>
            <Users className="w-6 h-6 text-emerald-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Affiliés Partenaires</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">{stats?.verifiedAffiliates || 0}</div>
            </div>
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Robots Déployés</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">{stats?.totalBots || bots.length}</div>
            </div>
            <Bot className="w-6 h-6 text-purple-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Sessions Actives</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{stats?.activeSessions || 0}</div>
            </div>
            <Activity className="w-6 h-6 text-emerald-400" />
          </CardContent>
        </Card>
      </div>

      {/* ── ONGLETS GESTION ───────────────────────────────────────────── */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('bots')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === 'bots' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Robots Deriv ({bots.length})
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === 'accounts' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Comptes & Essais 7 Jours ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition ${
            activeTab === 'settings' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Lien de Parrainage Deriv
        </button>
      </div>

      {/* ── TAB 1 : GESTION DES ROBOTS ────────────────────────────────── */}
      {activeTab === 'bots' && (
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base text-white">Catalogue des Robots Créés</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Vous pouvez ajouter autant de robots personnalisés que vous le souhaitez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-3">Nom du Robot</th>
                    <th className="pb-3">Slug</th>
                    <th className="pb-3">Type de Contrat</th>
                    <th className="pb-3">Stratégie</th>
                    <th className="pb-3">Win Rate</th>
                    <th className="pb-3">Plan Requis</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {bots.map(b => (
                    <tr key={b._id}>
                      <td className="py-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{b.name}</span>
                        </div>
                        {b.fileName && (
                          <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-sans mt-0.5">
                            <FileCode className="w-3 h-3" />
                            <span className="truncate max-w-[160px]">{b.fileName}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-slate-400">{b.slug}</td>
                      <td className="py-3 text-emerald-400 font-bold">{b.contractType}</td>
                      <td className="py-3 text-cyan-400">
                        <div>{b.strategyType}</div>
                        {b.parsedLogic?.conditionType && (
                          <div className="text-[10px] text-slate-400 font-sans">{b.parsedLogic.conditionType}</div>
                        )}
                      </td>
                      <td className="py-3 text-white font-bold">{b.winRate}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={`text-[10px] ${
                          b.tier === 'deriv-starter' ? 'border-amber-500/40 text-amber-300 bg-amber-500/10' :
                          b.tier === 'deriv-pro' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' :
                          'border-slate-700 text-slate-300'
                        }`}>
                          {b.tier === 'deriv-starter' ? '⚡ Starter' : b.tier === 'deriv-pro' ? '🔥 Pro' : '🌐 Tous'}
                        </Badge>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditModal(b)}
                          className="h-7 px-2 text-slate-400 hover:text-white"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBot(b._id)}
                          className="h-7 px-2 text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {bots.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-slate-500">
                        Aucun robot créé. Cliquez sur « Ajouter un Robot Deriv » pour commencer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 2 : COMPTES & ESSAIS 7 JOURS ──────────────────────────── */}
      {activeTab === 'accounts' && (
        <Card className="bg-slate-900/80 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base text-white">Suivi des Comptes Connectés & Essais 7 Jours</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Vérifiez l'état de l'essai de chaque utilisateur, prolongez l'essai ou validez leur affiliation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-3">Utilisateur</th>
                    <th className="pb-3">Login ID</th>
                    <th className="pb-3">Solde</th>
                    <th className="pb-3">Période d'Essai (7j)</th>
                    <th className="pb-3">Affilié Partenaire</th>
                    <th className="pb-3 text-right">Actions Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {accounts.map(acc => (
                    <tr key={acc._id}>
                      <td className="py-3">
                        <div className="font-bold text-white">
                          {acc.user?.firstName} {acc.user?.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400">{acc.user?.email}</div>
                      </td>
                      <td className="py-3 font-bold text-slate-300">
                        {acc.loginId} {acc.isDemo && <span className="text-[10px] text-amber-400">(DEMO)</span>}
                      </td>
                      <td className="py-3 text-emerald-400 font-bold">${Number(acc.balance || 0).toFixed(2)}</td>
                      <td className="py-3">
                        {acc.isTrialValid ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                            Actif ({acc.trialDaysRemaining}j restants)
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40">
                            Expiré
                          </Badge>
                        )}
                      </td>
                      <td className="py-3">
                        {acc.affiliateVerified ? (
                          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Vérifié
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-700">
                            Non affilié
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleAffiliate(acc._id)}
                          className="h-7 text-[11px] border-slate-700 text-slate-300 hover:text-white"
                        >
                          {acc.affiliateVerified ? 'Révoquer Affiliation' : 'Valider Affiliation'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExtendTrial(acc._id)}
                          className="h-7 text-[11px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
                        >
                          +7 Jours Essai
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-500">
                        Aucun compte Deriv connecté pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 3 : CONFIGURATION PARRAINAGE DERIV ─────────────────────── */}
      {activeTab === 'settings' && (
        <Card className="bg-slate-900/80 border-slate-800 max-w-xl">
          <CardHeader>
            <CardTitle className="text-base text-white">Lien de Parrainage & Affiliation Deriv</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Les utilisateurs créant leur compte via ce lien bénéficieront de l'accès gratuit à vie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">Lien d'Affiliation Deriv Officiel</label>
                <Input
                  type="url"
                  placeholder="https://track.deriv.com/_..."
                  value={derivReferralLink}
                  onChange={(e) => setDerivReferralLink(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">ID Partenaire Deriv (Partner ID)</label>
                <Input
                  type="text"
                  placeholder="Ex: 123456"
                  value={derivPartnerId}
                  onChange={(e) => setDerivPartnerId(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Utilisé par le système pour vérifier automatiquement l'affiliation lors de la connexion du token API.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-cyan-400">Paramètres Techniques API Deriv &amp; OAuth 2.0</h4>
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
                  <div className="text-xs font-bold text-emerald-300">
                    Redirect URL (URL de Redirection OAuth à copier sur api.deriv.com / developers.deriv.com) :
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/deriv/callback`}
                      className="bg-slate-900 border-slate-700 text-emerald-400 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/deriv/callback`)
                        alert('Redirect URL copiée dans le presse-papiers !')
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shrink-0"
                    >
                      Copier
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Lors de la création de votre App ID sur Deriv API, collez cette URL dans le champ <strong>Redirect URL (OAuth)</strong> et cochez les permissions : <strong>Read</strong>, <strong>Trade</strong>, <strong>Trading information</strong>.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">Deriv App ID (DERIV_APP_ID)</label>
                    <Input
                      type="text"
                      placeholder="1089"
                      value={derivAppId}
                      onChange={(e) => setDerivAppId(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Collez ici l'App ID généré sur api.deriv.com</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-semibold mb-1 block">Deriv WebSocket URL (DERIV_WS_URL)</label>
                    <Input
                      type="text"
                      placeholder="wss://ws.derivws.com/websockets/v3"
                      value={derivWsUrl}
                      onChange={(e) => setDerivWsUrl(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Point d'accès WebSocket Deriv officiel</p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={savingSettings}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {savingSettings ? 'Enregistrement...' : 'Enregistrer la Configuration'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── MODAL : AJOUT / ÉDITION DE ROBOT DERIV ─────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl my-8">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-emerald-400" />
              {editingBot ? 'Modifier le Robot Deriv' : 'Ajouter un Nouveau Robot Deriv'}
            </h3>

            <form onSubmit={handleSaveBot} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Nom du Robot</label>
                  <Input
                    required
                    value={botForm.name}
                    onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Slug Unique</label>
                  <Input
                    required
                    value={botForm.slug}
                    onChange={(e) => setBotForm({ ...botForm, slug: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Type de Contrat</label>
                  <select
                    value={botForm.contractType}
                    onChange={(e) => setBotForm({ ...botForm, contractType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5"
                  >
                    <option value="DIGITOVER">Digit Over</option>
                    <option value="DIGITUNDER">Digit Under</option>
                    <option value="DIGITMATCH">Digit Match</option>
                    <option value="DIGITDIFF">Digit Differ</option>
                    <option value="DIGITEVEN">Digit Even</option>
                    <option value="DIGITODD">Digit Odd</option>
                    <option value="CALL">Rise (Hausse)</option>
                    <option value="PUT">Fall (Baisse)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Stratégie Algorithmique</label>
                  <select
                    value={botForm.strategyType}
                    onChange={(e) => setBotForm({ ...botForm, strategyType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5"
                  >
                    <option value="digit_analyzer">Analyseur de Digits (50 ticks)</option>
                    <option value="even_odd_pattern">Pattern Pair / Impair</option>
                    <option value="trend_following">Suivi de Tendance</option>
                    <option value="tick_volatility">Breakout Volatilité</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">Symboles Supportés (séparés par virgule)</label>
                <Input
                  value={botForm.symbols}
                  onChange={(e) => setBotForm({ ...botForm, symbols: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Mise Initiale ($)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={botForm.initialStake}
                    onChange={(e) => setBotForm({ ...botForm, initialStake: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Take Profit ($)</label>
                  <Input
                    type="number"
                    value={botForm.takeProfit}
                    onChange={(e) => setBotForm({ ...botForm, takeProfit: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Stop Loss ($)</label>
                  <Input
                    type="number"
                    value={botForm.stopLoss}
                    onChange={(e) => setBotForm({ ...botForm, stopLoss: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Win Rate Affiché</label>
                  <Input
                    value={botForm.winRate}
                    onChange={(e) => setBotForm({ ...botForm, winRate: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Badge</label>
                  <Input
                    value={botForm.badge}
                    onChange={(e) => setBotForm({ ...botForm, badge: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 border-slate-700 text-slate-300"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {editingBot ? 'Mettre à jour' : 'Créer le Robot'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL : IMPORT FICHIER ROBOT DERIV (.XML / .JSON) ───────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                Importer un Robot Deriv (.xml / .json)
              </h3>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Téléchargez un fichier de robot officiel Deriv (DBot Blockly <span className="text-cyan-400 font-mono">.xml</span> ou configuration <span className="text-cyan-400 font-mono">.json</span>). La plateforme extrait automatiquement tous les paramètres (type de contrat, symboles, stake, martingale) et applique ce robot sur le plan Deriv choisi.
            </p>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Sélecteur de fichier */}
              <div className="p-4 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl text-center transition bg-slate-950/60">
                <input
                  type="file"
                  id="derivBotFileInput"
                  accept=".xml,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="derivBotFileInput" className="cursor-pointer block space-y-2">
                  <FileCode className="w-8 h-8 text-cyan-400 mx-auto" />
                  <div className="text-xs font-semibold text-white">
                    {uploadFile ? uploadFile.name : 'Cliquez pour sélectionner un fichier .xml ou .json'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Format Deriv DBot XML (Blockly) ou stratégie JSON
                  </div>
                </label>
              </div>

              {parsingLoading && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-cyan-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyse et décompilation du fichier en cours...
                </div>
              )}

              {/* Aperçu des paramètres extraits */}
              {parsedPreview && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Stratégie analysée avec succès
                    </span>
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px]">
                      {parsedPreview.fileType === 'xml' ? 'DBot Blockly XML' : 'JSON Config'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Contrat :</span>
                      <span className="font-bold text-emerald-400">{parsedPreview.parsed?.contractType || '—'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Symboles :</span>
                      <span className="font-bold text-white truncate block">{parsedPreview.parsed?.symbols?.join(', ') || 'R_100'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Mise Initiale :</span>
                      <span className="font-bold text-white">${parsedPreview.parsed?.initialStake}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Take Profit :</span>
                      <span className="font-bold text-emerald-400">${parsedPreview.parsed?.takeProfit}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Stop Loss :</span>
                      <span className="font-bold text-rose-400">${parsedPreview.parsed?.stopLoss}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Martingale :</span>
                      <span className="font-bold text-amber-400">x{parsedPreview.parsed?.martingaleMultiplier} ({parsedPreview.parsed?.maxMartingaleSteps}x)</span>
                    </div>
                  </div>

                  {parsedPreview.parsed?.summary && (
                    <p className="text-[11px] text-slate-400 italic">
                      "{parsedPreview.parsed.summary}"
                    </p>
                  )}
                </div>
              )}

              {/* Sélection du Plan Dédié */}
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">
                  Affecter ce robot au Plan Deriv *
                </label>
                <select
                  value={uploadPlanTier}
                  onChange={(e) => setUploadPlanTier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl p-2.5"
                >
                  <option value="deriv-starter">⚡ Plan Deriv Starter (Robots Essentiels & SmartTrader)</option>
                  <option value="deriv-pro">🔥 Plan Deriv Pro (Tous les Robots & Algorithmes Avancés)</option>
                  <option value="all">🌐 Tous les Plans (Accessible à tous les abonnés Deriv)</option>
                </select>
              </div>

              {/* Nom & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Nom d'affichage du Robot *</label>
                  <Input
                    required
                    value={uploadBotName}
                    onChange={(e) => setUploadBotName(e.target.value)}
                    placeholder="ex: Deriv Volatility Pro Hunter"
                    className="bg-slate-950 border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold mb-1 block">Description personnalisée</label>
                  <Input
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="ex: Stratégie DBot officielle avec Martingale"
                    className="bg-slate-950 border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  className="w-1/2 border-slate-700 text-slate-300"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="w-1/2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importation...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importer et Appliquer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
