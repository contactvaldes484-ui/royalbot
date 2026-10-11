import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import {
  TrendingUp, TrendingDown, Activity, BarChart3, Brain,
  Zap, ArrowUp, ArrowDown, Minus
} from 'lucide-react'

// ── Utility: compute indicators from tick array ──
function computeEMA(prices, period) {
  if (prices.length < period) return []
  const k = 2 / (period + 1)
  const ema = [prices.slice(0, period).reduce((a, b) => a + b, 0) / period]
  for (let i = period; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[ema.length - 1] * (1 - k))
  }
  return ema
}

function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) gains += diff
    else losses -= diff
  }
  const avgGain = gains / period
  const avgLoss = losses / period
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function computeDigitStats(prices) {
  if (prices.length < 10) return null
  const digitCounts = Array(10).fill(0)
  const lastDigits = prices.slice(-100).map(p => {
    const s = p.toFixed(2)
    return parseInt(s[s.length - 1], 10)
  })
  lastDigits.forEach(d => digitCounts[d]++)
  const total = lastDigits.length
  return {
    counts: digitCounts,
    percentages: digitCounts.map(c => ((c / total) * 100).toFixed(1)),
    total,
    hotDigit: digitCounts.indexOf(Math.max(...digitCounts)),
    coldDigit: digitCounts.indexOf(Math.min(...digitCounts)),
  }
}

function computeBollingerBands(prices, period = 20) {
  if (prices.length < period) return null
  const slice = prices.slice(-period)
  const mean = slice.reduce((a, b) => a + b, 0) / period
  const stdDev = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period)
  return { upper: mean + 2 * stdDev, middle: mean, lower: mean - 2 * stdDev, stdDev }
}

// ── Digit colors ──
const DIGIT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6'
]

