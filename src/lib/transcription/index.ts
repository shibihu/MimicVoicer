import { ITranscriptionProvider, TranscribeResult } from './types';
import { WhisperTranscriptionProvider } from './whisper';
import { DeepgramTranscriptionProvider } from './deepgram';
import { FallbackTranscriptionProvider } from './fallback';

export * from './types';

export class TranscriptionService {
  private providers: Map<string, ITranscriptionProvider> = new Map();

  constructor() {
    const whisper = new WhisperTranscriptionProvider();
    const deepgram = new DeepgramTranscriptionProvider();
    const fallback = new FallbackTranscriptionProvider();

    this.providers.set(whisper.name, whisper);
    this.providers.set(deepgram.name, deepgram);
    this.providers.set(fallback.name, fallback);
  }

  public getAvailableProviders(): { name: string; configured: boolean }[] {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      configured: p.isConfigured(),
    }));
  }

  public async transcribe(filePath: string, preferredProvider?: string, language?: string): Promise<TranscribeResult> {
    const defaultProvider = process.env.DEFAULT_TRANSCRIPTION_PROVIDER || 'whisper';
    const targetProviderName = preferredProvider || defaultProvider;

    const provider = this.providers.get(targetProviderName);

    if (provider && provider.isConfigured()) {
      return await provider.transcribe(filePath, language);
    }

    for (const [name, p] of this.providers.entries()) {
      if (p.isConfigured()) {
        console.warn(`Provider "${targetProviderName}" requested but not configured. Falling back to "${name}".`);
        return await p.transcribe(filePath, language);
      }
    }

    const fallbackProvider = this.providers.get('fallback')!;
    return await fallbackProvider.transcribe(filePath, language);
  }
}

export const transcriptionService = new TranscriptionService();
