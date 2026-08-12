export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-card border border-bark/20 bg-white px-3 py-2.5 text-sm focus:border-forest ${className}`}
      {...props}
    />
  )
}
