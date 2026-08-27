import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
// Extension is required and deliberate: the repo is "type": "module", so the
// compiled function is ESM, and ESM does not resolve extensionless relative
// specifiers. TypeScript maps the .js back to lib/data.ts. Without it the
// function loads and then dies on ERR_MODULE_NOT_FOUND at runtime only.
import { siteData } from "../lib/data.js";

const PREFIX = "data:image/png;base64,";
/** Well over a full-board drawing, well under the function's body limit. */
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_NAME = 80;
const MAX_MESSAGE = 600;

/**
 * Visitor text goes into an HTML email, so it is escaped rather than trusted.
 * Newlines survive as <br> since the note field is a textarea.
 */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Trims, caps, and drops anything that isn't a usable string. */
function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(500).json({ error: "Email is not configured" });

  const body = req.body as { image?: unknown; name?: unknown; message?: unknown } | undefined;
  const image = body?.image;
  if (typeof image !== "string" || !image.startsWith(PREFIX)) {
    return res.status(400).json({ error: "Expected a PNG data URL" });
  }

  // collapsed to one line: it goes in the subject as well as the body
  const name = clean(body?.name, MAX_NAME).replace(/\s+/g, " ");
  const message = clean(body?.message, MAX_MESSAGE);

  const content = image.slice(PREFIX.length);
  // base64 is 4 characters per 3 bytes
  if ((content.length * 3) / 4 > MAX_BYTES) {
    return res.status(413).json({ error: "Drawing is too large" });
  }

  const html = [
    "<p>A visitor left a drawing on the Explore-room whiteboard.</p>",
    name ? `<p><strong>From:</strong> ${escapeHtml(name)}</p>` : "",
    message ? `<p><strong>Note:</strong><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>` : "",
  ].join("");

  try {
    const { error } = await new Resend(key).emails.send({
      from: "Portfolio Whiteboard <onboarding@resend.dev>",
      to: siteData.contact.email,
      subject: name
        ? `${name} drew you something on the site`
        : "Someone drew you something on the site",
      html,
      attachments: [{ filename: "whiteboard.png", content }],
    });
    if (error) return res.status(502).json({ error: "Could not send the drawing" });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: "Could not send the drawing" });
  }
}
