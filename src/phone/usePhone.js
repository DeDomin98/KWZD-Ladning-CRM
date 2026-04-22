// src/phone/usePhone.js
// Hook zarządzający Twilio Voice SDK Device + presence w Firestore.

import { useEffect, useRef, useState, useCallback } from "react";
import { Device } from "@twilio/voice-sdk";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// Bazowy URL funkcji Firebase – ten sam pattern co w lib/firebase.js
const FUNCTIONS_BASE = "https://us-central1-wyjscie-z-dlugow.cloudfunctions.net";

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
    const [activeCall, setActiveCall] = useState(null); // { from, startedAt }
    const [error, setError] = useState(null);
    const [identity, setIdentity] = useState(null);
    const [micAllowed, setMicAllowed] = useState(null); // null=nieznane, true=ok, false=brak
    const [device, setDevice] = useState(null); // Twilio Device (do AudioDevicePicker)

    const deviceRef = useRef(null);
    const incomingRef = useRef(null);
    const acceptedRef = useRef(null);

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
                    if (!cancelled) {
                        setError(e?.message || String(e));
                        setStatus("error");
                    }
                });
                device.on("incoming", (call) => {
                    incomingRef.current = call;
                    setActiveCall({
                        from: call.parameters?.From || "nieznany",
                        startedAt: null,
                    });
                    setStatus("ringing");

                    call.on("cancel", () => {
                        incomingRef.current = null;
                        setActiveCall(null);
                        setStatus("online");
                    });
                    call.on("disconnect", () => {
                        incomingRef.current = null;
                        acceptedRef.current = null;
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
        setActiveCall((prev) => ({
            from: prev?.from || call.parameters?.From || "nieznany",
            startedAt: Date.now(),
        }));
        setStatus("in-call");
    }, []);

    const reject = useCallback(() => {
        const call = incomingRef.current;
        if (!call) return;
        call.reject();
        incomingRef.current = null;
        setActiveCall(null);
        setStatus("online");
    }, []);

    const hangup = useCallback(() => {
        const call = acceptedRef.current || incomingRef.current;
        if (!call) return;
        try {
            call.disconnect();
        } catch (_) { /* noop */ }
        acceptedRef.current = null;
        incomingRef.current = null;
        setActiveCall(null);
        setStatus("online");
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
        const number = String(toNumber || "").trim();
        if (!number) return;
        try {
            const outgoing = await device.connect({ params: { To: number } });
            acceptedRef.current = outgoing;
            setActiveCall({ from: number, startedAt: Date.now() });
            setStatus("in-call");

            outgoing.on("disconnect", () => {
                acceptedRef.current = null;
                setActiveCall(null);
                setStatus("online");
            });
            outgoing.on("cancel", () => {
                acceptedRef.current = null;
                setActiveCall(null);
                setStatus("online");
            });
            outgoing.on("error", (e) => {
                console.error("outgoing call error:", e);
                setError(e?.message || String(e));
            });
        } catch (e) {
            console.error("call() error:", e);
            setError(e.message || String(e));
        }
    }, [micAllowed]);

    return { status, activeCall, error, identity, micAllowed, device, answer, reject, hangup, call };
}
