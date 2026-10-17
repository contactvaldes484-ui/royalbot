import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { derivAPI } from '../lib/api'
import useStore from '../store/useStore'
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Wallet, RefreshCw } from 'lucide-react'

export default function DerivCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth } = useStore()

  const [status, setStatus] = useState('processing') // 'processing' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const [syncedAccounts, setSyncedAccounts] = useState([])

  useEffect(() => {
    handleOAuthCallback()
  }, [location.search])

  async function handleOAuthCallback() {
    setStatus('processing')
    setErrorMsg('')
    const params = new URLSearchParams(location.search)

    // Gestion erreur retournée par Deriv OAuth
    if (params.get('error')) {
      setStatus('error')
      setErrorMsg(params.get('error_description') || params.get('error') || 'Authentification Deriv annulée ou refusée.')
      return
    }

    const accounts = []
    let i = 1
    while (params.has(`acct${i}`) || params.has(`token${i}`)) {
      const acct = params.get(`acct${i}`) || `DERIV_${i}`
      const token = params.get(`token${i}`)
      const cur = params.get(`cur${i}`) || 'USD'
      if (token) {
        accounts.push({ acct, token, cur })
      }
      i++
    }

    // Si aucun paramètre standard acct1/token1, vérifier token unique, code PKCE ou pending
    const oauthCode = params.get('code')
    if (accounts.length === 0 && !oauthCode) {
      const singleToken = params.get('token')
      const singleAcct = params.get('acct')
      if (singleToken) {
        accounts.push({ acct: singleAcct || 'CR', token: singleToken, cur: 'USD' })
      } else {
        const pending = localStorage.getItem('pending_deriv_accounts')
        if (pending) {
          try {
            const parsed = JSON.parse(pending)
            if (Array.isArray(parsed) && parsed.length > 0) {
              accounts.push(...parsed)
            }
          } catch (_) {}
        }
      }
    }

    if (accounts.length === 0 && !oauthCode) {
      setStatus('error')
      setErrorMsg("Aucun compte ou jeton d'autorisation Deriv n'a été détecté dans l'URL de redirection.")
      return
    }

    // Authentification directe + Synchronisation immédiate des soldes Réel & Démo avec l'API Deriv
    try {
      const codeVerifier = sessionStorage.getItem('deriv_pkce_verifier') || localStorage.getItem('deriv_pkce_verifier') || ''
      const clientId = sessionStorage.getItem('deriv_client_id') || localStorage.getItem('deriv_client_id') || '34HkkJSIK047dAEWEgXML'
      const redirectUri = `${window.location.origin}/deriv/callback`

      const res = await derivAPI.oauthLogin({
        accounts,
        code: oauthCode || undefined,
        codeVerifier: codeVerifier || undefined,
        clientId,
        redirectUri,
      })

      localStorage.removeItem('pending_deriv_accounts')
      sessionStorage.removeItem('deriv_pkce_verifier')

      if (res.data?.success && res.data?.accounts?.length) {
        if (res.data.token && res.data.user) {
          localStorage.setItem('token', res.data.token)
          setAuth(res.data.user, res.data.token)
        }
        setSyncedAccounts(res.data.accounts)
        setStatus('success')
        setTimeout(() => {
          navigate('/dashboard/deriv')
        }, 2000)
      } else {
        setStatus('error')
        setErrorMsg('Échec de la validation des comptes par le serveur Deriv.')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.response?.data?.error || err.message || 'Erreur lors de la synchronisation de vos comptes Deriv.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
        <CardContent className="p-8 text-center space-y-6">
          {status === 'processing' && (
            <div className="space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
              <h2 className="text-xl font-bold">Connexion Deriv en cours...</h2>
              <p className="text-xs text-slate-400">
                Nous synchronisons vos comptes Réel et Démo ainsi que vos soldes en direct depuis l'API Deriv.
              </p>
            </div>
          )}

          {status === 'redirect_login' && (
            <div className="space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold">Authentification requise</h2>
              <p className="text-xs text-slate-400">
                Vos clés Deriv ont bien été reçues. Connectez-vous à votre compte RoyalBot pour finaliser la liaison.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirection vers la page de connexion...
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-white">Comptes Deriv Liés avec Succès !</h2>
              <p className="text-xs text-slate-400">
                Vos soldes et comptes ont été mis à jour dans votre espace RoyalBot.
              </p>

              <div className="space-y-2 pt-2 text-left">
                {syncedAccounts.map((acc) => (
                  <div
                    key={acc._id || acc.loginId}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{acc.label || acc.loginId}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{acc.loginId}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-emerald-400">
                        ${Number(acc.balance || 0).toFixed(2)}
                      </span>
                      <div>
                        {acc.isDemo ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px]">DÉMO</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px]">RÉEL</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => navigate('/dashboard/deriv')}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Accéder à SmartTrader &amp; Robots <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold">Erreur de Connexion Deriv</h2>
              <p className="text-xs text-rose-300">{errorMsg}</p>
              <div className="pt-2 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard/deriv')}
                  className="w-1/2 border-slate-700"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleOAuthCallback}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
