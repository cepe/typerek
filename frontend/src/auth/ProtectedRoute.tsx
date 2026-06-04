import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Layout from '@/components/Layout'
import { useAuth } from './AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <i className="fa fa-spinner fa-spin text-2xl" aria-hidden="true" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}
