import Anthropic from '@anthropic-ai/sdk';
import { buildTrainerSystemPrompt, getChatHistory, saveChatMessage } from '@/lib/ai-trainer';
import { getSessionUserId } from '@/lib/auth';
import { detectAndSaveEquipment } from '@/lib/equipment-from-chat';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const workoutPlanTool: Anthropic.Tool = {
  name: 'create_workout_plan',
  description: 'Создать структурированный план тренировки. Вызывай этот инструмент КАЖДЫЙ раз, когда составляешь план тренировки для пользователя.',
  input_schema: {
    type: 'object' as const,
    properties: {
      workout_type: {
        type: 'string',
        enum: ['Силовая', 'Кардио', 'Растяжка', 'Своё'],
        description: 'Тип тренировки',
      },
      exercises: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Название упражнения из каталога' },
            sets: { type: 'integer', description: 'Количество подходов' },
            reps: { type: 'integer', description: 'Количество повторений' },
            weight_kg: { type: 'number', description: 'Рекомендуемый вес в кг (0 для bodyweight)' },
            rest_seconds: { type: 'integer', description: 'Отдых между подходами в секундах' },
          },
          required: ['name', 'sets', 'reps'],
        },
        description: 'Список упражнений в плане',
      },
    },
    required: ['workout_type', 'exercises'],
  },
};

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { message, sessionId } = await request.json();

  if (!message || !sessionId) {
    return new Response('Missing message or sessionId', { status: 400 });
  }

  await saveChatMessage(sessionId, 'user', message, userId);

  const equipmentUpdates = await detectAndSaveEquipment(message, userId);

  const systemPrompt = await buildTrainerSystemPrompt(userId);

  const history = await getChatHistory(sessionId, userId);
  const messages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  if (equipmentUpdates.length > 0) {
    const added = equipmentUpdates.filter(e => e.available).map(e => e.name);
    const removed = equipmentUpdates.filter(e => !e.available).map(e => e.name);
    const parts: string[] = [];
    if (added.length > 0) parts.push(`добавлено: ${added.join(', ')}`);
    if (removed.length > 0) parts.push(`отмечено как недоступное: ${removed.join(', ')}`);
    const hint = `\n\n[Система: оборудование пользователя обновлено — ${parts.join('; ')}. Подтверди пользователю что записал и будешь учитывать в программах.]`;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'user') {
      lastMsg.content = lastMsg.content + hint;
    }
  }

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
    tools: [workoutPlanTool],
  });

  let fullResponse = '';
  let toolUseData: { name: string; input: Record<string, unknown> } | null = null;
  let toolUseJson = '';
  let inToolUse = false;

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              inToolUse = true;
              toolUseJson = '';
            }
          }

          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            } else if (event.delta.type === 'input_json_delta' && inToolUse) {
              toolUseJson += event.delta.partial_json;
            }
          }

          if (event.type === 'content_block_stop' && inToolUse) {
            inToolUse = false;
            try {
              const input = JSON.parse(toolUseJson);
              toolUseData = { name: 'create_workout_plan', input };
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ tool_use: toolUseData })}\n\n`,
              ));
            } catch {
              // JSON parse failed — ignore tool use
            }
          }
        }

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
