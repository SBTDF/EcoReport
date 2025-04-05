import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  username: string | null;
}

interface AuthError {
  message: string;
  code?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const defaultContext: AuthContextType = {
  user: null,
  loading: true,
  signIn: async () => { throw new Error('Not implemented'); },
  signUp: async () => { throw new Error('Not implemented'); },
  signOut: async () => { throw new Error('Not implemented'); },
  resetPassword: async () => { throw new Error('Not implemented'); },
};

export const AuthContext = createContext<AuthContextType>(defaultContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const getProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error.message, error);
        return null;
      }

      console.log('Profile data:', profile);
      return profile;
    } catch (error) {
      console.error('Error in getProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error.message);
        setLoading(false);
        return;
      }

      if (session?.user) {
        console.log('Session found:', session.user);
        const profile = await getProfile(session.user.id);
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: profile?.username || null,
        });
      }
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event, session?.user);
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: profile?.username || null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthError = (error: any): AuthError => {
    console.error('Auth error details:', {
      error,
      type: typeof error,
      isError: error instanceof Error,
      message: error?.message,
      code: error?.code,
      status: error?.status,
      details: error?.details,
    });

    if (error instanceof Error) {
      return {
        message: error.message,
        code: (error as any).code,
      };
    }
    if (typeof error === 'object' && error !== null) {
      const message = error.message || error.error_description || error.details || 'An unexpected error occurred';
      console.error('Structured error:', { message, error });
      return {
        message,
        code: error.code,
      };
    }
    return {
      message: 'An unexpected error occurred',
    };
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Sign in error:', error);
        throw handleAuthError(error);
      }

      if (!data?.session) {
        console.error('No session returned after sign in');
        throw new Error('Failed to establish session');
      }

      console.log('Sign in successful:', {
        userId: data.session.user.id,
        email: data.session.user.email,
      });

      // Get user profile
      const profile = await getProfile(data.session.user.id);
      if (!profile) {
        console.error('No profile found after sign in');
        throw new Error('Profile not found');
      }

      // Update user state
      setUser({
        id: data.session.user.id,
        email: data.session.user.email || '',
        username: profile.username,
      });

      console.log('Sign in and profile fetch completed');
    } catch (error) {
      console.error('Sign in process failed:', error);
      throw handleAuthError(error);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      console.log('Starting sign up process:', { email, username });
      
      // First check if username is taken
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (profileCheckError) {
        console.error('Profile check error:', {
          error: profileCheckError,
          details: profileCheckError.details,
          message: profileCheckError.message,
        });
        throw handleAuthError(profileCheckError);
      }

      if (existingProfile) {
        console.error('Username already taken:', { username, existingProfile });
        throw new Error('Username is already taken');
      }

      // Create auth user
      console.log('Creating auth user with email:', email);
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username, // Store username in user metadata
          },
        },
      });

      if (signUpError) {
        console.error('Auth sign up error:', {
          error: signUpError,
          details: signUpError.message,
        });
        throw handleAuthError(signUpError);
      }

      if (!authData?.user?.id) {
        console.error('No user ID returned from sign up:', authData);
        throw new Error('Failed to create user account');
      }

      console.log('Auth user created successfully:', {
        userId: authData.user.id,
        email: authData.user.email,
      });

      // Sign in explicitly to ensure we have a session
      console.log('Signing in to establish session...');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Error signing in after signup:', signInError);
        throw handleAuthError(signInError);
      }

      // Get the session after signing in
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw handleAuthError(sessionError);
      }

      if (!sessionData?.session) {
        console.error('No session data available:', sessionData);
        throw new Error('No session available after sign up');
      }

      // Create profile using the session
      console.log('Creating user profile:', {
        userId: sessionData.session.user.id,
        username,
        email,
      });

      const { data: profileData, error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: sessionData.session.user.id,
            username,
            email,
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Profile creation error:', {
          error: insertError,
          details: insertError.details,
          message: insertError.message,
        });
        
        // If profile creation fails, attempt to clean up the auth user
        console.log('Attempting to clean up auth user after profile creation failure');
        try {
          await supabase.auth.signOut();
          console.log('Successfully cleaned up auth user');
        } catch (cleanupError) {
          console.error('Failed to clean up auth user:', cleanupError);
        }
        
        throw handleAuthError(insertError);
      }

      console.log('Profile created successfully:', profileData);
      console.log('Sign up process completed successfully');
    } catch (error) {
      console.error('Sign up process failed:', error);
      throw handleAuthError(error);
    }
  };

  const signOut = async () => {
    console.log('Attempting sign out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw handleAuthError(error);
    }
    console.log('Sign out successful');
  };

  const resetPassword = async (email: string) => {
    console.log('Attempting password reset for:', email);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      console.error('Password reset error:', error);
      throw handleAuthError(error);
    }
    console.log('Password reset email sent');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}; 