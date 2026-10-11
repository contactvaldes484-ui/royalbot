import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { shopAPI } from '../lib/api'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Bot, ArrowLeft, Star, Package, Loader2 } from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

export default function ShopVendorDetail() {
  const { vendorId } = useParams()
  const [vendor, setVendor] = useState(null)
  const [robots, setRobots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await shopAPI.getVendor(vendorId)
        setVendor(data.vendor)
        setRobots(data.robots || [])
      } catch (err) {
        setError(err.response?.data?.error || 'Impossible de charger ce vendeur.')
      }
      setLoading(false)
    }
    if (vendorId) load()
  }, [vendorId])

  const fullName = vendor ? `${vendor.user?.firstName || ''} ${vendor.user?.lastName || ''}`.trim() : ''

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/shop" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour à la boutique
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          </div>
        ) : error ? (
          <div className="text-center py-24 text-red-500 text-sm">{error}</div>
        ) : !vendor ? (
          <div className="text-center py-24 text-muted-foreground text-sm">Vendeur introuvable.</div>
        ) : (
          <>
            {/* Header vendeur */}
            <motion.div className="mb-10" initial="hidden" animate="visible" variants={stagger}>
              <motion.div variants={fadeUp} className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-violet-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    {vendor.displayName}
                    <Badge variant="premium" className="text-[10px]">Vendeur marketplace</Badge>
                  </h1>
                  {fullName && (
                    <p className="text-xs text-muted-foreground">Compte : {fullName}</p>
                  )}
                </div>
              </motion.div>

              {vendor.bio && (
                <motion.p variants={fadeUp} className="text-sm text-muted-foreground max-w-3xl">
                  {vendor.bio}
                </motion.p>
              )}

              <motion.div variants={fadeUp} className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground mr-1">{vendor.totalRobots}</strong> robots publiés
                </span>
                <span>
                  <strong className="text-foreground mr-1">{vendor.totalSales}</strong> ventes
                </span>
                <span>
                  <strong className="text-foreground mr-1">${vendor.totalRevenue}</strong> de chiffre d'affaires
                </span>
              </motion.div>
            </motion.div>

            {/* Robots du vendeur */}
            {robots.length === 0 ? (
              <div className="text-center py-24">
                <Package className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-bold mb-2">Aucun robot disponible</h3>
                <p className="text-sm text-muted-foreground">Ce vendeur n'a pas encore de robots listés ou ils sont en cours de validation.</p>
              </div>
            ) : (
              <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" initial="hidden" animate="visible" variants={stagger}>
                {robots.map(robot => (
                  <motion.div key={robot._id} variants={fadeUp}>
                    <Card className="group hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5 h-full flex flex-col">
                      <CardContent className="p-5 flex flex-col h-full">
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
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{robot.description}</p>

                        <div className="flex items-center gap-1 mb-3 text-[11px]">
                          <Star className="h-3 w-3 text-yellow-400" />
                          <span className="font-semibold">{(robot.ratingAverage || 0).toFixed(1)}/5</span>
                          <span className="text-muted-foreground">({robot.ratingCount || 0})</span>
                        </div>

                        <div className="mt-auto pt-3 border-t">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <span className="text-xl font-bold">${robot.price}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                {robot.billingCycle === 'lifetime' ? '(à vie)' : robot.billingCycle === 'monthly' ? '/mois' : ''}
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild className="w-full mt-1">
                            <Link to={`/shop/robots/${robot.slug}`}>
                              Voir le robot
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
