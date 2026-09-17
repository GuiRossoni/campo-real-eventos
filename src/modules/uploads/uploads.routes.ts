import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { ENV } from '../../config/env';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { success: false, error: 'Limite de uploads atingido. Aguarde alguns minutos.' }
});

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

/**
 * Valida os magic bytes (assinatura) da imagem para garantir que o arquivo seja uma imagem real
 */
function isValidImageSignature(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 12) return false;

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return true;
  }

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }

  // WEBP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return true;
  }

  return false;
}

router.post(
  '/api/uploads/banner',
  uploadLimiter,
  requireAuth,
  requireRole('ORGANIZADOR', 'COORDENADOR', 'ROOT'),
  async (req, res) => {
    try {
      const { filename, data, mimeType } = req.body;

      if (!data) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum dado de imagem foi enviado.'
        });
      }

      // Extrai o conteúdo em base64 e o tipo MIME detectado
      let base64Data = data;
      let detectedMime = mimeType;

      if (data.startsWith('data:')) {
        const match = data.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
        if (match) {
          detectedMime = match[1];
          base64Data = match[2];
        }
      }

      if (detectedMime && !ALLOWED_MIME_TYPES.includes(detectedMime.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: 'Formato de imagem não suportado. Por favor, envie uma imagem nos formatos PNG, JPG ou WEBP.'
        });
      }

      const buffer = Buffer.from(base64Data, 'base64');

      // Verificação de limite máximo de tamanho
      const maxSizeBytes = ENV.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
      if (buffer.length > maxSizeBytes) {
        return res.status(400).json({
          success: false,
          error: `O arquivo enviado excede o limite máximo permitido de ${ENV.MAX_UPLOAD_SIZE_MB}MB.`
        });
      }

      // Determina a extensão
      let ext = path.extname(filename || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        if (detectedMime === 'image/png') ext = '.png';
        else if (detectedMime === 'image/webp') ext = '.webp';
        else ext = '.jpg';
      }

      // Valida os magic bytes
      if (!isValidImageSignature(buffer, ext)) {
        return res.status(400).json({
          success: false,
          error: 'O arquivo enviado não é uma imagem válida (assinatura binária inválida).'
        });
      }

      const cleanBaseName = path.basename(filename || 'banner', ext)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 30);

      const safeFilename = `banner_${Date.now()}_${cleanBaseName}${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'banners');

      await fs.promises.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, safeFilename);
      await fs.promises.writeFile(filePath, buffer);

      const publicUrl = `/uploads/banners/${safeFilename}`;

      return res.json({
        success: true,
        url: publicUrl,
        filename: safeFilename,
        size: buffer.length
      });
    } catch (error: any) {
      console.error('Erro ao salvar banner do evento:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar o upload do banner.'
      });
    }
  }
);

export default router;
