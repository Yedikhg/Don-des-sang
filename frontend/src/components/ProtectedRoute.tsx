import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

type Props = {
  children: React.ReactNode
  requireRole?: 'donor' | 'hospital' | 'admin'
}

export default function ProtectedRoute({ children, requireRole }: Props) {
  const location = useLocation()
  const { token, currentUser, userType } = useApp()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Token exists, but user not yet loaded: show lightweight loading state.
  if (!currentUser || !userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 text-sm text-gray-700">
          Chargement…
        </div>
      </div>
    )
  }

  if (requireRole && userType !== requireRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
