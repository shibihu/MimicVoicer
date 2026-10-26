export interface SegmentExport {
  id?: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number | null;
}

export function formatTimestampSRT(seconds: number): string {
  const pad = (num: number, size: number) => num.toString().padStart(size, '0');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.round((seconds - Math.floor(seconds)) * 1000);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(millis, 3)}`;
}

export function formatTimestampVTT(seconds: number): string {
  const pad = (num: number, size: number) => num.toString().padStart(size, '0');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.round((seconds - Math.floor(seconds)) * 1000);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)}.${pad(millis, 3)}`;
}

export function generateTXT(segments: SegmentExport[]): string {
  return segments.map((s) => s.text.trim()).filter(Boolean).join('\n\n');
}

export function generateSRT(segments: SegmentExport[]): string {
  return segments
    .map((s, index) => {
      const startStr = formatTimestampSRT(s.startTime);
      const endStr = formatTimestampSRT(s.endTime);
      return `${index + 1}\n${startStr} --> ${endStr}\n${s.text.trim()}`;
    })
    .join('\n\n');
}

export function generateVTT(segments: SegmentExport[]): string {
  const header = 'WEBVTT\n\n';
  const body = segments
    .map((s, index) => {
      const startStr = formatTimestampVTT(s.startTime);
      const endStr = formatTimestampVTT(s.endTime);
      return `${index + 1}\n${startStr} --> ${endStr}\n${s.text.trim()}`;
    })
    .join('\n\n');

  return header + body;
}

export function generateJSON(segments: SegmentExport[], metadata?: Record<string, unknown>): string {
  return JSON.stringify(
    {
      metadata: metadata || {},
      segments: segments.map((s, i) => ({
        id: s.id || `segment_${(i + 1).toString().padStart(3, '0')}`,
        start: Number(s.startTime.toFixed(3)),
        end: Number(s.endTime.toFixed(3)),
        text: s.text,
        confidence: s.confidence ?? null,
      })),
    },
    null,
    2
  );
}
