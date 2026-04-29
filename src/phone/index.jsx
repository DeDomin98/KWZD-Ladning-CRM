// src/phone/index.jsx
// Strona modułu telefonicznego /crm/phone.
// Layout: header z pomocą, baner powitalny, dwie kolumny (lewy panel sterowania + prawy obszar roboczy),
// pasek na dole z aktualnym połączeniem.

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePhoneContext, usePhoneContextOptional, PhoneProvider } from "./PhoneContext";
import PhoneController from "./PhoneController";
import CallHistory from "./CallHistory";
import SmsPanel from "./SmsPanel";
import AudioDevicePicker from "./AudioDevicePicker";
import Dialpad from "./Dialpad";
import Tooltip from "./Tooltip";
import HelpModal from "./HelpModal";
import {
    IconPhone, IconUser, IconHelp, IconBookOpen, IconClose, IconAlert,
    IconMic, IconLaptop, IconSmartphone, IconCheck, IconKeypad, IconMicOff,
    IconHistory, IconMessage, IconClock, IconInfo, IconExternal, IconWave,
} from "./Icons";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import "./phone.css";

const OUR_NUMBER = "+48732071624";
const WELCOME_KEY = "phone:welcome:dismissed:v1";

const STATUS_TEXT = {
    online: { label: "Gotowy do rozmów", color: "#22c55e" },
    offline: { label: "Łączenie z centralą...", color: "#94a3b8" },
    ringing: { label: "Połączenie przychodzące", color: "#f59e0b" },
    "in-call": { label: "Trwa rozmowa", color: "#2563eb" },
    error: { label: "Błąd połączenia", color: "#ef4444" },
};

function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function PhonePageWrapper() {
    // /crm/phone jest poza CrmLayout, więc jeśli brak providera – stwórz lokalny.
    const ctx = usePhoneContextOptional();
    if (ctx) {
        return <PhonePage />;
    }
    return (
        <PhoneProvider>
            <PhonePage />
            <PhoneController />
        </PhoneProvider>
    );
}

