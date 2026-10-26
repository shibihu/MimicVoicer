import { describe, it, expect } from 'vitest';
import { validateAudioFile, MAX_FILE_SIZE_BYTES } from '../lib/storage';

describe('Audio File Validation', () => {
  it('validates supported MP3 audio file', () => {
    const file = { name: 'sample.mp3', size: 1024 * 1024, type: 'audio/mpeg' };
    const res = validateAudioFile(file);
    expect(res.valid).toBe(true);
  });

  it('validates supported WAV audio file by extension', () => {
    const file = { name: 'recording.wav', size: 5 * 1024 * 1024, type: '' };
    const res = validateAudioFile(file);
    expect(res.valid).toBe(true);
  });

  it('rejects unsupported file extension', () => {
    const file = { name: 'document.pdf', size: 1024, type: 'application/pdf' };
    const res = validateAudioFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Unsupported audio format');
  });

  it('rejects file exceeding max file size limit', () => {
    const file = { name: 'large.mp3', size: MAX_FILE_SIZE_BYTES + 1, type: 'audio/mpeg' };
    const res = validateAudioFile(file);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('File size exceeds');
  });
});
