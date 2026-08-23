export function LoadingSkeleton({ height = '100px', width = '100%', borderRadius = '12px', style = {} }) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        animation: 'pulse 1.8s infinite ease-in-out',
        ...style,
      }}
    />
  )
}
