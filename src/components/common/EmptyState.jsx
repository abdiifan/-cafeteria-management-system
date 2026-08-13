export default function EmptyState({ message, action }) {
  return (
    <div className="text-center py-10 text-bark/60">
      <p className="text-sm">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
