import "dotenv/config";
import crypto from "crypto";
import express from "express";
import helmet from "helmet";
import { getUser as getUserImpl } from "./utils.js";

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

let token = {
  access_token: null,
  expires_in: null,
  token_type: null,
};

async function sendMessage(broadcasterId, senderId, message) {
  let data = {
    broadcaster_id: broadcasterId,
    sender_id: senderId,
    message,
  };
  console.log(`sendMessage:${JSON.stringify(data)}`);
  return await fetch("https://api.twitch.tv/helix/chat/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Client-ID": process.env.TWITCH_CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then(async (res) => {
    // 200 OK = Successfully sent the message
    // 400 Bad Request
    // 401 Unauthorized
    // 403 Forbidden = The sender is not permitted to send chat messages to the broadcaster’s chat room.
    // 422 = The message is too large
    console.log(
      `${senderId} - ${res.status}:\n${JSON.stringify(await res.json(), null, 2)}`,
    );
    if (res.status >= 200 && res.status < 300) {
      return true;
    } else {
      return false;
    }
  });
}

async function getUser(login) {
  return getUserImpl(process.env.TWITCH_CLIENT_ID, token.access_token, login);
}

async function getToken() {
  let clientCredentials = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST",
    },
  );
  if (clientCredentials.status >= 200 && clientCredentials.status < 300) {
    let clientCredentialsJson = await clientCredentials.json();
    token = {
      access_token: clientCredentialsJson.access_token,
      expires_in: clientCredentialsJson.expires_in,
      token_type: clientCredentialsJson.token_type,
    };
    return token;
  }
}

app.use(helmet());

app.use(
  express.raw({
    type: "application/json",
  }),
);

app.get("/", (req, res) => res.send("Twitch Raid EventSub Webhook Endpoint"));

app.post("/", async (req, res) => {
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
        if (notification.subscription.type == "channel.raid") {
          await getToken();
          let msg = process.env.MESSAGE;
          msg = msg.replace(
            "<to_broadcaster_user_id>",
            notification.event.to_broadcaster_user_id,
          );
          msg = msg.replace(
            "<to_broadcaster_user_login>",
            notification.event.to_broadcaster_user_login,
          );
          msg = msg.replace(
            "<to_broadcaster_user_name>",
            notification.event.to_broadcaster_user_name,
          );
          msg = msg.replace(
            "<from_broadcaster_user_id>",
            notification.event.from_broadcaster_user_id,
          );
          msg = msg.replace(
            "<from_broadcaster_user_login>",
            notification.event.from_broadcaster_user_login,
          );
          msg = msg.replace(
            "<from_broadcaster_user_name>",
            notification.event.from_broadcaster_user_name,
          );
          msg = msg.replace("<viewers>", notification.event.viewers);
          await sendMessage(
            notification.event.from_broadcaster_user_id,
            process.env.SENDER_ID,
            msg,
          );
        } else {
          console.log(`Event type: ${notification.subscription.type}`);
          console.log(JSON.stringify(notification.event, null, 4));
        }
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

export default app;
