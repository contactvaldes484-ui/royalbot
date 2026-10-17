import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://web-production-19f31.up.railway.app/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  enable2FA: () => api.post('/auth/2fa/enable'),
  confirm2FA: (data) => api.post('/auth/2fa/confirm', data),
}

// Users
export const userAPI = {
  updateProfile: (data) => api.put('/users/profile', data),
  getStats: () => api.get('/users/stats'),
  toggleDemo: () => api.post('/users/toggle-demo'),
}

// Bots
export const botAPI = {
  getAll: () => api.get('/bots'),
  getBySlug: (slug) => api.get(`/bots/${slug}`),
  start: (slug, settings) => api.post(`/bots/${slug}/start`, { settings }),
  stop: (sessionId) => api.post(`/bots/session/${sessionId}/stop`),
  pause: (sessionId) => api.post(`/bots/session/${sessionId}/pause`),
  resume: (sessionId) => api.post(`/bots/session/${sessionId}/resume`),
  manualTrade: (data) => api.post('/bots/manual-trade', data),
  getActiveSessions: () => api.get('/bots/sessions/active'),
  getSessionHistory: () => api.get('/bots/sessions/history'),
  seed: () => api.post('/bots/seed'),
}

// Trades
export const tradeAPI = {
  getAll: (params) => api.get('/trades', { params }),
  getById: (id) => api.get(`/trades/${id}`),
  getStats: (params) => api.get('/trades/stats/summary', { params }),
}

// Subscriptions
export const subscriptionAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  getPlan: (slug) => api.get(`/subscriptions/plans/${slug}`),
  getCurrent: () => api.get('/subscriptions/current'),
  subscribe: (data) => api.post('/subscriptions/subscribe', data),
  verifyUsdt: (id, txHash) => api.post(`/subscriptions/${id}/verify-usdt`, { txHash }),
  getPaymentOptions: () => api.get('/subscriptions/payment-options'),
  getMobileOperators: (country) => api.get('/subscriptions/mobile-operators', { params: { country } }),
  cancel: (data) => api.post('/subscriptions/cancel', data),
  getHistory: () => api.get('/subscriptions/history'),
  getUsage: () => api.get('/subscriptions/usage'),
  upgradePreview: (slug) => api.get(`/subscriptions/upgrade-preview/${slug}`),
}

// Withdrawals
export const withdrawalAPI = {
  request: (data) => api.post('/withdrawals', data),
  getAll: () => api.get('/withdrawals'),
}

// Leaderboard
export const leaderboardAPI = {
  get: (params) => api.get('/leaderboard', { params }),
}

// Blog
export const blogAPI = {
  getAll: (params) => api.get('/blog', { params }),
  getBySlug: (slug) => api.get(`/blog/${slug}`),
  seed: () => api.post('/blog/seed'),
}

// Contact
export const contactAPI = {
  send: (data) => api.post('/contact', data),
}

// Forex AI Analysis
export const forexAPI = {
  analyze: (params) => api.get('/forex/analyze', { params }),
  analyzeMTF: (params) => api.get('/forex/analyze-mtf', { params }),
  scanner: (params) => api.get('/forex/scanner', { params }),
  symbols: () => api.get('/forex/symbols'),
  strategies: () => api.get('/forex/strategies'),
  // Alerts
  getAlerts: () => api.get('/forex/alerts'),
  createAlert: (data) => api.post('/forex/alerts', data),
  updateAlert: (id, data) => api.patch(`/forex/alerts/${id}`, data),
  deleteAlert: (id) => api.delete(`/forex/alerts/${id}`),
  // Admin
  adminGetConfig: () => api.get('/forex/admin/config'),
  adminUpdateConfig: (data) => api.patch('/forex/admin/config', data),
  adminScanNow: () => api.post('/forex/admin/scan-now'),
  adminGetLogs: (limit) => api.get('/forex/admin/logs', { params: { limit } }),
  adminGetStats: () => api.get('/forex/admin/stats'),
}

