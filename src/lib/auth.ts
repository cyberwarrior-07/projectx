import { create } from 'zustand';
import { supabase } from './supabase';
import type { User } from '../types';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role?: 'student' | 'admin') => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      error: null,

      signIn: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Clear any stored auth data first
          localStorage.removeItem('auth-storage');
          
          if (!email || !password) {
            throw new Error('Email and password are required');
          }

          email = email.trim().toLowerCase();

          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) {
            throw new Error('Invalid email or password');
          }

          if (!authData.user) {
            throw new Error('No user data returned from authentication');
          }

          // Special handling for admin email
          if (email === 'admin@admin.com') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();

            if (profile) {
              set({ user: profile, error: null });
              return;
            }
          }
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (profileError || !profile) {
            throw new Error('Account not found. Please sign up first.');
          }

          set({ user: profile, error: null });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Login failed' });
          set({ user: null });
          // Clean up any existing session on error
          await supabase.auth.signOut();
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Clear any stored auth data
          localStorage.removeItem('auth-storage');
          
          await supabase.auth.signOut();
          set({ user: null });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to sign out' });
        } finally {
          set({ isLoading: false });
        }
      },

      signUp: async (email: string, password: string, fullName: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Input validation
          if (!email || !password || !fullName) {
            throw new Error('Email, password, and full name are required');
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            throw new Error('Please enter a valid email address');
          }

          // Validate password length
          if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
          }

          // Normalize inputs
          email = email.trim().toLowerCase();
          fullName = fullName.trim();

          // First check if user already exists
          const { data: existingUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (existingUser) {
            throw new Error('An account with this email already exists');
          }

          // Create auth user with email confirmation disabled
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
              data: {
                full_name: fullName,
              }
            }
          });

          if (signUpError || !authData.user) {
            throw new Error(signUpError?.message || 'Failed to create user account');
          }

          // Wait a short moment to ensure the auth user is fully created
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Create profile with a retry mechanism
          let profile = null;
          let retryCount = 0;
          const maxRetries = 3;

          while (!profile && retryCount < maxRetries) {
            try {
              const { data: newProfile, error: profileError } = await supabase
                .from('profiles')
                .insert([{
                  id: authData.user.id,
                  email: email,
                  full_name: fullName,
                  role: 'student',
                  created_at: new Date().toISOString(),
                }])
                .select()
                .single();

              if (profileError) {
                console.error('Profile creation error:', profileError);
                retryCount++;
                if (retryCount === maxRetries) {
                  throw new Error('Failed to create user profile after multiple attempts');
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                continue;
              }

              profile = newProfile;
            } catch (error) {
              console.error('Profile creation attempt failed:', error);
              retryCount++;
              if (retryCount === maxRetries) {
                throw error;
              }
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }

          if (!profile) {
            throw new Error('Failed to create user profile');
          }

          set({ user: profile, error: null });
        } catch (error) {
          console.error('Signup process error:', error);
          let errorMessage = 'Failed to sign up';
          
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          set({ error: errorMessage, user: null });
          // Clean up any existing session on error
          await supabase.auth.signOut();
        } finally {
          set({ isLoading: false });
        }
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Get current session
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            // Verify session is still valid
            const { data: session } = await supabase.auth.getSession();
            if (!session?.session) {
              // Session invalid, clear storage and sign out
              localStorage.removeItem('auth-storage');
              set({ user: null });
              return;
            }

            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();

            if (profileError) {
              throw new Error('User profile not found. Please contact support.');
            }

            if (!profile) {
              // Create profile if it doesn't exist
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{
                  id: user.id,
                  email: user.email,
                  role: 'student',
                  full_name: user.email?.split('@')[0] || 'User'
                }])
                .select()
                .single();

              if (createError) {
                throw new Error('Failed to create user profile');
              }

              set({ user: newProfile });
            } else {
              set({ user: profile });
            }
          } else {
            set({ user: null });
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to check auth status' });
        } finally {
          set({ isLoading: false });
        }
      },
      
    }),
    {
      name: 'auth-storage',
    }
  )
);