import { NextRequest, NextResponse } from 'next/server';
import { aiClient } from '@/lib/ai-client';

export const runtime = 'nodejs';

const LONDON_TRANSCRIPTION_PROMPT = `You are transcribing voice commands for Transport for London journey planning.
Focus on accurately capturing London place names, station names, and landmarks.
Return only the transcribed text without additional commentary.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'No audio file provided',
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const filename = (audioFile as File).name || 'voice-input.webm';
    const mimeType = audioFile.type || 'audio/webm';

    const transcription = await aiClient.transcribeAudio(
      arrayBuffer,
      filename,
      mimeType,
      LONDON_TRANSCRIPTION_PROMPT
    );

    return NextResponse.json({
      status: 'success',
      data: {
        text: transcription,
      },
    });
  } catch (error) {
    console.error('Transcription error:', error);

    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to transcribe audio',
      },
      { status: 500 }
    );
  }
}

