import { NextResponse } from "next/server";

export const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const ok = (data: unknown) => NextResponse.json(data);
