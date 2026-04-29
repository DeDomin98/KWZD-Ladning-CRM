// src/phone/HelpModal.jsx
// Pełny tutorial / instrukcja modułu telefonicznego.
// Dostępny zawsze pod przyciskiem "?" w prawym górnym rogu.

import React, { useState } from "react";
import {
    IconPhone, IconHeadphones, IconKeypad, IconMic, IconMicOff,
    IconSmartphone, IconLaptop, IconHistory, IconMessage, IconClose,
    IconArrowLeft, IconArrowRight, IconBookOpen, IconCheck,
} from "./Icons";

const STEPS = [
    {
        title: "Witaj w centrali telefonicznej",
        body: (
            <>
                <p>
                    To miejsce, w którym <strong>odbierasz i wykonujesz połączenia</strong> oraz
                    prowadzisz <strong>SMS-y</strong> z klientami – wszystko w jednym oknie,
                    bez prywatnego telefonu.
                </p>
                <p className="phone-help-note">
                    W każdej chwili możesz wrócić do tego tutoriala klikając ikonę pomocy
                    w prawym górnym rogu nagłówka.
                </p>
            </>
        ),
    },
    {
        title: "1. Status (lewa kolumna, na górze)",
        body: (
            <>
                <p>Zielona kropka oznacza, że jesteś gotowy do rozmów. Stany:</p>
                <ul className="phone-help-list">
                    <li><span className="phone-status-dot online" /> <strong>Online</strong> – wszystko OK</li>
                    <li><span className="phone-status-dot ringing" /> <strong>Dzwoni</strong> – ktoś do Ciebie dzwoni</li>
                    <li><span className="phone-status-dot in-call" /> <strong>W rozmowie</strong> – właśnie rozmawiasz</li>
                    <li><span className="phone-status-dot offline" /> <strong>Offline</strong> – moduł się jeszcze łączy</li>
                    <li><span className="phone-status-dot error" /> <strong>Błąd</strong> – coś poszło nie tak (zazwyczaj mikrofon)</li>
                </ul>
            </>
        ),
    },
    {
        title: "2. Tryb odbierania połączeń",
        body: (
            <>
                <p>
                    Przełącznik decyduje gdzie trafią <strong>połączenia przychodzące</strong>:
                </p>
                <ul className="phone-help-list">
                    <li><IconLaptop size={14} /> <strong>Przeglądarka</strong> – odbierasz tu, w komputerze (zalecane w pracy).</li>
                    <li><IconSmartphone size={14} /> <strong>Komórka</strong> – wszystko leci na Twój prywatny numer (gdy wychodzisz, jesteś w terenie).</li>
                </ul>
                <p className="phone-help-note">
                    Pamiętaj o przełączeniu z powrotem gdy wracasz do biurka.
                </p>
            </>
        ),
    },
    {
        title: "3. Urządzenia audio",
        body: (
            <>
                <p>
                    Wybierz mikrofon i głośnik (np. słuchawki). Po podpięciu nowych
                    słuchawek kliknij <em>„Odśwież"</em>.
                </p>
                <p>
                    Przycisk <strong>„Test"</strong> odtworzy dźwięk – usłyszysz, czy słuchawki
                    działają, zanim zadzwonisz.
                </p>
            </>
        ),
    },
    {
        title: "4. Dialer – jak zadzwonić",
        body: (
            <>
                <p>
                    Wpisz numer w pole lub klikaj cyfry na klawiaturze, a następnie
                    naciśnij zielony przycisk <strong>„Zadzwoń"</strong>.
                </p>
                <ul className="phone-help-list">
                    <li><strong>+48</strong> – dla numerów polskich (lub od razu zaczynaj od „+")</li>
                    <li><strong>Backspace</strong> – usuwa ostatnią cyfrę, dwuklik czyści całość</li>
                    <li>Przytrzymaj <strong>0</strong> (prawy przycisk myszy) aby wpisać <strong>+</strong></li>
                </ul>
                <p className="phone-help-note">
                    Jeżeli numer jest zapisany u klienta, w karcie połączenia od razu zobaczysz
                    jego imię i nazwisko, a połączenie zostanie zapisane w jego historii kontaktów.
                </p>
            </>
        ),
    },
    {
        title: "5. Połączenie przychodzące",
        body: (
            <>
                <p>
                    Gdy ktoś dzwoni: na dole ekranu pojawia się <strong>pasek z numerem</strong>
                    (i nazwiskiem klienta jeśli jest w bazie) oraz dwa przyciski:
                </p>
                <ul className="phone-help-list">
                    <li><span className="phone-help-pill ans">Odbierz</span> – łączy z dzwoniącym</li>
                    <li><span className="phone-help-pill rej">Odrzuć</span> – kończy bez odbierania</li>
                </ul>
                <p className="phone-help-note">
                    Jeśli ekran jest na innej karcie, usłyszysz dźwięk dzwonka. Przełącznik
                    „Komórka" wyłącza odbieranie tutaj.
                </p>
            </>
        ),
    },
    {
        title: "6. W trakcie rozmowy",
        body: (
            <>
                <p>Podczas rozmowy w pasku na dole masz:</p>
                <ul className="phone-help-list">
                    <li><strong>Licznik czasu</strong> rozmowy</li>
                    <li><IconMicOff size={14} /> <strong>Wycisz</strong> – klient Cię nie słyszy (np. konsultacja z kolegą)</li>
                    <li><IconKeypad size={14} /> <strong>Klawiatura DTMF</strong> – do tonów (IVR banków, „wybierz 1 aby...")</li>
                    <li><strong>Rozłącz</strong> – kończy połączenie</li>
                </ul>
            </>
        ),
    },
    {
        title: "7. Historia połączeń",
        body: (
            <>
                <p>
                    Lista wszystkich Twoich rozmów. Strzałka w lewo/dół = przychodzące,
                    strzałka w prawo/górę = wychodzące. Czerwone tło = nieodebrane.
                </p>
                <p>
                    Kliknięcie numeru w wierszu od razu zadzwoni do tej osoby.
                    Kliknięcie nazwiska otwiera kartę klienta lub leada.
                </p>
            </>
        ),
    },
    {
        title: "8. SMS-y",
        body: (
            <>
                <p>
                    Z lewej widzisz listę rozmów. Kliknij konwersację, by zobaczyć
                    historię i odpisać. Wysłane SMS-y są automatycznie zapisywane
                    w historii kontaktu klienta.
                </p>
                <p>
                    Aby napisać do nowej osoby – wpisz numer w polu <em>„Nowa rozmowa"</em>
                    i kliknij <strong>Nowa</strong>.
                </p>
                <p className="phone-help-note">
                    Pamiętaj: jeden SMS to maks. <strong>160 znaków</strong>. Dłuższy łamany jest
                    na kilka segmentów (każdy płatny).
                </p>
            </>
        ),
    },
    {
        title: "Gotowe",
        body: (
            <>
                <p>
                    To wszystko, czego potrzebujesz, aby zacząć. W razie problemów
                    (np. brak mikrofonu) – sprawdź czerwony pasek u góry, zawsze
                    powie co zrobić.
                </p>
                <p className="phone-help-note">
                    Jeśli coś nie działa, zgłoś do działu IT i podaj treść komunikatu
                    z pomarańczowej ramki.
                </p>
            </>
        ),
    },
];

export default function HelpModal({ open, onClose }) {
    const [step, setStep] = useState(0);

    if (!open) return null;

    const isLast = step === STEPS.length - 1;
    const current = STEPS[step];

    const close = () => {
        setStep(0);
        onClose?.();
    };

    return (
        <div className="phone-modal-backdrop" onClick={close}>
            <div className="phone-modal" onClick={(e) => e.stopPropagation()}>
                <div className="phone-modal-head">
                    <div className="phone-modal-title">
                        <IconBookOpen size={18} /> Jak korzystać z telefonu
                    </div>
                    <button className="phone-modal-x" onClick={close} aria-label="Zamknij">
                        <IconClose size={18} />
                    </button>
                </div>

                <div className="phone-modal-progress">
                    {STEPS.map((_, i) => (
                        <span
                            key={i}
                            className={`phone-modal-progress-dot ${i <= step ? "active" : ""}`}
                            onClick={() => setStep(i)}
                            role="button"
                            aria-label={`Krok ${i + 1}`}
                        />
                    ))}
                </div>

                <div className="phone-modal-body">
                    <h3 className="phone-modal-step-title">{current.title}</h3>
                    <div className="phone-modal-step-body">{current.body}</div>
                </div>

                <div className="phone-modal-foot">
                    <button
                        className="phone-btn phone-btn-ghost"
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                    >
                        <IconArrowLeft size={14} /> Wstecz
                    </button>
                    <span className="phone-modal-counter">
                        {step + 1} z {STEPS.length}
                    </span>
                    {isLast ? (
                        <button className="phone-btn phone-btn-primary" onClick={close}>
                            <IconCheck size={14} /> Zaczynamy
                        </button>
                    ) : (
                        <button
                            className="phone-btn phone-btn-primary"
                            onClick={() => setStep(step + 1)}
                        >
                            Dalej <IconArrowRight size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
