// src/phone/contacts.js
// Integracja modułu telefonicznego z bazą leadów / klientów.
// - normalizacja numerów (porównujemy po ostatnich 9 cyfrach – polskie numery)
// - hook useContactLookup() – mapa numer -> { id, name, status, dept, phone }
// - logCallToContact() / logSmsToContact() – dopisuje wpis do contactHistory leada

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Zostawia same cyfry i bierze ostatnie 9 (polski numer bez kierunkowego).
 * Dzięki temu "+48 600 100 200", "0048600100200", "600100200" -> "600100200".
 */
export function normalizePhone(num) {
    if (!num) return "";
    const digits = String(num).replace(/\D/g, "");
    return digits.slice(-9);
}

/** Mapuje serviceType na slug działu w URL CRM. */
function deptSlug(serviceType) {
    if (serviceType === "negocjacje") return "negocjacje";
    return "upadlosci";
}

/** Subskrybuje kolekcję leads i zwraca mapę normalizedPhone -> contact info. */
export function useContactLookup() {
    const [byPhone, setByPhone] = useState({});

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "leads"), (snap) => {
            const map = {};
            snap.docs.forEach((d) => {
                const data = d.data();
                const key = normalizePhone(data.phone);
                if (!key) return;
                const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim()
                    || data.full_name
                    || data.name
                    || data.phone;
                const isClient = data.status === "klient";
                const dept = deptSlug(data.serviceType);
                map[key] = {
                    id: d.id,
                    name: fullName,
                    phone: data.phone,
                    status: data.status,
                    isClient,
                    serviceType: data.serviceType || null,
                    department: dept,
                    assignedTo: data.assignedTo || null,
                    crmPath: `/crm/${dept}/${isClient ? "klienci" : "leady"}/${d.id}`,
                };
            });
            setByPhone(map);
        }, (err) => {
            console.warn("useContactLookup snapshot error:", err);
        });
        return () => unsub();
    }, []);

    /** Zwraca dane kontaktu dla numeru lub null. */
    const lookup = (number) => {
        const key = normalizePhone(number);
        if (!key) return null;
        return byPhone[key] || null;
    };

    return { lookup, byPhone };
}

/**
 * Dopisuje wpis o połączeniu do contactHistory leada / klienta.
 * @param {string} leadId
 * @param {object} entry { direction, number, durationSec, status, agentName }
 */
export async function logCallToContact(leadId, entry) {
    if (!leadId) return;
    try {
        const dir = entry.direction === "outbound" ? "wychodzące" : "przychodzące";
        const dur = entry.durationSec
            ? `${Math.floor(entry.durationSec / 60)} min ${entry.durationSec % 60}s`
            : null;
        const noteParts = [
            `Połączenie ${dir} (${entry.number})`,
            entry.status ? `status: ${entry.status}` : null,
            dur ? `czas: ${dur}` : null,
        ].filter(Boolean);

        await updateDoc(doc(db, "leads", leadId), {
            contactHistory: arrayUnion({
                date: new Date().toISOString(),
                author: entry.agentName || "Telefon",
                result: entry.result || (entry.direction === "outbound" ? "polaczenie_wychodzace" : "polaczenie_przychodzace"),
                notes: noteParts.join(" · "),
                source: "phone",
                callDirection: entry.direction,
                callDuration: entry.durationSec || 0,
                callNumber: entry.number,
            }),
            lastContactDate: new Date().toISOString(),
            lastContactResult: entry.result || "polaczenie",
        });
    } catch (err) {
        console.warn("logCallToContact failed:", err);
    }
}

/**
 * Dopisuje wpis o SMS-ie do contactHistory leada / klienta.
 * @param {string} leadId
 * @param {object} entry { direction, number, body, agentName }
 */
export async function logSmsToContact(leadId, entry) {
    if (!leadId) return;
    try {
        const dir = entry.direction === "outbound" ? "wysłany do" : "od";
        const preview = (entry.body || "").slice(0, 80);
        await updateDoc(doc(db, "leads", leadId), {
            contactHistory: arrayUnion({
                date: new Date().toISOString(),
                author: entry.agentName || "SMS",
                result: entry.direction === "outbound" ? "sms_wyslany" : "sms_otrzymany",
                notes: `SMS ${dir} ${entry.number}: "${preview}${(entry.body || "").length > 80 ? "..." : ""}"`,
                source: "sms",
                smsDirection: entry.direction,
                smsNumber: entry.number,
                smsBody: entry.body,
            }),
            lastContactDate: new Date().toISOString(),
            lastContactResult: entry.direction === "outbound" ? "sms_wyslany" : "sms_otrzymany",
            ...(entry.direction === "outbound" ? { smsCount: (entry.prevCount || 0) + 1 } : {}),
        });
    } catch (err) {
        console.warn("logSmsToContact failed:", err);
    }
}
