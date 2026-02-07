
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, AuthState } from '../types';

interface AuthContextType extends AuthState {
  users: User[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'MUKESH KUMAR',
      email: 'kumarmukesh2107@gmail.com',
      mobile: '9876543210',
      role: UserRole.ADMIN,
      status: 'ACTIVE',
      avatar: 'https://picsum.photos/seed/mukesh/200',
      allowedCompanies: ['comp-001', 'comp-002']
    },
    {
      id: '2',
      name: 'SALES',
      email: 'indesignfurniturestore@gmail.com',
      mobile: '9876543211',
      role: UserRole.STAFF,
      status: 'ACTIVE',
      avatar: 'https://picsum.photos/seed/sales/200',
      allowedCompanies: ['comp-001']
    },
    {
      id: '3',
      name: 'ANKIT PAHUJA',
      email: 'pahujaankit@gmail.com',
      mobile: '9876543212',
      role: UserRole.ADMIN,
      status: 'ACTIVE',
      avatar: 'https://picsum.photos/seed/ankit/200',
      allowedCompanies: ['comp-001', 'comp-002']
    }
  ]);

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_erp_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Re-verify user exists and is active in our master list
      const masterUser = users.find(u => u.id === parsedUser.id);
      if (masterUser && masterUser.status === 'ACTIVE') {
        setAuthState({
          user: masterUser,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        localStorage.removeItem('nexus_erp_user');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, [users]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Find active user by email
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.status === 'ACTIVE');
        
        if (foundUser) {
          // Check for mandatory password: 12345678
          if (password === '12345678') {
            localStorage.setItem('nexus_erp_user', JSON.stringify(foundUser));
            setAuthState({
              user: foundUser,
              isAuthenticated: true,
              isLoading: false,
            });
            resolve(true);
            return;
          }
        }
        resolve(false);
      }, 800);
    });
  }, [users]);

  const logout = useCallback(() => {
    localStorage.removeItem('nexus_erp_user');
    localStorage.removeItem('nexus_active_company');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const hasRole = useCallback((roles: UserRole[]) => {
    if (!authState.user) return false;
    return roles.includes(authState.user.role);
  }, [authState.user]);

  const addUser = useCallback((data: Omit<User, 'id'>) => {
    setUsers(prev => [...prev, { ...data, id: Date.now().toString() }]);
  }, []);

  const updateUser = useCallback((id: string, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, users, login, logout, hasRole, addUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
