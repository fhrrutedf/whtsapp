import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "demo-tenant-1";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  try {
    const r = await fetch(`${API_URL}/api/giveaways/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-tenant-id": TENANT_ID },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await r.json());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const r = await fetch(`${API_URL}/api/giveaways/${id}`, {
      method: "DELETE",
      headers: { "x-tenant-id": TENANT_ID },
    });
    return NextResponse.json(await r.json());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
