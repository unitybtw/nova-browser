"use client";

import { PromptInput } from "@/components/ui/ai-chat-input";

export default function Demo() {
  const handleSendMessage = (
    message: string,
    meta: { model: string; effort: string; attachments: File[] }
  ) => {
    console.log("Message Submitted:", message);
    console.log("Submission Meta:", meta);
  };

  return (
    <div 
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(125% 125% at 50% 101%, rgba(245,87,2,1) 10.5%, rgba(245,120,2,1) 16%, rgba(245,140,2,1) 17.5%, rgba(245,170,100,1) 25%, rgba(238,174,202,1) 40%, rgba(202,179,214,1) 65%, rgba(148,201,233,1) 100%)"
      }}
    >
      <div className="p-4 w-full max-w-lg flex justify-center z-10">
        <PromptInput
          onSubmit={handleSendMessage}
          placeholder="Ask anything..."
        />
      </div>
    </div>
  );
}
