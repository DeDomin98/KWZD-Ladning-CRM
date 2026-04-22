// functions/phone/incomingSms.js
// HTTP POST – publiczny webhook Twilio dla przychodzących SMS.
// Twilio woła tę funkcję gdy ktoś wyśle SMS na nasz numer.

const functions = require("firebase-functions/v1");
const { REGION, db, admin, applyCors } = require("./config");

exports.incomingSms = functions
    .region(REGION)
    .runWith({ memory: "256MB", timeoutSeconds: 30 })
    .https.onRequest(async (req, res) => {
        if (applyCors(req, res)) return;
        if (req.method !== "POST") return res.status(405).send("Method not allowed");

        const body = req.body || {};
        const messageSid = body.MessageSid || body.SmsSid;

        if (!messageSid) return res.status(400).send("Missing MessageSid");

        try {
            const from = String(body.From || "").trim();
            const to = String(body.To || "").trim();
            const text = String(body.Body || "").trim();

            await db.collection("sms").doc(messageSid).set({
                messageSid,
                from,
                to,
                body: text,
                direction: "inbound",
                status: "received",
                agentId: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            // Odpowiedź TwiML – pusta (brak auto-reply)
            res.set("Content-Type", "text/xml");
            return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        } catch (err) {
            console.error("phone/incomingSms error:", err);
            res.set("Content-Type", "text/xml");
            return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        }
    });
