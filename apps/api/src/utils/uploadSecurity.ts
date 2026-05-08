import { randomUUID } from 'crypto';
import path from 'path';
import { filetypemime } from 'magic-bytes.js';

/**
 * MIMEs e extensões aceitos para upload de imagens.
 * Mantemos uma whitelist fechada — qualquer outro tipo é rejeitado.
 */
const ALLOWED_IMAGE_MIME = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

const ALLOWED_IMAGE_EXTS = new Set<string>([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
]);

// Mapeamento canônico mime → extensão (usado para renomear o arquivo).
const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

export class UnsupportedFileTypeError extends Error {
  constructor(message = 'Tipo de arquivo não suportado') {
    super(message);
    this.name = 'UnsupportedFileTypeError';
  }
}

/**
 * fileFilter para multer. Faz a primeira camada de validação (extensão +
 * mime declarado pelo cliente). A validação real (magic bytes) acontece em
 * `validateAndRenameImage` no handler depois de o buffer estar em memória.
 *
 * Não confiamos em `mimetype` ou `originalname` do cliente — só os usamos
 * como hint para descartar imediatamente arquivos obviamente errados.
 */
export const imageFileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (err: Error | null, accept?: boolean) => void
) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.has(ext)) {
    return cb(new UnsupportedFileTypeError('Extensão de arquivo não permitida (use png, jpg, jpeg ou webp)'));
  }
  if (file.mimetype && !ALLOWED_IMAGE_MIME.has(file.mimetype)) {
    return cb(new UnsupportedFileTypeError('Tipo de imagem não permitido'));
  }
  cb(null, true);
};

export interface SafeImage {
  /** Nome final, seguro, baseado em UUID + extensão real (ex: `f47ac10b-...uuid.png`). */
  filename: string;
  /** Mimetype real detectado a partir dos magic bytes do buffer. */
  mimeType: string;
  /** Buffer original — caller decide onde persistir. */
  buffer: Buffer;
}

/**
 * Valida o conteúdo real do buffer (magic bytes) e devolve um nome de
 * arquivo seguro usando UUID + a extensão derivada do tipo detectado.
 *
 * Lança `UnsupportedFileTypeError` se o conteúdo não bater com a whitelist
 * — mesmo que o cliente tenha enviado mimetype/extensão "ok", se os bytes
 * dizerem outra coisa, rejeitamos.
 */
export async function validateAndRenameImage(
  file: Pick<Express.Multer.File, 'buffer' | 'originalname'>,
  prefix?: string
): Promise<SafeImage> {
  if (!file?.buffer || file.buffer.length === 0) {
    throw new UnsupportedFileTypeError('Arquivo vazio');
  }

  // magic-bytes.js retorna lista de mimes possíveis para os bytes iniciais.
  // Usamos um prefixo de até 4KB — suficiente para todos os formatos de imagem.
  const headBytes = file.buffer.subarray(0, Math.min(file.buffer.length, 4096));
  const detectedMimes = filetypemime(new Uint8Array(headBytes));
  const matchedMime = detectedMimes.find((m: string) => ALLOWED_IMAGE_MIME.has(m));

  if (!matchedMime) {
    throw new UnsupportedFileTypeError(
      'Conteúdo do arquivo não corresponde a uma imagem suportada (png, jpg, jpeg, webp)'
    );
  }

  const ext = MIME_TO_EXT[matchedMime] || '.bin';
  const id = randomUUID();
  const filename = prefix ? `${prefix}-${id}${ext}` : `${id}${ext}`;

  return {
    filename,
    mimeType: matchedMime,
    buffer: file.buffer,
  };
}
