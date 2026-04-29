// src/phone/PhoneController.jsx
// Globalny widget telefoniczny montowany w CrmLayout.
// Pokazuje:
//  - PhoneBar (przychodzące + aktywne połączenie) – widoczny na każdej stronie CRM
//  - alert "Mikrofon zablokowany" jeśli brak uprawnień
//  - modal potwierdzenia click-to-call (bezpieczeństwo – użytkownik świadomie potwierdza)

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PhoneBar from "./PhoneBar";
import SmsThreadModal from "./SmsThreadModal";
import { usePhoneContext } from "./PhoneContext";
import { IconPhone, IconClose, IconMic, IconUser } from "./Icons";
import "./phone.css";

export default function PhoneController() {
    const phone = usePhoneContext();
    const {
        activeCall, status, micAllowed, error, lookup,
        answer, reject, hangup, sendDigit, toggleMute, muted,
        pendingCall, cancelPending, confirmPending,
    } = phone;

    const activeContact = activeCall ? lookup(activeCall.from) : null;

    // Globalny modal wątku SMS – otwierany przez window.dispatchEvent('crm:sms:open')
    const [smsThread, setSmsThread] = useState(null); // { number, name }
    // Lokalnie wyciszony banner błędu (żeby user mógł go schować ręcznie)
    const [dismissedError, setDismissedError] = useState(null);
    useEffect(() => {
        // Reset wyciszenia gdy pojawi się NOWY błąd (inna treść)
        if (error && error !== dismissedError) {
            // nic – kondycja w renderze sprawdzi
        }
        if (!error) setDismissedError(null);
    }, [error, dismissedError]);
    useEffect(() => {
        const handler = (ev) => {
            const { number, name } = ev.detail || {};
            if (!number) return;
            setSmsThread({ number, name });
        };
        window.addEventListener("crm:sms:open", handler);
        return () => window.removeEventListener("crm:sms:open", handler);
    }, []);

    return (
        <>
            {/* Stały pasek na dole – widoczny zawsze gdy jest aktywne / przychodzące połączenie */}
            <PhoneBar
                activeCall={activeCall}
                status={status}
                error={error}
                answer={answer}
                reject={reject}
                hangup={hangup}
                sendDigit={sendDigit}
                toggleMute={toggleMute}
                muted={muted}
                contact={activeContact}
            />

            {/* Alert mikrofonu – pływający, niewielki, tylko gdy zablokowany */}
            {micAllowed === false && status !== "in-call" && (
                <div className="phone-floating-alert danger" role="alert">
                    <IconMic size={16} />
                    <span>
                        Mikrofon zablokowany – odbiór połączeń niemożliwy.{" "}
                        <Link to="/crm/phone" className="phone-floating-link">Otwórz centralę</Link>
                    </span>
                </div>
            )}

            {/* Inny błąd centrali – dyskretny banner z możliwością zamknięcia */}
            {error && micAllowed !== false && status !== "in-call" && !dismissedError && error !== dismissedError && (
                <div className="phone-floating-alert warn" role="status">
                    <span>Telefon: {error}</span>
                    <button
                        type="button"
                        onClick={() => setDismissedError(error)}
                        className="phone-floating-link"
                        aria-label="Zamknij"
                        style={{ background: "none", border: 0, cursor: "pointer", padding: "0 4px", marginLeft: 6 }}
                        title="Ukryj"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Modal potwierdzenia click-to-call */}
            {pendingCall && (() => {
                // Blokuj potwierdzenie tylko gdy faktycznie nie można dzwonić:
                // - trwa inne połączenie
                // - dzwoni przychodzące (trzeba odebrać/odrzucić)
                // - mikrofon zablokowany
                // Status "error" nie powinien blokować – błędy per-call są transientne.
                const blocked = status === "in-call" || status === "ringing" || micAllowed === false;
                return (
                <div className="phone-confirm-overlay" onClick={cancelPending}>
                    <div
                        className="phone-confirm-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="phone-confirm-head">
                            <div className="phone-confirm-icon"><IconPhone size={22} /></div>
                            <div>
                                <h3 className="phone-confirm-title">Wykonać połączenie?</h3>
                                <p className="phone-confirm-sub">Potwierdź, aby zadzwonić</p>
                            </div>
                            <button
                                type="button"
                                className="phone-confirm-x"
                                onClick={cancelPending}
                                aria-label="Anuluj"
                            >
                                <IconClose size={16} />
                            </button>
                        </div>

                        <div className="phone-confirm-body">
                            <div className="phone-confirm-contact">
                                <div className="phone-confirm-avatar">
                                    <IconUser size={18} />
                                </div>
                                <div className="phone-confirm-info">
                                    <div className="phone-confirm-name">
                                        {pendingCall.name}
                                        {pendingCall.contact?.isClient && (
                                            <span className="phone-badge-client sm">KLIENT</span>
                                        )}
                                    </div>
                                    <div className="phone-confirm-number">{pendingCall.number}</div>
                                </div>
                            </div>

                            {blocked && (
                                <div className="phone-confirm-warn">
                                    {status === "in-call"
                                        ? "Trwa już inne połączenie – zakończ je najpierw."
                                        : status === "ringing"
                                            ? "Masz połączenie przychodzące – obsłuż je najpierw."
                                            : "Brak dostępu do mikrofonu – zezwól w przeglądarce."}
                                </div>
                            )}
                            {!blocked && status !== "online" && (
                                <div className="phone-confirm-warn" style={{ background: "#fef9c3", color: "#854d0e", borderColor: "#fde68a" }}>
                                    Centrala telefoniczna jeszcze się łączy lub zgłosiła błąd. Możesz spróbować zadzwonić – system ponów próbę.
                                </div>
                            )}
                        </div>

                        <div className="phone-confirm-actions">
                            <button
                                type="button"
                                className="phone-btn phone-btn-ghost"
                                onClick={cancelPending}
                            >
                                Anuluj
                            </button>
                            <button
                                type="button"
                                className="phone-btn phone-btn-primary"
                                onClick={confirmPending}
                                disabled={blocked}
                            >
                                <IconPhone size={16} /> Zadzwoń teraz
                            </button>
                        </div>
                    </div>
                </div>
                );
            })()}

            {smsThread && (
                <SmsThreadModal
                    number={smsThread.number}
                    name={smsThread.name}
                    onClose={() => setSmsThread(null)}
                />
            )}
        </>
    );
}
