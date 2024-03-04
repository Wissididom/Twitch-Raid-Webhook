# Twitch-Raid-Webhook

## Prerequisites

- NodeJS v18+
- Twitch Client ID
- Twitch Client Secret
- Twitch User ID of the account that should send the messages
- EventSub Secret (must be between 1 and 100 chars in length and can be freely chosen by you)
- Port on the server where Twitch sends the webhooks to
  - only matters for installation on your server; doesn't matter for deployments on Vercel
- Hostname or IP where Twitch sends the webhooks to (`URL` environment variable or value in the `.env` file)

## Setup

### Hosted on your server

1. Clone this repo
2. Do `npm i` or `npm install` to install `dotenv`, `express` and `helmet`
3. Copy `example.env` to `.env` and fill out it's values
4. Run `node get-chatter-access.js` and authorize with the account that should send the message
5. Run `node get-streamer-access.js` and authorize with the account of the streamer in whose channel you want to send the message
6. Run `node api/index.js` or `npm start` and let it run in the background (Twitch sends a verification request after creating the EventSub subscription)
7. Run `node create-eventsub-subscription.js` and enter the name of the channel you want to create an EventSub subscription of `channel.raid` for
8. Twitch now tries to send an verification request to your specified URL and if that succeeds will send you a POST request on each outgoing raid

### Hosted on Vercel

1. Fork this repo
2. Import your Fork to Vercel
3. Create the environment variables from `example.env` on Vercel's settings page
4. Redeploy to make sure Vercel uses those environment variables
5. Do step 4, 5 and 7 from the `Hosted on your server` section locally with the same values that you have specified on Vercel as environment variables
6. Twitch now tries to send an verification request to your specified URL and if that succeeds will send you a POST request on each outgoing raid
