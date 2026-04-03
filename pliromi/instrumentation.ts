export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Delay import to avoid blocking server startup
    setTimeout(async () => {
      try {
        const { startTreasurerLoop } = await import("./lib/agents/treasurer");
        startTreasurerLoop();
      } catch (err) {
        console.error("[Instrumentation] Failed to start treasurer:", err);
      }
    }, 10000); // Wait 10s for server to be fully ready
  }
}
