import type { AttachmentInput, MessageAttachment } from '@codex-local/contracts';
import { ATTACHMENT_LIMITS as limits } from '@codex-local/contracts';
export type DraftAttachment = { id: string; name: string; size: number; state: 'processing' | 'ready' | 'error'; error?: string; input?: AttachmentInput };
const textExtensions = /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|yaml|yml|toml|ini|log|js|jsx|ts|tsx|css|html|htm|py|c|h|cpp|hpp|cs|java|go|rs|sh|ps1|sql|tex|env|gitignore)$/i;
export function attachmentInput(a: MessageAttachment): AttachmentInput { return { name: a.name, kind: a.kind, mimeType: a.mimeType, ...(a.kind === 'text' ? { text: a.text } : { data: a.data }) }; }
export function byteSize(a: AttachmentInput) { return a.kind === 'text' ? new TextEncoder().encode(a.text || '').length : Math.floor((a.data?.length || 0) * 3 / 4) - ((a.data?.endsWith('==') ? 2 : a.data?.endsWith('=') ? 1 : 0)); }
async function asDataURL(blob: Blob): Promise<string> { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error('Não foi possível ler o arquivo.')); r.readAsDataURL(blob); }); }
export async function prepare(file: File): Promise<AttachmentInput> {
  if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    if (file.size > 20 * 1024 * 1024) throw new Error('Imagem original excede o limite de leitura de 20 MiB.');
    const url = URL.createObjectURL(file); const image = new Image();
    try { await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Imagem inválida ou não suportada.')); image.src = url; });
      const w = image.naturalWidth, h = image.naturalHeight; if (!w || !h || w > limits.maxImageDimension || h > limits.maxImageDimension || w * h > limits.maxImagePixels) throw new Error('Imagem excede o limite de dimensões.');
      const scale = Math.min(1, 1536 / Math.max(w, h)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale)); const context = canvas.getContext('2d'); if (!context) throw new Error('Não foi possível processar a imagem.'); context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Não foi possível preparar a imagem.')), file.type, .85)); if (blob.size > limits.maxImageBytes) throw new Error('Imagem preparada excede 4 MiB.'); return { name: file.name || 'imagem.png', kind: 'image', mimeType: file.type, data: (await asDataURL(blob)).split(',')[1] };
    } finally { URL.revokeObjectURL(url); }
  }
  if (!textExtensions.test(file.name) && !file.type.startsWith('text/')) throw new Error('Formato não suportado. Use texto, código, PNG, JPEG ou WebP.');
  if (file.size > limits.maxTextBytes) throw new Error('Arquivo de texto excede 256 KiB.');
  let text: string; try { text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); } catch { throw new Error('Arquivo não é texto UTF-8 válido.'); } if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) throw new Error('Arquivo contém dados binários.');
  return { name: file.name, kind: 'text', mimeType: file.type.startsWith('text/') ? file.type.split(';')[0] : 'text/plain', text };
}
