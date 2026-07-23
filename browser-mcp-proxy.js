#!/usr/bin/env node

const BROWSER_MCP_URL = "http://localhost:3020";

async function main() {
  const { EventSource } = await import('eventsource');
  const fetch = (await import('node-fetch')).default || global.fetch;

  // 1. Connect to SSE
  const sse = new EventSource(`${BROWSER_MCP_URL}/mcp`);
  let messageEndpoint = '';

  sse.addEventListener('endpoint', (e) => {
    // The server sends the endpoint to POST messages to
    messageEndpoint = new URL(e.data, BROWSER_MCP_URL).href;
  });

  sse.onmessage = (e) => {
    // Forward server messages to stdout
    process.stdout.write(e.data + '\n');
  };

  sse.onerror = (e) => {
    console.error("SSE Error:", e);
    process.exit(1);
  };

  // 2. Read from stdin and forward to SSE
  process.stdin.setEncoding('utf8');
  let buffer = '';

  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim() && messageEndpoint) {
        try {
          await fetch(messageEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: line
          });
        } catch (err) {
          console.error("Failed to forward message:", err.message);
        }
      }
    }
  });

  process.stdin.on('end', () => {
    sse.close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error("Proxy error:", err);
  process.exit(1);
});
