import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

// Use fixed path so uploads persist across rebuilds (standalone mode uses different cwd)
const UPLOADS_DIR = path.join('/root/Fitness', 'public', 'uploads');
const MAX_SIZE_KB = 500;

export async function ensureUploadDir(subdir: string): Promise<string> {
  const dir = path.join(UPLOADS_DIR, subdir);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveAndCompressImage(
  buffer: Buffer,
  subdir: string,
  filename: string
): Promise<string> {
  const dir = await ensureUploadDir(subdir);
  const outputPath = path.join(dir, filename);

  let quality = 85;
  let output = await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

  // Reduce quality until under MAX_SIZE_KB
  while (output.length > MAX_SIZE_KB * 1024 && quality > 20) {
    quality -= 10;
    output = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
  }

  await fs.writeFile(outputPath, output);

  // Return relative path for DB storage
  return `/uploads/${subdir}/${filename}`;
}

export async function deleteImage(relativePath: string): Promise<void> {
  const fullPath = path.join('/root/Fitness', 'public', relativePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    // File may not exist, ignore
  }
}

export function generateFilename(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}.jpg`;
}
