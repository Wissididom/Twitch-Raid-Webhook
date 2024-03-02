require("dotenv").config();
const crypto = require("crypto");
const express = require("express");

const app = express();

// Notification request headers
const TWITCH_MESSAGE_ID = "Twitch-Eventsub-Message-Id".toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP =
  "Twitch-Eventsub-Message-Timestamp".toLowerCase();
const TWITCH_MESSAGE_SIGNATURE =
  "Twitch-Eventsub-Message-Signature".toLowerCase();
const MESSAGE_TYPE = "Twitch-Eventsub-Message-Type".toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = "webhook_callback_verification";
const MESSAGE_TYPE_NOTIFICATION = "notification";
const MESSAGE_TYPE_REVOCATION = "revocation";

// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = "sha256=";

app.use(
  express.raw({
    type: "application/json",
  }),
);

app.get("/", (req, res) => res.send("Twitch EventSub Webhook Endpoint"));

app.post("/", (req, res) => {
  let secret = process.env.EVENTSUB_SECRET;
  let message =
    req.headers[TWITCH_MESSAGE_ID] +
    req.headers[TWITCH_MESSAGE_TIMESTAMP] +
    req.body;
  let hmac =
    HMAC_PREFIX +
    crypto.createHmac("sha256", secret).update(message).digest("hex");

  if (verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
    // Get JSON object from body, so you can process the message.
    let notification = JSON.parse(req.body);
    switch (req.headers[MESSAGE_TYPE]) {
      case MESSAGE_TYPE_NOTIFICATION:
        // TODO: Do something with the event's data.
        console.log(`Event type: ${notification.subscription.type}`);
        console.log(JSON.stringify(notification.event, null, 4));
        res.sendStatus(204);
        break;
      case MESSAGE_TYPE_VERIFICATION:
        res
          .set("Content-Type", "text/plain")
          .status(200)
          .send(notification.challenge);
        break;
      case MESSAGE_TYPE_REVOCATION:
        res.sendStatus(204);
        console.log(`${notification.subscription.type} notifications revoked!`);
        console.log(`reason: ${notification.subscription.status}`);
        console.log(
          `condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`,
        );
        break;
      default:
        res.sendStatus(204);
        console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
        break;
    }
  } else {
    console.log("403 - Signatures didn't match.");
    res.sendStatus(403);
  }
});

function verifyMessage(hmac, verifySignature) {
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(verifySignature),
  );
}

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Server ready on port ${port}.`));

module.exports = app;
