import "dotenv/config";
import { getStreamerAndChatterAccess } from "./get-account-access.js";
import yesno from "yesno";

const shouldAuthorizeForAnnouncements = await yesno({
  question:
    "Do you want to be able to send announcements with this authorization?",
});

await getStreamerAndChatterAccess(shouldAuthorizeForAnnouncements);
