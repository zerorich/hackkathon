import { forwardRef } from 'react'

export const FormField = ({ label, error, required, children, hint, style = {} }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', ...style }}>
      {label && (
        <label
          style={{
            fontSize: '0.82rem',
            fontWeight: '600',
            color: 'var(--text-primary, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {label}
          {required && <span style={{ color: '#f43f5e' }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: '0.78rem', color: '#fb7185', fontWeight: '500' }}>{error}</span>
      )}
    </div>
  )
}

export const Input = forwardRef(
  ({ label, error, required, hint, icon: Icon, style = {}, className = '', ...props }, ref) => {
    const inputElement = (
      <div style={{ position: 'relative', width: '100%' }}>
        {Icon && (
          <div
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted, #64748b)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          className={`app-input ${className}`}
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-input, #151d2f)',
            border: error ? '1.5px solid #f43f5e' : '1px solid var(--border-card, rgba(255, 255, 255, 0.12))',
            borderRadius: 'var(--radius-md, 10px)',
            padding: Icon ? '10px 14px 10px 40px' : '10px 14px',
            color: 'var(--text-primary, #f8fafc)',
            fontSize: '0.88rem',
            outline: 'none',
            transition: 'all 0.15s ease',
            ...style,
          }}
          onFocus={(e) => {
            if (!error) e.target.style.borderColor = 'var(--primary, #6366f1)'
            e.target.style.boxShadow = error
              ? '0 0 0 3px rgba(244, 63, 94, 0.2)'
              : '0 0 0 3px rgba(99, 102, 241, 0.25)'
          }}
          onBlur={(e) => {
            if (!error) e.target.style.borderColor = 'var(--border-card, rgba(255, 255, 255, 0.12))'
            e.target.style.boxShadow = 'none'
          }}
          {...props}
        />
      </div>
    )

    if (label || error || hint) {
      return (
        <FormField label={label} error={error} required={required} hint={hint}>
          {inputElement}
        </FormField>
      )
    }

    return inputElement
  }
)
Input.displayName = 'Input'

export const Textarea = forwardRef(
  ({ label, error, required, hint, rows = 3, style = {}, className = '', ...props }, ref) => {
    const textareaElement = (
      <textarea
        ref={ref}
        rows={rows}
        className={`app-input ${className}`}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-input, #151d2f)',
          border: error ? '1.5px solid #f43f5e' : '1px solid var(--border-card, rgba(255, 255, 255, 0.12))',
          borderRadius: 'var(--radius-md, 10px)',
          padding: '10px 14px',
          color: 'var(--text-primary, #f8fafc)',
          fontSize: '0.88rem',
          fontFamily: 'inherit',
          outline: 'none',
          resize: 'vertical',
          transition: 'all 0.15s ease',
          ...style,
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = 'var(--primary, #6366f1)'
          e.target.style.boxShadow = error
            ? '0 0 0 3px rgba(244, 63, 94, 0.2)'
            : '0 0 0 3px rgba(99, 102, 241, 0.25)'
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = 'var(--border-card, rgba(255, 255, 255, 0.12))'
          e.target.style.boxShadow = 'none'
        }}
        {...props}
      />
    )

    if (label || error || hint) {
      return (
        <FormField label={label} error={error} required={required} hint={hint}>
          {textareaElement}
        </FormField>
      )
    }

    return textareaElement
  }
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef(
  ({ label, error, required, hint, options = [], children, style = {}, className = '', ...props }, ref) => {
    const selectElement = (
      <select
        ref={ref}
        className={`app-input ${className}`}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-input, #151d2f)',
          border: error ? '1.5px solid #f43f5e' : '1px solid var(--border-card, rgba(255, 255, 255, 0.12))',
          borderRadius: 'var(--radius-md, 10px)',
          padding: '10px 14px',
          color: 'var(--text-primary, #f8fafc)',
          fontSize: '0.88rem',
          outline: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          ...style,
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = 'var(--primary, #6366f1)'
          e.target.style.boxShadow = error
            ? '0 0 0 3px rgba(244, 63, 94, 0.2)'
            : '0 0 0 3px rgba(99, 102, 241, 0.25)'
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = 'var(--border-card, rgba(255, 255, 255, 0.12))'
          e.target.style.boxShadow = 'none'
        }}
        {...props}
      >
        {children
          ? children
          : options.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ backgroundColor: '#131b2e', color: '#fff' }}>
                {opt.label}
              </option>
            ))}
      </select>
    )

    if (label || error || hint) {
      return (
        <FormField label={label} error={error} required={required} hint={hint}>
          {selectElement}
        </FormField>
      )
    }

    return selectElement
  }
)
Select.displayName = 'Select'
