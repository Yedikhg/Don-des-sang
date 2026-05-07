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
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Chargement de votre session...</p>
        </div>
      </div>
    )
  }

  if (requireRole && userType !== requireRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
