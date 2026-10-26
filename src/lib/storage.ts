import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export const SUPPORTED_AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/m4a': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/flac': '.flac',
  'audio/x-flac': '.flac',
  'audio/ogg': '.ogg',
  'application/ogg': '.ogg',
  'audio/webm': '.webm',
  'video/webm': '.webm'
};

export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export function validateAudioFile(file: { name: string; size: number; type: string }) {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB. Please upload a smaller file or compress the audio.`
    };
  }

  const ext = path.extname(file.name).toLowerCase();
  const supportedExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.webm'];

  const isSupportedMime = !!SUPPORTED_AUDIO_TYPES[file.type.toLowerCase()];
  const isSupportedExt = supportedExtensions.includes(ext);

  if (!isSupportedMime && !isSupportedExt) {
    return {
      valid: false,
      error: `Unsupported audio format "${file.name}". Supported formats: MP3, WAV, M4A, AAC, FLAC, OGG, WebM.`
    };
  }

  return { valid: true };
}

export async function saveUploadedFile(buffer: Buffer, originalFilename: string): Promise<string> {
  await ensureUploadDir();
  const fileExt = path.extname(originalFilename) || '.mp3';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${fileExt}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  await writeFile(filePath, buffer);
  return filename;
}

export function getFilePath(storageKey: string): string {
  return path.join(UPLOAD_DIR, storageKey);
}

export async function deleteFile(storageKey: string): Promise<void> {
  const filePath = getFilePath(storageKey);
  if (fs.existsSync(filePath)) {
    await unlink(filePath);
  }
}

export const getAbsolutePath = getFilePath;
