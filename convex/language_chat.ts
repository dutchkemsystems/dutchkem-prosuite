import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("language");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
