import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
  where, getDocs, writeBatch, doc, updateDoc, arrayUnion, limit
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { timeAgo } from "../../../lib/utils";

// ===== Helpers =====

const formatMsgTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  const now = new Date();
  const time = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return time;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Wczoraj';
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
};

const formatDateSeparator = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Dzisiaj';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Wczoraj';
  return date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
};

// ===== Icons =====

const SendIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const CheckSvg = ({ className = '' }) => (
  <svg className={`w-3.5 h-3 inline-block ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const DoubleCheckSvg = ({ className = '' }) => (
  <svg className={`w-[18px] h-3 inline-block ${className}`} fill="none" stroke="currentColor" viewBox="0 0 30 24" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 13l5 5L18 7" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 13l5 5L24 7" />
  </svg>
);

// ===== ChatView =====

const ChatView = ({ conversation, currentUser, allUsers, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isGroup = conversation.type === 'group';
  const chatId = isGroup
    ? conversation.id
    : [currentUser.uid, conversation.id].sort().join('_');

  const getUserName = useCallback((uid) => {
    if (uid === currentUser.uid) return 'Ty';
    const user = allUsers.find(u => u.id === uid);
    return user ? user.displayName?.split(' ')[0] : 'Nieznany';
  }, [currentUser.uid, allUsers]);

  // Realtime messages
  useEffect(() => {
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "instant" }), 50);
    });
    return () => unsub();
  }, [chatId]);

  // Mark as read
  useEffect(() => {
    const markAsRead = async () => {
      try {
        if (isGroup) {
          const q = query(collection(db, "chats", chatId, "messages"), where("receiverId", "==", "all"));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            let hasUpdates = false;
            snapshot.docs.forEach((d) => {
              const msgData = d.data();
              const readBy = msgData.readBy || [];
              if (!readBy.includes(currentUser.uid) && msgData.senderId !== currentUser.uid) {
                batch.update(doc(db, "chats", chatId, "messages", d.id), { readBy: arrayUnion(currentUser.uid) });
                hasUpdates = true;
              }
            });
            if (hasUpdates) await batch.commit();
          }
        } else {
          const q = query(
            collection(db, "chats", chatId, "messages"),
            where("senderId", "==", conversation.id),
            where("read", "==", false)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((d) => {
              batch.update(doc(db, "chats", chatId, "messages", d.id), { read: true });
            });
            await batch.commit();
          }
        }
      } catch (e) { console.error("Mark read error:", e); }
    };
    markAsRead();
  }, [messages, chatId, conversation.id, isGroup, currentUser.uid]);

  // Send
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const text = newMessage;
    setNewMessage('');
    inputRef.current?.focus();
    try {
      const messageData = {
        text,
        senderId: currentUser.uid,
        receiverId: isGroup ? 'all' : conversation.id,
        createdAt: serverTimestamp(),
      };
      if (isGroup) {
        messageData.readBy = [];
      } else {
        messageData.read = false;
      }
      await addDoc(collection(db, "chats", chatId, "messages"), messageData);
    } catch (error) {
      console.error("Send error:", error);
    }
  };

  // Group by date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;
    messages.forEach(msg => {
      const msgDate = msg.createdAt?.seconds
        ? new Date(msg.createdAt.seconds * 1000).toDateString()
        : null;
      if (msgDate && msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'separator', date: msg.createdAt, id: `sep-${msgDate}` });
      }
      groups.push({ type: 'message', ...msg });
    });
    return groups;
  }, [messages]);

  // Read receipts
  const renderReadReceipt = (msg) => {
    if (msg.senderId !== currentUser.uid) return null;
    if (isGroup) {
      const readBy = (msg.readBy || []).filter(uid => uid !== currentUser.uid);
      const totalOthers = allUsers.filter(u => u.id !== currentUser.uid).length;
      if (readBy.length === 0) return <CheckSvg className="text-white/50" />;
      const names = readBy.map(uid => getUserName(uid)).join(', ');
      return (
        <span title={`Przeczytane: ${names}`}>
          <DoubleCheckSvg className={readBy.length >= totalOthers ? 'text-sky-300' : 'text-white/70'} />
        </span>
      );
    } else {
      return msg.read
        ? <DoubleCheckSvg className="text-sky-300" />
        : <CheckSvg className="text-white/50" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-200 flex-shrink-0">
        <button onClick={onBack} className="p-1.5 -ml-1 hover:bg-stone-100 rounded-full transition-colors">
          <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="relative flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${conversation.accentClass}`}>
            {conversation.icon}
          </div>
          {conversation.type === 'private' && (
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${conversation.isOnline ? 'bg-emerald-500' : 'bg-stone-300'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-900 truncate">{conversation.displayName}</p>
          <p className="text-[11px] text-stone-400">
            {conversation.type === 'group'
              ? `${allUsers.length} uczestników`
              : conversation.isOnline ? 'Dostępny' : 'Niedostępny'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-stone-50 chat-messages-scroll">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${conversation.accentClass}`}>
              {conversation.icon}
            </div>
            <p className="text-sm font-medium text-stone-700 mt-2">{conversation.displayName}</p>
            <p className="text-xs text-stone-400">Rozpocznij rozmowę</p>
          </div>
        )}

        {groupedMessages.map((item) => {
          if (item.type === 'separator') {
            return (
              <div key={item.id} className="flex items-center justify-center py-4">
                <span className="px-3 py-1 bg-white rounded-full text-[11px] text-stone-500 shadow-sm border border-stone-100 font-medium">
                  {formatDateSeparator(item.date)}
                </span>
              </div>
            );
          }

          const isMe = item.senderId === currentUser.uid;
          const time = item.createdAt
            ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
            : '';

          return (
            <div key={item.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1.5`}>
              <div className="max-w-[78%]">
                {isGroup && !isMe && (
                  <p className="text-[10px] text-stone-500 ml-3 mb-0.5 font-medium">
                    {getUserName(item.senderId)}
                  </p>
                )}
                <div className={`px-3.5 py-2 text-[13px] leading-relaxed ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                    : 'bg-white text-stone-800 rounded-2xl rounded-bl-md shadow-sm border border-stone-100'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{item.text}</p>
                  <div className={`flex items-center justify-end gap-1 mt-0.5 -mb-0.5 ${isMe ? 'text-blue-200' : 'text-stone-400'}`}>
                    <span className="text-[10px]">{time}</span>
                    {renderReadReceipt(item)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 flex-shrink-0">
        <div className="flex items-end gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Aa"
            className="flex-1 px-4 py-2.5 text-sm bg-stone-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-30 flex-shrink-0"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
};

// ===== ConversationList =====

const ConversationList = ({ conversations, onSelect, searchQuery, onSearchChange, currentUser, allUsers }) => {
  const filtered = searchQuery
    ? conversations.filter(c => c.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const getUserName = (uid) => {
    if (uid === currentUser.uid) return 'Ty';
    const user = allUsers.find(u => u.id === uid);
    return user ? user.displayName?.split(' ')[0] : '';
  };

  const formatPreview = (conv) => {
    if (!conv.lastMessageData) {
      if (conv.type === 'group') return conv.subtitle;
      if (conv.isOnline) return 'Dostępny';
      return conv.lastActiveAt ? timeAgo(conv.lastActiveAt) : 'Niedostępny';
    }
    const msg = conv.lastMessageData;
    const isMe = msg.senderId === currentUser.uid;
    const name = isMe ? 'Ty' : (conv.type === 'group' ? getUserName(msg.senderId) : '');
    const text = msg.text?.length > 35 ? msg.text.slice(0, 35) + '...' : msg.text;
    return name ? `${name}: ${text}` : text;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 pb-1">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Szukaj..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-stone-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto chat-messages-scroll">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-stone-400">Brak wyników</div>
        )}
        {filtered.map(conv => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-stone-50 ${
              conv.unread > 0 ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-stone-50'
            }`}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${conv.accentClass}`}>
                {conv.icon}
              </div>
              {conv.type === 'private' && (
                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${conv.isOnline ? 'bg-emerald-500' : 'bg-stone-300'}`} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-stone-900' : 'font-medium text-stone-700'}`}>
                  {conv.displayName}
                </p>
                {conv.lastMessageData?.createdAt && (
                  <span className={`text-[11px] flex-shrink-0 ${conv.unread > 0 ? 'text-blue-600 font-semibold' : 'text-stone-400'}`}>
                    {formatMsgTime(conv.lastMessageData.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className={`text-xs truncate ${conv.unread > 0 ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>
                  {formatPreview(conv)}
                </p>
                {conv.unread > 0 && (
                  <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                    {conv.unread > 99 ? '99+' : conv.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ===== Main ChatPanel =====

const ChatPanel = ({ currentUser, users, isOpen, onClose, unreadCounts, unreadGroupCount, unreadNegocjacjeCount, canSeeDepartment, isNegocjacjeOnly }) => {
  const [activeChat, setActiveChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastMessages, setLastMessages] = useState({});

  const conversations = useMemo(() => {
    const convs = [];

    if (!isNegocjacjeOnly) {
      convs.push({
        id: 'general_chat', type: 'group',
        displayName: 'Czat Ogólny', subtitle: 'Zespół główny',
        isOnline: true, unread: unreadGroupCount,
        icon: '#', accentClass: 'bg-stone-700 text-white',
        lastMessageData: lastMessages['general_chat'] || null,
      });
    }

    if (canSeeDepartment('negocjacje')) {
      convs.push({
        id: 'negocjacje_chat', type: 'group',
        displayName: 'Czat Negocjacje', subtitle: 'Dział negocjacji',
        isOnline: true, unread: unreadNegocjacjeCount,
        icon: 'N', accentClass: 'bg-violet-600 text-white',
        lastMessageData: lastMessages['negocjacje_chat'] || null,
      });
    }

    users.filter(u => u.id !== currentUser.uid).forEach(user => {
      const chatId = [currentUser.uid, user.id].sort().join('_');
      convs.push({
        id: user.id, type: 'private',
        displayName: user.displayName,
        isOnline: user.isOnline,
        unread: unreadCounts[user.id] || 0,
        icon: user.displayName?.charAt(0)?.toUpperCase() || '?',
        accentClass: user.isOnline ? 'bg-stone-600 text-white' : 'bg-stone-400 text-stone-100',
        lastMessageData: lastMessages[chatId] || null,
        lastActiveAt: user.lastActiveAt,
      });
    });

    convs.sort((a, b) => {
      if (a.type === 'group' && b.type !== 'group') return -1;
      if (a.type !== 'group' && b.type === 'group') return 1;
      if (a.unread > 0 && b.unread === 0) return -1;
      if (a.unread === 0 && b.unread > 0) return 1;
      const aTime = a.lastMessageData?.createdAt?.seconds || 0;
      const bTime = b.lastMessageData?.createdAt?.seconds || 0;
      if (aTime !== bTime) return bTime - aTime;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return 0;
    });

    return convs;
  }, [users, currentUser.uid, unreadCounts, unreadGroupCount, unreadNegocjacjeCount, isNegocjacjeOnly, canSeeDepartment, lastMessages]);

  // Fetch last messages when panel is open
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;
    const unsubs = [];

    const chatIds = [];
    if (!isNegocjacjeOnly) chatIds.push('general_chat');
    if (canSeeDepartment('negocjacje')) chatIds.push('negocjacje_chat');
    users.filter(u => u.id !== currentUser.uid).forEach(u => {
      chatIds.push([currentUser.uid, u.id].sort().join('_'));
    });

    chatIds.forEach(cid => {
      const q = query(
        collection(db, "chats", cid, "messages"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setLastMessages(prev => ({ ...prev, [cid]: snap.docs[0].data() }));
        }
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [isOpen, currentUser?.uid, users, isNegocjacjeOnly, canSeeDepartment]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => { setActiveChat(null); setSearchQuery(''); }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Open specific conversation programmatically
  const openConversation = useCallback((convId) => {
    const conv = conversations.find(c => c.id === convId);
    if (conv) setActiveChat(conv);
  }, [conversations]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes chatPanelIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes chatFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .chat-panel-slide { animation: chatPanelIn 0.25s ease-out forwards; }
        .chat-backdrop-fade { animation: chatFadeIn 0.2s ease-out forwards; }
        .chat-messages-scroll::-webkit-scrollbar { width: 4px; }
        .chat-messages-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-messages-scroll::-webkit-scrollbar-thumb { background: #d6d3d1; border-radius: 4px; }
      `}</style>

      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/20 chat-backdrop-fade hidden sm:block" onClick={onClose} />

        {/* Panel */}
        <div className="relative w-full sm:w-[400px] bg-white shadow-2xl flex flex-col h-full chat-panel-slide">
          {/* Panel header (only on list view) */}
          {!activeChat && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-white flex-shrink-0">
              <h2 className="text-lg font-bold text-stone-900">Wiadomości</h2>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeChat ? (
              <ChatView
                conversation={activeChat}
                currentUser={currentUser}
                allUsers={users}
                onBack={() => setActiveChat(null)}
              />
            ) : (
              <ConversationList
                conversations={conversations}
                onSelect={setActiveChat}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                currentUser={currentUser}
                allUsers={users}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;
