import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { tradeAPI } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import { History, ChevronLeft, ChevronRight, Loader2, Filter } from 'lucide-react'

export default function DashboardTrades() {
  const [trades, setTrades] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({ contractType: '', result: '' })
  const [loading, setLoading] = useState(true)

  const fetchTrades = async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 20 }
      if (filters.contractType) params.contractType = filters.contractType
      if (filters.result) params.result = filters.result
      const { data } = await tradeAPI.getAll(params)
      setTrades(data.trades)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Trades fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTrades() }, [filters])

  const contractTypes = ['BUY', 'SELL', 'BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP']
  const resultColors = { win: 'success', loss: 'destructive', pending: 'warning', cancelled: 'secondary' }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historique des Trades</h1>
        <p className="text-muted-foreground text-sm">Consultez l'historique complet de vos transactions.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filters.contractType}
              onChange={e => setFilters({ ...filters, contractType: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Tous les contrats</option>
              {contractTypes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filters.result}
              onChange={e => setFilters({ ...filters, result: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Tous les résultats</option>
              <option value="win">Gain</option>
              <option value="loss">Perte</option>
              <option value="pending">En cours</option>
            </select>
            <span className="text-xs text-muted-foreground ml-auto">{pagination.total} trades au total</span>
          </div>
        </CardContent>
      </Card>

      {/* Trades table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-20">
              <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucun trade trouvé.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Contrat</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Symbole</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Mise</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Profit</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Résultat</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Martingale</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map(trade => (
                    <tr key={trade._id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground">{formatDate(trade.createdAt)}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{trade.contractType}</Badge>
                      </td>
                      <td className="p-3 text-xs">{trade.symbol}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(trade.stake)}</td>
                      <td className={`p-3 text-right font-semibold ${trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(trade.profit || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={resultColors[trade.result] || 'secondary'} className="text-xs capitalize">
                          {trade.result === 'win' ? 'Gain' : trade.result === 'loss' ? 'Perte' : trade.result}
                        </Badge>
                      </td>
                      <td className="p-3 text-center text-xs text-muted-foreground">
                        {trade.martingaleLevel > 0 ? `x${trade.martingaleLevel}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} sur {pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTrades(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTrades(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
