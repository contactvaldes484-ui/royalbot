import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import useStore from '../../store/useStore'
import { userAPI, authAPI } from '../../lib/api'
import { 
  User, Key, Shield, Bell, Wifi, WifiOff, Loader2, 
  Check, AlertCircle, Eye, EyeOff, ToggleLeft, ToggleRight
} from 'lucide-react'

export default function DashboardSettings() {
  const { user, fetchUser } = useStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  // Profile form
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    telegramChatId: user?.telegramChatId || '',
    whatsappNumber: user?.whatsappNumber || ''
  })

  // Password form
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPasswords, setShowPasswords] = useState(false)


  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await userAPI.updateProfile(profile)
      await fetchUser()
      showMessage('success', 'Profil mis à jour.')
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Erreur.')
    } finally { setLoading(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwords.newPassword !== passwords.confirmPassword) {
      showMessage('error', 'Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await authAPI.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showMessage('success', 'Mot de passe changé.')
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Erreur.')
    } finally { setLoading(false) }
  }

  const handleNoOp = async () => {
    showMessage('info', 'Cette fonctionnalité a été retirée.')
  }

  const handleToggleDemo = async () => {
    setLoading(true)
    try {
      await userAPI.toggleDemo()
      await fetchUser()
      showMessage('success', `Mode ${user?.isDemoMode ? 'réel' : 'démo'} activé.`)
    } catch (err) {
      showMessage('error', 'Erreur.')
    } finally { setLoading(false) }
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm">Gérez votre compte et vos préférences.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
          message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
        }`}>
          {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Informations du profil</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Prénom</label>
                  <Input value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nom</label>
                  <Input value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input value={user?.email || ''} disabled className="opacity-60" />
              </div>

              {/* Demo toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Mode Démo</p>
                  <p className="text-xs text-muted-foreground">Tradez avec de l'argent fictif</p>
                </div>
                <button type="button" onClick={handleToggleDemo} className="text-primary">
                  {user?.isDemoMode ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                </button>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sauvegarder
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Changer le mot de passe</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Mot de passe actuel</label>
                <div className="relative">
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwords.currentPassword}
                    onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    required
                  />
                  <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nouveau mot de passe</label>
                <Input type={showPasswords ? 'text' : 'password'} value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confirmer</label>
                <Input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Changer le mot de passe
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-medium mb-3">Authentification 2FA</h3>
              <div className="flex items-center gap-3">
                <Badge variant={user?.twoFactorEnabled ? 'success' : 'secondary'}>
                  {user?.twoFactorEnabled ? 'Activée' : 'Désactivée'}
                </Badge>
                {!user?.twoFactorEnabled && (
                  <Button variant="outline" size="sm">Activer 2FA</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telegram Chat ID</label>
                <Input placeholder="Votre Chat ID Telegram" value={profile.telegramChatId} onChange={e => setProfile({ ...profile, telegramChatId: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">WhatsApp</label>
                <Input placeholder="+33 6 12 34 56 78" value={profile.whatsappNumber} onChange={e => setProfile({ ...profile, whatsappNumber: e.target.value })} />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Sauvegarder
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
