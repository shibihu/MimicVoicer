export interface TranscribeResultSegment {
  id?: string;
  start: number;
  end: number;
  text: string;
  confidence?: number | null;
}

export interface TranscribeResult {
  text: string;
  language?: string;
  duration?: number;
  segments: TranscribeResultSegment[];
  provider: string;
}

export interface ITranscriptionProvider {
  name: string;
  isConfigured(): boolean;
  transcribe(filePath: string, language?: string): Promise<TranscribeResult>;
}
