import Anthropic from '@anthropic-ai/sdk';
import { buildTrainerSystemPrompt, getChatHistory, saveChatMessage } from '@/lib/ai-trainer';
import { getSessionUserId } from '@/lib/auth';
import { detectAndSaveEquipment } from '@/lib/equipment-from-chat';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  // Auth check — get userId from session
  const userId = await getSessionUserId();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { message, sessionId } = await request.json();

  if (!message || !sessionId) {
    return new Response('Missing message or sessionId', { status: 400 });
  }

  // Save user message
  await saveChatMessage(sessionId, 'user', message, userId);

  // Detect equipment mentions and save them
  const equipmentUpdates = await detectAndSaveEquipment(message, userId);

  // Build system prompt with full user context
  const systemPrompt = await buildTrainerSystemPrompt(userId);

  // Load chat history for context
  const history = await getChatHistory(sessionId, userId);
  const messages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // If equipment was detected, inject a system hint into the last user message
  if (equipmentUpdates.length > 0) {
    const added = equipmentUpdates.filter(e => e.available).map(e => e.name);
    const removed = equipmentUpdates.filter(e => !e.available).map(e => e.name);
    const parts: string[] = [];
    if (added.length > 0) parts.push(`добавлено: ${added.join(', ')}`);
    if (removed.length > 0) parts.push(`отмечено как недоступное: ${removed.join(', ')}`);
    const hint = `\n\n[Система: оборудование пользователя обновлено — ${parts.join('; ')}. Подтверди пользователю что записал и будешь учитывать в программах.]`;

    // Append hint to the last user message
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'user') {
      lastMsg.content = lastMsg.content + hint;
    }
  }

  // Stream response
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  let fullResponse = '';

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // Save assistant response after streaming is complete
        await saveChatMessage(sessionId, 'assistant', fullResponse, userId);

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
