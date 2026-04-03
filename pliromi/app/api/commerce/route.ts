import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// GET /api/commerce?action=stores | products&store=X&query=Y | product&store=X&productId=Y | cart&store=X&cartId=Y
export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const store = url.searchParams.get("store");

  try {
    let cmd = "";

    switch (action) {
      case "stores":
        cmd = "mp commerce store list --json";
        break;
      case "products": {
        const query = url.searchParams.get("query") || "";
        if (!store) return Response.json({ error: "store required" }, { status: 400 });
        cmd = `mp commerce product search --store ${store} --query "${query}" --json`;
        break;
      }
      case "product": {
        const productId = url.searchParams.get("productId");
        if (!store || !productId) return Response.json({ error: "store and productId required" }, { status: 400 });
        cmd = `mp commerce product retrieve --store ${store} --productId "${productId}" --json`;
        break;
      }
      case "cart": {
        const cartId = url.searchParams.get("cartId");
        if (!store || !cartId) return Response.json({ error: "store and cartId required" }, { status: 400 });
        cmd = `mp commerce cart retrieve --store ${store} --cartId "${cartId}" --json`;
        break;
      }
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const { stdout } = await execAsync(cmd, { timeout: 30000 });
    try {
      return Response.json(JSON.parse(stdout.trim()));
    } catch {
      return Response.json({ raw: stdout.trim() });
    }
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST /api/commerce — cart add, cart remove, checkout
export async function POST(request: Request) {
  const body = await request.json();
  const { action, store, variantId, quantity, cartId, lineId, checkout } = body;

  try {
    let cmd = "";

    switch (action) {
      case "cart-add": {
        if (!store || !variantId) return Response.json({ error: "store and variantId required" }, { status: 400 });
        cmd = `mp commerce cart add --store ${store} --variantId "${variantId}" --quantity ${quantity || 1}${cartId ? ` --cartId "${cartId}"` : ""} --json`;
        break;
      }
      case "cart-remove": {
        if (!store || !cartId || !lineId) return Response.json({ error: "store, cartId and lineId required" }, { status: 400 });
        cmd = `mp commerce cart remove --store ${store} --cartId "${cartId}" --lineId "${lineId}" --json`;
        break;
      }
      case "checkout": {
        if (!store || !cartId || !checkout) return Response.json({ error: "store, cartId and checkout info required" }, { status: 400 });
        const { email, firstName, lastName, address, city, postalCode, country } = checkout;
        cmd = `mp commerce checkout --wallet hackathon --store ${store} --cartId "${cartId}" --chain solana --email "${email}" --firstName "${firstName}" --lastName "${lastName}" --address "${address}" --city "${city}" --postalCode "${postalCode}" --country "${country}" --json`;
        break;
      }
      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const { stdout } = await execAsync(cmd, { timeout: 90000 });
    try {
      return Response.json(JSON.parse(stdout.trim()));
    } catch {
      return Response.json({ raw: stdout.trim() });
    }
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
