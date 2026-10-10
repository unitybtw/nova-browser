import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// This handler internally creates and manages the MLCEngine,
// routing all messages from the main thread (CreateWebWorkerMLCEngine)
// to the actual WebGL-accelerated engine instance.
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  if (msg.origin && self.location?.origin && msg.origin !== self.location.origin) {
    return;
  }
  handler.onmessage(msg);
};
