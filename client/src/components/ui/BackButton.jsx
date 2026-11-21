import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function BackButton({ fallback = '/', className = '', label = 'Retour' }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallback)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-semibold text-foreground transition cursor-pointer ${className}`}
    >
      <i className="fa-solid fa-arrow-left text-[11px]" />
      <span>{label}</span>
    </button>
  )
}
