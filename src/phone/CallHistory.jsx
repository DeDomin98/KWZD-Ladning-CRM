// src/phone/CallHistory.jsx
// Tabela historii połączeń – dane z funkcji getCalls + paginacja "załaduj więcej".

import React, { useCallback, useEffect, useState } from "react";
import { auth } from "../lib/firebase";

const FUNCTIONS_BASE = "https://us-central1-wyjscie-z-dlugow.cloudfunctions.net";
const PAGE_SIZE = 25;

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

export default function CallHistory({ agentId }) {
    const [items, setItems] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [done, setDone] = useState(false);

    const load = useCallback(async (reset = false) => {
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
            if (!reset && cursor) params.set("startAfter", cursor);

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
            if (!data.nextCursor) setDone(true);
            else setDone(false);
        } catch (e) {
            console.error(e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [agentId, cursor]);

    useEffect(() => {
        // reset przy zmianie agentId
        setItems([]);
        setCursor(null);
        setDone(false);
        load(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agentId]);

    return (
        <div className="phone-module">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Historia połączeń</h2>

            {error && (
                <div className="mb-3 p-3 bg-red-50 text-red-700 rounded">{error}</div>
            )}

            <div className="overflow-x-auto">
                <table className="phone-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Od</th>
                            <th>Do</th>
                            <th>Agent</th>
                            <th>Czas</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="text-center text-slate-500 py-8">
                                    Brak połączeń
                                </td>
                            </tr>
                        )}
                        {items.map((c) => (
                            <tr key={c.id}>
                                <td>{formatDate(c.startedAt)}</td>
                                <td className="font-mono">{c.from || "—"}</td>
                                <td className="font-mono">{c.to || "—"}</td>
                                <td>{c.agentId || "—"}</td>
                                <td>{formatDuration(c.duration)}</td>
                                <td>
                                    <span className={`phone-status-badge ${c.status || ""}`}>
                                        {c.status || "—"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex items-center justify-center">
                {!done && (
                    <button
                        className="phone-btn phone-btn-reject"
                        onClick={() => load(false)}
                        disabled={loading}
                    >
                        {loading ? "Ładowanie…" : "Załaduj więcej"}
                    </button>
                )}
                {done && items.length > 0 && (
                    <span className="text-sm text-slate-500">— koniec listy —</span>
                )}
            </div>
        </div>
    );
}
