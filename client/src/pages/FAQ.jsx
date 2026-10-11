import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import SEO from '../components/SEO'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

const faqs = [
  {
    category: 'Général',
    items: [
      { q: "Qu'est-ce que RoyalBot ?", a: "RoyalBot est une plateforme SaaS de robots de trading automatisés multi-marchés compatible avec Deriv, Binance et Bybit. Nos robots exécutent automatiquement des trades sur les cryptos, le Forex et les indices synthétiques avec des stratégies algorithmiques éprouvées." },
      { q: "Est-ce que le trading est garanti profitable ?", a: "Non. Le trading comporte toujours des risques. Nos robots visent la régularité long terme avec des stratégies de risk management strictes, mais aucun profit n'est garanti. Tradez de manière responsable." },
      { q: "Comment commencer ?", a: "1. Créez un compte gratuit. 2. Connectez votre compte Binance via vos clés API. 3. Choisissez un robot. 4. Configurez vos paramètres. 5. Lancez le trading automatique !" },
    ]
  },
  {
    category: 'Robots',
    items: [
      { q: "Quelle est la différence entre les robots ?", a: "Le robot gratuit est un scalper crypto (BTC/ETH). Les robots Starter/Pro ajoutent le multi-paires et le SMC. Les robots VIP/Institutionnels offrent l'IA adaptative multi-timeframe, le hedging et le copy trading sur Spot & Futures." },
      { q: "Comment fonctionne la stratégie des robots ?", a: "Les robots analysent les indicateurs techniques (EMA, RSI, MACD, Bollinger), détectent des patterns et appliquent des stratégies adaptatives avec stop-loss dynamique et pause automatique en drawdown." },
      { q: "Puis-je configurer les paramètres du robot ?", a: "Oui ! Vous pouvez ajuster la mise initiale, le stop loss, le take profit, le nombre max de trades, la martingale et bien plus depuis votre dashboard." },
    ]
  },
  {
    category: 'Accès & Tarifs',
    items: [
      { q: "Les robots sont-ils vraiment gratuits ?", a: "Le robot gratuit est accessible sans paiement. Les robots Pro, VIP et Institutionnels nécessitent un abonnement. Consultez la page Tarifs pour plus de détails." },
      { q: "Y a-t-il des commissions sur les gains ?", a: "Non, aucune commission n'est prélevée sur vos gains ou retraits. Seul l'abonnement mensuel ou annuel s'applique selon votre plan." },
      { q: "Comment accéder aux robots ?", a: "Créez un compte sur RoyalBot, connectez votre compte Binance, Bybit ou Deriv, et lancez vos robots en quelques clics. C'est tout !" },
    ]
  },
  {
    category: 'Sécurité',
    items: [
      { q: "Mes clés API Binance sont-elles sécurisées ?", a: "Oui. Vos clés API sont chiffrées en AES-256-GCM avant stockage et jamais affichées en clair. Activez uniquement les permissions Lecture + Trading : la permission de retrait doit rester désactivée, le robot ne peut donc jamais retirer vos fonds." },
      { q: "Proposez-vous la 2FA ?", a: "Oui, l'authentification à deux facteurs (2FA) est disponible et recommandée pour sécuriser votre compte." },
      { q: "Que se passe-t-il si le robot perd trop ?", a: "Nos robots intègrent un système anti-loss avec pause automatique en cas de drawdown excessif, stop loss par session, et limites de trades. Le robot s'arrête automatiquement pour protéger votre capital." },
    ]
  }
]

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b last:border-b-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-4 text-left text-sm font-medium hover:text-primary transition-colors">
        {question}
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed">{answer}</div>
      )}
    </div>
  )
}

export default function FAQ() {
  return (
    <div className="min-h-screen py-20">
      <SEO title="FAQ" path="/faq" description="Questions fréquentes sur UltimateBot : robots de trading crypto sur Binance, sécurité des clés API, fonctionnement, performances." />
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div className="text-center mb-16" initial="hidden" animate="visible" variants={stagger}>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold mb-4">
            Questions <span className="gradient-text">Fréquentes</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-muted-foreground">
            Tout ce que vous devez savoir sur UltimateBot.
          </motion.p>
        </motion.div>

        <motion.div className="space-y-8" initial="hidden" animate="visible" variants={stagger}>
          {faqs.map((section, i) => (
            <motion.div key={i} variants={fadeUp}>
              <h2 className="text-lg font-semibold mb-4 text-primary">{section.category}</h2>
              <div className="border rounded-lg px-4">
                {section.items.map((item, j) => (
                  <AccordionItem key={j} question={item.q} answer={item.a} />
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
