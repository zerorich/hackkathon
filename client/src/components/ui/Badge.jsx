export function Badge({ children, variant = 'primary', className = '', style = {} }) {
  return (
    <span className={`badge badge-${variant} ${className}`} style={style}>
      {children}
    </span>
  )
}
