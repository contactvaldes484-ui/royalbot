import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { BN, BnCard, BnButton, BnBadge, BinanceLogo } from '../binance/BinanceKit'
import {
  KeyRound, Copy, Check, X, Ban, ShieldCheck, ArrowRight, ChevronDown, ChevronUp,
  ExternalLink, FlaskConical, Lock, Eye, TrendingUp, Layers, BookOpen, Coins
} from 'lucide-react'

function BybitLogo({ size = 20 }) {
  return (
    <div
      className="inline-flex items-center justify-center font-black rounded select-none shrink-0"
      style={{
        width: size,
        height: size,
        background: '#F7A600',
        color: '#000',
        fontSize: Math.max(8, Math.floor(size * 0.42)),
        letterSpacing: '-0.5px',
        fontWeight: 900,
      }}
      title="Bybit"
    >
      BY
    </div>
  )
}

/**
 * Guide illustré « Connecter son compte Binance & Bybit » — diagrammes intégrés.
 */
export default function BinanceConnectGuide({ variant = 'full', defaultOpen = false, initialExchange = 'binance' }) {
  const [open, setOpen] = useState(defaultOpen)
  const [exchange, setExchange] = useState(initialExchange) // 'binance' | 'bybit'

  if (variant === 'compact') {
    return (
      <BnCard style={{ borderColor: `${BN.yellow}55` }}>
        <button onClick={() => setOpen(o => !o)} className="w-full p-4 flex items-center justify-between gap-3 text-left">
          <span className="flex items-center gap-3">
            <span className="shrink-0 rounded-xl p-2" style={{ background: `${BN.yellow}1A` }}>
              {exchange === 'binance' ? <BinanceLogo size={22} /> : <BybitLogo size={22} />}
            </span>
            <span>
              <span className="block text-sm font-semibold" style={{ color: BN.text }}>
                Guide étape par étape : Comment lier ton compte {exchange === 'binance' ? 'Binance' : 'Bybit'} ?
              </span>
              <span className="block text-xs" style={{ color: BN.sub }}>
                Tutoriel illustré en 6 étapes — clés API sécurisées, sans permission de retrait.
              </span>
            </span>
          </span>
          {open ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: BN.sub }} /> : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: BN.sub }} />}
        </button>
        {open && (
          <div className="px-4 pb-4 space-y-3">
            <ExchangeToggle exchange={exchange} setExchange={setExchange} />
            {exchange === 'binance' ? <BinanceSteps /> : <BybitSteps />}
          </div>
        )}
      </BnCard>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="shrink-0 rounded-2xl p-3" style={{ background: `${BN.yellow}1A` }}>
            {exchange === 'binance' ? <BinanceLogo size={36} /> : <BybitLogo size={36} />}
          </span>
          <div>
            <h2 className="text-xl font-bold" style={{ color: BN.text }}>
              Lier votre compte {exchange === 'binance' ? 'Binance' : 'Bybit'} à RoyalBot
            </h2>
            <p className="text-sm mt-1 max-w-2xl" style={{ color: BN.sub }}>
              Suivez ces étapes pour générer vos clés API et les relier à RoyalBot. Vos fonds restent en sécurité sur votre exchange — les robots peuvent uniquement <strong style={{ color: BN.text }}>lire</strong> et <strong style={{ color: BN.text }}>trader</strong>, jamais <strong style={{ color: BN.red }}>retirer</strong>.
            </p>
          </div>
        </div>

        <ExchangeToggle exchange={exchange} setExchange={setExchange} />
      </div>

      {exchange === 'binance' ? <BinanceSteps /> : <BybitSteps />}
    </div>
  )
}

function ExchangeToggle({ exchange, setExchange }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
      <button
        type="button"
        onClick={() => setExchange('binance')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
          exchange === 'binance' ? 'bg-yellow-500 text-black shadow' : 'text-slate-400 hover:text-white'
        }`}
      >
        <BinanceLogo size={16} /> Binance (Crypto)
      </button>
      <button
        type="button"
        onClick={() => setExchange('bybit')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
          exchange === 'bybit' ? 'bg-[#F7A600] text-black shadow' : 'text-slate-400 hover:text-white'
        }`}
      >
        <BybitLogo size={16} /> Bybit (Crypto + Forex)
      </button>
    </div>
  )
}

