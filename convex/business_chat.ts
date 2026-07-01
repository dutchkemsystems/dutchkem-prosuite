import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("business");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
