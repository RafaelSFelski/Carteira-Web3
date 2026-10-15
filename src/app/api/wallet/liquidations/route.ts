import { handleRouteError, parseWalletQuery } from "@/lib/apiHelpers";
import { getLiquidations } from "@/lib/walletService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { address, chain, period } = parseWalletQuery(request.nextUrl.searchParams);
    const data = await getLiquidations(address, chain, period);
    return NextResponse.json({ items: data });
  } catch (error) {
    return handleRouteError(error);
  }
}
