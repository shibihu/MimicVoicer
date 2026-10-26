import { describe, it, expect } from 'vitest';
import {
  formatTimestampSRT,
  formatTimestampVTT,
  generateTXT,
  generateSRT,
  generateVTT,
  generateJSON,
} from '../lib/export';

describe('Export Formatter Utilities', () => {
  it('formats SRT timestamp correctly', () => {
    expect(formatTimestampSRT(0)).toBe('00:00:00,000');
    expect(formatTimestampSRT(65.432)).toBe('00:01:05,432');
    expect(formatTimestampSRT(3665.12)).toBe('01:01:05,120');
  });

  it('formats WebVTT timestamp correctly', () => {
    expect(formatTimestampVTT(0)).toBe('00:00:00.000');
    expect(formatTimestampVTT(65.432)).toBe('00:01:05.432');
  });

  it('generates TXT transcript correctly', () => {
    const segments = [
      { startTime: 0, endTime: 2, text: 'Hello world.' },
      { startTime: 2, endTime: 4, text: 'Welcome to MimicVoicer.' },
    ];
    const txt = generateTXT(segments);
    expect(txt).toBe('Hello world.\n\nWelcome to MimicVoicer.');
  });

  it('generates SRT subtitles correctly', () => {
    const segments = [
      { startTime: 0, endTime: 2.5, text: 'First line.' },
      { startTime: 2.5, endTime: 5.0, text: 'Second line.' },
    ];
    const srt = generateSRT(segments);
    expect(srt).toContain('1\n00:00:00,000 --> 00:00:02,500\nFirst line.');
    expect(srt).toContain('2\n00:00:02,500 --> 00:00:05,000\nSecond line.');
  });

  it('generates WebVTT cues correctly', () => {
    const segments = [
      { startTime: 0, endTime: 2.5, text: 'First line.' },
    ];
    const vtt = generateVTT(segments);
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:00.000 --> 00:00:02.500');
  });

  it('generates JSON export correctly', () => {
    const segments = [
      { startTime: 0, endTime: 2.5, text: 'First line.' },
    ];
    const jsonStr = generateJSON(segments, { title: 'Test' });
    const parsed = JSON.parse(jsonStr);
    expect(parsed.metadata.title).toBe('Test');
    expect(parsed.segments.length).toBe(1);
    expect(parsed.segments[0].start).toBe(0);
  });
});
