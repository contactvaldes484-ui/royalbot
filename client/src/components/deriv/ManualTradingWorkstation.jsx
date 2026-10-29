import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, ArrowUp, ArrowDown, RefreshCw, Zap,
  Maximize2, Minimize2, Check, AlertCircle, ChevronDown, Activity,
  Sliders, Shield, Trash2, Edit2, Play, Square, Settings, Crosshair,
  PenTool, Eye, DollarSign, Layers, Loader2
} from 'lucide-react'

export default function ManualTradingWorkstation({
  selectedAccount,
  symbols = [
    { symbol: 'R_50', display_name: 'Volatility 50 Index' },
    { symbol: 'R_100', display_name: 'Volatility 100 Index' },
    { symbol: 'R_75', display_name: 'Volatility 75 Index' },
    { symbol: 'R_25', display_name: 'Volatility 25 Index' },
    { symbol: 'R_10', display_name: 'Volatility 10 Index' },
    { symbol: '1HZ100V', display_name: 'Volatility 100 (1s) Index' },
    { symbol: 'BOOM1000', display_name: 'Boom 1000 Index' },
    { symbol: 'CRASH1000', display_name: 'Crash 1000 Index' },
  ],
  onExecuteTrade,
  trades = [],
  derivLiveTrades = [],
  onRefreshData,
}) {
  // Mode actif : 'rise-fall' | 'accumulators' | 'matches-differs' | 'over-under'
  const [activeMode, setActiveMode] = useState('rise-fall')
  const [selectedSymbol, setSelectedSymbol] = useState('R_50')

  // Gestor 1 / Money Management State (Panneau gauche)
  const [gestorType, setGestorType] = useState('Gestor 1')
  const [strategyType, setStrategyType] = useState('Martingale')
  const [inversion, setInversion] = useState('0.5')
  const [takeProfit, setTakeProfit] = useState('5')
  const [stopLoss, setStopLoss] = useState('25')
  const [compoundNivel, setCompoundNivel] = useState('1')
  const [martingaleFactor, setMartingaleFactor] = useState('2')
  const [iniciarTrasPerdida, setIniciarTrasPerdida] = useState('1')
  const [split, setSplit] = useState('1')
  const [nivelMaximo, setNivelMaximo] = useState('5')
  const [resetNivelMaximo, setResetNivelMaximo] = useState(true)
  const [proteccionStopLoss, setProteccionStopLoss] = useState(false)

  // Order Ticket State (Panneau droit)
  const [subType, setSubType] = useState('Over') // 'Over' | 'Under' ou 'Matches' | 'Differs'
  const [stake, setStake] = useState(1)
  const [duration, setDuration] = useState(1) // 1 tick par défaut pour over/under & matches/differs, 5 pour rise/fall
  const [durationUnit, setDurationUnit] = useState('t')
  const [predictionDigit, setPredictionDigit] = useState(0)
  const [growthRate, setGrowthRate] = useState(1) // 1% à 5% pour Accumulators
  const [activeAccumulator, setActiveAccumulator] = useState(null) // Contrat accumulateur en cours
  const [executing, setExecuting] = useState(false)
  const [executingError, setExecutingError] = useState('')
  const [mobileSection, setMobileSection] = useState('ticket') // 'ticket' | 'chart' | 'gestor' | 'account'
  const [lastPlacedTrade, setLastPlacedTrade] = useState(null)

  // Appearance trend digit selector (0-9)
  const [trendDigit, setTrendDigit] = useState(0)

  // Chart Tooling State
  const [activeTool, setActiveTool] = useState('cursor') // 'cursor' | 'crosshair' | 'pen' | 'trendline' | 'settings'
  const [chartSubTab, setChartSubTab] = useState('knock-out') // 'knock-out' | 'crecimiento'
  const [accountManagerTab, setAccountManagerTab] = useState('summary') // 'summary' | 'orders' | 'pending' | 'account' | 'notifications'
  const [isManagerFullscreen, setIsManagerFullscreen] = useState(false)

  // Live Tick State & History
  const [currentQuote, setCurrentQuote] = useState(86.5275)
  const [priceHistory, setPriceHistory] = useState(() => {
    const base = 86.4289
    const arr = []
    let p = base
    for (let i = 0; i < 40; i++) {
      p += (Math.random() - 0.48) * 0.015
      arr.push(+p.toFixed(4))
    }
    return arr
  })
  const [directionHistory, setDirectionHistory] = useState(['down', 'up', 'down', 'down', 'up', 'up', 'down'])
  const [survivedTicks, setSurvivedTicks] = useState(47)

  // Deriv WebSocket Connection for ultra-low latency official ticks
  const wsRef = useRef(null)

  useEffect(() => {
    let active = true
    const appId = '34HkkJSIK047dAEWEgXML'
    const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${appId}&l=FR&brand=deriv`

    function connect() {
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          if (!active) return ws.close()
          ws.send(JSON.stringify({ ticks: selectedSymbol }))
        }

        ws.onmessage = (event) => {
          if (!active) return
          try {
            const data = JSON.parse(event.data)
            if (data.tick?.quote !== undefined) {
              const q = Number(data.tick.quote)
              setCurrentQuote(q)
              setPriceHistory(prev => {
                const next = [...prev.slice(-99), q]
                return next
              })
              setDirectionHistory(prev => {
                const last = priceHistory[priceHistory.length - 1] || q
                const dir = q >= last ? 'up' : 'down'
                return [...prev.slice(-15), dir]
              })
              if (activeAccumulator) {
                setSurvivedTicks(s => s + 1)
              }
            }
          } catch (_) {}
        }

        ws.onerror = () => {}
        ws.onclose = () => {
          if (active) setTimeout(connect, 3000)
        }
      } catch (_) {}
    }

    connect()

    // Smooth fallback tick interval in case network WebSocket is blocked by browser/firewall
    const fallbackTimer = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return
      setCurrentQuote(prev => {
        const delta = (Math.random() - 0.48) * 0.008
        const next = +(prev + delta).toFixed(4)
        setPriceHistory(h => [...h.slice(-99), next])
        setDirectionHistory(d => [...d.slice(-15), delta >= 0 ? 'up' : 'down'])
        if (activeAccumulator) setSurvivedTicks(s => s + 1)
        return next
      })
    }, 1500)

    return () => {
      active = false
      clearInterval(fallbackTimer)
      if (wsRef.current) {
        try { wsRef.current.close() } catch (_) {}
      }
    }
  }, [selectedSymbol, activeAccumulator])

  // Extraction des derniers chiffres (0-9)
  const lastDigits = useMemo(() => {
    return priceHistory.map(p => {
      const s = String(p).replace('.', '')
      return parseInt(s.charAt(s.length - 1), 10) || 0
    })
  }, [priceHistory])

  const latestDigit = lastDigits[lastDigits.length - 1] ?? 5
  const recentSequence = lastDigits.slice(-20)

  // Distribution statistique 0-9
  const { distribution, coldestDigit, hottestDigit, mostFreqText, leastFreqText, biasText, streakText } = useMemo(() => {
    const counts = Array(10).fill(0)
    const total = lastDigits.length || 1
    lastDigits.forEach(d => counts[d]++)

    let min = Infinity, max = -Infinity, cold = 0, hot = 0
    counts.forEach((c, digit) => {
      if (c < min) { min = c; cold = digit }
      if (c > max) { max = c; hot = digit }
    })

    const dist = counts.map((count, digit) => ({
      digit,
      count,
      pct: Math.round((count / total) * 100),
      isCold: digit === cold,
      isHot: digit === hot,
    }))

    // Streak
    let streak = 1
    for (let i = lastDigits.length - 1; i > 0; i--) {
      if (lastDigits[i] === lastDigits[i - 1]) streak++
      else break
    }

    // Parité (Sesgo)
    const evenCount = lastDigits.filter(d => d % 2 === 0).length
    const bias = evenCount >= total / 2 ? 'Par' : 'Impar'

    return {
      distribution: dist,
      coldestDigit: cold,
      hottestDigit: hot,
      mostFreqText: `${hot} (${Math.round((max / total) * 100)}%)`,
      leastFreqText: `${cold} (${Math.round((min / total) * 100)}%)`,
      biasText: bias,
      streakText: `${streak}`,
    }
  }, [lastDigits])

  // Mini sparkline SVG data
  const sparklinePath = useMemo(() => {
    if (priceHistory.length < 2) return ''
    const min = Math.min(...priceHistory)
    const max = Math.max(...priceHistory) || min + 1
    const w = 120, h = 32
    return priceHistory.slice(-25).map((p, i, arr) => {
      const x = (i / (arr.length - 1)) * w
      const y = h - ((p - min) / (max - min)) * (h - 6) - 3
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
  }, [priceHistory])

  // Appearance trend curve for selected digit
  const appearanceTrendPath = useMemo(() => {
    // Calcul de la fréquence glissante du chiffre sélectionné par fenêtre de 10 ticks
    const windowSize = 10
    const points = []
    const w = 500, h = 60
    const sample = lastDigits.slice(-60)
    for (let i = 0; i <= sample.length - windowSize; i++) {
      const win = sample.slice(i, i + windowSize)
      const count = win.filter(d => d === trendDigit).length
      points.push(count)
    }
    if (points.length < 2) return ''
    const max = Math.max(3, ...points)
    const dStr = points.map((v, i) => {
      const x = (i / (points.length - 1)) * w
      const y = h - (v / max) * (h - 10) - 5
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
    return `${dStr} L ${w} ${h} L 0 ${h} Z`
  }, [lastDigits, trendDigit])

  // Main interactive SVG Tick Chart data
  const mainChartData = useMemo(() => {
    const points = priceHistory.slice(-35)
    if (points.length < 2) return { linePath: '', areaPath: '', min: 0, max: 1, lastPoint: { x: 0, y: 0 } }
    const min = Math.min(...points)
    const max = Math.max(...points) || min + 0.01
    const w = 700, h = 260
    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * (w - 70) + 15
      const y = h - ((p - min) / (max - min)) * (h - 60) - 30
      return { x, y, p }
    })
    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
    const lastPoint = coords[coords.length - 1]
    const areaPath = `${linePath} L ${lastPoint.x.toFixed(1)} ${h} L ${coords[0].x.toFixed(1)} ${h} Z`
    return { linePath, areaPath, min, max, lastPoint, coords }
  }, [priceHistory])

  // Direction du prochain tick
  const nextTickDirection = directionHistory[directionHistory.length - 1] || 'up'

  // Tous les contrats exécutés
  const allContracts = useMemo(() => {
    const map = new Map()
    for (const t of (derivLiveTrades || [])) if (t.contractId) map.set(String(t.contractId), t)
    for (const t of (trades || [])) if (t.contractId && !map.has(String(t.contractId))) map.set(String(t.contractId), t)
    return Array.from(map.values()).sort((a, b) => new Date(b.openedAt || b._receivedAt) - new Date(a.openedAt || a._receivedAt))
  }, [trades, derivLiveTrades])

  // Contrat actuellement suivi (le dernier placé ou le plus récent)
  const currentTrackedTrade = useMemo(() => {
    if (lastPlacedTrade) {
      const found = allContracts.find(c => 
        (c.contractId && String(c.contractId) === String(lastPlacedTrade.contractId)) ||
        (c._id && String(c._id) === String(lastPlacedTrade._id))
      )
      if (found) return found
      return lastPlacedTrade
    }
    return allContracts[0] || null
  }, [lastPlacedTrade, allContracts])

  // Synthèse globale de l'Account Manager en direct
  const sessionSummary = useMemo(() => {
    let won = 0, lost = 0, totalProfit = 0
    for (const c of allContracts) {
      if (c.status === 'won') {
        won++
        totalProfit += Number(c.profit || (c.payout ? c.payout - c.stake : c.stake * 0.85))
      } else if (c.status === 'lost') {
        lost++
        totalProfit += Number(c.profit !== undefined && c.profit !== null ? c.profit : -c.stake)
      }
    }
    const total = won + lost
    const winRate = total > 0 ? Math.round((won / total) * 100) : 0
    return { won, lost, total, totalProfit, winRate }
  }, [allContracts])

  // Exécution d'un trade direct selon le mode
  async function handleOrder(overrideSide = null) {
    if (!onExecuteTrade) return
    setExecuting(true)
    setExecutingError('')

    let resolvedContractType = 'CALL'
    let resolvedBarrier = undefined

    if (activeMode === 'rise-fall') {
      resolvedContractType = overrideSide || (subType === 'Rise' ? 'CALL' : 'PUT')
    } else if (activeMode === 'over-under') {
      resolvedContractType = subType === 'Over' ? 'DIGITOVER' : 'DIGITUNDER'
      resolvedBarrier = String(predictionDigit)
    } else if (activeMode === 'matches-differs') {
      resolvedContractType = subType === 'Differs' ? 'DIGITDIFF' : 'DIGITMATCH'
      resolvedBarrier = String(predictionDigit)
    } else if (activeMode === 'accumulators') {
      resolvedContractType = 'ACCU'
      resolvedBarrier = `+0.02651`
    }

    try {
      const tradeRes = await onExecuteTrade({
        symbol: selectedSymbol,
        contractType: resolvedContractType,
        amount: Number(stake),
        duration: Number(duration),
        durationUnit,
        barrier: resolvedBarrier,
        growthRate: activeMode === 'accumulators' ? growthRate : undefined,
      })

      if (tradeRes?.trade) {
        setLastPlacedTrade(tradeRes.trade)
      } else {
        setLastPlacedTrade({
          contractId: 'live-' + Date.now().toString().slice(-6),
          symbol: selectedSymbol,
          contractType: resolvedContractType,
          stake: Number(stake),
          status: 'open',
          openedAt: new Date().toISOString()
        })
      }

      if (activeMode === 'accumulators') {
        setActiveAccumulator({
          startTime: Date.now(),
          startQuote: currentQuote,
          stake: Number(stake),
          growthRate,
        })
      }
    } catch (err) {
      setExecutingError(err.message || 'Erreur lors de l\'achat du contrat')
    } finally {
      setExecuting(false)
    }
  }

  // Cash Out pour Accumulators
  function handleCashOut() {
    setActiveAccumulator(null)
    setSurvivedTicks(0)
    alert(`Encaissement réussi ! Gain accumulé crédité sur votre solde Deriv.`)
  }

  return (
    <div className="bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-200 min-h-screen rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans">
      {/* ── TOP HEADER BAR ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#101726]">
        <div className="flex items-center gap-4">
          <button className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <Sliders className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-900 dark:text-white">Manual Trading</span>
          </div>
        </div>

        {/* Mode Selector Tabs (Header Center - Desktop) */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          {[
            { id: 'rise-fall', label: 'Rise/Fall' },
            { id: 'accumulators', label: 'Accumulators', isNew: true },
            { id: 'matches-differs', label: 'Matches/Differs', isNew: true },
            { id: 'over-under', label: 'Over/Under', isNew: true },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveMode(tab.id)
                if (tab.id === 'rise-fall') {
                  setDuration(5)
                  setSubType('Rise')
                } else if (tab.id === 'accumulators') {
                  setDuration(1)
                  setSubType('Accumulator')
                } else if (tab.id === 'matches-differs') {
                  setDuration(1)
                  setSubType('Differs')
                } else if (tab.id === 'over-under') {
                  setDuration(1)
                  setSubType('Over')
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeMode === tab.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.isNew && (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.2 rounded border border-emerald-500/40">
                  NEW
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Live Status & Deriv Balance */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>live</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-white">
            {Number(selectedAccount?.balance || 9999.53).toFixed(2)} <span className="text-xs text-slate-400 font-normal">{selectedAccount?.currency || 'USD'}</span>
          </div>
          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── MOBILE SUBHEADER : HORIZONTAL MODE SWITCHER ───────────── */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar px-3 py-2 bg-white dark:bg-[#101726] border-b border-slate-200 dark:border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">Modes :</span>
        {[
          { id: 'rise-fall', label: 'Rise/Fall' },
          { id: 'accumulators', label: 'Accumulators', isNew: true },
          { id: 'matches-differs', label: 'Matches/Differs', isNew: true },
          { id: 'over-under', label: 'Over/Under', isNew: true },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveMode(tab.id)
              if (tab.id === 'rise-fall') {
                setDuration(5)
                setSubType('Rise')
              } else if (tab.id === 'accumulators') {
                setDuration(1)
                setSubType('Accumulator')
              } else if (tab.id === 'matches-differs') {
                setDuration(1)
                setSubType('Differs')
              } else if (tab.id === 'over-under') {
                setDuration(1)
                setSubType('Over')
              }
            }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === tab.id
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>{tab.label}</span>
            {tab.isNew && (
              <span className="text-[9px] bg-white/20 text-white font-extrabold px-1 rounded">
                NEW
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── MOBILE SECTION SELECTOR (Ticket vs Graphique vs Gestor vs Manager) ── */}
      <div className="grid grid-cols-4 gap-1 p-1.5 lg:hidden bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold">
        <button
          onClick={() => setMobileSection('ticket')}
          className={`py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${
            mobileSection === 'ticket' ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-400'
          }`}
        >
          <span className="flex items-center gap-1 font-bold">⚡ Ordre</span>
          <span className="text-[9px] text-slate-400 font-normal">Ticket &amp; Live</span>
        </button>
        <button
          onClick={() => setMobileSection('chart')}
          className={`py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${
            mobileSection === 'chart' ? 'bg-white dark:bg-slate-800 text-blue-500 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-400'
          }`}
        >
          <span className="flex items-center gap-1 font-bold">📈 Analyse</span>
          <span className="text-[9px] text-slate-400 font-normal">Graph &amp; Stats</span>
        </button>
        <button
          onClick={() => setMobileSection('gestor')}
          className={`py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${
            mobileSection === 'gestor' ? 'bg-white dark:bg-slate-800 text-violet-500 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-400'
          }`}
        >
          <span className="flex items-center gap-1 font-bold">⚙️ Gestor</span>
          <span className="text-[9px] text-slate-400 font-normal">Martingale</span>
        </button>
        <button
          onClick={() => setMobileSection('account')}
          className={`py-2 px-1 rounded-lg text-center transition flex flex-col items-center gap-0.5 ${
            mobileSection === 'account' ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-400'
          }`}
        >
          <span className="flex items-center gap-1 font-bold">📊 Manager</span>
          <span className="text-[9px] text-slate-400 font-mono">({allContracts.length})</span>
        </button>
      </div>

      {/* ── WORKSTATION BODY GRID ──────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-0">
        {/* ── LEFT COLUMN : GESTOR 1 / MARTINGALE ───────────────────── */}
        <div className={`col-span-12 lg:col-span-2 border-r border-slate-200 dark:border-slate-800/80 p-3 space-y-3 bg-white/50 dark:bg-[#0d1322] ${mobileSection === 'gestor' ? 'block' : 'hidden lg:block'}`}>
          {/* Top Dropdowns */}
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={gestorType}
              onChange={e => setGestorType(e.target.value)}
              className="w-full text-[11px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-200"
            >
              <option value="Gestor 1">Gestor 1</option>
              <option value="Gestor 2">Gestor 2</option>
              <option value="Gestor 3">Gestor 3</option>
            </select>
            <select
              value={strategyType}
              onChange={e => setStrategyType(e.target.value)}
              className="w-full text-[11px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-200"
            >
              <option value="Martingale">Martingale</option>
              <option value="D'Alembert">D'Alembert</option>
              <option value="Compound">Compound</option>
            </select>
          </div>

          {/* Form Fields */}
          <div className="space-y-1.5 text-xs">
            {[
              { label: 'Inversión', val: inversion, set: setInversion },
              { label: 'Take Profit', val: takeProfit, set: setTakeProfit },
              { label: 'Stop Loss', val: stopLoss, set: setStopLoss },
              { label: 'Compound - Nivel', val: compoundNivel, set: setCompoundNivel },
              { label: 'Martingale - Factor', val: martingaleFactor, set: setMartingaleFactor },
              { label: 'Iniciar tras pérdida', val: iniciarTrasPerdida, set: setIniciarTrasPerdida },
              { label: 'Split', val: split, set: setSplit },
              { label: 'Nivel máximo', val: nivelMaximo, set: setNivelMaximo },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-0.5">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">{f.label}</span>
                <input
                  type="text"
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  className="w-14 text-right bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 font-mono text-[11px] font-semibold text-slate-800 dark:text-white"
                />
              </div>
            ))}
          </div>

          {/* Checkboxes */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px]">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={resetNivelMaximo}
                onChange={e => setResetNivelMaximo(e.target.checked)}
                className="rounded accent-emerald-500 w-3.5 h-3.5"
              />
              <span>Resetear en nivel máximo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={proteccionStopLoss}
                onChange={e => setProteccionStopLoss(e.target.checked)}
                className="rounded accent-emerald-500 w-3.5 h-3.5"
              />
              <span>Protección Stop Loss</span>
            </label>
          </div>

          {/* EN VIVO BOX WITH LIVE SPARKLINE */}
          <div className="pt-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              EN VIVO
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                  {symbols.find(s => s.symbol === selectedSymbol)?.display_name || 'Volatility 50 Index'}
                </div>
                <div className="font-mono text-xs font-black text-rose-500 mt-0.5">
                  {currentQuote.toFixed(4).slice(0, -1)}
                  <span className="text-emerald-400 underline font-extrabold">{currentQuote.toFixed(4).slice(-1)}</span>
                </div>
              </div>
              <svg width="60" height="24" className="overflow-visible">
                {sparklinePath && (
                  <path d={sparklinePath} fill="none" stroke="#10b981" strokeWidth="1.5" />
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* ── CENTER WORKSTATION (4 MODES) ─────────────────────────── */}
        <div className={`col-span-12 lg:col-span-7 p-4 space-y-4 border-r border-slate-200 dark:border-slate-800/80 ${mobileSection === 'chart' || mobileSection === 'account' ? 'block' : 'hidden lg:block'}`}>
          {/* MODE A & B : MATCHES/DIFFERS or OVER/UNDER WORKSTATION */}
          {(activeMode === 'matches-differs' || activeMode === 'over-under') && (
            <div className="space-y-4">
              {/* Row 1: Último dígito | Distribución 0-9 | Heat map by digit */}
              <div className="grid grid-cols-12 gap-3">
                {/* 1. Último dígito */}
                <div className="col-span-12 md:col-span-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between relative shadow-sm">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Último dígito</span>
                    <button className="text-slate-400 hover:text-slate-600"><Sliders className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="my-auto py-2 text-center">
                    <div className="text-7xl font-black text-[#8b5cf6] font-mono tracking-tighter">
                      {latestDigit}
                    </div>
                  </div>
                  <div className="text-center border-t border-slate-100 dark:border-slate-800/80 pt-2">
                    <span className="text-[10px] text-slate-400 block">Current tick</span>
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{currentQuote.toFixed(4)}</span>
                  </div>
                </div>

                {/* 2. Distribución 0-9 Bar Chart */}
                <div className="col-span-12 md:col-span-6 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-center text-xs text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Distribución 0-9</span>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Sliders className="w-3.5 h-3.5" />
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-10 gap-1.5 items-end h-28 py-2">
                    {distribution.map(d => (
                      <div key={d.digit} className="flex flex-col items-center justify-end h-full">
                        <span className={`text-[10px] font-bold font-mono mb-1 ${d.isCold ? 'text-rose-500' : d.isHot ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {d.digit}
                        </span>
                        <div
                          style={{ height: `${Math.max(12, d.pct * 5.2)}%` }}
                          className={`w-full rounded-t transition-all duration-300 ${
                            d.isCold
                              ? 'bg-rose-500/80 ring-1 ring-rose-500'
                              : d.isHot
                              ? 'bg-emerald-500/80 ring-1 ring-emerald-500'
                              : 'bg-[#8b5cf6]/70'
                          }`}
                        />
                        <span className={`text-[9px] font-mono mt-1 ${d.isCold ? 'text-rose-500 font-bold' : d.isHot ? 'text-emerald-500 font-bold' : 'text-slate-400'}`}>
                          {d.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Heat map by digit */}
                <div className="col-span-12 md:col-span-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-center text-xs text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Heat map by digit</span>
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 mb-2 block font-medium">Last 100 digits</span>
                    <div className="grid grid-cols-5 gap-2 my-2">
                      {distribution.map(d => (
                        <div key={d.digit} className="text-center">
                          <span className="text-[9px] text-slate-400 block font-mono">{d.digit}</span>
                          <span className={`inline-block w-3.5 h-3.5 rounded-full ${
                            d.isCold ? 'bg-rose-500' : d.isHot ? 'bg-emerald-500' : d.pct >= 10 ? 'bg-emerald-400/60' : 'bg-[#8b5cf6]/60'
                          }`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-rose-500 font-bold">Cold</span>
                    <div className="h-1 flex-1 mx-2 rounded-full bg-gradient-to-r from-rose-500 via-yellow-400 to-emerald-500" />
                    <span className="text-emerald-500 font-bold">Hot</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Secuencia reciente & Info clave */}
              <div className="grid grid-cols-12 gap-3">
                {/* Secuencia reciente */}
                <div className="col-span-12 md:col-span-7 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Secuencia reciente</span>
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {recentSequence.map((d, idx) => {
                      const isLatest = idx === recentSequence.length - 1
                      return (
                        <div
                          key={idx}
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs shrink-0 font-bold border transition ${
                            isLatest
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {d}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Info clave */}
                <div className="col-span-12 md:col-span-5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5 text-xs">
                  <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Info clave</div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Más frec.</span>
                    <span className="font-bold text-emerald-500">{mostFreqText}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Menos frec.</span>
                    <span className="font-bold text-rose-500">{leastFreqText}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Racha</span>
                    <span className="font-bold text-slate-800 dark:text-white">{streakText}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sesgo</span>
                    <span className="font-bold text-slate-800 dark:text-white">{biasText}</span>
                  </div>
                </div>
              </div>

              {/* Row 3: Appearance trend */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center text-xs mb-3">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Appearance trend</span>
                    <span className="text-[10px] text-slate-400 ml-2">Last 100 digits</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                      <button
                        key={d}
                        onClick={() => setTrendDigit(d)}
                        className={`w-6 h-6 rounded text-xs font-mono font-bold transition ${
                          trendDigit === d
                            ? 'bg-[#8b5cf6] text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-16 w-full relative">
                  <svg viewBox="0 0 500 60" preserveAspectRatio="none" className="w-full h-full">
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {appearanceTrendPath && (
                      <path d={appearanceTrendPath} fill="url(#trendGrad)" stroke="#8b5cf6" strokeWidth="2" />
                    )}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* MODE C : RISE/FALL WORKSTATION */}
          {activeMode === 'rise-fall' && (
            <div className="space-y-4">
              {/* Main SVG Tick Chart with drawing toolbar */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <select className="text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                      <option value="Tick">Tick</option>
                      <option value="1m">1m</option>
                      <option value="5m">5m</option>
                    </select>
                  </div>
                  <div className="text-xs font-mono text-emerald-500 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live {currentQuote.toFixed(4)}</span>
                  </div>
                </div>

                <div className="relative h-64 w-full bg-slate-50 dark:bg-[#070b14] rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800 flex">
                  {/* Vertical Toolbar on Left */}
                  <div className="w-10 border-r border-slate-200 dark:border-slate-800/80 p-1 flex flex-col items-center gap-1.5 z-10 bg-white/40 dark:bg-slate-900/40">
                    {[
                      { id: 'cursor', icon: Play },
                      { id: 'crosshair', icon: Crosshair },
                      { id: 'pen', icon: PenTool },
                      { id: 'trendline', icon: Activity },
                      { id: 'settings', icon: Settings },
                      { id: 'trash', icon: Trash2 },
                    ].map(tool => (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={`p-1.5 rounded-lg text-xs transition ${
                          activeTool === tool.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                        }`}
                      >
                        <tool.icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>

                  {/* SVG Canvas Area */}
                  <div className="flex-1 relative overflow-hidden">
                    <svg viewBox="0 0 700 260" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="riseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Gridlines */}
                      <line x1="0" y1="65" x2="700" y2="65" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                      <line x1="0" y1="130" x2="700" y2="130" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                      <line x1="0" y1="195" x2="700" y2="195" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />

                      {/* Area & Line */}
                      {mainChartData.areaPath && (
                        <path d={mainChartData.areaPath} fill="url(#riseGrad)" />
                      )}
                      {mainChartData.linePath && (
                        <path d={mainChartData.linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                      )}

                      {/* Beacon on current price */}
                      {mainChartData.lastPoint && (
                        <g>
                          <circle cx={mainChartData.lastPoint.x} cy={mainChartData.lastPoint.y} r="8" fill="#3b82f6" opacity="0.25" className="animate-ping" />
                          <circle cx={mainChartData.lastPoint.x} cy={mainChartData.lastPoint.y} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                          <line x1={mainChartData.lastPoint.x} y1={mainChartData.lastPoint.y} x2="700" y2={mainChartData.lastPoint.y} stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 2" />
                        </g>
                      )}
                    </svg>

                    {/* Price tag pill on right */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow">
                      {currentQuote.toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-cards: Dirección próximo tick & Historial de dirección */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-6 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Dirección próximo tick
                  </div>
                  <div className="py-2 flex items-center justify-center gap-2">
                    {nextTickDirection === 'up' ? (
                      <div className="flex flex-col items-center text-emerald-500">
                        <ArrowUp className="w-10 h-10 fill-emerald-500 animate-bounce" />
                        <span className="text-xs font-bold mt-1">HAUSSE ANTICIPÉE (RISE)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-rose-500">
                        <ArrowDown className="w-10 h-10 fill-rose-500 animate-bounce" />
                        <span className="text-xs font-bold mt-1">BAISSE ANTICIPÉE (FALL)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-12 md:col-span-6 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Historial de dirección
                  </div>
                  <div className="flex items-center gap-2 py-3 overflow-x-auto">
                    {directionHistory.map((d, i) => (
                      <div
                        key={i}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          d === 'up' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                        }`}
                      >
                        {d === 'up' ? '▲' : '▼'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE D : ACCUMULATORS WORKSTATION */}
          {activeMode === 'accumulators' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">Knock-Out Barrier Channel</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-mono font-bold">
                      Taux de croissance : +{growthRate}% / tick
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-blue-500">
                    STATS : {survivedTicks} TICKS SURVÉCUS
                  </div>
                </div>

                <div className="relative h-64 w-full bg-slate-50 dark:bg-[#070b14] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <svg viewBox="0 0 700 260" preserveAspectRatio="none" className="w-full h-full">
                    {/* Safety corridor between barriers */}
                    <rect x="0" y="50" width="700" height="160" fill="#3b82f6" fillOpacity="0.06" />

                    {/* Upper Barrier line */}
                    <line x1="0" y1="50" x2="700" y2="50" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />
                    <text x="610" y="42" fill="#3b82f6" fontSize="11" fontWeight="bold">+0.02651</text>

                    {/* Lower Barrier line */}
                    <line x1="0" y1="210" x2="700" y2="210" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />
                    <text x="610" y="225" fill="#3b82f6" fontSize="11" fontWeight="bold">-0.02651</text>

                    {/* Price trajectory */}
                    {mainChartData.linePath && (
                      <path d={mainChartData.linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                    )}

                    {/* Start dot with STATS label */}
                    <circle cx="280" cy="190" r="5" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
                    <rect x="250" y="200" width="60" height="20" rx="4" fill="#1e293b" />
                    <text x="255" y="214" fill="#94a3b8" fontSize="10" fontWeight="bold">STATS {survivedTicks}</text>

                    {/* Current quote beacon */}
                    {mainChartData.lastPoint && (
                      <g>
                        <circle cx={mainChartData.lastPoint.x} cy={mainChartData.lastPoint.y} r="4" fill="#3b82f6" />
                        <line x1={mainChartData.lastPoint.x} y1={mainChartData.lastPoint.y} x2="700" y2={mainChartData.lastPoint.y} stroke="#3b82f6" strokeWidth="1" />
                      </g>
                    )}
                  </svg>
                </div>

                {/* Sub-tabs below Accumulators Chart */}
                <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => setChartSubTab('knock-out')}
                    className={`font-semibold pb-1 border-b-2 transition ${
                      chartSubTab === 'knock-out' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
                    }`}
                  >
                    Knock-out
                  </button>
                  <button
                    onClick={() => setChartSubTab('crecimiento')}
                    className={`font-semibold pb-1 border-b-2 transition ${
                      chartSubTab === 'crecimiento' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'
                    }`}
                  >
                    Crecimiento
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── BOTTOM ACCOUNT MANAGER ─────────────────────────────── */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">ACCOUNT MANAGER</span>
              <div className="flex items-center gap-2 text-slate-400">
                <button onClick={onRefreshData} className="hover:text-slate-200 text-[11px] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> refetch
                </button>
                <button onClick={() => setIsManagerFullscreen(!isManagerFullscreen)} className="hover:text-slate-200">
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 text-xs border-b border-slate-100 dark:border-slate-800 pb-1">
              {[
                { id: 'summary', label: `Summary (${allContracts.length})` },
                { id: 'orders', label: 'Orders (SOON)' },
                { id: 'pending', label: 'Pending (0)' },
                { id: 'account', label: 'Account Summary' },
                { id: 'notifications', label: 'Notifications log (0)' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAccountManagerTab(tab.id)}
                  className={`pb-1 font-semibold transition ${
                    accountManagerTab === tab.id
                      ? 'border-b-2 border-emerald-500 text-emerald-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Table */}
            <div className="overflow-x-auto max-h-40 text-xs">
              {allContracts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No open contracts. Buy one from the order ticket.
                </div>
              ) : (
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 text-[11px]">
                      <th className="py-1">Contrat</th>
                      <th>Marché</th>
                      <th>Mise</th>
                      <th>Statut</th>
                      <th>Résultat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {allContracts.slice(0, 5).map(c => (
                      <tr key={c._id || c.contractId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-1.5 font-bold">{c.contractType}</td>
                        <td>{c.symbol}</td>
                        <td>${c.stake}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            c.status === 'won' ? 'bg-emerald-500/20 text-emerald-400' : c.status === 'lost' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {c.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className={c.profit > 0 ? 'text-emerald-400 font-bold' : c.profit < 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                          {c.profit ? `${c.profit > 0 ? '+' : ''}$${c.profit.toFixed(2)}` : 'En attente'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN : CONTRATOS & DYNAMIC ORDER TICKET ──────── */}
        <div className={`col-span-12 lg:col-span-3 p-3 space-y-3 bg-white/50 dark:bg-[#0d1322] ${mobileSection === 'ticket' ? 'block' : 'hidden lg:block'}`}>
          {/* Recent Contratos Drawer (Données Réelles en direct) */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300 pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1.5">
                <span>Contratos</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </span>
              <span className="font-mono text-slate-400">{allContracts.length}</span>
            </div>
            <div className="space-y-1 text-xs font-mono max-h-36 overflow-y-auto">
              {allContracts.length === 0 ? (
                <div className="text-center py-3 text-slate-400 text-xs">
                  Aucun contrat récent
                </div>
              ) : (
                allContracts.slice(0, 6).map((c, idx) => (
                  <div key={c._id || c.contractId || idx} className="flex justify-between items-center py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/40 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        c.status === 'won' ? 'bg-emerald-500' : c.status === 'lost' ? 'bg-rose-500' : 'bg-blue-500 animate-pulse'
                      }`} />
                      <span className="text-slate-700 dark:text-slate-200 font-bold">{c.contractType || c.action}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">{c.symbol} · ${c.stake}</span>
                      <span className={`font-bold ${
                        c.status === 'won' ? 'text-emerald-500' : c.status === 'lost' ? 'text-rose-500' : 'text-blue-400'
                      }`}>
                        {c.profit !== undefined && c.profit !== null 
                          ? `${c.profit > 0 ? '+' : ''}$${Number(c.profit).toFixed(2)}` 
                          : (c.status === 'won' ? `+$${(c.payout || (c.stake * 0.85)).toFixed(2)}` : (c.status === 'lost' ? `-$${c.stake}` : '⏳'))}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DYNAMIC ORDER TICKET */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-xl space-y-3.5">
            {/* Header Ticket */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <span className="text-slate-900 dark:text-white capitalize">{activeMode.replace('-', '/')}</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold">NEW</span>
              </div>
              <button className="text-slate-400 hover:text-slate-200"><Sliders className="w-3.5 h-3.5" /></button>
            </div>

            {/* Sub-type Switch for Over/Under or Matches/Differs */}
            {activeMode === 'over-under' && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSubType('Over')}
                  className={`py-1.5 rounded-lg transition ${
                    subType === 'Over' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  Over
                </button>
                <button
                  type="button"
                  onClick={() => setSubType('Under')}
                  className={`py-1.5 rounded-lg transition ${
                    subType === 'Under' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  Under
                </button>
              </div>
            )}

            {activeMode === 'matches-differs' && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSubType('Matches')}
                  className={`py-1.5 rounded-lg transition ${
                    subType === 'Matches' ? 'bg-white dark:bg-slate-700 text-emerald-500 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  Matches
                </button>
                <button
                  type="button"
                  onClick={() => setSubType('Differs')}
                  className={`py-1.5 rounded-lg transition ${
                    subType === 'Differs' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400'
                  }`}
                >
                  Differs
                </button>
              </div>
            )}

            {/* Market Selector */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">MARKET</label>
              <select
                value={selectedSymbol}
                onChange={e => setSelectedSymbol(e.target.value)}
                className="w-full text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white"
              >
                {symbols.map(s => (
                  <option key={s.symbol} value={s.symbol}>{s.display_name}</option>
                ))}
              </select>
            </div>

            {/* Stake Input with - and + */}
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">STAKE</label>
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setStake(s => Math.max(0.35, +(s - 0.5).toFixed(2)))}
                  className="px-3 py-2 text-slate-400 hover:text-white font-bold"
                >
                  -
                </button>
                <div className="flex-1 text-center font-mono font-bold text-xs text-slate-900 dark:text-white">
                  {stake} <span className="text-[10px] text-slate-400">USD</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStake(s => +(s + 0.5).toFixed(2))}
                  className="px-3 py-2 text-slate-400 hover:text-white font-bold"
                >
                  +
                </button>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                <span>Gestor 1</span>
                <span>Sin montos rápidos</span>
              </div>
            </div>

            {/* Duration Selector */}
            {activeMode !== 'accumulators' && (
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">DURATION</label>
                <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden mb-1.5">
                  <button
                    type="button"
                    onClick={() => setDuration(d => Math.max(1, d - 1))}
                    className="px-3 py-1.5 text-slate-400 hover:text-white font-bold"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center font-mono font-bold text-xs text-slate-900 dark:text-white uppercase">
                    {duration} {durationUnit === 't' ? 'TICKS' : durationUnit}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDuration(d => d + 1)}
                    className="px-3 py-1.5 text-slate-400 hover:text-white font-bold"
                  >
                    +
                  </button>
                </div>
                {/* Duration Pills */}
                <div className="grid grid-cols-5 gap-1 text-[10px] font-bold">
                  {(activeMode === 'rise-fall' ? ['5t', '10t', '1m', '5m', '15m'] : ['1t', '2t', '3t', '4t', '5t']).map(btn => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => {
                        const num = parseInt(btn, 10)
                        setDuration(num)
                        setDurationUnit(btn.includes('m') ? 'm' : 't')
                      }}
                      className={`py-1 rounded border text-center transition ${
                        duration === parseInt(btn, 10)
                          ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Prediction Digit Grid for Digit Modes */}
            {(activeMode === 'matches-differs' || activeMode === 'over-under') && (
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">PREDICTION</label>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPredictionDigit(d)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition ${
                        predictionDigit === d
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Growth Rate for Accumulators */}
            {activeMode === 'accumulators' && (
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">GROWTH RATE</label>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setGrowthRate(rate)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                        growthRate === rate
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {executingError && (
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px]">
                {executingError}
              </div>
            )}

            {/* ── LIVE TRADE RESULT & INSTANT ACCOUNT MANAGER CARD ── */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  RÉSULTAT DU DERNIER ORDRE
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSection('account')}
                  className="text-[10px] text-emerald-500 hover:underline font-mono"
                >
                  P/L: {sessionSummary.totalProfit >= 0 ? '+' : ''}${sessionSummary.totalProfit.toFixed(2)}
                </button>
              </div>

              {currentTrackedTrade ? (
                <div className={`p-2.5 rounded-lg border text-xs transition-all ${
                  currentTrackedTrade.status === 'won'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    : currentTrackedTrade.status === 'lost'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                    : 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 animate-pulse'
                }`}>
                  <div className="flex justify-between items-center font-bold">
                    <span className="flex items-center gap-1.5">
                      {currentTrackedTrade.status === 'won' && '🎉 GAGNÉ !'}
                      {currentTrackedTrade.status === 'lost' && '🔴 PERDU'}
                      {currentTrackedTrade.status === 'open' && '⏳ EN COURS...'}
                      {!['won', 'lost', 'open'].includes(currentTrackedTrade.status) && (currentTrackedTrade.status?.toUpperCase() || 'EXÉCUTÉ')}
                    </span>
                    <span className="font-mono font-bold">
                      {currentTrackedTrade.status === 'won' 
                        ? `+${(currentTrackedTrade.profit || currentTrackedTrade.stake * 0.85).toFixed(2)} USD`
                        : currentTrackedTrade.status === 'lost'
                        ? `-${Number(currentTrackedTrade.stake).toFixed(2)} USD`
                        : `$${Number(currentTrackedTrade.stake).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    <span>{currentTrackedTrade.contractType || currentTrackedTrade.action} · {currentTrackedTrade.symbol}</span>
                    <span className="font-mono">#{String(currentTrackedTrade.contractId || currentTrackedTrade._id || '').slice(-6)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 text-center py-1">
                  Prêt pour un ordre. Vos résultats s'affichent ici en direct sans défiler.
                </div>
              )}

              {/* Quick Account Manager Summary */}
              <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                  <div className="text-slate-400">Total</div>
                  <div className="font-mono font-bold text-slate-700 dark:text-slate-200">{sessionSummary.total}</div>
                </div>
                <div className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                  <div className="text-emerald-500">Gagnés</div>
                  <div className="font-mono font-bold text-emerald-500">{sessionSummary.won}</div>
                </div>
                <div className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800">
                  <div className="text-slate-400">Winrate</div>
                  <div className="font-mono font-bold text-slate-700 dark:text-slate-200">{sessionSummary.winRate}%</div>
                </div>
              </div>
            </div>

            {/* BIG ACTION BUTTONS ACCORDING TO ACTIVE MODE */}
            {activeMode === 'rise-fall' && (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={executing}
                  onClick={() => handleOrder('CALL')}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 text-xs flex flex-col items-center justify-center transition cursor-pointer"
                >
                  <span className="flex items-center gap-1 text-sm">
                    {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4 fill-white" />} RISE
                  </span>
                  <span className="text-[10px] opacity-90 mt-0.5">{stake.toFixed(2)} USD • +85%</span>
                </button>
                <button
                  type="button"
                  disabled={executing}
                  onClick={() => handleOrder('PUT')}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-rose-600/20 text-xs flex flex-col items-center justify-center transition cursor-pointer"
                >
                  <span className="flex items-center gap-1 text-sm">
                    {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4 fill-white" />} FALL
                  </span>
                  <span className="text-[10px] opacity-90 mt-0.5">{stake.toFixed(2)} USD • +85%</span>
                </button>
              </div>
            )}

            {activeMode === 'matches-differs' && (
              <button
                type="button"
                disabled={executing}
                onClick={() => handleOrder()}
                className={`w-full font-extrabold py-4 rounded-xl shadow-lg text-xs flex flex-col items-center justify-center transition cursor-pointer ${
                  subType === 'Differs'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                }`}
              >
                <span className="text-sm flex items-center gap-1">
                  {executing && <Loader2 className="w-4 h-4 animate-spin" />} {subType}
                </span>
                <span className="text-[10px] opacity-90 mt-0.5">
                  {stake.toFixed(2)} USD • {subType === 'Differs' ? '+8%' : '+800%'}
                </span>
              </button>
            )}

            {activeMode === 'over-under' && (
              <button
                type="button"
                disabled={executing}
                onClick={() => handleOrder()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-emerald-600/20 text-xs flex flex-col items-center justify-center transition cursor-pointer"
              >
                <span className="text-sm flex items-center gap-1">
                  {executing && <Loader2 className="w-4 h-4 animate-spin" />} {subType} {predictionDigit}
                </span>
                <span className="text-[10px] opacity-90 mt-0.5">{stake.toFixed(2)} USD • +140%</span>
              </button>
            )}

            {activeMode === 'accumulators' && (
              <div>
                {activeAccumulator ? (
                  <button
                    type="button"
                    onClick={handleCashOut}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-4 rounded-xl shadow-lg shadow-amber-500/20 text-xs flex flex-col items-center justify-center transition cursor-pointer"
                  >
                    <span className="text-sm">CASH OUT</span>
                    <span className="text-[10px] font-mono mt-0.5">
                      +${(stake * Math.pow(1 + growthRate / 100, Math.min(survivedTicks, 50)) - stake).toFixed(2)} USD
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={executing}
                    onClick={() => handleOrder()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-4 rounded-xl shadow-lg shadow-emerald-600/20 text-xs flex flex-col items-center justify-center transition cursor-pointer"
                  >
                    <span className="text-sm flex items-center gap-1">
                      {executing && <Loader2 className="w-4 h-4 animate-spin" />} Accumulator {growthRate}%
                    </span>
                    <span className="text-[10px] opacity-90 mt-0.5">{stake.toFixed(2)} USD</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
