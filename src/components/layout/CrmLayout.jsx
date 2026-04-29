import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signOut } from "firebase/auth";
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, query, where, collectionGroup } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { daysUntil, timeAgo, DEPARTMENTS } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import ThemeToggle from "../../features/crm/components/ThemeToggle";
import ChatPanel from "../../features/crm/components/ChatPanel";
import { PhoneProvider } from "../../phone/PhoneContext";
import PhoneController from "../../phone/PhoneController";

const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const CrmLayout = ({ department }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const { userData, displayName, isRestricted, isNegocjacjeOnly, canSeeDepartment, canSeeFinances, canSeeSettings, canSeeAllLeads, canSeeLeads } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [todayRemindersCount, setTodayRemindersCount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [users, setUsers] = useState([]);

  const basePath = `/crm/${department}`;
  const deptConfig = DEPARTMENTS[department] || DEPARTMENTS.upadlosci;
  const accentColor = department === 'negocjacje' ? 'violet' : 'blue';

  // Zachowanie pozycji scrolla przy powrocie z LeadDetails do listy leadów
  const mainScrollRef = useRef(null);
  const savedLeadsScrollRef = useRef(0);
  const prevPathnameRef = useRef(location.pathname);

  // --- CZAT STATE ---
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [unreadGroupCount, setUnreadGroupCount] = useState(0);
  const [unreadNegocjacjeCount, setUnreadNegocjacjeCount] = useState(0);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const sidebarScrollRef = useRef(null);
  const scrollIntervalRef = useRef(null);



  // Sprawdzanie możliwości scrollowania w sidebarze
  const checkScrollability = () => {
    const element = sidebarScrollRef.current;
    if (!element) return;
    setCanScrollUp(element.scrollTop > 0);
    setCanScrollDown(element.scrollTop < element.scrollHeight - element.clientHeight - 1);
  };

  useEffect(() => {
    const element = sidebarScrollRef.current;
    if (!element) return;
    
    checkScrollability();
    element.addEventListener('scroll', checkScrollability);
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(element);
    
    return () => {
      element.removeEventListener('scroll', checkScrollability);
      resizeObserver.disconnect();
      stopAutoScroll();
    };
  }, [users, sidebarCollapsed]);

  // Funkcje scrollowania
  const handleScrollUp = () => {
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollBy({ top: -100, behavior: 'smooth' });
    }
  };

  const handleScrollDown = () => {
    if (sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollBy({ top: 100, behavior: 'smooth' });
    }
  };

  const startAutoScroll = (direction) => {
    if (scrollIntervalRef.current) return;
    setIsScrolling(true);
    scrollIntervalRef.current = setInterval(() => {
      if (sidebarScrollRef.current) {
        const scrollAmount = direction === 'up' ? -50 : 50;
        sidebarScrollRef.current.scrollBy({ top: scrollAmount, behavior: 'auto' });
        checkScrollability();
      }
    }, 50);
  };

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
      setIsScrolling(false);
    }
  };

  // --- 1. SYSTEM REAL ONLINE ---
  useEffect(() => {
    if (!userData?.id) return;
    const sendHeartbeat = async () => {
      try {
        await updateDoc(doc(db, "users", userData.id), { isOnline: true, lastActiveAt: serverTimestamp() });
      } catch (e) { console.error(e); }
    };
    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, 60 * 1000);
    const handleTabClose = () => { updateDoc(doc(db, "users", userData.id), { isOnline: false }).catch(() => {}); };
    window.addEventListener('beforeunload', handleTabClose);
    return () => { clearInterval(intervalId); window.removeEventListener('beforeunload', handleTabClose); };
  }, [userData?.id]);

  // --- 2. LOGIKA WIADOMOŚCI PRYWATNYCH ---
  useEffect(() => {
    if (!userData?.id) return;
    const q = query(collectionGroup(db, "messages"), where("receiverId", "==", userData.id), where("read", "==", false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const counts = {};
        let shouldPlaySound = false;
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const msg = change.doc.data();
            const msgTime = msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : Date.now();
            if ((Date.now() - msgTime) < 5000) shouldPlaySound = true;
          }
        });
        snapshot.docs.forEach(d => { const data = d.data(); counts[data.senderId] = (counts[data.senderId] || 0) + 1; });
        setUnreadCounts(counts);
        if (shouldPlaySound) { try { new Audio(NOTIFICATION_SOUND_URL).play().catch(() => {}); } catch (e) {} }
    });
    return () => unsubscribe();
  }, [userData?.id]);

  // --- 2b. LOGIKA WIADOMOŚCI GRUPOWYCH ---
  useEffect(() => {
    if (!userData?.id || isNegocjacjeOnly) return;
    const q = query(collection(db, "chats", "general_chat", "messages"), where("receiverId", "==", "all"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const unreadMessages = snapshot.docs.filter(d => {
          const msgData = d.data();
          const readBy = msgData.readBy || [];
          return !readBy.includes(userData.id) && msgData.senderId !== userData.id;
        });
        setUnreadGroupCount(unreadMessages.length);
        
        let shouldPlaySound = false;
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const msg = change.doc.data();
            const msgTime = msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : Date.now();
            if ((Date.now() - msgTime) < 5000 && msg.senderId !== userData.id) {
              const readBy = msg.readBy || [];
              if (!readBy.includes(userData.id)) shouldPlaySound = true;
            }
          }
        });
        if (shouldPlaySound) { try { new Audio(NOTIFICATION_SOUND_URL).play().catch(() => {}); } catch (e) {} }
    });
    return () => unsubscribe();
  }, [userData?.id]);

  // --- 2c. LOGIKA WIADOMOŚCI GRUPOWYCH - NEGOCJACJE ---
  useEffect(() => {
    if (!userData?.id) return;
    const q = query(collection(db, "chats", "negocjacje_chat", "messages"), where("receiverId", "==", "all"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
        const unreadMessages = snapshot.docs.filter(doc => {
          const msgData = doc.data();
          const readBy = msgData.readBy || [];
          return !readBy.includes(userData.id) && msgData.senderId !== userData.id;
        });
        
        setUnreadNegocjacjeCount(unreadMessages.length);
        
        let shouldPlaySound = false;
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const msg = change.doc.data();
            const msgTime = msg.createdAt?.seconds ? msg.createdAt.seconds * 1000 : Date.now();
            if ((Date.now() - msgTime) < 5000 && msg.senderId !== userData.id) {
              const readBy = msg.readBy || [];
              if (!readBy.includes(userData.id)) {
                shouldPlaySound = true;
              }
            }
          }
        });
        
        if (shouldPlaySound) { 
          try { new Audio(NOTIFICATION_SOUND_URL).play().catch(() => {}); } catch (e) {} 
        }
    });
    return () => unsubscribe();
  }, [userData?.id]);

  // --- 3. POBIERANIE DANYCH ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const now = new Date();
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        let isReallyOnline = false;
        if (data.isOnline && data.lastActiveAt) {
            const lastActiveDate = data.lastActiveAt.seconds ? new Date(data.lastActiveAt.seconds * 1000) : new Date(data.lastActiveAt);
            if ((now - lastActiveDate) / 1000 / 60 < 2) isReallyOnline = true;
        }
        return { id: doc.id, ...data, isOnline: isReallyOnline };
      });
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Zapisywanie scrolla listy leadów i przywracanie po powrocie z LeadDetails
  useEffect(() => {
    const pathname = location.pathname;
    const isOnLeadsList = pathname === `${basePath}/leady`;
    const wasOnLeadDetail = prevPathnameRef.current.startsWith(`${basePath}/leady/`) && prevPathnameRef.current !== `${basePath}/leady`;

    if (isOnLeadsList && wasOnLeadDetail && mainScrollRef.current) {
      const saved = savedLeadsScrollRef.current;
      const restore = () => {
        if (mainScrollRef.current) mainScrollRef.current.scrollTop = saved;
      };
      requestAnimationFrame(restore);
      const t = setTimeout(restore, 50);
      return () => clearTimeout(t);
    }
    prevPathnameRef.current = pathname;
  }, [location.pathname]);

  const handleMainScroll = () => {
    if (location.pathname === `${basePath}/leady` && mainScrollRef.current) {
      savedLeadsScrollRef.current = mainScrollRef.current.scrollTop;
    }
  };

  // Re-trigger badge computation when Calendar filter changes
  const [calFilterKey, setCalFilterKey] = useState(0);
  useEffect(() => {
    const handler = () => setCalFilterKey(k => k + 1);
    window.addEventListener('calFilterChanged', handler);
    return () => window.removeEventListener('calFilterChanged', handler);
  }, []);

  useEffect(() => {
    let remindersCount = 0;
    let leadsCount = 0;
    let myLeadIds = new Set();

    const unsubLeads = onSnapshot(collection(db, "leads"), (s) => {
      let lData = s.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filtr: localStorage (cal_filterMode) lub isRestricted
      const calFilter = localStorage.getItem('cal_filterMode') || 'my';
      if (isRestricted || calFilter === 'my') {
        const myName = userData?.displayName;
        if (myName) {
          lData = lData.filter(l => l.assignedTo === myName);
        }
      }

      myLeadIds = new Set(lData.map(l => l.id));

      const todayContacts = lData.filter(
        l =>
          l.nextContactDate &&
          l.status !== 'klient' &&
          l.status !== 'spalony' &&
          daysUntil(l.nextContactDate) <= 0 &&
          daysUntil(l.nextContactDate) >= -7
      ).length;

      const todayCR = lData.filter(
        l =>
          l.nextReminderDate &&
          l.status === 'klient' &&
          daysUntil(l.nextReminderDate) <= 0 &&
          daysUntil(l.nextReminderDate) >= -7
      ).length;

      leadsCount = todayContacts + todayCR;
      setTodayRemindersCount(remindersCount + leadsCount);
    });

    const unsubReminders = onSnapshot(collection(db, "reminders"), (s) => {
      const all = s.docs.map(d => ({ id: d.id, ...d.data() }));
      let visible = all;

      const calFilter = localStorage.getItem('cal_filterMode') || 'my';
      if (isRestricted || calFilter === 'my') {
        const myName = userData?.displayName;
        visible = all.filter(r => {
          if (r.isCompleted || daysUntil(r.date) > 0 || daysUntil(r.date) < -7) return false;
          const fromMyLead = r.leadId && myLeadIds.has(r.leadId);
          const createdByMe = r.createdBy === myName;
          return fromMyLead || createdByMe;
        });
      } else {
        visible = all.filter(r => !r.isCompleted && daysUntil(r.date) <= 0 && daysUntil(r.date) >= -7);
      }

      remindersCount = visible.length;
      setTodayRemindersCount(remindersCount + leadsCount);
    });

    return () => {
      unsubReminders();
      unsubLeads();
    };
  }, [isRestricted, userData?.displayName, calFilterKey]);

  const handleLogout = async () => {
    if (userData?.id) await updateDoc(doc(db, "users", userData.id), { isOnline: false }).catch(console.error);
    await signOut(auth);
    navigate('/crm/login');
  };

  const firstName = displayName?.split(' ')[0] || 'Użytkownik';
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0) + (isNegocjacjeOnly ? 0 : unreadGroupCount) + unreadNegocjacjeCount;

  // Ograniczony pracownik nie widzi zakładki Finanse.
  const navItems = [
    { path: basePath, label: 'Pulpit', end: true, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    ...(canSeeLeads ? [
      { path: `${basePath}/leady`, label: 'Leady', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> }
    ] : []),
    { path: `${basePath}/klienci`, label: 'Klienci', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg> },
    { path: `${basePath}/umowy`, label: 'Umowy', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    ...(canSeeFinances ? [
      { path: `${basePath}/finanse`, label: 'Finanse', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
    ] : [])
  ];

  const bottomItems = [
    { path: `${basePath}/kalendarz`, label: 'Kalendarz', badge: todayRemindersCount, icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  ];

  // Wszystkie elementy nawigacji w jednej liście (dla mobile)
  const allNavItems = [
    ...navItems,
    ...bottomItems
  ];

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-stone-100 font-['Inter',system-ui,sans-serif]">
        <header className="h-14 bg-white border-b border-stone-200 flex items-center justify-between px-4 flex-shrink-0 z-20 relative">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/crm')} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <p className="text-stone-900 font-medium text-sm">{deptConfig.label}</p>
              <p className="text-stone-400 text-[10px]">Cześć, {firstName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-stone-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </header>
        <main ref={mainScrollRef} onScroll={handleMainScroll} className="flex-1 overflow-auto pb-20"><Outlet /></main>
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex justify-around py-2 z-40 safe-area-bottom">
          {allNavItems.filter(item => !item.separator).slice(0, 5).map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => `flex flex-col items-center justify-center py-2 px-3 rounded-lg relative min-w-[64px] ${isActive ? 'text-stone-900' : 'text-stone-400'}`}>
              {item.icon}
              <span className="text-xs mt-1 font-medium">{item.label}</span>
              {item.badge > 0 && <span className="absolute top-0 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">{item.badge > 99 ? '99+' : item.badge}</span>}
            </NavLink>
          ))}
          {canSeeSettings && (
            <NavLink to={`${basePath}/ustawienia`} className={({ isActive }) => `flex flex-col items-center justify-center py-2 px-3 rounded-lg min-w-[64px] ${isActive ? 'text-stone-900' : 'text-stone-400'}`}>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
               <span className="text-xs mt-1 font-medium">Więcej</span>
            </NavLink>
          )}
        </nav>
        {/* Floating Chat Button */}
        <button
          onClick={() => setIsChatPanelOpen(true)}
          className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-stone-900 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 bg-red-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 border-white">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
        {userData && (
          <ChatPanel
            currentUser={{ uid: userData.id, ...userData }}
            users={users}
            isOpen={isChatPanelOpen}
            onClose={() => setIsChatPanelOpen(false)}
            unreadCounts={unreadCounts}
            unreadGroupCount={unreadGroupCount}
            unreadNegocjacjeCount={unreadNegocjacjeCount}
            canSeeDepartment={canSeeDepartment}
            isNegocjacjeOnly={isNegocjacjeOnly}
          />
        )}
      </div>
    );
  }

  // Wersja Desktop
  return (
    <div className="flex h-screen bg-stone-100 font-['Inter',system-ui,sans-serif]">
      {/* STYLE DLA CIENKIEGO SCROLLBARA */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--crm-700); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--crm-600); }
      `}</style>

      {/* SIDEBAR */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-stone-900 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden z-30 relative`}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-stone-800 flex-shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate('/crm')} className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors flex-shrink-0" title="Zmień dział">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div className="min-w-0">
                <h1 className="text-white font-semibold tracking-tight text-sm truncate">{deptConfig.label}</h1>
                <p className="text-stone-500 text-xs">System CRM</p>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors">
            <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div 
          ref={sidebarScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col min-h-0 relative"
          onMouseLeave={stopAutoScroll}
        >
          {/* Auto-scroll zone - góra */}
          {!sidebarCollapsed && canScrollUp && (
            <div 
              className="absolute top-0 left-0 right-0 h-12 z-20 cursor-pointer"
              onMouseEnter={() => startAutoScroll('up')}
              onMouseLeave={stopAutoScroll}
            />
          )}
          
          {/* Auto-scroll zone - dół */}
          {!sidebarCollapsed && canScrollDown && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-12 z-20 cursor-pointer"
              onMouseEnter={() => startAutoScroll('down')}
              onMouseLeave={stopAutoScroll}
            />
          )}
          
          {/* Przyciski scrollowania */}
          {!sidebarCollapsed && (
            <>
              {canScrollUp && (
                <button
                  onClick={handleScrollUp}
                  className="absolute top-24 right-2 z-30 w-7 h-7 bg-stone-800/90 hover:bg-stone-700 text-stone-300 rounded-full flex items-center justify-center shadow-lg transition-all backdrop-blur-sm border border-stone-700/50"
                  title="Przewiń w górę"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              )}
              {canScrollDown && (
                <button
                  onClick={handleScrollDown}
                  className="absolute bottom-24 right-2 z-30 w-7 h-7 bg-stone-800/90 hover:bg-stone-700 text-stone-300 rounded-full flex items-center justify-center shadow-lg transition-all backdrop-blur-sm border border-stone-700/50"
                  title="Przewiń w dół"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </>
          )}
            <nav className="flex-none py-6 px-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative whitespace-nowrap ${isActive ? (department === 'negocjacje' ? 'bg-violet-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-lg') : 'text-stone-400 hover:text-white hover:bg-stone-800'} ${sidebarCollapsed ? 'justify-center' : ''}`}
                >
                  {item.icon}
                  {!sidebarCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                  {item.badge > 0 && <span className={`absolute flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-red-500 text-white ${sidebarCollapsed ? 'top-1 right-1' : 'right-3'}`}>{item.badge > 99 ? '99+' : item.badge}</span>}
                </NavLink>
              ))}

              {/* SEPARATOR */}
              {!sidebarCollapsed && <div className="border-t border-stone-700 my-2 mx-2"></div>}
              {sidebarCollapsed && <div className="border-t border-stone-700 my-2 mx-2"></div>}

              {/* KALENDARZ */}
              {bottomItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative whitespace-nowrap ${isActive ? (department === 'negocjacje' ? 'bg-violet-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-lg') : 'text-stone-400 hover:text-white hover:bg-stone-800'} ${sidebarCollapsed ? 'justify-center' : ''}`}
                >
                  {item.icon}
                  {!sidebarCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                  {item.badge > 0 && <span className={`absolute flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-red-500 text-white ${sidebarCollapsed ? 'top-1 right-1' : 'right-3'}`}>{item.badge > 99 ? '99+' : item.badge}</span>}
                </NavLink>
              ))}

              {/* WIADOMOŚCI */}
              <button
                onClick={() => setIsChatPanelOpen(true)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative whitespace-nowrap text-stone-400 hover:text-white hover:bg-stone-800 ${sidebarCollapsed ? 'justify-center' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                {!sidebarCollapsed && <span className="font-medium text-sm">Wiadomości</span>}
                {totalUnread > 0 && (
                  <span className={`absolute flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-red-500 text-white ${sidebarCollapsed ? 'top-1 right-1' : 'right-3'}`}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </button>
            </nav>

            <div className="flex-1 min-h-[20px]"></div>
        </div>

        {/* FOOTER SIDEBARA */}
        <div className="p-3 border-t border-stone-800 bg-stone-900 flex-shrink-0 flex flex-col gap-2 z-20">
          {canSeeSettings && (
            <NavLink to={`${basePath}/ustawienia`} className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 whitespace-nowrap ${isActive ? 'bg-white text-stone-900' : 'text-stone-400 hover:text-white hover:bg-stone-800'} ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {!sidebarCollapsed && <span className="font-medium text-sm">Ustawienia</span>}
            </NavLink>
          )}
          <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-stone-500 hover:text-red-400 hover:bg-stone-800 whitespace-nowrap ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            {!sidebarCollapsed && <span className="font-medium text-sm">Wyloguj</span>}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <p className="text-lg text-stone-900">Cześć, <span className="font-semibold">{firstName}</span></p>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${department === 'negocjacje' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
              {deptConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-4">
             {/* NOWE MIEJSCE DLA THEME TOGGLE */}
             <div className="mr-2">
                <ThemeToggle />
             </div>
             <div className="h-6 w-px bg-stone-200 mx-2"></div>
             
             <div className="flex items-center gap-2">
               <span className="text-sm text-stone-500">{users.filter(u => u.isOnline).length} online</span>
             </div>
          </div>
        </header>
        <main ref={mainScrollRef} onScroll={handleMainScroll} className="flex-1 overflow-auto"><Outlet /></main>
        {userData && (
            <ChatPanel
                currentUser={{ uid: userData.id, ...userData }}
                users={users}
                isOpen={isChatPanelOpen}
                onClose={() => setIsChatPanelOpen(false)}
                unreadCounts={unreadCounts}
                unreadGroupCount={unreadGroupCount}
                unreadNegocjacjeCount={unreadNegocjacjeCount}
                canSeeDepartment={canSeeDepartment}
                isNegocjacjeOnly={isNegocjacjeOnly}
            />
        )}
      </div>
    </div>
  );
};

export default function CrmLayoutWrapped(props) {
  return (
    <PhoneProvider>
      <CrmLayout {...props} />
      <PhoneController />
    </PhoneProvider>
  );
}