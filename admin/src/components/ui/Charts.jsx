import { useState } from 'react'
import { formatPercent } from '../../lib/utils'

export function AccuracyBarChart({ data = [], height = 220 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No topic data to display
      </div>
    )
  }

  const maxVal = 100
  const barWidth = Math.min(48, Math.max(24, Math.floor(400 / data.length)))

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: `${height}px`,
          paddingTop: '20px',
          paddingBottom: '32px',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {data.map((item, idx) => {
          const rawAcc = item.average_accuracy !== undefined ? item.average_accuracy : (item.accuracy || 0)
          const accuracy = Math.min(100, Math.max(0, Number(rawAcc)))
          const barHeightPercent = (accuracy / maxVal) * 100
          const label = item.title || item.name || `Topic ${idx + 1}`
          const isWeak = item.is_weak || accuracy < 60

          const barColor = accuracy >= 75 ? '#16a34a' : accuracy >= 60 ? '#d97706' : '#dc2626'

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                maxWidth: `${barWidth + 16}px`,
                height: '100%',
                justifyContent: 'flex-end',
                position: 'relative',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {hoveredIdx === idx && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: `calc(${barHeightPercent}% + 12px)`,
                    background: '#ffffff',
                    color: 'var(--text-primary)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    border: '1px solid var(--border-card)',
                    zIndex: 20,
                    pointerEvents: 'none',
                  }}
                >
                  <div>{label}</div>
                  <div style={{ color: barColor }}>{formatPercent(accuracy)} accuracy</div>
                  {isWeak && <div style={{ color: 'var(--danger)', fontSize: '0.7rem' }}>⚠️ Needs Attention</div>}
                </div>
              )}

              {/* Bar */}
              <div
                style={{
                  width: `${barWidth}px`,
                  height: `${Math.max(4, barHeightPercent)}%`,
                  background: barColor,
                  borderRadius: '6px 6px 2px 2px',
                  boxShadow: hoveredIdx === idx ? `0 2px 8px ${barColor}33` : 'none',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: hoveredIdx === null || hoveredIdx === idx ? 1 : 0.5,
                }}
              />

              {/* Label */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-24px',
                  fontSize: '0.72rem',
                  color: hoveredIdx === idx ? 'var(--text-primary)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                  fontWeight: hoveredIdx === idx ? '600' : '400',
                }}
                title={label}
              >
                {label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MasteryDonutChart({ distribution = {}, totalStudents = 0, size = 180 }) {
  const categories = [
    { key: 'MASTERED', label: 'Mastered', color: '#16a34a', count: distribution['MASTERED'] || 0 },
    { key: 'PROFICIENT', label: 'Proficient', color: '#2563eb', count: distribution['PROFICIENT'] || 0 },
    { key: 'DEVELOPING', label: 'Developing', color: '#d97706', count: distribution['DEVELOPING'] || 0 },
    { key: 'NEEDS_PRACTICE', label: 'Needs Practice', color: '#dc2626', count: distribution['NEEDS_PRACTICE'] || 0 },
  ]

  const total = categories.reduce((sum, c) => sum + c.count, 0) || totalStudents || 0
  const radius = size / 2 - 16
  const strokeWidth = 14
  const center = size / 2
  const circumference = 2 * Math.PI * radius

  let currentOffset = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            categories.map((cat, i) => {
              if (cat.count === 0) return null
              const percent = cat.count / total
              const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`
              const strokeDashoffset = -currentOffset
              currentOffset += circumference * percent

              return (
                <circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%',
                    transition: 'all 0.6s ease',
                  }}
                />
              )
            })}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            {total}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Students
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {categories.map((cat) => {
          const pct = total > 0 ? ((cat.count / total) * 100).toFixed(0) : 0
          return (
            <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cat.color }} />
              <span style={{ color: 'var(--text-secondary)', minWidth: '100px' }}>{cat.label}</span>
              <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{cat.count}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({pct}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AccuracyGauge({ value = 0, size = 120, label = 'Accuracy' }) {
  const percentage = Math.min(100, Math.max(0, Number(value) || 0))
  const radius = size / 2 - 10
  const strokeWidth = 10
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const color = percentage >= 75 ? '#16a34a' : percentage >= 50 ? '#d97706' : '#dc2626'

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.8s ease',
          }}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
          {percentage.toFixed(1)}%
        </span>
        {label && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</span>}
      </div>
    </div>
  )
}
