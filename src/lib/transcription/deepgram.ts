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

    const queryParams = new URLSearchParams();
    queryParams.append('model', 'nova-2');
    queryParams.append('smart_format', 'true');
    queryParams.append('punctuate', 'true');
    queryParams.append('utterances', 'true');

    if (language && language !== 'auto') {
      queryParams.append('language', language);
    } else {
      queryParams.append('detect_language', 'true');
    }

    const url = `https://api.deepgram.com/v1/listen?${queryParams.toString()}`;

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
    const duration = data.metadata?.duration || 0;
    const detectedLang = data.results?.channels?.[0]?.detected_language || language || 'en';

    let segments: TranscribeResultSegment[] = [];

    // 1. Try utterances
    const utterances = data?.results?.utterances || [];
    if (utterances.length > 0) {
      segments = utterances.map((u: any, index: number) => ({
        id: `segment_${(index + 1).toString().padStart(3, '0')}`,
        start: Number(u.start.toFixed(3)),
        end: Number(u.end.toFixed(3)),
        text: u.transcript.trim(),
        confidence: u.confidence ?? null,
      }));
    }

    // 2. Try paragraphs / sentences if utterances were empty
    if (segments.length === 0) {
      const paragraphs = data?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs || [];
      let segIdx = 1;
      for (const p of paragraphs) {
        for (const s of p.sentences || []) {
          if (s.text && s.text.trim()) {
            segments.push({
              id: `segment_${segIdx.toString().padStart(3, '0')}`,
              start: Number(s.start.toFixed(3)),
              end: Number(s.end.toFixed(3)),
              text: s.text.trim(),
              confidence: s.confidence ?? null,
            });
            segIdx++;
          }
        }
      }
    }

    // 3. Try grouping word-level timestamps if still empty
    const alt = data?.results?.channels?.[0]?.alternatives?.[0];
    const words = alt?.words || [];

    if (segments.length === 0 && words.length > 0) {
      const chunkSize = 10;
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunkWords = words.slice(i, i + chunkSize);
        const startTime = chunkWords[0].start;
        const endTime = chunkWords[chunkWords.length - 1].end;
        const text = chunkWords.map((w: any) => w.punctuated_word || w.word).join(' ');

        segments.push({
          id: `segment_${(Math.floor(i / chunkSize) + 1).toString().padStart(3, '0')}`,
          start: Number(startTime.toFixed(3)),
          end: Number(endTime.toFixed(3)),
          text: text.trim(),
          confidence: chunkWords[0].confidence ?? null,
        });
      }
    }

    // 4. Try full transcript fallback if segments are still empty
    const fullTranscript = alt?.transcript?.trim();
    if (segments.length === 0 && fullTranscript) {
      // Split full transcript by sentence delimiters or line breaks
      const sentenceRegex = /[^.!?\n]+[.!?\n]+/g;
      const matches = fullTranscript.match(sentenceRegex) || [fullTranscript];

      const segmentDuration = duration > 0 ? duration / matches.length : 3.0;

      segments = matches.map((sentence: string, idx: number) => ({
        id: `segment_${(idx + 1).toString().padStart(3, '0')}`,
        start: Number((idx * segmentDuration).toFixed(3)),
        end: Number(((idx + 1) * segmentDuration).toFixed(3)),
        text: sentence.trim(),
        confidence: alt?.confidence ?? null,
      }));
    }

    const fullText = segments.map((s) => s.text).join(' ') || fullTranscript || '';

    return {
      text: fullText,
      language: detectedLang,
      duration: duration || (segments.length > 0 ? segments[segments.length - 1].end : 0),
      segments,
      provider: 'deepgram',
    };
  }
}
