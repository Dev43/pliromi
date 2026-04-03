const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

export async function GET() {
  return Response.json({
    mcpServers: {
      "pliromi-store": {
        url: `${baseUrl}/api/mcp`,
        name: "Pliromi Store",
        description: "A store and treasury management system. Browse products, negotiate prices, and purchase with USDC via x402 protocol.",
        version: "1.0.0",
        capabilities: {
          tools: true,
        },
        tools: [
          {
            name: "list_products",
            description: "List all available products in the store with prices and stock levels",
          },
          {
            name: "get_product",
            description: "Get detailed information about a specific product by ID",
          },
          {
            name: "buy_product",
            description: "Initiate a purchase and get payment instructions (USDC address, chain, amount)",
          },
          {
            name: "confirm_purchase",
            description: "Confirm a purchase by providing the transaction hash after payment",
          },
          {
            name: "negotiate_price",
            description: "Negotiate the price of a product with the seller agent — haggle for a better deal",
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
