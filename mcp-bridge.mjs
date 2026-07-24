#!/usr/bin/env node

// mcp-bridge.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import * as EventSourceLib from "eventsource";
global.EventSource = EventSourceLib.default || EventSourceLib;
async function main() {
  const sseTransport = new SSEClientTransport(new URL("http://localhost:3020/mcp"));
  const client = new Client({ name: "mcp-bridge", version: "1.0.0" }, { capabilities: {} });
  try {
    await client.connect(sseTransport);
    console.error("[MCP Bridge] Connected to Nova Browser SSE server");
  } catch (error) {
    console.error("[MCP Bridge] Error connecting to Nova Browser:", error.message);
    console.error("Make sure Nova Browser is running.");
    process.exit(1);
  }
  const server = new Server({
    name: "nova-browser-mcp",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {}
    }
  });
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const response = await client.listTools();
      return response;
    } catch (e) {
      console.error("[MCP Bridge] Error listing tools:", e);
      return { tools: [] };
    }
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const response = await client.callTool(request.params);
      return response;
    } catch (e) {
      console.error(`[MCP Bridge] Error calling tool ${request.params.name}:`, e);
      return { content: [{ type: "text", text: `Bridge Error: ${e.message}` }], isError: true };
    }
  });
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  console.error("[MCP Bridge] Stdio server running and proxying requests.");
}
main().catch((error) => {
  console.error("[MCP Bridge] Fatal error:", error);
  process.exit(1);
});
