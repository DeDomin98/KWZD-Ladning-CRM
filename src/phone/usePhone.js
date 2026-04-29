// src/phone/usePhone.js
// Hook zarządzający Twilio Voice SDK Device + presence w Firestore.

import { useEffect, useRef, useState, useCallback } from "react";
import { Device } from "@twilio/voice-sdk";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
// Auto-logowanie połączeń do contactHistory robi backend (callStatus webhook).

// Bazowy URL funkcji Firebase – ten sam pattern co w lib/firebase.js
const FUNCTIONS_BASE = "https://us-central1-wyjscie-z-dlugow.cloudfunctions.net";

// Normalizacja numeru do E.164 (domyślnie PL +48). Defensywnie po stronie klienta
// żeby spójnie pokazywać numer w UI – ostateczna normalizacja i tak jest na backendzie.
export function normalizePhoneE164(input) {
    const trimmed = String(input || "").trim();
    if (!trimmed) return "";
    // identyfikator klienta SDK – nie ruszamy
    if (!/^[+0-9\s().-]+$/.test(trimmed)) return trimmed;
    const hasPlus = trimmed.startsWith("+");
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return "";
    if (hasPlus) return "+" + digits;
    if (digits.startsWith("00")) return "+" + digits.slice(2);
    if (digits.startsWith("48") && digits.length === 11) return "+" + digits;
    if (digits.length === 9) return "+48" + digits;
    return "+" + digits;
}

// Mapowanie kodów błędów Twilio Voice SDK na zrozumiałe dla użytkownika komunikaty.
// Pełna lista: https://www.twilio.com/docs/api/errors
function friendlyTwilioError(e) {
    const code = e?.code;
    const raw = e?.message || String(e || "");
    const map = {
        31000: "Chwilowy problem połączenia z centralą. Spróbuj ponownie.",
        31002: "Brak połączenia z centralą. Sprawdź internet.",
        31003: "Centrala nie odpowiada (timeout). Spróbuj ponownie.",
        31005: "Połączenie nie zostało nawiązane (brak sygnału operatora). Sprawdź numer i spróbuj ponownie.",
        31006: "Centrala odrzuciła połączenie. Spróbuj za chwilę.",
        31009: "Brak połączenia z serwerem głosowym Twilio.",
        31201: "Błąd audio – sprawdź mikrofon i uprawnienia przeglądarki.",
        31204: "Sesja telefonu wygasła. Odśwież stronę.",
        31205: "Token uwierzytelniający wygasł. Odśwież stronę.",
        53405: "Połączenie zostało przerwane przez sieć.",
    };
    if (map[code]) return `${map[code]} (kod ${code})`;
    if (code) return `Połączenie nieudane (${code}): ${raw}`;
    return raw;
}

async function fetchToken(agentId) {
    const user = auth.currentUser;
    if (!user) throw new Error("Brak zalogowanego użytkownika");
    const idToken = await user.getIdToken();

    const url = `${FUNCTIONS_BASE}/generateToken?agentId=${encodeURIComponent(agentId)}`;
    const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`generateToken ${res.status}: ${txt}`);
    }
    return res.json();
}

/**
 * Prosi przeglądarkę o dostęp do mikrofonu.
 * Zwraca true jeśli OK, false jeśli odmowa.
 */
async function requestMicPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Natychmiast zwalniamy track – Device sam zarządza mikrofonem
        stream.getTracks().forEach((t) => t.stop());
        return true;
    } catch (err) {
        console.warn("Microphone permission denied:", err);
        return false;
    }
}

