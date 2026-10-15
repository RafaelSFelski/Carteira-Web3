import { handleRouteError, parseWalletQuery } from "@/lib/apiHelpers";
import { getPositions } from "@/lib/walletService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { address, chain } = parseWalletQuery(request.nextUrl.searchParams);
    const data = await getPositions(address, chain);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
