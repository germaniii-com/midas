import { useEffect, useState } from 'react';
import { Outlet, useParams, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { Spinner } from '@heroui/react';
import {
  WalletIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  TagIcon,
  ArrowLeftOnRectangleIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { getBinderById, type Binder } from '../../api/binders';
import { useTheme } from '../../hooks/useTheme';

const navItems = [
  { label: 'Accounts', path: 'accounts', icon: WalletIcon },
  { label: 'Transactions', path: 'transactions', icon: ArrowsRightLeftIcon },
  { label: 'Payment Schedules', path: 'payment-schedules', icon: CalendarDaysIcon },
  { label: 'Reports', path: 'reports', icon: ChartBarIcon },
  { label: 'Tags', path: 'tags', icon: TagIcon },
];

export default function BinderLayout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [binder, setBinder] = useState<Binder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getBinderById(id)
      .then(setBinder)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!binder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-app-muted">Binder not found</p>
      </div>
    );
  }

  const basePath = `/binders/${id}`;

  function NavItems({ mobile }: { mobile?: boolean }) {
    return (
      <>
        {navItems.map((item) => {
          const to = `${basePath}/${item.path}`;
          const isActive = location.pathname === to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={to}
              className={
                mobile
                  ? `flex flex-col items-center gap-0.5 px-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'text-primary'
                        : 'text-app-muted hover:text-app-text'
                    }`
                  : `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-app-muted hover:text-app-text hover:bg-app-surface'
                    }`
              }
            >
              <Icon width={mobile ? 20 : 22} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-app-border bg-app-surface-secondary shrink-0">
        <div className="flex items-center gap-3 px-4 h-16 border-b border-app-border">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-app-surface text-app-muted hover:text-app-text transition-colors"
            aria-label="Back to binders"
          >
            <ArrowLeftOnRectangleIcon width={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold truncate">{binder.name}</h2>
            <p className="text-xs text-app-muted">{binder.currency}</p>
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-1 p-3">
          <NavItems />
        </nav>
        <div className="border-t border-app-border p-3">
          <button
            onClick={toggle}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-app-muted hover:text-app-text hover:bg-app-surface"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <MoonIcon width={22} /> : <SunIcon width={22} />}
            <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-app-surface-secondary border-t border-app-border safe-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          <NavItems mobile />
          <button
            onClick={toggle}
            className="flex flex-col items-center gap-0.5 px-1 py-1 text-xs font-medium rounded-lg transition-colors text-app-muted hover:text-app-text"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <MoonIcon width={20} /> : <SunIcon width={20} />}
            <span>Theme</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
