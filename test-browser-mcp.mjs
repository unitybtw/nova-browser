import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function test() {
  console.log("Connecting to Browser MCP Server at http://localhost:3020/mcp...");
  
  const transport = new SSEClientTransport(new URL("http://localhost:3020/mcp"));
  const client = new Client(
    { name: "antigravity-tester", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log("✅ Connected successfully!");

    // List tools
    const tools = await client.listTools();
    console.log("Available tools:", tools.tools.map(t => t.name).join(", "));

    // 1. Navigate to Wikipedia
    console.log("\n1️⃣ Navigating to Wikipedia...");
    const navResult = await client.callTool({
      name: "navigate",
      arguments: { url: "https://en.wikipedia.org/wiki/Main_Page" }
    });
    console.log("Navigate result:", navResult.content[0].text);

    // Wait a bit for the page to load
    await new Promise(r => setTimeout(r, 3000));

    // 2. Read page content
    console.log("\n2️⃣ Reading page content...");
    const readResult = await client.callTool({
      name: "read_page_content"
    });
    console.log("Page Content Snippet:", readResult.content[0].text.substring(0, 300) + "...");

    // 3. Run a script to change background color
    console.log("\n3️⃣ Running a script to make the background purple...");
    const scriptResult = await client.callTool({
      name: "run_script",
      arguments: { script: "document.body.style.backgroundColor = '#d8b4fe'; return 'Background changed to purple!';" }
    });
    console.log("Script result:", scriptResult.content[0].text);

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

test();
