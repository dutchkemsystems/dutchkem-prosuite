import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("video");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