// MT5 / MT4
// Binance (Spot + Futures)
export const binanceAPI = {
  getAccounts:      () => api.get('/binance/accounts'),
  connectAccount:   (data) => api.post('/binance/accounts/connect', data),
  testAccount:      (id) => api.post(`/binance/accounts/${id}/test`),
  deleteAccount:    (id) => api.delete(`/binance/accounts/${id}`),
  getRobots:        () => api.get('/binance/robots'),
  startSession:     (data) => api.post('/binance/sessions/start', data),
  stopSession:      (id) => api.post(`/binance/sessions/${id}/stop`),
  pauseSession:     (id) => api.post(`/binance/sessions/${id}/pause`),
  resumeSession:    (id) => api.post(`/binance/sessions/${id}/resume`),
  getSessions:      () => api.get('/binance/sessions'),
  getSessionTrades: (id) => api.get(`/binance/sessions/${id}/trades`),
  getSessionLogs:   (id) => api.get(`/binance/sessions/${id}/logs`),
  getTrades:        (params) => api.get('/binance/trades', { params }),
  closeTrade:       (id) => api.post(`/binance/trades/${id}/close`),
  getStats:         () => api.get('/binance/stats'),
  // Admin
  adminGetDashboard: () => api.get('/binance/admin/dashboard'),
  adminGetRobots:    () => api.get('/binance/admin/robots'),
  adminGetAccounts:  (params) => api.get('/binance/admin/accounts', { params }),
  adminGetTrades:    (params) => api.get('/binance/admin/trades', { params }),
  adminGetLogs:      (params) => api.get('/binance/admin/logs', { params }),
}

// Push Notifications
export const pushAPI = {
  getVapidKey: () => api.get('/push/vapid-key'),
  subscribe: (subscription) => api.post('/push/subscribe', { subscription }),
  unsubscribe: (endpoint) => api.post('/push/unsubscribe', { endpoint }),
}

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  updateBot: (id, data) => api.put(`/admin/bots/${id}`, data),
  getWithdrawals: (params) => api.get('/admin/withdrawals', { params }),
  processWithdrawal: (id, data) => api.put(`/admin/withdrawals/${id}`, data),
  sendNotification: (data) => api.post('/admin/notifications', data),
  getRevenue: (params) => api.get('/admin/revenue', { params }),
  searchUsersForRobot: (q) => api.get('/admin/robots/search-users', { params: { q } }),
  // Subscription management
  getSubscriptions: (params) => api.get('/admin/subscriptions', { params }),
  grantSubscription: (data) => api.post('/admin/subscriptions/grant', data),
  toggleSubscription: (id) => api.put(`/admin/subscriptions/${id}/toggle`),
  changeSubscriptionPlan: (id, plan) => api.put(`/admin/subscriptions/${id}/plan`, { plan }),
  confirmCryptoPayment: (id, data) => api.put(`/admin/subscriptions/${id}/confirm-payment`, data),
  confirmSubscription: (id, data) => api.post(`/admin/subscriptions/${id}/confirm`, data),
  rejectSubscription: (id, data) => api.post(`/admin/subscriptions/${id}/reject`, data),
  // Plan CRUD (admin)
  getPlans: () => api.get('/admin/plans'),
  getPlan: (id) => api.get(`/admin/plans/${id}`),
  createPlan: (data) => api.post('/admin/plans', data),
  updatePlan: (id, data) => api.put(`/admin/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/admin/plans/${id}`),
  togglePlanActive: (id) => api.put(`/admin/plans/${id}/toggle-active`),
  togglePlanReferral: (id) => api.put(`/admin/plans/${id}/toggle-referral`),
  togglePlanPayment: (id) => api.put(`/admin/plans/${id}/toggle-payment`),
  resetPlansDefaults: () => api.post('/admin/plans/reset-defaults'),
  // Revenue stats
  getRevenueStats: () => api.get('/admin/revenue/stats'),
  // RBAC
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  // Bot catalog management (CRUD)
  getBotsCatalog: () => api.get('/admin/bots/catalog'),
  createBot: (data) => api.post('/admin/bots/catalog', data),
  updateBot: (id, data) => api.put(`/admin/bots/catalog/${id}`, data),
  deleteBot: (id) => api.delete(`/admin/bots/catalog/${id}`),
  toggleBot: (id) => api.put(`/admin/bots/catalog/${id}/toggle`),
  // Platform settings
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  // Order management (marketplace)
  getOrders: (params) => api.get('/admin/orders', { params }),
  getOrderStats: () => api.get('/admin/orders/stats'),
  confirmOrder: (id, data) => api.put(`/admin/orders/${id}/confirm`, data),
  rejectOrder: (id, data) => api.put(`/admin/orders/${id}/reject`, data),
  // Security logs
  getSecurityLogs: (params) => api.get('/admin/security-logs', { params }),
  unblockUserIp: (userId, data) => api.put(`/admin/users/${userId}/unblock-ip`, data),
  // Screenshot management (marketing)
  getScreenshots: () => api.get('/admin/screenshots'),
  addScreenshot: (data) => api.post('/admin/screenshots', data),
  updateScreenshot: (id, data) => api.put(`/admin/screenshots/${id}`, data),
  deleteScreenshot: (id) => api.delete(`/admin/screenshots/${id}`),
  // Vendor management (marketplace)
  getVendors: () => api.get('/admin/vendors'),
  approveVendor: (id, data) => api.put(`/admin/vendors/${id}/approve`, data),
  rejectVendor: (id, data) => api.put(`/admin/vendors/${id}/reject`, data),
}

