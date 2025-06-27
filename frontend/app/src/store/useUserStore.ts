import { create } from 'zustand';

interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthenticatedUser | null; 
  signIn: (userData: AuthenticatedUser) => void; 
  signOut: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  isAuthenticated: false, 
  user: null, 

  // Actions
  signIn: (userData) => set({ isAuthenticated: true, user: userData }), 
  signOut: () => set({ isAuthenticated: false, user: null }),
}));

export default useAuthStore;
