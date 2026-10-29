import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import useStore from '../store/useStore'
import { startDerivOAuth } from '../lib/derivOAuth'
import { Bot, Eye, EyeOff, Loader2, Zap, ExternalLink } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', referralCode: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, platformSettings } = useStore()
  const navigate = useNavigate()

  const derivAppId = platformSettings?.derivAppId || '34HkkJSIK047dAEWEgXML'
  const derivSignupUrl = platformSettings?.derivReferralLink || 'https://track.deriv.com/_DEFAULT/'

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, referralCode: form.referralCode || undefined })
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-violet-500/5 to-transparent pointer-events-none" />
      <Card className="w-full max-w-md relative">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-violet-600">
              <Bot className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <CardDescription>Commencez le trading automatisé gratuitement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}

          {/* Deriv Quick Registration / Login */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => startDerivOAuth(derivAppId)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              Connexion directe Deriv (Automatique)
            </button>

            <a
              href={derivSignupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Créer un compte Deriv Officiel (Accès Offert)
            </a>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-3 text-xs uppercase text-muted-foreground">Ou inscription classique</span>
              <div className="flex-grow border-t border-border"></div>
            </div>
          </div>

          {/* Email/password registration */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Prénom</label>
                <Input name="firstName" placeholder="John" value={form.firstName} onChange={handleChange} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nom</label>
                <Input name="lastName" placeholder="Doe" value={form.lastName} onChange={handleChange} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input name="email" type="email" placeholder="votre@email.com" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <Input name="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 caractères" value={form.password} onChange={handleChange} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Confirmer le mot de passe</label>
              <Input name="confirmPassword" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Code parrainage <span className="text-muted-foreground">(optionnel)</span></label>
              <Input name="referralCode" placeholder="DTXXXXXX" value={form.referralCode} onChange={handleChange} />
            </div>
            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer mon compte avec Email
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
            </p>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Déjà un compte ? </span>
            <Link to="/login" className="text-primary hover:underline font-medium">Se connecter</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