// Public screenshots (no auth)
export const screenshotAPI = {
  getAll: () => api.get('/screenshots'),
}

// Shop / Marketplace
export const shopAPI = {
  getRobots: (params) => api.get('/shop/robots', { params }),
  getRobotBySlug: (slug) => api.get(`/shop/robots/${slug}`),
  getVendor: (vendorId) => api.get(`/shop/vendors/${vendorId}`),
  createOrder: (data) => api.post('/shop/orders', data),
  submitPayment: (orderId, data) => api.put(`/shop/orders/${orderId}/pay`, data),
  verifyUsdt: (orderId, transactionHash) => api.put(`/shop/orders/${orderId}/verify-usdt`, { transactionHash }),
  downloadRobot: (botId) => api.get(`/shop/robots/${botId}/download`, { responseType: 'blob' }),
  getMyOrders: () => api.get('/shop/orders'),
  getMyRobots: () => api.get('/shop/my-robots'),
  getVendors: () => api.get('/shop/vendors'),
}

// Vendor (marketplace sellers)
export const vendorAPI = {
  apply: (data) => api.post('/vendor/apply', data),
  getProfile: () => api.get('/vendor/profile'),
  getRobots: () => api.get('/vendor/robots'),
  getEarnings: () => api.get('/vendor/earnings'),
  createRobot: (data) => api.post('/vendor/robots', data),
  updateRobot: (id, data) => api.put(`/vendor/robots/${id}`, data),
  getWithdrawals: () => api.get('/vendor/withdrawals'),
  requestWithdrawal: (data) => api.post('/vendor/withdrawals', data),
}

// Groups / Community
export const groupAPI = {
  getMyGroups: () => api.get('/groups'),
  getAvailable: () => api.get('/groups/available'),
  getGroup: (slug) => api.get(`/groups/${slug}`),
  joinGroup: (slug) => api.post(`/groups/${slug}/join`),
  leaveGroup: (slug) => api.post(`/groups/${slug}/leave`),
  getMessages: (slug, params) => api.get(`/groups/${slug}/messages`, { params }),
  sendMessage: (slug, data) => api.post(`/groups/${slug}/messages`, data),
  deleteMessage: (slug, messageId) => api.delete(`/groups/${slug}/messages/${messageId}`),
  pinMessage: (slug, messageId) => api.post(`/groups/${slug}/messages/${messageId}/pin`),
  getMembers: (slug) => api.get(`/groups/${slug}/members`),
  updateGroup: (slug, data) => api.put(`/groups/${slug}`, data),
  createGroup: (data) => api.post('/groups', data),
  kickMember: (slug, userId, ban) => api.post(`/groups/${slug}/kick/${userId}`, { ban }),
  promoteMember: (slug, userId) => api.post(`/groups/${slug}/promote/${userId}`),
}

