import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@/auth/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import InvitationPage from '@/pages/InvitationPage'
import HomePage from '@/pages/HomePage'
import MatchesPage from '@/pages/MatchesPage'
import MatchPage from '@/pages/MatchPage'
import MatchEditPage from '@/pages/MatchEditPage'
import RankingPage from '@/pages/RankingPage'
import SettingsPage from '@/pages/SettingsPage'
import UsersPage from '@/pages/UsersPage'
import UserProfilePage from '@/pages/UserProfilePage'
import PwaReloadPrompt from '@/components/PwaReloadPrompt'
import { useWebMcp } from '@/webmcp/useWebMcp'

export default function App() {
  useWebMcp()
  return (
    <>
      <PwaReloadPrompt />
      <Routes>
        {/* Public */}
        <Route path="/sign-in" element={<LoginPage />} />
        <Route path="/invitations/:token" element={<InvitationPage />} />

        {/* Authenticated (rendered inside the app Layout) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:id" element={<MatchPage />} />
          <Route path="/matches/:id/edit" element={<MatchEditPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
