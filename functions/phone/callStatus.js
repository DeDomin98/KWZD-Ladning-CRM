// functions/phone/callStatus.js
// HTTP POST – publiczny webhook Twilio z aktualizacjami statusu połączenia.
// Zapisuje / aktualizuje dokument calls/{CallSid}.

const functions = require("firebase-functions/v1");
const { REGION, db, admin, applyCors } = require("./config");

exports.callStatus = functions
    .region(REGION)
    .runWith({ memory: "256MB", timeoutSeconds: 30 })
    .https.onRequest(async (req, res) => {
        if (applyCors(req, res)) return;

        if (req.method !== "POST") {
            return res.status(405).send("Method not allowed");
        }

        const body = req.body || {};
        const callSid = body.CallSid;

        if (!callSid) {
            return res.status(400).send("Missing CallSid");
        }

        try {
            const status = body.CallStatus || "unknown";
            const duration = body.CallDuration ? Number(body.CallDuration) : 0;

            // Próba wyłuskania agentId z 'To' (format client:agent_<uid>) lub z 'From'
            let agentId = "";
            const candidate = body.To || body.From || "";
            const m = String(candidate).match(/client:agent_([^,\s]+)/i);
            if (m) agentId = m[1];

            const ref = db.collection("calls").doc(callSid);
            const snap = await ref.get();

            const now = admin.firestore.FieldValue.serverTimestamp();

            const data = {
                from: body.From || null,
                to: body.To || null,
                status,
                duration,
                agentId: agentId || (snap.exists ? snap.data().agentId || "" : ""),
                updatedAt: now,
            };

            if (!snap.exists) {
                data.startedAt = now;
            }

            const endedStatuses = ["completed", "failed", "busy", "no-answer", "canceled"];
            if (endedStatuses.includes(status)) {
                data.endedAt = now;
            }

            await ref.set(data, { merge: true });

            return res.status(200).send("OK");
        } catch (err) {
            console.error("phone/callStatus error:", err);
            return res.status(500).send("Internal error");
        }
    });
