import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("translation");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
