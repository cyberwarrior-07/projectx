import { Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../lib/auth';
import { Home, BookOpen, Search, LogIn, LogOut, User, Menu, X, LayoutDashboard } from 'lucide-react';
import { Button } from './ui/Button';

export function MainLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen gradient-bg">
      <nav className="glass-effect border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <BookOpen className="h-8 w-8 text-[#ff6600]" />
                <span className="ml-2 text-xl font-bold gradient-text">ProjectX</span>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:ml-6 md:flex md:space-x-4">
                <Button
                  variant="ghost"
                  className="text-white hover:text-gray-200"
                  onClick={() => navigate('/')}
                >
                  <Home className="h-5 w-5 mr-2" />
                  Home
                </Button>
                {user && (
                  <Button
                    variant="ghost"
                    className="text-white hover:text-gray-200"
                    onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
                  >
                    <LayoutDashboard className="h-5 w-5 mr-2" />
                    Dashboard
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-white hover:text-gray-200"
                  onClick={() => navigate('/about')}
                >
                  About
                </Button>
                <Button
                  variant="ghost"
                  className="text-white hover:text-gray-200"
                  onClick={() => navigate('/services')}
                >
                  Services
                </Button>
                <Button
                  variant="ghost"
                  className="text-white hover:text-gray-200"
                  onClick={() => navigate('/contact')}
                >
                  Contact
                </Button>
              </div>
            </div>

            <div className="flex items-center">
              {/* Search */}
              <div className="hidden md:flex items-center relative">
                {isSearchOpen ? (
                  <div className="absolute right-0 w-96 z-10">
                    <input
                      type="text"
                      placeholder="Search courses..."
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
                      autoFocus
                      onBlur={() => setIsSearchOpen(false)}
                    />
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setIsSearchOpen(true)}
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                )}
              </div>

              {/* Login Button */}
              {user ? (
                <div className="relative ml-4">
                  <Button
                    variant="ghost"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="relative"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#ff6600] to-[#ff944d] flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {user?.full_name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                  </Button>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 py-1 glass-effect rounded-lg shadow-lg z-50">
                      <div className="px-4 py-2 text-sm text-gray-200 border-b border-gray-800">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-gray-400 text-xs">{user.email}</div>
                      </div>
                      <div
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 flex items-center cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  className="ml-4"
                  onClick={() => navigate('/auth')}
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Login
                </Button>
              )}

              {/* Mobile menu button */}
              <div className="md:hidden ml-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/')}
                >
                  <Home className="h-5 w-5 mr-2" />
                  Home
                </Button>
                {user && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
                  >
                    <LayoutDashboard className="h-5 w-5 mr-2" />
                    Dashboard
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/about')}
                >
                  About
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/services')}
                >
                  Services
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/contact')}
                >
                  Contact
                </Button>
              </div>
              {user && (
                <div className="border-t border-gray-800 pt-2 mt-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}