import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@open-wallet-standard/core", "ethers", "@xmtp/node-sdk", "@modelcontextprotocol/sdk"],
  turbopack: {},
};

export default nextConfig;
