import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { User, Menu } from 'lucide-react'
import ThemeToggle from '../common/ThemeToggle'
import NotificationBell from './NotificationBell.jsx'

const Header = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const displayName = user?.username || user?.name || user?.email || 'User';
  const initial = displayName?.charAt(0)?.toUpperCase?.() || 'U';

  return (
    <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
      <div className="mx-auto flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: mobile menu */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">Dashboard</span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <NotificationBell />

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{user?.email || 'Signed in'}</span>
            </div>
            <span className="sm:hidden text-sm font-semibold text-slate-900 dark:text-slate-100" aria-label="User initial">{initial}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header