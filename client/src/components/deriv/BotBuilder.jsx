import React, { useState, useEffect, useRef } from 'react'
import {
  Play, Square, RefreshCw, FolderOpen, Save, Download, Code2,
  Undo, Redo, ZoomIn, ZoomOut, Search, Plus, Trash2, Sliders,
  ShieldCheck, UploadCloud, CheckCircle2, AlertCircle, Copy,
  Check, FileCode, Layers, Sparkles, Settings, Eye, Clock, X
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
]

// Types de Trading Deriv
const TRADE_TYPES = [
  { value: 'digits_over_under', label: 'Digits > Over/Under', category: 'Digits' },
  { value: 'digits_even_odd', label: 'Digits > Even/Odd', category: 'Digits' },
  { value: 'digits_matches_differs', label: 'Digits > Matches/Differs', category: 'Digits' },
  { value: 'rise_fall', label: 'Up/Down > Rise/Fall', category: 'Up/Down' },
  { value: 'high_low', label: 'High/Low > Higher/Lower', category: 'Up/Down' },
  { value: 'runs', label: 'Only Ups / Only Downs', category: 'Runs' },
  { value: 'accumulators', label: 'Accumulators (Growth)', category: 'Accumulator' },
]

// Templates de Stratégie Rapide
const QUICK_STRATEGIES = [
  {
    id: 'over_2',
    name: 'Digit Over 2 (Taux de réussite 70%)',
    market: 'R_100',
    tradeType: 'digits_over_under',
    contractType: 'DIGITOVER',
    stake: 0.5,
    takeProfit: 10,
    stopLoss: 25,
    martingale: 2.2,
    duration: 1,
    durationUnit: 't',
    barrier: '2',
    description: 'Achat de contrats DIGITOVER 2 sur Volatility 100 avec Martingale adaptative.'
  },
  {
    id: 'even_odd_reversal',
    name: 'Even/Odd Pattern Reversal',
    market: 'R_25',
    tradeType: 'digits_even_odd',
    contractType: 'Both',
    stake: 0.8,
    takeProfit: 15,
    stopLoss: 30,
    martingale: 2.0,
    duration: 1,
    durationUnit: 't',
    barrier: '',
    description: 'Détecte les séries de 4 chiffres pairs consécutifs pour acheter Impair et inversement.'
  },
  {
    id: 'rise_fall_trend',
    name: 'Rise / Fall Suivi de Tendance',
    market: 'R_50',
    tradeType: 'rise_fall',
    contractType: 'CALL',
    stake: 1.0,
    takeProfit: 20,
    stopLoss: 40,
    martingale: 2.1,
    duration: 5,
    durationUnit: 't',
    barrier: '',
    description: 'Suit les impulsions haussières et baissières sur Volatility 50 avec expiration 5 ticks.'
  },
  {
    id: 'virtual_hook_vh',
    name: 'Virtual Hook Loss Filter (Zéro Perte Réelle)',
    market: 'R_100',
    tradeType: 'digits_matches_differs',
    contractType: 'DIGITDIFF',
    stake: 1.5,
    takeProfit: 25,
    stopLoss: 50,
    martingale: 2.0,
    duration: 1,
    durationUnit: 't',
    barrier: '5',
    virtualHook: { enabled: true, trigger: 3, startWhen: 'loss', stake: 0.5 },
    description: 'Simule 3 pertes virtuelles en tâche de fond avant d\'envoyer un ordre réel sur le compte Deriv.'
  }
]

