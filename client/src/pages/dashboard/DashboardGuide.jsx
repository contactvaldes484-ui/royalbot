import React, { useState } from 'react'
import useStore from '../../store/useStore'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import {
  BookOpen, ChevronDown, ChevronRight, Bot, Monitor, CreditCard,
  Smartphone, Globe, Shield, Zap, Settings, ArrowRight, CheckCircle2,
  AlertTriangle, HelpCircle, UserPlus, LogIn, Wallet, BarChart3,
  PlayCircle, StopCircle, TrendingUp, Lock, Eye, RefreshCw, MessageCircle
} from 'lucide-react'
import BinanceConnectGuide from '../../components/guides/BinanceConnectGuide'

const sections = [
  {
    id: 'getting-started',
    icon: UserPlus,
    title: 'Premiers pas',
    color: 'from-blue-500 to-cyan-500',
    steps: [
      {
        title: 'Créer votre compte',
        content: `Rendez-vous sur la page d'inscription et remplissez le formulaire avec votre nom, prénom, email et un mot de passe sécurisé. Vous recevrez un email de confirmation. Cliquez sur le lien pour activer votre compte.`,
        tip: 'Utilisez un mot de passe fort avec des majuscules, chiffres et caractères spéciaux.',
      },
      {
        title: 'Se connecter',
        content: `Allez sur la page de connexion et entrez votre email et mot de passe. Si vous avez activé l'authentification à deux facteurs (2FA), vous devrez également entrer le code généré par votre application d'authentification (Google Authenticator, Authy, etc.).`,
        tip: 'Activez le 2FA dans les paramètres pour sécuriser votre compte.',
      },
      {
        title: 'Découvrir le tableau de bord',
        content: `Après connexion, vous arrivez sur votre tableau de bord. Vous y trouverez : un résumé de votre compte, vos robots actifs, votre historique de trades, et vos statistiques de performance. Le menu à gauche (ou en bas sur mobile) vous permet de naviguer entre les différentes sections.`,
      },
    ],
  },
  {
    id: 'connect-binance',
    icon: Monitor,
    title: 'Connecter votre compte Binance',
    color: 'from-blue-500 to-indigo-500',
    steps: [
      {
        title: 'Générer vos clés API Binance',
        content: `1. Connectez-vous à votre compte Binance (ou créez-en un sur binance.com)\n2. Allez dans "Gestion API" depuis le menu de votre profil\n3. Créez une nouvelle clé API et nommez-la (ex: "RoyalBot")\n4. Activez UNIQUEMENT les permissions "Lecture" et "Spot & Margin Trading" (et "Futures" si vous tradez les Futures)\n5. NE JAMAIS activer la permission "Retrait" (Withdraw)\n6. Notez votre API Key et votre Secret Key (le secret ne s'affiche qu'une seule fois)`,
        tip: 'Pour tester sans risque, générez des clés sur le testnet : testnet.binance.vision (Spot) et testnet.binancefuture.com (Futures).',
      },
      {
        title: 'Connecter sur la plateforme',
        content: `1. Allez dans la section "Binance" de votre tableau de bord\n2. Cliquez sur "Connecter un compte"\n3. Remplissez : un libellé, votre API Key, votre Secret Key, et le marché (Spot, Futures ou les deux)\n4. Cliquez sur "Connecter" — vos clés sont chiffrées en AES-256-GCM\n5. La plateforme teste automatiquement la connexion et vérifie que le retrait est bien désactivé\n6. Votre solde Binance s'affichera`,
        warning: 'Si la permission de retrait est activée sur vos clés, la connexion sera refusée pour votre sécurité.',
      },
      {
        title: 'Depuis le téléphone',
        content: `Vous pouvez connecter votre compte Binance directement depuis votre téléphone. Générez vos clés API dans l'app Binance ou sur le site, accédez à RoyalBot depuis votre navigateur mobile, allez dans Binance, et collez vos clés exactement comme sur ordinateur. Aucune application supplémentaire n'est nécessaire.`,
      },
    ],
  },
  {
    id: 'start-robots',
    icon: Bot,
    title: 'Démarrer les robots de trading',
    color: 'from-green-500 to-emerald-500',
    steps: [
      {
        title: 'Choisir un robot',
        content: `La plateforme propose plusieurs robots adaptés à différents niveaux :\n\n• Starter / PulseScalper : Idéal pour débuter, risque faible\n• Pro / VelocityFX : Stratégies avancées, meilleur rendement\n• Elite / ApexAlpha : Performance maximale, toutes stratégies\n\nChaque robot a ses propres caractéristiques et niveaux de risque.`,
      },
      {
        title: 'Configurer les paramètres',
        content: `Avant de lancer un robot, vous pouvez ajuster :\n\n• Risque par trade : % du capital risqué sur chaque position (ex: 1%)\n• Stop Loss : Perte maximale avant clôture automatique de la position (obligatoire)\n• Take Profit : Gain cible avant clôture\n• Paires : les cryptos à trader (ex: BTCUSDT, ETHUSDT)\n• Levier : pour le marché Futures uniquement (ex: x5, à utiliser avec prudence)`,
        warning: 'Commencez toujours avec des mises faibles. Ne risquez jamais plus que ce que vous pouvez vous permettre de perdre.',
      },
      {
        title: 'Lancer le robot',
        content: `1. Choisissez votre robot dans la liste\n2. Vérifiez les paramètres\n3. Cliquez sur "Démarrer"\n4. Le robot commence à trader automatiquement\n5. Vous pouvez suivre les trades en temps réel dans votre tableau de bord`,
      },
      {
        title: 'Arrêter le robot',
        content: `Vous pouvez arrêter un robot à tout moment :\n\n1. Allez dans "Binance"\n2. Trouvez la session active\n3. Cliquez sur "Arrêter"\n\nLe robot fermera les positions ouvertes et s'arrêtera proprement. Vos gains/pertes seront enregistrés.`,
      },
    ],
  },
  {
    id: 'subscription',
    icon: CreditCard,
    title: 'Abonnements et paiements',
    color: 'from-amber-500 to-orange-500',
    steps: [
      {
        title: 'Plans disponibles',
        content: `• Free : Accès limité, robot Starter uniquement\n• Premium : Tous les robots Pro, fonctionnalités avancées\n• VIP : Accès complet à tous les robots Elite, support prioritaire\n\nLes prix sont affichés sur la page Tarifs.`,
      },
      {
        title: 'Méthodes de paiement',
        content: `Nous acceptons :\n\n• Carte bancaire (via Stripe)\n• USDT Tron (TRC-20) : Envoyez le montant exact en USDT à l'adresse affichée\n• BinancePay : Paiement instantané via l'app Binance\n\nAprès paiement crypto, contactez l'administrateur pour activer votre abonnement, ou attendez la confirmation automatique.`,
        tip: 'Pour les paiements crypto, gardez le hash de transaction comme preuve de paiement.',
      },
      {
        title: 'Activation par l\'administrateur',
        content: `Si vous payez hors de la plateforme (virement, espèces, Mobile Money, etc.), contactez l'administrateur. Il pourra activer votre abonnement et vos robots manuellement depuis son tableau de bord.`,
      },
    ],
  },
  {
    id: 'safety',
    icon: Shield,
    title: 'Sécurité et bonnes pratiques',
    color: 'from-red-500 to-pink-500',
    steps: [
      {
        title: 'Protéger votre compte',
        content: `• Activez l'authentification à deux facteurs (2FA)\n• Utilisez un mot de passe unique et fort\n• Ne partagez jamais vos clés API Binance, et n'activez jamais la permission de retrait\n• Déconnectez-vous après utilisation sur un appareil partagé`,
      },
      {
        title: 'Gestion du risque',
        content: `• Ne tradez jamais avec de l'argent que vous ne pouvez pas perdre\n• Commencez toujours en mode démo pour tester\n• Utilisez des Stop Loss pour limiter les pertes\n• Diversifiez : ne mettez pas tout sur un seul robot\n• Surveillez régulièrement les performances de vos robots`,
        warning: 'Le trading comporte des risques. Les performances passées ne garantissent pas les résultats futurs.',
      },
      {
        title: 'Retraits',
        content: `Pour retirer vos gains :\n\n1. Allez dans "Retraits" dans votre tableau de bord\n2. Entrez le montant et la méthode de retrait\n3. Soumettez votre demande\n4. L'administrateur traitera votre retrait dans les 24-48h\n\nUne commission peut s'appliquer selon votre plan.`,
      },
    ],
  },
  {
    id: 'faq',
    icon: HelpCircle,
    title: 'Questions fréquentes',
    color: 'from-cyan-500 to-teal-500',
    steps: [
      {
        title: 'Le robot trade-t-il 24h/24 ?',
        content: `Le robot trade tant qu'il est activé. Le marché crypto sur Binance est ouvert 24h/24 et 7j/7, donc le robot peut prendre des positions à tout moment, week-end inclus.`,
      },
      {
        title: 'Que se passe-t-il si je perds ma connexion internet ?',
        content: `Les robots fonctionnent sur nos serveurs, pas sur votre appareil. Si vous perdez votre connexion internet, les robots continuent de trader normalement. Vous pouvez vous reconnecter à tout moment pour voir les résultats.`,
      },
      {
        title: 'Puis-je utiliser plusieurs robots en même temps ?',
        content: `Oui, selon votre plan. Les utilisateurs Premium et VIP peuvent utiliser plusieurs robots simultanément sur différents actifs. Assurez-vous d'avoir suffisamment de solde pour couvrir toutes les positions.`,
      },
      {
        title: 'Comment contacter le support ?',
        content: `Utilisez la page Contact du site ou écrivez directement à l'administrateur. Nous répondons généralement dans les 24 heures.`,
      },
    ],
  },
]

