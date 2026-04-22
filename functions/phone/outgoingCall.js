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
        const toClean = String(to).trim();

        if (!toClean) {
            twiml.say(
                { language: "pl-PL", voice: "Polly.Ewa" },
                "Brak numeru docelowego."
            );
            res.set("Content-Type", "text/xml");
            return res.status(200).send(twiml.toString());
        }

        const dial = twiml.dial({
            callerId: cfg.phoneNumber,
            answerOnBridge: true,
            timeout: 30,
        });

        // Jeśli zaczyna się od + lub cyfry – traktujemy jako PSTN, w przeciwnym razie jako client SDK.
        if (/^[+0-9]/.test(toClean)) {
            dial.number(toClean);
        } else {
            dial.client(toClean);
        }

        res.set("Content-Type", "text/xml");
        return res.status(200).send(twiml.toString());
    });
