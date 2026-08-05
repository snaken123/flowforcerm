import { google } from "googleapis";

export function getGmailClient(accessToken: string, refreshToken?: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export function parseEmailBody(payload: any): { html: string; text: string } {
  if (!payload) return { html: "", text: "" };

  let html = "";
  let text = "";

  function walk(part: any) {
    if (!part) return;
    if (part.mimeType === "text/html" && part.body?.data) {
      html = Buffer.from(part.body.data, "base64").toString("utf-8");
    } else if (part.mimeType === "text/plain" && part.body?.data) {
      text = Buffer.from(part.body.data, "base64").toString("utf-8");
    }
    if (part.parts) part.parts.forEach(walk);
  }

  walk(payload);
  return { html, text };
}

export function parseHeaders(headers: Array<{ name: string; value: string }>) {
  const get = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
  return {
    from: get("From"),
    to: get("To"),
    subject: get("Subject"),
    date: get("Date"),
    messageId: get("Message-ID"),
    inReplyTo: get("In-Reply-To"),
    replyTo: get("Reply-To"),
  };
}
