import { createChatModule } from "./agents/chat_factory";
const mod = createChatModule("exam_career");
export const { createThread, sendMessage, generateResponse, listMessages, generateSimpleResponse } = mod;
