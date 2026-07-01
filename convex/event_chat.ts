import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("event");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
