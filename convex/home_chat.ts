import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("home");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
