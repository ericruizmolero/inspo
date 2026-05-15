import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { empresa, web, tipo, puestoPor, comentarios, subcomentarios } = body;

    if (!empresa || !web) {
      return Response.json({ error: "empresa y web son obligatorios" }, { status: 400 });
    }

    const scriptUrl = process.env.SHEETS_SCRIPT_URL;
    const secret    = process.env.SHEETS_SCRIPT_SECRET;

    if (!scriptUrl) {
      return Response.json({ error: "SHEETS_SCRIPT_URL no configurada" }, { status: 500 });
    }

    // Fecha de hoy en DD/MM/YYYY
    const now   = new Date();
    const fecha = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

    const payload = { secret, empresa, web, fecha, puestoPor, tipo, comentarios, subcomentarios: subcomentarios || "" };

    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `Script error: ${text}` }, { status: 502 });
    }

    const item = { empresa, web, fecha, puestoPor, tipo, comentarios, subcomentarios: subcomentarios || undefined };
    return Response.json({ ok: true, item });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
