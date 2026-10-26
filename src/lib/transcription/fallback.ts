import { ITranscriptionProvider, TranscribeResult } from './types';
import path from 'path';

export class FallbackTranscriptionProvider implements ITranscriptionProvider {
  name = 'fallback';

  isConfigured(): boolean {
    return true;
  }

  async transcribe(filePath: string, language?: string): Promise<TranscribeResult> {
    const mockSegments = [
      {
        id: 'segment_001',
        start: 0.0,
        end: 2.5,
        text: 'Welcome to MimicVoicer audio transcription studio.',
        confidence: 0.98,
      },
      {
        id: 'segment_002',
        start: 2.5,
        end: 6.2,
        text: 'Every word and every timestamp in this recording is perfectly editable without modifying your original voice audio.',
        confidence: 0.95,
      },
      {
        id: 'segment_003',
        start: 6.2,
        end: 10.4,
        text: 'You can split, merge, adjust timings, and export your transcript in TXT, SRT, VTT, or JSON formats seamlessly.',
        confidence: 0.96,
      },
      {
        id: 'segment_004',
        start: 10.4,
        end: 14.8,
        text: 'Configure OPENAI_API_KEY or DEEPGRAM_API_KEY in your environment for automated cloud speech recognition.',
        confidence: 0.99,
      },
    ];

    const fullText = mockSegments.map((s) => s.text).join(' ');
    const totalDuration = mockSegments[mockSegments.length - 1].end;

    return {
      text: fullText,
      language: language || 'en',
      duration: totalDuration,
      segments: mockSegments,
      provider: 'fallback',
    };
  }
}
