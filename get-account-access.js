import { getUser as getUserImpl } from "./utils.js";

async function getUser(tokens, login) {
  return getUserImpl(process.env.TWITCH_CLIENT_ID, tokens.access_token, login);
}

export async function getStreamerAccess() {
  let scopes = encodeURIComponent("Streamer", ["channel:bot"].join(" "));
  return await getAccountAccess(scopes);
}

export async function getChatterAccess() {
  let scopes = encodeURIComponent(
    "Chatter",
    ["user:write:chat", "user:bot"].join(" "),
  );
  return await getAccountAccess(scopes);
}

export async function getStreamerAndChatterAccess() {
  let scopes = encodeURIComponent(
    "Streamer and Chatter",
    ["channel:bot", "user:write:chat", "user:bot"].join(" "),
  );
  return await getAccountAccess(scopes);
}

async function getAccountAccess(forWhom, scopes) {
  let tokens = {
    access_token: null,
    refresh_token: null,
    device_code: null,
    verification_uri: null,
    user_id: null,
  };
  let dcf = await fetch(
    `https://id.twitch.tv/oauth2/device?client_id=${process.env.TWITCH_CLIENT_ID}&scopes=${scopes}`,
    {
      method: "POST",
    },
  );
  if (dcf.status >= 200 && dcf.status < 300) {
    // Successfully got DCF data
    let dcfJson = await dcf.json();
    tokens.device_code = dcfJson.device_code;
    tokens.user_code = dcfJson.user_code;
    tokens.verification_uri = dcfJson.verification_uri;
    console.log(
      `Open ${tokens.verification_uri} in a browser and enter ${tokens.user_code} there!`,
    );
  }
  let dcfInterval = setInterval(async () => {
    let tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&scopes=${encodeURIComponent(scopes)}&device_code=${tokens.device_code}&grant_type=urn:ietf:params:oauth:grant-type:device_code`,
      {
        method: "POST",
      },
    );
    if (tokenResponse.status == 400) return; // Probably authorization pending
    if (tokenResponse.status >= 200 && tokenResponse.status < 300) {
      // Successfully got token
      let tokenJson = await tokenResponse.json();
      tokens.access_token = tokenJson.access_token;
      tokens.refresh_token = tokenJson.refresh_token;
      let user = await getUser(tokens);
      clearInterval(dcfInterval);
      console.log(
        `Got Device Code Flow Tokens for ${forWhom} ${user.display_name} (${user.login})`,
      );
    }
  }, 1000);
}
