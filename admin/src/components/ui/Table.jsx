export function Table({ headers = [], children, style = {}, className = '' }) {
  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-card, #e2e8f0)',
        backgroundColor: '#ffffff',
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
              borderBottom: '1px solid var(--border-subtle, #e8ecf1)',
              backgroundColor: '#f8f9fb',
            }}
          >
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  padding: '12px 16px',
                  fontWeight: '600',
                  color: 'var(--text-secondary, #64748b)',
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
        borderBottom: '1px solid var(--border-subtle, #e8ecf1)',
        transition: 'background-color 0.15s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      className={className}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f8f9fb'
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
        color: 'var(--text-primary, #1e293b)',
        verticalAlign: 'middle',
        ...style,
      }}
      className={className}
    >
      {children}
    </td>
  )
}
