import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * roles: optional array — if provided, only those profile roles may pass.
 * super_admin always passes, since admins can see every module.
 */
export default function ProtectedRoute({ children, roles }) {
  const { session, role, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-bark/60">Loading…</div>
  }
  if (!session) return <Navigate to="/login" replace />
  if (roles && role !== 'super_admin' && !roles.includes(role)) {
    return <Navigate to="/" replace />
  }
  return children
}
