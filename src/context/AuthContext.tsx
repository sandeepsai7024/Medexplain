import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import type { UserProfile } from '../types/medexplain.ts';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
  switchSandboxRole: (role: UserProfile['role']) => Promise<void>;
  deleteAccountData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  }, []);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = await getIdToken();
      const headers = new Headers(options.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(url, { ...options, headers });
    },
    [getIdToken]
  );

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null);
      return;
    }
    try {
      const res = await authFetch('/api/me');
      if (res.ok) {
        const data = (await res.json()) as { user: UserProfile };
        setProfile(data.user);
      }
    } catch (err) {
      console.error('Failed to sync profile:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [refreshProfile]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      await refreshProfile();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unable to complete Google sign-in.';
      setAuthError(msg);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const switchSandboxRole = async (role: UserProfile['role']) => {
    const res = await authFetch('/api/me/role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const data = (await res.json()) as { user: UserProfile };
      setProfile(data.user);
    }
  };

  const deleteAccountData = async () => {
    const res = await authFetch('/api/me/data', { method: 'DELETE' });
    if (res.ok) {
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        authError,
        signInWithGoogle,
        logout,
        getIdToken,
        authFetch,
        refreshProfile,
        switchSandboxRole,
        deleteAccountData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
