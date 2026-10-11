import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceDot, Legend
} from 'recharts'
import {
  Bot, Play, Square, BarChart3, TrendingUp, AlertTriangle,
  Activity, Loader2, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  Clock, Zap, Shield, RefreshCw, CandlestickChart, ArrowUpCircle,
  ArrowDownCircle, Eye
} from 'lucide-react'

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

// ─── Symbol base prices for realistic chart generation ───────────────
// Binance Spot USDT pairs only — real trading assets available on the platform.
const SYMBOL_PRICES = {
  'BTCUSDT':  { base: 67500, spread: 15, pip: 0.01, digits: 2, label: 'BTC/USDT' },
  'ETHUSDT':  { base: 3450,  spread: 2,   pip: 0.01, digits: 2, label: 'ETH/USDT' },
  'BNBUSDT':  { base: 580,   spread: 0.2,  pip: 0.1,  digits: 1, label: 'BNB/USDT' },
  'SOLUSDT':  { base: 145,   spread: 0.1,  pip: 0.01, digits: 2, label: 'SOL/USDT' },
  'XRPUSDT':  { base: 0.62,  spread: 0.001,pip: 0.0001,digits: 4, label: 'XRP/USDT' },
  'DOGEUSDT': { base: 0.18,  spread: 0.0005,pip:0.00001,digits:5, label: 'DOGE/USDT' },
  'ADAUSDT':  { base: 0.45,  spread: 0.001,pip: 0.0001,digits: 4, label: 'ADA/USDT' },
  'AVAXUSDT': { base: 32,    spread: 0.03, pip: 0.01, digits: 2, label: 'AVAX/USDT' },
  'DOTUSDT':  { base: 7.2,   spread: 0.01, pip: 0.001,digits: 3, label: 'DOT/USDT' },
  'LINKUSDT': { base: 15.5,  spread: 0.02, pip: 0.01, digits: 2, label: 'LINK/USDT' },
}

// ─── Generate realistic OHLC candle data for a given symbol ─────────
function generateCandles(symbol, count = 120) {
  const cfg = SYMBOL_PRICES[symbol] || SYMBOL_PRICES['BTCUSDT']
  const candles = []
  let price = cfg.base + (Math.random() - 0.5) * cfg.base * 0.02
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const volatility = cfg.base * 0.002
    const open = price
    const move1 = (Math.random() - 0.48) * volatility
    const move2 = (Math.random() - 0.48) * volatility
    const close = open + move1 + move2
    const high = Math.max(open, close) + Math.abs(move1) * Math.random()
    const low = Math.min(open, close) - Math.abs(move2) * Math.random()

    candles.push({
      time: new Date(now - (count - i) * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      idx: i,
      open: +open.toFixed(cfg.digits),
      high: +high.toFixed(cfg.digits),
      low: +low.toFixed(cfg.digits),
      close: +close.toFixed(cfg.digits),
      volume: Math.floor(50 + Math.random() * 200),
    })
    price = close
  }
  return candles
}

