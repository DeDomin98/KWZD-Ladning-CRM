// src/phone/SmsPanel.jsx
// Panel SMS – Messenger-style: lista konwersacji po lewej, wątek po prawej.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import Tooltip from "./Tooltip";
import { useContactLookup } from "./contacts";
import { IconMessage, IconAlert, IconSend, IconExternal } from "./Icons";

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

function getContact(message) {
    return message.direction === "outbound" ? message.to : message.from;
}

function smsSegments(text) {
    const len = text.length;
    if (len === 0) return { segments: 0, max: 160, len: 0 };
    // Uproszczenie – nie sprawdzamy unicode, ale ostrzegamy o limicie 160/segment.
    const seg = len <= 160 ? 1 : Math.ceil(len / 153);
    return { segments: seg, max: seg * 160, len };
}

function initials(num) {
    if (!num) return "?";
    const digits = String(num).replace(/\D/g, "");
    return digits.slice(-2) || "?";
}

export default function SmsPanel({ ourNumber }) {
    const { lookup } = useContactLookup();
    const [messages, setMessages] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState(null);
    const threadEndRef = useRef(null);

    useEffect(() => {
        const q = query(collection(db, "sms"), orderBy("createdAt", "desc"), limit(200));
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

    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedContact, messages]);

    const contacts = useMemo(() => {
        const map = new Map();
        for (const m of messages) {
            const contact = getContact(m);
            if (!contact) continue;
            if (!map.has(contact) || (m.createdAt || 0) > (map.get(contact).createdAt || 0)) {
                map.set(contact, m);
            }
        }
        return Array.from(map.entries())
            .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0))
            .map(([contact, lastMsg]) => ({ contact, lastMsg }));
    }, [messages]);

    const thread = useMemo(
        () => messages
            .filter((m) => getContact(m) === selectedContact)
            .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
        [messages, selectedContact]
    );

    const handleSend = useCallback(async (e) => {
        e.preventDefault();
        if (!selectedContact || !newMessage.trim()) return;
        const body = newMessage.trim();
        setSending(true);
        setSendError(null);
        try {
            await apiFetch("/sendSms", {
                method: "POST",
                body: JSON.stringify({ to: selectedContact, body }),
            });
            setNewMessage("");
            // Auto-log do contactHistory leada/klienta robi backend (functions/phone/sendSms.js).
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

    const seg = smsSegments(newMessage);

    return (
        <div className="phone-module">
            <div className="phone-sms">
                <div className="phone-sms-body">
                    {/* LEWA – konwersacje */}
                    <aside className="phone-sms-aside">
                        <div className="phone-sms-aside-head">
                            <h2 className="phone-sms-aside-title">
                                <IconMessage size={16} /> Konwersacje
                                <Tooltip text="Każdy numer = osobny wątek SMS, jak w Messengerze." />
                            </h2>
                            <form onSubmit={handleNewConversation} className="phone-sms-aside-newrow">
                                <input
                                    type="tel"
                                    placeholder="+48..."
                                    value={newContact}
                                    onChange={(e) => setNewContact(e.target.value)}
                                />
                                <button type="submit">Nowa</button>
                            </form>
                        </div>

                        <div className="phone-sms-list">
                            {contacts.length === 0 && (
                                <div className="phone-empty" style={{ padding: 24 }}>
                                    <div className="phone-empty-icon"><IconMessage size={28} /></div>
                                    <div className="phone-empty-text">Brak konwersacji</div>
                                </div>
                            )}
                            {contacts.map(({ contact, lastMsg }) => {
                                const c = lookup(contact);
                                return (
                                    <button
                                        key={contact}
                                        type="button"
                                        onClick={() => setSelectedContact(contact)}
                                        className={`phone-sms-item ${selectedContact === contact ? "active" : ""}`}
                                    >
                                        <div className="phone-sms-item-row1">
                                            <span className="phone-sms-item-num">
                                                {c ? (
                                                    <>
                                                        <span className="phone-sms-item-name">{c.name}</span>
                                                        {c.isClient && <span className="phone-badge-client sm">KL</span>}
                                                    </>
                                                ) : contact}
                                            </span>
                                            <span className="phone-sms-item-time">{formatTime(lastMsg.createdAt)}</span>
                                        </div>
                                        {c && <div className="phone-sms-item-num-sub">{contact}</div>}
                                        <div className="phone-sms-item-preview">
                                            {lastMsg.direction === "outbound" && <span className="you">Ty: </span>}
                                            {lastMsg.body}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* PRAWA – wątek */}
                    <div className="phone-sms-thread">
                        {!selectedContact ? (
                            <div className="phone-empty" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <div className="phone-empty-icon"><IconMessage size={32} /></div>
                                <div className="phone-empty-title">Wybierz konwersację</div>
                                <div className="phone-empty-text">
                                    lub wpisz nowy numer w polu po lewej
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="phone-sms-thread-head">
                                    <div className="phone-sms-thread-avatar">
                                        {(() => {
                                            const c = lookup(selectedContact);
                                            return c
                                                ? c.name.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()
                                                : initials(selectedContact);
                                        })()}
                                    </div>
                                    <div className="phone-sms-thread-head-text">
                                        {(() => {
                                            const c = lookup(selectedContact);
                                            return (
                                                <>
                                                    {c && (
                                                        <div className="phone-sms-thread-name">
                                                            {c.name}
                                                            {c.isClient && <span className="phone-badge-client sm">KLIENT</span>}
                                                        </div>
                                                    )}
                                                    <span className="phone-sms-thread-num">{selectedContact}</span>
                                                    {c && (
                                                        <Link
                                                            to={c.crmPath}
                                                            className="phone-sms-thread-link"
                                                        >
                                                            <IconExternal size={12} /> Otwórz kartę
                                                        </Link>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="phone-sms-thread-msgs">
                                    {thread.length === 0 && (
                                        <div className="phone-empty">
                                            <div className="phone-empty-text">
                                                Brak wiadomości — napisz pierwszą poniżej.
                                            </div>
                                        </div>
                                    )}
                                    {thread.map((m) => (
                                        <div key={m.id} className={`phone-sms-msg ${m.direction === "outbound" ? "out" : "in"}`}>
                                            <div className="phone-sms-bubble">
                                                {m.body}
                                                <div className="phone-sms-meta">
                                                    {formatTime(m.createdAt)}
                                                    {m.direction === "outbound" && m.status && ` · ${m.status}`}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={threadEndRef} />
                                </div>

                                <div className="phone-sms-form">
                                    {sendError && (
                                        <div className="phone-alert danger" style={{ marginBottom: 8 }}>
                                            <span className="phone-alert-icon"><IconAlert size={14} /></span>
                                            <span>{sendError}</span>
                                        </div>
                                    )}
                                    <form onSubmit={handleSend} className="phone-sms-form-row">
                                        <input
                                            type="text"
                                            placeholder="Wpisz wiadomość..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            disabled={sending}
                                            maxLength={1600}
                                        />
                                        <button
                                            type="submit"
                                            disabled={sending || !newMessage.trim()}
                                            className="phone-sms-form-send"
                                            title="Wyślij SMS"
                                        >
                                            {sending ? "…" : <IconSend size={16} />}
                                        </button>
                                    </form>
                                    {newMessage && (
                                        <div className={`phone-sms-form-meta ${seg.segments > 1 ? "warn" : ""}`}>
                                            <span>
                                                {seg.len} / {seg.max} znaków
                                                {seg.segments > 1 && ` (${seg.segments} segmenty)`}
                                            </span>
                                            {seg.segments > 1 && (
                                                <span><IconAlert size={12} /> Każdy segment = osobny SMS</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
