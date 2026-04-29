// src/phone/SmsButton.jsx
// Reużywalny przycisk "SMS" do wstawienia w karty leada / klienta.
// Po kliknięciu emituje globalne zdarzenie 'crm:sms:open' – PhoneController
// otwiera modal z wątkiem SMS z tym numerem (Messenger-style).

import React from "react";
import { IconMessage } from "./Icons";
import "./phone.css";

export function openSmsThreadGlobal(number, name) {
    window.dispatchEvent(new CustomEvent("crm:sms:open", { detail: { number, name } }));
}

/**
 * @param {Object} props
 * @param {string} props.phone – numer telefonu
 * @param {string} [props.name] – nazwa kontaktu (do nagłówka)
 * @param {"primary"|"ghost"|"icon"} [props.variant="ghost"]
 * @param {string} [props.label]
 * @param {string} [props.title]
 * @param {string} [props.className]
 * @param {boolean} [props.disabled]
 */
export default function SmsButton({
    phone,
    name,
    variant = "ghost",
    label = "SMS",
    title,
    className = "",
    disabled = false,
    size = 16,
}) {
    const noPhone = !phone || !String(phone).replace(/\D/g, "");
    const isDisabled = disabled || noPhone;

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isDisabled) return;
        openSmsThreadGlobal(phone, name);
    };

    if (variant === "icon") {
        return (
            <button
                type="button"
                onClick={handleClick}
                disabled={isDisabled}
                title={title || (noPhone ? "Brak numeru" : `Napisz SMS: ${phone}`)}
                aria-label={title || `Napisz SMS ${name || phone}`}
                className={`phone-call-btn-icon ${className}`}
            >
                <IconMessage size={size} />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            title={title || (noPhone ? "Brak numeru" : `Napisz SMS: ${phone}`)}
            className={`phone-call-btn ${variant} ${className}`}
        >
            <IconMessage size={size} />
            <span>{label}</span>
        </button>
    );
}
