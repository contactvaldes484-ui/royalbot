import React, { useState, useEffect, useRef } from 'react'
import {
  Play, Square, RefreshCw, FolderOpen, Save, Download, Code2,
  Undo, Redo, ZoomIn, ZoomOut, Search, Plus, Trash2, Sliders,
  ShieldCheck, UploadCloud, CheckCircle2, AlertCircle, Copy,
  Check, FileCode, Layers, Sparkles, Settings, Eye, Clock, X,
  TrendingUp, TrendingDown, HelpCircle, BarChart3, Bot, ChevronRight,
  ChevronDown, Cpu, Zap, Activity
} from 'lucide-react'
import { adminDerivAPI } from '../../lib/api'

// Marchés Synthétiques Deriv
const SYNTHETIC_MARKETS = [
  { value: 'R_10', label: 'Volatility 10 Index' },
  { value: 'R_25', label: 'Volatility 25 Index' },
  { value: 'R_50', label: 'Volatility 50 Index' },
  { value: 'R_75', label: 'Volatility 75 Index' },
  { value: 'R_100', label: 'Volatility 100 Index' },
  { value: '1HZ10V', label: 'Volatility 10 (1s) Index' },
  { value: '1HZ25V', label: 'Volatility 25 (1s) Index' },
  { value: '1HZ50V', label: 'Volatility 50 (1s) Index' },
  { value: '1HZ75V', label: 'Volatility 75 (1s) Index' },
  { value: '1HZ100V', label: 'Volatility 100 (1s) Index' },
  { value: 'BOOM1000', label: 'Boom 1000 Index' },
  { value: 'CRASH1000', label: 'Crash 1000 Index' },
  { value: 'JUMP_10', label: 'Jump 10 Index' },
  { value: 'JUMP_100', label: 'Jump 100 Index' },
]

// Types de Trading Deriv
const TRADE_TYPES = [
  { value: 'digits_even_odd', label: 'Digits > Even/Odd', category: 'Digits' },
  { value: 'digits_over_under', label: 'Digits > Over/Under', category: 'Digits' },
  { value: 'digits_matches_differs', label: 'Digits > Matches/Differs', category: 'Digits' },
  { value: 'rise_fall', label: 'Up/Down > Rise/Fall', category: 'Up/Down' },
  { value: 'high_low', label: 'High/Low > Higher/Lower', category: 'Up/Down' },
  { value: 'runs', label: 'Runs > Only Ups / Only Downs', category: 'Runs' },
  { value: 'accumulators', label: 'Accumulators (Growth)', category: 'Accumulator' },
]

// Templates de Stratégie Rapide
const QUICK_STRATEGIES = [
  {
    id: 'unicorn_only_up_down',
    name: 'Unicorn Only Up Down BinaryBot VH',
    market: 'R_100',
    tradeType: 'runs',
    contractType: 'RUNHIGH',
    stake: 0.8,
    takeProfit: 15,
    stopLoss: 30,
    martingale: 2.0,
    duration: 2,
    durationUnit: 't',
    barrier: '',
    description: 'Stratégie Unicorn Run High/Low avec filtre Virtual Hook pour capter les fortes poussées directionnelles.'
  },
  {
    id: 'even_odd_reversal',
    name: 'Even / Odd Pattern Reversal (TraderScheme)',
    market: 'R_25',
    tradeType: 'digits_even_odd',
    contractType: 'Both',
    stake: 0.5,
    takeProfit: 10,
    stopLoss: 50,
    martingale: 2.0,
    duration: 1,
    durationUnit: 't',
    barrier: '',
    description: 'Détecte 4 chiffres consécutifs pairs pour acheter Odd, et inversement avec Recovery Purchase automatique.'
  },
  {
    id: 'over_2',
    name: 'Digit Over 2 (Taux de réussite 70%)',
    market: 'R_100',
    tradeType: 'digits_over_under',
    contractType: 'DIGITOVER',
    stake: 0.8,
    takeProfit: 10,
    stopLoss: 30,
    martingale: 2.2,
    duration: 1,
    durationUnit: 't',
    barrier: '2',
    description: 'Achat de contrats DIGITOVER 2 sur Volatility 100 avec analyse des patterns et Martingale de sécurité.'
  },
  {
    id: 'virtual_hook_vh',
    name: 'Virtual Hook Loss Filter (Zéro Perte Réelle)',
    market: 'R_100',
    tradeType: 'digits_matches_differs',
    contractType: 'DIGITDIFF',
    stake: 1.0,
    takeProfit: 25,
    stopLoss: 50,
    martingale: 2.0,
    duration: 1,
    durationUnit: 't',
    barrier: '5',
    virtualHook: { enabled: true, trigger: 3, startWhen: 'loss', stake: 0.5 },
    description: 'Simule 3 pertes consécutives virtuelles en tâche de fond avant d\'engager un ordre réel sur le compte Deriv.'
  }
]

