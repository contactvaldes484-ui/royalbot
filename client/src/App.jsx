import React, { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import useStore from './store/useStore'
import { Loader2 } from 'lucide-react'

// Layout (kept eager — needed on every page)
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import DashboardLayout from './components/layout/DashboardLayout'
import Toaster from './components/ui/Toaster'
import WhatsAppButton from './components/ui/WhatsAppButton'

// Lazy-loaded public pages
const Landing = lazy(() => import('./pages/Landing'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Robots = lazy(() => import('./pages/Robots'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Contact = lazy(() => import('./pages/Contact'))
const Blog = lazy(() => import('./pages/Blog'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const PlanDetails = lazy(() => import('./pages/PlanDetails'))
const Backtest = lazy(() => import('./pages/Backtest'))
const Shop = lazy(() => import('./pages/Shop'))
const RobotDetail = lazy(() => import('./pages/RobotDetail'))
const ShopRobotDetail = lazy(() => import('./pages/ShopRobotDetail'))
const ShopVendorDetail = lazy(() => import('./pages/ShopVendorDetail'))
const Markets = lazy(() => import('./pages/Markets'))
const CopyTrading = lazy(() => import('./pages/CopyTrading'))
const CopyTraderProfile = lazy(() => import('./pages/CopyTraderProfile'))
const DerivCallback = lazy(() => import('./pages/DerivCallback'))

// Lazy-loaded dashboard pages
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'))
const DashboardBots = lazy(() => import('./pages/dashboard/DashboardBots'))
const DashboardAnalytics = lazy(() => import('./pages/dashboard/DashboardAnalytics'))
const DashboardTrades = lazy(() => import('./pages/dashboard/DashboardTrades'))
const DashboardWithdrawals = lazy(() => import('./pages/dashboard/DashboardWithdrawals'))
const DashboardSubscription = lazy(() => import('./pages/dashboard/DashboardSubscription'))
const DashboardSettings = lazy(() => import('./pages/dashboard/DashboardSettings'))
const DashboardBinance = lazy(() => import('./pages/dashboard/DashboardBinance'))
const DashboardGuide = lazy(() => import('./pages/dashboard/DashboardGuide'))
const DashboardGroups = lazy(() => import('./pages/dashboard/DashboardGroups'))
const MyCopyTrading = lazy(() => import('./pages/dashboard/MyCopyTrading'))
const BecomeMaster = lazy(() => import('./pages/dashboard/BecomeMaster'))
const MasterEarnings = lazy(() => import('./pages/dashboard/MasterEarnings'))
const ForexAI = lazy(() => import('./pages/dashboard/ForexAI'))
const ForexScanner = lazy(() => import('./pages/dashboard/ForexScanner'))
const ForexAlerts = lazy(() => import('./pages/dashboard/ForexAlerts'))
const VendorRobots = lazy(() => import('./pages/dashboard/VendorRobots'))
const VendorEarnings = lazy(() => import('./pages/dashboard/VendorEarnings'))
const VendorApply = lazy(() => import('./pages/dashboard/VendorApply'))
const DashboardDeriv = lazy(() => import('./pages/dashboard/DashboardDeriv'))
const AdminForexAI = lazy(() => import('./pages/admin/AdminForexAI'))
const AdminBinance = lazy(() => import('./pages/admin/AdminBinance'))
const AdminDeriv = lazy(() => import('./pages/admin/AdminDeriv'))

// Admin sub-pages loaded from same chunk
const adminPage = (name) => lazy(() =>
  import('./pages/admin/AdminDashboard').then(m => ({ default: m[name] }))
)
const AdminLayout = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminLayout })))
const AdminOverview = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = adminPage('AdminUsers')
const AdminBots = adminPage('AdminBots')
const AdminPlans = lazy(() => import('./pages/admin/AdminPlans'))
const AdminWithdrawals = adminPage('AdminWithdrawals')
const AdminRevenue = adminPage('AdminRevenue')
const AdminNotifications = adminPage('AdminNotifications')
const AdminSubscriptions = adminPage('AdminSubscriptions')
const AdminScreenshots = adminPage('AdminScreenshots')
const AdminSettings = adminPage('AdminSettings')
const AdminOrders = adminPage('AdminOrders')
const AdminSecurity = adminPage('AdminSecurity')
const AdminGroups = adminPage('AdminGroups')
const AdminCopyTrading = lazy(() => import('./pages/admin/AdminCopyTrading'))
const AdminVendors = adminPage('AdminVendors')
const AdminReviews = adminPage('AdminReviews')

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
    </div>
  )
}

function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  const { theme, fetchUser, isAuthenticated, connectWS, disconnectWS, fetchPlatformSettings } = useStore()

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Fetch platform settings on mount (public, no auth)
  useEffect(() => {
    fetchPlatformSettings()
  }, [])

  // Fetch user on mount if token exists
  useEffect(() => {
    if (isAuthenticated) {
      fetchUser()
    }
  }, [])

  // WebSocket connection
  useEffect(() => {
    if (isAuthenticated) {
      connectWS()
      return () => disconnectWS()
    }
  }, [isAuthenticated])

  return (
    <Router>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
        <Route path="/pricing" element={<PublicLayout><Pricing /></PublicLayout>} />
        <Route path="/robots" element={<PublicLayout><Robots /></PublicLayout>} />
        <Route path="/login" element={<Suspense fallback={<LoadingFallback />}><Login /></Suspense>} />
        <Route path="/register" element={<Suspense fallback={<LoadingFallback />}><Register /></Suspense>} />
        <Route path="/faq" element={<PublicLayout><FAQ /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
        <Route path="/blog" element={<PublicLayout><Blog /></PublicLayout>} />
        <Route path="/leaderboard" element={<PublicLayout><Leaderboard /></PublicLayout>} />
        <Route path="/plan/:slug" element={<PublicLayout><PlanDetails /></PublicLayout>} />
        <Route path="/backtest" element={<PublicLayout><Backtest /></PublicLayout>} />
        <Route path="/shop" element={<PublicLayout><Shop /></PublicLayout>} />
        <Route path="/shop/vendors/:vendorId" element={<PublicLayout><ShopVendorDetail /></PublicLayout>} />
        <Route path="/shop/robots/:slug" element={<PublicLayout><ShopRobotDetail /></PublicLayout>} />
        <Route path="/robots/:slug" element={<PublicLayout><RobotDetail /></PublicLayout>} />
        <Route path="/markets" element={<PublicLayout><Markets /></PublicLayout>} />
        <Route path="/copy-trading" element={<PublicLayout><CopyTrading /></PublicLayout>} />
        <Route path="/copy-trading/:slug" element={<PublicLayout><CopyTraderProfile /></PublicLayout>} />
        <Route path="/deriv/callback" element={<Suspense fallback={<LoadingFallback />}><DerivCallback /></Suspense>} />

        {/* Dashboard routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="bots" element={<DashboardBots />} />
          <Route path="analytics" element={<DashboardAnalytics />} />
          <Route path="trades" element={<DashboardTrades />} />
          <Route path="withdrawals" element={<DashboardWithdrawals />} />
          <Route path="subscription" element={<DashboardSubscription />} />
          <Route path="settings" element={<DashboardSettings />} />
          <Route path="binance" element={<DashboardBinance />} />
          <Route path="deriv" element={<DashboardDeriv />} />
          <Route path="guide" element={<DashboardGuide />} />
          <Route path="groups" element={<DashboardGroups />} />
          <Route path="copy-trading" element={<MyCopyTrading />} />
          <Route path="become-master" element={<BecomeMaster />} />
          <Route path="master-earnings" element={<MasterEarnings />} />
          <Route path="forex-ai" element={<ForexAI />} />
          <Route path="forex-scanner" element={<ForexScanner />} />
          <Route path="forex-alerts" element={<ForexAlerts />} />
          <Route path="vendor-apply" element={<VendorApply />} />
          <Route path="vendor-robots" element={<VendorRobots />} />
          <Route path="vendor-earnings" element={<VendorEarnings />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={<Suspense fallback={<LoadingFallback />}><AdminLayout /></Suspense>}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="bots" element={<AdminBots />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="withdrawals" element={<AdminWithdrawals />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="screenshots" element={<AdminScreenshots />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="security" element={<AdminSecurity />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="groups" element={<AdminGroups />} />
          <Route path="copy-trading" element={<AdminCopyTrading />} />
          <Route path="vendors" element={<AdminVendors />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="forex-ai" element={<AdminForexAI />} />
          <Route path="binance" element={<AdminBinance />} />
          <Route path="deriv" element={<AdminDeriv />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={
          <PublicLayout>
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold gradient-text mb-4">404</h1>
                <p className="text-lg text-muted-foreground mb-6">Page non trouvée</p>
                <a href="/" className="text-primary hover:underline">Retour à l'accueil</a>
              </div>
            </div>
          </PublicLayout>
        } />
      </Routes>
      <WhatsAppButton />
    </Router>
  )
}
