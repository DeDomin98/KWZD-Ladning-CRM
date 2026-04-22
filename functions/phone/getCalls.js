// functions/phone/getCalls.js
// HTTP GET – historia połączeń (wymaga Firebase Auth)
// Query: agentId?, limit (default 50), startAfter (cursor – CallSid)

const functions = require("firebase-functions/v1");
const { REGION, db, applyCors, verifyAuth } = require("./config");

exports.getCalls = functions
    .region(REGION)
    .runWith({ memory: "256MB", timeoutSeconds: 30 })
    .https.onRequest(async (req, res) => {
        if (applyCors(req, res)) return;

        if (req.method !== "GET") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const user = await verifyAuth(req, res);
        if (!user) return;

        try {
            const agentId = req.query.agentId ? String(req.query.agentId) : null;
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
            const startAfter = req.query.startAfter ? String(req.query.startAfter) : null;

            let query = db.collection("calls").orderBy("startedAt", "desc");

            if (agentId) {
                query = query.where("agentId", "==", agentId);
            }

            if (startAfter) {
                const cursorSnap = await db.collection("calls").doc(startAfter).get();
                if (cursorSnap.exists) {
                    query = query.startAfter(cursorSnap);
                }
            }

            query = query.limit(limit);

            const snap = await query.get();
            const items = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    from: data.from || null,
                    to: data.to || null,
                    status: data.status || null,
                    duration: data.duration || 0,
                    agentId: data.agentId || null,
                    startedAt: data.startedAt ? data.startedAt.toMillis() : null,
                    endedAt: data.endedAt ? data.endedAt.toMillis() : null,
                };
            });

            const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null;

            return res.status(200).json({ items, nextCursor });
        } catch (err) {
            console.error("phone/getCalls error:", err);
            return res.status(500).json({ error: "Internal error", message: err.message });
        }
    });
