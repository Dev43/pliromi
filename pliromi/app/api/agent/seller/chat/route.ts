import { chatWithSeller } from "@/lib/agents/seller";

export async function POST(request: Request) {
  const body = await request.json();
  const { message, productId, history } = body;

  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  const result = await chatWithSeller(message, productId, history);

  return Response.json(result);
}
