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
            const toClean = String(to).trim();
            const bodyClean = String(body).trim();
            const message = await client.messages.create({
                to: toClean,
                from: cfg.phoneNumber,
                body: bodyClean,
            });

            // Zapisz do Firestore
            await db.collection("sms").doc(message.sid).set({
                messageSid: message.sid,
                from: cfg.phoneNumber,
                to: toClean,
                body: bodyClean,
                direction: "outbound",
                status: message.status,
                agentId: user.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Auto-log do contactHistory leada / klienta (jeśli rozpoznamy numer).
            // Dzięki temu agent NIE musi ręcznie dopisywać notatki – treść SMS-a
            // od razu trafia do historii kontaktu na karcie leada / klienta.
            try {
                const digits = toClean.replace(/\D/g, "").slice(-9);
                if (digits) {
                    const leadsSnap = await db.collection("leads").get();
                    const match = leadsSnap.docs.find((d) => {
                        const p = String(d.data().phone || "").replace(/\D/g, "").slice(-9);
                        return p && p === digits;
                    });
                    if (match) {
                        const agentName = user.name || user.email || "Agent";
                        await match.ref.update({
                            contactHistory: admin.firestore.FieldValue.arrayUnion({
                                date: new Date().toISOString(),
                                author: agentName,
                                result: "sms_wyslany",
                                notes: bodyClean,
                                source: "sms",
                                smsDirection: "outbound",
                                smsNumber: toClean,
                                smsBody: bodyClean,
                                smsSid: message.sid,
                            }),
                            lastContactDate: admin.firestore.FieldValue.serverTimestamp(),
                            lastContactResult: "sms_wyslany",
                        });
                    }
                }
            } catch (logErr) {
                console.warn("phone/sendSms autoLog error:", logErr.message);
            }

            return res.status(200).json({ sid: message.sid, status: message.status });
        } catch (err) {
            console.error("phone/sendSms error:", err);
            return res.status(500).json({ error: "Failed to send SMS", message: err.message });
        }
    });
