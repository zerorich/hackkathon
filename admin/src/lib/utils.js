export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return '0'
  return new Intl.NumberFormat('en-US').format(val)
}

export function formatPercent(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return '0%'
  return `${Number(val).toFixed(decimals)}%`
}

export function formatDate(val) {
  if (!val) return '—'
  const date = new Date(val)
  if (isNaN(date.getTime())) return String(val)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function timeAgo(val) {
  if (!val) return '—'
  const date = new Date(val)
  if (isNaN(date.getTime())) return String(val)
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)

  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return formatDate(val)
}

export function getAccuracyBadge(accuracy) {
  const acc = Number(accuracy) || 0
  if (acc >= 75) return { variant: 'success', label: `${acc.toFixed(1)}%` }
  if (acc >= 50) return { variant: 'warning', label: `${acc.toFixed(1)}%` }
  return { variant: 'danger', label: `${acc.toFixed(1)}%` }
}

export function getMasteryBadge(category) {
  switch (category) {
    case 'MASTERED':
      return { variant: 'success', label: 'Mastered' }
    case 'PROFICIENT':
      return { variant: 'primary', label: 'Proficient' }
    case 'DEVELOPING':
      return { variant: 'warning', label: 'Developing' }
    case 'NEEDS_PRACTICE':
    default:
      return { variant: 'danger', label: 'Needs Practice' }
  }
}

export function getDifficultyBadge(difficulty) {
  switch (String(difficulty).toUpperCase()) {
    case 'HARD':
      return { variant: 'danger', label: 'Hard' }
    case 'MEDIUM':
      return { variant: 'warning', label: 'Medium' }
    case 'EASY':
    default:
      return { variant: 'success', label: 'Easy' }
  }
}
