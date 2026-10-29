import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { tradeAPI } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import {
  History, ChevronLeft, ChevronRight, Loader2, Filter, Trash2,
  RefreshCw, Bot, Zap, Bitcoin, Layers, AlertCircle, CheckCircle2
} from 'lucide-react'

const CATEGORIES = [
  { id: 'all', label: 'Tous les trades', icon: Layers },
  { id: 'deriv_manual', label: 'Trading Manuel SmartTrader', icon: Zap, color: 'text-emerald-400 border-emerald-500/30' },
  { id: 'deriv_robot', label: 'Robots Deriv SmartTrader', icon: Bot, color: 'text-violet-400 border-violet-500/30' },
  { id: 'binance', label: 'Robots Binance Crypto', icon: Bitcoin, color: 'text-amber-400 border-amber-500/30' },
  { id: 'bybit', label: 'Robots Bybit Multi-Marchés', icon: Layers, color: 'text-orange-400 border-orange-500/30' },
]

export default function DashboardTrades() {
  const [trades, setTrades] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ result: '', search: '' })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')

  const fetchTrades = async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 25 }
      if (selectedCategory !== 'all') params.category = selectedCategory
      if (filters.result) params.result = filters.result
      if (filters.search) params.search = filters.search

      const { data } = await tradeAPI.getAll(params)
      setTrades(data.trades || [])
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } catch (err) {
      console.error('Trades fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrades(1)
  }, [selectedCategory, filters.result])

  const handleDeleteTrade = async (tradeId) => {
    if (!window.confirm('Voulez-vous supprimer ce trade de votre historique ?')) return
    setActionLoading(true)
    try {
      await tradeAPI.deleteTrade(tradeId)
      setTrades(prev => prev.filter(t => t._id !== tradeId && t.contractId !== tradeId))
      setMessage('Trade supprimé avec succès.')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleClearHistory = async () => {
    const targetLabel = selectedCategory === 'all' ? 'TOUS les trades' : `les trades de la catégorie sélectionnée (${selectedCategory})`;
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${targetLabel} ?`)) return

    setActionLoading(true)
    try {
      await tradeAPI.clearTrades({ category: selectedCategory })
      setTrades([])
      setPagination({ page: 1, pages: 1, total: 0 })
      setMessage('Historique vidé avec succès.')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      alert(err.response?.data?.error || err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const resultColors = {
    win: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    loss: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  }

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'deriv_manual':
        return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Manuel SmartTrader</Badge>
      case 'deriv_robot':
        return <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/30">Robot Deriv</Badge>
      case 'binance':
        return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">Binance Crypto</Badge>
      case 'bybit':
        return <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/30">Bybit Multi-Marchés</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">Général</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Historique des Trades &amp; Contrats
          </h1>
          <p className="text-muted-foreground text-sm">
            Recensement complet de vos trades par catégorie : Trading Manuel, Robots Deriv SmartTrader, Binance &amp; Bybit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTrades(pagination.page)}
            disabled={loading || actionLoading}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearHistory}
            disabled={loading || actionLoading || trades.length === 0}
            className="text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Vider l'historique {selectedCategory !== 'all' ? `(${selectedCategory})` : ''}
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* SÉLECTEUR DE CATÉGORIE DE ROBOT / TRADING */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const isActive = selectedCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-card hover:bg-accent text-muted-foreground border-border'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* Filtres secondaires */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filters.result}
              onChange={e => setFilters({ ...filters, result: e.target.value })}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs"
            >
              <option value="">Tous les résultats (Gains &amp; Pertes)</option>
              <option value="win">Gagnés uniquement</option>
              <option value="loss">Perdus uniquement</option>
              <option value="pending">En cours d'exécution</option>
            </select>
            <span className="text-xs text-muted-foreground ml-auto font-mono">
              {pagination.total} trades enregistrés
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des trades */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <History className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <p className="text-sm font-semibold text-muted-foreground">Aucun trade trouvé pour cette catégorie.</p>
              <p className="text-xs text-slate-500">Lancez un robot ou placez un contrat manuel pour voir vos transactions ici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Catégorie</th>
                    <th className="text-left p-3">Type / Contrat</th>
                    <th className="text-left p-3">Marché / Symbole</th>
                    <th className="text-right p-3">Mise</th>
                    <th className="text-right p-3">Profit / PnL</th>
                    <th className="text-center p-3">Statut</th>
                    <th className="text-center p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-mono">
                  {trades.map(t => (
                    <tr key={t._id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground font-sans text-[11px]">
                        {formatDate(t.openedAt)}
                      </td>
                      <td className="p-3 font-sans">
                        {getCategoryBadge(t.category)}
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {t.contractType}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {t.symbol}
                      </td>
                      <td className="p-3 text-right">
                        ${Number(t.stake || 0).toFixed(2)}
                      </td>
                      <td className={`p-3 text-right font-bold ${
                        Number(t.profit) > 0 ? 'text-emerald-500' : Number(t.profit) < 0 ? 'text-rose-500' : 'text-slate-400'
                      }`}>
                        {Number(t.profit) > 0 ? `+${Number(t.profit).toFixed(2)}` : Number(t.profit).toFixed(2)} USD
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${resultColors[t.result] || 'bg-muted'}`}>
                          {t.result === 'win' ? 'GAGNÉ' : t.result === 'loss' ? 'PERDU' : 'EN COURS'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteTrade(t._id)}
                          title="Supprimer ce trade"
                          className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} sur {pagination.pages} ({pagination.total} trades)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTrades(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="h-7 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTrades(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="h-7 text-xs"
                >
                  Suivant <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
