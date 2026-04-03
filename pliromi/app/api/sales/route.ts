import { readStore } from "@/lib/db";

export async function GET() {
  const store = readStore();
  return Response.json({ sales: store.sales });
}
