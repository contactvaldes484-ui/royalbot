import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import useStore from '../../store/useStore'
import { withdrawalAPI } from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import { Wallet, Loader2, AlertCircle, Check, Clock } from 'lucide-react'

export default function DashboardWithdrawals() {
  const { user } = useStore()
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ amount: '', method: 'crypto', walletAddress: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await withdrawalAPI.getAll()
        setWithdrawals(data.withdrawals)
      } catch {} finally { setLoading(false) }
    }
    fetch()
  }, [])

  const plan = user?.subscription?.plan || 'free'
  const commissionRate = plan === 'free' ? 10 : 0
  const estimatedCommission = form.amount ? (Number(form.amount) * commissionRate / 100) : 0
  const netAmount = form.amount ? Number(form.amount) - estimatedCommission : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)
    try {
      const { data } = await withdrawalAPI.request({
        amount: Number(form.amount),
        method: form.method,
        walletAddress: form.walletAddress
      })
      setMessage({ type: 'success', text: data.message })
      setForm({ amount: '', method: 'crypto', walletAddress: '' })
      const res = await withdrawalAPI.getAll()
      setWithdrawals(res.data.withdrawals)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erreur lors de la demande.' })
    } finally {
      setSubmitting(false)
    }
  }

  const statusColors = { pending: 'warning', processing: 'premium', completed: 'success', rejected: 'destructive' }
  const statusLabels = { pending: 'En attente', processing: 'En cours', completed: 'Complété', rejected: 'Rejeté' }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Retraits</h1>
        <p className="text-muted-foreground text-sm">Gérez vos demandes de retrait.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdrawal form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Nouveau Retrait
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

              {/* Commission preview */}
              {form.amount && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Montant</span>
                    <span>{formatCurrency(Number(form.amount))}</span>
                  </div>
                  {commissionRate > 0 && (
                    <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                      <span>Commission ({commissionRate}%)</span>
                      <span>-{formatCurrency(estimatedCommission)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Net à recevoir</span>
                    <span className="text-green-500">{formatCurrency(netAmount)}</span>
                  </div>
                </div>
              )}

              {commissionRate > 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Plan gratuit : commission {commissionRate}%. Passez Premium pour 0% !
                </p>
              )}

              <Button type="submit" variant="gradient" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Demander le retrait
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Withdrawal history */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Historique des retraits</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-10">
                <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun retrait pour le moment.</p>
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
                      {w.commission > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Comm: {formatCurrency(w.commission)}</p>
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
