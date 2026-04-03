const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

export async function GET() {
  return Response.json({
    mcpServers: {
      "pliromi-store": {
        url: `${baseUrl}/store/mcp`,
        name: "Pliromi Store",
        description: "A store and treasury management system. Browse products, negotiate prices, and purchase with USDC via x402 protocol.",
        version: "1.0.0",
        capabilities: {
          tools: true,
        },
        tools: [
          {
            name: "list_products",
            description: "List all available products with prices, stock, and x402 payment links. Each product includes a full x402Url and owsPayCommand for direct payment.",
          },
          {
            name: "get_product",
            description: "Get detailed information about a specific product by ID",
          },
          {
            name: "buy_product",
            description: "Initiate a purchase. Returns the full x402 payment URL, OWS pay command, and payment address. Supports optional negotiatedPrice from prior negotiation.",
          },
          {
            name: "confirm_purchase",
            description: "Confirm a purchase by providing the transaction hash after payment",
          },
          {
            name: "negotiate_price",
            description: "Negotiate the price of a product. If accepted, returns the x402 payment URL with the agreed price baked in, plus the OWS pay command.",
          },
        ],
      },
    },
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
