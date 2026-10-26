import { ITranscriptionProvider, TranscribeResult, TranscribeResultSegment } from './types';
import fs from 'fs';

export class DeepgramTranscriptionProvider implements ITranscriptionProvider {
  name = 'deepgram';

  isConfigured(): boolean {
    return !!process.env.DEEPGRAM_API_KEY && process.env.DEEPGRAM_API_KEY.trim() !== '';
  }

  async transcribe(filePath: string, language?: string): Promise<TranscribeResult> {
    if (!this.isConfigured()) {
      throw new Error('DEEPGRAM_API_KEY is not configured in environment variables.');
    }

    const apiKey = process.env.DEEPGRAM_API_KEY!;
    const fileBuffer = fs.readFileSync(filePath);

    const langParam = language && language !== 'auto' ? `&language=${encodeURIComponent(language)}` : '';
    const url = `https://api.deepgram.com/v1/listen?punctuate=true&utterances=true${langParam}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'audio/*',
      },
      body: fileBuffer,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Deepgram API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const utterances = data?.results?.utterances || [];

    let segments: TranscribeResultSegment[] = [];

    if (utterances.length > 0) {
      segments = utterances.map((u: any, index: number) => ({
        id: `segment_${(index + 1).toString().padStart(3, '0')}`,
        start: u.start,
        end: u.end,
        text: u.transcript.trim(),
        confidence: u.confidence ?? null,
      }));
    } else {
      const alt = data?.results?.channels[0]?.alternatives[0];
      if (alt && alt.transcript) {
        segments = [
          {
            id: 'segment_001',
            start: 0,
            end: data.metadata?.duration || 0,
            text: alt.transcript.trim(),
            confidence: alt.confidence ?? null,
          },
        ];
      }
    }

    const fullText = segments.map((s) => s.text).join(' ');

    return {
      text: fullText,
      language: language || 'en',
      duration: data.metadata?.duration || (segments.length > 0 ? segments[segments.length - 1].end : 0),
      segments,
      provider: 'deepgram',
    };
  }
}
