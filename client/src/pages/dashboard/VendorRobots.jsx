import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { vendorAPI } from '../../lib/api'
import { Bot, Loader2, Shield, Plus, Pencil } from 'lucide-react'

export default function VendorRobots() {
  const [robots, setRobots] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingBot, setEditingBot] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    tier: '',
    description: '',
    price: '',
    billingCycle: 'lifetime',
    accessType: 'purchase',
    minCapital: '',
    minTradeAmount: '0.35',
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await vendorAPI.getRobots()
        setRobots(data.robots || [])
      } catch (err) {
        console.error('Vendor robots error', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const openCreate = () => {
    setEditingBot(null)
    setForm({
      name: '',
      tier: '',
      description: '',
      price: '',
      billingCycle: 'lifetime',
      accessType: 'purchase',
      minCapital: '',
      minTradeAmount: '0.35',
    })
    setError('')
    setFormOpen(true)
  }

  const openEdit = (bot) => {
    setEditingBot(bot)
    setForm({
      name: bot.name || '',
      tier: bot.tier || '',
      description: bot.description || '',
      price: bot.price?.toString() || '',
      billingCycle: bot.billingCycle || 'lifetime',
      accessType: bot.accessType || 'purchase',
      minCapital: bot.minCapital?.toString() || '',
      minTradeAmount: bot.minTradeAmount?.toString() || '0.35',
    })
    setError('')
    setFormOpen(true)
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.tier.trim()) return

    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        tier: form.tier.trim(),
        description: form.description.trim(),
        price: Number(form.price) || 0,
        billingCycle: form.billingCycle || 'lifetime',
        accessType: form.accessType || 'purchase',
        minCapital: Number(form.minCapital) || 0,
        minTradeAmount: Number(form.minTradeAmount) || 0.35,
      }

      if (editingBot) {
        const { data } = await vendorAPI.updateRobot(editingBot._id, payload)
        const updated = data.bot
        setRobots(prev => prev.map(r => r._id === updated._id ? updated : r))
      } else {
        const { data } = await vendorAPI.createRobot(payload)
        const created = data.bot
        setRobots(prev => [created, ...prev])
      }

      setFormOpen(false)
      setEditingBot(null)
    } catch (err) {
      console.error('Vendor save robot error', err)
      const msg = err?.response?.data?.error || "Erreur lors de l'enregistrement du robot."
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes robots (vendeur)</h1>
          <p className="text-sm text-muted-foreground">Liste des robots que vous avez publiés sur la marketplace.</p>
        </div>
        <Button size="sm" variant="gradient" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouveau robot
        </Button>
      </div>

      {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingBot ? 'Modifier le robot' : 'Créer un nouveau robot'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nom du robot *</label>
                  <Input
                    value={form.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="Ex: Ultimate Scalper v2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Plan / Tier *</label>
                  <Input
                    value={form.tier}
                    onChange={e => handleChange('tier', e.target.value)}
                    placeholder="Ex: starter, pro, elite..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Description</label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="Expliquez la stratégie, le type de marché, les risques, etc."
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Prix (USD)</label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={e => handleChange('price', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Cycle de facturation</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                    value={form.billingCycle}
                    onChange={e => handleChange('billingCycle', e.target.value)}
                  >
                    <option value="lifetime">Paiement unique (lifetime)</option>
                    <option value="monthly">Mensuel</option>
                    <option value="quarterly">Trimestriel</option>
                    <option value="yearly">Annuel</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Type d'accès</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                    value={form.accessType}
                    onChange={e => handleChange('accessType', e.target.value)}
                  >
                    <option value="purchase">Achat</option>
                    <option value="rental">Location</option>
                    <option value="subscription">Abonnement</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Capital minimum recommandé</label>
                  <Input
                    type="number"
                    min="0"
                    step="10"
                    value={form.minCapital}
                    onChange={e => handleChange('minCapital', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Mise minimale par trade</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minTradeAmount}
                    onChange={e => handleChange('minTradeAmount', e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => { setFormOpen(false); setEditingBot(null) }}>
                  Annuler
                </Button>
                <Button type="submit" variant="gradient" size="sm" disabled={saving || !form.name.trim() || !form.tier.trim()} className="gap-2">
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  {editingBot ? 'Enregistrer les modifications' : 'Créer le robot'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : robots.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Vous n'avez encore publié aucun robot.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {robots.map(robot => (
            <Card key={robot._id} className="flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: (robot.color || '#8b5cf6') + '20' }}>
                    <Bot className="h-5 w-5" style={{ color: robot.color || '#8b5cf6' }} />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{robot.name}</CardTitle>
                    <p className="text-[11px] text-muted-foreground">{robot.slug}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{robot.listingStatus}</Badge>
                  <Badge variant={robot.securityStatus === 'approved' ? 'success' : robot.securityStatus === 'rejected' ? 'destructive' : 'outline'} className="text-[10px] flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {robot.securityStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 pt-0 pb-4">
                <p className="text-xs text-muted-foreground line-clamp-3">{robot.description}</p>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-muted-foreground">Prix</p>
                    <p className="font-semibold">${robot.price}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-muted-foreground">Ventes</p>
                    <p className="font-semibold">{robot.totalUsers || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-muted-foreground">Note</p>
                    <p className="font-semibold">{(robot.ratingAverage || 0).toFixed(1)}★</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 text-[11px] text-muted-foreground">
                  <p>Commission plateforme: <span className="font-semibold">{robot.commissionRate || 0}%</span></p>
                  <Button size="xs" variant="outline" className="gap-1" onClick={() => openEdit(robot)}>
                    <Pencil className="h-3 w-3" />
                    Modifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
