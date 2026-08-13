export default function Field({ label, children, required }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-bark/80 mb-1">
        {label} {required && <span className="text-clay">*</span>}
      </span>
      {children}
    </label>
  )
}
