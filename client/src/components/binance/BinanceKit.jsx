import React, { useState, useEffect, useRef } from 'react'

// ── Palette officielle Binance ──────────────────────────────────
export const BN = {
  bg: '#0B0E11',        // fond de page
  surface: '#181A20',   // cartes
  surface2: '#1E2329',  // éléments surélevés / hover
  border: '#2B3139',
  text: '#EAECEF',      // texte principal
  sub: '#848E9C',       // texte secondaire
  yellow: '#FCD535',    // jaune Binance
  yellowDark: '#F0B90B',
  green: '#0ECB81',     // hausse / achat
  red: '#F6465D',       // baisse / vente
}

// Paires crypto mises en avant (le robot trade "les matières liées à Binance")
export const FEATURED_PAIRS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT']

// ── Logo Binance (losange) ──────────────────────────────────────
export function BinanceLogo({ size = 28, className = '' }) {
  return (
    <svg viewBox="0 0 126.61 126.61" width={size} height={size} className={className} aria-label="Binance">
      <path fill={BN.yellow} d="M38.73 53.2 63.3 28.62l24.59 24.59 14.3-14.3L63.3 0 24.43 38.9l14.3 14.3zM0 63.3l14.3-14.31L28.6 63.3l-14.3 14.3zm38.73 10.11L63.3 98l24.59-24.59 14.31 14.29-.01.01L63.3 126.61 24.43 87.72l-.02-.02 14.32-14.29zM98 63.31l14.3-14.3 14.31 14.3-14.31 14.31zM77.81 63.3 63.3 48.78 52.57 59.51l-1.23 1.24-2.54 2.54-.02.02.02.02L63.3 77.83l14.51-14.52z" />
    </svg>
  )
}

// ── Wrapper page (fond Binance) ─────────────────────────────────
export function BnPage({ children, className = '' }) {
  return (
    <div className={`min-h-full -m-4 sm:-m-6 p-4 sm:p-6 ${className}`} style={{ background: BN.bg, color: BN.text }}>
      {children}
    </div>
  )
}

// ── Carte ───────────────────────────────────────────────────────
export function BnCard({ children, className = '', hover = false, style, ...rest }) {
  return (
    <div {...rest}
      className={`rounded-xl border transition-colors ${hover ? 'cursor-pointer' : ''} ${className}`}
      style={{ background: BN.surface, borderColor: BN.border, ...style }}
      onMouseEnter={hover ? (e) => (e.currentTarget.style.borderColor = BN.yellow) : undefined}
      onMouseLeave={hover ? (e) => (e.currentTarget.style.borderColor = BN.border) : undefined}
    >
      {children}
    </div>
  )
}

// ── Bouton ──────────────────────────────────────────────────────
export function BnButton({ children, variant = 'primary', size = 'md', className = '', style, ...rest }) {
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }
  const base = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${className}`
  const styles = {
    primary: { background: BN.yellow, color: '#0B0E11' },
    dark:    { background: BN.surface2, color: BN.text, border: `1px solid ${BN.border}` },
    outline: { background: 'transparent', color: BN.yellow, border: `1px solid ${BN.yellow}` },
    ghost:   { background: 'transparent', color: BN.sub },
    danger:  { background: 'transparent', color: BN.red, border: `1px solid ${BN.red}44` },
    success: { background: BN.green, color: '#0B0E11' },
  }
  return <button {...rest} className={base} style={{ ...styles[variant], ...style }}>{children}</button>
}

// ── Badge ───────────────────────────────────────────────────────
export function BnBadge({ children, color = BN.sub, bg, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${className}`}
      style={{ color, background: bg || `${color}1A` }}>
      {children}
    </span>
  )
}

// ── Onglets façon Binance (souligné jaune) ──────────────────────
export function BnTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: `1px solid ${BN.border}` }}>
      {tabs.map(t => {
        const on = active === t.id
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap -mb-px flex items-center gap-2 transition-colors"
            style={{ color: on ? BN.yellow : BN.sub, borderBottom: `2px solid ${on ? BN.yellow : 'transparent'}` }}>
            {t.icon && <t.icon className="h-4 w-4" />}
            {t.label}
            {t.count > 0 && (
              <span className="text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold"
                style={{ background: BN.green, color: '#0B0E11' }}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Ticker crypto live (prix réels Binance, prouve le "trading crypto") ──
export function CryptoTicker({ symbols = FEATURED_PAIRS, compact = false }) {
  const [data, setData] = useState({})
  const timer = useRef(null)

  useEffect(() => {
    let alive = true
    const fetchPrices = async () => {
      try {
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`
        const res = await fetch(url)
        if (!res.ok) return
        const arr = await res.json()
        if (!alive) return
        const map = {}
        for (const t of arr) map[t.symbol] = { price: +t.lastPrice, change: +t.priceChangePercent }
        setData(map)
      } catch { /* hors-ligne : on masque proprement */ }
    }
    fetchPrices()
    timer.current = setInterval(fetchPrices, 10_000)
    return () => { alive = false; clearInterval(timer.current) }
  }, [symbols.join(',')])

  const items = symbols.filter(s => data[s])
  if (!items.length) return null

  const fmt = (n) => n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : n >= 1 ? n.toFixed(2) : n.toFixed(4)

  return (
    <div className={`flex items-center gap-4 overflow-x-auto ${compact ? '' : 'rounded-xl border px-4 py-2.5'}`}
      style={compact ? {} : { background: BN.surface, borderColor: BN.border }}>
      {items.map(s => {
        const d = data[s]
        const up = d.change >= 0
        const base = s.replace('USDT', '')
        return (
          <div key={s} className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <span className="font-semibold text-sm" style={{ color: BN.text }}>{base}<span style={{ color: BN.sub }}>/USDT</span></span>
            <span className="font-mono text-sm" style={{ color: up ? BN.green : BN.red }}>${fmt(d.price)}</span>
            <span className="text-xs font-semibold" style={{ color: up ? BN.green : BN.red }}>
              {up ? '▲' : '▼'} {Math.abs(d.change).toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// helpers couleur P&L
export const pnlColor = (n) => (n > 0 ? BN.green : n < 0 ? BN.red : BN.sub)
