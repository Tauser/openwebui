import { randomUUID } from 'node:crypto';
import { ATTACHMENT_LIMITS as L } from '@codex-local/contracts';
import type { MessageAttachment } from '@codex-local/contracts';

function dimensions(bytes: Buffer, mime: string): [number, number] | undefined {
    if (mime === 'image/png' && bytes.length >= 24 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii',12,16) === 'IHDR') return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
    if (mime === 'image/webp' && bytes.length >= 30 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') {
        const type = bytes.toString('ascii',12,16);
        if (type === 'VP8X') return [1+bytes.readUIntLE(24,3),1+bytes.readUIntLE(27,3)];
        if (type === 'VP8L' && bytes[20] === 0x2f) { const v=bytes.readUInt32LE(21); return [(v&0x3fff)+1,((v>>>14)&0x3fff)+1]; }
        if (type === 'VP8 ' && bytes[23]===0x9d && bytes[24]===1 && bytes[25]===0x2a) return [bytes.readUInt16LE(26)&0x3fff,bytes.readUInt16LE(28)&0x3fff];
    }
    if (mime === 'image/jpeg' && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        let i=2; while (i+4 <= bytes.length) { if (bytes[i++] !== 0xff) return; while (bytes[i]===0xff) i++; const marker=bytes[i++]; if (marker===0xd9 || marker===0xda) break; if (marker===0x01 || marker>=0xd0 && marker<=0xd7) continue; if (i+2>bytes.length) return; const length=bytes.readUInt16BE(i); if (length<2 || i+length>bytes.length) return; if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length>=7) return [bytes.readUInt16BE(i+5),bytes.readUInt16BE(i+3)]; i+=length; }
    }
}
export function validateAttachments(input: unknown): MessageAttachment[] {
    if (input === undefined) return [];
    if (!Array.isArray(input) || input.length > L.maxItems) throw new Error('Quantidade de anexos inválida');
    let total=0;
    return input.map(value => {
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['name','kind','mimeType','text','data'].includes(key))) throw new Error('Anexo inválido');
        const {name,kind,mimeType,text,data}=value;
        if (typeof name !== 'string' || !name.trim() || name.length>255 || /[/\\\x00-\x1f]/.test(name) || name === '.' || name === '..' || typeof mimeType !== 'string' || mimeType.length>255) throw new Error('Nome ou tipo de anexo inválido');
        if (kind === 'text') {
            if (typeof text !== 'string' || data !== undefined || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text) || !(mimeType.startsWith('text/') || ['application/json','application/javascript','application/xml','application/toml','application/yaml','application/sql','application/x-powershell','application/x-sh'].includes(mimeType))) throw new Error('Texto de anexo inválido');
            const encoded=Buffer.from(text,'utf8'); if (encoded.toString('utf8') !== text || encoded.length > L.maxTextBytes) throw new Error('Texto de anexo excede o limite ou não é UTF-8 válido');
            total+=encoded.length; if (total>L.maxTotalBytes) throw new Error('Anexos excedem o limite total');
            return {id:randomUUID(),name:name.trim(),kind,mimeType,text,size:encoded.length};
        }
        if (kind !== 'image' || text !== undefined || typeof data !== 'string' || !['image/png','image/jpeg','image/webp'].includes(mimeType)) throw new Error('Imagem inválida');
        if (data.length > Math.ceil(L.maxImageBytes/3)*4) throw new Error('Imagem excede o limite');
        if (data.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(data)) throw new Error('Imagem inválida');
        const bytes=Buffer.from(data,'base64'); if (!bytes.length || bytes.length>L.maxImageBytes || bytes.toString('base64')!==data) throw new Error('Imagem inválida');
        const size=dimensions(bytes,mimeType); if (!size || !size[0] || !size[1] || size[0]>L.maxImageDimension || size[1]>L.maxImageDimension || size[0]*size[1]>L.maxImagePixels) throw new Error('Dimensões ou formato da imagem inválidos');
        total+=bytes.length; if (total>L.maxTotalBytes) throw new Error('Anexos excedem o limite total');
        return {id:randomUUID(),name:name.trim(),kind,mimeType,data,size:bytes.length,width:size[0],height:size[1]};
    });
}
