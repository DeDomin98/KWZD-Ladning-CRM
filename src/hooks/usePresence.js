import { useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';

const usePresence = () => {
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    // Ustaw jako online
    const setOnline = async () => {
      try {
        await updateDoc(userRef, {
          isOnline: true,
          lastActiveAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error setting online:', error);
      }
    };

    // Ustaw jako offline
    const setOffline = async () => {
      try {
        await updateDoc(userRef, {
          isOnline: false,
          lastActiveAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error setting offline:', error);
      }
    };

    // Heartbeat co 60 sekund
    setOnline();
    const heartbeat = setInterval(setOnline, 60000);

    // Event listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnline();
      } else {
        setOffline();
      }
    };

    const handleBeforeUnload = () => {
      // Sync request przy zamykaniu
      navigator.sendBeacon && navigator.sendBeacon('/api/offline', JSON.stringify({ uid: user.uid }));
      setOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setOffline();
    };
  }, []);
};

export default usePresence;