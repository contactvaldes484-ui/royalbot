import React, { useState } from 'react'
import useStore from '../../store/useStore'
import { MessageCircle, X } from 'lucide-react'

// Official WhatsApp SVG icon
function WhatsAppIcon({ className = "w-6 h-6" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.979-.276-.1-.476-.15-.677.15-.2.301-.777.979-.953 1.18-.175.2-.351.226-.652.075s-1.272-.469-2.423-1.496c-.896-.799-1.5-1.786-1.676-2.087-.175-.301-.019-.464.132-.614.135-.135.301-.351.451-.527.151-.175.201-.301.301-.501.101-.2.05-.376-.025-.526-.075-.15-.677-1.631-.928-2.233-.244-.586-.493-.507-.677-.516l-.577-.01c-.201 0-.526.075-.802.376s-1.053 1.028-1.053 2.508 1.078 2.909 1.229 3.11c.15.2 2.122 3.24 5.141 4.544.718.311 1.279.497 1.716.636.721.23 1.377.198 1.896.12.578-.087 1.78-.727 2.031-1.43.251-.702.251-1.304.175-1.43-.075-.125-.276-.201-.577-.351zM12.04 2C6.522 2 2.04 6.48 2.04 12c0 1.98.581 3.824 1.583 5.378L2 22l4.78-1.57A9.97 9.97 0 0 0 12.04 22c5.518 0 10-4.48 10-10s-4.482-10-10-10zm0 18.25c-1.666 0-3.218-.49-4.526-1.332l-.325-.208-2.835.932.946-2.763-.227-.361A8.225 8.225 0 0 1 3.79 12c0-4.55 3.7-8.25 8.25-8.25 4.55 0 8.25 3.7 8.25 8.25 0 4.55-3.7 8.25-8.25 8.25z" />
    </svg>
  )
}

export default function WhatsAppButton() {
  const { platformSettings } = useStore()
  const [hovered, setHovered] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const rawLink = platformSettings?.whatsappLink?.trim()
  const whatsappUrl = rawLink || 'https://chat.whatsapp.com/'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      {/* Tooltip bubble on hover or first visit */}
      {!dismissed && (
        <div
          className={`hidden sm:flex items-center gap-2 bg-card border border-emerald-500/30 text-foreground px-3.5 py-2 rounded-xl shadow-xl transition-all duration-300 ${
            hovered ? 'opacity-100 translate-x-0' : 'opacity-90'
          }`}
        >
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Support & Communauté
            </span>
            <span className="text-[11px] text-muted-foreground">
              Rejoindre le groupe WhatsApp
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors ml-1"
            title="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Rejoindre le groupe WhatsApp RoyalBot"
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <WhatsAppIcon className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-300 text-[9px] font-bold text-emerald-950 items-center justify-center">
            1
          </span>
        </span>
      </a>
    </div>
  )
}
