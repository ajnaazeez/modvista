const twilio = require('twilio');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

/**
 * Sends an SMS message via Twilio.
 * @param {string} to   - Recipient phone number in E.164 format e.g. +919876543210
 * @param {string} body - SMS message body
 */
const sendSms = async (to, body) => {
    return client.messages.create({
        from: process.env.TWILIO_FROM,
        to,
        body,
    });
};

module.exports = sendSms;