export function usePhone() {
    const [status, setStatus] = useState("offline"); // offline | online | ringing | in-call | error
    const [activeCall, setActiveCall] = useState(null); // { from, startedAt, direction }
    const [error, setError] = useState(null);
    const [identity, setIdentity] = useState(null);
    const [micAllowed, setMicAllowed] = useState(null); // null=nieznane, true=ok, false=brak
    const [device, setDevice] = useState(null); // Twilio Device (do AudioDevicePicker)
    const [muted, setMuted] = useState(false);

    const deviceRef = useRef(null);
    const incomingRef = useRef(null);
    const acceptedRef = useRef(null);
    const errorTimerRef = useRef(null);
    // Aktualnie aktywny call – do logowania w contactHistory po rozłączeniu.
    // Trzymamy poza state, żeby nie wywoływać re-renderów.
    const callMetaRef = useRef(null); // { number, direction, startedAt, contactId, contactName, agentName }

    // Auto-czyszczenie błędu po 8 sekundach – żeby pasek na dole nie świecił się w nieskończoność.
    const setErrorAuto = useCallback((msg) => {
        if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
        }
        setError(msg);
        if (msg) {
            errorTimerRef.current = setTimeout(() => {
                setError(null);
                errorTimerRef.current = null;
            }, 8000);
        }
    }, []);

    const logEndedCall = useCallback(() => {
        // Auto-logowanie do contactHistory robi backend (functions/phone/callStatus.js)
        // na podstawie webhooka Twilio. Tutaj tylko czyścimy meta, żeby UI wiedział,
        // że aktywne połączenie się skończyło.
        callMetaRef.current = null;
    }, []);

    const setCallMeta = useCallback((meta) => {
        callMetaRef.current = meta;
    }, []);

    // Sprawdź uprawnienie mikrofonu przy mount
    useEffect(() => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setMicAllowed(false);
            return;
        }
        navigator.permissions?.query({ name: "microphone" }).then((result) => {
            if (result.state === "granted") setMicAllowed(true);
            else if (result.state === "denied") setMicAllowed(false);
            result.onchange = () => {
                setMicAllowed(result.state === "granted");
            };
        }).catch(() => { /* przeglądarka nie wspiera Permissions API */ });
    }, []);

    // Inicjalizacja Device + presence
    useEffect(() => {
        let cancelled = false;
        let unsubAuth = null;
        let agentDocRef = null;

        async function init(user) {
            if (!user) {
                setStatus("offline");
                return;
            }
            try {
                const agentId = user.uid;
                agentDocRef = doc(db, "agents", agentId);

                // Presence: online
                await setDoc(
                    agentDocRef,
                    {
                        name: user.displayName || user.email || agentId,
                        online: true,
                        lastSeen: serverTimestamp(),
                    },
                    { merge: true }
                );

                // Upewnij się że mikrofon jest dostępny PRZED stworzeniem Device
                const micOk = await requestMicPermission();
                if (!cancelled) setMicAllowed(micOk);
                if (!micOk) {
                    setError("Brak dostępu do mikrofonu – zezwól w przeglądarce (ikona kłódki w pasku adresu)");
                    setStatus("error");
                    return;
                }

                const { token, identity: id } = await fetchToken(agentId);
                if (cancelled) return;
                setIdentity(id);

                const device = new Device(token, {
                    codecPreferences: ["opus", "pcmu"],
                    logLevel: "warn",
                    // Wymuszamy audio wejście/wyjście przez SDK
                    allowIncomingWhileBusy: false,
                });

                device.on("registered", () => {
                    if (!cancelled) setStatus("online");
                });
                device.on("error", (e) => {
                    console.error("Twilio Device error:", e);
                    if (cancelled) return;
                    const msg = friendlyTwilioError(e);
                    setErrorAuto(msg);
                    // Tylko fatalne błędy (np. brak rejestracji / autoryzacji) zmieniają status na "error".
                    // Per-call errors typu 31000 / 31005 (general / gateway HANGUP) NIE mogą zatruwać
                    // statusu Device, bo wtedy modal potwierdzenia ma disabled przycisk na stałe.
                    const code = e?.code;
                    const fatal = code === 20101 || code === 20104 || code === 31204 || code === 31205
                        || /token/i.test(e?.message || "") || /unregister/i.test(e?.message || "");
                    if (fatal) {
                        setStatus("error");
                    }
                });
                device.on("incoming", (call) => {
                    incomingRef.current = call;
                    const fromNum = call.parameters?.From || "nieznany";
                    setActiveCall({
                        from: fromNum,
                        startedAt: null,
                        direction: "inbound",
                    });
                    setStatus("ringing");

                    call.on("cancel", () => {
                        incomingRef.current = null;
                        // jeśli rozmowa nie została odebrana – logujemy jako nieodebrane
                        if (callMetaRef.current && !callMetaRef.current.startedAt) {
                            logEndedCall("nieodebrane");
                        }
                        setActiveCall(null);
                        setStatus("online");
                    });
                    call.on("disconnect", () => {
                        incomingRef.current = null;
                        acceptedRef.current = null;
                        logEndedCall("zakonczone");
                        setActiveCall(null);
                        setStatus("online");
                    });
                });
                device.on("tokenWillExpire", async () => {
                    try {
                        const refreshed = await fetchToken(agentId);
                        device.updateToken(refreshed.token);
                    } catch (e) {
                        console.error("Token refresh failed:", e);
                    }
                });

                await device.register();
                deviceRef.current = device;
                if (!cancelled) setDevice(device);
            } catch (e) {
                console.error("usePhone init error:", e);
                if (!cancelled) {
                    setError(e.message || String(e));
                    setStatus("error");
                }
            }
        }

        unsubAuth = auth.onAuthStateChanged((user) => {
            init(user);
        });

        const handleUnload = () => {
            if (agentDocRef) {
                setDoc(agentDocRef, { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => { });
            }
        };
        window.addEventListener("beforeunload", handleUnload);

        return () => {
            cancelled = true;
            window.removeEventListener("beforeunload", handleUnload);
            if (unsubAuth) unsubAuth();
            if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current);
                errorTimerRef.current = null;
            }
            try {
                if (deviceRef.current) {
                    deviceRef.current.destroy();
                    deviceRef.current = null;
                    setDevice(null);
                }
            } catch (_) { /* noop */ }
            if (agentDocRef) {
                setDoc(agentDocRef, { online: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => { });
            }
        };
    }, []);

    const answer = useCallback(() => {
        const call = incomingRef.current;
        if (!call) return;
        call.accept();
        acceptedRef.current = call;
        const fromNum = call.parameters?.From || "nieznany";
        setActiveCall((prev) => ({
            from: prev?.from || fromNum,
            startedAt: Date.now(),
            direction: "inbound",
        }));
        // ustaw startedAt w meta (kontakt powinien być wcześniej dopisany przez stronę)
        if (callMetaRef.current) {
            callMetaRef.current.startedAt = Date.now();
        }
        setMuted(false);
        setStatus("in-call");
    }, []);

    const reject = useCallback(() => {
        const call = incomingRef.current;
        if (!call) return;
        call.reject();
        incomingRef.current = null;
        logEndedCall("odrzucone");
        setActiveCall(null);
        setStatus("online");
    }, [logEndedCall]);

    const hangup = useCallback(() => {
        const call = acceptedRef.current || incomingRef.current;
        if (!call) return;
        try {
            call.disconnect();
        } catch (_) { /* noop */ }
        acceptedRef.current = null;
        incomingRef.current = null;
        setActiveCall(null);
        setMuted(false);
        setStatus("online");
    }, []);

    const toggleMute = useCallback(() => {
        const call = acceptedRef.current;
        if (!call) return;
        try {
            const next = !muted;
            call.mute(next);
            setMuted(next);
        } catch (e) {
            console.warn("toggleMute error:", e);
        }
    }, [muted]);

    const sendDigit = useCallback((digit) => {
        const call = acceptedRef.current;
        if (!call) return;
        try {
            call.sendDigits(String(digit));
        } catch (e) {
            console.warn("sendDigit error:", e);
        }
    }, []);

    const call = useCallback(async (toNumber) => {
        const device = deviceRef.current;
        if (!device) {
            setError("Device nie jest gotowy");
            return;
        }
        if (!micAllowed) {
            setError("Brak dostępu do mikrofonu – zezwól w przeglądarce");
            return;
        }
        const number = normalizePhoneE164(toNumber);
        if (!number) return;
        // Wyczyść poprzedni błąd przed nową próbą – żeby UI nie pokazywał starych komunikatów.
        if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
        }
        setError(null);
        try {
            const outgoing = await device.connect({ params: { To: number } });
            acceptedRef.current = outgoing;
            setActiveCall({ from: number, startedAt: Date.now(), direction: "outbound" });
            // start timera w meta jeśli już ustawione przez stronę
            if (callMetaRef.current) {
                callMetaRef.current.startedAt = Date.now();
                callMetaRef.current.number = number;
            }
            setMuted(false);
            setStatus("in-call");

            const resetAfterCall = () => {
                acceptedRef.current = null;
                setActiveCall(null);
                setStatus("online");
            };

            outgoing.on("disconnect", () => {
                logEndedCall("zakonczone");
                resetAfterCall();
            });
            outgoing.on("cancel", () => {
                logEndedCall("anulowane");
                resetAfterCall();
            });
            outgoing.on("error", (e) => {
                console.error("outgoing call error:", e);
                // 31000/31005 i podobne błędy – informujemy użytkownika ale
                // przywracamy stan online, żeby mógł ponowić próbę.
                setErrorAuto(friendlyTwilioError(e));
                logEndedCall("blad");
                resetAfterCall();
            });
        } catch (e) {
            console.error("call() error:", e);
            setErrorAuto(friendlyTwilioError(e));
            // Wycofaj stan żeby modal/przycisk znów był dostępny
            acceptedRef.current = null;
            setActiveCall(null);
            setStatus("online");
        }
    }, [micAllowed, logEndedCall, setErrorAuto]);

    return {
        status, activeCall, error, identity, micAllowed, device, muted,
        answer, reject, hangup, call, toggleMute, sendDigit, setCallMeta,
    };
}
