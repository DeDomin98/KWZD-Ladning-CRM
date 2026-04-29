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

            // Auto-log zakończonych połączeń do contactHistory leada/klienta
            if (endedStatuses.includes(status)) {
                try {
                    const fromStr = String(body.From || "");
                    const toStr = String(body.To || "");
                    const OUR = "732071624";
                    const fromDigits = fromStr.replace(/\D/g, "").slice(-9);
                    const toDigits = toStr.replace(/\D/g, "").slice(-9);
                    const isOutbound = fromDigits === OUR;
                    const otherDigits = isOutbound ? toDigits : fromDigits;
                    const otherDisplay = isOutbound ? toStr : fromStr;

                    if (otherDigits) {
                        const leadsSnap = await db.collection("leads").get();
                        const match = leadsSnap.docs.find((d) => {
                            const p = String(d.data().phone || "").replace(/\D/g, "").slice(-9);
                            return p && p === otherDigits;
                        });
                        if (match) {
                            const missed = !isOutbound && ["no-answer", "busy", "failed", "canceled"].includes(status);
                            const result = missed
                                ? "polaczenie_nieodebrane"
                                : isOutbound
                                    ? "polaczenie_wychodzace"
                                    : "polaczenie_przychodzace";
                            const minutes = Math.floor((duration || 0) / 60);
                            const seconds = (duration || 0) % 60;
                            const dur = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
                            await match.ref.update({
                                contactHistory: admin.firestore.FieldValue.arrayUnion({
                                    date: new Date().toISOString(),
                                    author: "System (telefon)",
                                    result,
                                    notes: `${isOutbound ? "Wychodzące" : missed ? "Nieodebrane" : "Przychodzące"} • czas ${dur} • status ${status}`,
                                    source: "phone",
                                    callDirection: isOutbound ? "outbound" : "inbound",
                                    callDuration: duration || 0,
                                    callNumber: otherDisplay,
                                    callStatus: status,
                                    callSid,
                                }),
                                lastContactDate: now,
                                lastContactResult: result,
                            });
                        }
                    }
                } catch (logErr) {
                    console.warn("phone/callStatus autoLog error:", logErr.message);
                }
            }

            return res.status(200).send("OK");
        } catch (err) {
            console.error("phone/callStatus error:", err);
            return res.status(500).send("Internal error");
        }
    });
