import React, { useState } from 'react'
import { Badge } from '../ui/badge'
import { ArrowUpCircle, ArrowDownCircle, Clock, DollarSign, TrendingUp, TrendingDown, Activity, History } from 'lucide-react'

function formatPrice(v, sym) {
  if (!v) return '—'
  if (sym === 'BTCUSD') return v.toFixed(1)
  if (sym === 'XAUUSD') return v.toFixed(2)
  if (sym?.includes('JPY')) return v.toFixed(3)
  return v.toFixed(5)
}

function timeSince(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

export default function PositionsPanel({ positions = [], currentPrices = {} }) {
  const [tab, setTab] = useState('open')

  const openPositions = positions.filter(p => p.status === 'open')
  const closedPositions = positions.filter(p => p.status === 'closed').slice(0, 30)

  const totalOpenPL = openPositions.reduce((sum, p) => {
    const currentPrice = currentPrices[p.symbol]?.bid || p.price || p.openPrice || 0
    const entry = p.price || p.openPrice || 0
    const dir = (p.tradeType === 'buy' || p.type === 'buy') ? 1 : -1
    const pipDiff = (currentPrice - entry) * dir
    return sum + pipDiff * (p.volume || 0.01) * 100000 * 0.1
  }, 0)

  return (
    <div className="bg-[#0f1118] border border-[#1a1e2e] rounded-lg overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-[#1a1e2e]">
        <button
          onClick={() => setTab('open')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
            tab === 'open' ? 'text-white border-b-2 border-blue-500 bg-[#1a1e2e]/50' : 'text-[#848e9c] hover:text-white'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Positions ({openPositions.length})
        </button>
        <button
          onClick={() => setTab('closed')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
            tab === 'closed' ? 'text-white border-b-2 border-blue-500 bg-[#1a1e2e]/50' : 'text-[#848e9c] hover:text-white'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Historique ({closedPositions.length})
        </button>

        {openPositions.length > 0 && (
          <div className="ml-auto pr-3 flex items-center gap-2 text-xs">
            <span className="text-[#848e9c]">P/L flottant:</span>
            <span className={`font-bold ${totalOpenPL >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
              {totalOpenPL >= 0 ? '+' : ''}{totalOpenPL.toFixed(2)}$
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[250px] overflow-y-auto">
        {tab === 'open' && (
          openPositions.length === 0 ? (
            <div className="py-8 text-center text-[#848e9c] text-xs">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucune position ouverte
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#555] border-b border-[#1a1e2e]">
                  <th className="text-left px-3 py-2 font-medium">Symbole</th>
                  <th className="text-left px-2 py-2 font-medium">Type</th>
                  <th className="text-right px-2 py-2 font-medium">Volume</th>
                  <th className="text-right px-2 py-2 font-medium">Prix entrée</th>
                  <th className="text-right px-2 py-2 font-medium">SL</th>
                  <th className="text-right px-2 py-2 font-medium">TP</th>
                  <th className="text-right px-2 py-2 font-medium">Prix actuel</th>
                  <th className="text-right px-2 py-2 font-medium">P/L</th>
                  <th className="text-right px-3 py-2 font-medium">Durée</th>
                </tr>
              </thead>
              <tbody>
                {openPositions.map((pos, i) => {
                  const entry = pos.price || pos.openPrice || 0
                  const current = currentPrices[pos.symbol]?.bid || entry
                  const isBuy = pos.tradeType === 'buy' || pos.type === 'buy'
                  const dir = isBuy ? 1 : -1
                  const pl = (current - entry) * dir * (pos.volume || 0.01) * 100000 * 0.1

                  return (
                    <tr key={i} className="border-b border-[#1a1e2e]/50 hover:bg-[#1a1e2e]/30 transition-colors">
                      <td className="px-3 py-2 font-semibold text-white">{pos.symbol}</td>
                      <td className="px-2 py-2">
                        <span className={`flex items-center gap-1 font-semibold ${isBuy ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                          {isBuy ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-white">{(pos.volume || 0.01).toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-white">{formatPrice(entry, pos.symbol)}</td>
                      <td className="px-2 py-2 text-right text-[#ef5350]">{formatPrice(pos.sl, pos.symbol)}</td>
                      <td className="px-2 py-2 text-right text-[#26a69a]">{formatPrice(pos.tp, pos.symbol)}</td>
                      <td className="px-2 py-2 text-right text-[#f0b90b] font-medium">{formatPrice(current, pos.symbol)}</td>
                      <td className={`px-2 py-2 text-right font-bold ${pl >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                        {pl >= 0 ? '+' : ''}{pl.toFixed(2)}$
                      </td>
                      <td className="px-3 py-2 text-right text-[#848e9c]">
                        <span className="flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" /> {pos.openTime ? timeSince(pos.openTime) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        )}

        {tab === 'closed' && (
          closedPositions.length === 0 ? (
            <div className="py-8 text-center text-[#848e9c] text-xs">
              <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Aucun historique
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#555] border-b border-[#1a1e2e]">
                  <th className="text-left px-3 py-2 font-medium">Symbole</th>
                  <th className="text-left px-2 py-2 font-medium">Type</th>
                  <th className="text-right px-2 py-2 font-medium">Volume</th>
                  <th className="text-right px-2 py-2 font-medium">Résultat</th>
                  <th className="text-right px-3 py-2 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.map((pos, i) => {
                  const isBuy = pos.tradeType === 'buy' || pos.type === 'buy'
                  const profit = pos.profit || 0
                  return (
                    <tr key={i} className="border-b border-[#1a1e2e]/50 hover:bg-[#1a1e2e]/30">
                      <td className="px-3 py-2 font-semibold text-white">{pos.symbol}</td>
                      <td className="px-2 py-2">
                        <span className={`font-semibold ${isBuy ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-white">{(pos.volume || 0.01).toFixed(2)}</td>
                      <td className="px-2 py-2 text-right">
                        <Badge variant={profit >= 0 ? 'success' : 'destructive'} className="text-[10px]">
                          {profit >= 0 ? 'WIN' : 'LOSS'}
                        </Badge>
                      </td>
                      <td className={`px-3 py-2 text-right font-bold ${profit >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
                        {profit >= 0 ? '+' : ''}{profit.toFixed(2)}$
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}