// Copy Trading
export const copyTradingAPI = {
  // Public
  getMasters: (params) => api.get('/copy-trading/masters', { params }),
  getMaster: (slug) => api.get(`/copy-trading/masters/${slug}`),
  getMasterTrades: (slug) => api.get(`/copy-trading/masters/${slug}/trades`),
  // User — become master
  apply: (data) => api.post('/copy-trading/apply', data),
  getMyMasters: () => api.get('/copy-trading/my-masters'),
  // User — follow / settings
  follow: (masterId, data) => api.post(`/copy-trading/follow/${masterId}`, data),
  getMySubscriptions: () => api.get('/copy-trading/my-subscriptions'),
  updateSubscription: (id, data) => api.patch(`/copy-trading/subscriptions/${id}`, data),
  pauseSubscription: (id) => api.post(`/copy-trading/subscriptions/${id}/pause`),
  resumeSubscription: (id) => api.post(`/copy-trading/subscriptions/${id}/resume`),
  stopSubscription: (id) => api.delete(`/copy-trading/subscriptions/${id}`),
  getSubscriptionTrades: (id, params) => api.get(`/copy-trading/subscriptions/${id}/trades`, { params }),
  getMyStats: () => api.get('/copy-trading/my-stats'),
  // Master earnings (commissions)
  getMasterEarnings: () => api.get('/copy-trading/master/earnings'),
  getMasterLedger: (params) => api.get('/copy-trading/master/ledger', { params }),
  requestPayout: (data) => api.post('/copy-trading/master/payout-request', data),
  cancelPayout: (id) => api.delete(`/copy-trading/master/payout/${id}`),
  // Admin payouts
  adminGetPayouts: (params) => api.get('/copy-trading/admin/payouts', { params }),
  adminProcessPayout: (id) => api.post(`/copy-trading/admin/payouts/${id}/process`),
  adminCompletePayout: (id, data) => api.post(`/copy-trading/admin/payouts/${id}/complete`, data),
  adminRejectPayout: (id, data) => api.post(`/copy-trading/admin/payouts/${id}/reject`, data),
  // Admin
  adminGetMasters: (params) => api.get('/copy-trading/admin/masters', { params }),
  adminApprove: (id, data) => api.post(`/copy-trading/admin/masters/${id}/approve`, data),
  adminReject: (id, data) => api.post(`/copy-trading/admin/masters/${id}/reject`, data),
  adminSuspend: (id, data) => api.post(`/copy-trading/admin/masters/${id}/suspend`, data),
  adminUnsuspend: (id) => api.post(`/copy-trading/admin/masters/${id}/unsuspend`),
  adminDelete: (id) => api.delete(`/copy-trading/admin/masters/${id}`),
  adminGetLogs: (limit) => api.get('/copy-trading/admin/logs', { params: { limit } }),
  adminGetStats: () => api.get('/copy-trading/admin/stats'),
  adminRecheck: (id) => api.post(`/copy-trading/admin/masters/${id}/recheck`),
}

// Robot reviews
export const reviewAPI = {
  getBySlug: (slug) => api.get(`/reviews/${slug}`),
  createOrUpdate: (slug, data) => api.post(`/reviews/${slug}`, data),
  report: (id, data) => api.post(`/reviews/${id}/report`, data),
  // Admin moderation
  getReported: () => api.get('/reviews/admin/reported'),
  setVisibility: (id, status) => api.put(`/reviews/admin/${id}/visibility`, { status }),
}

