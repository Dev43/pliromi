import { readStore } from "@/lib/db";

export async function GET() {
  const store = readStore();
  // Only show items with stock, and expose maxPrice as the listed price
  const products = store.inventory
    .filter((i) => i.quantity > 0)
    .map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: i.maxPrice,
      quantity: i.quantity,
      imageUrl: i.imageUrl,
    }));

  return Response.json({ products });
}
