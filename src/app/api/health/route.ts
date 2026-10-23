import { NextResponse } from 'next/server';
import { checkLLMServerHealth } from '@/lib/llm';

export async function GET() {
  const health = await checkLLMServerHealth();
  return NextResponse.json(health);
}
