// functions/phone/incomingCall.js
// HTTP POST – publiczny webhook Twilio dla połączeń przychodzących.
// Zwraca TwiML <Dial><Client> do pierwszego dostępnego agenta online,
// albo komunikat głosowy gdy brak agentów.

const functions = require("firebase-functions/v1");
const twilio = require("twilio");
const { REGION, db, applyCors, TWILIO_SECRETS } = require("./config");

const VoiceResponse = twilio.twiml.VoiceResponse;

exports.incomingCall = functions
    .region(REGION)
    .runWith({
        memory: "256MB",
        timeoutSeconds: 30,
        secrets: TWILIO_SECRETS,
    })
    .https.onRequest(async (req, res) => {
        if (applyCors(req, res)) return;

        const twiml = new VoiceResponse();
        const firmNumber = process.env.TWILIO_PHONE_NUMBER;
        const fallbackNumber = process.env.TWILIO_FALLBACK_NUMBER || "";

        console.log("incomingCall START:", {
            from: req.body?.From,
            to: req.body?.To,
            callSid: req.body?.CallSid,
        });

        try {
            const snapshot = await db
                .collection("agents")
                .where("online", "==", true)
                .limit(20)
                .get();

            const allAgents = snapshot.docs.map((d) => ({
                id: d.id,
                online: d.data().online,
                forwardCalls: d.data().forwardCalls === true,
                forwardNumber: d.data().forwardNumber || "",
            }));
            console.log("incomingCall agents online:", allAgents);

            // Agenci odbierający w przeglądarce (brak przekierowania)
            const browserAgents = snapshot.docs.filter((d) => d.data().forwardCalls !== true);
            // Agenci z przekierowaniem na komórkę – każdy musi mieć WŁASNY forwardNumber w E.164
            const cellAgents = snapshot.docs.filter((d) => {
                const data = d.data();
                return data.forwardCalls === true && /^\+\d{8,15}$/.test(data.forwardNumber || "");
            });

            const hasAnyTarget = browserAgents.length > 0 || cellAgents.length > 0;

            if (hasAnyTarget) {
                // Równoległy dzwonek: WSZYSTKIE przeglądarki + WSZYSTKIE komórki naraz.
                // Pierwszy kto odbierze przejmuje rozmowę, reszta zostaje rozłączona.
                // callerId: gdy dzwonimy też na PSTN (komórki) MUSI być nasz numer Twilio
                // (operator nie pozwoli wysłać CLI klienta). Dla samego <Client> lepiej From.
                const callerId = cellAgents.length > 0
                    ? firmNumber
                    : (req.body.From || firmNumber);
                const dial = twiml.dial({
                    callerId,
                    timeout: 30,
                    answerOnBridge: true,
                });
                browserAgents.forEach((d) => {
                    const identity = `agent_${d.id}`;
                    console.log("incomingCall -> Client (parallel):", identity);
                    dial.client(identity);
                });
                cellAgents.forEach((d) => {
                    const num = d.data().forwardNumber;
                    console.log("incomingCall -> Number (parallel):", d.id, num);
                    dial.number(num);
                });
            } else if (fallbackNumber) {
                console.log("incomingCall -> fallback PSTN:", fallbackNumber);
                const dial = twiml.dial({ callerId: firmNumber, timeout: 30 });
                dial.number(fallbackNumber);
            } else {
                console.log("incomingCall -> no agent + no fallback, saying message");
                twiml.say(
                    { language: "pl-PL", voice: "Polly.Ewa" },
                    "Przepraszamy, nikt nie jest dostępny. Zadzwoń później."
                );
            }

            const xml = twiml.toString();
            console.log("incomingCall TwiML response:", xml);
            res.set("Content-Type", "text/xml");
            return res.status(200).send(xml);
        } catch (err) {
            console.error("phone/incomingCall error:", err);
            const errResponse = new VoiceResponse();
            errResponse.say(
                { language: "pl-PL", voice: "Polly.Ewa" },
                "Wystąpił błąd techniczny. Prosimy spróbować ponownie."
            );
            res.set("Content-Type", "text/xml");
            return res.status(200).send(errResponse.toString());
        }
    });
