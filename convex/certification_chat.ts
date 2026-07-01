import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("certification");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
