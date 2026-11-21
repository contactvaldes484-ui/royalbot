import React, { useEffect, useState } from 'react'
import useStore from '../store/useStore'

const INSTALLED_KEY = 'royalbot_pwa_installed'
const LATER_KEY = 'royalbot_pwa_later'

export default function PWAInstallBanner() {
  const { isAuthenticated } = useStore()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [manualTip, setManualTip] = useState(false)

  useEffect(() => {
    const isStandalone =
      (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' && window.navigator?.standalone === true)

    if (isStandalone) {
      localStorage.setItem(INSTALLED_KEY, '1')
      setVisible(false)
      return
    }

    const alreadyInstalled = localStorage.getItem(INSTALLED_KEY) === '1'
    const dismissedLater = sessionStorage.getItem(LATER_KEY) === '1'

    if (isAuthenticated && !alreadyInstalled && !dismissedLater) {
      setVisible(true)
    }

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (isAuthenticated && localStorage.getItem(INSTALLED_KEY) !== '1' && sessionStorage.getItem(LATER_KEY) !== '1') {
        setVisible(true)
      }
    }

    const onAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, '1')
      setDeferredPrompt(null)
      setVisible(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [isAuthenticated])

  if (!visible || !isAuthenticated) return null

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }))
      if (choice?.outcome === 'accepted') {
        localStorage.setItem(INSTALLED_KEY, '1')
        setVisible(false)
      }
      setDeferredPrompt(null)
    } else {
      setManualTip(true)
    }
  }

  const handleConfirmManualInstalled = () => {
    localStorage.setItem(INSTALLED_KEY, '1')
    setVisible(false)
  }

  const handleLater = () => {
    sessionStorage.setItem(LATER_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <i className="fa-solid fa-mobile-screen-button text-emerald-400 text-lg" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            Télécharger l&apos;application RoyalBot
          </p>
          <p className="text-xs text-slate-300">
            {manualTip
              ? 'Appuyez sur le menu de votre navigateur (⋮ ou Partager) puis sur « Installer l\'application » / « Ajouter à l\'écran d\'accueil ».'
              : 'Installez RoyalBot sur votre téléphone ou ordinateur pour un accès instantané à vos robots Deriv.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!manualTip ? (
          <button
            type="button"
            onClick={handleInstall}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <i className="fa-solid fa-download" />
            <span>Télécharger</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirmManualInstalled}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <i className="fa-solid fa-check" />
            <span>C&apos;est installé</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleLater}
          className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
