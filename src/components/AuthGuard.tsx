import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'instructor' | 'admin';
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const navigate = useNavigate();
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      await checkAuth();
    };

    init();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/auth');
      } else if (requiredRole && user.role !== requiredRole) {
        navigate(user.role === 'admin' ? '/admin' : '/dashboard');
      }
    }
  }, [user, isLoading, requiredRole, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    );
  }

  if (!user || (requiredRole && user.role !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
}