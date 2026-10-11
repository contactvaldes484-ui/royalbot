import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency = 'USD') {
  const num = Number(amount) || 0
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num)
}

export function formatPercent(value) {
  return `${(Number(value) || 0).toFixed(2)}%`
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date))
}

export function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num)
}

export function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}
