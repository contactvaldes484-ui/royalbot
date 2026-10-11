import React from 'react'
import useStore from '../../store/useStore'
import { CheckCircle2, AlertTriangle, Info, X, DollarSign } from 'lucide-react'

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
  info: Info,
}

const COLORS = {
  success: 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  error: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400',
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400',
}

export default function Toaster() {
  const notifications = useStore(s => s.notifications)
  const remove = (id) => useStore.setState(s => ({ notifications: s.notifications.filter(n => n.id !== id) }))

  if (!notifications?.length) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
      {notifications.map(n => {
        const Icon = n.title?.includes('Commission') ? DollarSign : (ICONS[n.type] || Info)
        return (
          <div key={n.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border backdrop-blur p-3 shadow-lg animate-in slide-in-from-right-5 fade-in ${COLORS[n.type] || COLORS.info}`}
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {n.title && <p className="text-xs font-bold mb-0.5">{n.title}</p>}
              {n.message && <p className="text-xs opacity-90 break-words">{n.message}</p>}
            </div>
            <button onClick={() => remove(n.id)} className="text-current opacity-50 hover:opacity-100 shrink-0">
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
