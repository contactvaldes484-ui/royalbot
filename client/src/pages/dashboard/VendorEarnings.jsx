import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { vendorAPI } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Loader2, DollarSign, ShoppingCart, Wallet, AlertCircle, Check, Clock } from 'lucide-react'

export default function VendorEarnings() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [withdrawals, setWithdrawals] = useState([])
  const [form, setForm] = useState({ amount: '', method: 'crypto', walletAddress: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [earnRes, wRes] = await Promise.all([
        vendorAPI.getEarnings(),
        vendorAPI.getWithdrawals().catch(() => ({ data: { withdrawals: [] } })),
      ])
      setData(earnRes.data)
      setWithdrawals(wRes.data?.withdrawals || [])
    } catch (err) {
      console.error('Vendor earnings error', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const statusColors = { pending: 'warning', processing: 'premium', completed: 'success', rejected: 'destructive' }
  const statusLabels = { pending: 'En attente', processing: 'En cours', completed: 'Complété', rejected: 'Rejeté' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    const amountNum = Number(form.amount)
    if (!amountNum || amountNum <= 0) {
      setMessage({ type: 'error', text: 'Montant invalide.' })
      return
    }

    const available = data?.earnings?.available || 0
    if (amountNum > available) {
      setMessage({ type: 'error', text: 'Montant supérieur à votre solde vendeur disponible.' })
      return
    }

    setSubmitting(true)
    try {
      const { data: res } = await vendorAPI.requestWithdrawal({
        amount: amountNum,
        method: form.method,
        walletAddress: form.walletAddress,
      })
      setMessage({ type: 'success', text: res.message || 'Demande de retrait envoyée.' })
      setForm({ amount: '', method: 'crypto', walletAddress: '' })
      await loadAll()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur lors de la demande de retrait.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  const earnings = data?.earnings || { total: 0, available: 0, paidOut: 0 }
  const stats = data?.stats || { totalSales: 0, totalGross: 0, totalVendorRevenue: 0 }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenus vendeur</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de vos ventes de robots sur la marketplace.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Revenus totaux</p>
            <p className="text-2xl font-bold">{formatCurrency(earnings.total || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Disponible au retrait</p>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(earnings.available || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Déjà payé</p>
            <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(earnings.paidOut || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Ventes confirmées</CardTitle>
            <ShoppingCart className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{stats.totalSales || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Chiffre d'affaires brut</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold">{formatCurrency(stats.totalGross || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Revenus nets vendeur</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold text-green-500">{formatCurrency(stats.totalVendorRevenue || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Retrait de vos revenus vendeurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {message && (
              <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 text-sm ${
                message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
              }`}>
                {message.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {message.text}
              </div>
            )}

            <p className="text-xs text-muted-foreground mb-3">
              Solde disponible: <span className="font-semibold text-green-500">{formatCurrency(earnings.available || 0)}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Montant ($)</label>
                <Input
                  type="number"
                  placeholder="100.00"
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  min="1"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Méthode</label>
                <select
                  value={form.method}
                  onChange={e => setForm({ ...form, method: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="crypto">Crypto</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank">Virement bancaire</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Adresse / Numéro</label>
                <Input
                  placeholder="Adresse wallet ou numéro"
                  value={form.walletAddress}
                  onChange={e => setForm({ ...form, walletAddress: e.target.value })}
                />
              </div>

              <Button type="submit" variant="gradient" className="w-full" disabled={submitting || earnings.available <= 0}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Demander le retrait
              </Button>

              {earnings.available <= 0 && (
                <p className="text-xs text-muted-foreground mt-1">Aucun solde disponible pour le moment.</p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Historique des retraits vendeurs</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-10">
                <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun retrait vendeur pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map(w => (
                  <div key={w._id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        w.status === 'completed' ? 'bg-green-500/10' : w.status === 'rejected' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                      }`}>
                        {w.status === 'completed' ? <Check className="h-4 w-4 text-green-500" /> :
                         w.status === 'rejected' ? <AlertCircle className="h-4 w-4 text-red-500" /> :
                         <Clock className="h-4 w-4 text-yellow-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(w.amount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(w.createdAt)} · {w.method}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={statusColors[w.status]} className="text-xs">{statusLabels[w.status]}</Badge>
                      {w.netAmount !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">Net: {formatCurrency(w.netAmount)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
