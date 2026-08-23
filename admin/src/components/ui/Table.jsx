export function Table({ headers = [], children, style = {}, className = '' }) {
  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-card, rgba(255, 255, 255, 0.08))',
        backgroundColor: 'rgba(11, 17, 30, 0.4)',
        ...style,
      }}
      className={className}
    >
      <table
        className="app-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.86rem',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: '12px 16px',
                  fontWeight: '600',
                  color: 'var(--text-muted, #64748b)',
                  fontSize: '0.74rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  ...h.style,
                }}
              >
                {h.label || h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function TableRow({ children, onClick, style = {}, className = '' }) {
  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))',
        transition: 'background-color 0.15s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      className={className}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </tr>
  )
}

export function TableCell({ children, style = {}, className = '' }) {
  return (
    <td
      style={{
        padding: '14px 16px',
        color: 'var(--text-primary, #f8fafc)',
        verticalAlign: 'middle',
        ...style,
      }}
      className={className}
    >
      {children}
    </td>
  )
}
