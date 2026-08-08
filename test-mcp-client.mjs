import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function test() {
  const token = '185b06a7-c869-47f9-bf88-59d6232433ae';
  console.log("Token:", token);

  const transport = new SSEClientTransport(new URL(`http://localhost:3020/sse?token=${token}`));

  const client = new Client({ name: "test", version: "1.0.0" }, { capabilities: {} });
  
  try {
    console.log("Connecting...");
    await client.connect(transport);
    console.log("Connected! Listing tools...");
    const tools = await client.listTools();
    console.log("Tools:", tools);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

test();
