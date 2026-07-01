import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("content");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
