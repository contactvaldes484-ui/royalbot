import React from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Bot, Monitor, ArrowRight, Info } from 'lucide-react'
import BinanceConnectGuide from '../../components/guides/BinanceConnectGuide'
import useStore from '../../store/useStore'

export default function DashboardBots() {
  const { user } = useStore()
  const userPlan = (user?.subscription?.plan || '').toLowerCase()
  const isDerivUser =
    userPlan.includes('deriv') ||
    user?.subscription?.category === 'deriv' ||
    user?.subscription?.broker === 'deriv' ||
    localStorage.getItem('deriv_oauth_connected') === 'true' ||
    Boolean(user?.derivAccount) ||
    user?.tradingPreferences?.primaryBroker === 'deriv'

  if (isDerivUser) {
    return <Navigate to="/dashboard/deriv" replace />
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Robots de trading</h1>
        <p className="text-muted-foreground text-sm">
          Tous nos robots tradent la crypto sur Binance (Spot &amp; Futures).
        </p>
      </div>

      {/* Guide de connexion Binance (bandeau repliable) */}
      <BinanceConnectGuide variant="compact" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Plateforme Binance uniquement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pour démarrer un robot, connectez votre compte Binance via vos clés API
            (BTC, ETH, BNB, SOL et toutes les paires USDT) depuis la section Binance.
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary"><Monitor className="h-3 w-3 mr-1" /> Spot</Badge>
            <Badge variant="secondary"><Monitor className="h-3 w-3 mr-1" /> Futures</Badge>
            <Badge variant="secondary"><Bot className="h-3 w-3 mr-1" /> Robots auto</Badge>
          </div>

          <div className="flex gap-2">
            <Button asChild className="bg-gradient-to-r from-blue-500 to-violet-600">
              <Link to="/dashboard/binance">
                Connecter mon compte Binance
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/robots">Voir les robots disponibles</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
