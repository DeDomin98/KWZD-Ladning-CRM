// functions/phone/index.js
// Eksport wszystkich funkcji modułu phone.
// Główny functions/index.js powinien dodać:
//   exports.phone = require('./phone/index');

const { generateToken } = require("./generateToken");
const { incomingCall } = require("./incomingCall");
const { outgoingCall } = require("./outgoingCall");
const { callStatus } = require("./callStatus");
const { getCalls } = require("./getCalls");
const { sendSms } = require("./sendSms");
const { incomingSms } = require("./incomingSms");
const { getSms } = require("./getSms");

module.exports = {
    generateToken,
    incomingCall,
    outgoingCall,
    callStatus,
    getCalls,
    sendSms,
    incomingSms,
    getSms,
};
