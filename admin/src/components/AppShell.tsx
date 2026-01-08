import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ToastProvider } from './Toast';
import { auth } from '../lib/auth';

const navigation = [
  { name: 'Inbox', path: '/inbox', icon: '📥' },
  { name: 'Clients', path: '/clients', icon: '👥' },
  { name: 'Templates', path: '/templates', icon: '📝' },
  { name: 'Messages', path: '/messages', icon: '💬' },
  { name: 'Settings', path: '/settings', icon: '⚙️' },
];

export function AppShell() {
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.clearToken();
    navigate('/login');
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-neutral-50">
        {/* Desktop Sidebar */}
        <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow bg-white border-r border-neutral-200">
            <div className="flex items-center flex-shrink-0 px-6 py-6">
              <h1 className="text-2xl font-bold text-neutral-900">AutoService</h1>
            </div>
            <nav className="flex-1 px-4 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`
                  }
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-neutral-200">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40">
          <div className="flex justify-around items-center h-16">
            {navigation.slice(0, 5).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 h-full ${
                    isActive ? 'text-primary-600' : 'text-neutral-500'
                  }`
                }
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs mt-1">{item.name}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="md:pl-64 pb-16 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
