import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppProvider } from './context/AppContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import HospitalRegistration from './pages/HospitalRegistration'
import DonorRegistration from './pages/DonorRegistration'
import CriticalAlertPage from './pages/CriticalAlertPage'
import HospitalDashboard from './pages/HospitalDashboard'
import DonorDashboard from './pages/DonorDashboard'
import DonorNearbyAlerts from './pages/DonorNearbyAlerts'
import DonorNavigation from './pages/DonorNavigation'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Navbar />
                <LandingPage />
              </>
            }
          />
          <Route
            path="/hospital/register"
            element={
              <>
                <Navbar />
                <div className="pt-16"><HospitalRegistration /></div>
              </>
            }
          />
          <Route
            path="/donor/register"
            element={
              <>
                <Navbar />
                <div className="pt-16"><DonorRegistration /></div>
              </>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/alert/:id" element={<CriticalAlertPage />} />
          <Route
            path="/hospital/dashboard"
            element={
              <ProtectedRoute requireRole="hospital">
                <HospitalDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donor/dashboard"
            element={
              <ProtectedRoute requireRole="donor">
                <DonorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donor/nearby-alerts"
            element={
              <ProtectedRoute requireRole="donor">
                <DonorNearbyAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/donor/navigation/:alertId"
            element={
              <ProtectedRoute requireRole="donor">
                <DonorNavigation />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
