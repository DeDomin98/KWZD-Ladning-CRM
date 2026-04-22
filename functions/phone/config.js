// functions/phone/config.js
// Wspólne narzędzia modułu phone: admin, auth middleware, CORS, odczyt sekretów Twilio.
//
// Sekrety przechowywane są w Google Secret Manager (firebase-functions v7
// usunął functions.config()). Ustawienie – patrz README na dole.
// Funkcje, które ich potrzebują, muszą deklarować je w runWith({ secrets: TWILIO_SECRETS }).

const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

const REGION = "us-central1";

// Lista nazw sekretów Twilio (do użycia w runWith({ secrets: TWILIO_SECRETS }))
const TWILIO_SECRETS = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_API_KEY",
    "TWILIO_API_SECRET",
    "TWILIO_TWIML_APP_SID",
    "TWILIO_PHONE_NUMBER",
    "TWILIO_FALLBACK_NUMBER",
];

/**
 * Zwraca konfigurację Twilio z process.env (sekretów wstrzykniętych przez Firebase).
 * Działa tylko wewnątrz funkcji, która ma odpowiednie sekrety w runWith.
 */
function getTwilioConfig() {
    return {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        apiKey: process.env.TWILIO_API_KEY || process.env.TWILIO_ACCOUNT_SID,
        apiSecret: process.env.TWILIO_API_SECRET || process.env.TWILIO_AUTH_TOKEN,
        twimlAppSid: process.env.TWILIO_TWIML_APP_SID,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    };
}

/**
 * Prosty CORS dla wywołań z przeglądarki.
 */
function applyCors(req, res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return true;
    }
    return false;
}

/**
 * Middleware – weryfikuje token Firebase Auth z nagłówka Authorization: Bearer <token>.
 * Zwraca obiekt usera albo null (i wtedy sam wysyła 401).
 */
async function verifyAuth(req, res) {
    const authHeader = req.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        res.status(401).json({ error: "Missing Authorization header" });
        return null;
    }
    try {
        const decoded = await admin.auth().verifyIdToken(match[1].trim());
        return decoded;
    } catch (err) {
        console.warn("phone/verifyAuth: invalid token", err.message);
        res.status(401).json({ error: "Invalid token" });
        return null;
    }
}

module.exports = {
    admin,
    db,
    REGION,
    TWILIO_SECRETS,
    getTwilioConfig,
    applyCors,
    verifyAuth,
};
