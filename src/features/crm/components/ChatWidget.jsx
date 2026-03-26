import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs, writeBatch, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatDateTime } from "../../../lib/utils";

const ChatWidget = ({ currentUser, recipient, onClose, isMinimized, onToggleMinimize, allUsers = [] }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  
  // Czy to czat grupowy?
  const isGroup = recipient.id === 'general_chat' || recipient.id === 'negocjacje_chat';

  // ID czatu: Jeśli grupa -> stałe ID, jeśli priv -> kombinacja ID użytkowników
  const chatId = isGroup 
    ? recipient.id 
    : [currentUser.uid, recipient.id].sort().join('_');

  // Funkcja pomocnicza do znalezienia nazwy użytkownika po ID
  const getUserName = (uid) => {
    if (uid === currentUser.uid) return 'Ty';
    const user = allUsers.find(u => u.id === uid);
    return user ? user.displayName.split(' ')[0] : 'Nieznany';
  };

  // 1. Pobieranie wiadomości w czasie rzeczywistym
  useEffect(() => {
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubscribe();
  }, [chatId]);

  // 2. Oznaczanie wiadomości jako przeczytane
  useEffect(() => {
    if (isMinimized) return; 

    const markAsRead = async () => {
      if (isGroup) {
        // Dla czatu grupowego: oznaczamy wszystkie nieprzeczytane wiadomości (gdzie użytkownik nie jest w readBy)
        const q = query(
          collection(db, "chats", chatId, "messages"),
          where("receiverId", "==", "all")
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach((d) => {
            const msgData = d.data();
            const readBy = msgData.readBy || [];
            // Jeśli użytkownik jeszcze nie przeczytał, dodaj go do readBy
            if (!readBy.includes(currentUser.uid) && msgData.senderId !== currentUser.uid) {
              batch.update(doc(db, "chats", chatId, "messages", d.id), { 
                readBy: arrayUnion(currentUser.uid) 
              });
            }
          });
          await batch.commit();
        }
      } else {
        // Dla czatu prywatnego: standardowa logika
        const q = query(
          collection(db, "chats", chatId, "messages"),
          where("senderId", "==", recipient.id),
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
    };

    markAsRead();
  }, [messages, isMinimized, chatId, recipient.id, isGroup, currentUser.uid]);

  // 3. Wysyłanie wiadomości
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage;
    setNewMessage("");

    try {
      const messageData = {
        text: text,
        senderId: currentUser.uid,
        receiverId: isGroup ? 'all' : recipient.id, 
        createdAt: serverTimestamp(),
      };
      
      // Dla wiadomości grupowych używamy readBy, dla prywatnych read
      if (isGroup) {
        messageData.readBy = []; // Początkowo nikt nie przeczytał (oprócz nadawcy, który automatycznie widzi)
      } else {
        messageData.read = false;
      }
      
      await addDoc(collection(db, "chats", chatId, "messages"), messageData);
    } catch (error) {
      console.error("Błąd wysyłania:", error);
    }
  };

  if (!recipient) return null;

  return (
    <div 
      className={`fixed right-4 z-50 bg-white border border-stone-200 shadow-2xl rounded-t-xl overflow-hidden transition-all duration-300 flex flex-col
        ${isMinimized ? 'bottom-0 h-14 w-64' : 'bottom-0 h-[450px] w-80 sm:w-96'}
      `}
    >
      {/* Header */}
      <div 
        className="bg-stone-900 text-white p-3 flex items-center justify-between cursor-pointer hover:bg-stone-800 transition-colors"
        onClick={onToggleMinimize}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            {isGroup ? (
               // Ikona dla grupy
               <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs font-medium border border-stone-600">
                  <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
               </div>
            ) : (
               // Ikona dla usera
               <>
                <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs font-medium border border-stone-600">
                  {recipient.displayName?.charAt(0)?.toUpperCase()}
                </div>
                {recipient.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-stone-900"></div>
                )}
               </>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold truncate max-w-[120px]">{recipient.displayName}</p>
            {!isMinimized && !isGroup && (
               <p className="text-[10px] text-stone-400">{recipient.isOnline ? 'Dostępny' : 'Niedostępny'}</p>
            )}
            {!isMinimized && isGroup && (
               <p className="text-[10px] text-stone-400">Wszyscy pracownicy</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 bg-stone-50 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
                <div className="text-center text-xs text-stone-400 mt-10">
                    {isGroup ? 'To jest początek czatu grupowego.' : `Rozpocznij rozmowę z ${recipient.displayName}`}
                </div>
            )}
            
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser.uid;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* W grupie pokazujemy imię nadawcy jeśli to nie ja */}
                  {isGroup && !isMe && (
                    <span className="text-[10px] text-stone-500 ml-1 mb-0.5">
                      {getUserName(msg.senderId)}
                    </span>
                  )}
                  
                  <div 
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                      isMe 
                        ? 'bg-stone-900 text-white rounded-br-none' 
                        : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-stone-400' : 'text-stone-400'}`}>
                        {msg.createdAt ? formatDateTime(new Date(msg.createdAt.seconds * 1000).toISOString()).split(' ')[1] : '...'}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isGroup ? "Napisz do wszystkich..." : "Napisz wiadomość..."}
                className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-full focus:outline-none focus:border-stone-400 bg-stone-50"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatWidget;