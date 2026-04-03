import Anthropic from "@anthropic-ai/sdk";
import { readStore, addAgentLog } from "@/lib/db";
import type { InventoryItem } from "@/lib/db";
import { postToGroup } from "@/lib/xmtp-agent";

const client = new Anthropic();

function buildSystemPrompt(inventory: InventoryItem[]): string {
  const items = inventory
    .filter((i) => i.quantity > 0)
    .map(
      (i) =>
        `- ${i.name} (ID: ${i.id}): ${i.description}. Price range: $${i.minPrice.toFixed(2)} - $${i.maxPrice.toFixed(2)} USDC. Stock: ${i.quantity}`
    )
    .join("\n");

  return `You are the Seller agent for a Pliromi store. You help customers browse products and negotiate prices.

CURRENT INVENTORY:
${items || "No products in stock."}

RULES:
1. Always start with the MAX price when a customer asks about a product.
2. You can negotiate down but NEVER go below the MIN price.
3. When negotiating, lower the price gradually (5-15% per round). Be charming but firm.
4. When the customer wants to buy, give them the FULL x402 payment URL: ${process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`}/api/x402/{productId}
5. Tell them to pay in USDC on Base, Ethereum, Polygon, or Arbitrum.
6. Keep responses concise and friendly. You're a skilled salesperson.
7. If asked about products not in inventory, say you don't carry that.

When you agree on a price, respond with the exact format at the end:
AGREED_PRICE: {price} for product {productId}

Always respond in character as a friendly store seller.`;
}

export async function chatWithSeller(
  message: string,
  productId?: string,
  conversationHistory?: { role: "user" | "assistant"; content: string }[]
): Promise<{
  reply: string;
  offeredPrice: number | null;
  productId: string | null;
}> {
  const store = readStore();
  const product = productId
    ? store.inventory.find((i) => i.id === productId)
    : null;

  const systemPrompt = buildSystemPrompt(store.inventory);

  // Build messages with conversation history
  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...(conversationHistory || []),
    { role: "user" as const, content: message },
  ];

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });

    const reply =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract agreed price if present
    let offeredPrice: number | null = null;
    const priceMatch = reply.match(/AGREED_PRICE:\s*\$?([\d.]+)\s*for product\s*(\S+)/i);
    if (priceMatch) {
      offeredPrice = parseFloat(priceMatch[1]);
    }

    // If no explicit agreement, try to detect a quoted price
    if (!offeredPrice) {
      const quotedPrice = reply.match(/\$([\d.]+)\s*USDC/);
      if (quotedPrice) {
        offeredPrice = parseFloat(quotedPrice[1]);
      }
    }

    const logMsg = `Customer: "${message.slice(0, 80)}${message.length > 80 ? "..." : ""}" → Price: $${offeredPrice?.toFixed(2) || "N/A"}${product ? ` (${product.name})` : ""}`;
    addAgentLog("seller", logMsg);

    // Post notable events to XMTP
    if (offeredPrice && product) {
      postToGroup("Seller", `Negotiating ${product.name} at $${offeredPrice.toFixed(2)} USDC with a customer.`).catch(() => {});
    }

    return {
      reply: reply.replace(/AGREED_PRICE:.*$/gm, "").trim(),
      offeredPrice,
      productId: product?.id || null,
    };
  } catch (error) {
    console.error("Seller agent error:", error);
    // Fallback to basic response
    const fallbackReply = product
      ? `${product.name} is available for $${product.maxPrice.toFixed(2)} USDC. Interested?`
      : "Welcome! Let me know what you're looking for.";

    return {
      reply: fallbackReply,
      offeredPrice: product?.maxPrice || null,
      productId: product?.id || null,
    };
  }
}