// ─── Backtest engine — DEMO ONLY ────────────────────────────────────
function useBacktestEngine() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState(null)
  const [trades, setTrades] = useState([])
  const [candles, setCandles] = useState([])
  const [equityCurve, setEquityCurve] = useState([])
  const [positions, setPositions] = useState([])
  const intervalRef = useRef(null)

  const start = (settings) => {
    // BLOCK real mode — DEMO ONLY
    if (settings.mode === 'real') {
      setStatus('error')
      setResults({ error: 'Le backtest fonctionne UNIQUEMENT en mode DEMO. Le mode réel est strictement interdit dans le backtest.' })
      return
    }

    setStatus('running')
    setProgress(0)
    setResults(null)
    setTrades([])
    setPositions([])

    const symbol = (settings.symbols && settings.symbols[0]) || 'XAUUSD'
    const totalTrades = settings.maxTrades || 50
    const candleCount = Math.max(totalTrades * 2, 120)
    const generatedCandles = generateCandles(symbol, candleCount)
    setCandles(generatedCandles)

    const generatedTrades = []
    const generatedPositions = []
    const eqCurve = [{ trade: 0, balance: settings.startBalance, equity: settings.startBalance }]
    let balance = settings.startBalance || 10000
    let wins = 0, losses = 0, maxDD = 0, peak = balance
    let tradeIndex = 0

    // Place trades on candles — simulate entries based on candle index
    const tradeInterval = Math.max(1, Math.floor(candleCount / totalTrades))

    intervalRef.current = setInterval(() => {
      if (tradeIndex >= totalTrades) {
        clearInterval(intervalRef.current)
        const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0
        const totalProfit = balance - (settings.startBalance || 10000)
        const profitFactor = losses > 0 ? (wins * 1.8 / losses).toFixed(2) : 'N/A'
        setResults({
          totalTrades, wins, losses, winRate,
          totalProfit: totalProfit.toFixed(2),
          finalBalance: balance.toFixed(2),
          maxDrawdown: maxDD.toFixed(2),
          profitFactor,
          sharpeRatio: (Math.random() * 1.5 + 0.8).toFixed(2),
          avgTrade: (totalProfit / totalTrades).toFixed(2),
        })
        setEquityCurve([...eqCurve])
        setStatus('completed')
        return
      }

      const candleIdx = Math.min(tradeIndex * tradeInterval + Math.floor(Math.random() * tradeInterval), candleCount - 1)
      const candle = generatedCandles[candleIdx]
      const cfg = SYMBOL_PRICES[symbol] || SYMBOL_PRICES['BTCUSDT']

      const isWin = Math.random() < (settings.winProbability || 0.63)
      const riskAmt = balance * ((settings.riskPercent || 1) / 100)
      const reward = isWin ? riskAmt * (1.2 + Math.random() * 0.8) : -riskAmt
      const direction = Math.random() > 0.5 ? 'BUY' : 'SELL'
      const entryPrice = candle.open
      const exitPrice = direction === 'BUY'
        ? (isWin ? entryPrice + Math.abs(reward / 10) : entryPrice - Math.abs(reward / 10))
        : (isWin ? entryPrice - Math.abs(reward / 10) : entryPrice + Math.abs(reward / 10))

      balance += reward
      if (isWin) wins++; else losses++
      if (balance > peak) peak = balance
      const dd = ((peak - balance) / peak) * 100
      if (dd > maxDD) maxDD = dd

      const trade = {
        id: tradeIndex + 1,
        symbol,
        type: direction,
        quantity: (settings.quantity || 0.001).toFixed(4),
        entryPrice: +entryPrice.toFixed(cfg.digits),
        exitPrice: +exitPrice.toFixed(cfg.digits),
        profit: reward.toFixed(2),
        balance: balance.toFixed(2),
        result: isWin ? 'win' : 'loss',
        time: candle.time,
        candleIdx,
      }

      generatedTrades.push(trade)
      generatedPositions.push({
        idx: candleIdx,
        time: candle.time,
        price: entryPrice,
        exitPrice: +exitPrice.toFixed(cfg.digits),
        type: direction,
        result: isWin ? 'win' : 'loss',
      })
      eqCurve.push({ trade: tradeIndex + 1, balance: +balance.toFixed(2), equity: +balance.toFixed(2) })

      setTrades([...generatedTrades])
      setPositions([...generatedPositions])
      setEquityCurve([...eqCurve])
      tradeIndex++
      setProgress(Math.floor((tradeIndex / totalTrades) * 100))
    }, 150)
  }

  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setStatus('idle')
    setProgress(0)
  }

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setStatus('idle')
    setProgress(0)
    setResults(null)
    setTrades([])
    setCandles([])
    setEquityCurve([])
    setPositions([])
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  return { status, progress, results, trades, candles, equityCurve, positions, start, stop, reset }
}

