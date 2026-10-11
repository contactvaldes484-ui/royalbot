const express = require('express');
const BlogPost = require('../models/BlogPost');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get published posts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag } = req.query;
    const query = { isPublished: true };
    if (category) query.category = category;
    if (tag) query.tags = tag;

    const posts = await BlogPost.find(query)
      .populate('author', 'firstName lastName avatar')
      .sort({ publishedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BlogPost.countDocuments(query);
    res.json({ posts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get post by slug
router.get('/:slug', async (req, res) => {
  try {
    const post = await BlogPost.findOneAndUpdate(
      { slug: req.params.slug, isPublished: true },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'firstName lastName avatar');
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Create post
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const post = await BlogPost.create({ ...req.body, author: req.user._id });
    res.status(201).json({ post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update post
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete post
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await BlogPost.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed blog posts
router.post('/seed', async (req, res) => {
  try {
    const count = await BlogPost.countDocuments();
    if (count > 0) return res.json({ message: 'Blog posts already seeded.' });

    const posts = [
      {
        title: 'Introduction au Trading Automatisé MT4/MT5',
        slug: 'introduction-trading-automatise-mt5',
        content: `Le trading automatisé révolutionne la manière dont les traders interagissent avec les marchés financiers. Avec UltimateBot, vous pouvez automatiser vos stratégies de trading sur MT4 et MT5.\n\n## Qu'est-ce que le trading automatisé ?\n\nLe trading automatisé utilise des algorithmes pour exécuter des transactions selon des critères prédéfinis. Cela élimine les émotions du trading et permet une exécution plus rapide.\n\n## Les avantages\n\n- Exécution 24/7\n- Pas d'émotions\n- Backtesting possible\n- Gestion de risque automatique\n\n## Comment commencer ?\n\n1. Créez votre compte UltimateBot\n2. Connectez votre compte MT4/MT5\n3. Choisissez votre robot\n4. Configurez vos paramètres\n5. Lancez le trading !`,
        excerpt: 'Découvrez comment le trading automatisé peut transformer votre expérience sur MT4/MT5.',
        category: 'tutorial',
        tags: ['débutant', 'trading', 'automatisé'],
        isPublished: true,
        publishedAt: new Date()
      },
      {
        title: 'Stratégies de Scalping sur MT5 avec l\'IA',
        slug: 'strategies-scalping-mt5-ia',
        content: `Le scalping est une stratégie populaire sur les marchés Forex. Nos robots IA utilisent des indicateurs techniques avancés pour identifier les meilleures opportunités.\n\n## Indicateurs utilisés\n\n### EMA (Exponential Moving Average)\nIdentifie la tendance à court terme.\n\n### RSI (Relative Strength Index)\nDétecte les zones de surachat/survente.\n\n### MACD\nConfirme les signaux d'entrée et sortie.\n\n## Marchés recommandés\n\nXAUUSD, EURUSD, GBPUSD sont les paires les plus adaptées au scalping automatisé.`,
        excerpt: 'Guide des stratégies de scalping automatisé sur MT5 avec intelligence artificielle.',
        category: 'strategy',
        tags: ['scalping', 'MT5', 'stratégie', 'IA'],
        isPublished: true,
        publishedAt: new Date()
      },
      {
        title: 'Gestion du Risque en Trading Automatisé',
        slug: 'gestion-risque-trading-automatise',
        content: `La gestion du risque est la clé du succès en trading. Nos robots intègrent plusieurs mécanismes de protection.\n\n## Stop Loss\nLimitez vos pertes par session.\n\n## Take Profit\nSécurisez vos gains automatiquement.\n\n## Drawdown Protection\nPause automatique si le drawdown dépasse un seuil.\n\n## Martingale Contrôlée\nUtilisation prudente avec limites strictes.`,
        excerpt: 'Apprenez les meilleures pratiques de gestion du risque pour le trading automatisé.',
        category: 'strategy',
        tags: ['risque', 'gestion', 'protection'],
        isPublished: true,
        publishedAt: new Date()
      }
    ];

    await BlogPost.insertMany(posts);
    res.json({ message: 'Blog posts seeded.', count: posts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
