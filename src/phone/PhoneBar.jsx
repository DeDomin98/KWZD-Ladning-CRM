// src/phone/PhoneBar.jsx
// Pasek z aktualnym stanem telefonu, przyklejony na dole.
// Pokazuje: status, dane dzwoniącego, licznik czasu, mute, DTMF, rozłącz.

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Dialpad from "./Dialpad";
import {
    IconPhone, IconPhoneOff, IconClose, IconMic, IconMicOff,
    IconKeypad, IconClock, IconExternal,
} from "./Icons";

function formatDuration(ms) {
    if (!ms || ms < 0) return "00:00";
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

const STATUS_LABEL = {
    online: { strong: "Gotowy", soft: "Czekasz na połączenie" },
    offline: { strong: "Offline", soft: "Łączenie z centralą..." },
    ringing: { strong: "Połączenie przychodzące", soft: "Odbierz lub odrzuć" },
    "in-call": { strong: "Trwa rozmowa", soft: "Możesz wyciszyć lub użyć klawiatury" },
    error: { strong: "Błąd", soft: "Zobacz szczegóły wyżej" },
};

function initials(num) {
    if (!num) return "?";
    const digits = String(num).replace(/\D/g, "");
    return digits.slice(-2) || "?";
}

export default function PhoneBar({
    status,
    activeCall,
    error,
    answer,
    reject,
    hangup,
    muted,
    toggleMute,
    sendDigit,
    contact,
}) {
    const [now, setNow] = useState(Date.now());
    const [dtmfOpen, setDtmfOpen] = useState(false);

    useEffect(() => {
        if (status !== "in-call" || !activeCall?.startedAt) return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [status, activeCall?.startedAt]);

    useEffect(() => {
        if (status !== "in-call") setDtmfOpen(false);
    }, [status]);

    const callDuration = activeCall?.startedAt ? now - activeCall.startedAt : 0;
    const label = STATUS_LABEL[status] || { strong: status, soft: "" };

    // Pełny pasek pokazujemy tylko gdy faktycznie coś się dzieje (żeby nie zasłaniać
    // treści stron CRM). W stanie "online"/"offline" bez aktywnego połączenia
    // renderujemy mały, dyskretny wskaźnik w rogu.
    const showFullBar = status === "ringing" || status === "in-call" || status === "error" || !!activeCall;

    // Rezerwujemy miejsce u dołu strony, żeby pasek (fixed bottom) nie zasłaniał
    // przycisków/treści. Modale (fixed inset-0, z-50) są nad paskiem (z-40) — bez wpływu.
    useEffect(() => {
        const reservePx = showFullBar ? 96 : 0; // 76px pasek + 20px luzu
        document.body.style.paddingBottom = reservePx ? `${reservePx}px` : "";
        return () => {
            document.body.style.paddingBottom = "";
        };
    }, [showFullBar]);

    if (!showFullBar) {
        return (
            <div className={`phone-mini-indicator ${status}`} title={label.strong}>
                <span className={`phone-status-dot ${status}`} />
                <span className="phone-mini-indicator-text">{label.strong}</span>
            </div>
        );
    }

    const barClass = `phone-bar ${status}`;

    return (
        <>
            {dtmfOpen && status === "in-call" && (
                <div className="phone-bar-dtmf phone-module">
                    <div className="phone-bar-dtmf-title">Klawiatura tonowa (DTMF)</div>
                    <Dialpad mode="dtmf" onDigit={sendDigit} />
                </div>
            )}

            <div className={barClass}>
                <div className="phone-bar-status">
                    <span className={`phone-status-dot ${status}`} />
                    <div className="phone-bar-status-text">
                        <strong>{label.strong}</strong>
                        <span>{label.soft}</span>
                    </div>
                </div>

                <div className="phone-bar-info">
                    {activeCall?.from && (
                        <div className="phone-bar-caller">
                            <div className="phone-bar-avatar">
                                {contact
                                    ? contact.name.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()
                                    : initials(activeCall.from)}
                            </div>
                            <div className="phone-bar-caller-text">
                                <span className="phone-bar-caller-label">
                                    {activeCall.direction === "outbound" ? "Dzwonisz do" : "Dzwoni"}
                                </span>
                                {contact ? (
                                    <span className="phone-bar-caller-name">
                                        {contact.name}
                                        {contact.isClient && <span className="phone-badge-client sm">KLIENT</span>}
                                    </span>
                                ) : null}
                                <span className="phone-bar-caller-num">{activeCall.from}</span>
                            </div>
                            {contact && (
                                <Link
                                    to={contact.crmPath}
                                    className="phone-bar-open-card"
                                    title={`Otwórz kartę ${contact.isClient ? "klienta" : "leada"}`}
                                >
                                    <IconExternal size={14} />
                                </Link>
                            )}
                        </div>
                    )}

                    {status === "in-call" && (
                        <div className="phone-bar-timer" title="Czas trwania rozmowy">
                            <IconClock size={14} /> {formatDuration(callDuration)}
                        </div>
                    )}

                    {error && status === "error" && (
                        <div className="phone-bar-error">{error}</div>
                    )}
                </div>

                <div className="phone-bar-controls">
                    {status === "ringing" && (
                        <>
                            <button className="phone-btn phone-btn-answer" onClick={answer}>
                                <IconPhone size={16} /> Odbierz
                            </button>
                            <button className="phone-btn phone-btn-reject" onClick={reject}>
                                <IconClose size={16} /> Odrzuć
                            </button>
                        </>
                    )}

                    {status === "in-call" && (
                        <>
                            <button
                                className={`phone-bar-icon-btn ${muted ? "active" : ""}`}
                                onClick={toggleMute}
                                title={muted ? "Włącz mikrofon" : "Wycisz mikrofon"}
                                aria-label="Wycisz"
                            >
                                {muted ? <IconMicOff size={18} /> : <IconMic size={18} />}
                            </button>
                            <button
                                className={`phone-bar-icon-btn ${dtmfOpen ? "active" : ""}`}
                                onClick={() => setDtmfOpen((v) => !v)}
                                title="Klawiatura tonowa (np. do menu IVR banku)"
                                aria-label="Klawiatura"
                            >
                                <IconKeypad size={18} />
                            </button>
                            <button className="phone-btn phone-btn-hangup" onClick={hangup}>
                                <IconPhoneOff size={16} /> Rozłącz
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
