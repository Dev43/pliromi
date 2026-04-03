import { updateStore } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  let found = false;
  updateStore((store) => {
    const item = store.inventory.find((i) => i.id === id);
    if (item) {
      if (body.name !== undefined) item.name = body.name;
      if (body.description !== undefined) item.description = body.description;
      if (body.minPrice !== undefined) item.minPrice = Number(body.minPrice);
      if (body.maxPrice !== undefined) item.maxPrice = Number(body.maxPrice);
      if (body.quantity !== undefined) item.quantity = Number(body.quantity);
      if (body.imageUrl !== undefined) item.imageUrl = body.imageUrl;
      found = true;
    }
  });

  if (!found) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let removed = false;
  updateStore((store) => {
    const idx = store.inventory.findIndex((i) => i.id === id);
    if (idx !== -1) {
      store.inventory.splice(idx, 1);
      removed = true;
    }
  });

  if (!removed) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
