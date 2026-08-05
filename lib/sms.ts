const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY!;
const SEMAPHORE_SENDER = process.env.SEMAPHORE_SENDER ?? "NorthSouth";

export async function sendSMS(to: string, message: string) {
  const phone = to.replace(/\D/g, "");
  const normalized = phone.startsWith("0") ? "63" + phone.slice(1) : phone.startsWith("63") ? phone : "63" + phone;

  const res = await fetch("https://api.semaphore.co/api/v4/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: SEMAPHORE_API_KEY,
      number: normalized,
      message,
      sendername: SEMAPHORE_SENDER,
    }),
  });

  if (!res.ok) throw new Error(`Semaphore error: ${res.status}`);
  return res.json();
}

export async function sendBulkSMS(recipients: { phone: string; name: string }[], message: string) {
  const results = { sent: 0, failed: 0 };
  for (const r of recipients) {
    try {
      await sendSMS(r.phone, message);
      results.sent++;
    } catch {
      results.failed++;
    }
  }
  return results;
}
