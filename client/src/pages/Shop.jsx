import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { shopAPI, settingsAPI, subscriptionAPI } from '../lib/api'
import useStore from '../store/useStore'
import {
  Bot, ShoppingCart, Search, Filter, Star, TrendingUp, Shield,
  Wallet, X, Plus, Minus, Trash2, CheckCircle2, AlertCircle,
  ArrowRight, Loader2, Copy, CreditCard, BarChart3, Zap,
  Package, Eye, Lock, ChevronDown, Smartphone, Download
} from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export default function Shop() {
  const { isAuthenticated, user } = useStore()
  const navigate = useNavigate()

  const [robots, setRobots] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('')
  const [search, setSearch] = useState('')
  const [vendors, setVendors] = useState([])
  const [vendorFilter, setVendorFilter] = useState('')
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shop_cart') || '[]') } catch { return [] }
  })
  const [showCart, setShowCart] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(null) // null | 'payment' | 'confirm'
  const [paymentMethod, setPaymentMethod] = useState('usdt_trc20')
  const [txHash, setTxHash] = useState('')
  const [mmProvider, setMmProvider] = useState('mtn')
  const [mmNumber, setMmNumber] = useState('')
  const [payOptions, setPayOptions] = useState(null)
  const [orderResult, setOrderResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    fetchRobots()
    settingsAPI.get().then(r => setSettings(r.data.settings)).catch(() => {})
  }, [category, sort, search, vendorFilter])

  useEffect(() => {
    subscriptionAPI.getPaymentOptions().then(r => setPayOptions(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const { data } = await shopAPI.getVendors()
        setVendors(data.vendors || [])
      } catch {}
    }
    loadVendors()
  }, [])

  // Persist cart
  useEffect(() => {
    localStorage.setItem('shop_cart', JSON.stringify(cart))
  }, [cart])

  const fetchRobots = async () => {
    setLoading(true)
    try {
      const params = {}
      if (category) params.category = category
      if (sort) params.sort = sort
      if (search) params.search = search
      if (vendorFilter) params.vendor = vendorFilter
      const { data } = await shopAPI.getRobots(params)
      setRobots(data.robots || [])
    } catch { }
    setLoading(false)
  }

  const addToCart = (robot) => {
    if (cart.find(c => c._id === robot._id)) return
    setCart([...cart, { _id: robot._id, name: robot.name, price: robot.price, slug: robot.slug, color: robot.color }])
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(c => c._id !== id))
  }

  const isInCart = (id) => cart.some(c => c._id === id)
  const isOwned = (id) => user?.purchasedBots?.includes(id)
  const cartTotal = cart.reduce((s, c) => s + c.price, 0)

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/shop')
      return
    }
    setCheckoutStep('payment')
  }

  const clearCart = () => { setCart([]); localStorage.removeItem('shop_cart') }

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) return
    setSubmitting(true)
    try {
      const payload = { items: cart.map(c => ({ botId: c._id })), paymentMethod }
      if (paymentMethod === 'mobile_money') {
        payload.mobileMoneyProvider = mmProvider
        payload.mobileMoneyNumber = mmNumber
      }
      const { data } = await shopAPI.createOrder(payload)
      setOrderResult(data)

      // USDT confirmé immédiatement (rare, si hash fourni en amont) → terminé
      if (data.confirmed) { clearCart(); setCheckoutStep('done'); setSubmitting(false); return }

      // Mobile Money : ouvrir le lien de validation opérateur puis attendre le webhook
      if (paymentMethod === 'mobile_money') {
        if (data.paymentInstructions?.providerLink) window.open(data.paymentInstructions.providerLink, '_blank', 'noopener')
        clearCart(); setCheckoutStep('done'); setSubmitting(false); return
      }

      setCheckoutStep('confirm')
    } catch (err) {
      setOrderResult({ error: err.response?.data?.error || 'Erreur lors de la commande.' })
    }
    setSubmitting(false)
  }

  const handleSubmitPayment = async () => {
    if (!orderResult?.order?._id) return
    setSubmitting(true)
    try {
      const orderId = orderResult.order._id
      if (paymentMethod === 'usdt_trc20') {
        // Vérification automatique on-chain
        try {
          await shopAPI.verifyUsdt(orderId, txHash)
          clearCart(); setCheckoutStep('done')
        } catch (e) {
          // Repli : soumettre la preuve pour validation admin
          await shopAPI.submitPayment(orderId, { transactionHash: txHash })
          clearCart(); setCheckoutStep('done')
        }
      } else {
        await shopAPI.submitPayment(orderId, { binanceOrderId: txHash })
        clearCart(); setCheckoutStep('done')
      }
    } catch (err) {
      setOrderResult(prev => ({ ...prev, error: err.response?.data?.error || 'Erreur.' }))
    }
    setSubmitting(false)
  }

  const handleDownload = async (botId, name) => {
    try {
      const res = await shopAPI.downloadRobot(botId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      const cd = res.headers['content-disposition'] || ''
      const m = cd.match(/filename="?([^"]+)"?/)
      link.download = m ? m[1] : `${(name || 'robot').replace(/\s+/g, '_')}.ex5`
      document.body.appendChild(link); link.click(); link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.response?.data?.error || 'Téléchargement impossible.')
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const categories = [
    { value: '', label: 'Tous' },
    { value: 'mt4', label: 'MT4' },
    { value: 'mt5', label: 'MT5' },
  ]

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div className="text-center mb-10" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              <Package className="h-3 w-3 mr-1.5" /> Marketplace
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-3">
            Boutique de <span className="gradient-text">Robots de Trading</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-muted-foreground max-w-2xl mx-auto">
            Achetez des robots de trading professionnels. Paiement sécurisé via USDT (TRC-20) ou Binance Pay.
          </motion.p>
        </motion.div>

        {/* Filters + Cart button */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un robot..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Category filter */}
            <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
              {categories.map(cat => (
                <button key={cat.value} onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    category === cat.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                  }`}>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-xs">
              <option value="">Trier par défaut</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="popular">Populaire</option>
              <option value="newest">Plus récent</option>
            </select>

            {/* Vendor filter */}
            {vendors.length > 0 && (
              <select
                value={vendorFilter}
                onChange={e => setVendorFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">Tous les vendeurs</option>
                {vendors.map(v => {
                  const value = v.slug || v.user?._id
                  const label = v.displayName || `${v.user?.firstName || ''} ${v.user?.lastName || ''}`.trim()
                  return (
                    <option key={v._id} value={value}>
                      {label}
                    </option>
                  )
                })}
              </select>
            )}

            {/* Cart button */}
            <Button variant="outline" className="relative" onClick={() => setShowCart(!showCart)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Panier
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Cart sidebar */}
          <AnimatePresence>
            {showCart && (
              <motion.div
                initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
                className="fixed right-0 top-0 h-full w-96 max-w-[90vw] bg-background border-l shadow-2xl z-50 flex flex-col"
              >
                <div className="p-5 border-b flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-violet-500" /> Panier ({cart.length})
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowCart(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Votre panier est vide</p>
                    </div>
                  ) : cart.map(item => (
                    <div key={item._id} className="flex items-center gap-3 p-3 border rounded-xl">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: (item.color || '#8b5cf6') + '20' }}>
                        <Bot className="h-5 w-5" style={{ color: item.color || '#8b5cf6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-sm font-bold text-violet-500">${item.price}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => removeFromCart(item._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {cart.length > 0 && (
                  <div className="p-5 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-xl font-bold">${cartTotal.toFixed(2)}</span>
                    </div>
                    <Button variant="gradient" className="w-full" size="lg" onClick={handleCheckout}>
                      <CreditCard className="h-4 w-4 mr-2" /> Passer la commande
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Checkout overlay */}
          <AnimatePresence>
            {checkoutStep && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                onClick={() => { if (checkoutStep !== 'done') return; setCheckoutStep(null); setOrderResult(null) }}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                  className="bg-background rounded-2xl border shadow-2xl w-full max-w-lg p-6 space-y-5"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Payment method selection */}
                  {checkoutStep === 'payment' && (
                    <>
                      <div className="text-center">
                        <CreditCard className="h-10 w-10 text-violet-500 mx-auto mb-2" />
                        <h3 className="text-xl font-bold">Paiement</h3>
                        <p className="text-sm text-muted-foreground">Total : <strong className="text-foreground">${cartTotal.toFixed(2)}</strong></p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-3 block">Méthode de paiement</label>
                        <div className="grid grid-cols-3 gap-3">
                          <button onClick={() => setPaymentMethod('usdt_trc20')}
                            className={`p-4 rounded-xl border text-center transition-all ${
                              paymentMethod === 'usdt_trc20' ? 'border-violet-500 bg-violet-500/5' : 'border-border hover:border-violet-500/30'
                            }`}>
                            <Wallet className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                            <p className="text-sm font-bold">USDT</p>
                            <p className="text-[10px] text-muted-foreground">TRC-20 (Tron)</p>
                          </button>
                          {payOptions?.mobileMoney?.enabled && (
                            <button onClick={() => setPaymentMethod('mobile_money')}
                              className={`p-4 rounded-xl border text-center transition-all ${
                                paymentMethod === 'mobile_money' ? 'border-violet-500 bg-violet-500/5' : 'border-border hover:border-violet-500/30'
                              }`}>
                              <Smartphone className="h-6 w-6 mx-auto mb-2 text-green-500" />
                              <p className="text-sm font-bold">Mobile Money</p>
                              <p className="text-[10px] text-muted-foreground">MTN, Moov, Orange…</p>
                            </button>
                          )}
                          <button onClick={() => setPaymentMethod('binance_pay')}
                            className={`p-4 rounded-xl border text-center transition-all ${
                              paymentMethod === 'binance_pay' ? 'border-violet-500 bg-violet-500/5' : 'border-border hover:border-violet-500/30'
                            }`}>
                            <CreditCard className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                            <p className="text-sm font-bold">Binance Pay</p>
                            <p className="text-[10px] text-muted-foreground">Via Binance</p>
                          </button>
                        </div>
                      </div>

                      {paymentMethod === 'mobile_money' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium mb-1 block">Opérateur</label>
                            <select value={mmProvider} onChange={e => setMmProvider(e.target.value)}
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                              <option value="mtn">MTN Mobile Money</option>
                              <option value="moov">Moov Money</option>
                              <option value="orange">Orange Money</option>
                              <option value="wave">Wave</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Numéro (format intl)</label>
                            <Input value={mmNumber} onChange={e => setMmNumber(e.target.value)} placeholder="22997000000" className="text-sm" />
                          </div>
                          <p className="col-span-2 text-[11px] text-muted-foreground">
                            Une demande de paiement sera envoyée sur votre téléphone. Validez-la (code PIN) pour débloquer vos robots automatiquement.
                          </p>
                        </div>
                      )}

                      <div className="bg-muted/30 rounded-xl p-3 space-y-1">
                        <p className="text-xs font-medium">Récapitulatif</p>
                        {cart.map(item => (
                          <div key={item._id} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="font-medium">${item.price}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-bold pt-1 border-t mt-1">
                          <span>Total</span>
                          <span>${cartTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {orderResult?.error && (
                        <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" /> {orderResult.error}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => { setCheckoutStep(null); setOrderResult(null) }}>
                          Annuler
                        </Button>
                        <Button variant="gradient" className="flex-1" onClick={handlePlaceOrder} disabled={submitting || (paymentMethod === 'mobile_money' && !mmNumber.trim())}>
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                          Commander
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Confirm payment */}
                  {checkoutStep === 'confirm' && orderResult?.paymentInstructions && (
                    <>
                      <div className="text-center">
                        <Wallet className="h-10 w-10 text-amber-500 mx-auto mb-2" />
                        <h3 className="text-xl font-bold">Effectuez le paiement</h3>
                        <p className="text-sm text-muted-foreground">{orderResult.paymentInstructions.note}</p>
                      </div>

                      {paymentMethod === 'usdt_trc20' && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium mb-1 block">Adresse USDT (TRC-20)</label>
                            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border">
                              <code className="text-xs break-all flex-1 font-mono">{orderResult.paymentInstructions.address}</code>
                              <Button variant="ghost" size="sm" onClick={() => handleCopy(orderResult.paymentInstructions.address)} className="shrink-0 h-8 w-8 p-0">
                                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Montant exact</label>
                            <div className="p-3 bg-amber-500/10 rounded-xl text-center">
                              <span className="text-2xl font-bold">${orderResult.paymentInstructions.amount}</span>
                              <span className="text-sm text-muted-foreground ml-2">USDT</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Hash de transaction (TxID) *</label>
                            <Input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Collez le hash TxID ici..." className="text-xs" />
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'binance_pay' && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium mb-1 block">Binance Pay ID</label>
                            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border">
                              <code className="text-xs break-all flex-1 font-mono">{orderResult.paymentInstructions.binanceId}</code>
                              <Button variant="ghost" size="sm" onClick={() => handleCopy(orderResult.paymentInstructions.binanceId)} className="shrink-0 h-8 w-8 p-0">
                                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">Montant</label>
                            <div className="p-3 bg-yellow-500/10 rounded-xl text-center">
                              <span className="text-2xl font-bold">${orderResult.paymentInstructions.amount}</span>
                              <span className="text-sm text-muted-foreground ml-2">USDT</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block">ID de transaction Binance *</label>
                            <Input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="Collez l'ID Binance ici..." className="text-xs" />
                          </div>
                        </div>
                      )}

                      {orderResult?.error && (
                        <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" /> {orderResult.error}
                        </div>
                      )}

                      <Button variant="gradient" className="w-full" onClick={handleSubmitPayment} disabled={submitting || !txHash.trim()}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                        Confirmer le paiement
                      </Button>
                    </>
                  )}

                  {/* Done */}
                  {checkoutStep === 'done' && (
                    <div className="text-center py-6">
                      <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2">Commande enregistrée !</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        {paymentMethod === 'mobile_money'
                          ? 'Validez la demande de paiement sur votre téléphone. Vos robots seront débloqués automatiquement dès confirmation.'
                          : 'Votre paiement est en cours de vérification. Vos robots seront téléchargeables dès confirmation (souvent quelques minutes).'}
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => { setCheckoutStep(null); setOrderResult(null) }}>
                          Continuer les achats
                        </Button>
                        <Button variant="gradient" asChild>
                          <Link to="/dashboard">Mon Dashboard</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Robot grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : robots.length === 0 ? (
            <div className="text-center py-24">
              <Package className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-bold mb-2">Aucun robot disponible</h3>
              <p className="text-sm text-muted-foreground">Revenez bientôt, de nouveaux robots seront ajoutés.</p>
            </div>
          ) : (
            <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" initial="hidden" animate="visible" variants={stagger}>
              {robots.map(robot => (
                <motion.div key={robot._id} variants={fadeUp}>
                  <Card className="group hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5 h-full flex flex-col">
                    <CardContent className="p-5 flex flex-col h-full">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: (robot.color || '#8b5cf6') + '20' }}>
                          <Bot className="h-6 w-6" style={{ color: robot.color || '#8b5cf6' }} />
                        </div>
                        <div className="flex gap-1">
                          {robot.isPopular && <Badge variant="premium" className="text-[9px]">Populaire</Badge>}
                          <Badge variant="outline" className="text-[9px] capitalize">{robot.tier}</Badge>
                        </div>
                      </div>

                      <h3 className="font-bold text-base mb-1">
                        <Link to={`/shop/robots/${robot.slug}`} className="hover:underline">
                          {robot.name}
                        </Link>
                      </h3>
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{robot.description}</p>

                      {robot.vendor && (
                        <p className="text-[11px] text-muted-foreground mb-2">
                          Vendeur :{' '}
                          <Link
                            to={`/shop/vendors/${robot.vendor.slug || robot.vendor._id}`}
                            className="font-medium text-violet-500 hover:underline"
                          >
                            {robot.vendor.firstName} {robot.vendor.lastName}
                          </Link>
                        </p>
                      )}

                      <div className="flex items-center gap-1 mb-3 text-[11px]">
                        <Star className="h-3 w-3 text-yellow-400" />
                        <span className="font-semibold">{(robot.ratingAverage || 0).toFixed(1)}/5</span>
                        <span className="text-muted-foreground">({robot.ratingCount || 0})</span>
                      </div>

                      {/* Platforms */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(robot.platforms || []).map(p => (
                          <span key={p} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium capitalize">{p}</span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-1.5 rounded-lg bg-muted/50">
                          <p className="text-[9px] text-muted-foreground">Win Rate</p>
                          <p className="text-xs font-bold text-green-500">{robot.avgWinRate || 0}%</p>
                        </div>
                        <div className="text-center p-1.5 rounded-lg bg-muted/50">
                          <p className="text-[9px] text-muted-foreground">Utilisateurs</p>
                          <p className="text-xs font-bold">{robot.totalUsers || 0}</p>
                        </div>
                        <div className="text-center p-1.5 rounded-lg bg-muted/50">
                          <p className="text-[9px] text-muted-foreground">Capital min</p>
                          <p className="text-xs font-bold">${robot.minCapital || 0}</p>
                        </div>
                      </div>

                      {/* Price + Action */}
                      <div className="mt-auto pt-3 border-t">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-2xl font-bold">${robot.price}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              {robot.billingCycle === 'lifetime' ? '(à vie)' : robot.billingCycle === 'monthly' ? '/mois' : ''}
                            </span>
                          </div>
                        </div>

                        {isOwned(robot._id) ? (
                          <Button variant="outline" className="w-full border-green-500/30 text-green-600" onClick={() => handleDownload(robot._id, robot.name)}>
                            <Download className="h-4 w-4 mr-2" /> Télécharger le robot
                          </Button>
                        ) : isInCart(robot._id) ? (
                          <Button variant="outline" className="w-full border-violet-500/30 text-violet-500" onClick={() => removeFromCart(robot._id)}>
                            <X className="h-4 w-4 mr-2" /> Retirer du panier
                          </Button>
                        ) : (
                          <Button variant="gradient" className="w-full" onClick={() => addToCart(robot)}>
                            <ShoppingCart className="h-4 w-4 mr-2" /> Ajouter au panier
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Payment methods info */}
          <div className="text-center mt-16">
            <p className="text-sm text-muted-foreground mb-3">Méthodes de paiement acceptées</p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-2 px-4 py-2 border rounded-xl">
                <Wallet className="h-4 w-4 text-amber-500" />
                <span className="font-medium">USDT (TRC-20)</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 border rounded-xl">
                <Smartphone className="h-4 w-4 text-green-500" />
                <span className="font-medium">Mobile Money</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 border rounded-xl">
                <CreditCard className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Binance Pay</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Paiement sécurisé</span>
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Activation rapide</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Support 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
