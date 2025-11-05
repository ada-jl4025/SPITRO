import { NextRequest, NextResponse } from 'next/server';
import { aiClient } from '@/lib/ai-client';
import type { ApiResponse } from '@/types';
import type { NLPJourneyIntent } from '@/lib/schemas/nlp-response';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json<ApiResponse>({
        status: 'error',
        error: 'Query is required',
      }, { status: 400 });
    }

    if (query.trim().length < 3) {
      return NextResponse.json<ApiResponse>({
        status: 'error',
        error: 'Query is too short',
      }, { status: 400 });
    }

    // Parse the query with Azure OpenAI
    const intent: NLPJourneyIntent = await aiClient.parseJourneyIntent(query);

    // If confidence is very low, suggest alternatives
    if (intent.intent_confidence < 0.3) {
      return NextResponse.json<ApiResponse>({
        status: 'error',
        error: 'Low confidence in understanding',
        data: {
          intent,
          suggestions: [
            'Try being more specific about your journey',
            'Include both start and destination if possible',
            'Use station names or landmarks',
          ],
        },
      });
    }

    // Generate clarifying questions if there are ambiguities
    let clarifyingQuestions: string[] = [];
    if (intent.ambiguities && intent.ambiguities.length > 0) {
      clarifyingQuestions = await aiClient.clarifyAmbiguousQuery(query, intent.ambiguities);
    }

    return NextResponse.json<ApiResponse>({
      status: 'success',
      data: {
        intent,
        clarifyingQuestions,
      },
    });

  } catch (error) {
    console.error('NLP parsing error:', error);
    
    return NextResponse.json<ApiResponse>({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to parse query',
    }, { status: 500 });
  }
}
