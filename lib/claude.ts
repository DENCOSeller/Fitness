import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function askClaude(prompt: string, model = 'claude-sonnet-4-6', maxTokens = 1024): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type === 'text') {
    return block.text;
  }
  throw new Error('Unexpected response type from Claude');
}

export async function askClaudeVision(
  prompt: string,
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg',
  model = 'claude-sonnet-4-6'
): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  const block = response.content[0];
  if (block.type === 'text') {
    return block.text;
  }
  throw new Error('Unexpected response type from Claude');
}
