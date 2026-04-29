// functions/phone/outgoingCall.js
// HTTP POST – publiczny webhook TwiML App.
// Twilio woła tę funkcję, gdy agent (klient SDK) wybiera numer przez device.connect({ params: { To: ... } }).
// Zwraca TwiML <Dial><Number> z callerId = numer Twilio.

const functions = require("firebase-functions/v1");
const twilio = require("twilio");
const { REGION, TWILIO_SECRETS, getTwilioConfig, applyCors } = require("./config");

const VoiceResponse = twilio.twiml.VoiceResponse;

exports.outgoingCall = functions
    .region(REGION)
    .runWith({
        memory: "256MB",
        timeoutSeconds: 30,
        secrets: TWILIO_SECRETS,
    })
    .https.onRequest(async (req, res) => {
        if (applyCors(req, res)) return;

        const cfg = getTwilioConfig();
        const twiml = new VoiceResponse();

        // Parametr To może przyjść z body (POST) lub query – Twilio przekazuje params z device.connect().
        const to = (req.body && req.body.To) || (req.query && req.query.To) || "";
        const toRaw = String(to).trim();

        if (!toRaw) {
            twiml.say(
                { language: "pl-PL", voice: "Polly.Ewa" },
                "Brak numeru docelowego."
            );
            res.set("Content-Type", "text/xml");
            return res.status(200).send(twiml.toString());
        }

        // Normalizacja numeru do E.164 (domyślnie PL +48).
        // Twilio bez prawidłowego E.164 zwraca ConnectionError 31005 / Error 13224.
        // Identyfikator klienta SDK (np. "agent_xyz") zostawiamy bez zmian.
        function normalizeToE164(input) {
            const trimmed = input.trim();
            // klient SDK (litery / podkreślniki) – nie ruszamy
            if (!/^[+0-9\s().-]+$/.test(trimmed)) return { kind: "client", value: trimmed };
            // tylko cyfry + opcjonalny wiodący +
            const hasPlus = trimmed.startsWith("+");
            const digits = trimmed.replace(/\D/g, "");
            if (!digits) return { kind: "invalid", value: "" };
            if (hasPlus) return { kind: "pstn", value: "+" + digits };
            // Polskie warianty:
            if (digits.startsWith("00")) return { kind: "pstn", value: "+" + digits.slice(2) };
            if (digits.startsWith("48") && digits.length === 11) return { kind: "pstn", value: "+" + digits };
            if (digits.length === 9) return { kind: "pstn", value: "+48" + digits }; // typowy PL
            // fallback – dorzuć + i licz że to E.164 bez prefiksu
            return { kind: "pstn", value: "+" + digits };
        }

        // Walidacja sensowności numeru PSTN przed wysłaniem do Twilio.
        // Odsiewamy: wszystkie zera, powtórzenia, długości poza zakresem E.164 (8-15 cyfr po +),
        // oraz polskie numery zaczynające się od "0" / "1" (nie istnieją).
        function isPlausiblePstn(e164) {
            if (!/^\+\d{8,15}$/.test(e164)) return false;
            const digits = e164.slice(1);
            if (/^0+$/.test(digits)) return false;          // same zera
            if (/^(\d)\1{6,}$/.test(digits)) return false;  // np. 111111111
            // Dla numerów PL: po +48 musi być 9 cyfr i pierwsza cyfra ≠ 0/1
            if (digits.startsWith("48")) {
                const local = digits.slice(2);
                if (local.length !== 9) return false;
                if (/^[01]/.test(local)) return false;
            }
            return true;
        }

        const normalized = normalizeToE164(toRaw);
        console.log("outgoingCall normalize:", { raw: toRaw, ...normalized });

        if (normalized.kind === "invalid"
            || (normalized.kind === "pstn" && !isPlausiblePstn(normalized.value))) {
            console.warn("outgoingCall REJECT invalid number:", { raw: toRaw, normalized });
            twiml.say(
                { language: "pl-PL", voice: "Polly.Ewa" },
                "Numer nie jest prawidłowy. Sprawdź zapisany numer w karcie kontaktu."
            );
            res.set("Content-Type", "text/xml");
            return res.status(200).send(twiml.toString());
        }

        const dial = twiml.dial({
            callerId: cfg.phoneNumber,
            answerOnBridge: true,
            timeout: 30,
        });

        if (normalized.kind === "client") {
            dial.client(normalized.value);
        } else {
            dial.number(normalized.value);
        }

        res.set("Content-Type", "text/xml");
        return res.status(200).send(twiml.toString());
    });
