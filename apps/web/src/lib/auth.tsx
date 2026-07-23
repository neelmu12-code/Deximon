"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BinderCoverConfig } from "./binderTypes";
import { ApiError, fetchAPI } from "./fetchAPI";

export type BinderVisibility = "public" | "private";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  binder_visibility: BinderVisibility;
  binder_cover: BinderCoverConfig | null;
  location: string | null;
  twitter_handle: string | null;
  instagram_handle: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  binder_visibility: BinderVisibility;
  binder_cover?: BinderCoverConfig | null;
  location: string | null;
  twitter_handle: string | null;
  instagram_handle: string | null;
  avg_rating?: number | null;
  review_count?: number;
};

type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AuthUser;
};

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = LoginInput & {
  username: string;
  display_name?: string;
};

export type ProfileUpdateInput = {
  display_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  username?: string;
  location?: string | null;
  twitter_handle?: string | null;
  instagram_handle?: string | null;
  binder_cover?: BinderCoverConfig | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  initializing: boolean;
  error: string | null;
  refreshUser: () => Promise<AuthUser | null>;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<PublicProfile>;
  updatePrivacy: (binderVisibility: BinderVisibility) => Promise<PublicProfile>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    return await fetchAPI<AuthUser>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    setInitializing(true);
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      setError(null);
      return currentUser;
    } catch (refreshError) {
      setError(errorMessage(refreshError));
      throw refreshError;
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser().catch(() => undefined);
  }, [refreshUser]);

  const login = useCallback(
    async (input: LoginInput) => {
      setError(null);
      await fetchAPI<TokenResponse>("/auth/login", { method: "POST", body: input });
      const currentUser = await refreshUser();
      if (!currentUser) throw new Error("Login succeeded but /auth/me did not return a user.");
      return currentUser;
    },
    [refreshUser],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      setError(null);
      await fetchAPI<TokenResponse>("/auth/register", { method: "POST", body: input });
      const currentUser = await refreshUser();
      if (!currentUser) throw new Error("Registration succeeded but /auth/me did not return a user.");
      return currentUser;
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    setError(null);
    try {
      await fetchAPI("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (input: ProfileUpdateInput) => {
    setError(null);
    const updated = await fetchAPI<PublicProfile>("/profiles/me", {
      method: "PATCH",
      body: input,
    });
    if (!updated) throw new Error("Profile update did not return a profile.");
    setUser((current) => (current ? { ...current, ...updated } : current));
    return updated;
  }, []);

  const updatePrivacy = useCallback(async (binderVisibility: BinderVisibility) => {
    setError(null);
    const updated = await fetchAPI<PublicProfile>("/profiles/me/privacy", {
      method: "PATCH",
      body: { binder_visibility: binderVisibility },
    });
    if (!updated) throw new Error("Privacy update did not return a profile.");
    setUser((current) => (current ? { ...current, ...updated } : current));
    return updated;
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setError(null);
    await fetchAPI("/auth/change-password", {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      error,
      refreshUser,
      login,
      register,
      logout,
      updateProfile,
      updatePrivacy,
      changePassword,
      clearError: () => setError(null),
    }),
    [changePassword, error, initializing, login, logout, refreshUser, register, updatePrivacy, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
