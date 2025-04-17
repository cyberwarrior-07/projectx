import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Home, 
  LayoutDashboard, 
  LogOut, 
  Calendar, 
  GraduationCap,
  Bell,
  Search,
  HelpCircle,
  User,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth';

export function Layout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [notifications] = useState([
    { id: 1, text: 'New assignment due tomorrow' },
    { id: 2, text: 'Quiz results available' }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Prevent body scroll when mobile menu is open
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isSidebarOpen]);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen gradient-bg">
      <nav className="glass-effect border-b border-gray-800 bg-gray-900/95 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between">
            {/* Left section */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden"
              >
                {isSidebarOpen ? <X className="h-5 w-5 text-[#ff6600]" /> : <Menu className="h-5 w-5 text-[#ff6600]" />}
              </Button>
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-[#ff6600]" />
                <span className="ml-2 text-xl font-bold gradient-text">
                  LMS Portal
                </span>
              </div>

              <div className="hidden lg:flex space-x-4">
                <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="text-white hover:text-gray-200"
              >
                <Home className="h-5 w-5 mr-2 text-[#ff6600]" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/courses')}
                className="text-white hover:text-gray-200"
              >
                <BookOpen className="h-5 w-5 mr-2 text-[#ff6600]" />
                My Courses
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/calendar')}
                className="text-white hover:text-gray-200"
              >
                <Calendar className="h-5 w-5 mr-2 text-[#ff6600]" />
                Calendar
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/gradebook')}
                className="text-white hover:text-gray-200"
              >
                <GraduationCap className="h-5 w-5 mr-2 text-[#ff6600]" />
                Grades
              </Button></div>
            </div>
            {/* Right section */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                {isSearchOpen ? (
                  <input
                    type="text"
                    placeholder="Search courses..."
                    className="w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
                    autoFocus
                    onBlur={() => setIsSearchOpen(false)}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setIsSearchOpen(true)}
                    className="text-white hover:text-gray-200"
                  >
                    <Search className="h-5 w-5 text-[#ff6600]" />
                  </Button>
                )}
              </div>

              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative text-white hover:text-gray-200"
                >
                  <Bell className="h-5 w-5 text-[#ff6600]" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#ff6600] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 glass-effect rounded-lg shadow-lg z-50">
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-200 mb-3">Notifications</h3>
                      <div className="space-y-2">
                        {notifications.map(notification => (
                          <div key={notification.id} className="p-2 hover:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-300">{notification.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Help */}
              <Button variant="ghost" className="text-white hover:text-gray-200">
                <HelpCircle className="h-5 w-5 text-[#ff6600]" />
              </Button>
              {/* User Profile */}
              <div
                className="relative"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <Button
                  variant="ghost"
                  className="text-white hover:text-gray-200"
                >
                  <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ff6600] to-[#ff944d] flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2 text-[#ff6600]" />
                  </div>
                </Button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 py-1 glass-effect rounded-lg shadow-lg z-50">
                    <div className="px-4 py-2 text-sm text-gray-200 border-b border-gray-800">
                      <div className="font-medium">{user?.full_name}</div>
                      <div className="text-gray-400 text-xs">{user?.email}</div>
                    </div>
                    <div
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-[#ff6600] hover:bg-gray-800 flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar for mobile */}
        <div
          className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:hidden transition-transform duration-300 ease-in-out z-50 w-64 glass-effect overflow-y-auto`}
        >
          <div className="h-full flex flex-col py-6">
            <div className="space-y-2 px-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="w-full justify-start text-white hover:text-gray-200"
              >
                <Home className="h-5 w-5 mr-2 text-[#ff6600]" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/courses')}
                className="w-full justify-start text-white hover:text-gray-200"
              >
                <BookOpen className="h-5 w-5 mr-2 text-[#ff6600]" />
                My Courses
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/calendar')}
                className="w-full justify-start text-white hover:text-gray-200"
              >
                <Calendar className="h-5 w-5 mr-2 text-[#ff6600]" />
                Calendar
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/gradebook')}
                className="w-full justify-start text-white hover:text-gray-200"
              >
                <GraduationCap className="h-5 w-5 mr-2 text-[#ff6600]" />
                Grades
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full">
          {/* Overlay for mobile */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        <Outlet />
        </main>
      </div>
    </div>
  );
}