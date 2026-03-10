import { NextRequest, NextResponse } from 'next/server';
import { saveAndCompressImage, generateFilename } from '@/lib/upload';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // 20MB raw upload limit

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const subdir = (formData.get('subdir') as string) || 'meals';

    if (!file) {
      return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Поддерживаются только изображения (JPEG, PNG, WebP, HEIC)' }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой (макс. 20 МБ)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = generateFilename(subdir);
    const path = await saveAndCompressImage(buffer, subdir, filename);

    return NextResponse.json({ path });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 });
  }
}
