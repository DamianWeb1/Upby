export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const value = request.headers.get("x-vercel-ip-country")?.trim().toUpperCase() || "";
  const country = /^[A-Z]{2}$/.test(value) ? value : "";

  return Response.json(
    { country },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