// ─── ÉTAPES BINANCE ──────────────────────────────────────────────
function BinanceSteps() {
  return (
    <div className="space-y-4 mt-1">
      <Step n={1} title="Ouvre la gestion des clés API sur Binance"
        desc={<>Connecte-toi sur Binance, puis va dans <b style={{ color: BN.text }}>Profil → Gestion des API</b> (ou « API Management »). Clique sur <b style={{ color: BN.text }}>Créer une API</b>.</>}
        diagram={<DiagramApiHome />} />

      <Step n={2} title="Choisis « System generated » et nomme ta clé"
        desc={<>Sélectionne <b style={{ color: BN.text }}>System generated</b>, donne un nom (ex. « RoyalBot »), puis valide avec ta vérification de sécurité (2FA / email / Passkey).</>}
        diagram={<DiagramCreateKey />} />

      <Step n={3} title="Règle les permissions (le point le plus important)"
        desc={<>Active <b style={{ color: BN.green }}>Lecture</b> et <b style={{ color: BN.green }}>Trading Spot &amp; Futures</b>. <b style={{ color: BN.red }}>Laisse « Retraits » DÉSACTIVÉ</b> — RoyalBot refuse toute clé qui autorise les retraits.</>}
        diagram={<DiagramPermissions />} />

      <Step n={4} title="Copie ta clé API et ta clé secrète"
        desc={<>Binance affiche la <b style={{ color: BN.text }}>API Key</b> et la <b style={{ color: BN.text }}>Secret Key</b> <u>une seule fois</u>. Copie-les immédiatement en lieu sûr.</>}
        diagram={<DiagramKeys />} />

      <Step n={5} title="Colle-les dans RoyalBot"
        desc={<>Va dans <b style={{ color: BN.text }}>Dashboard → Binance &amp; Bybit → Connecter un Compte</b>, colle tes deux clés, choisis le marché, puis clique sur <b style={{ color: BN.text }}>Connecter &amp; tester</b>.</>}
        diagram={<DiagramPasteUB exchange="Binance" />} />

      <Step n={6} title="Débutant ? Démarre en Testnet sans risque"
        desc={<>Pour t'entraîner sans argent réel, génère des clés Testnet sur <b style={{ color: BN.yellow }}>testnet.binance.vision</b> (Spot) ou <b style={{ color: BN.yellow }}>testnet.binancefuture.com</b> (Futures) et coche l'option <b style={{ color: BN.text }}>Testnet</b>. Dépôt réel conseillé : <b style={{ color: BN.text }}>10 USDT</b>.</>}
        diagram={<DiagramTestnet />} />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <a href="https://www.binance.com/en/my/settings/api-management" target="_blank" rel="noopener noreferrer">
          <BnButton variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Ouvrir la gestion API Binance</BnButton>
        </a>
        <Link to="/dashboard/binance"><BnButton variant="primary" size="sm"><KeyRound className="h-4 w-4" /> Connecter mon compte Binance</BnButton></Link>
      </div>

      <div className="p-3 rounded-lg text-xs flex items-start gap-2" style={{ background: `${BN.green}0D`, border: `1px solid ${BN.green}33`, color: BN.sub }}>
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" style={{ color: BN.green }} />
        <span>Tes clés sont chiffrées en <b style={{ color: BN.text }}>AES-256-GCM</b> et ne sont jamais affichées en clair. La permission de retrait étant absente, personne ne peut sortir tes fonds de Binance.</span>
      </div>
    </div>
  )
}

