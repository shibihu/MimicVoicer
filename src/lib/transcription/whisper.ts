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
    const duration = data.duration || 0;

    let segments: TranscribeResultSegment[] = (data.segments || []).map((seg: any, index: number) => ({
      id: `segment_${(index + 1).toString().padStart(3, '0')}`,
      start: Number(seg.start.toFixed(3)),
      end: Number(seg.end.toFixed(3)),
      text: seg.text.trim(),
      confidence: seg.no_speech_prob ? Number((1 - seg.no_speech_prob).toFixed(2)) : null,
    }));

    // Fallback if data.segments is empty but data.text is present
    const fullText = (data.text || '').trim();
    if (segments.length === 0 && fullText) {
      const sentenceRegex = /[^.!?\n]+[.!?\n]+/g;
      const matches = fullText.match(sentenceRegex) || [fullText];
      const segmentDuration = duration > 0 ? duration / matches.length : 3.0;

      segments = matches.map((sentence: string, idx: number) => ({
        id: `segment_${(idx + 1).toString().padStart(3, '0')}`,
        start: Number((idx * segmentDuration).toFixed(3)),
        end: Number(((idx + 1) * segmentDuration).toFixed(3)),
        text: sentence.trim(),
        confidence: 0.95,
      }));
    }

    return {
      text: fullText,
      language: data.language || language || 'en',
      duration: duration || (segments.length > 0 ? segments[segments.length - 1].end : 0),
      segments,
      provider: 'whisper',
    };
  }
}
