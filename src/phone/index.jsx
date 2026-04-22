// src/phone/index.jsx
// Strona testowa modułu telefonicznego. Route: /phone

import React, { useEffect, useState } from "react";
import { usePhone } from "./usePhone";
import PhoneBar from "./PhoneBar";
import CallHistory from "./CallHistory";
import SmsPanel from "./SmsPanel";
import AudioDevicePicker from "./AudioDevicePicker";
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import "./phone.css";

const OUR_NUMBER = "+48732071624"; // numer Twilio

export default function PhonePage() {
    const phone = usePhone();
    const agentId = auth.currentUser?.uid || null;
    const [dialNumber, setDialNumber] = useState("");
    const [tab, setTab] = useState("calls"); // "calls" | "sms"

    // Tryb odbierania: false = przeglądarka (domyślnie), true = przekieruj na komórkę
    const [forwardCalls, setForwardCalls] = useState(false);
    const [forwardSaving, setForwardSaving] = useState(false);

    // Synchronizuj stan togla z Firestore
    useEffect(() => {
        if (!agentId) return;
        const unsub = onSnapshot(doc(db, "agents", agentId), (snap) => {
            if (snap.exists()) {
                setForwardCalls(snap.data().forwardCalls === true);
            }
        });
        return () => unsub();
    }, [agentId]);

    const toggleForward = async () => {
        if (!agentId || forwardSaving) return;
        setForwardSaving(true);
        try {
            await setDoc(
                doc(db, "agents", agentId),
                { forwardCalls: !forwardCalls, lastSeen: serverTimestamp() },
                { merge: true }
            );
        } finally {
            setForwardSaving(false);
        }
    };

    const handleCall = (e) => {
        e.preventDefault();
        if (!dialNumber.trim()) return;
        phone.call(dialNumber.trim());
    };

    return (
        <div className="phone-module min-h-screen bg-slate-50 pb-32">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Phone – test</h1>
                        <p className="text-sm text-slate-500">
                            Moduł testowy bramki telefonicznej Twilio
                        </p>
                    </div>
                    <div className="text-right text-sm">
                        <div className="text-slate-500">Identity</div>
                        <div className="font-mono font-semibold text-slate-700">
                            {phone.identity || "—"}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Tryb odbierania połączeń */}
                <div className="bg-white rounded-lg p-4 mb-4 flex items-center justify-between shadow-sm">
                    <div>
                        <div className="font-semibold text-slate-800 text-sm">Tryb odbierania połączeń</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            {forwardCalls
                                ? "Przychodzące są przekierowywane na prywatny numer komórki"
                                : "Przychodzące trafiają do przeglądarki (SDK)"}
                        </div>
                    </div>
                    <button
                        onClick={toggleForward}
                        disabled={forwardSaving}
                        className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            forwardCalls ? "bg-amber-500" : "bg-emerald-500"
                        } disabled:opacity-60`}
                        style={{ width: "52px" }}
                        title={forwardCalls ? "Kliknij aby odbierać w przeglądarce" : "Kliknij aby przekierować na komórkę"}
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                forwardCalls ? "translate-x-6" : "translate-x-0"
                            }`}
                        />
                    </button>
                    <div className={`ml-3 text-sm font-semibold ${forwardCalls ? "text-amber-600" : "text-emerald-600"}`}>
                        {forwardCalls ? "Komórka" : "Przeglądarka"}
                    </div>
                </div>

                {/* Status + ostrzeżenie o mikrofonie */}
                <div className="bg-white rounded-lg p-4 mb-4 flex items-center gap-3 shadow-sm">
                    <span className={`phone-status-dot ${phone.status}`}></span>
                    <span className="font-semibold text-slate-700">Status: {phone.status}</span>
                    {phone.micAllowed === false && (
                        <span className="ml-auto text-red-600 text-sm font-medium">
                            ⚠️ Mikrofon zablokowany – kliknij ikonę kłódki w pasku adresu i zezwól na mikrofon, a następnie odśwież stronę.
                        </span>
                    )}
                    {phone.error && phone.micAllowed !== false && (
                        <span className="ml-auto text-red-600 text-sm">{phone.error}</span>
                    )}
                </div>

                {/* Wybór urządzeń audio */}
                <div className="mb-6">
                    <AudioDevicePicker device={phone.device} micAllowed={phone.micAllowed} />
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm w-fit">
                    <button
                        onClick={() => setTab("calls")}
                        className={`px-5 py-2 rounded-md font-semibold text-sm transition-colors ${tab === "calls" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                        Połączenia
                    </button>
                    <button
                        onClick={() => setTab("sms")}
                        className={`px-5 py-2 rounded-md font-semibold text-sm transition-colors ${tab === "sms" ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                        SMS
                    </button>
                </div>

                {tab === "calls" && (
                    <>
                        {/* Wybieranie numeru */}
                        <form onSubmit={handleCall} className="bg-white rounded-lg p-4 mb-6 shadow-sm flex items-center gap-3">
                            <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                                Zadzwoń:
                            </label>
                            <input
                                type="tel"
                                placeholder="+48..."
                                value={dialNumber}
                                onChange={(e) => setDialNumber(e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded font-mono text-sm focus:outline-none focus:border-emerald-400"
                                disabled={phone.status !== "online"}
                            />
                            <button
                                type="submit"
                                className="phone-btn phone-btn-answer"
                                disabled={phone.status !== "online" || !dialNumber.trim()}
                            >
                                Połącz
                            </button>
                        </form>

                        <CallHistory agentId={agentId} />
                    </>
                )}

                {tab === "sms" && (
                    <SmsPanel ourNumber={OUR_NUMBER} />
                )}
            </main>

            <PhoneBar
                status={phone.status}
                activeCall={phone.activeCall}
                error={phone.error}
                answer={phone.answer}
                reject={phone.reject}
                hangup={phone.hangup}
            />
        </div>
    );
}