// ─── ÉTAPES BYBIT ────────────────────────────────────────────────
function BybitSteps() {
  return (
    <div className="space-y-4 mt-1">
      <Step n={1} title="Accède à la gestion API sur Bybit"
        desc={<>Connecte-toi à ton compte Bybit, clique sur l'icône de ton <b style={{ color: '#F7A600' }}>Profil → API</b> dans le menu déroulant, puis clique sur le bouton <b style={{ color: '#F7A600' }}>Créer une nouvelle clé</b>.</>}
        diagram={<DiagramBybitApiHome />} />

      <Step n={2} title="Choisis « Clés générées par le système »"
        desc={<>Sélectionne <b style={{ color: '#F7A600' }}>Clé API générée par le système</b>, puis coche l'option <b style={{ color: '#F7A600' }}>Transactions API</b> (connexion à une application tierce). Nomme ta clé (ex: « RoyalBot »).</>}
        diagram={<DiagramBybitCreateKey />} />

      <Step n={3} title="Configure les permissions de trading unifié"
        desc={<>Coche <b style={{ color: BN.green }}>Lecture-Écriture</b> sur <b style={{ color: BN.green }}>Ordres</b>, <b style={{ color: BN.green }}>Positions</b> et <b style={{ color: BN.green }}>Trade de Dérivés &amp; Spot (UTA)</b>. <b style={{ color: BN.red }}>Laisse « Transferts et Retraits » DÉSACTIVÉ</b>.</>}
        diagram={<DiagramBybitPermissions />} />

      <Step n={4} title="Copie l'API Key et l'API Secret Bybit"
        desc={<>Bybit affiche ta <b style={{ color: '#F7A600' }}>API Key</b> et ta <b style={{ color: '#F7A600' }}>API Secret</b>. Copie-les immédiatement, car la clé secrète ne sera plus jamais visible après la fermeture.</>}
        diagram={<DiagramBybitKeys />} />

      <Step n={5} title="Colle dans RoyalBot et valide"
        desc={<>Va dans <b style={{ color: BN.text }}>Dashboard → Binance &amp; Bybit → Connecter un Compte</b>, bascule sur l'onglet <b style={{ color: '#F7A600' }}>Bybit</b>, colle tes deux clés et clique sur <b style={{ color: BN.text }}>Connecter</b>.</>}
        diagram={<DiagramPasteUB exchange="Bybit" />} />

      <Step n={6} title="Profite du trading Crypto et Forex sur Bybit"
        desc={<>Bybit te permet d'exécuter des stratégies automatiques sur les cryptos (BTC, ETH, SOL) ainsi que sur les paires Forex offertes par le broker. Un mode Testnet gratuit est disponible sur <b style={{ color: '#F7A600' }}>testnet.bybit.com</b>.</>}
        diagram={<DiagramTestnetBybit />} />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <a href="https://www.bybit.com/app/user/api-management" target="_blank" rel="noopener noreferrer">
          <BnButton variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Ouvrir la gestion API Bybit</BnButton>
        </a>
        <Link to="/dashboard/binance"><BnButton variant="primary" size="sm"><KeyRound className="h-4 w-4" /> Connecter mon compte Bybit</BnButton></Link>
      </div>

      <div className="p-3 rounded-lg text-xs flex items-start gap-2" style={{ background: `${BN.green}0D`, border: `1px solid ${BN.green}33`, color: BN.sub }}>
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" style={{ color: BN.green }} />
        <span>Sécurité maximale : Clés API chiffrées en AES-256-GCM. RoyalBot n'a aucune permission de retrait sur votre compte Bybit.</span>
      </div>
    </div>
  )
}

function Step({ n, title, desc, diagram }) {
  return (
    <BnCard>
      <div className="p-4 sm:p-5 grid md:grid-cols-2 gap-4 items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: BN.yellow, color: BN.bg }}>{n}</span>
            <h3 className="font-semibold text-sm" style={{ color: BN.text }}>{title}</h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: BN.sub }}>{desc}</p>
        </div>
        <div>{diagram}</div>
      </div>
    </BnCard>
  )
}

function Frame({ title, isBybit, children }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BN.border}`, background: BN.surface2 }}>
      <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: BN.bg, borderBottom: `1px solid ${BN.border}` }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: BN.red }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: isBybit ? '#F7A600' : BN.yellow }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: BN.green }} />
        <span className="ml-2 flex items-center gap-1 text-[10px]" style={{ color: BN.sub }}>
          {isBybit ? <BybitLogo size={11} /> : <BinanceLogo size={11} />} {title}
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function Perm({ label, on, forbidden, icon: Icon }) {
  const color = forbidden ? BN.red : on ? BN.green : BN.sub
  return (
    <div className="flex items-center justify-between rounded-md px-2.5 py-1.5" style={{ background: BN.bg }}>
      <span className="flex items-center gap-1.5 text-xs" style={{ color: forbidden ? BN.red : BN.text }}>
        {Icon && <Icon className="h-3 w-3" style={{ color }} />}{label}
      </span>
      <span className="relative inline-flex items-center rounded-full transition-colors" style={{ width: 30, height: 16, background: on && !forbidden ? BN.green : `${BN.sub}55` }}>
        <span className="absolute rounded-full" style={{ width: 12, height: 12, top: 2, left: on && !forbidden ? 16 : 2, background: '#fff' }} />
        {forbidden && <Ban className="absolute h-3.5 w-3.5" style={{ color: BN.red, right: -18 }} />}
      </span>
    </div>
  )
}

function KeyField({ label, value, color = BN.text }) {
  return (
    <div>
      <p className="text-[9px] mb-0.5" style={{ color: BN.sub }}>{label}</p>
      <div className="flex items-center gap-1 rounded-md px-2 py-1.5" style={{ background: BN.bg, border: `1px solid ${BN.border}` }}>
        <span className="font-mono text-[10px] truncate flex-1" style={{ color }}>{value}</span>
        <Copy className="h-3 w-3 shrink-0" style={{ color: BN.yellow }} />
      </div>
    </div>
  )
}

// Diagrammes Binance
function DiagramApiHome() {
  return (
    <Frame title="binance.com · Gestion des API">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: BN.text }}>Gestion des API</span>
        <span className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: BN.yellow, color: BN.bg }}>+ Créer une API</span>
      </div>
      <div className="rounded-md px-2.5 py-3 text-center text-[10px]" style={{ background: BN.bg, color: BN.sub, border: `1px dashed ${BN.border}` }}>
        Aucune clé API active
      </div>
    </Frame>
  )
}

function DiagramCreateKey() {
  return (
    <Frame title="Créer une API">
      <div className="space-y-2">
        <div className="flex gap-2">
          <span className="flex-1 rounded-md px-2 py-1.5 text-[10px] flex items-center gap-1.5" style={{ background: BN.bg, color: BN.yellow, border: `1px solid ${BN.yellow}` }}>
            <Check className="h-3 w-3" /> System generated
          </span>
          <span className="flex-1 rounded-md px-2 py-1.5 text-[10px]" style={{ background: BN.bg, color: BN.sub, border: `1px solid ${BN.border}` }}>Self-generated</span>
        </div>
        <div className="rounded-md px-2 py-1.5 text-[10px]" style={{ background: BN.bg, color: BN.text, border: `1px solid ${BN.border}` }}>
          Label : <span style={{ color: BN.yellow }}>RoyalBot</span>
        </div>
        <div className="text-center rounded-md py-1.5 text-[10px] font-bold" style={{ background: BN.yellow, color: BN.bg }}>Suivant</div>
      </div>
    </Frame>
  )
}

function DiagramPermissions() {
  return (
    <Frame title="Restrictions API Binance">
      <div className="space-y-1.5">
        <Perm label="Activer la lecture" on icon={Eye} />
        <Perm label="Activer le Trading Spot & Margin" on icon={TrendingUp} />
        <Perm label="Activer les Futures" on icon={Layers} />
        <Perm label="Activer les retraits" forbidden icon={Lock} />
      </div>
      <p className="mt-2 text-[10px] flex items-center gap-1" style={{ color: BN.red }}>
        <Ban className="h-3 w-3" /> Ne jamais activer les retraits
      </p>
    </Frame>
  )
}

function DiagramKeys() {
  return (
    <Frame title="Clés API créées">
      <div className="space-y-2">
        <KeyField label="API Key" value="vmPUZE6mv9SD5V…kEuBLU9" color={BN.yellow} />
        <KeyField label="Secret Key" value="NhqPtmdSJYd…Kd0M4A" color={BN.green} />
        <p className="text-[9px] flex items-center gap-1" style={{ color: BN.sub }}>
          <Check className="h-3 w-3" style={{ color: BN.green }} /> Copie-les maintenant (le secret ne réapparaît pas)
        </p>
      </div>
    </Frame>
  )
}

function DiagramPasteUB({ exchange }) {
  return (
    <Frame title={`RoyalBot · Connecter ${exchange}`}>
      <div className="space-y-2">
        <KeyField label="Clé API (API Key)" value="vmPUZE6mv9SD5V…" color={BN.yellow} />
        <KeyField label="Clé secrète (API Secret)" value="••••••••••••••••" color={BN.sub} />
        <div className="text-center rounded-md py-1.5 text-[10px] font-bold flex items-center justify-center gap-1" style={{ background: BN.green, color: BN.bg }}>
          <ShieldCheck className="h-3 w-3" /> Connecter &amp; tester
        </div>
      </div>
    </Frame>
  )
}

function DiagramTestnet() {
  return (
    <Frame title="Testnet vs Live">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md p-2 text-center" style={{ background: BN.bg, border: `2px solid ${BN.yellow}` }}>
          <FlaskConical className="h-4 w-4 mx-auto mb-1" style={{ color: BN.yellow }} />
          <p className="text-[10px] font-bold" style={{ color: BN.yellow }}>Testnet</p>
          <p className="text-[9px]" style={{ color: BN.sub }}>argent fictif</p>
        </div>
        <div className="rounded-md p-2 text-center" style={{ background: BN.bg, border: `1px solid ${BN.border}` }}>
          <TrendingUp className="h-4 w-4 mx-auto mb-1" style={{ color: BN.green }} />
          <p className="text-[10px] font-bold" style={{ color: BN.green }}>Live</p>
          <p className="text-[9px]" style={{ color: BN.sub }}>dès 10 USDT</p>
        </div>
      </div>
    </Frame>
  )
}

// Diagrammes Bybit
function DiagramBybitApiHome() {
  return (
    <Frame title="bybit.com · Gestion des clés API" isBybit>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: BN.text }}>Gestion API</span>
        <span className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: '#F7A600', color: '#000' }}>+ Créer une nouvelle clé</span>
      </div>
      <div className="rounded-md px-2.5 py-3 text-center text-[10px]" style={{ background: BN.bg, color: BN.sub, border: `1px dashed ${BN.border}` }}>
        Aucune clé API Bybit liée
      </div>
    </Frame>
  )
}

function DiagramBybitCreateKey() {
  return (
    <Frame title="Créer une clé API Bybit" isBybit>
      <div className="space-y-2">
        <div className="rounded-md p-2 text-[10px] space-y-1" style={{ background: BN.bg, border: '1px solid #F7A600' }}>
          <div className="font-bold text-[#F7A600]">Transactions API (Application tierce)</div>
          <div className="text-[9px]" style={{ color: BN.sub }}>Nom de l'API : <span style={{ color: '#fff' }}>RoyalBot</span></div>
        </div>
        <div className="text-center rounded-md py-1.5 text-[10px] font-bold" style={{ background: '#F7A600', color: '#000' }}>Confirmer</div>
      </div>
    </Frame>
  )
}

function DiagramBybitPermissions() {
  return (
    <Frame title="Permissions Bybit (UTA)" isBybit>
      <div className="space-y-1.5">
        <Perm label="Compte Unifié (Trade Spot & Dérivés)" on icon={TrendingUp} />
        <Perm label="Ordres & Positions (Lecture-Écriture)" on icon={Layers} />
        <Perm label="Transférer des actifs / Retraits" forbidden icon={Lock} />
      </div>
      <p className="mt-2 text-[10px] flex items-center gap-1" style={{ color: BN.red }}>
        <Ban className="h-3 w-3" /> Laisser "Retraits d'actifs" désactivé
      </p>
    </Frame>
  )
}

function DiagramBybitKeys() {
  return (
    <Frame title="Clés Bybit générées" isBybit>
      <div className="space-y-2">
        <KeyField label="API Key" value="bybit_key_9A8F…772B" color="#F7A600" />
        <KeyField label="API Secret" value="bybit_secret_••••••••••••" color={BN.green} />
        <p className="text-[9px] flex items-center gap-1" style={{ color: BN.sub }}>
          <Check className="h-3 w-3" style={{ color: BN.green }} /> Secret affiché une seule fois
        </p>
      </div>
    </Frame>
  )
}

function DiagramTestnetBybit() {
  return (
    <Frame title="Bybit Testnet & Marchés" isBybit>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 rounded bg-slate-900 border border-amber-500/40">
          <p className="text-[10px] font-bold text-[#F7A600]">Crypto &amp; Forex</p>
          <p className="text-[9px]" style={{ color: BN.sub }}>Marché V5 Unifié</p>
        </div>
        <div className="p-2 rounded bg-slate-900 border border-slate-700">
          <p className="text-[10px] font-bold text-white">testnet.bybit.com</p>
          <p className="text-[9px]" style={{ color: BN.sub }}>Simulation sans risque</p>
        </div>
      </div>
    </Frame>
  )
}

/**
 * Guide rapide d'utilisation des robots pour le Dashboard Abonnements.
 */
export function PlanRobotInstructions() {
  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Comment activer et utiliser vos robots ?</h3>
          <p className="text-xs text-muted-foreground">3 étapes simples pour lancer le trading automatisé sur votre compte.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-400 font-bold text-xs flex items-center justify-center">1</span>
            <h4 className="text-xs font-bold text-foreground">Lier votre compte</h4>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Connectez votre compte <strong>Binance</strong>, <strong>Bybit</strong> ou <strong>Deriv</strong> avec vos clés API sécurisées (sans permission de retrait).
          </p>
          <div className="pt-1">
            <Link to="/dashboard/guide" className="text-[11px] text-violet-400 hover:underline inline-flex items-center gap-1 font-semibold">
              Guide de liaison <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">2</span>
            <h4 className="text-xs font-bold text-foreground">Choisir votre robot</h4>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Sélectionnez la stratégie souhaitée dans le catalogue selon votre plan (Spot, Futures, ou Volatilité Deriv).
          </p>
          <div className="pt-1">
            <Link to="/dashboard/bots" className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold">
              Catalogue des robots <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">3</span>
            <h4 className="text-xs font-bold text-foreground">Lancer le trading</h4>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Définissez votre capital, Stop Loss et Take Profit, puis activez le robot en 1 clic pour trader 24/7.
          </p>
          <div className="pt-1">
            <Link to="/dashboard/trades" className="text-[11px] text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold">
              Suivi des trades <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