export default function BotBuilder({ onBotPublished }) {
  // Mode de vue : 'visual' (Blocs graphiques Deriv) | 'code' (Inspecteur XML/JSON)
  const [viewMode, setViewMode] = useState('visual')
  const [zoomLevel, setZoomLevel] = useState(100)
  const [searchBlock, setSearchBlock] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [executionSpeed, setExecutionSpeed] = useState('FAST')
  const [currentGmt, setCurrentGmt] = useState('')

  // 1. Paramètres de Trade (Block 1)
  const [marketCategory, setMarketCategory] = useState('synthetic_index')
  const [marketSubcat, setMarketSubcat] = useState('random_index')
  const [selectedMarket, setSelectedMarket] = useState('R_100')
  const [tradeType, setTradeType] = useState('digits_over_under')
  const [contractType, setContractType] = useState('DIGITOVER')
  const [candleInterval, setCandleInterval] = useState('1 minute')
  const [alternateMarkets, setAlternateMarkets] = useState(false)
  const [alternateRuns, setAlternateRuns] = useState(1)
  const [autoScanMarkets, setAutoScanMarkets] = useState(false)
  const [recoveryModeEnabled, setRecoveryModeEnabled] = useState(true)
  const [restartOnError, setRestartOnError] = useState(false)
  const [restartLastTradeOnError, setRestartLastTradeOnError] = useState(true)

  // 2. Paramètres du Bot / Run Once at Start (Block 2)
  const [botName, setBotName] = useState('Mon Robot Deriv Pro')
  const [stake, setStake] = useState('0.8')
  const [currency, setCurrency] = useState('USD')
  const [takeProfit, setTakeProfit] = useState('10')
  const [stopLoss, setStopLoss] = useState('30')
  const [martingaleEnabled, setMartingaleEnabled] = useState(true)
  const [martingaleFactor, setMartingaleFactor] = useState('2')
  const [duration, setDuration] = useState('1')
  const [durationUnit, setDurationUnit] = useState('Ticks')
  const [barrier, setBarrier] = useState('2')

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

  // 4. Conditions d'Achat en Récupération (Block 4 - Recovery Purchase)
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

  // 5. Code XML/JSON Brut & Synchronisation
  const [rawCode, setRawCode] = useState('')
  const [codeType, setCodeType] = useState('xml')
  const [codeCopied, setCodeCopied] = useState(false)
  const [parseError, setParseError] = useState('')

  // Modal Publication dans le Dashboard Utilisateurs
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishPlanTier, setPublishPlanTier] = useState('all')
  const [publishDescription, setPublishDescription] = useState('')
  const [publishWinRate, setPublishWinRate] = useState('80-86%')
  const [publishing, setPublishing] = useState(false)
  const [publishSuccessMsg, setPublishSuccessMsg] = useState('')
  const [publishErrorMsg, setPublishErrorMsg] = useState('')

  const fileInputRef = useRef(null)

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

  // Génération automatique du code XML Deriv officiel correspondant à la configuration visuelle
  useEffect(() => {
    generateXmlFromState()
  }, [
    botName, selectedMarket, contractType, tradeType, stake, takeProfit, stopLoss,
    martingaleEnabled, martingaleFactor, duration, durationUnit, barrier,
    vhEnabled, vhTrigger, vhStartWhen, vhStake, initialConditions, recoveryConditions
  ])

  function generateXmlFromState() {
    const xml = `<xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
  <variables>
    <variable type="" id="Stake">Stake</variable>
    <variable type="" id="TakeProfit">Take Profit</variable>
    <variable type="" id="StopLoss">Stop Loss</variable>
    <variable type="" id="Martingale">Martingale Factor</variable>
  </variables>
  <!-- BLOCK 1: TRADE DEFINITION -->
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
                <field name="CANDLEINTERVAL_LIST">60</field>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <!-- INITIAL PARAMETERS -->
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
  <!-- BLOCK 2: RUN ONCE AT START (BOT PARAMETERS) -->
  <block type="trade_definition_initialization" id="init_block" x="480" y="20">
    <statement name="INITIALIZATION">
      <block type="variables_set">
        <field name="VAR" id="Stake">Stake</field>
        <value name="VALUE"><shadow type="math_number"><field name="NUM">${stake}</field></shadow></value>
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
                    <field name="VAR" id="Martingale">Martingale Factor</field>
                    <value name="VALUE"><shadow type="math_number"><field name="NUM">${martingaleFactor}</field></shadow></value>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
  <!-- BLOCK 3: VIRTUAL HOOK CONFIGURATION -->
  <block type="virtualhook" id="vh_block" x="20" y="420">
    <field name="VH_STATE_LIST">${vhEnabled ? 'enabled' : 'disabled'}</field>
    <value name="VH_TRIGGER"><shadow type="math_number"><field name="NUM">${vhTrigger}</field></shadow></value>
    <field name="VH_STARTWHEN_LIST">${vhStartWhen}</field>
    <value name="VH_STAKE"><shadow type="math_number"><field name="NUM">${vhStake}</field></shadow></value>
  </block>
  <!-- BLOCK 4: PURCHASE CONDITIONS -->
  <block type="before_purchase" id="purchase_conditions" x="20" y="560">
    <statement name="BEFOREPURCHASE_STACK">
      <block type="purchase">
        <field name="PURCHASE_LIST">${contractType}</field>
      </block>
    </statement>
  </block>
</xml>`
    setRawCode(xml)
  }

  // Application d'un template de stratégie rapide
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

  // Ouvrir un fichier XML ou JSON depuis le disque local
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

  // Parsing intelligent et injection dans les blocs visuels
  function loadBotFromFileContent(content, fileName = 'robot.xml') {
    setParseError('')
    setRawCode(content)

    try {
      const trimmed = content.trim()
      if (trimmed.startsWith('{') || fileName.endsWith('.json')) {
        // Format JSON
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
        // Format XML Deriv / Binary Bot
        setCodeType('xml')
        const nameMatch = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')
        setBotName(nameMatch)

        // Extraction Market Symbol
        const symMatch = content.match(/<field\s+name=["']SYMBOL_LIST["']>([^<]+)<\/field>/i)
          || content.match(/<field\s+name=["']submarket["']>([^<]+)<\/field>/i)
        if (symMatch && symMatch[1]) setSelectedMarket(symMatch[1].trim())

        // Extraction Contract Type
        const purMatch = content.match(/<field\s+name=["']PURCHASE_LIST["']>([^<]+)<\/field>/i)
          || content.match(/<field\s+name=["']TYPE_LIST["']>([^<]+)<\/field>/i)
        if (purMatch && purMatch[1]) setContractType(purMatch[1].trim())

        // Extraction Stake
        const stakeMatch = content.match(/name=["']AMOUNT["'][^>]*>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (stakeMatch && stakeMatch[1]) setStake(stakeMatch[1].trim())

        // Extraction Take Profit
        const tpMatch = content.match(/(?:take[_\s]?profit|target[_\s]?profit)[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (tpMatch && tpMatch[1]) setTakeProfit(tpMatch[1].trim())

        // Extraction Stop Loss
        const slMatch = content.match(/(?:stop[_\s]?loss|max[_\s]?loss)[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (slMatch && slMatch[1]) setStopLoss(slMatch[1].trim())

        // Extraction Martingale
        const martMatch = content.match(/(?:martingale|multiplier|factor)[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (martMatch && martMatch[1]) setMartingaleFactor(martMatch[1].trim())

        // Extraction Duration
        const durMatch = content.match(/name=["']DURATION["'][^>]*>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (durMatch && durMatch[1]) setDuration(durMatch[1].trim())

        // Extraction Barrier / Prediction
        const predMatch = content.match(/name=["'](?:PREDICTION|BARRIEROFFSET|BARRIER)["'][^>]*>[\s\S]*?<field\s+name=["']NUM["']>([^<]+)<\/field>/i)
        if (predMatch && predMatch[1]) setBarrier(predMatch[1].trim())

        // Virtual Hook
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

  // Télécharger le fichier XML généré sur l'ordinateur
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

  // Synchroniser depuis l'éditeur de code brut vers les blocs
  function handleSyncCodeToVisual() {
    loadBotFromFileContent(rawCode, codeType === 'json' ? 'robot.json' : 'robot.xml')
    setViewMode('visual')
  }

  // Publication directe du robot dans le dashboard des utilisateurs
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

  return (
    <div className="bg-[#f0f4f8] dark:bg-[#070b14] text-slate-800 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden font-sans flex flex-col min-h-[850px]">
      {/* ── 1. TOP HEADER NAVIGATION TABS (Style TraderScheme / Deriv DBot) ──── */}
      <div className="bg-[#0f172a] text-white px-4 py-2 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700/80">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-xs">
              TS
            </div>
            <span className="font-bold text-xs text-slate-200 hidden sm:inline">Deriv Studio</span>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className="px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer transition">
              Dashboard
            </span>
            <span className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-extrabold shadow-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Bot Builder
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
          {/* Bouton Publier pour les Utilisateurs */}
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

      {/* ── 2. SECONDARY ACTION TOOLBAR ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0d1322] px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Quick strategy Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <span>Quick strategy</span>
              <span className="text-[10px]">▼</span>
            </button>
            <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50">
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
            onClick={() => {
              applyQuickStrategy(QUICK_STRATEGIES[0])
            }}
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
            title="Télécharger le fichier XML pour Deriv Bot"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Télécharger XML</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Mode Switcher: Visual vs Code */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1 rounded-md transition ${
                viewMode === 'visual' ? 'bg-white dark:bg-slate-900 text-blue-500 shadow-sm' : 'text-slate-400'
              }`}
            >
              Blocs Visuels
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                viewMode === 'code' ? 'bg-white dark:bg-slate-900 text-cyan-400 shadow-sm' : 'text-slate-400'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Inspecteur Code</span>
            </button>
          </div>
        </div>

        {/* Zoom & Undo Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomLevel(z => Math.max(50, z - 10))}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs px-1 text-slate-400">{zoomLevel}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel(z => Math.min(150, z + 10))}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 3. MAIN WORKSPACE WITH LEFT BLOCKS MENU + CANVAS ──────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT BLOCKS MENU (Style TraderScheme) */}
        <div className="w-60 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c111d] p-3 space-y-3 overflow-y-auto hidden md:block">
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

          {/* Block Categories */}
          <div className="space-y-1 text-xs font-semibold">
            {[
              { id: 'analysis', label: 'Analysis Logics 🔥', active: true },
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
                  if (cat.id === 'vh_switcher') setShowVhModal(true)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between ${
                  cat.active
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Drag & Drop Hint */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-800 text-[10px] text-slate-400 text-center">
            Glissez-déposez n'importe quel fichier <strong>.xml</strong> ou <strong>.json</strong> sur le canvas pour l'analyser.
          </div>
        </div>

        {/* CANVAS WORKSPACE (VISUAL BLOCKS OR RAW CODE INSPECTOR) */}
        <div
          className="flex-1 bg-[#f8fafc] dark:bg-[#060a12] p-5 overflow-auto relative"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.15) 1px, transparent 1px)',
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

          {viewMode === 'visual' ? (
            /* ── VISUAL BLOCKS GRID (Exact Reproduction of Screenshot 1 & 2) ── */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-6xl">
              {/* ── BLOCK 1: TRADE PARAMETERS ─────────────────────────── */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-[#0b1120] text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 font-mono text-xs font-bold tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400">⋮⋮</span>
                    <span className="text-cyan-400">1.</span>
                    <span>TRADE PARAMETERS</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Setup</span>
                </div>

                <div className="p-4 space-y-3.5 text-xs">
                  {/* Market Multi-level Selectors */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Market</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <select
                        value={marketCategory}
                        onChange={e => setMarketCategory(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold text-slate-800 dark:text-slate-200 text-xs"
                      >
                        <option value="synthetic_index">synthetic_index</option>
                        <option value="forex">forex</option>
                        <option value="cryptocurrency">cryptocurrency</option>
                      </select>
                      <select
                        value={marketSubcat}
                        onChange={e => setMarketSubcat(e.target.value)}
                        className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold text-slate-800 dark:text-slate-200 text-xs"
                      >
                        <option value="random_index">random_index</option>
                        <option value="continuous_indices">continuous_indices</option>
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

                  {/* Trade Type & Contract Type */}
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
                        <option value="Both">Both (Automatique)</option>
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

                  {/* Options Avancées & Virtual Hook */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Recovery Mode</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={recoveryModeEnabled}
                          onChange={e => setRecoveryModeEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Virtual Hook</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${vhEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                          {vhEnabled ? 'ACTIF' : 'OFF'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowVhModal(true)}
                        className="px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[11px] font-bold transition"
                      >
                        VH Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── BLOCK 2: BOT PARAMETERS (Run Once at Start) ────────── */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-[#0b1120] text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 font-mono text-xs font-bold tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">⋮⋮</span>
                    <span className="text-emerald-400">2.</span>
                    <span>BOT PARAMETERS</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Money Management</span>
                </div>

                <div className="p-4 space-y-3.5 text-xs">
                  {/* Nom du Robot */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Nom du Robot</label>
                    <input
                      type="text"
                      value={botName}
                      onChange={e => setBotName(e.target.value)}
                      placeholder="Ex: Ultimate Digit Scalper"
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold text-slate-800 dark:text-slate-200 text-xs"
                    />
                  </div>

                  {/* Stake & Currency */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Stake (Mise)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={stake}
                        onChange={e => setStake(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Devise</label>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold text-center text-slate-500 text-xs">
                        USD
                      </div>
                    </div>
                  </div>

                  {/* Take Profit & Stop Loss */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-emerald-500 font-bold uppercase block mb-1">Take Profit</label>
                      <input
                        type="number"
                        value={takeProfit}
                        onChange={e => setTakeProfit(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-mono font-bold text-emerald-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-rose-500 font-bold uppercase block mb-1">Stop Loss</label>
                      <input
                        type="number"
                        value={stopLoss}
                        onChange={e => setStopLoss(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-mono font-bold text-rose-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Martingale & Duration */}
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase">Martingale</label>
                        <input
                          type="checkbox"
                          checked={martingaleEnabled}
                          onChange={e => setMartingaleEnabled(e.target.checked)}
                          className="rounded accent-cyan-500 w-3.5 h-3.5"
                        />
                      </div>
                      <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <span className="px-2 text-slate-400 font-mono">×</span>
                        <input
                          type="number"
                          step="0.1"
                          disabled={!martingaleEnabled}
                          value={martingaleFactor}
                          onChange={e => setMartingaleFactor(e.target.value)}
                          className="w-full bg-transparent p-1.5 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Duration</label>
                      <div className="grid grid-cols-2 gap-1">
                        <select
                          value={durationUnit}
                          onChange={e => setDurationUnit(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs"
                        >
                          <option value="Ticks">Ticks</option>
                          <option value="Seconds">Seconds</option>
                          <option value="Minutes">Minutes</option>
                        </select>
                        <input
                          type="number"
                          value={duration}
                          onChange={e => setDuration(e.target.value)}
                          className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 font-mono font-bold text-center text-slate-800 dark:text-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── BLOCK 3: INITIAL PURCHASE (Conditions de premier ordre) ─ */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-[#0b1120] text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 font-mono text-xs font-bold tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">🛒</span>
                    <span>INITIAL PURCHASE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={initialAnalysisEnabled}
                        onChange={e => setInitialAnalysisEnabled(e.target.checked)}
                        className="rounded accent-cyan-500 w-3.5 h-3.5"
                      />
                      <span>Enable Analysis</span>
                    </label>
                    <select
                      value={initialAnalysisMode}
                      onChange={e => setInitialAnalysisMode(e.target.value)}
                      className="bg-slate-800 text-white rounded px-2 py-0.5 text-[10px] font-bold"
                    >
                      <option value="Pattern Analysis">Pattern Analysis</option>
                      <option value="Digit Frequency">Digit Frequency</option>
                      <option value="Trend Analysis">Trend Analysis</option>
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
                      <option value="On Every Trade">On Every Trade</option>
                      <option value="After Every 2 trades">After Every 2 trades</option>
                      <option value="After Every 5 trades">After Every 5 trades</option>
                    </select>
                  </div>

                  {/* Condition Rules List */}
                  {initialConditions.map((cond, idx) => (
                    <div key={cond.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
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
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
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
                            <option value="less or equal to">less or equal to</option>
                            <option value="greater or equal to">greater or equal to</option>
                            <option value="equal to">equal to</option>
                            <option value="all even">all even</option>
                            <option value="all odd">all odd</option>
                          </select>
                          <span className="text-slate-500">digit</span>
                          <input
                            type="number"
                            value={cond.targetDigit}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10) || 0
                              setInitialConditions(prev => prev.map((c, i) => i === idx ? { ...c, targetDigit: val } : c))
                            }}
                            className="w-12 bg-white dark:bg-slate-800 border rounded px-1.5 py-0.5 font-mono font-bold text-center"
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
                            <option value="DIGITOVER">Over</option>
                            <option value="DIGITUNDER">Under</option>
                            <option value="Even">Even</option>
                            <option value="Odd">Odd</option>
                            <option value="CALL">Rise</option>
                            <option value="PUT">Fall</option>
                          </select>
                          {cond.purchaseAction.includes('OVER') || cond.purchaseAction.includes('UNDER') ? (
                            <>
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
                            </>
                          ) : null}
                        </div>

                        {/* Live Pattern tag preview */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Pattern:</span>
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-500 font-mono font-bold text-[10px] border border-rose-500/40">
                            7
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

              {/* ── BLOCK 4: RECOVERY PURCHASE (Conditions de Martingale) ─ */}
              <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="bg-[#0b1120] text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 font-mono text-xs font-bold tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">🛒</span>
                    <span>RECOVERY PURCHASE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={recoveryAnalysisEnabled}
                        onChange={e => setRecoveryAnalysisEnabled(e.target.checked)}
                        className="rounded accent-cyan-500 w-3.5 h-3.5"
                      />
                      <span>Enable Analysis</span>
                    </label>
                    <span className="bg-slate-800 text-slate-300 rounded px-2 py-0.5 text-[10px] font-bold">
                      {recoveryAnalysisMode}
                    </span>
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
                      className="w-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 font-mono text-center font-bold"
                    />
                    <span className="text-slate-500">trades</span>
                  </div>

                  {/* Recovery Rules */}
                  {recoveryConditions.map((cond, idx) => (
                    <div key={cond.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
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
                            <option value="all even">all even</option>
                            <option value="all odd">all odd</option>
                            <option value="less or equal to">less or equal to</option>
                            <option value="greater or equal to">greater or equal to</option>
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
                            className="bg-white dark:bg-slate-800 border rounded px-2 py-0.5 font-bold text-amber-400"
                          >
                            <option value="Odd">Odd</option>
                            <option value="Even">Even</option>
                            <option value="Over">Over</option>
                            <option value="Under">Under</option>
                          </select>
                        </div>

                        {/* Live Pattern sequence */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Last 4 pattern:</span>
                          <div className="flex items-center gap-0.5">
                            <span className="px-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">2</span>
                            <span className="px-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">4</span>
                            <span className="px-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">4</span>
                            <span className="px-1 rounded bg-rose-500/20 text-rose-500 font-mono text-[10px]">7</span>
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
                          lastDigitsCount: 3,
                          operator: 'all even',
                          targetDigit: 0,
                          purchaseAction: 'Odd',
                          prediction: '',
                          previewPattern: [2, 4, 6]
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
          ) : (
            /* ── CODE INSPECTOR & EDITOR (XML / JSON RAW) ─────────────── */
            <div className="bg-white dark:bg-[#0b1120] rounded-2xl border-2 border-slate-300 dark:border-slate-800 shadow-2xl p-4 space-y-3 max-w-5xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                      Inspecteur &amp; Éditeur de Code ({codeType.toUpperCase()})
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Visualisez, modifiez ou collez le code XML/JSON complet d'un robot Deriv pour mettre à jour instantanément les blocs.
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
        </div>
      </div>

      {/* ── 4. BOTTOM STATUS BAR (Style TraderScheme / Deriv) ─────────────── */}
      <div className="bg-[#0b1120] text-slate-300 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow transition cursor-pointer ${
              isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {isRunning ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isRunning ? 'Stop' : 'Run'}</span>
          </button>

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            <span>{isRunning ? 'Bot is running (Test Simulation)' : 'Bot is not running'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span>Execution:</span>
            <button
              type="button"
              onClick={() => setExecutionSpeed(s => s === 'FAST' ? 'NORMAL' : 'FAST')}
              className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold border border-slate-700"
            >
              {executionSpeed}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{currentGmt}</span>
          </div>

          <span className="text-[10px] text-slate-500">© 2026 TraderScheme / Deriv</span>
        </div>
      </div>

      {/* ── MODAL 1: VIRTUAL HOOK SETTINGS ─────────────────────────────────── */}
      {showVhModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-500" />
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Configuration Virtual Hook</h3>
              </div>
              <button onClick={() => setShowVhModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Le Virtual Hook filtre les mauvaises séries en effectuant des tests virtuels à blanc. Le bot ne bascule sur le compte réel qu'après avoir essuyé un nombre prédéfini de pertes consécutives virtuelles.
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
                  Déclencheur (Nombre de pertes virtuelles avant mise réelle)
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

      {/* ── MODAL 2: PUBLIER POUR LES UTILISATEURS DU SITE ─────────────────── */}
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
    </div>
  )
}
