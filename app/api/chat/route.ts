import Anthropic from '@anthropic-ai/sdk';
import { buildTrainerSystemPrompt, getChatHistory, saveChatMessage } from '@/lib/ai-trainer';
import { cookies } from 'next/headers';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  // Auth check
  const cookieStore = await cookies();
  const session = cookieStore.get('session');
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { message, sessionId } = await request.json();

  if (!message || !sessionId) {
    return new Response('Missing message or sessionId', { status: 400 });
  }

  // Save user message
  await saveChatMessage(sessionId, 'user', message);

  // Build system prompt with full user context
  const systemPrompt = await buildTrainerSystemPrompt();

  // Load chat history for context
  const history = await getChatHistory(sessionId);
  const messages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

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
        await saveChatMessage(sessionId, 'assistant', fullResponse);

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
