import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { pointsDisplay } from '@/lib/format'

// Header + top navigation + footer, ported from the Rails application layout and
// shared/_menu.html.erb.
export default function Layout({ children }: { children: ReactNode }) {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const standing = user?.standing

  const handleSignOut = () => {
    signOut()
    navigate('/sign-in', { replace: true })
  }

  const linkClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' nav-link-active' : ''}`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-brand text-white shadow-sm">
        <nav className="container-app flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3">
          <div className="flex w-full items-center justify-between lg:w-auto">
            <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white hover:text-white">
              <i className="fa fa-futbol-o" aria-hidden="true" />
              Typerek <span className="font-normal opacity-80">2026</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-md p-2 hover:bg-white/10 lg:hidden"
              aria-label="Menu"
            >
              <i className="fa fa-bars text-xl" aria-hidden="true" />
            </button>
          </div>

          <div
            className={`${open ? '' : 'hidden'} w-full lg:flex lg:w-auto lg:flex-1 lg:items-center lg:justify-between`}
          >
            <ul className="flex flex-col gap-1 lg:flex-row lg:items-center" onClick={() => setOpen(false)}>
              <li>
                <NavLink to="/" end className={linkClass}>
                  <i className="fa fa-info-circle" aria-hidden="true" /> Informacje
                </NavLink>
              </li>
              <li>
                <NavLink to="/matches" className={linkClass}>
                  <i className="fa fa-futbol-o" aria-hidden="true" /> Mecze
                </NavLink>
              </li>
              <li>
                <NavLink to="/ranking" className={linkClass}>
                  <i className="fa fa-trophy" aria-hidden="true" /> Ranking
                </NavLink>
              </li>
              {isAdmin && (
                <li>
                  <NavLink to="/users" className={linkClass}>
                    <i className="fa fa-envelope-o" aria-hidden="true" /> Zaproszenia
                  </NavLink>
                </li>
              )}
            </ul>

            <div className="mt-2 flex items-center gap-1 border-t border-white/20 pt-2 lg:mt-0 lg:border-0 lg:pt-0">
              <div className="px-3 text-sm leading-tight text-white/90">
                <div className="font-semibold">
                  <i className="fa fa-user" aria-hidden="true" /> {user?.username}
                </div>
                {standing?.rank != null && (
                  <Link to="/ranking" className="block text-xs text-white/70 hover:text-white">
                    {standing.rank}. miejsce · {pointsDisplay(standing.points)} pkt
                  </Link>
                )}
              </div>
              <NavLink to="/settings" className={linkClass} onClick={() => setOpen(false)}>
                <i className="fa fa-cog" aria-hidden="true" /> Ustawienia
              </NavLink>
              <button type="button" onClick={handleSignOut} className="nav-link">
                <i className="fa fa-sign-out" aria-hidden="true" /> Wyloguj
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main className="container-app flex-1 py-6">{children}</main>

      <footer className="border-t border-line/70 py-4 text-center text-xs text-muted">
        Typerek &middot; Mistrzostwa Świata 2026
      </footer>
    </div>
  )
}
