export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    return response.status(405).json({ ok: false, error: "Method not allowed" });
  }

  return response.status(200).json({
    ok: true,
    mode: "observe-only",
    message: "Webhook received. This hosted endpoint does not place trades or store broker credentials."
  });
}
