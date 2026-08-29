import { fetchPrices } from "@/lib/fetchers/prices";

export const dynamic = "force-dynamic";

export async function GET() {
  const prices = await fetchPrices();
  return Response.json(prices);
}
