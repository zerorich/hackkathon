import { cn } from '../../lib/utils'

export function Skeleton({ className = '', style = {} }) {
  return <div className={cn('skeleton', className)} style={style} />
}

export function StatsGridSkeleton({ count = 6 }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card" style={{ minHeight: '130px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <Skeleton style={{ width: '80px', height: '16px' }} />
            <Skeleton style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
          </div>
          <Skeleton style={{ width: '120px', height: '36px', marginBottom: '10px' }} />
          <Skeleton style={{ width: '90px', height: '14px' }} />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="table-container">
      <table className="custom-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <Skeleton style={{ width: '70px', height: '14px' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <Skeleton style={{ width: c === 0 ? '140px' : '80px', height: '18px' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardSkeleton({ height = 240 }) {
  return (
    <div className="card" style={{ height: `${height}px`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton style={{ width: '140px', height: '20px' }} />
        <Skeleton style={{ width: '60px', height: '20px' }} />
      </div>
      <Skeleton style={{ flex: 1, width: '100%', borderRadius: '10px' }} />
    </div>
  )
}
