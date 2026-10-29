import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import useStore from '../store/useStore'
import { startDerivOAuth } from '../lib/derivOAuth'
import { Bot, Eye, EyeOff, Loader2, Zap, ExternalLink } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, platformSettings } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  const derivAppId = platformSettings?.derivAppId || '34HkkJSIK047dAEWEgXML'
  const derivSignupUrl = platformSettings?.derivReferralLink || 'https://track.deriv.com/_DEFAULT/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password, twoFactorCode || undefined)
      if (result?.requires2FA) {
        setRequires2FA(true)
        setLoading(false)
        return
      }
      const params = new URLSearchParams(location.search)
      const redirectTo = params.get('redirect')
      if (redirectTo) {
        navigate(redirectTo)
      } else if (['admin', 'super_admin'].includes(result?.user?.role)) {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
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
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>Accédez à votre compte de trading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          {!requires2FA && (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => startDerivOAuth(derivAppId)}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                Se connecter avec Deriv (Soldes Réel &amp; Démo)
              </button>

              <a
                href={derivSignupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Pas encore de compte ? S'inscrire sur Deriv (Accès Offert)
              </a>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-3 text-xs uppercase text-muted-foreground">Ou avec Email</span>
                <div className="flex-grow border-t border-border"></div>
              </div>
            </div>
          )}

          {/* Email/password login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!requires2FA ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <Input type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mot de passe</label>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Code 2FA</label>
                <Input type="text" placeholder="123456" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} required maxLength={6} />
                <p className="text-xs text-muted-foreground mt-1">Entrez le code de votre application d'authentification</p>
              </div>
            )}

            <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {requires2FA ? 'Vérifier' : 'Se connecter avec Email'}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Pas encore de compte ? </span>
            <Link to="/register" className="text-primary hover:underline font-medium">Créer un compte</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
