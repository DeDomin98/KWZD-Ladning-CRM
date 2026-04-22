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
                .limit(10)
                .get();

            const allAgents = snapshot.docs.map((d) => ({
                id: d.id,
                online: d.data().online,
                forwardCalls: d.data().forwardCalls === true,
            }));
            console.log("incomingCall agents online:", allAgents);

            // Szukamy agenta online który NIE ma ustawionego przekierowania na komórkę
            const browserAgent = snapshot.docs.find((d) => d.data().forwardCalls !== true);

            if (browserAgent) {
                // Agent online i odbiera w przeglądarce
                const identity = `agent_${browserAgent.id}`;
                console.log("incomingCall -> Client:", identity);

                const dial = twiml.dial({
                    callerId: req.body.From || undefined,
                    timeout: 30,
                    answerOnBridge: true,
                });
                dial.client(identity);
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
