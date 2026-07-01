import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("finance");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
