import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  LogOut, 
  Settings,
  Image,
  Plus,
  ChevronRight,
  Search,
  Menu,
  X,
  PieChart,
  FileText,
  Folder
} from 'lucide-react';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';

export function AdminLayout() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState(['Dashboard']);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Update breadcrumbs based on current path
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const crumbs = ['Dashboard'];
    
    parts.forEach((part, index) => {
      if (part === 'admin') return;
      crumbs.push(part.charAt(0).toUpperCase() + part.slice(1));
    });
    
    setBreadcrumbs(crumbs);
  }, [window.location.pathname]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Implement search functionality here
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="flex">
        {/* Sidebar */}
        <div className={`${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        } min-h-screen glass-effect border-r border-gray-800 flex flex-col transition-all duration-300`}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              {!isSidebarCollapsed && (
                <h1 className="text-2xl font-bold gradient-text">Admin Panel</h1>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="ml-auto"
              >
                {isSidebarCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <nav className="mt-6 flex flex-col items-center space-y-4">
            <Button
              variant="ghost"
              className={`w-full h-10 flex ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} text-white hover:text-gray-200`}
              onClick={() => navigate('/admin')}
            >
              <LayoutDashboard className={`h-5 w-5 ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'} text-[#ff6600]`} />
              {!isSidebarCollapsed && 'Dashboard'}
            </Button>
            <Button
              variant="ghost"
              className={`w-full h-10 flex ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} text-white hover:text-gray-200`}
              onClick={() => navigate('/admin/courses')}
            >
              <BookOpen className={`h-5 w-5 ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'} text-[#ff6600]`} />
              {!isSidebarCollapsed && 'Courses'}
            </Button>
            <Button
              variant="ghost"
              className={`w-full h-10 flex ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} text-white hover:text-gray-200`}
              onClick={() => navigate('/admin/users')}
            >
              <Users className={`h-5 w-5 ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'} text-[#ff6600]`} />
              {!isSidebarCollapsed && 'Users'}
            </Button>
            <Button
              variant="ghost"
              className={`w-full h-10 flex ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} text-white hover:text-gray-200`}
              onClick={() => navigate('/admin/media')}
            >
              <Image className={`h-5 w-5 ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'} text-[#ff6600]`} />
              {!isSidebarCollapsed && 'Media Library'}
            </Button>
            <Button
              variant="ghost"
              className={`w-full h-10 flex ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} text-white hover:text-gray-200`}
              onClick={() => navigate('/admin/settings')}
            >
              <Settings className={`h-5 w-5 ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'} text-[#ff6600]`} />
              {!isSidebarCollapsed && 'Settings'}
            </Button>
            <Button
              variant="ghost"
              className={`w-full h-10 flex ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} text-red-400 hover:text-red-300`}
              onClick={handleSignOut}
            >
              <LogOut className={`h-5 w-5 ${isSidebarCollapsed ? 'mx-auto' : 'mr-3'} text-[#ff6600]`} />
              {!isSidebarCollapsed && 'Sign Out'}
            </Button>
            
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-screen overflow-x-hidden">
          {/* Top Bar */}
          <div className="glass-effect border-b border-gray-800 p-4">
            <div className="flex items-center justify-between">
              {/* Breadcrumbs */}
              <div className="flex items-center space-x-2 text-gray-200">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && <ChevronRight className="h-4 w-4 text-[#ff6600] mx-2" />}
                    <span>{crumb}</span>
                  </div>
                ))}
              </div>

              {/* Right Actions */}
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative">
                  {isSearchOpen ? (
                    <form onSubmit={handleSearch} className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ff6600]"
                        autoFocus
                      />
                      {isLoading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin text-sm">⏳</div>
                        </div>
                      )}
                    </form>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => setIsSearchOpen(true)}
                    >
                      <Search className="h-5 w-5 text-[#ff6600]" />
                    </Button>
                  )}
                </div>

                {/* Notifications */}

                {/* Admin Profile */}
                <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800 rounded-lg p-2 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ff6600] to-[#ff944d] flex items-center justify-center">
                    <span className="text-white font-medium text-sm">A</span>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-white">Admin User</p>
                    <p className="text-xs text-gray-300">Super Admin</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-900/30">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}