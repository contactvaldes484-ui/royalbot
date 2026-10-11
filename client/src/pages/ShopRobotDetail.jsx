import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { shopAPI, reviewAPI } from '../lib/api'
import useStore from '../store/useStore'
import {
  ArrowLeft, Star, Loader2, AlertCircle, User as UserIcon,
  Cpu, TrendingUp, Layers, Coins, ShoppingCart, Download, CheckCircle2, Shield,
} from 'lucide-react'

const STRATEGY_LABELS = {
  scalper_ema: 'Scalping EMA — entrées rapides sur croisements de moyennes mobiles',
  macd_bb: 'MACD + Bandes de Bollinger — momentum et retour à la moyenne',
  multi_tf_ai: 'IA Multi-TimeFrame — confluence de plusieurs unités de temps',
  rsi_stochastic: 'RSI + Stochastique — surachat/survente et divergences',
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export default function ShopRobotDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useStore()

  const owned = (id) => user?.purchasedBots?.includes(id)

  const handleBuy = () => {
    if (!robot) return
    try {
      const cart = JSON.parse(localStorage.getItem('shop_cart') || '[]')
      if (!cart.find(c => c._id === robot._id)) {
        cart.push({ _id: robot._id, name: robot.name, price: robot.price, slug: robot.slug, color: robot.color })
        localStorage.setItem('shop_cart', JSON.stringify(cart))
      }
    } catch { /* noop */ }
    navigate('/shop')
  }

  const handleDownload = async () => {
    try {
      const res = await shopAPI.downloadRobot(robot._id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      const cd = res.headers['content-disposition'] || ''
      const m = cd.match(/filename="?([^"]+)"?/)
      link.download = m ? m[1] : `${(robot.name || 'robot').replace(/\s+/g, '_')}.ex5`
      document.body.appendChild(link); link.click(); link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.response?.data?.error || 'Téléchargement impossible.')
    }
  }

  const [robot, setRobot] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [reportingId, setReportingId] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [robotRes, reviewsRes] = await Promise.all([
          shopAPI.getRobotBySlug(slug),
          reviewAPI.getBySlug(slug),
        ])
        setRobot(robotRes.data.robot)
        setReviews(reviewsRes.data.reviews || [])
      } catch (err) {
        setError(err.response?.data?.error || 'Erreur lors du chargement du robot.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/shop/robots/${slug}`)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { data } = await reviewAPI.createOrUpdate(slug, { rating, title, comment })
      setReviews(data.reviews || [])
      setRobot(prev => prev ? { ...prev, ratingAverage: data.ratingAverage, ratingCount: data.ratingCount } : prev)
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer votre avis.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReport = async (id) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/shop/robots/${slug}`)
      return
    }
    if (!reportReason.trim()) return
    setReporting(true)
    setError('')
    try {
      await reviewAPI.report(id, { reason: reportReason })
      setReportingId(null)
      setReportReason('')
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de signaler cet avis.')
    } finally {
      setReporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!robot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Robot introuvable</h1>
          <Button variant="outline" asChild>
            <Link to="/shop"><ArrowLeft className="h-4 w-4 mr-2" /> Retour à la boutique</Link>
          </Button>
        </div>
      </div>
    )
  }

  const avg = robot.ratingAverage || 0
  const count = robot.ratingCount || 0

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/shop"><ArrowLeft className="h-4 w-4 mr-2" /> Retour à la boutique</Link>
        </Button>

        <motion.div className="max-w-5xl mx-auto" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <span>{robot.name}</span>
              <Badge variant="outline" className="capitalize text-xs">{robot.tier}</Badge>
            </h1>
            <p className="text-sm text-muted-foreground mb-3">{robot.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="font-semibold">{avg.toFixed(1)} / 5</span>
                <span className="text-xs text-muted-foreground">({count} avis)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">${robot.price}</span>
                <span className="text-xs text-muted-foreground capitalize">{robot.billingCycle === 'lifetime' ? 'à vie' : robot.billingCycle}</span>
              </div>
            </div>
          </motion.div>

          {error && (
            <motion.div variants={fadeUp} className="mb-6 p-3 rounded-lg border border-red-500/30 bg-red-500/5 flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={fadeUp}>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Laisser un avis</h2>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Note</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setRating(v)}
                          className={`p-1 ${v <= rating ? 'text-yellow-400' : 'text-muted-foreground'}`}
                        >
                          <Star className="h-5 w-5" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Titre (optionnel)</p>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Résumez votre avis" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Commentaire (optionnel)</p>
                    <Textarea rows={4} value={comment} onChange={e => setComment(e.target.value)} placeholder="Partagez votre expérience avec ce robot" />
                  </div>
                  <Button variant="gradient" className="w-full" onClick={handleSubmitReview} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Publier mon avis
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Vous devez avoir acheté ce robot pour pouvoir laisser un avis.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Card className="h-full">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold">Avis des utilisateurs</h2>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 text-yellow-400" />
                      <span>{avg.toFixed(1)} ({count})</span>
                    </div>
                  </div>
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun avis pour le moment.</p>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {reviews.map(r => (
                        <div key={r._id} className="p-3 rounded-lg border bg-muted/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center">
                                <UserIcon className="h-3 w-3 text-violet-500" />
                              </div>
                              <div>
                                <p className="text-xs font-medium">
                                  {r.user?.firstName} {r.user?.lastName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(r.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <Star className="h-3 w-3 text-yellow-400" />
                              <span className="font-semibold">{r.rating}/5</span>
                            </div>
                          </div>
                          {r.title && <p className="text-xs font-semibold">{r.title}</p>}
                          {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                          <div className="flex items-center justify-between mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setReportingId(r._id === reportingId ? null : r._id)
                                setReportReason('')
                              }}
                              className="text-[11px] text-muted-foreground hover:text-red-500"
                            >
                              Signaler un abus
                            </button>
                          </div>
                          {reportingId === r._id && (
                            <div className="mt-2 space-y-2">
                              <Input
                                value={reportReason}
                                onChange={e => setReportReason(e.target.value)}
                                placeholder="Expliquez le problème (insultes, spam, etc.)"
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setReportingId(null); setReportReason('') }}
                                >
                                  Annuler
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleReport(r._id)}
                                  disabled={reporting}
                                >
                                  {reporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                                  Envoyer
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
