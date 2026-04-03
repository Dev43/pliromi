import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readStore, updateStore, addAgentLog } from "@/lib/db";
import { getWalletAccounts } from "@/lib/wallet";
import { z } from "zod";

export function createPliromiMcpServer() {
  const server = new McpServer({
    name: "Pliromi Store",
    version: "1.0.0",
  });

  // Tool: List all available products
  server.tool(
    "list_products",
    "List all products available in the Pliromi store with their prices and stock levels",
    {},
    async () => {
      const store = readStore();
      const products = store.inventory
        .filter((i) => i.quantity > 0)
        .map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          price: i.maxPrice,
          minPrice: i.minPrice,
          quantity: i.quantity,
        }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ products, count: products.length }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Get product details
  server.tool(
    "get_product",
    "Get detailed information about a specific product by ID",
    { productId: z.string().describe("The product ID to look up") },
    async ({ productId }) => {
      const store = readStore();
      const product = store.inventory.find((i) => i.id === productId);

      if (!product) {
        return {
          content: [{ type: "text" as const, text: "Product not found" }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: product.id,
                name: product.name,
                description: product.description,
                price: product.maxPrice,
                minPrice: product.minPrice,
                quantity: product.quantity,
                negotiable: product.minPrice < product.maxPrice,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool: Buy a product (initiate purchase)
  server.tool(
    "buy_product",
    "Initiate a purchase of a product. Returns payment instructions with the address to send USDC to.",
    {
      productId: z.string().describe("The product ID to purchase"),
      chain: z
        .enum(["base", "ethereum", "polygon", "arbitrum", "solana"])
        .optional()
        .describe("Blockchain to pay on (default: base)"),
    },
    async ({ productId, chain }) => {
      const store = readStore();
      const product = store.inventory.find((i) => i.id === productId);

      if (!product) {
        return {
          content: [{ type: "text" as const, text: "Product not found" }],
          isError: true,
        };
      }

      if (product.quantity <= 0) {
        return {
          content: [{ type: "text" as const, text: "Product is out of stock" }],
          isError: true,
        };
      }

      const accounts = await getWalletAccounts();
      const evmAddress = accounts.find((a) => a.chainId === "eip155:1")?.address;
      const solanaAddress = accounts.find((a) =>
        a.chainId.includes("solana")
      )?.address;

      const paymentAddress =
        chain === "solana" ? solanaAddress : evmAddress;

      addAgentLog(
        "seller",
        `MCP agent initiated purchase of ${product.name} for $${product.maxPrice.toFixed(2)} USDC`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                product: product.name,
                price: product.maxPrice,
                currency: "USDC",
                chain: chain || "base",
                paymentAddress,
                x402Url: `/api/x402/${product.id}`,
                instructions:
                  "Send the exact USDC amount to the payment address, then call confirm_purchase with the transaction hash.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool: Confirm a purchase with transaction hash
  server.tool(
    "confirm_purchase",
    "Confirm a purchase by providing the transaction hash after sending payment",
    {
      productId: z.string().describe("The product ID that was purchased"),
      txHash: z.string().describe("The blockchain transaction hash"),
      chain: z.string().optional().describe("The chain the payment was made on"),
    },
    async ({ productId, txHash, chain }) => {
      const store = readStore();
      const product = store.inventory.find((i) => i.id === productId);

      if (!product) {
        return {
          content: [{ type: "text" as const, text: "Product not found" }],
          isError: true,
        };
      }

      // Record sale
      updateStore((data) => {
        const item = data.inventory.find((i) => i.id === productId);
        if (item && item.quantity > 0) {
          item.quantity -= 1;
        }
        data.sales.push({
          id: crypto.randomUUID(),
          productId,
          price: product.maxPrice,
          chain: chain || "base",
          txHash,
          timestamp: new Date().toISOString(),
        });
      });

      addAgentLog(
        "seller",
        `MCP sale confirmed: ${product.name} for $${product.maxPrice.toFixed(2)} USDC. Tx: ${txHash}`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              message: `Purchase of ${product.name} confirmed!`,
              txHash,
            }),
          },
        ],
      };
    }
  );

  // Tool: Negotiate price
  server.tool(
    "negotiate_price",
    "Try to negotiate a lower price for a product. The seller agent will counter-offer.",
    {
      productId: z.string().describe("The product ID to negotiate"),
      offeredPrice: z.number().describe("Your offered price in USD"),
    },
    async ({ productId, offeredPrice }) => {
      const store = readStore();
      const product = store.inventory.find((i) => i.id === productId);

      if (!product) {
        return {
          content: [{ type: "text" as const, text: "Product not found" }],
          isError: true,
        };
      }

      let accepted = false;
      let counterPrice = product.maxPrice;

      if (offeredPrice >= product.maxPrice) {
        accepted = true;
        counterPrice = product.maxPrice;
      } else if (offeredPrice >= product.minPrice) {
        // Accept if at or above min, counter with midpoint if below
        const midpoint = (offeredPrice + product.maxPrice) / 2;
        if (offeredPrice >= midpoint) {
          accepted = true;
          counterPrice = offeredPrice;
        } else {
          counterPrice = Math.round(midpoint * 100) / 100;
        }
      } else {
        counterPrice = product.minPrice;
      }

      addAgentLog(
        "seller",
        `MCP negotiation for ${product.name}: offered $${offeredPrice.toFixed(2)}, ${accepted ? "accepted" : `countered at $${counterPrice.toFixed(2)}`}`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              accepted,
              counterPrice,
              minPrice: product.minPrice,
              maxPrice: product.maxPrice,
              message: accepted
                ? `Deal! ${product.name} is yours for $${counterPrice.toFixed(2)} USDC.`
                : `I can't go that low. How about $${counterPrice.toFixed(2)} USDC for ${product.name}?`,
            }),
          },
        ],
      };
    }
  );

  return server;
}
