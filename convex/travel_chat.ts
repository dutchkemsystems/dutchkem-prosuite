import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("travel");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
