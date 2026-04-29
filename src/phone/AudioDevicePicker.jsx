// src/phone/AudioDevicePicker.jsx
// Wybór mikrofonu i głośnika dla Twilio Device + przycisk Test.

import React, { useEffect, useRef, useState } from "react";
import Tooltip from "./Tooltip";
import { IconHeadphones, IconMic, IconAlert, IconRefresh } from "./Icons";

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

    useEffect(() => {
        if (!micAllowed) return;
        refreshDevices();
        const handler = () => refreshDevices();
        navigator.mediaDevices.addEventListener?.("devicechange", handler);
        return () => navigator.mediaDevices.removeEventListener?.("devicechange", handler);
    }, [micAllowed]);

    useEffect(() => {
        if (!device) return;
        try {
            const currentInput = device.audio?.inputDevice;
            if (currentInput?.deviceId) setSelectedInput(currentInput.deviceId);

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
            setError("Telefon się jeszcze łączy – chwila");
            return;
        }
        try {
            if (!id) {
                await device.audio.unsetInputDevice?.();
            } else {
                await device.audio.setInputDevice(id);
            }
        } catch (err) {
            console.error("setInputDevice error:", err);
            setError("Nie udało się zmienić mikrofonu");
        }
    };

    const handleOutputChange = async (e) => {
        const id = e.target.value;
        setSelectedOutput(id);
        setError(null);
        if (!device?.audio) {
            setError("Telefon się jeszcze łączy – chwila");
            return;
        }
        try {
            if (!id) return;
            await device.audio.speakerDevices.set([id]);
            await device.audio.ringtoneDevices.set([id]);
        } catch (err) {
            console.error("setOutputDevice error:", err);
            setError("Nie udało się zmienić głośnika");
        }
    };

    const testSpeaker = async () => {
        if (!device?.audio || testingSpeaker) return;
        setTestingSpeaker(true);
        try {
            await device.audio.speakerDevices.test();
        } catch (err) {
            console.error("speaker test error:", err);
            setError("Test głośnika nieudany");
        } finally {
            setTimeout(() => setTestingSpeaker(false), 2000);
        }
    };

    // ============ TEST MIKROFONU (record + playback + live VU meter) ============
    const [micTestState, setMicTestState] = useState("idle"); // idle | recording | playing
    const [micLevel, setMicLevel] = useState(0); // 0..1
    const micStreamRef = useRef(null);
    const micCtxRef = useRef(null);
    const micRecorderRef = useRef(null);
    const micChunksRef = useRef([]);
    const micRafRef = useRef(null);
    const micAudioRef = useRef(null);

    const stopMicTest = () => {
        try { micRecorderRef.current?.state === "recording" && micRecorderRef.current.stop(); } catch (_) { /* noop */ }
        try { micStreamRef.current?.getTracks().forEach(t => t.stop()); } catch (_) { /* noop */ }
        try { micCtxRef.current?.close(); } catch (_) { /* noop */ }
        if (micRafRef.current) cancelAnimationFrame(micRafRef.current);
        micStreamRef.current = null;
        micCtxRef.current = null;
        micRecorderRef.current = null;
        micRafRef.current = null;
        setMicLevel(0);
    };

    useEffect(() => () => stopMicTest(), []);

    const startMicTest = async () => {
        if (micTestState !== "idle") {
            // Anuluj w trakcie
            stopMicTest();
            try { micAudioRef.current?.pause(); } catch (_) { /* noop */ }
            setMicTestState("idle");
            return;
        }
        setError(null);
        try {
            const constraints = selectedInput
                ? { audio: { deviceId: { exact: selectedInput } } }
                : { audio: true };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            micStreamRef.current = stream;

            // VU meter
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();
            micCtxRef.current = ctx;
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 1024;
            src.connect(analyser);
            const buf = new Uint8Array(analyser.fftSize);
            const tick = () => {
                analyser.getByteTimeDomainData(buf);
                let peak = 0;
                for (let i = 0; i < buf.length; i++) {
                    const v = Math.abs(buf[i] - 128) / 128;
                    if (v > peak) peak = v;
                }
                setMicLevel(peak);
                micRafRef.current = requestAnimationFrame(tick);
            };
            tick();

            // Recording
            micChunksRef.current = [];
            const rec = new MediaRecorder(stream);
            micRecorderRef.current = rec;
            rec.ondataavailable = (e) => { if (e.data.size > 0) micChunksRef.current.push(e.data); };
            rec.onstop = async () => {
                const blob = new Blob(micChunksRef.current, { type: rec.mimeType || "audio/webm" });
                stopMicTest();
                if (blob.size === 0) {
                    setMicTestState("idle");
                    return;
                }
                const url = URL.createObjectURL(blob);
                const audio = new Audio(url);
                micAudioRef.current = audio;
                // Spróbuj wymusić wybór głośnika (Chromium)
                if (selectedOutput && audio.setSinkId) {
                    try { await audio.setSinkId(selectedOutput); } catch (_) { /* noop */ }
                }
                setMicTestState("playing");
                audio.onended = () => {
                    URL.revokeObjectURL(url);
                    setMicTestState("idle");
                };
                try { await audio.play(); } catch (_) { setMicTestState("idle"); }
            };
            rec.start();
            setMicTestState("recording");
            // Auto-stop po 4s
            setTimeout(() => {
                if (micRecorderRef.current?.state === "recording") {
                    try { micRecorderRef.current.stop(); } catch (_) { /* noop */ }
                }
            }, 4000);
        } catch (err) {
            console.error("mic test error:", err);
            setError("Nie udało się uruchomić testu mikrofonu");
            stopMicTest();
            setMicTestState("idle");
        }
    };

    const micBtnLabel = micTestState === "recording"
        ? "Mów teraz... (stop)"
        : micTestState === "playing"
            ? "Odtwarzanie..."
            : "Test";

    if (micAllowed === false) {
        return (
            <div className="phone-alert danger">
                <span className="phone-alert-icon"><IconMic size={16} /></span>
                <span>
                    Brak dostępu do mikrofonu. Kliknij ikonę kłódki w pasku adresu i zezwól
                    na mikrofon, a następnie odśwież stronę.
                </span>
            </div>
        );
    }

    return (
        <div className="phone-card">
            <div className="phone-card-head">
                <span className="phone-card-title">
                    <IconHeadphones size={16} /> Urządzenia audio
                    <Tooltip text="Wybierz słuchawki/mikrofon. Po podpięciu nowych słuchawek kliknij 'Odśwież'." />
                </span>
                <button
                    onClick={refreshDevices}
                    className="phone-btn phone-btn-ghost"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                >
                    <IconRefresh size={12} /> Odśwież
                </button>
            </div>
            <div className="phone-card-body">
                <div className="phone-audio-grid">
                    <div className="phone-audio-field">
                        <label>Mikrofon</label>
                        <div className="phone-audio-row">
                            <select
                                value={selectedInput}
                                onChange={handleInputChange}
                                disabled={!device}
                            >
                                <option value="">— domyślne —</option>
                                {inputs.map((d) => (
                                    <option key={d.deviceId} value={d.deviceId}>
                                        {d.label || `Mikrofon ${d.deviceId.slice(0, 6)}`}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={startMicTest}
                                disabled={micAllowed === false}
                                className={`phone-audio-test ${micTestState !== "idle" ? "active" : ""}`}
                                title="Nagraj 4s i odtwórz – sprawdź czy się słyszysz"
                            >
                                {micBtnLabel}
                            </button>
                        </div>
                        {(micTestState !== "idle" || micLevel > 0) && (
                            <div className="phone-mic-meter" aria-hidden="true">
                                <div
                                    className="phone-mic-meter-bar"
                                    style={{ width: `${Math.min(100, Math.round(micLevel * 140))}%` }}
                                />
                            </div>
                        )}
                        {micTestState === "recording" && (
                            <div className="phone-mic-hint">Mów cokolwiek – nagram 4s i odtworzę.</div>
                        )}
                        {micTestState === "playing" && (
                            <div className="phone-mic-hint ok">Słyszysz się? Jeśli tak – mikrofon działa.</div>
                        )}
                    </div>

                    <div className="phone-audio-field">
                        <label>Głośnik / Słuchawki</label>
                        <div className="phone-audio-row">
                            <select
                                value={selectedOutput}
                                onChange={handleOutputChange}
                                disabled={!device}
                            >
                                <option value="">— domyślne —</option>
                                {outputs.map((d) => (
                                    <option key={d.deviceId} value={d.deviceId}>
                                        {d.label || `Głośnik ${d.deviceId.slice(0, 6)}`}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={testSpeaker}
                                disabled={!device || testingSpeaker}
                                className="phone-audio-test"
                                title="Odtwórz dźwięk testowy"
                            >
                                {testingSpeaker ? "Gra…" : "Test"}
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="phone-alert danger" style={{ marginTop: 10, marginBottom: 0 }}>
                        <span className="phone-alert-icon"><IconAlert size={14} /></span>
                        <span>{error}</span>
                    </div>
                )}

                {!device && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
                        Urządzenia będzie można wybrać gdy status zmieni się na <strong>Online</strong>.
                    </div>
                )}
            </div>
        </div>
    );
}
