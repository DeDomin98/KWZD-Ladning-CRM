// src/phone/CommunicationHistory.jsx
// Wspólny widok komunikacji telefonicznej (calls + sms) dla danego numeru.
// Używany w karcie klienta (ClientDetails) i leada (LeadDetails) w zakładce Historia.

import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { normalizePhone } from "./contacts";
import {
    IconPhoneIncoming, IconPhoneOutgoing, IconPhoneMissed,
    IconMessage, IconHistory, IconPhone,
} from "./Icons";
import "./phone.css";

const FUNCTIONS_BASE = "https://us-central1-wyjscie-z-dlugow.cloudfunctions.net";

function formatDate(ms) {
    if (!ms) return "";
    const d = new Date(ms);
    return d.toLocaleString("pl-PL", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function formatDuration(sec) {
    if (!sec) return "—";
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

const STATUS_PL = {
    completed: "Zakończone", "in-progress": "W trakcie",
    "no-answer": "Nieodebrane", busy: "Zajęte",
    failed: "Nieudane", canceled: "Anulowane", queued: "W kolejce",
};

const OUR_NUMBER_DIGITS = "732071624";

function isOutboundCall(call) {
    return (call.from || "").includes(OUR_NUMBER_DIGITS);
}

function isMissedCall(call) {
    return ["no-answer", "busy", "failed", "canceled"].includes(call.status) && !isOutboundCall(call);
}

/**
 * @param {string} phone numer telefonu klienta/leada (w dowolnym formacie)
 */
export default function CommunicationHistory({ phone }) {
    const [tab, setTab] = useState("all"); // all | calls | sms
    const [calls, setCalls] = useState([]);
    const [smsItems, setSmsItems] = useState([]);
    const [callsError, setCallsError] = useState(null);

    const phoneKey = useMemo(() => normalizePhone(phone), [phone]);

    // Subscribe SMS in real-time, filter by number client-side
    useEffect(() => {
        if (!phoneKey) return;
        const q = query(collection(db, "sms"), orderBy("createdAt", "desc"), limit(500));
        const unsub = onSnapshot(q, (snap) => {
            const items = snap.docs
                .map((d) => {
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
                })
                .filter((m) => {
                    const other = m.direction === "outbound" ? m.to : m.from;
                    return normalizePhone(other) === phoneKey;
                });
            setSmsItems(items);
        }, (err) => console.warn("comm sms err:", err));
        return () => unsub();
    }, [phoneKey]);

    // Fetch calls (paginated endpoint) – simple, take 200, filter by number
    useEffect(() => {
        if (!phoneKey) return;
        let canceled = false;
        (async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;
                const idToken = await user.getIdToken();
                const params = new URLSearchParams({ limit: "200" });
                const res = await fetch(`${FUNCTIONS_BASE}/getCalls?${params}`, {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                if (!res.ok) throw new Error(`getCalls ${res.status}`);
                const data = await res.json();
                if (canceled) return;
                const filtered = (data.items || []).filter((c) => {
                    const other = (c.from || "").includes(OUR_NUMBER_DIGITS) ? c.to : c.from;
                    return normalizePhone(other) === phoneKey;
                });
                setCalls(filtered);
            } catch (e) {
                if (!canceled) setCallsError(e.message);
            }
        })();
        return () => { canceled = true; };
    }, [phoneKey]);

    const merged = useMemo(() => {
        const list = [];
        calls.forEach((c) => list.push({ kind: "call", at: c.startedAt || 0, data: c, key: `c_${c.id}` }));
        smsItems.forEach((s) => list.push({ kind: "sms", at: s.createdAt || 0, data: s, key: `s_${s.id}` }));
        list.sort((a, b) => b.at - a.at);
        if (tab === "calls") return list.filter((x) => x.kind === "call");
        if (tab === "sms") return list.filter((x) => x.kind === "sms");
        return list;
    }, [calls, smsItems, tab]);

    if (!phoneKey) {
        return (
            <div className="phone-module">
                <div className="phone-comm-empty">
                    Brak numeru telefonu — uzupełnij dane kontaktowe, aby śledzić rozmowy i SMS-y.
                </div>
            </div>
        );
    }

    return (
        <div className="phone-module phone-comm-section">
            <div className="phone-comm-tabs">
                <button
                    className={tab === "all" ? "active" : ""}
                    onClick={() => setTab("all")}
                >
                    <IconHistory size={14} /> Wszystko ({calls.length + smsItems.length})
                </button>
                <button
                    className={tab === "calls" ? "active" : ""}
                    onClick={() => setTab("calls")}
                >
                    <IconPhone size={14} /> Połączenia ({calls.length})
                </button>
                <button
                    className={tab === "sms" ? "active" : ""}
                    onClick={() => setTab("sms")}
                >
                    <IconMessage size={14} /> SMS ({smsItems.length})
                </button>
            </div>

            {callsError && (
                <div className="phone-alert warn" style={{ marginBottom: 10 }}>
                    <span>Nie udało się pobrać połączeń: {callsError}</span>
                </div>
            )}

            {merged.length === 0 ? (
                <div className="phone-comm-empty">
                    Brak komunikacji z tym numerem. Po pierwszym połączeniu lub SMS-ie pojawi się tu wpis.
                </div>
            ) : (
                <div className="phone-comm-list">
                    {merged.map((item) => {
                        if (item.kind === "call") {
                            const c = item.data;
                            const out = isOutboundCall(c);
                            const missed = isMissedCall(c);
                            const Icon = missed ? IconPhoneMissed : out ? IconPhoneOutgoing : IconPhoneIncoming;
                            const cls = missed ? "missed" : out ? "out" : "in";
                            return (
                                <div key={item.key} className="phone-comm-item">
                                    <div className={`phone-comm-icon ${cls}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="phone-comm-body">
                                        <div className="phone-comm-row1">
                                            <span className="phone-comm-title">
                                                {missed ? "Połączenie nieodebrane"
                                                    : out ? "Połączenie wychodzące"
                                                        : "Połączenie przychodzące"}
                                            </span>
                                            <span className="phone-comm-time">{formatDate(c.startedAt)}</span>
                                        </div>
                                        <div className="phone-comm-meta">
                                            Czas: {formatDuration(c.duration)}
                                            {c.status && ` · ${STATUS_PL[c.status] || c.status}`}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        const s = item.data;
                        const out = s.direction === "outbound";
                        return (
                            <div key={item.key} className="phone-comm-item">
                                <div className="phone-comm-icon sms">
                                    <IconMessage size={16} />
                                </div>
                                <div className="phone-comm-body">
                                    <div className="phone-comm-row1">
                                        <span className="phone-comm-title">
                                            {out ? "SMS wysłany" : "SMS otrzymany"}
                                        </span>
                                        <span className="phone-comm-time">{formatDate(s.createdAt)}</span>
                                    </div>
                                    <div className="phone-comm-meta" style={{ whiteSpace: "pre-wrap" }}>
                                        {s.body}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
