// src/phone/CallButton.jsx
// Reużywalny przycisk "Zadzwoń" do wstawienia w karty leada / klienta.
// Po kliknięciu emituje globalne zdarzenie 'crm:phone:call' – PhoneController
// pokazuje modal potwierdzenia i wykonuje połączenie.

import React from "react";
import { IconPhone } from "./Icons";
import { requestCallGlobal } from "./PhoneContext";
import "./phone.css";

// Lekka walidacja sensowności numeru po stronie front-endu, żeby nie marnować
// żądań do Twilio (gdzie kończą się błędem 13224 / 31005).
function looksDialable(input) {
    const trimmed = String(input || "").trim();
    if (!trimmed) return false;
    const hasPlus = trimmed.startsWith("+");
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) return false;
    if (/^0+$/.test(digits)) return false;
    if (/^(\d)\1{6,}$/.test(digits)) return false;
    // Domyślnie traktujemy jako PL gdy brak +
    if (!hasPlus && digits.length === 9 && /^[01]/.test(digits)) return false;
    if (digits.startsWith("48") && digits.length === 11) {
        const local = digits.slice(2);
        if (/^[01]/.test(local)) return false;
    }
    return true;
}

/**
 * @param {Object} props
 * @param {string} props.phone – numer telefonu
 * @param {string} [props.name] – nazwa kontaktu (do podglądu w modalu)
 * @param {"primary"|"ghost"|"icon"} [props.variant="primary"]
 * @param {string} [props.label] – tekst przycisku (default: "Zadzwoń")
 * @param {string} [props.title]
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 */
export default function CallButton({
    phone,
    name,
    variant = "primary",
    label = "Zadzwoń",
    title,
    className = "",
    disabled = false,
    size = 16,
}) {
    const noPhone = !phone || !String(phone).replace(/\D/g, "");
    const dialable = !noPhone && looksDialable(phone);
    const isDisabled = disabled || noPhone || !dialable;
    const reason = noPhone
        ? "Brak numeru"
        : !dialable
            ? "Numer wygląda na nieprawidłowy – sprawdź zapis w karcie kontaktu"
            : `Zadzwoń: ${phone}`;

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isDisabled) return;
        requestCallGlobal(phone, name);
    };

    if (variant === "icon") {
        return (
            <button
                type="button"
                onClick={handleClick}
                disabled={isDisabled}
                title={title || reason}
                aria-label={title || `Zadzwoń ${name || phone}`}
                className={`phone-call-btn-icon ${className}`}
            >
                <IconPhone size={size} />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            title={title || reason}
            className={`phone-call-btn ${variant} ${className}`}
        >
            <IconPhone size={size} />
            <span>{label}</span>
        </button>
    );
}
