import { create } from 'zustand'
import { authAPI, userAPI, botAPI, tradeAPI, settingsAPI, resolveApiUrl } from '../lib/api'

const useStore = create((set, get) => ({
  // Auth
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  // Theme
  theme: localStorage.getItem('theme') || 'dark',
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    set({ theme: newTheme })
  },

  // Auth actions
  login: async (email, password, twoFactorCode) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await authAPI.login({ email, password, twoFactorCode })
      if (data.requires2FA) {
        set({ isLoading: false })
        return { requires2FA: true }
      }
      localStorage.setItem('token', data.token)
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false })
      return data
    } catch (err) {
      const error = err.response?.data?.error || 'Login failed'
      set({ error, isLoading: false })
      throw new Error(error)
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await authAPI.register(userData)
      localStorage.setItem('token', data.token)
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false })
      return data
    } catch (err) {
      const error = err.response?.data?.error || 'Registration failed'
      set({ error, isLoading: false })
      throw new Error(error)
    }
  },

  setAuth: (user, token) => {
    set({ user, token, isAuthenticated: true, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  fetchUser: async () => {
    try {
      const { data } = await authAPI.getMe()
      set({ user: data.user, isAuthenticated: true })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null, isAuthenticated: false })
    }
  },

  // Bots
  bots: [],
  activeSessions: [],
  fetchBots: async () => {
    try {
      const { data } = await botAPI.getAll()
      set({ bots: data.bots })
    } catch (err) {
      console.error('Failed to fetch bots:', err)
    }
  },

  fetchActiveSessions: async () => {
    try {
      const { data } = await botAPI.getActiveSessions()
      set({ activeSessions: data.sessions })
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    }
  },

  // Trades
  trades: [],
  tradeStats: null,
  fetchTrades: async (params) => {
    try {
      const { data } = await tradeAPI.getAll(params)
      set({ trades: data.trades })
      return data
    } catch (err) {
      console.error('Failed to fetch trades:', err)
    }
  },

  fetchTradeStats: async (params) => {
    try {
      const { data } = await tradeAPI.getStats(params)
      set({ tradeStats: data })
      return data
    } catch (err) {
      console.error('Failed to fetch trade stats:', err)
    }
  },

  // WebSocket
  ws: null,
  wsConnected: false,
  liveTrades: [],      // Real-time trades from bot
  liveEvents: [],      // Real-time events (skips, pauses, etc.)
  derivLiveTrades: [], // Real-time Deriv contracts/trades
  mt5Ticks: {},        // { symbol: { bid, ask, candle } } — live MT5 ticks
  mt5Positions: [],    // Live MT5 open positions
  copyEvents: [],      // Copy Trading: live copy trade events
  copyEarningsTotal: 0, // Real-time accumulated commissions earned this session
  clearDerivLiveTrades: () => set({ derivLiveTrades: [] }),

  connectWS: () => {
    const token = get().token
    if (!token) return

    // Build WS URL from resolved API_URL (backend), not from placeholder VITE_API_URL
    const apiUrl = resolveApiUrl()
    let wsUrl
    if (apiUrl.startsWith('http')) {
      const url = new URL(apiUrl)
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${url.host}/ws?token=${token}`
    } else {
      // Dev: relative /api → use same host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`
    }
    console.log('[WS] Connecting to:', wsUrl)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => set({ wsConnected: true })
    ws.onclose = () => {
      set({ wsConnected: false, ws: null })
      // Auto-reconnect after 3s
      setTimeout(() => { if (get().token) get().connectWS() }, 3000)
    }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        get().handleWSMessage(msg)
      } catch {}
    }

    set({ ws })
  },

  disconnectWS: () => {
    const ws = get().ws
    if (ws) ws.close()
    set({ ws: null, wsConnected: false })
  },

  clearLiveTrades: () => set({ liveTrades: [], liveEvents: [] }),

  handleWSMessage: (msg) => {
    const now = new Date().toISOString()
    switch (msg.type) {
      case 'trade_result': {
        const trade = { ...msg.data.trade, _receivedAt: now }
        const trades = [trade, ...get().trades].slice(0, 100)
        const liveTrades = [trade, ...get().liveTrades].slice(0, 50)
        // Update session profit/tradeCount in activeSessions
        const activeSessions = get().activeSessions.map(s =>
          s.sessionId === msg.data.trade?.sessionId
            ? { ...s, profit: msg.data.sessionProfit, tradeCount: msg.data.tradeCount }
            : s
        )
        set({ trades, liveTrades, activeSessions })
        break
      }
      case 'trade_skipped': {
        const evt = { type: 'skip', ...msg.data, _receivedAt: now }
        set({ liveEvents: [evt, ...get().liveEvents].slice(0, 30) })
        break
      }
      case 'session_paused': {
        const evt = { type: 'pause', ...msg.data, _receivedAt: now }
        set({ liveEvents: [evt, ...get().liveEvents].slice(0, 30) })
        break
      }
      case 'contract_update': {
        const evt = { type: 'contract', ...msg.data, _receivedAt: now }
        set({ liveEvents: [evt, ...get().liveEvents].slice(0, 30) })
        break
      }
      case 'session_stopped': {
        const activeSessions = get().activeSessions.filter(s => s.sessionId !== msg.data.sessionId)
        const evt = { type: 'stopped', ...msg.data, _receivedAt: now }
        set({ activeSessions, liveEvents: [evt, ...get().liveEvents].slice(0, 30) })
        break
      }
      case 'manual_trade_result': {
        const trade = { ...msg.data, _receivedAt: now, isManual: true }
        const liveTrades = [trade, ...get().liveTrades].slice(0, 50)
        const trades = [trade, ...get().trades].slice(0, 100)
        set({ liveTrades, trades })
        break
      }
      case 'mt5_tick': {
        const ticks = { ...get().mt5Ticks }
        ticks[msg.symbol] = { bid: msg.bid, ask: msg.ask, candle: msg.candle, sessionId: msg.sessionId }
        set({ mt5Ticks: ticks })
        break
      }
      case 'mt5_trade_opened': {
        const pos = { ...msg, openTime: new Date().toISOString(), status: 'open' }
        set({ mt5Positions: [pos, ...get().mt5Positions].slice(0, 50) })
        break
      }
      case 'mt5_trade_closed': {
        const positions = get().mt5Positions.map(p =>
          p.symbol === msg.symbol && p.sessionId === msg.sessionId && p.status === 'open'
            ? { ...p, status: 'closed', profit: msg.profit, closeTime: new Date().toISOString() }
            : p
        )
        set({ mt5Positions: positions })
        break
      }
      case 'mt5_session_started':
      case 'mt5_session_stopped':
      case 'mt5_daily_limit': {
        const evt = { type: msg.type, ...msg, _receivedAt: now }
        set({ liveEvents: [evt, ...get().liveEvents].slice(0, 30) })
        break
      }
      case 'copy_trade_opened':
      case 'copy_trade_closed':
      case 'copy_ai_pause':
      case 'copy_auto_stopped': {
        const evt = { ...msg, _receivedAt: now }
        const copyEvents = [evt, ...get().copyEvents].slice(0, 50)
        set({ copyEvents })
        // Show notification toast
        get().addNotification?.({
          type: msg.type === 'copy_trade_opened' ? 'success' : msg.type === 'copy_trade_closed' ? (msg.profit >= 0 ? 'success' : 'warning') : 'warning',
          title: {
            copy_trade_opened: 'Copie ouverte',
            copy_trade_closed: msg.profit >= 0 ? 'Copie clôturée (+)' : 'Copie clôturée (−)',
            copy_ai_pause: '🤖 IA — Master en danger',
            copy_auto_stopped: 'Copie auto-arrêtée',
          }[msg.type] || 'Copy Trading',
          message: msg.masterName
            ? `${msg.masterName}${msg.symbol ? ' · ' + msg.symbol : ''}${msg.profit !== undefined ? ' · $' + msg.profit.toFixed(2) : ''}${msg.reason ? ' · ' + msg.reason : ''}`
            : (msg.reason || ''),
        })
        break
      }
      case 'copy_payout_completed': {
        get().addNotification?.({
          type: 'success',
          title: '✅ Paiement effectué',
          message: `$${msg.amount.toFixed(2)} via ${msg.method}${msg.txRef ? ' · ' + msg.txRef : ''}`,
        })
        break
      }
      case 'copy_payout_rejected': {
        get().addNotification?.({
          type: 'warning',
          title: 'Paiement rejeté',
          message: `$${msg.amount.toFixed(2)} restitué · ${msg.reason || 'Voir détails'}`,
        })
        break
      }
      case 'forex_alert': {
        get().addNotification?.({
          type: msg.signal === 'buy' ? 'success' : 'warning',
          title: `🤖 IA Forex — ${msg.signal === 'buy' ? 'ACHAT' : 'VENTE'} ${msg.symbol}`,
          message: `${msg.timeframe} · Confiance ${msg.confidence}% · Entrée ${msg.entry} · SL ${msg.stopLoss} · TP ${msg.takeProfit1}`,
        })
        break
      }
      case 'forex_scan_complete': {
        // Admins only — silent unless on the admin page
        console.log('[Forex] Scan complete:', msg)
        break
      }
      case 'copy_commission_earned': {
        const evt = { ...msg, _receivedAt: now }
        const copyEvents = [evt, ...get().copyEvents].slice(0, 50)
        set({
          copyEvents,
          copyEarningsTotal: +(get().copyEarningsTotal + msg.amount).toFixed(2),
        })
        get().addNotification?.({
          type: 'success',
          title: '💰 Commission reçue',
          message: `+$${msg.amount.toFixed(2)} (${msg.feePct}% sur ${msg.symbol})`,
        })
        break
      }
      case 'deriv_trade_opened': {
        const trade = { ...msg.trade, _receivedAt: now, status: 'open' }
        const prev = get().derivLiveTrades || []
        const exists = prev.some(t => t.contractId === trade.contractId)
        const derivLiveTrades = exists
          ? prev.map(t => t.contractId === trade.contractId ? trade : t)
          : [trade, ...prev].slice(0, 50)
        set({ derivLiveTrades })
        break
      }
      case 'deriv_trade_result': {
        const trade = { ...msg.trade, _receivedAt: now }
        const prev = get().derivLiveTrades || []
        const exists = prev.some(t => t.contractId === trade.contractId)
        const derivLiveTrades = exists
          ? prev.map(t => t.contractId === trade.contractId ? trade : t)
          : [trade, ...prev].slice(0, 50)
        set({ derivLiveTrades })
        const isWon = trade.status === 'won' || Number(trade.profit) > 0
        get().addNotification?.({
          type: isWon ? 'success' : 'warning',
          title: isWon ? '🟢 Contrat Deriv Gagné (+)' : '🔴 Contrat Deriv Perdu (−)',
          message: `${trade.symbol} · ${isWon ? '+' : ''}$${Number(trade.profit || 0).toFixed(2)} USD`,
        })
        break
      }
      case 'deriv_robot_tp_hit': {
        get().addNotification?.({
          type: 'success',
          title: '🎯 Take Profit Atteint !',
          message: `Robot Deriv arrêté avec succès : +$${Number(msg.profit || 0).toFixed(2)} USD`,
        })
        break
      }
      case 'deriv_robot_sl_hit': {
        get().addNotification?.({
          type: 'warning',
          title: '🛑 Stop Loss Déclenché',
          message: `Robot Deriv protégé par le Stop Loss : -$${Math.abs(Number(msg.loss || 0)).toFixed(2)} USD`,
        })
        break
      }
      case 'notification':
        console.log('Notification:', msg.data)
        break
      default:
        break
    }
  },

  // Platform settings
  platformSettings: null,
  fetchPlatformSettings: async () => {
    try {
      const { data } = await settingsAPI.get()
      set({ platformSettings: data.settings })
      return data.settings
    } catch (err) {
      console.error('Failed to fetch platform settings:', err)
    }
  },

  // Notifications
  notifications: [],
  addNotification: (notification) => {
    const id = Date.now()
    set({ notifications: [...get().notifications, { ...notification, id }] })
    setTimeout(() => {
      set({ notifications: get().notifications.filter(n => n.id !== id) })
    }, 5000)
  }
}))

export default useStore
