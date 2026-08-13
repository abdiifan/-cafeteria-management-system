export default function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-card border border-bark/20 bg-white px-3 py-2.5 text-sm focus:border-forest ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
