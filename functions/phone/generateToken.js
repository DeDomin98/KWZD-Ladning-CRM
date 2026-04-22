// functions/phone/generateToken.js
// HTTP GET ?agentId=xxx -> { token, identity }
// Generuje Twilio Access Token z VoiceGrant dla agenta.

const functions = require("firebase-functions/v1");
const twilio = require("twilio");
const { REGION, TWILIO_SECRETS, getTwilioConfig, applyCors, verifyAuth } = require("./config");

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

exports.generateToken = functions
    .region(REGION)
    .runWith({
        memory: "256MB",
        timeoutSeconds: 30,
        secrets: TWILIO_SECRETS,
    })
    .https.onRequest(async (req, res) => {
        if (applyCors(req, res)) return;

        if (req.method !== "GET") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const user = await verifyAuth(req, res);
        if (!user) return;

        const agentId = String(req.query.agentId || user.uid || "").trim();
        if (!agentId) {
            return res.status(400).json({ error: "Missing agentId" });
        }

        const cfg = getTwilioConfig();
        if (!cfg.accountSid || !cfg.apiKey || !cfg.apiSecret || !cfg.twimlAppSid) {
            console.error("phone/generateToken: brak konfiguracji Twilio");
            return res.status(500).json({ error: "Twilio not configured" });
        }

        try {
            const identity = `agent_${agentId}`;

            const voiceGrant = new VoiceGrant({
                outgoingApplicationSid: cfg.twimlAppSid,
                incomingAllow: true,
            });

            const token = new AccessToken(
                cfg.accountSid,
                cfg.apiKey,
                cfg.apiSecret,
                { identity, ttl: 3600 }
            );
            token.addGrant(voiceGrant);

            return res.status(200).json({
                token: token.toJwt(),
                identity,
            });
        } catch (err) {
            console.error("phone/generateToken error:", err);
            return res.status(500).json({ error: "Token generation failed", message: err.message });
        }
    });