function PhonePage() {
    const phone = usePhoneContext();
    const lookup = phone.lookup;
    const user = auth.currentUser;
    const agentId = user?.uid || null;
    const userName = user?.displayName || user?.email || "Agent";

    const [tab, setTab] = useState("dialer"); // dialer | history | sms
    const [dialNumber, setDialNumber] = useState("");

    const [forwardCalls, setForwardCalls] = useState(false);
    const [forwardSaving, setForwardSaving] = useState(false);
    const [forwardNumber, setForwardNumber] = useState("");
    const [forwardNumberInput, setForwardNumberInput] = useState("");
    const [forwardNumberSaving, setForwardNumberSaving] = useState(false);
    const [forwardNumberSaved, setForwardNumberSaved] = useState(false);
    const [forwardNumberError, setForwardNumberError] = useState("");

    const [helpOpen, setHelpOpen] = useState(false);
    const [welcomeOpen, setWelcomeOpen] = useState(() => {
        try {
            return localStorage.getItem(WELCOME_KEY) !== "1";
        } catch {
            return true;
        }
    });

    // Sync trybu odbierania z Firestore
    useEffect(() => {
        if (!agentId) return;
        const unsub = onSnapshot(doc(db, "agents", agentId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setForwardCalls(data.forwardCalls === true);
                const num = data.forwardNumber || "";
                setForwardNumber(num);
                // Pokazuj w polu tylko część bez +48
                setForwardNumberInput((prev) => (prev ? prev : stripPlPrefix(num)));
            }
        });
        return () => unsub();
    }, [agentId]);

    const setMode = async (forward) => {
        if (!agentId || forwardSaving) return;
        if (forward === forwardCalls) return;
        // Zabezpieczenie: nie można włączyć trybu Komórka bez zapisanego numeru
        if (forward && !forwardNumber) {
            setForwardNumberError("Najpierw zapisz swój numer komórki poniżej.");
            return;
        }
        setForwardSaving(true);
        try {
            await setDoc(
                doc(db, "agents", agentId),
                { forwardCalls: forward, lastSeen: serverTimestamp() },
                { merge: true }
            );
        } finally {
            setForwardSaving(false);
        }
    };

    // Normalizacja numeru komórki do E.164 (PL domyślnie +48)
    // Użytkownik wpisuje 9 cyfr; +48 jest prefiksowane wizualnie i logicznie.
    const normalizeForwardNumber = (raw) => {
        const cleaned = String(raw || "").replace(/[\s\-()]/g, "");
        if (!cleaned) return "";
        if (cleaned.startsWith("+")) return cleaned;
        if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
        // Same cyfry – zawsze traktuj jako PL i dodaj +48
        const digits = cleaned.replace(/\D/g, "");
        if (!digits) return "";
        if (digits.startsWith("48") && digits.length >= 11) return "+" + digits;
        return "+48" + digits;
    };

    // Pomocnicze: wyciąga część numeru bez prefiksu +48 do edycji w polu
    const stripPlPrefix = (e164) => {
        if (!e164) return "";
        if (e164.startsWith("+48")) return e164.slice(3);
        if (e164.startsWith("+")) return e164; // zagraniczny – zostaw jak jest
        return e164;
    };

    const saveForwardNumber = async () => {
        if (!agentId || forwardNumberSaving) return;
        setForwardNumberError("");
        setForwardNumberSaved(false);
        const normalized = normalizeForwardNumber(forwardNumberInput);
        if (!normalized) {
            setForwardNumberError("Podaj numer.");
            return;
        }
        if (!/^\+\d{8,15}$/.test(normalized)) {
            setForwardNumberError("Niepoprawny format. Wpisz 9 cyfr (np. 600100200).");
            return;
        }
        if (normalized.replace(/\D/g, "").endsWith("732071624")) {
            setForwardNumberError("Nie możesz przekierować na numer firmowy (powstałaby pętla).");
            return;
        }
        setForwardNumberSaving(true);
        try {
            await setDoc(
                doc(db, "agents", agentId),
                { forwardNumber: normalized, lastSeen: serverTimestamp() },
                { merge: true }
            );
            setForwardNumberInput(stripPlPrefix(normalized));
            setForwardNumberSaved(true);
            setTimeout(() => setForwardNumberSaved(false), 2500);
        } catch (e) {
            setForwardNumberError("Nie udało się zapisać: " + (e?.message || "błąd"));
        } finally {
            setForwardNumberSaving(false);
        }
    };

    const clearForwardNumber = async () => {
        if (!agentId) return;
        try {
            await setDoc(
                doc(db, "agents", agentId),
                { forwardNumber: "", forwardCalls: false, lastSeen: serverTimestamp() },
                { merge: true }
            );
            setForwardNumberInput("");
            setForwardNumberError("");
            setForwardNumberSaved(false);
        } catch (_) { /* noop */ }
    };

    const dismissWelcome = () => {
        try { localStorage.setItem(WELCOME_KEY, "1"); } catch (_) { /* noop */ }
        setWelcomeOpen(false);
    };

    const startCall = (num) => {
        const n = String(num || "").trim();
        if (!n) return;
        setDialNumber(n);
        // Z dialera dzwonimy bez dodatkowego potwierdzenia (użytkownik świadomie wpisał numer + kliknął Zadzwoń)
        phone.callNow(n);
    };

    const activeContact = useMemo(
        () => (phone.activeCall ? lookup(phone.activeCall.from) : null),
        [phone.activeCall, lookup]
    );

    const callDisabled = phone.status !== "online";
    const statusText = STATUS_TEXT[phone.status] || STATUS_TEXT.offline;

    const showMicWarning = phone.micAllowed === false;
    const showError = phone.error && phone.micAllowed !== false;

    const userInitials = useMemo(() => initials(userName), [userName]);

    return (
        <div className="phone-module" style={{ minHeight: "100vh", paddingBottom: 100 }}>
            {/* HEADER */}
            <header className="phone-header">
                <div className="phone-header-inner">
                    <div className="phone-header-title">
                        <div className="phone-header-icon"><IconPhone size={22} /></div>
                        <div>
                            <h1 className="phone-header-h1">Centrala telefoniczna</h1>
                            <p className="phone-header-sub">Numer firmowy: {OUR_NUMBER}</p>
                        </div>
                    </div>
                    <div className="phone-header-actions">
                        <span className="phone-header-pill" title="Twój numer agenta">
                            <span
                                style={{
                                    width: 8, height: 8, borderRadius: "50%",
                                    background: statusText.color, display: "inline-block",
                                }}
                            />
                            {statusText.label}
                        </span>
                        <span className="phone-header-pill">
                            <IconUser size={14} /> {userName}
                        </span>
                        <button
                            className="phone-header-help"
                            title="Otwórz tutorial / pomoc"
                            onClick={() => setHelpOpen(true)}
                            aria-label="Pomoc"
                        >
                            <IconHelp size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="phone-shell">
                {/* WELCOME BANNER */}
                {welcomeOpen && (
                    <div className="phone-welcome">
                        <div className="phone-welcome-icon"><IconWave size={26} /></div>
                        <div className="phone-welcome-body">
                            <div className="phone-welcome-title">Pierwszy raz tutaj?</div>
                            <div className="phone-welcome-text">
                                W kilku krokach pokażę Ci jak odbierać i wykonywać połączenia,
                                obsługiwać SMS-y i co oznaczają poszczególne kolory i ikony.
                            </div>
                            <div className="phone-welcome-actions">
                                <button
                                    className="phone-welcome-btn primary"
                                    onClick={() => setHelpOpen(true)}
                                >
                                    <IconBookOpen size={16} /> Pokaż mi jak to działa
                                </button>
                                <button className="phone-welcome-btn" onClick={dismissWelcome}>
                                    Już wiem, ukryj
                                </button>
                            </div>
                        </div>
                        <button
                            className="phone-welcome-x"
                            onClick={dismissWelcome}
                            aria-label="Zamknij"
                            title="Ukryj na zawsze"
                        >
                            <IconClose size={16} />
                        </button>
                    </div>
                )}

                {/* ALERTY */}
                {showMicWarning && (
                    <div className="phone-alert danger">
                        <span className="phone-alert-icon"><IconMic size={18} /></span>
                        <span>
                            <strong>Mikrofon zablokowany.</strong> Kliknij ikonę kłódki w pasku
                            adresu (obok URL) → „Zezwól na mikrofon", a następnie odśwież stronę
                            (F5). Bez tego nie odbierzesz rozmów.
                        </span>
                    </div>
                )}

                {showError && (
                    <div className="phone-alert warn">
                        <span className="phone-alert-icon"><IconAlert size={18} /></span>
                        <span>{phone.error}</span>
                    </div>
                )}

                {/* GRID */}
                <div className="phone-grid">
                    {/* LEWA KOLUMNA – panel sterowania */}
                    <aside>
                        {/* Status + avatar */}
                        <div className="phone-card">
                            <div className="phone-status-card">
                                <div className="phone-status-avatar">
                                    {userInitials}
                                    <span
                                        className="phone-status-avatar-dot"
                                        style={{ background: statusText.color }}
                                    />
                                </div>
                                <div className="phone-status-name">{userName}</div>
                                <div className="phone-status-line">
                                    <span className={`phone-status-dot ${phone.status}`} />
                                    {statusText.label}
                                </div>
                            </div>
                        </div>

                        {/* Tryb odbierania */}
                        <div className="phone-card">
                            <div className="phone-card-head">
                                <span className="phone-card-title">
                                    <IconSmartphone size={16} /> Tryb odbierania
                                    <Tooltip text="Decyduje gdzie trafią połączenia przychodzące. Pamiętaj o przełączeniu z powrotem na 'Przeglądarka' gdy wrócisz do biurka." />
                                </span>
                            </div>
                            <div className="phone-card-body">
                                <div className="phone-mode">
                                    <button
                                        className={`phone-mode-row browser ${!forwardCalls ? "active" : ""}`}
                                        onClick={() => setMode(false)}
                                        disabled={forwardSaving}
                                    >
                                        <span className="phone-mode-icon"><IconLaptop size={20} /></span>
                                        <span className="phone-mode-text">
                                            <strong>Przeglądarka</strong>
                                            <span>Odbierasz tutaj, w komputerze</span>
                                        </span>
                                        {!forwardCalls && <span className="phone-mode-check"><IconCheck size={16} /></span>}
                                    </button>
                                    <button
                                        className={`phone-mode-row cell ${forwardCalls ? "active" : ""}`}
                                        onClick={() => setMode(true)}
                                        disabled={forwardSaving || !forwardNumber}
                                        title={!forwardNumber ? "Najpierw zapisz swój numer komórki poniżej" : ""}
                                    >
                                        <span className="phone-mode-icon"><IconSmartphone size={20} /></span>
                                        <span className="phone-mode-text">
                                            <strong>Komórka</strong>
                                            <span>
                                                {forwardNumber
                                                    ? `Połączenia trafią na ${forwardNumber}`
                                                    : "Wpisz najpierw swój numer poniżej"}
                                            </span>
                                        </span>
                                        {forwardCalls && <span className="phone-mode-check"><IconCheck size={16} /></span>}
                                    </button>
                                </div>

                                {/* Konfiguracja numeru komórki */}
                                <div className="phone-forward-config">
                                    <label className="phone-forward-label">
                                        <IconSmartphone size={14} /> Twój prywatny numer
                                        <Tooltip text="Numer Twojej komórki, na który Twilio przekieruje Twoje połączenia gdy włączysz tryb 'Komórka'. Nie wpływa na innych sprzedawców." />
                                    </label>
                                    <div className="phone-forward-row">
                                        <div className="phone-forward-input-wrap">
                                            <span className="phone-forward-prefix">+48</span>
                                            <input
                                                type="tel"
                                                inputMode="numeric"
                                                className="phone-forward-input"
                                                placeholder="600 100 200"
                                                value={forwardNumberInput}
                                                onChange={(e) => {
                                                    // Akceptuj tylko cyfry, spacje, myślniki
                                                    const v = e.target.value.replace(/[^\d\s-]/g, "");
                                                    setForwardNumberInput(v);
                                                    setForwardNumberError("");
                                                    setForwardNumberSaved(false);
                                                }}
                                                disabled={forwardNumberSaving}
                                                maxLength={13}
                                            />
                                        </div>
                                        <button
                                            className="phone-forward-save"
                                            onClick={saveForwardNumber}
                                            disabled={
                                                forwardNumberSaving ||
                                                !forwardNumberInput ||
                                                normalizeForwardNumber(forwardNumberInput) === forwardNumber
                                            }
                                        >
                                            {forwardNumberSaving ? "Zapis..." : forwardNumberSaved ? "Zapisano" : "Zapisz"}
                                        </button>
                                    </div>
                                    {forwardNumber && (
                                        <div className="phone-forward-current">
                                            Aktualny: <strong>{forwardNumber}</strong>
                                            <button
                                                type="button"
                                                className="phone-forward-clear"
                                                onClick={clearForwardNumber}
                                                title="Usuń numer i wyłącz przekierowanie"
                                            >
                                                Usuń
                                            </button>
                                        </div>
                                    )}
                                    {forwardNumberError && (
                                        <div className="phone-forward-error">
                                            <IconAlert size={12} /> {forwardNumberError}
                                        </div>
                                    )}
                                    {!forwardNumberError && forwardNumberSaved && (
                                        <div className="phone-forward-ok">
                                            <IconCheck size={12} /> Numer zapisany.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Audio */}
                        <AudioDevicePicker
                            device={phone.device}
                            micAllowed={phone.micAllowed}
                        />

                        {/* Skróty / pomoc */}
                        <div className="phone-card">
                            <div className="phone-card-head">
                                <span className="phone-card-title"><IconInfo size={16} /> Szybkie wskazówki</span>
                            </div>
                            <div className="phone-card-body" style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                                <div className="phone-tip">
                                    <IconPhone size={14} />
                                    <span>Kliknij <strong>numer w historii</strong>, aby oddzwonić jednym kliknięciem.</span>
                                </div>
                                <div className="phone-tip">
                                    <IconKeypad size={14} />
                                    <span>W trakcie rozmowy użyj <strong>klawiatury DTMF</strong> dla menu IVR (np. „wybierz 1...").</span>
                                </div>
                                <div className="phone-tip">
                                    <IconMicOff size={14} />
                                    <span><strong>Wycisz mikrofon</strong> gdy musisz coś skonsultować.</span>
                                </div>
                                <div style={{ marginTop: 10 }}>
                                    <button
                                        className="phone-btn phone-btn-ghost"
                                        onClick={() => setHelpOpen(true)}
                                        style={{ width: "100%", justifyContent: "center" }}
                                    >
                                        <IconBookOpen size={14} /> Otwórz pełny tutorial
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* PRAWA KOLUMNA – obszar roboczy */}
                    <main>
                        {/* TABS */}
                        <div className="phone-tabs">
                            <button
                                className={`phone-tab ${tab === "dialer" ? "active" : ""}`}
                                onClick={() => setTab("dialer")}
                            >
                                <IconPhone size={16} /> Dialer
                            </button>
                            <button
                                className={`phone-tab ${tab === "history" ? "active" : ""}`}
                                onClick={() => setTab("history")}
                            >
                                <IconHistory size={16} /> Historia
                            </button>
                            <button
                                className={`phone-tab ${tab === "sms" ? "active" : ""}`}
                                onClick={() => setTab("sms")}
                            >
                                <IconMessage size={16} /> SMS
                            </button>
                        </div>

                        {/* DIALER */}
                        {tab === "dialer" && (
                            <>
                                {/* Active call card */}
                                {phone.activeCall && (
                                    <div className={`phone-active-call ${phone.status === "ringing" ? "ringing" : ""}`}>
                                        <div className="phone-active-call-avatar">
                                            {activeContact
                                                ? activeContact.name.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()
                                                : (phone.activeCall.from || "?").replace(/\D/g, "").slice(-2) || "?"}
                                        </div>
                                        {activeContact && (
                                            <div className="phone-active-call-name">
                                                {activeContact.name}
                                                {activeContact.isClient && (
                                                    <span className="phone-badge-client">KLIENT</span>
                                                )}
                                            </div>
                                        )}
                                        <div className="phone-active-call-num">{phone.activeCall.from}</div>
                                        <div className="phone-active-call-label">
                                            {phone.status === "ringing"
                                                ? "Połączenie przychodzące — odbierz lub odrzuć poniżej"
                                                : phone.activeCall.direction === "outbound"
                                                    ? "Łączenie / w trakcie rozmowy"
                                                    : "Rozmowa w toku"}
                                        </div>
                                        {activeContact && (
                                            <Link
                                                to={activeContact.crmPath}
                                                className="phone-active-call-link"
                                            >
                                                <IconExternal size={14} /> Otwórz kartę {activeContact.isClient ? "klienta" : "leada"}
                                            </Link>
                                        )}
                                        {phone.status === "in-call" && phone.activeCall.startedAt && (
                                            <Timer startedAt={phone.activeCall.startedAt} />
                                        )}
                                    </div>
                                )}

                                {!phone.activeCall && (
                                    <div className="phone-card" style={{ padding: 24 }}>
                                        <Dialpad
                                            value={dialNumber}
                                            onChange={setDialNumber}
                                            onCall={startCall}
                                            disabled={callDisabled}
                                            callDisabled={callDisabled}
                                        />
                                        {callDisabled && (
                                            <div
                                                style={{
                                                    marginTop: 16, textAlign: "center",
                                                    fontSize: 12, color: "#94a3b8",
                                                }}
                                            >
                                                Telefon jest jeszcze offline – poczekaj, aż status zmieni się na <strong style={{ color: "#10b981" }}>Gotowy</strong>.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* HISTORY */}
                        {tab === "history" && (
                            <CallHistory agentId={agentId} onCall={startCall} />
                        )}

                        {/* SMS */}
                        {tab === "sms" && (
                            <SmsPanel ourNumber={OUR_NUMBER} />
                        )}
                    </main>
                </div>
            </div>

            {/* PhoneBar (aktywne / przychodzące połączenie) renderowany globalnie przez PhoneController w CrmLayout */}

            <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
        </div>
    );
}

function Timer({ startedAt }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const ms = now - startedAt;
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return <div className="phone-active-call-timer"><IconClock size={14} /> {mm}:{ss}</div>;
}
