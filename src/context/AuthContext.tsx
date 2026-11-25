import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  PRIMARY_ADMIN_EMAIL,
} from '../lib/firebase';
import {
  ProviderProfile,
  UserPrivateContact,
  UserProfile,
  WorkspaceMode,
} from '../types/marketplace';
import { useLanguage } from './LanguageContext';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  privateContact: UserPrivateContact | null;
  providerProfile: ProviderProfile | null;
  isAdmin: boolean;
  authReady: boolean;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userProfile: null,
  privateContact: null,
  providerProfile: null,
  isAdmin: false,
  authReady: false,
  workspaceMode: 'customer',
  setWorkspaceMode: () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  authError: null,
  clearAuthError: () => {},
});

const MODE_STORAGE_KEY = 'myservice_workspace_mode';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang } = useLanguage();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [privateContact, setPrivateContact] = useState<UserPrivateContact | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceModeState] = useState<WorkspaceMode>(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === 'provider' || saved === 'customer') return saved;
    } catch {
      // ignore
    }
    return 'customer';
  });

  const setWorkspaceMode = (mode: WorkspaceMode) => {
    setWorkspaceModeState(mode);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubPrivate: (() => void) | null = null;
    let unsubProvider: (() => void) | null = null;
    let unsubAdmin: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubUser?.();
      unsubPrivate?.();
      unsubProvider?.();
      unsubAdmin?.();

      setFirebaseUser(user);

      if (!user) {
        setUserProfile(null);
        setPrivateContact(null);
        setProviderProfile(null);
        setIsAdmin(false);
        setWorkspaceModeState('customer');
        setAuthReady(true);
        return;
      }

      try {
        // Ensure core user document and private contact exist
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            displayName: (user.displayName || 'MYSERVICE Member').slice(0, 100),
            photoURL: (user.photoURL || '').slice(0, 500),
            preferredLanguage: lang,
            province: 'Western',
            district: 'Colombo',
            city: '',
            providerStatus: 'not_submitted',
            accountStatus: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const privateRef = doc(db, 'users', user.uid, 'private', 'contact');
        const privSnap = await getDoc(privateRef);
        if (!privSnap.exists()) {
          await setDoc(privateRef, {
            uid: user.uid,
            email: (user.email || '').slice(0, 160),
            phone: '',
            privateAddress: '',
            updatedAt: serverTimestamp(),
          });
        }

        unsubUser = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`)
        );

        unsubPrivate = onSnapshot(
          privateRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setPrivateContact(docSnap.data() as UserPrivateContact);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/private/contact`)
        );

        unsubProvider = onSnapshot(
          doc(db, 'providerProfiles', user.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              setProviderProfile({ id: docSnap.id, ...(docSnap.data() as Omit<ProviderProfile, 'id'>) });
            } else {
              setProviderProfile(null);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, `providerProfiles/${user.uid}`)
        );

        const isPrimary = Boolean(user.emailVerified && user.email === PRIMARY_ADMIN_EMAIL);
        setIsAdmin(isPrimary);
        unsubAdmin = onSnapshot(
          doc(db, 'admins', user.uid),
          (docSnap) => {
            setIsAdmin(isPrimary || docSnap.exists());
          },
          () => {
            setIsAdmin(isPrimary);
          }
        );
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      unsubAuth();
      unsubUser?.();
      unsubPrivate?.();
      unsubProvider?.();
      unsubAdmin?.();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      setAuthError(message);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setWorkspaceMode('customer');
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        privateContact,
        providerProfile,
        isAdmin,
        authReady,
        workspaceMode,
        setWorkspaceMode,
        signInWithGoogle,
        signOut,
        authError,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
