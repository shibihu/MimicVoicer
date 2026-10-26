import { describe, it, expect } from 'vitest';
import { transcriptionService } from '../lib/transcription';

describe('Transcription Service Abstraction', () => {
  it('returns available STT providers', () => {
    const providers = transcriptionService.getAvailableProviders();
    expect(providers.length).toBeGreaterThanOrEqual(3);
    const names = providers.map((p) => p.name);
    expect(names).toContain('fallback');
    expect(names).toContain('whisper');
    expect(names).toContain('deepgram');
  });

  it('falls back to Fallback provider when API keys are not configured', async () => {
    const result = await transcriptionService.transcribe('dummy.mp3', 'whisper');
    expect(result.provider).toBe('fallback');
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.text).toContain('MimicVoicer');
  });
});
