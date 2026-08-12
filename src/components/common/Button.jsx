export default function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-card font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base'
  }
  const variants = {
    primary: 'bg-forest text-parchment hover:bg-forestLight',
    gold: 'bg-gold text-ink hover:brightness-95',
    outline: 'border border-bark/30 text-bark hover:bg-stone',
    ghost: 'text-bark hover:bg-stone',
    danger: 'bg-clay text-parchment hover:brightness-95'
  }
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
}