export default function DashboardGuide() {
  const { platformSettings } = useStore()
  const [openSection, setOpenSection] = useState('getting-started')
  const [openStep, setOpenStep] = useState(null)

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id)
    setOpenStep(null)
  }

  const toggleStep = (key) => {
    setOpenStep(openStep === key ? null : key)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Guide d'utilisation</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Apprenez comment utiliser la plateforme RoyalBot pas à pas. Ce guide couvre tout ce dont vous avez besoin pour démarrer, 
          connecter vos comptes et lancer vos robots de trading, même depuis votre téléphone.
        </p>
      </div>

      {/* Quick overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: UserPlus, label: 'Inscription', time: '2 min', color: 'text-blue-500' },
          { icon: Globe, label: 'Connexion Binance', time: '3 min', color: 'text-violet-500' },
          { icon: Bot, label: 'Lancer un robot', time: '1 min', color: 'text-green-500' },
          { icon: Smartphone, label: 'Mobile', time: 'Compatible', color: 'text-amber-500' },
        ].map((item, i) => (
          <Card key={i} className="border-transparent hover:border-violet-500/20 transition-all">
            <CardContent className="p-4 text-center">
              <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.color}`} />
              <p className="text-xs font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.time}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Guide illustré « Connecter Binance » (diagrammes) */}
      <div className="rounded-xl p-4 sm:p-5" style={{ background: '#0B0E11' }}>
        <BinanceConnectGuide variant="full" />
      </div>

      {/* Sections accordion */}
      <div className="space-y-3">
        {sections.map((section) => (
          <Card key={section.id} className={`overflow-hidden transition-all ${openSection === section.id ? 'shadow-lg border-violet-500/20' : ''}`}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/30 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg shrink-0`}>
                <section.icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold">{section.title}</h2>
                <p className="text-xs text-muted-foreground">{section.steps.length} étape(s)</p>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openSection === section.id ? 'rotate-180' : ''}`} />
            </button>

            {openSection === section.id && (
              <div className="px-5 pb-5 space-y-3">
                {section.steps.map((step, i) => {
                  const stepKey = `${section.id}-${i}`
                  const isOpen = openStep === stepKey
                  return (
                    <div key={i} className={`rounded-xl border transition-all ${isOpen ? 'bg-muted/20 border-violet-500/20' : 'border-border'}`}>
                      <button
                        onClick={() => toggleStep(stepKey)}
                        className="w-full flex items-center gap-3 p-4 text-left"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isOpen
                            ? 'bg-violet-500 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </div>
                        <span className={`flex-1 text-sm ${isOpen ? 'font-semibold' : 'font-medium'}`}>{step.title}</span>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pl-14 space-y-3">
                          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                            {step.content}
                          </div>
                          {step.tip && (
                            <div className="flex gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                              <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-blue-500">{step.tip}</p>
                            </div>
                          )}
                          {step.warning && (
                            <div className="flex gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-500">{step.warning}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Bottom help & WhatsApp Assistance */}
      <Card className="border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-violet-500/5 to-indigo-500/5">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">Besoin d'aide ou d'assistance en direct ?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Rejoignez notre groupe WhatsApp officiel pour échanger avec notre équipe d'assistance et les traders de la communauté RoyalBot.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <a
              href={platformSettings?.whatsappLink || 'https://chat.whatsapp.com/'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4" />
              Rejoindre le Groupe WhatsApp
            </a>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border hover:bg-muted text-sm font-medium transition-colors"
            >
              Contacter le support <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
