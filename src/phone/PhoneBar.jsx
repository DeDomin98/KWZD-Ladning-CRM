// src/phone/PhoneBar.jsx
// Fixed bar na dole strony z aktualnym stanem i sterowaniem połączeniem.

import React, { useEffect, useState } from "react";

function formatDuration(ms) {
    if (!ms || ms < 0) return "00:00";
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

function statusLabel(status) {
    switch (status) {
        case "online": return "Online";
        case "offline": return "Offline";
        case "ringing": return "Połączenie przychodzące";
        case "in-call": return "W trakcie rozmowy";
        case "error": return "Błąd";
        default: return status;
    }
}

export default function PhoneBar({ status, activeCall, error, answer, reject, hangup }) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (status !== "in-call" || !activeCall?.startedAt) return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [status, activeCall?.startedAt]);

    const callDuration = activeCall?.startedAt ? now - activeCall.startedAt : 0;

    return (
        <div className="phone-bar">
            <div className="flex items-center gap-2 min-w-[180px]">
                <span className={`phone-status-dot ${status}`}></span>
                <span className="font-semibold text-slate-700">{statusLabel(status)}</span>
            </div>

            <div className="flex-1 flex items-center gap-4">
                {activeCall?.from && (
                    <div className="text-slate-700">
                        <span className="text-xs text-slate-500 uppercase mr-2">Numer:</span>
                        <span className="font-mono font-semibold">{activeCall.from}</span>
                    </div>
                )}

                {status === "in-call" && (
                    <div className="text-slate-600 font-mono">
                        ⏱ {formatDuration(callDuration)}
                    </div>
                )}

                {error && (
                    <div className="text-red-600 text-sm truncate max-w-md">{error}</div>
                )}
            </div>

            <div className="flex items-center gap-2">
                {status === "ringing" && (
                    <>
                        <button className="phone-btn phone-btn-answer" onClick={answer}>
                            Odbierz
                        </button>
                        <button className="phone-btn phone-btn-reject" onClick={reject}>
                            Odrzuć
                        </button>
                    </>
                )}
                {status === "in-call" && (
                    <button className="phone-btn phone-btn-hangup" onClick={hangup}>
                        Rozłącz
                    </button>
                )}
            </div>
        </div>
    );
}