export default function MarketAnalysis({ ticks = [], symbol = 'R_100', compact = false }) {
  const prices = useMemo(() => ticks.map(t => typeof t === 'number' ? t : t.price), [ticks])

  const rsi = useMemo(() => computeRSI(prices, 14), [prices])
  const ema9 = useMemo(() => computeEMA(prices, 9), [prices])
  const ema21 = useMemo(() => computeEMA(prices, 21), [prices])
  const digitStats = useMemo(() => computeDigitStats(prices), [prices])
  const bollinger = useMemo(() => computeBollingerBands(prices, 20), [prices])

  const lastPrice = prices.length > 0 ? prices[prices.length - 1] : null
  const lastEma9 = ema9.length > 0 ? ema9[ema9.length - 1] : null
  const lastEma21 = ema21.length > 0 ? ema21[ema21.length - 1] : null

  // Trend signal
  const trend = lastEma9 && lastEma21
    ? lastEma9 > lastEma21 ? 'bullish' : lastEma9 < lastEma21 ? 'bearish' : 'neutral'
    : 'neutral'

  // RSI signal
  const rsiSignal = rsi !== null
    ? rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral'
    : 'neutral'

  // Bollinger signal
  const bollingerSignal = bollinger && lastPrice
    ? lastPrice > bollinger.upper ? 'overbought'
      : lastPrice < bollinger.lower ? 'oversold'
      : 'neutral'
    : 'neutral'

  if (prices.length < 20) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground py-8">
          <Activity className="h-6 w-6 mx-auto mb-2 animate-pulse" />
          Chargement des données de marché...
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-violet-500" /> Analyse {symbol}
            </span>
            <Badge variant={trend === 'bullish' ? 'success' : trend === 'bearish' ? 'destructive' : 'secondary'}>
              {trend === 'bullish' ? '↑ Haussier' : trend === 'bearish' ? '↓ Baissier' : '→ Neutre'}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground">RSI(14)</p>
              <p className={`text-sm font-bold ${rsi > 70 ? 'text-red-500' : rsi < 30 ? 'text-green-500' : 'text-foreground'}`}>
                {rsi?.toFixed(1) || '—'}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground">EMA(9)</p>
              <p className="text-sm font-bold">{lastEma9?.toFixed(2) || '—'}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground">EMA(21)</p>
              <p className="text-sm font-bold">{lastEma21?.toFixed(2) || '—'}</p>
            </div>
          </div>
          {digitStats && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Distribution Digits (100 ticks)</p>
              <div className="flex gap-0.5">
                {digitStats.percentages.map((pct, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className="h-8 rounded-sm relative overflow-hidden bg-muted/30"
                      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <div style={{ height: `${pct}%`, backgroundColor: DIGIT_COLORS[i], minHeight: '2px' }}
                        className="rounded-sm transition-all duration-300" />
                    </div>
                    <p className="text-[8px] font-bold mt-0.5">{i}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Full version
  return (
    <div className="space-y-4">
      {/* Signal Summary */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-bold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-500" /> Analyse Technique — {symbol}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Trend */}
            <div className={`p-3 rounded-xl border text-center ${
              trend === 'bullish' ? 'border-green-500/30 bg-green-500/5' :
              trend === 'bearish' ? 'border-red-500/30 bg-red-500/5' :
              'border-border bg-muted/20'
            }`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                {trend === 'bullish' ? <ArrowUp className="h-4 w-4 text-green-500" /> :
                 trend === 'bearish' ? <ArrowDown className="h-4 w-4 text-red-500" /> :
                 <Minus className="h-4 w-4 text-muted-foreground" />}
                <span className="text-xs font-semibold">Tendance</span>
              </div>
              <p className={`text-sm font-bold ${
                trend === 'bullish' ? 'text-green-500' : trend === 'bearish' ? 'text-red-500' : ''
              }`}>
                {trend === 'bullish' ? 'Haussière' : trend === 'bearish' ? 'Baissière' : 'Neutre'}
              </p>
              <p className="text-[10px] text-muted-foreground">EMA 9/21</p>
            </div>

            {/* RSI */}
            <div className={`p-3 rounded-xl border text-center ${
              rsiSignal === 'overbought' ? 'border-red-500/30 bg-red-500/5' :
              rsiSignal === 'oversold' ? 'border-green-500/30 bg-green-500/5' :
              'border-border bg-muted/20'
            }`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-semibold">RSI(14)</span>
              </div>
              <p className={`text-lg font-bold ${
                rsiSignal === 'overbought' ? 'text-red-500' : rsiSignal === 'oversold' ? 'text-green-500' : ''
              }`}>
                {rsi?.toFixed(1) || '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {rsiSignal === 'overbought' ? 'Surachat' : rsiSignal === 'oversold' ? 'Survente' : 'Neutre'}
              </p>
            </div>

            {/* Bollinger */}
            <div className={`p-3 rounded-xl border text-center ${
              bollingerSignal === 'overbought' ? 'border-red-500/30 bg-red-500/5' :
              bollingerSignal === 'oversold' ? 'border-green-500/30 bg-green-500/5' :
              'border-border bg-muted/20'
            }`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Activity className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold">Bollinger</span>
              </div>
              <p className="text-sm font-bold">
                {bollinger ? `±${bollinger.stdDev.toFixed(2)}` : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {bollingerSignal === 'overbought' ? 'Haut de bande' : bollingerSignal === 'oversold' ? 'Bas de bande' : 'Dans la bande'}
              </p>
            </div>

            {/* Volatility */}
            <div className="p-3 rounded-xl border text-center bg-muted/20">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-semibold">Volatilité</span>
              </div>
              <p className="text-sm font-bold">
                {bollinger ? (bollinger.stdDev / bollinger.middle * 100).toFixed(3) + '%' : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground">StdDev / Prix</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EMA Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h4 className="text-sm font-bold mb-3">Moyennes Mobiles</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Prix actuel</span>
                <span className="text-sm font-bold">{lastPrice?.toFixed(lastPrice < 10 ? 4 : 2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">EMA(9)</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold">{lastEma9?.toFixed(lastEma9 < 10 ? 4 : 2) || '—'}</span>
                  {lastPrice && lastEma9 && (
                    <Badge variant={lastPrice > lastEma9 ? 'success' : 'destructive'} className="text-[9px]">
                      {lastPrice > lastEma9 ? 'Au-dessus' : 'En-dessous'}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">EMA(21)</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold">{lastEma21?.toFixed(lastEma21 < 10 ? 4 : 2) || '—'}</span>
                  {lastPrice && lastEma21 && (
                    <Badge variant={lastPrice > lastEma21 ? 'success' : 'destructive'} className="text-[9px]">
                      {lastPrice > lastEma21 ? 'Au-dessus' : 'En-dessous'}
                    </Badge>
                  )}
                </div>
              </div>
              {bollinger && (
                <>
                  <div className="border-t pt-3 mt-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Boll. Supérieure</span>
                    <span className="text-sm font-mono">{bollinger.upper.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Boll. Moyenne</span>
                    <span className="text-sm font-mono">{bollinger.middle.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Boll. Inférieure</span>
                    <span className="text-sm font-mono">{bollinger.lower.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RSI Gauge */}
        <Card>
          <CardContent className="p-5">
            <h4 className="text-sm font-bold mb-3">RSI — Relative Strength Index</h4>
            {rsi !== null ? (
              <div className="space-y-3">
                <div className="relative h-6 rounded-full overflow-hidden bg-gradient-to-r from-green-500 via-gray-300 to-red-500">
                  <div className="absolute top-0 h-full w-1 bg-foreground rounded shadow-lg transition-all duration-300"
                    style={{ left: `${Math.min(Math.max(rsi, 0), 100)}%`, transform: 'translateX(-50%)' }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Survente (0)</span>
                  <span>30</span>
                  <span>50</span>
                  <span>70</span>
                  <span>Surachat (100)</span>
                </div>
                <div className="text-center mt-2">
                  <span className={`text-3xl font-bold ${
                    rsi > 70 ? 'text-red-500' : rsi < 30 ? 'text-green-500' : 'text-foreground'
                  }`}>
                    {rsi.toFixed(1)}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rsi > 70 ? 'Zone de surachat — signal de vente potentiel' :
                     rsi < 30 ? 'Zone de survente — signal d\'achat potentiel' :
                     'Zone neutre — pas de signal fort'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Données insuffisantes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Digit Analysis */}
      {digitStats && (
        <Card>
          <CardContent className="p-5">
            <h4 className="text-sm font-bold mb-1 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" /> Analyse des Digits
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              Distribution des derniers digits sur les {digitStats.total} derniers ticks
            </p>
            <div className="grid grid-cols-10 gap-2">
              {digitStats.counts.map((count, digit) => {
                const pct = parseFloat(digitStats.percentages[digit])
                const isHot = digit === digitStats.hotDigit
                const isCold = digit === digitStats.coldDigit
                return (
                  <div key={digit} className={`text-center p-2 rounded-xl border transition-all ${
                    isHot ? 'border-green-500/50 bg-green-500/10 shadow-sm' :
                    isCold ? 'border-red-500/50 bg-red-500/10 shadow-sm' :
                    'border-border bg-muted/20'
                  }`}>
                    <div className="h-16 flex flex-col justify-end items-center mb-1">
                      <div className="w-full rounded-t-sm transition-all duration-500"
                        style={{
                          height: `${Math.max(pct * 1.5, 4)}%`,
                          backgroundColor: DIGIT_COLORS[digit],
                          maxHeight: '100%',
                          minHeight: '4px'
                        }} />
                    </div>
                    <p className="text-lg font-bold">{digit}</p>
                    <p className="text-[10px] text-muted-foreground">{count}×</p>
                    <p className="text-[10px] font-semibold" style={{ color: DIGIT_COLORS[digit] }}>
                      {pct}%
                    </p>
                    {isHot && <Badge variant="success" className="text-[7px] mt-1 px-1">HOT</Badge>}
                    {isCold && <Badge variant="destructive" className="text-[7px] mt-1 px-1">COLD</Badge>}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" /> Digit le plus fréquent
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" /> Digit le moins fréquent
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
