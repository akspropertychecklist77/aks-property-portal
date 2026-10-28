import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { executeRun } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = (formData.get('caseId') as string) || 'GENERAL';
    const category = (formData.get('category') as string) || 'DOCUMENT';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename and create unique timestamped name
    const cleanOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}_${cleanOriginalName}`;

    // Target upload folder in public/uploads/<caseId>
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', caseId);
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, uniqueFileName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${caseId}/${uniqueFileName}`;

    // Persist document record into SQL database
    try {
      await executeRun(
        `INSERT INTO case_documents (id, case_id, file_name, file_category, storage_path, file_size_bytes, is_watermarked)
         VALUES (?, ?, ?, ?, ?, ?, 0);`,
        [`doc_${Date.now()}`, caseId, file.name, category, publicUrl, file.size]
      );
    } catch (dbErr) {
      console.warn('Document DB record notice:', dbErr);
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      storedName: uniqueFileName,
      fileUrl: publicUrl,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    console.error('File Upload Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
