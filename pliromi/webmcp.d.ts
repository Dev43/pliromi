// WebMCP HTML attribute extensions (Chrome 146+)
// See: https://developer.chrome.com/docs/ai/webmcp

declare namespace React {
  interface FormHTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    toolautosubmit?: string;
  }

  interface InputHTMLAttributes<T> {
    toolparamdescription?: string;
  }

  interface SelectHTMLAttributes<T> {
    toolparamdescription?: string;
  }

  interface TextAreaHTMLAttributes<T> {
    toolparamdescription?: string;
  }
}

interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (...args: unknown[]) => unknown;
}

interface ModelContext {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void;
}

interface ModelContextTesting {
  getRegisteredTools: () => WebMcpTool[];
}

declare interface Navigator {
  modelContext?: ModelContext;
  modelContextTesting?: ModelContextTesting;
}
