// functions/phone/getSms.js
// HTTP GET – historia SMS z Firestore. Wymaga Firebase Auth.
// Query: contactNumber? (filtr numeru), limit (default 50), startAfter (cursor – messageSid)

const functions = require("firebase-functions/v1");
const { REGION, db, applyCors, verifyAuth } = require("./config");

exports.getSms = functions
    .region(REGION)
    .runWith({ memory: "256MB", timeoutSeconds: 30 })
    .https.onRequest(async (req, res) => {
        if (applyCors(req, res)) return;
        if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

        const user = await verifyAuth(req, res);
        if (!user) return;

        try {
            const contactNumber = req.query.contactNumber ? String(req.query.contactNumber) : null;
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
            const startAfter = req.query.startAfter ? String(req.query.startAfter) : null;

            let query = db.collection("sms").orderBy("createdAt", "desc");

            if (startAfter) {
                const cursorSnap = await db.collection("sms").doc(startAfter).get();
                if (cursorSnap.exists) {
                    query = query.startAfter(cursorSnap);
                }
            }

            query = query.limit(limit);

            const snap = await query.get();
            let items = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    messageSid: data.messageSid || d.id,
                    from: data.from || null,
                    to: data.to || null,
                    body: data.body || "",
                    direction: data.direction || "inbound",
                    status: data.status || null,
                    agentId: data.agentId || null,
                    createdAt: data.createdAt ? data.createdAt.toMillis() : null,
                };
            });

            // Filtr po numerze kontaktu (from lub to)
            if (contactNumber) {
                items = items.filter(
                    (m) => m.from === contactNumber || m.to === contactNumber
                );
            }

            const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null;

            return res.status(200).json({ items, nextCursor });
        } catch (err) {
            console.error("phone/getSms error:", err);
            return res.status(500).json({ error: "Internal error", message: err.message });
        }
    });
