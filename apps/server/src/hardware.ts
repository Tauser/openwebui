import { totalmem, freemem } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { HardwareAssessment, ModelRecommendations } from '@codex-local/contracts';

const GiB = 1024 ** 3;
const execFileAsync = promisify(execFile);
export type RunningModel = { name: string; size: number; sizeVram: number; contextLength?: number };
export type MemorySnapshot = { ramTotal: number; ramFree: number; gpu: { name: string; total: number; free: number } | null; running: RunningModel[] };

export async function readMemory(running: RunningModel[], signal?: AbortSignal): Promise<MemorySnapshot> {
    let gpu: MemorySnapshot['gpu'] = null;
    try {
        const { stdout } = await execFileAsync('nvidia-smi', ['--query-gpu=name,memory.total,memory.free', '--format=csv,noheader,nounits'], { timeout: 2000, windowsHide: true, maxBuffer: 65536, signal });
        const candidates = stdout.trim().split(/\r?\n/).map(line => {
            const parts = line.split(',').map(part => part.trim());
            const total = Number(parts.at(-2)) * 1024 ** 2;
            const free = Number(parts.at(-1)) * 1024 ** 2;
            return { name: parts.slice(0, -2).join(', '), total, free };
        }).filter(item => item.name && Number.isFinite(item.total) && item.total > 0 && Number.isFinite(item.free) && item.free >= 0 && item.free <= item.total);
        gpu = candidates.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))[0] ?? null;
    } catch { /* nvidia-smi is optional; GPU memory is unknown. */ }
    return { ramTotal: totalmem(), ramFree: freemem(), gpu, running };
}

export function assessHardware(rec: ModelRecommendations | null, memory: MemorySnapshot | null, requested?: number): { effectiveNumCtx: number; hardware: HardwareAssessment } {
    const size = rec?.modelSizeBytes && rec.modelSizeBytes > 0 ? rec.modelSizeBytes : null;
    const unknown = (reason: string): { effectiveNumCtx: number; hardware: HardwareAssessment } => ({
        effectiveNumCtx: requested ?? Math.min(rec?.contextLimit || Infinity, 2048),
        hardware: { ramTotalBytes: memory?.ramTotal ?? null, ramAvailableBytes: memory?.ramFree ?? null, gpuName: null, gpuTotalBytes: null, gpuAvailableBytes: null, modelSizeBytes: size, contextCap: Math.min(rec?.contextLimit || Infinity, 2048), execution: 'unknown', canRun: null, estimated: true, reason },
    });
    if (!memory) return unknown('Hardware remoto indisponível; contexto conservador de 2048 tokens, sem garantia de execução.');
    if (!size) return unknown('Tamanho do modelo indisponível; contexto conservador de 2048 tokens, sem garantia de execução.');
    const kv = rec?.kvBytesPerToken && rec.kvBytesPerToken > 0 ? rec.kvBytesPerToken : 512 * 1024;
    const ramBudget = memory.ramTotal * 0.85;
    const gpuBudget = memory.gpu ? memory.gpu.total * 0.85 : 0;
    const gpuAvailable = gpuBudget - size * 1.1 - GiB;
    const ramAvailable = ramBudget - size * 1.15 - GiB;
    const combinedAvailable = ramBudget + gpuBudget - size * 1.15 - GiB;
    const canRun = combinedAvailable >= 128 * kv * 1.25;
    let execution: HardwareAssessment['execution'];
    let available: number;
    if (memory.gpu && gpuAvailable >= 128 * kv * 1.25) { execution = 'gpu'; available = gpuAvailable; }
    else if (combinedAvailable > 0) { execution = memory.gpu ? 'mixed' : 'cpu'; available = combinedAvailable; }
    else { execution = memory.gpu ? 'mixed' : 'cpu'; available = 0; }
    let cap = Math.floor(available / (kv * 1.25));
    if (execution !== 'gpu') cap = Math.min(cap, 8192);
    const maximum = rec?.contextLimit && rec.contextLimit > 0 ? rec.contextLimit : Infinity;
    cap = Math.max(1, Math.min(cap, maximum));
    const presets = [128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576];
    cap = presets.filter(value => value <= cap).at(-1) ?? Math.min(128, maximum);
    const target = requested ?? rec?.numCtx ?? 4096;
    const effectiveNumCtx = requested ?? Math.max(1, Math.min(target, cap));
    const reason = `${!canRun ? 'A capacidade total estimada é insuficiente para carregar o modelo com contexto mínimo. Esta estimativa é orientativa e não impede a tentativa de execução. ' : ''}Baseado na capacidade total; a memória livre é apenas informativa. A execução estimada usa ${execution === 'gpu' ? 'a GPU' : execution === 'mixed' ? 'GPU e memória RAM' : 'a memória RAM'}. A estimativa reserva 15% da memória, 10–15% para os pesos, 1 GiB para o programa e 25% para o cache KV${rec?.kvBytesPerToken ? '' : ' (512 KiB/token por ausência de metadados)'}. Contexto padrão ${rec?.numCtx == null ? 'local de 4096' : 'do modelo'}; não garante execução.`;
    return { effectiveNumCtx, hardware: { ramTotalBytes: memory.ramTotal, ramAvailableBytes: memory.ramFree, gpuName: memory.gpu?.name ?? null, gpuTotalBytes: memory.gpu?.total ?? null, gpuAvailableBytes: memory.gpu?.free ?? null, modelSizeBytes: size, contextCap: cap, execution, canRun, estimated: true, reason } };
}
export function isLocalOllama(url: string): boolean {
    try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname); } catch { return false; }
}



