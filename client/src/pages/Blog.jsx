import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { blogAPI } from '../lib/api'
import { Calendar, Eye, ArrowRight, BookOpen } from 'lucide-react'
import { formatDate } from '../lib/utils'
import SEO from '../components/SEO'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

const categoryColors = {
  trading: 'default',
  strategy: 'premium',
  tutorial: 'success',
  news: 'warning',
  analysis: 'vip'
}

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data } = await blogAPI.getAll()
        setPosts(data.posts)
      } catch {
        // Use placeholder posts if API not available
        setPosts([
          {
            _id: '1', title: 'Introduction au Trading Crypto Automatisé sur Binance', slug: 'introduction-trading-automatise-binance',
            excerpt: 'Découvrez comment les robots peuvent automatiser votre trading crypto sur Binance (Spot & Futures).',
            category: 'tutorial', tags: ['débutant', 'trading'], publishedAt: new Date().toISOString(), views: 1250
          },
          {
            _id: '2', title: 'Comprendre le Scalping Crypto', slug: 'comprendre-scalping-crypto',
            excerpt: 'Guide complet du scalping sur les paires crypto majeures (BTC, ETH, BNB) sur Binance.',
            category: 'strategy', tags: ['digit', 'contrats'], publishedAt: new Date().toISOString(), views: 890
          },
          {
            _id: '3', title: 'Gestion du Risque en Trading Automatisé', slug: 'gestion-risque-trading-automatise',
            excerpt: 'Apprenez les meilleures pratiques de gestion du risque pour le trading automatisé.',
            category: 'strategy', tags: ['risque', 'gestion'], publishedAt: new Date().toISOString(), views: 720
          }
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  return (
    <div className="min-h-screen py-20">
      <SEO title="Blog" path="/blog" description="Articles, guides et analyses sur le trading crypto automatisé sur Binance (Spot & Futures). Stratégies, tutoriels et actualités." />
      <div className="container mx-auto px-4">
        <motion.div className="text-center mb-16" initial="hidden" animate="visible" variants={stagger}>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Blog</span> Trading
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Guides, stratégies et analyses pour améliorer votre trading crypto.
          </motion.p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-20 mb-4" />
                  <div className="h-6 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun article pour le moment</h3>
            <p className="text-muted-foreground">Les articles arrivent bientôt !</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
            initial="hidden" animate="visible" variants={stagger}
          >
            {posts.map((post, i) => (
              <motion.div key={post._id} variants={fadeUp}>
                <Card className="h-full hover:shadow-md transition-shadow group">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={categoryColors[post.category] || 'default'} className="capitalize">
                        {post.category}
                      </Badge>
                    </div>

                    <h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>

                    <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">
                      {post.excerpt || post.content?.substring(0, 150) + '...'}
                    </p>

                    {post.tags && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {post.tags.slice(0, 3).map((tag, j) => (
                          <span key={j} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">#{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {post.publishedAt ? formatDate(post.publishedAt) : 'Récent'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.views || 0}
                        </span>
                      </div>
                      <Link to={`/blog/${post.slug}`} className="flex items-center gap-1 text-primary hover:underline font-medium">
                        Lire <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
