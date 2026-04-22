// src/phone/SmsPanel.jsx
// Panel SMS – lista kontaktów (konwersacji) po lewej, wątek po prawej.
// Dane w czasie rzeczywistym przez Firestore onSnapshot.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query, where, limit } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const FUNCTIONS_BASE = "https://us-central1-wyjscie-z-dlugow.cloudfunctions.net";

async function apiFetch(path, options = {}) {
    const user = auth.currentUser;
    if (!user) throw new Error("Brak zalogowanego użytkownika");
    const idToken = await user.getIdToken();
    const res = await fetch(`${FUNCTIONS_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
            ...(options.headers || {}),
        },
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status}: ${txt}`);
    }
    return res.json();
}

function formatTime(ms) {
    if (!ms) return "";
    const d = new Date(ms);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
        return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

function getContact(message, ourNumber) {
    return message.direction === "outbound" ? message.to : message.from;
}

export default function SmsPanel({ ourNumber }) {
    const [messages, setMessages] = useState([]); // wszystkie wiadomości
    const [selectedContact, setSelectedContact] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState(null);
    const threadEndRef = useRef(null);

    // Real-time listener – ostatnie 200 SMS z Firestore
    useEffect(() => {
        const q = query(
            collection(db, "sms"),
            orderBy("createdAt", "desc"),
            limit(200)
        );
        const unsub = onSnapshot(q, (snap) => {
            const items = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    from: data.from || "",
                    to: data.to || "",
                    body: data.body || "",
                    direction: data.direction || "inbound",
                    status: data.status || "",
                    agentId: data.agentId || null,
                    createdAt: data.createdAt ? data.createdAt.toMillis() : null,
                };
            });
            setMessages(items);
        }, (err) => {
            console.error("SmsPanel snapshot error:", err);
        });
        return () => unsub();
    }, []);

    // Scroll do końca wątku
    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedContact, messages]);

    // Lista unikalnych kontaktów (ostatnia wiadomość w każdym wątku)
    const contacts = (() => {
        const map = new Map();
        for (const m of messages) {
            const contact = getContact(m, ourNumber);
            if (!contact) continue;
            if (!map.has(contact) || (m.createdAt || 0) > (map.get(contact).createdAt || 0)) {
                map.set(contact, m);
            }
        }
        return Array.from(map.entries())
            .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0))
            .map(([contact, lastMsg]) => ({ contact, lastMsg }));
    })();

    // Wątek wybranego kontaktu
    const thread = messages
        .filter((m) => getContact(m, ourNumber) === selectedContact)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const handleSend = useCallback(async (e) => {
        e.preventDefault();
        if (!selectedContact || !newMessage.trim()) return;
        setSending(true);
        setSendError(null);
        try {
            await apiFetch("/sendSms", {
                method: "POST",
                body: JSON.stringify({ to: selectedContact, body: newMessage.trim() }),
            });
            setNewMessage("");
        } catch (err) {
            setSendError(err.message);
        } finally {
            setSending(false);
        }
    }, [selectedContact, newMessage]);

    const [newContact, setNewContact] = useState("");
    const handleNewConversation = useCallback((e) => {
        e.preventDefault();
        const num = newContact.trim();
        if (!num) return;
        setSelectedContact(num);
        setNewContact("");
    }, [newContact]);

    return (
        <div className="phone-module bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: "600px", display: "flex", flexDirection: "column" }}>
            <div className="flex flex-1 min-h-0">
                {/* Lewa kolumna – kontakty */}
                <div className="w-72 flex-shrink-0 border-r border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-200">
                        <h2 className="font-bold text-slate-800 text-lg mb-3">Wiadomości SMS</h2>
                        {/* Nowa rozmowa */}
                        <form onSubmit={handleNewConversation} className="flex gap-2">
                            <input
                                type="tel"
                                placeholder="+48..."
                                value={newContact}
                                onChange={(e) => setNewContact(e.target.value)}
                                className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded font-mono focus:outline-none focus:border-emerald-400"
                            />
                            <button
                                type="submit"
                                className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded hover:bg-emerald-600"
                            >
                                Nowy
                            </button>
                        </form>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {contacts.length === 0 && (
                            <div className="p-4 text-sm text-slate-400 text-center">Brak konwersacji</div>
                        )}
                        {contacts.map(({ contact, lastMsg }) => (
                            <button
                                key={contact}
                                onClick={() => setSelectedContact(contact)}
                                className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 ${selectedContact === contact ? "bg-emerald-50 border-l-2 border-l-emerald-500" : ""}`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="font-mono font-semibold text-sm text-slate-800 truncate">{contact}</span>
                                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{formatTime(lastMsg.createdAt)}</span>
                                </div>
                                <div className="text-xs text-slate-500 truncate mt-0.5">
                                    {lastMsg.direction === "outbound" && <span className="text-emerald-600 mr-1">Ty:</span>}
                                    {lastMsg.body}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Prawa kolumna – wątek */}
                <div className="flex-1 flex flex-col min-w-0">
                    {!selectedContact ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                            Wybierz kontakt lub wpisz nowy numer
                        </div>
                    ) : (
                        <>
                            {/* Nagłówek wątku */}
                            <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <span className="font-mono font-semibold text-slate-800">{selectedContact}</span>
                            </div>

                            {/* Wiadomości */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                {thread.length === 0 && (
                                    <div className="text-center text-sm text-slate-400 py-8">Brak wiadomości – napisz pierwszą</div>
                                )}
                                {thread.map((m) => (
                                    <div
                                        key={m.id}
                                        className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                                                m.direction === "outbound"
                                                    ? "bg-emerald-500 text-white rounded-br-sm"
                                                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                                            }`}
                                        >
                                            <p className="leading-snug">{m.body}</p>
                                            <p className={`text-xs mt-1 ${m.direction === "outbound" ? "text-emerald-100" : "text-slate-400"}`}>
                                                {formatTime(m.createdAt)}
                                                {m.direction === "outbound" && m.status && (
                                                    <span className="ml-1 opacity-75">· {m.status}</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={threadEndRef} />
                            </div>

                            {/* Pole wysyłki */}
                            <div className="border-t border-slate-200 p-3">
                                {sendError && (
                                    <div className="text-red-600 text-xs mb-2">{sendError}</div>
                                )}
                                <form onSubmit={handleSend} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Wpisz wiadomość..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-full focus:outline-none focus:border-emerald-400"
                                        disabled={sending}
                                        maxLength={1600}
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || !newMessage.trim()}
                                        className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                    >
                                        {sending ? (
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
