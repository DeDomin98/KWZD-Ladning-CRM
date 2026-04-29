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

            // Auto-log do contactHistory leada / klienta (jeśli rozpoznamy numer)
            try {
                const digits = from.replace(/\D/g, "").slice(-9);
                if (digits) {
                    const leadsSnap = await db.collection("leads").get();
                    const match = leadsSnap.docs.find((d) => {
                        const p = String(d.data().phone || "").replace(/\D/g, "").slice(-9);
                        return p && p === digits;
                    });
                    if (match) {
                        await match.ref.update({
                            contactHistory: admin.firestore.FieldValue.arrayUnion({
                                date: new Date().toISOString(),
                                author: "System (SMS)",
                                result: "sms_otrzymany",
                                notes: text,
                                source: "sms",
                                smsDirection: "inbound",
                                smsNumber: from,
                                smsBody: text,
                                smsSid: messageSid,
                            }),
                            lastContactDate: admin.firestore.FieldValue.serverTimestamp(),
                            lastContactResult: "sms_otrzymany",
                        });
                    }
                }
            } catch (logErr) {
                console.warn("phone/incomingSms autoLog error:", logErr.message);
            }

            // Odpowiedź TwiML – pusta (brak auto-reply)
            res.set("Content-Type", "text/xml");
            return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        } catch (err) {
            console.error("phone/incomingSms error:", err);
            res.set("Content-Type", "text/xml");
            return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        }
    });