// Bybit
export const bybitAPI = {
  getAccounts: () => api.get('/bybit/accounts'),
  connectAccount: (data) => api.post('/bybit/accounts/connect', data),
  testAccount: (id) => api.post(`/bybit/accounts/${id}/test`),
  deleteAccount: (id) => api.delete(`/bybit/accounts/${id}`),
  verifyAffiliate: (id, uid) => api.post(`/bybit/accounts/${id}/verify-affiliate`, { uid }),
  getRobots: () => api.get('/bybit/robots'),
}

// Deriv
export const derivAPI = {
  getOAuthConfig: () => api.get('/deriv/oauth-config'),
  oauthLogin: (data) => api.post('/deriv/oauth-login', data),
  getAccounts: (params) => api.get('/deriv/accounts', { params }),
  connectAccount: (data) => api.post('/deriv/accounts/connect', data),
  syncOAuthAccounts: (data) => api.post('/deriv/accounts/oauth-sync', data),
  testAccount: (id) => api.post(`/deriv/accounts/${id}/test`),
  deleteAccount: (id) => api.delete(`/deriv/accounts/${id}`),
  getSymbols: () => api.get('/deriv/symbols'),
  getTicks: (symbol) => api.get(`/deriv/ticks/${symbol}`),
  getProposal: (data) => api.post('/deriv/proposal', data),
  manualTrade: (data) => api.post('/deriv/manual-trade', data),
  getContractStatus: (contractId) => api.get(`/deriv/contracts/${contractId}/status`),
  getBots: () => api.get('/deriv/bots'),
  startSession: (data) => api.post('/deriv/sessions/start', data),
  stopSession: (id) => api.post(`/deriv/sessions/${id}/stop`),
  pauseSession: (id) => api.post(`/deriv/sessions/${id}/pause`),
  resumeSession: (id) => api.post(`/deriv/sessions/${id}/resume`),
  getSessions: () => api.get('/deriv/sessions'),
  getTrades: () => api.get('/deriv/trades'),
}

// Admin Deriv
export const adminDerivAPI = {
  getBots: () => api.get('/admin/deriv/bots'),
  createBot: (data) => api.post('/admin/deriv/bots', data),
  updateBot: (id, data) => api.put(`/admin/deriv/bots/${id}`, data),
  deleteBot: (id) => api.delete(`/admin/deriv/bots/${id}`),
  parseBotFile: (data) => api.post('/admin/deriv/bots/parse-file', data),
  uploadBotFile: (data) => api.post('/admin/deriv/bots/upload-file', data),
  getAccounts: () => api.get('/admin/deriv/accounts'),
  toggleAffiliate: (id) => api.post(`/admin/deriv/accounts/${id}/toggle-affiliate`),
  extendTrial: (id, days) => api.post(`/admin/deriv/accounts/${id}/extend-trial`, { days }),
  getStats: () => api.get('/admin/deriv/stats'),
}

// Admin Crypto Robots (Binance & Bybit Unified Engine)
export const adminCryptoRobotsAPI = {
  getRobots: () => api.get('/admin/crypto-robots'),
  getRobot: (id) => api.get(`/admin/crypto-robots/${id}`),
  createRobot: (data) => api.post('/admin/crypto-robots', data),
  updateRobot: (id, data) => api.put(`/admin/crypto-robots/${id}`, data),
  deleteRobot: (id) => api.delete(`/admin/crypto-robots/${id}`),
  toggleRobot: (id) => api.put(`/admin/crypto-robots/${id}/toggle`),
  parsePrompt: (data) => api.post('/admin/crypto-robots/parse-prompt', data),
  resetDefaults: () => api.post('/admin/crypto-robots/reset-defaults'),
}

// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  adminGet: () => api.get('/admin/settings'),
  adminUpdate: (data) => api.put('/admin/settings', data),
}

export default api
