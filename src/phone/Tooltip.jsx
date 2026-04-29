// src/phone/Tooltip.jsx
// Mały komponent tooltipa – ikona "?" z podpowiedzią po najechaniu.
// Używany do oznaczania elementów UI tak, żeby sprzedawca od razu wiedział co robi dany przycisk.

import React, { useState } from "react";

export default function Tooltip({ text, children, side = "top" }) {
    const [open, setOpen] = useState(false);

    return (
        <span
            className="phone-tooltip-wrap"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
        >
            {children || (
                <span className="phone-tooltip-icon" tabIndex={0} aria-label="Pomoc">
                    ?
                </span>
            )}
            {open && (
                <span className={`phone-tooltip-bubble phone-tooltip-${side}`}>
                    {text}
                </span>
            )}
        </span>
    );
}
