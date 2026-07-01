import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("career");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
