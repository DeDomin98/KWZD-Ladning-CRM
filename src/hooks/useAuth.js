import { useState, useEffect, createContext, useContext, createElement } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { USER_ROLES } from '../lib/utils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserData({ id: userSnap.id, ...userSnap.data() });

          await updateDoc(userRef, {
            isOnline: true,
            lastActiveAt: serverTimestamp()
          });
        } else {
          const newUserData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Użytkownik',
            // Domyślna rola dla nowych użytkowników.
            // Dla nowego, ograniczonego pracownika ustaw w Firestore pole "role" na "restricted_agent".
            role: 'agent',
            isOnline: true,
            lastActiveAt: serverTimestamp(),
            createdAt: serverTimestamp()
          };

          await setDoc(userRef, newUserData);
          setUserData({ id: user.uid, ...newUserData });
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const role = userData?.role || 'admin';
  const roleConfig = USER_ROLES[role] || USER_ROLES.admin;

  const value = {
    currentUser,
    userData,
    loading,
    displayName: userData?.displayName || 'Użytkownik',
    isAdmin: role === 'admin',
    isRestricted: roleConfig.isRestricted,
    isNegocjacjeOnly: role === 'agent_negocjacje' || role === 'restricted_negocjacje',
    role,
    roleConfig,
    departments: roleConfig.departments,
    canSeeDepartment: (dept) => roleConfig.departments.includes(dept),
    canSeeAllLeads: roleConfig.canSeeAllLeads,
    canSeeFinances: roleConfig.canSeeFinances,
    canSeeSettings: roleConfig.canSeeSettings
  };

  return createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default useAuth;