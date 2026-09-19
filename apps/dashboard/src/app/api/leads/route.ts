import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || "demo-tenant-1";

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${API_URL}/api/leads`, {
      headers: {
        "x-tenant-id": TENANT_ID,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
