import { NextResponse } from "next/server";
import { getInrPerUsd } from "@/lib/payments/fx";

export async function GET() {
  const inrPerUsd = await getInrPerUsd();
  return NextResponse.json({ inrPerUsd });
}
