import { readStore, updateStore } from "@/lib/db";

export async function GET() {
  const store = readStore();
  return Response.json({ inventory: store.inventory });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, minPrice, maxPrice, quantity, imageUrl } = body;

  if (!name || minPrice === undefined || maxPrice === undefined) {
    return Response.json(
      { error: "Name, minPrice, and maxPrice are required" },
      { status: 400 }
    );
  }

  if (minPrice > maxPrice) {
    return Response.json(
      { error: "minPrice cannot exceed maxPrice" },
      { status: 400 }
    );
  }

  const item = {
    id: crypto.randomUUID(),
    name,
    description: description || "",
    minPrice: Number(minPrice),
    maxPrice: Number(maxPrice),
    quantity: Number(quantity) || 0,
    imageUrl,
  };

  updateStore((store) => {
    store.inventory.push(item);
  });

  return Response.json({ item });
}
