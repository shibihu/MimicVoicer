import { ITranscriptionProvider, TranscribeResult, TranscribeResultSegment } from './types';
import fs from 'fs';
import path from 'path';

export class WhisperTranscriptionProvider implements ITranscriptionProvider {
  name = 'whisper';

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
  }

  async transcribe(filePath: string, language?: string): Promise<TranscribeResult> {
    if (!this.isConfigured()) {
      throw new Error('OPENAI_API_KEY is not configured in environment variables.');
    }

    const apiKey = process.env.OPENAI_API_KEY!;
    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), filename);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    if (language && language !== 'auto') {
      formData.append('language', language);
    }

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI Whisper API error (${res.status}): ${errText}`);
    }

    const data = await res.json();

    const segments: TranscribeResultSegment[] = (data.segments || []).map((seg: any, index: number) => ({
      id: `segment_${(index + 1).toString().padStart(3, '0')}`,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      confidence: seg.no_speech_prob ? 1 - seg.no_speech_prob : null,
    }));

    return {
      text: data.text || '',
      language: data.language || language || 'en',
      duration: data.duration || (segments.length > 0 ? segments[segments.length - 1].end : 0),
      segments,
      provider: 'whisper',
    };
  }
}
