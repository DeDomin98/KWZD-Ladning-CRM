// functions/phone/sendSms.js
// HTTP POST – wyślij SMS przez Twilio REST API. Wymaga Firebase Auth.
// Body: { to: "+48...", body: "treść" }

const functions = require("firebase-functions/v1");
const twilio = require("twilio");
const { REGION, TWILIO_SECRETS, getTwilioConfig, db, admin, applyCors, verifyAuth } = require("./config");

exports.sendSms = functions
    .region(REGION)
    .runWith({ memory: "256MB", timeoutSeconds: 30, secrets: TWILIO_SECRETS })
    .https.onRequest(async (req, res) => {
        if (applyCors(req, res)) return;
        if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

        const user = await verifyAuth(req, res);
        if (!user) return;

        const { to, body } = req.body || {};
        if (!to || !body) return res.status(400).json({ error: "Missing 'to' or 'body'" });

        // Podstawowa walidacja numeru telefonu – tylko cyfry, +, spacje, myślniki
        if (!/^\+?[\d\s\-()]{7,20}$/.test(String(to))) {
            return res.status(400).json({ error: "Invalid phone number format" });
        }

        const cfg = getTwilioConfig();
        if (!cfg.accountSid || !cfg.authToken || !cfg.phoneNumber) {
            return res.status(500).json({ error: "Twilio not configured" });
        }

        try {
            const client = twilio(cfg.accountSid, cfg.authToken);
            const message = await client.messages.create({
                to: String(to).trim(),
                from: cfg.phoneNumber,
                body: String(body).trim(),
            });

            // Zapisz do Firestore
            await db.collection("sms").doc(message.sid).set({
                messageSid: message.sid,
                from: cfg.phoneNumber,
                to: String(to).trim(),
                body: String(body).trim(),
                direction: "outbound",
                status: message.status,
                agentId: user.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.status(200).json({ sid: message.sid, status: message.status });
        } catch (err) {
            console.error("phone/sendSms error:", err);
            return res.status(500).json({ error: "Failed to send SMS", message: err.message });
        }
    });
