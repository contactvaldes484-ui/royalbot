import React from 'react'
import { Link } from 'react-router-dom'
import { Bot, Github, Twitter, MessageCircle } from 'lucide-react'
import { BinanceLogo } from '../binance/BinanceKit'
import useStore from '../../store/useStore'

export default function Footer() {
  const { platformSettings } = useStore()
  const pName = platformSettings?.platformName || 'RoyalBot'
  const pLogo = platformSettings?.logoUrl
  const pTagline = platformSettings?.tagline || 'Plateforme SaaS de robots de trading automatisés sur Deriv, Binance et Bybit.'
  const pCopyright = platformSettings?.copyrightName || pName
  const pFooterText = platformSettings?.footerText || 'Le trading comporte des risques. Les performances passées ne garantissent pas les résultats futurs.'

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {pLogo ? (
                <img src={pLogo} alt={pName} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FCD535]/10">
                  <BinanceLogo size={22} />
                </div>
              )}
              <span className="text-xl font-bold gradient-text">{pName}</span>
            </div>
            <p className="text-sm text-muted-foreground">{pTagline}</p>
            <div className="flex gap-3">
              {platformSettings?.whatsappLink && <a href={platformSettings.whatsappLink} target="_blank" rel="noopener noreferrer" title="Groupe WhatsApp" className="p-2 rounded-md hover:bg-emerald-500/10 text-emerald-500"><MessageCircle className="h-4 w-4" /></a>}
              {platformSettings?.telegramLink && <a href={platformSettings.telegramLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover:bg-accent"><MessageCircle className="h-4 w-4" /></a>}
              {platformSettings?.twitterLink && <a href={platformSettings.twitterLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover:bg-accent"><Twitter className="h-4 w-4" /></a>}
              {!platformSettings?.twitterLink && !platformSettings?.telegramLink && !platformSettings?.whatsappLink && (
                <>
                  <a href="#" className="p-2 rounded-md hover:bg-accent"><Twitter className="h-4 w-4" /></a>
                  <a href="#" className="p-2 rounded-md hover:bg-accent"><MessageCircle className="h-4 w-4" /></a>
                </>
              )}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Produit</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/robots" className="hover:text-foreground">Robots</Link></li>
              <li><Link to="/markets" className="hover:text-foreground">Marchés</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground">Tarifs</Link></li>
              <li><Link to="/leaderboard" className="hover:text-foreground">Leaderboard</Link></li>
              <li><Link to="/blog" className="hover:text-foreground">Blog</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><a href="#" className="hover:text-foreground">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground">Communauté</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Conditions d'utilisation</a></li>
              <li><a href="#" className="hover:text-foreground">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:text-foreground">Mentions légales</a></li>
              <li><a href="#" className="hover:text-foreground">Avertissement risques</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {pCopyright}. Tous droits réservés.</p>
          <p className="mt-2 text-xs">{pFooterText}</p>
        </div>
      </div>
    </footer>
  )
}