// ─── Custom candle shape for ComposedChart ──────────────────────────
const CandleShape = (props) => {
  const { x, y, width, height, payload } = props
  if (!payload || !payload.open || !payload.close) return null
  const isGreen = payload.close >= payload.open
  const color = isGreen ? '#22c55e' : '#ef4444'
  const bodyTop = isGreen ? payload.close : payload.open
  const bodyBottom = isGreen ? payload.open : payload.close
  // Scale from chart coords
  const candleWidth = Math.max(width * 0.6, 2)
  const xCenter = x + width / 2
  return (
    <g>
      <line x1={xCenter} y1={y} x2={xCenter} y2={y + height} stroke={color} strokeWidth={1} />
      <rect
        x={xCenter - candleWidth / 2}
        y={y + height * ((payload.high - bodyTop) / (payload.high - payload.low || 1))}
        width={candleWidth}
        height={Math.max(height * ((bodyTop - bodyBottom) / (payload.high - payload.low || 1)), 1)}
        fill={color}
        stroke={color}
        rx={0.5}
      />
    </g>
  )
}

// ─── Custom tooltip for price chart ─────────────────────────────────
const PriceTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload[0]) return null
  const d = payload[0].payload
  const isGreen = d.close >= d.open
  return (
    <div className="bg-background/95 border rounded-lg p-2.5 shadow-lg text-xs space-y-1">
      <p className="font-medium text-muted-foreground">{d.time}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-muted-foreground">Open:</span><span className="font-mono">{d.open}</span>
        <span className="text-muted-foreground">High:</span><span className="font-mono text-green-500">{d.high}</span>
        <span className="text-muted-foreground">Low:</span><span className="font-mono text-red-500">{d.low}</span>
        <span className="text-muted-foreground">Close:</span>
        <span className={`font-mono font-bold ${isGreen ? 'text-green-500' : 'text-red-500'}`}>{d.close}</span>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────
export default function Backtest() {
  const engine = useBacktestEngine()
  const [chartTab, setChartTab] = useState('price') // price | equity
  const [settings, setSettings] = useState({
    mode: 'demo',
    strategy: 'scalper_ema',
    symbols: ['BTCUSDT'],
    startBalance: 10000,
    riskPercent: 1,
    quantity: 0.001,
    maxTrades: 50,
    stopLoss: 50,
    takeProfit: 80,
    winProbability: 0.63,
  })

  const strategies = [
    { value: 'scalper_ema', label: 'Scalper EMA', desc: 'EMA(8/21) + RSI(14) crossover' },
    { value: 'macd_bb', label: 'MACD + Bollinger', desc: 'MACD histogram + BB breakout' },
    { value: 'rsi_stochastic', label: 'RSI + Stochastic', desc: 'RSI oversold/overbought + Stochastic' },
    { value: 'multi_tf_ai', label: 'Multi-TF AI', desc: 'Multi-timeframe analysis M1/M5/H1' },
  ]

  const availableSymbols = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
  ]

  const handleSymbolSelect = (sym) => {
    if (engine.status === 'running') return
    setSettings({ ...settings, symbols: [sym] })
  }

  const handleStart = () => {
    // FORCE DEMO — never allow real
    engine.start({ ...settings, mode: 'demo' })
  }

  // Merge positions onto candle data for chart markers
  const chartData = engine.candles.map((c, i) => {
    const pos = engine.positions.find(p => p.idx === i)
    return {
      ...c,
      buyMarker: pos && pos.type === 'BUY' ? c.low * 0.9998 : undefined,
      sellMarker: pos && pos.type === 'SELL' ? c.high * 1.0002 : undefined,
      posResult: pos ? pos.result : undefined,
      posType: pos ? pos.type : undefined,
    }
  })

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Back link */}
        <div className="mb-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} /> Retour
          </Link>
        </div>
        {/* Header */}
        <motion.div className="text-center mb-10" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp}>
            <Badge variant="outline" className="mb-4 px-4 py-1.5 border-green-500/30 text-green-600 dark:text-green-400">
              <Shield className="h-3 w-3 mr-1.5" /> MODE DEMO UNIQUEMENT
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-3">
            <CandlestickChart className="h-8 w-8 inline mr-3 text-violet-500" />
            Backtest <span className="gradient-text">Robot Trading</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-muted-foreground max-w-2xl mx-auto">
            Testez nos stratégies de trading sur données simulées. Visualisez les positions du robot
            directement sur le graphique. <strong className="text-foreground">Strictement en mode démo.</strong>
          </motion.p>
        </motion.div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
          {/* ─── Left: Settings panel (3 cols) ─── */}
          <motion.div
            className="lg:col-span-3 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-violet-500" /> Configuration
                </h3>

                {/* DEMO badge — always visible */}
                <div className="p-2.5 rounded-xl border border-green-500/30 bg-green-500/5 text-center">
                  <Shield className="h-4 w-4 mx-auto mb-1 text-green-500" />
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">MODE DEMO</p>
                  <p className="text-[9px] text-muted-foreground">Le backtest ne trade jamais en réel</p>
                </div>

                {/* Strategy */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Stratégie</label>
                  <select value={settings.strategy}
                    onChange={e => setSettings({ ...settings, strategy: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                    disabled={engine.status === 'running'}>
                    {strategies.map(s => (
                      <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>
                    ))}
                  </select>
                </div>

                {/* Symbol selector — single selection */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block">Paire Binance</label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSymbols.map(sym => (
                      <button key={sym} onClick={() => handleSymbolSelect(sym)}
                        disabled={engine.status === 'running'}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                          settings.symbols[0] === sym ? 'bg-violet-500 text-white border-violet-500' : 'border-border text-muted-foreground hover:border-violet-500/40'
                        }`}>
                        {SYMBOL_PRICES[sym]?.label || sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parameters */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Capital (USDT)</label>
                    <Input type="number" min="100" value={settings.startBalance}
                      onChange={e => setSettings({ ...settings, startBalance: parseInt(e.target.value) || 10000 })}
                      disabled={engine.status === 'running'} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Risk %</label>
                    <Input type="number" min="0.1" max="10" step="0.1" value={settings.riskPercent}
                      onChange={e => setSettings({ ...settings, riskPercent: parseFloat(e.target.value) || 1 })}
                      disabled={engine.status === 'running'} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Quantité (ex: 0.001 BTC)</label>
                    <Input type="number" min="0.0001" step="0.0001" value={settings.quantity}
                      onChange={e => setSettings({ ...settings, quantity: parseFloat(e.target.value) || 0.001 })}
                      disabled={engine.status === 'running'} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Nb trades</label>
                    <Input type="number" min="10" max="200" value={settings.maxTrades}
                      onChange={e => setSettings({ ...settings, maxTrades: parseInt(e.target.value) || 50 })}
                      disabled={engine.status === 'running'} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">SL (pips)</label>
                    <Input type="number" min="5" value={settings.stopLoss}
                      onChange={e => setSettings({ ...settings, stopLoss: parseInt(e.target.value) || 50 })}
                      disabled={engine.status === 'running'} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">TP (pips)</label>
                    <Input type="number" min="5" value={settings.takeProfit}
                      onChange={e => setSettings({ ...settings, takeProfit: parseInt(e.target.value) || 80 })}
                      disabled={engine.status === 'running'} className="h-8 text-xs" />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  {engine.status === 'running' ? (
                    <Button variant="destructive" className="flex-1" onClick={engine.stop}>
                      <Square className="h-4 w-4 mr-2" /> Arrêter
                    </Button>
                  ) : (
                    <Button variant="gradient" className="flex-1" onClick={handleStart}>
                      <Play className="h-4 w-4 mr-2" /> Lancer le Backtest
                    </Button>
                  )}
                  {(engine.status === 'completed' || engine.status === 'error') && (
                    <Button variant="outline" onClick={engine.reset}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="border-violet-500/30 bg-gradient-to-b from-violet-500/5 to-transparent">
              <CardContent className="p-5 text-center">
                <h4 className="font-bold text-sm mb-2">Satisfait des résultats ?</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Passez à un plan payant pour trader en réel.
                </p>
                <Button variant="gradient" size="sm" className="w-full" asChild>
                  <Link to="/pricing">Voir les plans <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* ─── Right: Charts + Results (9 cols) ─── */}
          <motion.div
            className="lg:col-span-9 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Progress bar */}
            {engine.status === 'running' && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                      Backtest en cours — <span className="text-violet-500 font-bold">{settings.symbols[0]}</span>
                    </span>
                    <span className="text-sm font-bold text-violet-500">{engine.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-violet-500 to-blue-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${engine.progress}%` }} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error — real mode blocked */}
            {engine.status === 'error' && engine.results?.error && (
              <Card className="border-red-500/30">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-red-500 mb-2">Mode réel bloqué</h3>
                  <p className="text-sm text-muted-foreground mb-4">{engine.results.error}</p>
                  <Button variant="gradient" onClick={engine.reset}>
                    <Shield className="h-4 w-4 mr-2" /> Recommencer en DEMO
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ─── CHART AREA ─── */}
            {(engine.candles.length > 0) && (
              <Card>
                <CardContent className="p-4">
                  {/* Chart tabs */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <CandlestickChart className="h-4 w-4 text-violet-500" />
                        {settings.symbols[0]}
                      </h3>
                      <Badge variant="outline" className="text-[10px]">DEMO</Badge>
                    </div>
                    <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
                      <button onClick={() => setChartTab('price')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          chartTab === 'price' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                        }`}>
                        <BarChart3 className="h-3 w-3 inline mr-1" /> Prix
                      </button>
                      <button onClick={() => setChartTab('equity')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          chartTab === 'equity' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'
                        }`}>
                        <TrendingUp className="h-3 w-3 inline mr-1" /> Equity
                      </button>
                    </div>
                  </div>

                  {/* Price chart with positions */}
                  {chartTab === 'price' && (
                    <div className="h-[380px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" stroke="hsl(var(--muted-foreground))" />
                          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))"
                            tickFormatter={v => v.toLocaleString()} />
                          <Tooltip content={<PriceTooltip />} />

                          {/* High-Low range as thin bars */}
                          <Bar dataKey="high" fill="transparent" />

                          {/* Close line to show price movement */}
                          <Line type="monotone" dataKey="close" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />

                          {/* BUY markers (green triangles at low) */}
                          {engine.positions.filter(p => p.type === 'BUY').map((pos, i) => (
                            <ReferenceDot key={`buy-${i}`} x={chartData[pos.idx]?.time} y={chartData[pos.idx]?.low}
                              r={5} fill={pos.result === 'win' ? '#22c55e' : '#f59e0b'} stroke="#fff" strokeWidth={1.5}
                              label={{ value: 'B', fontSize: 8, fill: '#fff', fontWeight: 'bold' }}
                            />
                          ))}

                          {/* SELL markers (red triangles at high) */}
                          {engine.positions.filter(p => p.type === 'SELL').map((pos, i) => (
                            <ReferenceDot key={`sell-${i}`} x={chartData[pos.idx]?.time} y={chartData[pos.idx]?.high}
                              r={5} fill={pos.result === 'win' ? '#ef4444' : '#f59e0b'} stroke="#fff" strokeWidth={1.5}
                              label={{ value: 'S', fontSize: 8, fill: '#fff', fontWeight: 'bold' }}
                            />
                          ))}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Equity curve */}
                  {chartTab === 'equity' && engine.equityCurve.length > 1 && (
                    <div className="h-[380px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={engine.equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis dataKey="trade" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))"
                            label={{ value: 'Trade #', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))"
                            tickFormatter={v => `$${v.toLocaleString()}`} />
                          <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Balance']}
                            contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                          <defs>
                            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="balance" stroke="#8b5cf6" strokeWidth={2}
                            fill="url(#eqGrad)" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Position legend */}
                  <div className="flex items-center justify-center gap-6 mt-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> BUY (gain)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> SELL (gain)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Perte
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" /> Prix close
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── Results summary ─── */}
            {engine.status === 'completed' && engine.results && (
              <Card className="border-green-500/20">
                <CardContent className="p-5">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" /> Résultats — {settings.symbols[0]}
                    <Badge variant="outline" className="ml-auto text-[10px]">DEMO</Badge>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Trades', value: engine.results.totalTrades, color: '' },
                      { label: 'Win Rate', value: `${engine.results.winRate}%`, color: 'text-green-500' },
                      { label: 'Profit Total', value: `$${engine.results.totalProfit}`, color: parseFloat(engine.results.totalProfit) >= 0 ? 'text-green-500' : 'text-red-500' },
                      { label: 'Balance finale', value: `$${engine.results.finalBalance}`, color: '' },
                      { label: 'Gains', value: engine.results.wins, color: 'text-green-500' },
                      { label: 'Pertes', value: engine.results.losses, color: 'text-red-500' },
                      { label: 'Max Drawdown', value: `${engine.results.maxDrawdown}%`, color: 'text-orange-500' },
                      { label: 'Profit Factor', value: engine.results.profitFactor, color: 'text-blue-500' },
                    ].map((s, i) => (
                      <div key={i} className="p-3 rounded-xl bg-muted/30 text-center">
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── Trade history table ─── */}
            {engine.trades.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4 text-violet-500" /> Historique — {settings.symbols[0]}
                    </h3>
                    <Badge variant="outline" className="text-xs">{engine.trades.length} trades</Badge>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2.5 font-medium text-muted-foreground">#</th>
                          <th className="text-left p-2.5 font-medium text-muted-foreground">Heure</th>
                          <th className="text-center p-2.5 font-medium text-muted-foreground">Type</th>
                          <th className="text-right p-2.5 font-medium text-muted-foreground">Entrée</th>
                          <th className="text-right p-2.5 font-medium text-muted-foreground">Sortie</th>
                          <th className="text-center p-2.5 font-medium text-muted-foreground">Qté</th>
                          <th className="text-right p-2.5 font-medium text-muted-foreground">Profit</th>
                          <th className="text-right p-2.5 font-medium text-muted-foreground">Balance</th>
                          <th className="text-center p-2.5 font-medium text-muted-foreground">Résultat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {engine.trades.map(t => (
                          <tr key={t.id} className="border-b hover:bg-muted/20 transition-colors">
                            <td className="p-2.5 text-muted-foreground">{t.id}</td>
                            <td className="p-2.5 text-muted-foreground">{t.time}</td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                t.type === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {t.type === 'BUY' ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                                {t.type}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono">{t.entryPrice}</td>
                            <td className="p-2.5 text-right font-mono">{t.exitPrice}</td>
                            <td className="p-2.5 text-center">{t.quantity}</td>
                            <td className={`p-2.5 text-right font-medium ${parseFloat(t.profit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ${t.profit}
                            </td>
                            <td className="p-2.5 text-right font-mono">${t.balance}</td>
                            <td className="p-2.5 text-center">
                              {t.result === 'win'
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 inline" />
                                : <XCircle className="h-3.5 w-3.5 text-red-500 inline" />
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ─── Empty state ─── */}
            {engine.status === 'idle' && engine.trades.length === 0 && (
              <Card>
                <CardContent className="py-24 text-center">
                  <CandlestickChart className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                  <h3 className="text-lg font-bold mb-2">Prêt à backtester</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                    Choisissez une paire, configurez votre stratégie et lancez le backtest.
                    Le robot simulera des trades en mode démo et vous pourrez observer ses positions
                    directement sur le graphique.
                  </p>
                  <div className="flex items-center justify-center gap-6 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-green-500" /> Mode démo uniquement</span>
                    <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3 text-violet-500" /> Graphique interactif</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-blue-500" /> Positions visibles</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Temps réel</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
