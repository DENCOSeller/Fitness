'use server';

import { getChatHistory, getChatSessions, deleteChatSession } from '@/lib/ai-trainer';

export async function loadChatHistory(sessionId: string) {
  return getChatHistory(sessionId);
}

export async function loadChatSessions() {
  return getChatSessions();
}

export async function clearChat(sessionId: string) {
  await deleteChatSession(sessionId);
}
