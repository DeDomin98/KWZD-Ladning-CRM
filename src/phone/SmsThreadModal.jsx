// src/phone/SmsThreadModal.jsx
// Modal wątku SMS – Messenger-style, otwierany z karty leada/klienta.
// Pokazuje historię wiadomości z danym numerem + pole do wysłania nowej.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useContactLookup, normalizePhone } from "./contacts";
import { IconMessage, IconSend, IconClose, IconAlert, IconUser } from "./Icons";

const FUNCTIONS_BASE = "https://us-central1-wyjscie-z-dlugow.cloudfunctions.net";

async function sendSmsApi(to, body) {
    const user = auth.currentUser;
    if (!user) throw new Error("Brak zalogowanego użytkownika");
    const idToken = await user.getIdToken();
    const res = await fetch(`${FUNCTIONS_BASE}/sendSms`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ to, body }),
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
    return d.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function smsSegments(text) {
    const len = text.length;
    if (len === 0) return { segments: 0, len: 0 };
    return { segments: len <= 160 ? 1 : Math.ceil(len / 153), len };
}

export default function SmsThreadModal({ number, name, onClose }) {
    const { lookup } = useContactLookup();
    const [allMessages, setAllMessages] = useState([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const endRef = useRef(null);

    const contact = lookup(number);
    const displayName = contact?.name || name || number;
    const targetKey = normalizePhone(number);

    // Subskrypcja kolekcji sms (wszystkie – filtrujemy po stronie klienta po normalizowanym numerze).
    // Zapytania Firestore nie pozwalają na OR po dwóch polach, a numery przychodzą w różnych formatach.
    useEffect(() => {
        const q = query(collection(db, "sms"), orderBy("createdAt", "desc"), limit(300));
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
                    createdAt: data.createdAt ? data.createdAt.toMillis() : null,
                };
            });
            setAllMessages(items);
        }, (err) => {
            console.error("SmsThreadModal snapshot error:", err);
        });
        return () => unsub();
    }, []);

    const thread = useMemo(() => {
        if (!targetKey) return [];
        return allMessages
            .filter((m) => {
                const otherKey = m.direction === "outbound"
                    ? normalizePhone(m.to)
                    : normalizePhone(m.from);
                return otherKey === targetKey;
            })
            .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }, [allMessages, targetKey]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [thread]);

    // ESC zamyka
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const handleSend = useCallback(async (e) => {
        e?.preventDefault?.();
        const body = text.trim();
        if (!body || sending) return;
        setSending(true);
        setError(null);
        try {
            await sendSmsApi(number, body);
            setText("");
            // contactHistory loguje backend (functions/phone/sendSms.js)
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    }, [text, sending, number]);

    const seg = smsSegments(text);

    return (
        <div className="phone-sms-modal-overlay" onClick={onClose}>
            <div
                className="phone-sms-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <header className="phone-sms-modal-head">
                    <div className="phone-sms-modal-head-info">
                        <div className="phone-sms-modal-avatar">
                            <IconUser size={18} />
                        </div>
                        <div>
                            <div className="phone-sms-modal-name">
                                {displayName}
                                {contact?.isClient && <span className="phone-badge-client sm">KLIENT</span>}
                            </div>
                            <div className="phone-sms-modal-num">{number}</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="phone-sms-modal-close"
                        onClick={onClose}
                        aria-label="Zamknij"
                    >
                        <IconClose size={16} />
                    </button>
                </header>

                <div className="phone-sms-modal-msgs">
                    {thread.length === 0 ? (
                        <div className="phone-sms-modal-empty">
                            <IconMessage size={28} />
                            <div>Brak wiadomości — napisz pierwszą poniżej.</div>
                        </div>
                    ) : (
                        thread.map((m) => (
                            <div
                                key={m.id}
                                className={`phone-sms-msg ${m.direction === "outbound" ? "out" : "in"}`}
                            >
                                <div className="phone-sms-bubble">
                                    {m.body}
                                    <div className="phone-sms-meta">
                                        {formatTime(m.createdAt)}
                                        {m.direction === "outbound" && m.status && ` · ${m.status}`}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={endRef} />
                </div>

                {error && (
                    <div className="phone-alert danger" style={{ margin: "0 14px 6px" }}>
                        <span className="phone-alert-icon"><IconAlert size={14} /></span>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSend} className="phone-sms-modal-form">
                    <input
                        type="text"
                        placeholder="Wpisz wiadomość…"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={sending}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={sending || !text.trim()}
                        className="phone-sms-modal-send"
                        title="Wyślij SMS (Enter)"
                    >
                        <IconSend size={16} />
                        {sending ? "Wysyłam…" : "Wyślij"}
                    </button>
                </form>
                <div className="phone-sms-modal-counter">
                    {seg.len > 0 && `${seg.len} znaków · ${seg.segments} segment${seg.segments > 1 ? "y" : ""}`}
                </div>
            </div>
        </div>
    );
}
