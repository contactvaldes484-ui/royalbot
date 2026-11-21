/**
 * Deriv OAuth 2.0 PKCE + Legacy OAuth Helper
 * Implements https://developers.deriv.com/docs/intro/oauth/
 */

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateRandomVerifier(byteLength = 48) {
  const array = new Uint8Array(byteLength)
  window.crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

export async function startDerivOAuth(appId, options = {}) {
  if (!options?.skipPlanGate) {
    try {
      const [setRes, plansRes] = await Promise.all([
        fetch('/api/settings').then(r => r.json()).catch(() => ({})),
        fetch('/api/subscriptions/plans').then(r => r.json()).catch(() => ({})),
      ])
      const s = setRes?.settings || {}
      const plans = plansRes?.plans || []
      const hasActivePaidPlans =
        s.subscriptionsEnabled !== false &&
        !s.allRobotsFree &&
        plans.some(p => p.isActive !== false && p.isPublic !== false && !p.isFree && Number(p.priceMonthly) > 0)

      let hasPaidOrAdmin = false
      try {
        const rawUser = JSON.parse(localStorage.getItem('user') || 'null')
        const role = rawUser?.role
        const sub = rawUser?.subscription
        hasPaidOrAdmin =
          role === 'admin' ||
          role === 'super_admin' ||
          (sub?.isActive && sub?.plan && sub.plan !== 'free') ||
          sessionStorage.getItem('deriv_plan_paid') === '1'
      } catch (_) {}

      if (hasActivePaidPlans && !hasPaidOrAdmin) {
        sessionStorage.setItem('deriv_connect_pending', '1')
        window.location.href = '/pricing?deriv_connect=1'
        return
      }
    } catch (_) {}
  }

  const resolvedAppId = String(appId || '34HkkJSIK047dAEWEgXML').trim()
  const redirectUri = `${window.location.origin}/deriv/callback`

  // Si l'App ID est purement numérique (Legacy API v1: ex. 1089, 65432)
  if (/^\d+$/.test(resolvedAppId)) {
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${encodeURIComponent(resolvedAppId)}&l=FR&brand=deriv`
    return
  }

  // OAuth 2.0 Authorization Code + PKCE (Nouvelle API Deriv: ex. 34HkkJSIK047dAEWEgXML)
  const codeVerifier = generateRandomVerifier(48)
  const state = generateRandomVerifier(24)
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  try {
    sessionStorage.setItem('deriv_pkce_verifier', codeVerifier)
    sessionStorage.setItem('deriv_oauth_state', state)
    sessionStorage.setItem('deriv_client_id', resolvedAppId)
    localStorage.setItem('deriv_pkce_verifier', codeVerifier)
    localStorage.setItem('deriv_oauth_state', state)
    localStorage.setItem('deriv_client_id', resolvedAppId)
  } catch (_) {}

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: resolvedAppId,
    redirect_uri: redirectUri,
    scope: 'trade account_manage',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    app_id: '1089', // Support hybride Legacy Deriv selon la doc officielle
  })

  // Remplacer l'espace encodé par + pour scope=trade+account_manage selon la doc Deriv
  const queryString = params.toString().replace(/scope=trade%20account_manage/, 'scope=trade+account_manage')
  window.location.href = `https://auth.deriv.com/oauth2/auth?${queryString}`
}
