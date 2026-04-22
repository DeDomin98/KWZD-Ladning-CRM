// src/phone/AudioDevicePicker.jsx
// Komponent wyboru mikrofonu i głośnika dla Twilio Device.

import React, { useEffect, useState } from "react";

export default function AudioDevicePicker({ device, micAllowed }) {
    const [inputs, setInputs] = useState([]);
    const [outputs, setOutputs] = useState([]);
    const [selectedInput, setSelectedInput] = useState("");
    const [selectedOutput, setSelectedOutput] = useState("");
    const [error, setError] = useState(null);
    const [testingSpeaker, setTestingSpeaker] = useState(false);

    const refreshDevices = async () => {
        try {
            const list = await navigator.mediaDevices.enumerateDevices();
            setInputs(list.filter((d) => d.kind === "audioinput"));
            setOutputs(list.filter((d) => d.kind === "audiooutput"));
        } catch (e) {
            console.error("enumerateDevices error:", e);
        }
    };

    // Pierwsze załadowanie + reakcja na zmiany urządzeń (np. podpięcie słuchawek)
    useEffect(() => {
        if (!micAllowed) return;
        refreshDevices();
        const handler = () => refreshDevices();
        navigator.mediaDevices.addEventListener?.("devicechange", handler);
        return () => navigator.mediaDevices.removeEventListener?.("devicechange", handler);
    }, [micAllowed]);

    // Synchronizuj aktualny wybór z Twilio Device po jego stworzeniu
    useEffect(() => {
        if (!device) return;
        try {
            // audio.inputDevice() zwraca aktualnie wybrany input (lub null)
            const currentInput = device.audio?.inputDevice;
            if (currentInput?.deviceId) setSelectedInput(currentInput.deviceId);

            // speakerDevices to set – pierwszy element to aktualnie wybrane wyjście
            const currentOutputs = device.audio?.speakerDevices?.get?.();
            if (currentOutputs && currentOutputs.size > 0) {
                const first = Array.from(currentOutputs)[0];
                if (first?.deviceId) setSelectedOutput(first.deviceId);
            }
        } catch (_) { /* noop */ }
    }, [device]);

    const handleInputChange = async (e) => {
        const id = e.target.value;
        setSelectedInput(id);
        setError(null);
        if (!device?.audio) {
            setError("Twilio Device niegotowy");
            return;
        }
        try {
            await device.audio.setInputDevice(id);
        } catch (err) {
            console.error("setInputDevice error:", err);
            setError("Nie udało się zmienić mikrofonu: " + (err.message || String(err)));
        }
    };

    const handleOutputChange = async (e) => {
        const id = e.target.value;
        setSelectedOutput(id);
        setError(null);
        if (!device?.audio) {
            setError("Twilio Device niegotowy");
            return;
        }
        try {
            // speakerDevices.set([deviceId]) – ustawia urządzenie wyjściowe rozmowy
            await device.audio.speakerDevices.set([id]);
            // ringtoneDevices.set([deviceId]) – ustawia urządzenie dla dzwonka przychodzącego
            await device.audio.ringtoneDevices.set([id]);
        } catch (err) {
            console.error("setOutputDevice error:", err);
            setError("Nie udało się zmienić głośnika: " + (err.message || String(err)));
        }
    };

    const testSpeaker = async () => {
        if (!device?.audio || testingSpeaker) return;
        setTestingSpeaker(true);
        try {
            await device.audio.speakerDevices.test();
        } catch (err) {
            console.error("speaker test error:", err);
            setError("Test głośnika nieudany: " + (err.message || String(err)));
        } finally {
            setTimeout(() => setTestingSpeaker(false), 2000);
        }
    };

    if (micAllowed === false) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                Brak dostępu do mikrofonu – zezwól w przeglądarce, aby wybrać urządzenia audio.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 text-sm">Urządzenia audio</h3>
                <button
                    onClick={refreshDevices}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                    Odśwież listę
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Mikrofon (wejście)
                    </label>
                    <select
                        value={selectedInput}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-emerald-400"
                        disabled={!device}
                    >
                        <option value="">— domyślne —</option>
                        {inputs.map((d) => (
                            <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Mikrofon ${d.deviceId.slice(0, 8)}`}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Głośnik (wyjście)
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={selectedOutput}
                            onChange={handleOutputChange}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-emerald-400"
                            disabled={!device}
                        >
                            <option value="">— domyślne —</option>
                            {outputs.map((d) => (
                                <option key={d.deviceId} value={d.deviceId}>
                                    {d.label || `Głośnik ${d.deviceId.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={testSpeaker}
                            disabled={!device || testingSpeaker}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded disabled:opacity-50"
                            title="Odtwórz dźwięk testowy na wybranym głośniku"
                        >
                            {testingSpeaker ? "Gra..." : "Test"}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-2 text-xs text-red-600">{error}</div>
            )}

            {!device && (
                <div className="mt-2 text-xs text-slate-400">
                    Urządzenia będzie można zmienić po pełnym połączeniu (status: online).
                </div>
            )}
        </div>
    );
}
