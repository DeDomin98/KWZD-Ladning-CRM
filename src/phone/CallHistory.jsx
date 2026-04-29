// src/phone/CallHistory.jsx
// Tabela historii połączeń – z polskimi statusami, kierunkiem (in/out),
// wyszukiwarką po numerze, filtrem typu i klikalnym numerem (kliknij = zadzwoń).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../lib/firebase";
import { useContactLookup } from "./contacts";
import {
    IconSearch, IconPhoneIncoming, IconPhoneOutgoing, IconPhoneMissed,
    IconPhone, IconAlert, IconClose, IconExternal,
} from "./Icons";

const FUNCTIONS_BASE = "https://us-central1-wyjscie-z-dlugow.cloudfunctions.net";
const PAGE_SIZE = 25;

const OUR_NUMBER = "+48732071624";

function formatDate(ms) {
    if (!ms) return "—";
    const d = new Date(ms);
    return d.toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDuration(sec) {
    if (!sec) return "—";
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

const STATUS_PL = {
    completed: "Zakończone",
    "in-progress": "W trakcie",
    ringing: "Dzwoni",
    "no-answer": "Nieodebrane",
    busy: "Zajęte",
    failed: "Nieudane",
    canceled: "Anulowane",
    queued: "W kolejce",
    initiated: "Inicjowanie",
    unknown: "—",
};

function isOutbound(call) {
    // jeśli nasz numer Twilio jest jako "from" -> to wychodzące
    return (call.from || "").includes(OUR_NUMBER.replace("+", ""));
}

function isMissed(call) {
    return ["no-answer", "busy", "failed", "canceled"].includes(call.status) && !isOutbound(call);
}

function getOtherNumber(call) {
    return isOutbound(call) ? call.to : call.from;
}

export default function CallHistory({ agentId, onCall }) {
    const { lookup } = useContactLookup();
    const [items, setItems] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all"); // all | in | out | missed

    const load = useCallback(async (reset = false, currentCursor = null) => {
        const user = auth.currentUser;
        if (!user) {
            setError("Brak zalogowanego użytkownika");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const idToken = await user.getIdToken();
            const params = new URLSearchParams();
            params.set("limit", String(PAGE_SIZE));
            if (agentId) params.set("agentId", agentId);
            if (!reset && currentCursor) params.set("startAfter", currentCursor);

            const res = await fetch(`${FUNCTIONS_BASE}/getCalls?${params.toString()}`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`getCalls ${res.status}: ${txt}`);
            }
            const data = await res.json();
            setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
            setCursor(data.nextCursor);
            setDone(!data.nextCursor);
        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [agentId]);

    useEffect(() => {
        setItems([]);
        setCursor(null);
        setDone(false);
        load(true, null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agentId]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((c) => {
            if (filter === "in" && isOutbound(c)) return false;
            if (filter === "out" && !isOutbound(c)) return false;
            if (filter === "missed" && !isMissed(c)) return false;
            if (q) {
                const num = getOtherNumber(c) || "";
                const contact = lookup(num);
                const hay = `${c.from || ""} ${c.to || ""} ${contact?.name || ""}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [items, search, filter, lookup]);

    return (
        <div className="phone-module">
            <div className="phone-toolbar">
                <div className="phone-search">
                    <span className="phone-search-icon"><IconSearch size={14} /></span>
                    <input
                        type="text"
                        placeholder="Szukaj numeru lub nazwiska..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="phone-filter" role="tablist">
                    <button
                        className={filter === "all" ? "active" : ""}
                        onClick={() => setFilter("all")}
                    >
                        Wszystkie
                    </button>
                    <button
                        className={filter === "in" ? "active" : ""}
                        onClick={() => setFilter("in")}
                    >
                        <IconPhoneIncoming size={13} /> Przychodzące
                    </button>
                    <button
                        className={filter === "out" ? "active" : ""}
                        onClick={() => setFilter("out")}
                    >
                        <IconPhoneOutgoing size={13} /> Wychodzące
                    </button>
                    <button
                        className={filter === "missed" ? "active" : ""}
                        onClick={() => setFilter("missed")}
                    >
                        <IconPhoneMissed size={13} /> Nieodebrane
                    </button>
                </div>
            </div>

            {error && (
                <div className="phone-alert danger">
                    <span className="phone-alert-icon"><IconAlert size={16} /></span>
                    <span>{error}</span>
                </div>
            )}

            <div className="phone-table-wrap">
                <table className="phone-table">
                    <thead>
                        <tr>
                            <th>Kierunek</th>
                            <th>Kontakt</th>
                            <th>Numer</th>
                            <th>Data</th>
                            <th>Czas</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7}>
                                    <div className="phone-empty">
                                        <div className="phone-empty-icon"><IconPhone size={32} /></div>
                                        <div className="phone-empty-title">Brak połączeń</div>
                                        <div className="phone-empty-text">
                                            {search || filter !== "all"
                                                ? "Spróbuj zmienić filtr lub wyszukiwanie"
                                                : "Twoje rozmowy pojawią się tu po pierwszym połączeniu"}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {filtered.map((c) => {
                            const out = isOutbound(c);
                            const missed = isMissed(c);
                            const num = getOtherNumber(c) || "—";
                            const dirCls = missed ? "missed" : out ? "out" : "in";
                            const dirLabel = missed ? "Nieodebrane" : out ? "Wychodzące" : "Przychodzące";
                            const DirIcon = missed ? IconPhoneMissed : out ? IconPhoneOutgoing : IconPhoneIncoming;
                            const contact = lookup(num);
                            return (
                                <tr key={c.id} className={missed ? "missed" : ""}>
                                    <td>
                                        <span className={`phone-dir ${dirCls}`}>
                                            <DirIcon size={14} />
                                            {dirLabel}
                                        </span>
                                    </td>
                                    <td>
                                        {contact ? (
                                            <Link
                                                to={contact.crmPath}
                                                className="phone-contact-link"
                                            >
                                                <span className="phone-contact-name">{contact.name}</span>
                                                {contact.isClient && <span className="phone-badge-client sm">KL</span>}
                                            </Link>
                                        ) : (
                                            <span className="phone-contact-unknown">—</span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            className="phone-call-link"
                                            title="Kliknij aby oddzwonić"
                                            onClick={() => onCall?.(num)}
                                            disabled={!num || num === "—"}
                                        >
                                            <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{num}</span>
                                            {num !== "—" && <IconPhone size={12} className="phone-call-link-icon" />}
                                        </button>
                                    </td>
                                    <td>{formatDate(c.startedAt)}</td>
                                    <td>{formatDuration(c.duration)}</td>
                                    <td>
                                        <span className={`phone-status-badge ${c.status || "unknown"}`}>
                                            {STATUS_PL[c.status] || c.status || "—"}
                                        </span>
                                    </td>
                                    <td>
                                        {contact && (
                                            <Link
                                                to={contact.crmPath}
                                                className="phone-row-action"
                                                title="Otwórz kartę"
                                            >
                                                <IconExternal size={14} />
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "center" }}>
                {!done && (
                    <button
                        className="phone-btn phone-btn-ghost"
                        onClick={() => load(false, cursor)}
                        disabled={loading}
                    >
                        {loading ? "Ładowanie…" : "Załaduj więcej"}
                    </button>
                )}
                {done && items.length > 0 && (
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>— koniec listy —</span>
                )}
            </div>
        </div>
    );
}
