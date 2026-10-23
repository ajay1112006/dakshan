import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, LLMConnectionError } from '@/lib/llm';
import { WASTE_AWARENESS_SYSTEM_PROMPT } from '@/lib/system-prompt';

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
        // Enforce max individual message length to avoid memory strain
        sanitizedMessages.push({
          role,
          content: content.slice(0, 4000),
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

    // Server-side scope enforcement: check if clearly off-topic
    if (isClearlyOffTopic(lastMessage.content)) {
      const refusalStream = createRefusalStream();
      return new Response(refusalStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // Prepend the server-side system prompt.
    // The client NEVER receives or defines this system prompt.
    const fullConversation = [
      { role: 'system' as const, content: WASTE_AWARENESS_SYSTEM_PROMPT },
      ...sanitizedMessages,
    ];

    // Stream response from the LLM provider
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
          hint: 'Verify that your local GGUF server (e.g., llama.cpp server or Ollama) is running on the specified URL.',
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

/**
 * Checks if a user's question falls clearly outside waste management.
 */
function isClearlyOffTopic(query: string): boolean {
  const lower = query.toLowerCase().trim();

  // If query mentions any waste, sorting, disposal, or materials term, it's ON topic
  const wasteKeywords = [
    'waste', 'recycle', 'recycling', 'compost', 'trash', 'garbage', 'bin', 'dispos',
    'landfill', 'hazard', 'battery', 'batteries', 'plastic', 'cardboard', 'paper', 'glass',
    'metal', 'can', 'aluminum', 'bottle', 'box', 'food', 'scrap', 'organic', 'soil',
    'electronics', 'e-waste', 'styrofoam', 'wrap', 'carton', 'jar', 'tin', 'leaves',
    'yard', 'eco', 'sustainable', 'environment', 'pollut', 'sorting', 'sort', 'decompose',
    'biodegrad', 'dump', 'rubbish', 'cup', 'lid', 'clean', 'rinse'
  ];

  if (wasteKeywords.some((w) => lower.includes(w))) {
    return false;
  }

  // Obvious non-waste domain keywords
  const offTopicRegexes = [
    /\b(python|javascript|typescript|c\+\+|java|html|css|sql|react|node|rust|golang|code|coding|function|algorithm|fibonacci|binary search|regex)\b/i,
    /\b(crypto|bitcoin|stock market|forex|investing|wall street)\b/i,
    /\b(president|prime minister|election|senate|congress|democrat|republican)\b/i,
    /\b(celebrity|actor|movie recommendation|song lyrics|sing a song|write a poem|write an essay|joke)\b/i,
    /\b(capital of|who won|world cup|super bowl|nba|football score)\b/i,
    /\b(math|calculus|derivative|integral|solve for x|equation)\b/i,
  ];

  return offTopicRegexes.some((regex) => regex.test(lower));
}

/**
 * Streams a polite redirection message back to the client.
 */
function createRefusalStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const refusalText =
    "I am an AI assistant dedicated specifically to waste awareness and sorting. I cannot help with topics outside of waste management, but I would be glad to help you find the right bin, recycling method, or disposal option for any household material or product!\n\nFeel free to ask about items like pizza boxes, electronics, batteries, plastics, or composting.";

  const chunks = refusalText.match(/.{1,14}/g) || [refusalText];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      controller.close();
    },
  });
}

