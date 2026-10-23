import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, LLMConnectionError } from '@/lib/llm';
import { DAKSHAN_SYSTEM_PROMPT } from '@/lib/system-prompt';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload' },
        { status: 400 }
      );
    }

    const { messages } = body;

    // Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty messages list. Please provide a valid prompt.' },
        { status: 400 }
      );
    }

    // Sanitize and validate roles and content
    const sanitizedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const msg of messages) {
      if (!msg || typeof msg !== 'object') continue;
      const role = msg.role;
      const content = typeof msg.content === 'string' ? msg.content.trim() : '';

      if ((role === 'user' || role === 'assistant') && content.length > 0) {
        // Safe message length limit to avoid buffer issues
        sanitizedMessages.push({
          role,
          content: content.slice(0, 10000),
        });
      }
    }

    if (sanitizedMessages.length === 0) {
      return NextResponse.json(
        { error: 'Message content cannot be blank. Please enter a question.' },
        { status: 400 }
      );
    }

    // Ensure the last message is from the user
    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1];
    if (lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'The most recent message must be from the user.' },
        { status: 400 }
      );
    }

    // Prepend the system prompt to guide the assistant
    const fullConversation = [
      { role: 'system' as const, content: DAKSHAN_SYSTEM_PROMPT },
      ...sanitizedMessages,
    ];

    // Stream real, dynamic response directly from the LLM provider (Gemini or local server)
    const stream = await streamChatCompletion(fullConversation);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: unknown) {
    console.error('Chat API Error:', error);

    if (error instanceof LLMConnectionError) {
      return NextResponse.json(
        {
          error: error.message,
          baseUrl: error.baseUrl,
          details: error.details,
          hint: 'Verify your GROQ_API_KEY in .env.local or your Vercel Environment Variables dashboard.',
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'An unexpected error occurred while processing your request.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
