// src/phone/Dialpad.jsx
// Klawiatura numeryczna 3x4 z wyświetlaczem numeru.
// Tryb pracy:
//  - "dial"  -> przycisk "Zadzwoń" wywołuje onCall(number)
//  - "dtmf"  -> klawisze wysyłają tony DTMF do trwającej rozmowy przez onDigit(d)

import React, { useEffect, useRef, useState } from "react";
import { IconBackspace, IconPhone } from "./Icons";

const KEYS = [
    ["1", ""],
    ["2", "ABC"],
    ["3", "DEF"],
    ["4", "GHI"],
    ["5", "JKL"],
    ["6", "MNO"],
    ["7", "PQRS"],
    ["8", "TUV"],
    ["9", "WXYZ"],
    ["*", ""],
    ["0", "+"],
    ["#", ""],
];

export default function Dialpad({
    mode = "dial",
    value = "",
    onChange,
    onCall,
    onDigit,
    disabled = false,
    callDisabled = false,
}) {
    const [internal, setInternal] = useState(value);
    const inputRef = useRef(null);

    useEffect(() => {
        setInternal(value);
    }, [value]);

    const setNumber = (n) => {
        setInternal(n);
        onChange?.(n);
    };

    const press = (digit) => {
        if (disabled) return;
        if (mode === "dtmf") {
            onDigit?.(digit);
            return;
        }
        // dial mode – append; specjalna obsługa "0" przytrzymane = "+"
        setNumber(internal + digit);
    };

    const handleLongZero = () => {
        if (mode === "dial" && !disabled) setNumber(internal + "+");
    };

    const backspace = () => {
        if (disabled || mode !== "dial") return;
        setNumber(internal.slice(0, -1));
    };

    const clear = () => {
        if (disabled || mode !== "dial") return;
        setNumber("");
    };

    const submit = (e) => {
        e?.preventDefault?.();
        if (disabled || callDisabled || !internal.trim()) return;
        onCall?.(internal.trim());
    };

    return (
        <div className="phone-dialpad">
            {mode === "dial" && (
                <form onSubmit={submit} className="phone-dialpad-display-wrap">
                    <input
                        ref={inputRef}
                        type="tel"
                        className="phone-dialpad-display"
                        value={internal}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="+48 ..."
                        autoComplete="off"
                        inputMode="tel"
                    />
                    {internal && (
                        <button
                            type="button"
                            className="phone-dialpad-back"
                            onClick={backspace}
                            onDoubleClick={clear}
                            title="Usuń ostatnią cyfrę (dwuklik = wyczyść)"
                            aria-label="Usuń ostatnią cyfrę"
                        >
                            <IconBackspace size={18} />
                        </button>
                    )}
                </form>
            )}

            <div className="phone-dialpad-grid">
                {KEYS.map(([num, sub]) => (
                    <button
                        key={num}
                        type="button"
                        className="phone-dialpad-key"
                        onClick={() => press(num)}
                        onContextMenu={(e) => {
                            if (num === "0") {
                                e.preventDefault();
                                handleLongZero();
                            }
                        }}
                        disabled={disabled}
                        aria-label={`Cyfra ${num}`}
                    >
                        <span className="phone-dialpad-num">{num}</span>
                        {sub && <span className="phone-dialpad-sub">{sub}</span>}
                    </button>
                ))}
            </div>

            {mode === "dial" && (
                <button
                    type="button"
                    className="phone-dialpad-call"
                    onClick={submit}
                    disabled={disabled || callDisabled || !internal.trim()}
                    title={
                        callDisabled
                            ? "Telefon nie jest jeszcze gotowy"
                            : "Zadzwoń pod wpisany numer"
                    }
                >
                    <span className="phone-dialpad-call-icon"><IconPhone size={20} /></span>
                    Zadzwoń
                </button>
            )}
        </div>
    );
}
