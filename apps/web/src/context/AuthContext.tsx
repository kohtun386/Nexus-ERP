import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { auth } from '../firebase'; // Using the real firebase config now
import { 
    User as FirebaseUser, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';

// Using a simplified User type for the context
interface AppUser {
  uid: string;
  email: string;
}

interface AuthContextType {
  user: AppUser | null;
  role: 'owner' | 'supervisor' | null;
  factoryId: string | null;
  loading: boolean;
  signup: (email: string, pass: string) => Promise<FirebaseUser>;
  login: (email: string, pass: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<'owner' | 'supervisor' | null>(null);
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // 1. Get initial token (without forcing refresh first)
          let tokenResult = await firebaseUser.getIdTokenResult();
          let claims = tokenResult.claims;

          console.log("Auth state changed - User:", firebaseUser.email);
          console.log("Initial claims:", claims);

          // 2. Retry Logic: If role is missing, wait for Cloud Function propagation
          if (!claims.role) {
            console.log("⏳ Role not found in claims. Waiting for Cloud Function propagation (2s)...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Force refresh after waiting
            tokenResult = await firebaseUser.getIdTokenResult(true);
            claims = tokenResult.claims;
            console.log("⏳ Retried claims after 2s:", claims);
          }

          // 3. Set User with Claims
          const appUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
          };

          setUser(appUser);
          setRole((claims.role as 'owner' | 'supervisor') || null);
          setFactoryId((claims.factoryId as string) || null);

          if (claims.role) {
            console.log(`✅ User authenticated: ${firebaseUser.email} as ${claims.role}`);
          } else {
            console.warn("⚠️ User logged in but role still not assigned. Admin may need to set custom claims.");
          }
        } else {
          setUser(null);
          setRole(null);
          setFactoryId(null);
        }
      } catch (error) {
        console.error("Error during auth state change:", error);
        setUser(null);
        setRole(null);
        setFactoryId(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);
  
  const signup = async (email: string, pass: string) => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      return userCredential.user;
  }

  const login = async (email: string, pass: string) => {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      return userCredential.user;
  }

  const logout = async () => {
      await signOut(auth);
      // Clear all session data
      localStorage.clear();
      sessionStorage.clear();
  }

  const value = {
    user,
    role,
    factoryId,
    loading,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    return useContext(AuthContext);
}
