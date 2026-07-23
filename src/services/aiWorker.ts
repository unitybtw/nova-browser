import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// A handler that encapsulates the logic for the background worker
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
