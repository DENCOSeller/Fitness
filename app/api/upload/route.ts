import { NextRequest, NextResponse } from 'next/server';
import { saveAndCompressImage, generateFilename } from '@/lib/upload';
import { getSessionUserId } from '@/lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024; // 20MB raw upload limit

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const subdir = (formData.get('subdir') as string) || 'meals';

    if (!file) {
      return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 });
    }

    // Allow image/* types + application/octet-stream (iPhone sometimes sends this)
    const isImage = file.type.startsWith('image/') || ALLOWED_TYPES.includes(file.type);
    const isOctetStream = file.type === 'application/octet-stream' || file.type === '';
    if (!isImage && !isOctetStream) {
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
