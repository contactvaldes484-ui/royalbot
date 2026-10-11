import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { vendorAPI } from '../../lib/api'
import { Loader2, Shield, DollarSign } from 'lucide-react'

export default function VendorApply() {
  const [profile, setProfile] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await vendorAPI.getProfile()
        setProfile(data.profile || null)
        if (data.profile) {
          setDisplayName(data.profile.displayName || '')
          setBio(data.profile.bio || '')
        }
      } catch (err) {
        // ignore if no profile yet
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    try {
      const { data } = await vendorAPI.apply({ displayName, bio })
      setProfile(data.profile)
    } catch (err) {
      console.error('Vendor apply error', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Devenir vendeur</h1>
          <p className="text-sm text-muted-foreground">Proposez vos robots sur la marketplace UltimateBot et gagnez des revenus récurrents.</p>
        </div>
      </div>

      {profile && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Statut vendeur</p>
                <p className="text-xs text-muted-foreground">Votre demande est actuellement "{profile.status}".</p>
              </div>
            </div>
            <Badge
              variant={profile.status === 'approved' ? 'success' : profile.status === 'rejected' ? 'destructive' : 'outline'}
              className="capitalize text-[11px]"
            >
              {profile.status}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Formulaire de demande</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs font-medium">Nom public / Marque *</label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Ex: AlphaBots, FX Labs, Quant Vision..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Présentation (bio)</label>
              <Textarea
                rows={4}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Présentez votre expérience, votre approche de trading et le type de robots que vous proposez."
              />
            </div>
            <Button type="submit" variant="gradient" disabled={saving || !displayName.trim()} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Envoyer ma demande
            </Button>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Après validation, vous pourrez publier vos robots payants et suivre vos revenus dans l'onglet "Revenus vendeur".
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
