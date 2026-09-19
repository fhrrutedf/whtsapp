import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "demo-tenant-1";

export async function GET() {
  try {
    const r = await fetch(`${API_URL}/api/giveaways`, { headers: { "x-tenant-id": TENANT_ID }, cache: "no-store" });
    return NextResponse.json(await r.json());
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const r = await fetch(`${API_URL}/api/giveaways`, { method: "POST", headers: { "Content-Type": "application/json", "x-tenant-id": TENANT_ID }, body: JSON.stringify(body) });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
