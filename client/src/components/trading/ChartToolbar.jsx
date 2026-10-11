import React from 'react'
import {
  TrendingUp, BarChart3, Activity, Minus, Target,
  Maximize2, ZoomIn, ZoomOut, RotateCcw, Crosshair,
  Layers, LineChart
} from 'lucide-react'

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1']

const INDICATOR_LIST = [
  { key: 'ema8', label: 'EMA 8', color: '#f0b90b' },
  { key: 'ema21', label: 'EMA 21', color: '#1e88e5' },
  { key: 'ema50', label: 'EMA 50', color: '#e040fb' },
  { key: 'bb', label: 'Bollinger', color: '#2196f3' },
]

export default function ChartToolbar({
  timeframe = 'M5', onTimeframeChange,
  indicators = {}, onToggleIndicator,
  symbol, symbols = [], onSymbolChange,
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-[#0f1118] border-b border-[#1a1e2e] text-xs">
      {/* Symbol selector */}
      <select
        value={symbol}
        onChange={e => onSymbolChange?.(e.target.value)}
        className="bg-[#1a1e2e] text-white border-none rounded px-2 py-1 text-xs font-semibold outline-none cursor-pointer min-w-[100px]"
      >
        {symbols.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="w-px h-5 bg-[#1a1e2e] mx-1" />

      {/* Timeframes */}
      <div className="flex gap-0.5">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            onClick={() => onTimeframeChange?.(tf)}
            className={`px-2 py-1 rounded font-medium transition-colors ${
              timeframe === tf
                ? 'bg-blue-600 text-white'
                : 'text-[#848e9c] hover:text-white hover:bg-[#1a1e2e]'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-[#1a1e2e] mx-1" />

      {/* Indicators */}
      <div className="flex gap-0.5 items-center">
        <Layers className="h-3.5 w-3.5 text-[#848e9c] mr-1" />
        {INDICATOR_LIST.map(ind => (
          <button
            key={ind.key}
            onClick={() => onToggleIndicator?.(ind.key)}
            className={`px-2 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
              indicators[ind.key]
                ? 'text-white bg-[#1a1e2e]'
                : 'text-[#555] hover:text-[#848e9c]'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: indicators[ind.key] ? ind.color : '#333' }} />
            {ind.label}
          </button>
        ))}
      </div>

      <div className="w-px h-5 bg-[#1a1e2e] mx-1" />

      {/* Drawing tools */}
      <div className="flex gap-0.5 items-center">
        {[
          { icon: Crosshair, label: 'Crosshair', key: 'crosshair' },
          { icon: TrendingUp, label: 'Trend Line', key: 'trendline' },
          { icon: Minus, label: 'Horizontal', key: 'hline' },
          { icon: Target, label: 'Fibonacci', key: 'fibonacci' },
          { icon: LineChart, label: 'Measure', key: 'measure' },
        ].map(tool => (
          <button
            key={tool.key}
            title={tool.label}
            className="p-1.5 rounded text-[#848e9c] hover:text-white hover:bg-[#1a1e2e] transition-colors"
          >
            <tool.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Fullscreen / Reset */}
      <div className="flex gap-0.5">
        <button className="p-1.5 rounded text-[#848e9c] hover:text-white hover:bg-[#1a1e2e] transition-colors" title="Reset zoom">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button className="p-1.5 rounded text-[#848e9c] hover:text-white hover:bg-[#1a1e2e] transition-colors" title="Fullscreen">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
