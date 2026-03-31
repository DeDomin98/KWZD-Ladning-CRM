import { useState, useEffect, useRef, createContext, useContext, createElement } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { USER_ROLES } from '../lib/utils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const unsubUserRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    const auth = getAuth();

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      // Clean up previous user doc listener & fallback timer
      if (unsubUserRef.current) {
        unsubUserRef.current();
        unsubUserRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        let createdFallback = false;

        // Listen in real-time so we pick up role written by Register.jsx
        unsubUserRef.current = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            // Clear fallback timer — doc arrived in time
            if (fallbackTimerRef.current) {
              clearTimeout(fallbackTimerRef.current);
              fallbackTimerRef.current = null;
            }

            const data = snap.data();
            setUserData({ id: snap.id, ...data });
            setLoading(false);

            // Update online status once (avoid infinite loop)
            if (!data.isOnline) {
              await updateDoc(userRef, {
                isOnline: true,
                lastActiveAt: serverTimestamp()
              }).catch(() => { });
            }
          } else if (!createdFallback) {
            // Doc doesn't exist yet — give Register.jsx 3 s to create it
            fallbackTimerRef.current = setTimeout(async () => {
              createdFallback = true;
              const newUserData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || 'Użytkownik',
                role: 'agent',
                isOnline: true,
                lastActiveAt: serverTimestamp(),
                createdAt: serverTimestamp()
              };
              await setDoc(userRef, newUserData).catch(() => { });
              // onSnapshot will fire again with the new doc
            }, 3000);
          }
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserRef.current) unsubUserRef.current();
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
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
    canSeeLeads: roleConfig.canSeeLeads !== false,
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