export default function BotBuilder({ initialBot, onBotPublished }) {
  // Mode d'affichage :
  // 'blocks' = Vue Deriv DBot Blockly (Capture 2)
  // 'cards'  = Vue TraderScheme Cartes Paramètres (Capture 1)
  // 'code'   = Inspecteur Code XML / JSON
  const [viewMode, setViewMode] = useState('blocks')
  const [zoomLevel, setZoomLevel] = useState(100)
  const [searchBlock, setSearchBlock] = useState('')
  const [activeBlocksMenu, setActiveBlocksMenu] = useState('trade_params')
  const [isRunning, setIsRunning] = useState(false)
  const [executionSpeed, setExecutionSpeed] = useState('FAST')
  const [currentGmt, setCurrentGmt] = useState('')
  const [language, setLanguage] = useState('EN')

  // 1. Paramètres de Trade (Block 1 - Trade parameters)
  const [marketCategory, setMarketCategory] = useState('synthetic_index')
  const [marketSubcat, setMarketSubcat] = useState('random_index')
  const [selectedMarket, setSelectedMarket] = useState('R_25')
  const [alternateMarkets, setAlternateMarkets] = useState(false)
  const [alternateRuns, setAlternateRuns] = useState(1)
  const [autoScanMarkets, setAutoScanMarkets] = useState(false)
  const [tradeType, setTradeType] = useState('digits_even_odd')
  const [contractType, setContractType] = useState('Both')
  const [candleInterval, setCandleInterval] = useState('1 minute')
  const [restartOnError, setRestartOnError] = useState(false)
  const [restartLastTradeOnError, setRestartLastTradeOnError] = useState(true)
  const [recoveryModeEnabled, setRecoveryModeEnabled] = useState(true)

  // 2. Paramètres du Bot / Run Once at Start (Block 2 - Bot Parameters)
  const [botName, setBotName] = useState('Unicorn Only Up Down BinaryBot')
  const [stake, setStake] = useState('0.8')
  const [currency, setCurrency] = useState('USD')
  const [takeProfit, setTakeProfit] = useState('10')
  const [stopLoss, setStopLoss] = useState('30')
  const [martingaleEnabled, setMartingaleEnabled] = useState(true)
  const [martingaleFactor, setMartingaleFactor] = useState('2')
  const [duration, setDuration] = useState('1')
  const [durationUnit, setDurationUnit] = useState('Ticks')
  const [barrier, setBarrier] = useState('2')
  const [runsLimit, setRunsLimit] = useState('0')

  // Virtual Hook (VH Settings)
  const [showVhModal, setShowVhModal] = useState(false)
  const [vhEnabled, setVhEnabled] = useState(false)
  const [vhTrigger, setVhTrigger] = useState(3)
  const [vhStartWhen, setVhStartWhen] = useState('loss')
  const [vhStake, setVhStake] = useState(0.5)

  // 3. Conditions d'Achat Initial (Block 3 - Initial Purchase)
  const [initialAnalysisEnabled, setInitialAnalysisEnabled] = useState(true)
  const [initialAnalysisMode, setInitialAnalysisMode] = useState('Pattern Analysis')
  const [initialSignalCheck, setInitialSignalCheck] = useState('On Every Trade')
  const [initialConditions, setInitialConditions] = useState([
    {
      id: 'c1',
      type: 'IF',
      lastDigitsCount: 1,
      operator: 'less or equal to',
      targetDigit: 1,
      purchaseAction: 'DIGITOVER',
      prediction: 2,
      previewPattern: [7]
    },
    {
      id: 'c2',
      type: 'ELSE IF',
      lastDigitsCount: 1,
      operator: 'greater or equal to',
      targetDigit: 8,
      purchaseAction: 'DIGITUNDER',
      prediction: 7,
      previewPattern: [7]
    }
  ])

  // 4. Conditions d'Achat en Récupération (Block 4 - Recovery Purchase / Restart Trading)
  const [recoveryAnalysisEnabled, setRecoveryAnalysisEnabled] = useState(true)
  const [recoveryAnalysisMode, setRecoveryAnalysisMode] = useState('Pattern Analysis')
  const [recoverySignalCheckTrades, setRecoverySignalCheckTrades] = useState(3)
  const [recoveryConditions, setRecoveryConditions] = useState([
    {
      id: 'r1',
      type: 'IF',
      lastDigitsCount: 4,
      operator: 'all even',
      targetDigit: 0,
      purchaseAction: 'Odd',
      prediction: '',
      previewPattern: [2, 4, 4, 7]
    },
    {
      id: 'r2',
      type: 'ELSE IF',
      lastDigitsCount: 4,
      operator: 'all odd',
      targetDigit: 0,
      purchaseAction: 'Even',
      prediction: '',
      previewPattern: [2, 4, 4, 7]
    }
  ])

  // Restart Conditions (Block 4)
  const [restartRecoveryMode, setRestartRecoveryMode] = useState('Result is Loss')
  const [restartOnWinAction, setRestartOnWinAction] = useState('set Stake to initial stake')

  // Patterns en direct simulés
  const [livePatternLast1, setLivePatternLast1] = useState(7)
  const [livePatternLast4, setLivePatternLast4] = useState([2, 4, 4, 7])

  // Code XML / JSON Brut & Synchronisation
  const [rawCode, setRawCode] = useState('')
  const [codeType, setCodeType] = useState('xml')
  const [codeCopied, setCodeCopied] = useState(false)
  const [parseError, setParseError] = useState('')

  // Publication dans le catalogue
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishPlanTier, setPublishPlanTier] = useState('all')
  const [publishDescription, setPublishDescription] = useState('')
  const [publishWinRate, setPublishWinRate] = useState('82-88%')
  const [publishing, setPublishing] = useState(false)
  const [publishSuccessMsg, setPublishSuccessMsg] = useState('')
  const [publishErrorMsg, setPublishErrorMsg] = useState('')

  // Simulation / Exécution en direct
  const [simStats, setSimStats] = useState({
    runs: 0,
    wins: 0,
    losses: 0,
    profit: 0,
    currentStake: 0.8,
    statusText: 'Bot is not running'
  })

  // Modals additionnels
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)

  const fileInputRef = useRef(null)
  const simTimerRef = useRef(null)

  // Pré-remplissage si initialBot fourni
  useEffect(() => {
    if (initialBot) {
      if (initialBot.fileContent) {
        loadBotFromFileContent(initialBot.fileContent, initialBot.fileName || `${initialBot.name}.xml`)
      } else {
        if (initialBot.name) setBotName(initialBot.name)
        if (initialBot.symbols?.[0]) setSelectedMarket(initialBot.symbols[0])
        if (initialBot.contractType) setContractType(initialBot.contractType)
        if (initialBot.defaultSettings) {
          const s = initialBot.defaultSettings
          if (s.initialStake) setStake(String(s.initialStake))
          if (s.takeProfit) setTakeProfit(String(s.takeProfit))
          if (s.stopLoss) setStopLoss(String(s.stopLoss))
          if (s.martingaleMultiplier) setMartingaleFactor(String(s.martingaleMultiplier))
          if (s.duration) setDuration(String(s.duration))
          if (s.barrier) setBarrier(String(s.barrier))
          if (s.virtualHook) {
            setVhEnabled(Boolean(s.virtualHook.enabled))
            setVhTrigger(s.virtualHook.trigger || 3)
            setVhStartWhen(s.virtualHook.startWhen || 'loss')
            setVhStake(s.virtualHook.stake || 0.5)
          }
        }
      }
    }
  }, [initialBot])

  // Horloge GMT
  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const str = now.toISOString().replace('T', ' ').slice(0, 19) + ' GMT'
      setCurrentGmt(str)
    }
    updateClock()
    const t = setInterval(updateClock, 1000)
    return () => clearInterval(t)
  }, [])

  // Mise à jour continue du code XML Deriv officiel
  useEffect(() => {
    generateXmlFromState()
  }, [
    botName, selectedMarket, contractType, tradeType, stake, takeProfit, stopLoss,
    martingaleEnabled, martingaleFactor, duration, durationUnit, barrier,
    vhEnabled, vhTrigger, vhStartWhen, vhStake, initialConditions, recoveryConditions,
    alternateMarkets, autoScanMarkets, restartOnError, restartLastTradeOnError,
    restartRecoveryMode
  ])

  // Simulation de trading en direct lors du clic sur Run
  useEffect(() => {
    if (isRunning) {
      setSimStats(prev => ({
        ...prev,
        currentStake: parseFloat(stake) || 0.8,
        statusText: `Bot running on ${selectedMarket} (Fast Tick Simulation)`
      }))

      simTimerRef.current = setInterval(() => {
        // Génère un nouveau digit simulé (0-9)
        const nextDigit = Math.floor(Math.random() * 10)
        setLivePatternLast1(nextDigit)
        setLivePatternLast4(prev => [...prev.slice(1), nextDigit])

        // Détermine issue du trade (probabilité réaliste de gain ~75-80%)
        const isWin = Math.random() < 0.76
        setSimStats(prev => {
          const currentStake = prev.currentStake
          const profitDelta = isWin ? +(currentStake * 0.95) : -currentStake
          const newProfit = Math.round((prev.profit + profitDelta) * 100) / 100
          const newRuns = prev.runs + 1
          const newWins = prev.wins + (isWin ? 1 : 0)
          const newLosses = prev.losses + (isWin ? 0 : 1)

          // Martingale
          let nextStake = parseFloat(stake) || 0.8
          if (!isWin && martingaleEnabled) {
            nextStake = Math.round(currentStake * (parseFloat(martingaleFactor) || 2) * 100) / 100
          }

          // Vérification Take Profit ou Stop Loss
          const tpNum = parseFloat(takeProfit) || 10
          const slNum = parseFloat(stopLoss) || 30
          if (newProfit >= tpNum) {
            setIsRunning(false)
            return {
              ...prev,
              runs: newRuns,
              wins: newWins,
              losses: newLosses,
              profit: newProfit,
              statusText: `🎯 Take Profit atteint (+${newProfit} USD) ! Robot arrêté.`
            }
          }
          if (newProfit <= -slNum) {
            setIsRunning(false)
            return {
              ...prev,
              runs: newRuns,
              wins: newWins,
              losses: newLosses,
              profit: newProfit,
              statusText: `🛑 Stop Loss atteint (${newProfit} USD). Robot arrêté.`
            }
          }

          return {
            runs: newRuns,
            wins: newWins,
            losses: newLosses,
            profit: newProfit,
            currentStake: nextStake,
            statusText: `Exécution: Trade #${newRuns} (${isWin ? '✅ WIN' : '❌ LOSS'}) | P/L: ${newProfit >= 0 ? '+' : ''}${newProfit} USD`
          }
        })
      }, executionSpeed === 'FAST' ? 1800 : 3500)
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current)
      setSimStats(prev => ({
        ...prev,
        statusText: prev.runs > 0 ? `Bot arrêté (Total ${prev.runs} trades, P/L: ${prev.profit >= 0 ? '+' : ''}${prev.profit} USD)` : 'Bot is not running'
      }))
    }

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current)
    }
  }, [isRunning, executionSpeed, stake, takeProfit, stopLoss, martingaleEnabled, martingaleFactor, selectedMarket])

  function generateXmlFromState() {
    const xml = `<xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
  <variables>
    <variable type="" id="Stake">Stake</variable>
    <variable type="" id="TakeProfit">Take Profit</variable>
    <variable type="" id="StopLoss">Stop Loss</variable>
    <variable type="" id="Martingale">Martingale Factor</variable>
    <variable type="" id="Runs">Runs Count</variable>
  </variables>
  <!-- 1. TRADE PARAMETERS -->
  <block type="trade_definition" id="trade_def_royalbot" x="20" y="20">
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_market" id="market_block">
        <field name="MARKET_LIST">${marketCategory}</field>
        <field name="SUBMARKET_LIST">${marketSubcat}</field>
        <field name="SYMBOL_LIST">${selectedMarket}</field>
        <next>
          <block type="trade_definition_tradetype" id="tradetype_block">
            <field name="TRADETYPECAT_LIST">${tradeType.split('_')[0]}</field>
            <field name="TRADETYPE_LIST">${contractType}</field>
            <next>
              <block type="trade_definition_candleinterval" id="candle_block">
                <field name="CANDLEINTERVAL_LIST">${candleInterval === '1 minute' ? '60' : '120'}</field>
                <next>
                  <block type="trade_definition_restartbuysell" id="restart_block">
                    <field name="TIME_MACHINE_ENABLED">${restartOnError ? 'TRUE' : 'FALSE'}</field>
                    <field name="RESTARTONERROR">${restartLastTradeOnError ? 'TRUE' : 'FALSE'}</field>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="SUBMARKET">
      <block type="trade_definition_tradeoptions" id="trade_opts">
        <field name="DURATIONTYPE_LIST">${durationUnit === 'Ticks' ? 't' : 'm'}</field>
        <value name="DURATION">
          <shadow type="math_number"><field name="NUM">${duration}</field></shadow>
        </value>
        <value name="AMOUNT">
          <shadow type="math_number"><field name="NUM">${stake}</field></shadow>
        </value>
        ${barrier ? `<value name="PREDICTION"><shadow type="math_number"><field name="NUM">${barrier}</field></shadow></value>` : ''}
      </block>
    </statement>
  </block>
  <!-- RUN ONCE AT START (BOT PARAMETERS) -->
  <block type="trade_definition_initialization" id="init_block" x="480" y="20">
    <statement name="INITIALIZATION">
      <block type="variables_set">
        <field name="VAR" id="Stake">Stake</field>
        <value name="VALUE"><shadow type="math_number"><field name="NUM">${stake}</field></shadow></value>
        <next>
          <block type="variables_set">
            <field name="VAR" id="Martingale">Martingale Factor</field>
            <value name="VALUE"><shadow type="math_number"><field name="NUM">${martingaleFactor}</field></shadow></value>
            <next>
              <block type="variables_set">
                <field name="VAR" id="TakeProfit">Take Profit</field>
                <value name="VALUE"><shadow type="math_number"><field name="NUM">${takeProfit}</field></shadow></value>
                <next>
                  <block type="variables_set">
                    <field name="VAR" id="StopLoss">Stop Loss</field>
                    <value name="VALUE"><shadow type="math_number"><field name="NUM">${stopLoss}</field></shadow></value>
                    <next>
                      <block type="variables_set">
                        <field name="VAR" id="Runs">Runs Count</field>
                        <value name="VALUE"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
  <!-- VIRTUAL HOOK CONFIGURATION -->
  <block type="virtualhook" id="vh_block" x="20" y="450">
    <field name="VH_STATE_LIST">${vhEnabled ? 'enabled' : 'disabled'}</field>
    <value name="VH_TRIGGER"><shadow type="math_number"><field name="NUM">${vhTrigger}</field></shadow></value>
    <field name="VH_STARTWHEN_LIST">${vhStartWhen}</field>
    <value name="VH_STAKE"><shadow type="math_number"><field name="NUM">${vhStake}</field></shadow></value>
  </block>
  <!-- 4. RESTART TRADING CONDITIONS -->
  <block type="after_purchase" id="restart_conditions" x="480" y="450">
    <statement name="AFTERPURCHASE_STACK">
      <block type="trade_again">
        <field name="RECOVERY_MODE">${restartRecoveryMode}</field>
      </block>
    </statement>
  </block>
</xml>`
    setRawCode(xml)
  }

  function applyQuickStrategy(strat) {
    setSelectedMarket(strat.market)
    setTradeType(strat.tradeType)
    setContractType(strat.contractType)
    setStake(String(strat.stake))
    setTakeProfit(String(strat.takeProfit))
    setStopLoss(String(strat.stopLoss))
    setMartingaleFactor(String(strat.martingale))
    setDuration(String(strat.duration))
    setDurationUnit(strat.durationUnit === 't' ? 'Ticks' : 'Minutes')
    setBarrier(strat.barrier || '')
    setBotName(strat.name)
    setPublishDescription(strat.description || '')
    if (strat.virtualHook) {
      setVhEnabled(strat.virtualHook.enabled)
      setVhTrigger(strat.virtualHook.trigger)
      setVhStartWhen(strat.virtualHook.startWhen)
      setVhStake(strat.virtualHook.stake)
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result
      if (typeof content !== 'string') return
      loadBotFromFileContent(content, file.name)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function loadBotFromFileContent(content, fileName = 'robot.xml') {
    setParseError('')
    setRawCode(content)

    try {
      const trimmed = content.trim()
      if (trimmed.startsWith('{') || fileName.endsWith('.json')) {
        const data = JSON.parse(trimmed)
        setCodeType('json')
        if (data.name) setBotName(data.name)
        if (data.symbol) setSelectedMarket(data.symbol)
        if (data.contractType) setContractType(data.contractType)
        if (data.stake || data.initialStake) setStake(String(data.stake || data.initialStake))
        if (data.takeProfit) setTakeProfit(String(data.takeProfit))
        if (data.stopLoss) setStopLoss(String(data.stopLoss))
        if (data.martingaleMultiplier || data.martingaleFactor) setMartingaleFactor(String(data.martingaleMultiplier || data.martingaleFactor))
        if (data.duration) setDuration(String(data.duration))
        if (data.barrier) setBarrier(String(data.barrier))
        if (data.virtualHook) {
          setVhEnabled(Boolean(data.virtualHook.enabled))
          setVhTrigger(data.virtualHook.trigger || 3)
          setVhStartWhen(data.virtualHook.startWhen || 'loss')
          setVhStake(data.virtualHook.stake || 0.5)
        }
      } else {
        setCodeType('xml')
        const nameMatch = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
        setBotName(nameMatch)

        const symMatch = content.match(/<field\s+name=["']SYMBOL_LIST["']>([^<]+)<\/field>/i)
          || content.match(/<field\s+name=["']submarket["']>([^<]+)<\/field>/i)
        if (symMatch && symMatch[1]) setSelectedMarket(symMatch[1].trim())

        const purMatch = content.match(/<field\s+name=["']PURCHASE_LIST["']>([^<]+)<\/field>/i)
          || content.match(/<field\s+name=["']TYPE_LIST["']>([^<]+)<\/field>/i)
          || content.match(/<field\s+name=["']TRADETYPE_LIST["']>([^<]+)<\/field>/i)
        if (purMatch && purMatch[1]) setContractType(purMatch[1].trim())

        const stakeMatch = content.match(/name=["']AMOUNT["'][^>]*>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (stakeMatch && stakeMatch[1]) setStake(stakeMatch[1].trim())

        const tpMatch = content.match(/(?:take[_\s]?profit|target[_\s]?profit)[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (tpMatch && tpMatch[1]) setTakeProfit(tpMatch[1].trim())

        const slMatch = content.match(/(?:stop[_\s]?loss|max[_\s]?loss)[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (slMatch && slMatch[1]) setStopLoss(slMatch[1].trim())

        const martMatch = content.match(/(?:martingale|multiplier|factor)[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (martMatch && martMatch[1]) setMartingaleFactor(martMatch[1].trim())

        const durMatch = content.match(/name=["']DURATION["'][^>]*>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (durMatch && durMatch[1]) setDuration(durMatch[1].trim())

        const predMatch = content.match(/name=["'](?:PREDICTION|BARRIEROFFSET|BARRIER)["'][^>]*>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (predMatch && predMatch[1]) setBarrier(predMatch[1].trim())

        if (content.includes('type="virtualhook"') || content.includes('VH_STATE_LIST')) {
          setVhEnabled(!content.includes('<field name="VH_STATE_LIST">disabled</field>'))
          const vhTrig = content.match(/<value\s+name=["']VH_TRIGGER["']>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
          if (vhTrig && vhTrig[1]) setVhTrigger(parseInt(vhTrig[1], 10) || 3)
          const vhWhen = content.match(/<field\s+name=["']VH_STARTWHEN_LIST["']>([^<]+)<\/field>/i)
          if (vhWhen && vhWhen[1]) setVhStartWhen(vhWhen[1].trim())
        }
      }
    } catch (err) {
      setParseError('Avertissement : ' + err.message)
    }
  }

  function handleDownloadXml() {
    const blob = new Blob([rawCode], { type: 'application/xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${botName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'deriv_bot'}.xml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleSyncCodeToVisual() {
    loadBotFromFileContent(rawCode, codeType === 'json' ? 'robot.json' : 'robot.xml')
    setViewMode('blocks')
  }

  async function handlePublishToUsers() {
    setPublishing(true)
    setPublishErrorMsg('')
    setPublishSuccessMsg('')

    try {
      const slug = (botName + '-' + Date.now().toString().slice(-4))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const payload = {
        name: botName,
        slug,
        contractType: contractType || 'DIGITOVER',
        symbols: [selectedMarket],
        tier: publishPlanTier,
        strategyType: 'bot_builder_custom',
        defaultSettings: {
          initialStake: parseFloat(stake) || 0.8,
          maxStake: (parseFloat(stake) || 0.8) * 25,
          takeProfit: parseFloat(takeProfit) || 10,
          stopLoss: parseFloat(stopLoss) || 30,
          martingaleMultiplier: parseFloat(martingaleFactor) || 2,
          martingaleEnabled,
          duration: parseInt(duration, 10) || 1,
          durationUnit: durationUnit === 'Ticks' ? 't' : 'm',
          barrier: barrier || undefined,
          virtualHook: {
            enabled: vhEnabled,
            trigger: vhTrigger,
            startWhen: vhStartWhen,
            stake: vhStake
          }
        },
        winRate: publishWinRate,
        badge: 'Bot Builder Studio',
        fileName: `${slug}.xml`,
        fileType: 'xml',
        fileContent: rawCode,
        description: publishDescription || `Robot créé et configuré dans le Deriv Bot Builder Studio (${contractType} sur ${selectedMarket})`
      }

      await adminDerivAPI.createBot(payload)
      setPublishSuccessMsg(`🎉 Robot « ${botName} » publié avec succès ! Il est maintenant accessible et prêt à être lancé par les utilisateurs dans leur espace Deriv.`)
      if (onBotPublished) onBotPublished()
      setTimeout(() => {
        setShowPublishModal(false)
        setPublishSuccessMsg('')
      }, 2500)
    } catch (err) {
      setPublishErrorMsg(err.response?.data?.error || err.message || 'Erreur lors de la publication du robot.')
    } finally {
      setPublishing(false)
    }
  }

  // Assistant IA pour générer une stratégie Deriv
  function handleGenerateAiStrategy() {
    setAiGenerating(true)
    setTimeout(() => {
      setAiGenerating(false)
      setShowAiModal(false)
      setBotName('AI Smart Scalper VH 2026')
      setSelectedMarket('R_100')
      setTradeType('digits_even_odd')
      setContractType('Both')
      setStake('1.0')
      setTakeProfit('20')
      setStopLoss('40')
      setMartingaleFactor('2.1')
      setVhEnabled(true)
      setVhTrigger(3)
    }, 1200)
  }

  return (
    <div className="bg-[#f0f4f8] dark:bg-[#070b14] text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans flex flex-col min-h-[900px]">
      {/* ── 1. TOP HEADER NAVIGATION TABS (Style TraderScheme / Deriv DBot) ──── */}
      <div className="bg-[#0b1528] text-white px-4 py-2 flex items-center justify-between border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Logo Brand TS */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700/80">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-xs tracking-wider">
              TS
            </div>
            <span className="font-bold text-xs text-slate-200 hidden sm:inline tracking-tight">TraderScheme</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className="px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition">
              Dashboard
            </span>
            <span className="px-3 py-1 rounded-lg bg-[#00b4d8] text-white font-extrabold shadow-sm flex items-center gap-1.5">
              Bot Builder
            </span>
            <span className="px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition hidden md:inline">
              Volt A1
            </span>
            <span className="px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition hidden md:inline">
              Free Bots
            </span>
            <span className="px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition hidden lg:inline">
              Bulk Trader
            </span>
            <span className="px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition hidden lg:inline">
              Analysis Tools
            </span>
            <span className="px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition hidden xl:inline">
              Hedging Tool
            </span>
            <span className="px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition hidden xl:inline">
              Auto A1
            </span>
            <span className="px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition">
              Manual Trader
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton Publier pour Utilisateurs */}
          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Publier pour Utilisateurs</span>
          </button>
        </div>
      </div>

      {/* ── 2. SECONDARY ACTION TOOLBAR (Style Deriv / TraderScheme) ───────── */}
      <div className="bg-white dark:bg-[#0d1322] px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick strategy Dropdown (Royal Blue #1d4ed8) */}
          <div className="relative group">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <span>Quick strategy</span>
              <span className="text-[10px]">▼</span>
            </button>
            <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Templates Deriv Officiels</div>
              {QUICK_STRATEGIES.map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => applyQuickStrategy(st)}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
                >
                  <div className="font-bold text-blue-500">{st.name}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{st.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Icon Actions */}
          <button
            type="button"
            onClick={() => applyQuickStrategy(QUICK_STRATEGIES[1])}
            title="Réinitialiser / Nouveau Robot"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Ouvrir Fichier XML / JSON */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xml,.json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Ouvrir un fichier Robot (XML / JSON)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Ouvrir XML/JSON</span>
          </button>

          {/* Télécharger XML */}
          <button
            type="button"
            onClick={handleDownloadXml}
            title="Sauvegarder & Télécharger le fichier XML Deriv"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Sauvegarder</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadXml}
            title="Télécharger XML"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          >
            <Download className="w-4 h-4 text-cyan-500" />
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Mode Switcher: 3 Modes */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('blocks')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                viewMode === 'blocks' ? 'bg-[#1e40af] text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Blocs Visuels (Capture 2)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                viewMode === 'cards' ? 'bg-[#00b4d8] text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>2. Paramètres &amp; Logique (Capture 1)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                viewMode === 'code' ? 'bg-white dark:bg-slate-900 text-cyan-400 shadow-sm' : 'text-slate-400'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Code XML</span>
            </button>
          </div>
        </div>

        {/* Zoom & Undo Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomLevel(z => Math.max(60, z - 10))}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs px-1 text-slate-400">{zoomLevel}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel(z => Math.min(140, z + 10))}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 3. MAIN WORKSPACE WITH LEFT BLOCKS MENU + CANVAS ──────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT BLOCKS MENU (Style Deriv / TraderScheme - Capture 2) */}
        <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c111d] p-3 space-y-3 overflow-y-auto hidden md:block shrink-0">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Blocks menu</span>
            <span className="text-[10px] text-slate-400">▲</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchBlock}
              onChange={e => setSearchBlock(e.target.value)}
              placeholder="Search blocks..."
              className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Block Categories List */}
          <div className="space-y-1 text-xs font-semibold">
            {[
              { id: 'analysis_logics', label: 'Analysis Logics 🔥' },
              { id: 'trade_params', label: 'Trade parameters' },
              { id: 'purchase_cond', label: 'Purchase conditions' },
              { id: 'sell_cond', label: 'Sell conditions (optional)' },
              { id: 'restart_cond', label: 'Restart trading conditions' },
              { id: 'analysis_group', label: 'Analysis ˅' },
              { id: 'utility_group', label: 'Utility ˅' },
              { id: 'vh_switcher', label: 'Virtual Hook Switcher' },
              { id: 'custom_notify', label: 'Custom Notification' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveBlocksMenu(cat.id)
                  if (cat.id === 'vh_switcher') setShowVhModal(true)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between ${
                  activeBlocksMenu === cat.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 text-[10px] text-slate-400 text-center">
              Glissez-déposez un fichier <strong>.xml</strong> ou <strong>.json</strong> sur le canvas pour l'importer instantanément.
            </div>
          </div>
        </div>

        {/* CANVAS WORKSPACE */}
        <div
          className="flex-1 bg-[#f8fafc] dark:bg-[#060a12] p-5 overflow-auto relative"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.18) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left'
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file) {
              const reader = new FileReader()
              reader.onload = ev => {
                if (typeof ev.target?.result === 'string') loadBotFromFileContent(ev.target.result, file.name)
              }
              reader.readAsText(file)
            }
          }}
        >
          {parseError && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VUE 1 : DERIV DBOT VISUAL BLOCKS (Capture 2)
          ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'blocks' && (
            <div className="flex flex-col lg:flex-row gap-6 items-start max-w-7xl">
              {/* ── BLOCK 1 : 1. TRADE PARAMETERS (Blockly Style) ──────────── */}
              <div className="w-full lg:w-[480px] bg-[#f1f5f9] dark:bg-[#0f172a] rounded-xl border border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden font-sans">
                {/* Block Blue Header */}
                <div className="bg-[#1e40af] text-white px-3.5 py-2 font-bold text-xs flex items-center gap-2">
                  <span className="font-mono text-cyan-300">⋮⋮</span>
                  <span>1. Trade parameters</span>
                </div>

                <div className="p-3.5 space-y-2.5 text-xs text-slate-800 dark:text-slate-200">
                  {/* Market Cascading Selectors */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500 font-semibold">Market:</span>
                    <select
                      value={marketCategory}
                      onChange={e => setMarketCategory(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-bold text-[11px]"
                    >
                      <option value="synthetic_index">synthetic_index ▾</option>
                      <option value="forex">forex ▾</option>
                      <option value="cryptocurrency">cryptocurrency ▾</option>
                    </select>
                    <span className="text-slate-400">&gt;</span>
                    <select
                      value={marketSubcat}
                      onChange={e => setMarketSubcat(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-bold text-[11px]"
                    >
                      <option value="random_index">random_index ▾</option>
                      <option value="continuous_indices">continuous_indices ▾</option>
                    </select>
                    <span className="text-slate-400">&gt;</span>
                    <select
                      value={selectedMarket}
                      onChange={e => setSelectedMarket(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-bold text-emerald-600 dark:text-emerald-400 text-[11px]"
                    >
                      {SYNTHETIC_MARKETS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Alternate markets */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Alternate markets (Continuous Indices only):</span>
                    <input
                      type="checkbox"
                      checked={alternateMarkets}
                      onChange={e => setAlternateMarkets(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    <span>every</span>
                    <input
                      type="number"
                      value={alternateRuns}
                      onChange={e => setAlternateRuns(parseInt(e.target.value, 10) || 1)}
                      className="w-10 bg-white dark:bg-slate-900 border rounded px-1 text-center font-bold"
                    />
                    <span>run(s)</span>
                  </div>

                  {/* Auto-scan volatility markets */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Auto-scan volatility markets and trade first match:</span>
                    <input
                      type="checkbox"
                      checked={autoScanMarkets}
                      onChange={e => setAutoScanMarkets(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                  </div>

                  {/* Virtual Hook Switcher */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Virtual Hook:</span>
                    <button
                      type="button"
                      onClick={() => setShowVhModal(true)}
                      className="px-2.5 py-0.5 rounded border border-rose-500/50 bg-rose-500/10 text-rose-500 font-bold hover:bg-rose-500/20 transition cursor-pointer text-[10px]"
                    >
                      VH Settings
                    </button>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${vhEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                      {vhEnabled ? 'ACTIF' : 'OFF'}
                    </span>
                  </div>

                  {/* Trade Type & Contract Type */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Trade Type:</span>
                    <select
                      value={tradeType}
                      onChange={e => setTradeType(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-bold"
                    >
                      {TRADE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <span className="text-slate-400">&gt;</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Contract Type:</span>
                    <select
                      value={contractType}
                      onChange={e => setContractType(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-bold text-cyan-600 dark:text-cyan-400"
                    >
                      <option value="Both">Both ▾</option>
                      <option value="DIGITOVER">DIGITOVER (Over)</option>
                      <option value="DIGITUNDER">DIGITUNDER (Under)</option>
                      <option value="DIGITMATCH">DIGITMATCH (Matches)</option>
                      <option value="DIGITDIFF">DIGITDIFF (Differs)</option>
                      <option value="DIGITEVEN">DIGITEVEN (Even)</option>
                      <option value="DIGITODD">DIGITODD (Odd)</option>
                      <option value="CALL">CALL (Rise)</option>
                      <option value="PUT">PUT (Fall)</option>
                      <option value="RUNHIGH">RUNHIGH (Only Up)</option>
                      <option value="RUNLOW">RUNLOW (Only Down)</option>
                    </select>
                  </div>

                  {/* Candle Interval */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Default Candle Interval:</span>
                    <select
                      value={candleInterval}
                      onChange={e => setCandleInterval(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-bold"
                    >
                      <option value="1 minute">1 minute ▾</option>
                      <option value="2 minutes">2 minutes ▾</option>
                      <option value="5 minutes">5 minutes ▾</option>
                    </select>
                  </div>

                  {/* Restart Checkboxes */}
                  <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restartOnError}
                        onChange={e => setRestartOnError(e.target.checked)}
                        className="rounded accent-blue-600"
                      />
                      <span>Restart buy/sell on error (disable for better performance):</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restartLastTradeOnError}
                        onChange={e => setRestartLastTradeOnError(e.target.checked)}
                        className="rounded accent-blue-600"
                      />
                      <span>Restart last trade on error (bot ignores the unsuccessful trade):</span>
                    </label>
                  </div>

                  {/* Nested Sub-Block : Run once at start (Money Management) */}
                  <div className="mt-2 p-3 rounded-lg bg-[#e2e8f0] dark:bg-[#1e293b] border-l-4 border-blue-600 space-y-2">
                    <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                      Run once at start:
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">set</span>
                        <span className="font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border">Stake ▾</span>
                        <span className="text-slate-500">to</span>
                        <input
                          type="number"
                          step="0.1"
                          value={stake}
                          onChange={e => setStake(e.target.value)}
                          className="w-16 bg-white dark:bg-slate-900 border rounded px-1.5 py-0.5 font-bold text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">set</span>
                        <span className="font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border">Martingale ▾</span>
                        <span className="text-slate-500">to</span>
                        <input
                          type="number"
                          step="0.1"
                          value={martingaleFactor}
                          onChange={e => setMartingaleFactor(e.target.value)}
                          className="w-16 bg-white dark:bg-slate-900 border rounded px-1.5 py-0.5 font-bold text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">set</span>
                        <span className="font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border text-emerald-600">Take Profit ▾</span>
                        <span className="text-slate-500">to</span>
                        <input
                          type="number"
                          value={takeProfit}
                          onChange={e => setTakeProfit(e.target.value)}
                          className="w-16 bg-white dark:bg-slate-900 border rounded px-1.5 py-0.5 font-bold text-center text-emerald-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">set</span>
                        <span className="font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border text-rose-500">Stop Loss ▾</span>
                        <span className="text-slate-500">to</span>
                        <input
                          type="number"
                          value={stopLoss}
                          onChange={e => setStopLoss(e.target.value)}
                          className="w-16 bg-white dark:bg-slate-900 border rounded px-1.5 py-0.5 font-bold text-center text-rose-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">set</span>
                        <span className="font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border">Runs ▾</span>
                        <span className="text-slate-500">to</span>
                        <input
                          type="number"
                          value={runsLimit}
                          onChange={e => setRunsLimit(e.target.value)}
                          className="w-16 bg-white dark:bg-slate-900 border rounded px-1.5 py-0.5 font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── BLOCK 4 : 4. RESTART TRADING CONDITIONS (Capture 2) ───── */}
              <div className="w-full lg:w-[480px] bg-[#f1f5f9] dark:bg-[#0f172a] rounded-xl border border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden font-sans">
                {/* Block Blue Header */}
                <div className="bg-[#1e40af] text-white px-3.5 py-2 font-bold text-xs flex items-center gap-2">
                  <span className="font-mono text-cyan-300">⋮⋮</span>
                  <span>4. Restart trading conditions</span>
                </div>

                <div className="p-3.5 space-y-3 text-xs text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
                    <span className="text-slate-500">set</span>
                    <span className="font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border">Recovery Mode ▾</span>
                    <span className="text-slate-500">to</span>
                    <select
                      value={restartRecoveryMode}
                      onChange={e => setRestartRecoveryMode(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-bold text-cyan-500"
                    >
                      <option value="Result is Loss">Result is Loss ▾</option>
                      <option value="Always Trade Again">Always Trade Again ▾</option>
                      <option value="Custom Pattern">Custom Pattern ▾</option>
                    </select>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#e2e8f0] dark:bg-[#1e293b] border-l-4 border-emerald-500 space-y-2 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">if (Result is Win) then</span>
                      <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border font-bold text-emerald-500">
                        set Stake to initial_stake ({stake})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">if (Total profit &gt;= Take Profit) then</span>
                      <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border font-bold text-amber-500">
                        Stop Bot (Trade Again: FALSE)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">if (Total profit &lt;= -Stop Loss) then</span>
                      <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border font-bold text-rose-500">
                        Stop Bot (Trade Again: FALSE)
                      </span>
                    </div>
                  </div>

                  {/* Conditions d'Achat & Récupération résumées */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
                      <span>Conditions Actives (Initial &amp; Recovery) :</span>
                      <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        className="text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <span>Éditer les patterns</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-[10px] font-mono">
                      <div className="p-2 rounded bg-white dark:bg-slate-900 border flex items-center justify-between">
                        <span>🛒 Initial: IF last digit &le; 1 &rarr; DIGITOVER 2</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">Actif</span>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-slate-900 border flex items-center justify-between">
                        <span>🔄 Recovery: IF last 4 digits even &rarr; Purchase Odd</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">Actif</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VUE 2 : TRADERSCHEME PARAMETERS & CARDS (Capture 1)
          ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-6xl">
              {/* ── CARD 1: TRADE PARAMETERS ───────────────────────────── */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-[#0b1120] text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 font-mono text-xs font-bold tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">⋮⋮</span>
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>TRADE PARAMETERS</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Setup</span>
                </div>

                <div className="p-4 space-y-3.5 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Market</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <select
                        value={marketCategory}
                        onChange={e => setMarketCategory(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold text-slate-800 dark:text-slate-200 text-xs"
                      >
                        <option value="synthetic_index">synthetic_index ▾</option>
                        <option value="forex">forex ▾</option>
                        <option value="cryptocurrency">cryptocurrency ▾</option>
                      </select>
                      <select
                        value={marketSubcat}
                        onChange={e => setMarketSubcat(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold text-slate-800 dark:text-slate-200 text-xs"
                      >
                        <option value="random_index">random_index ▾</option>
                        <option value="continuous_indices">continuous_indices ▾</option>
                      </select>
                      <select
                        value={selectedMarket}
                        onChange={e => setSelectedMarket(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold text-emerald-500 text-xs"
                      >
                        {SYNTHETIC_MARKETS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Trade type</label>
                      <select
                        value={tradeType}
                        onChange={e => setTradeType(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold text-slate-800 dark:text-slate-200 text-xs"
                      >
                        {TRADE_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Contract type</label>
                      <select
                        value={contractType}
                        onChange={e => setContractType(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold text-cyan-400 text-xs"
                      >
                        <option value="Both">Both ▾</option>
                        <option value="DIGITOVER">DIGITOVER (Over)</option>
                        <option value="DIGITUNDER">DIGITUNDER (Under)</option>
                        <option value="DIGITMATCH">DIGITMATCH (Matches)</option>
                        <option value="DIGITDIFF">DIGITDIFF (Differs)</option>
                        <option value="DIGITEVEN">DIGITEVEN (Even)</option>
                        <option value="DIGITODD">DIGITODD (Odd)</option>
                        <option value="CALL">CALL (Rise)</option>
                        <option value="PUT">PUT (Fall)</option>
                        <option value="RUNHIGH">RUNHIGH (Only Up)</option>
                        <option value="RUNLOW">RUNLOW (Only Down)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Recovery Mode</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recoveryModeEnabled}
                        onChange={e => setRecoveryModeEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* ── CARD 2: BOT PARAMETERS ─────────────────────────────── */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-[#0b1120] text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 font-mono text-xs font-bold tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">⋮⋮</span>
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>BOT PARAMETERS</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Money Management</span>
                </div>

                <div className="p-4 space-y-3.5 text-xs">
                  {/* Stake & Currency */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Stake</label>
                      <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <input
                          type="number"
                          step="0.1"
                          value={stake}
                          onChange={e => setStake(e.target.value)}
                          className="w-full bg-transparent p-2 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs"
                        />
                        <span className="px-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">USD</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Duration</label>
                      <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <select
                          value={durationUnit}
                          onChange={e => setDurationUnit(e.target.value)}
                          className="bg-transparent p-2 font-bold text-xs"
                        >
                          <option value="Ticks">Ticks ▾</option>
                          <option value="Seconds">Secs ▾</option>
                        </select>
                        <input
                          type="number"
                          value={duration}
                          onChange={e => setDuration(e.target.value)}
                          className="w-10 bg-transparent p-1 font-mono font-bold text-center text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Take Profit & Stop Loss */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-emerald-500 font-bold uppercase block mb-1">Take profit</label>
                      <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <input
                          type="number"
                          value={takeProfit}
                          onChange={e => setTakeProfit(e.target.value)}
                          className="w-full bg-transparent p-2 font-mono font-bold text-emerald-500 text-xs"
                        />
                        <span className="px-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">USD</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-rose-500 font-bold uppercase block mb-1">Stop loss</label>
                      <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <input
                          type="number"
                          value={stopLoss}
                          onChange={e => setStopLoss(e.target.value)}
                          className="w-full bg-transparent p-2 font-mono font-bold text-rose-500 text-xs"
                        />
                        <span className="px-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">USD</span>
                      </div>
                    </div>
                  </div>

                  {/* Martingale */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Martingale:</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={martingaleEnabled}
                          onChange={e => setMartingaleEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="font-mono text-slate-400">×</span>
                      <input
                        type="number"
                        step="0.1"
                        disabled={!martingaleEnabled}
                        value={martingaleFactor}
                        onChange={e => setMartingaleFactor(e.target.value)}
                        className="w-14 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1 font-mono font-bold text-center text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── CARD 3: INITIAL PURCHASE (Capture 1) ───────────────── */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-[#0b1120] text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 font-mono text-xs font-bold tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">⋮⋮</span>
                    <span>🛒 INITIAL PURCHASE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={initialAnalysisEnabled}
                        onChange={e => setInitialAnalysisEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-400"></div>
                    </label>
                    <span className="text-[10px] text-slate-300">Enable Analysis</span>
                    <select
                      value={initialAnalysisMode}
                      onChange={e => setInitialAnalysisMode(e.target.value)}
                      className="bg-slate-800 text-white rounded px-2 py-0.5 text-[10px] font-bold"
                    >
                      <option value="Pattern Analysis">Pattern Analysis ▾</option>
                      <option value="Digit Frequency">Digit Frequency ▾</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="text-[11px] font-bold">Signal Check :</span>
                    <select
                      value={initialSignalCheck}
                      onChange={e => setInitialSignalCheck(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 font-bold text-slate-800 dark:text-slate-200 text-[11px]"
                    >
                      <option value="On Every Trade">On Every Trade ▾</option>
                      <option value="After Every 2 trades">After Every 2 trades ▾</option>
                    </select>
                  </div>

                  {initialConditions.map((cond, idx) => (
                    <div key={cond.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-blue-500">{cond.type}</span>
                          <span className="text-slate-500">the last</span>
                          <select
                            value={cond.lastDigitsCount}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10)
                              setInitialConditions(prev => prev.map((c, i) => i === idx ? { ...c, lastDigitsCount: val } : c))
                            }}
                            className="bg-white dark:bg-slate-800 border rounded px-1.5 py-0.5 font-bold"
                          >
                            <option value={1}>1 ▾</option>
                            <option value={2}>2 ▾</option>
                          </select>
                          <span className="text-slate-500">digits are</span>
                          <select
                            value={cond.operator}
                            onChange={e => {
                              const val = e.target.value
                              setInitialConditions(prev => prev.map((c, i) => i === idx ? { ...c, operator: val } : c))
                            }}
                            className="bg-white dark:bg-slate-800 border rounded px-1.5 py-0.5 font-bold"
                          >
                            <option value="less or equal to">less or equal to ▾</option>
                            <option value="greater or equal to">greater or equal to ▾</option>
                            <option value="equal to">equal to ▾</option>
                          </select>
                          <span className="text-slate-500">digit</span>
                          <input
                            type="number"
                            value={cond.targetDigit}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10) || 0
                              setInitialConditions(prev => prev.map((c, i) => i === idx ? { ...c, targetDigit: val } : c))
                            }}
                            className="w-10 bg-white dark:bg-slate-800 border rounded px-1 py-0.5 font-mono font-bold text-center"
                          />
                          <span className="text-slate-500">then</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInitialConditions(prev => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Purchase</span>
                          <select
                            value={cond.purchaseAction}
                            onChange={e => {
                              const val = e.target.value
                              setInitialConditions(prev => prev.map((c, i) => i === idx ? { ...c, purchaseAction: val } : c))
                            }}
                            className="bg-white dark:bg-slate-800 border rounded px-2 py-0.5 font-bold text-emerald-500"
                          >
                            <option value="DIGITOVER">Over ▾</option>
                            <option value="DIGITUNDER">Under ▾</option>
                            <option value="Even">Even ▾</option>
                            <option value="Odd">Odd ▾</option>
                          </select>
                          <span className="text-slate-500">Prediction:</span>
                          <input
                            type="number"
                            value={cond.prediction}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10) || 0
                              setInitialConditions(prev => prev.map((c, i) => i === idx ? { ...c, prediction: val } : c))
                            }}
                            className="w-10 bg-white dark:bg-slate-800 border rounded px-1 py-0.5 font-mono text-center font-bold"
                          />
                        </div>

                        {/* Last 1 pattern tag (Badge rouge 7 comme dans la capture 1) */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Last 1 pattern</span>
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 font-mono font-bold text-xs border border-rose-500/40">
                            {livePatternLast1}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setInitialConditions(prev => [
                        ...prev,
                        {
                          id: 'c' + Date.now(),
                          type: 'ELSE IF',
                          lastDigitsCount: 1,
                          operator: 'equal to',
                          targetDigit: 5,
                          purchaseAction: 'DIGITOVER',
                          prediction: 2,
                          previewPattern: [5]
                        }
                      ])
                    }}
                    className="w-full py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 hover:text-blue-500 hover:border-blue-500 text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une condition d'achat</span>
                  </button>
                </div>
              </div>

              {/* ── CARD 4: RECOVERY PURCHASE (Capture 1) ───────────────── */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-[#0b1120] text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 font-mono text-xs font-bold tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">⋮⋮</span>
                    <span>🛒 RECOVERY PURCHASE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recoveryAnalysisEnabled}
                        onChange={e => setRecoveryAnalysisEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-400"></div>
                    </label>
                    <span className="text-[10px] text-slate-300">Enable Analysis</span>
                    <select
                      value={recoveryAnalysisMode}
                      onChange={e => setRecoveryAnalysisMode(e.target.value)}
                      className="bg-slate-800 text-white rounded px-2 py-0.5 text-[10px] font-bold"
                    >
                      <option value="Pattern Analysis">Pattern Analysis ▾</option>
                      <option value="Trend Analysis">Trend Analysis ▾</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="text-[11px] font-bold">Signal Check :</span>
                    <span className="text-slate-500">After Every</span>
                    <input
                      type="number"
                      value={recoverySignalCheckTrades}
                      onChange={e => setRecoverySignalCheckTrades(parseInt(e.target.value, 10) || 1)}
                      className="w-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 font-mono text-center font-bold"
                    />
                    <span className="text-slate-500">trades</span>
                  </div>

                  {recoveryConditions.map((cond, idx) => (
                    <div key={cond.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-amber-500">{cond.type}</span>
                          <span className="text-slate-500">the last</span>
                          <span className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border">{cond.lastDigitsCount}</span>
                          <span className="text-slate-500">digits are</span>
                          <select
                            value={cond.operator}
                            onChange={e => {
                              const val = e.target.value
                              setRecoveryConditions(prev => prev.map((c, i) => i === idx ? { ...c, operator: val } : c))
                            }}
                            className="bg-white dark:bg-slate-800 border rounded px-1.5 py-0.5 font-bold"
                          >
                            <option value="all even">all even ▾</option>
                            <option value="all odd">all odd ▾</option>
                            <option value="less or equal to">less or equal to ▾</option>
                            <option value="greater or equal to">greater or equal to ▾</option>
                          </select>
                          <span className="text-slate-500">then</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRecoveryConditions(prev => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">Purchase</span>
                          <select
                            value={cond.purchaseAction}
                            onChange={e => {
                              const val = e.target.value
                              setRecoveryConditions(prev => prev.map((c, i) => i === idx ? { ...c, purchaseAction: val } : c))
                            }}
                            className="bg-white dark:bg-slate-800 border rounded px-2 py-0.5 font-bold text-amber-500"
                          >
                            <option value="Odd">Odd ▾</option>
                            <option value="Even">Even ▾</option>
                            <option value="Over">Over ▾</option>
                            <option value="Under">Under ▾</option>
                          </select>
                        </div>

                        {/* Last 4 pattern Badges (3 verts + 1 rouge comme Capture 1: [2] [4] [4] [7]) */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Last 4 pattern</span>
                          <div className="flex items-center gap-1 font-mono text-xs font-bold">
                            {livePatternLast4.map((dig, i) => {
                              const isLast = i === livePatternLast4.length - 1
                              return (
                                <span
                                  key={i}
                                  className={`px-2 py-0.5 rounded border ${
                                    isLast
                                      ? 'bg-rose-500/15 text-rose-500 border-rose-500/40'
                                      : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40'
                                  }`}
                                >
                                  {dig}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryConditions(prev => [
                        ...prev,
                        {
                          id: 'r' + Date.now(),
                          type: 'ELSE IF',
                          lastDigitsCount: 4,
                          operator: 'all odd',
                          targetDigit: 0,
                          purchaseAction: 'Even',
                          prediction: '',
                          previewPattern: [1, 3, 5, 7]
                        }
                      ])
                    }}
                    className="w-full py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 hover:text-amber-500 hover:border-amber-500 text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une condition de récupération</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              VUE 3 : INSPECTEUR CODE XML / JSON RAW
          ══════════════════════════════════════════════════════════════════ */}
          {viewMode === 'code' && (
            <div className="bg-white dark:bg-[#0b1120] rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-2xl p-4 space-y-3 max-w-5xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                      Inspecteur &amp; Éditeur de Code ({codeType.toUpperCase()})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Visualisez et éditez la structure XML officielle Deriv DBot. Les modifications s'appliquent automatiquement aux blocs.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(rawCode)
                      setCodeCopied(true)
                      setTimeout(() => setCodeCopied(false), 2000)
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{codeCopied ? 'Copié !' : 'Copier'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncCodeToVisual}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Appliquer aux Blocs Visuels</span>
                  </button>
                </div>
              </div>

              <textarea
                value={rawCode}
                onChange={e => setRawCode(e.target.value)}
                rows={22}
                spellCheck={false}
                className="w-full bg-slate-900 text-cyan-300 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 selection:bg-cyan-500 selection:text-black leading-relaxed"
              />
            </div>
          )}

          {/* Bouton Flottant Poubelle & Assistant IA (Capture 2) */}
          <div className="fixed bottom-14 right-6 flex items-center gap-2.5 z-30">
            <button
              type="button"
              onClick={() => {
                applyQuickStrategy(QUICK_STRATEGIES[1])
              }}
              title="Vider et réinitialiser le canvas"
              className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800/90 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 border border-slate-300 dark:border-slate-700 shadow-lg flex items-center justify-center transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              title="Générateur de Stratégie IA"
              className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 hover:scale-105 text-white shadow-xl shadow-purple-600/30 flex items-center justify-center font-extrabold text-xs transition cursor-pointer"
            >
              <Sparkles className="w-5 h-5 animate-pulse" />
            </button>
          </div>

          {/* Badge Alerte Flottant "⚠️ Risk Disclaimer" (Capture 1) */}
          <div className="fixed bottom-14 left-6 z-30">
            <div className="px-3 py-1 rounded-lg bg-amber-500/90 text-slate-950 font-bold text-[11px] shadow-lg flex items-center gap-1.5 border border-amber-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Risk Disclaimer</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM STATUS BAR (Style TraderScheme / Deriv - Capture 1 & 2) ── */}
      <div className="bg-[#0b1120] text-slate-300 px-4 py-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
        {/* Play/Stop Button & Running Status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer ${
              isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-[#6366f1] hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {isRunning ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isRunning ? 'Stop' : 'Run'}</span>
          </button>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span className={isRunning ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {simStats.statusText}
            </span>
          </div>
        </div>

        {/* Right Info: Execution Speed, Clock, Language */}
        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span>Execution</span>
            <button
              type="button"
              onClick={() => setExecutionSpeed(s => s === 'FAST' ? 'NORMAL' : 'FAST')}
              className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold border border-slate-700"
            >
              {executionSpeed}
            </button>
          </div>

          <span className="text-[10px] text-slate-500">(c) 2026 TraderScheme</span>

          <div className="flex items-center gap-1 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>{currentGmt}</span>
          </div>

          {/* Language Flag Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            <span>🇬🇧</span>
            <span className="font-bold text-[10px] text-slate-300">EN</span>
          </div>
        </div>
      </div>

      {/* ── MODAL 1: VIRTUAL HOOK SETTINGS ─────────────────────────────────── */}
      {showVhModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Configuration Virtual Hook (VH)</h3>
              </div>
              <button onClick={() => setShowVhModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Le Virtual Hook simule des trades à blanc en tâche de fond. Le bot ne bascule sur le compte réel qu'après avoir essuyé un nombre prédéfini de pertes consécutives virtuelles, éliminant les faux signaux.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">Activer le Virtual Hook</span>
                <input
                  type="checkbox"
                  checked={vhEnabled}
                  onChange={e => setVhEnabled(e.target.checked)}
                  className="rounded accent-emerald-500 w-4 h-4"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Déclencheur (Nombre de pertes virtuelles avant trade réel)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={vhTrigger}
                  onChange={e => setVhTrigger(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Condition de déclenchement</label>
                <select
                  value={vhStartWhen}
                  onChange={e => setVhStartWhen(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold"
                >
                  <option value="loss">Après série de Pertes (Loss)</option>
                  <option value="win">Après série de Gains (Win)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Mise de simulation virtuelle</label>
                <input
                  type="number"
                  step="0.1"
                  value={vhStake}
                  onChange={e => setVhStake(parseFloat(e.target.value) || 0.5)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVhModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PUBLIER POUR LES UTILISATEURS ─────────────────────────── */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  Publier ce Robot pour les Utilisateurs
                </h3>
              </div>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Ce robot sera immédiatement injecté dans la liste des robots Deriv accessibles aux membres sur leur dashboard (<code>/dashboard/deriv</code>).
            </p>

            {publishSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{publishSuccessMsg}</span>
              </div>
            )}

            {publishErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{publishErrorMsg}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nom affiché aux utilisateurs</label>
                <input
                  type="text"
                  value={botName}
                  onChange={e => setBotName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Palier d'Accès (Plan)</label>
                  <select
                    value={publishPlanTier}
                    onChange={e => setPublishPlanTier(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 font-bold"
                  >
                    <option value="all">Tous les utilisateurs (Accès Libre)</option>
                    <option value="deriv-starter">Plan Starter</option>
                    <option value="deriv-pro">Plan Pro</option>
                    <option value="deriv-vip">Plan VIP</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Taux de Réussite Estimé</label>
                  <input
                    type="text"
                    value={publishWinRate}
                    onChange={e => setPublishWinRate(e.target.value)}
                    placeholder="80-86%"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Description / Conseils de trading</label>
                <textarea
                  value={publishDescription}
                  onChange={e => setPublishDescription(e.target.value)}
                  rows={3}
                  placeholder="Conseillé sur Volatility 100 avec mise minimale de 0.8 USD..."
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={handlePublishToUsers}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
              >
                {publishing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>{publishing ? 'Publication...' : 'Confirmer la Publication'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ASSISTANT IA DERIV STRATEGY ────────────────────────────── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Générateur de Stratégie IA</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Décrivez en langage naturel la stratégie de trading que vous souhaitez créer. L'IA configure automatiquement les blocs et conditions d'achat.
            </p>

            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              rows={4}
              placeholder="Ex: Crée un robot sur Volatility 100 avec Virtual Hook 3 pertes, qui achète Over 2 avec 0.8$ de stake et Take Profit à 20$..."
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs"
            />

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={aiGenerating}
                onClick={handleGenerateAiStrategy}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {aiGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Générer les Blocs</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
