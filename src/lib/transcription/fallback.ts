import { ITranscriptionProvider, TranscribeResult } from './types';

export class FallbackTranscriptionProvider implements ITranscriptionProvider {
  name = 'fallback';

  isConfigured(): boolean {
    return true;
  }

  async transcribe(filePath: string, language?: string): Promise<TranscribeResult> {
    const isThai = language === 'th';

    const mockSegments = isThai
      ? [
          {
            id: 'segment_001',
            start: 0.0,
            end: 3.2,
            text: 'ยินดีต้อนรับสู่ MimicVoicer สตูดิโอถอดความเสียงแบบโต้ตอบ',
            confidence: 0.98,
          },
          {
            id: 'segment_002',
            start: 3.2,
            end: 7.5,
            text: 'คุณสามารถแก้ไขข้อความและประทับเวลาได้โดยไม่ทำให้ไฟล์เสียงต้นฉบับเสียหาย',
            confidence: 0.96,
          },
          {
            id: 'segment_003',
            start: 7.5,
            end: 11.8,
            text: 'รองรับการส่งออกไฟล์ถอดความในรูปแบบ TXT, SRT, VTT และ JSON ได้อย่างสมบูรณ์',
            confidence: 0.97,
          },
          {
            id: 'segment_004',
            start: 11.8,
            end: 16.0,
            text: 'กำหนดค่า DEEPGRAM_API_KEY หรือ OPENAI_API_KEY เพื่อเปิดใช้งานระบบจดจำเสียงระบบคลาวด์',
            confidence: 0.99,
          },
        ]
      : [
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
      language: language || (isThai ? 'th' : 'en'),
      duration: totalDuration,
      segments: mockSegments,
      provider: 'fallback',
    };
  }
}
