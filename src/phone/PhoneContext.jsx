// src/phone/PhoneContext.jsx
// Globalny provider modułu telefonicznego dla CRM.
// - jedna instancja Twilio Device na cały CRM (uniknięcie konfliktów)
// - centralna kolejka żądań połączenia (z potwierdzeniem)
// - PhoneBar + modal potwierdzenia renderowane są przez PhoneController na każdej stronie

import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from "react";
import { usePhone } from "./usePhone";
import { useContactLookup } from "./contacts";
import { auth } from "../lib/firebase";

const PhoneContext = createContext(null);

export function PhoneProvider({ children }) {
    const phone = usePhone();
    const { lookup, byPhone } = useContactLookup();
    const user = auth.currentUser;
    const userName = user?.displayName || user?.email || "Agent";

    // Pending request: { number, name, contactId }
    const [pendingCall, setPendingCall] = useState(null);

    // Wykonaj połączenie (bez modala) – używane przez confirm i przez wewnętrzny dialer
    const callNow = useCallback((number, contact) => {
        const n = String(number || "").trim();
        if (!n) return;
        const c = contact || lookup(n);
        phone.setCallMeta?.({
            number: n,
            direction: "outbound",
            startedAt: null,
            contactId: c?.id || null,
            contactName: c?.name || null,
            agentName: userName,
        });
        phone.call(n);
    }, [phone, lookup, userName]);

    // Żądanie połączenia z potwierdzeniem (click-to-call z karty leada/klienta)
    const requestCall = useCallback((number, name) => {
        const n = String(number || "").trim();
        if (!n) return;
        const contact = lookup(n);
        setPendingCall({
            number: n,
            name: name || contact?.name || n,
            contact,
        });
    }, [lookup]);

    const cancelPending = useCallback(() => setPendingCall(null), []);

    const confirmPending = useCallback(() => {
        if (!pendingCall) return;
        callNow(pendingCall.number, pendingCall.contact);
        setPendingCall(null);
    }, [pendingCall, callNow]);

    // Auto-meta dla połączeń przychodzących (rozpoznawanie kontaktu)
    const incomingMetaRef = useRef(null);
    useEffect(() => {
        if (phone.activeCall?.direction === "inbound" && phone.status === "ringing") {
            const num = phone.activeCall.from;
            if (incomingMetaRef.current === num) return;
            incomingMetaRef.current = num;
            const contact = lookup(num);
            phone.setCallMeta?.({
                number: num,
                direction: "inbound",
                startedAt: null,
                contactId: contact?.id || null,
                contactName: contact?.name || null,
                agentName: userName,
            });
        }
        if (!phone.activeCall) {
            incomingMetaRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phone.activeCall?.from, phone.activeCall?.direction, phone.status]);

    // Globalny event bus – każdy komponent w CRM może zażądać połączenia bez importowania kontekstu
    useEffect(() => {
        const handler = (ev) => {
            const { number, name } = ev.detail || {};
            requestCall(number, name);
        };
        window.addEventListener("crm:phone:call", handler);
        return () => window.removeEventListener("crm:phone:call", handler);
    }, [requestCall]);

    const value = useMemo(() => ({
        ...phone,
        lookup,
        byPhone,
        userName,
        requestCall,
        callNow,
        pendingCall,
        cancelPending,
        confirmPending,
    }), [phone, lookup, byPhone, userName, requestCall, callNow, pendingCall, cancelPending, confirmPending]);

    return (
        <PhoneContext.Provider value={value}>
            {children}
        </PhoneContext.Provider>
    );
}

export function usePhoneContext() {
    const ctx = useContext(PhoneContext);
    if (!ctx) {
        throw new Error("usePhoneContext: brak <PhoneProvider> w drzewie. Owin CRM-em.");
    }
    return ctx;
}

/** Sprawdza czy PhoneProvider istnieje w drzewie (bez rzucania błędu). */
export function usePhoneContextOptional() {
    return useContext(PhoneContext);
}

/** Pomocniczy helper – emituje globalne żądanie połączenia. */
export function requestCallGlobal(number, name) {
    window.dispatchEvent(new CustomEvent("crm:phone:call", { detail: { number, name } }));
}
