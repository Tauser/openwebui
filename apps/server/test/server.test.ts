import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../src/server.js';
import { Store } from '../src/store.js';
const headers = { host: '127.0.0.1:3001', 'content-type': 'application/json' };
const fake = () => ({ health: async () => ({ connected: true }), listModels: async () => [], async *chat() { yield 'Olá'; yield ' mundo'; } });
test('settings and conversation survive restart; streamed output is persisted', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        let app = createServer(dir, fake);
        await app.ready();
        assert.equal((await app.inject({ method: 'PATCH', url: '/api/v1/settings', headers, payload: { model: 'local' } })).statusCode, 200);
        const created = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json();
        const stream = await app.inject({ method: 'POST', url: `/api/v1/conversations/${created.conversation.id}/messages`, headers, payload: { content: 'Oi' } });
        const events = stream.body.trim().split('\n').map(line => JSON.parse(line));
        assert.deepEqual(events.filter(e => e.type !== 'activity').map(e => e.type), ['message', 'message', 'delta', 'delta', 'done']);
        assert.equal(events.at(-1).message.content, 'Olá mundo');
        await app.close();
        app = createServer(dir, fake);
        await app.ready();
        assert.equal((await app.inject({ url: '/api/v1/settings', headers })).json().model, 'local');
        const detail = (await app.inject({ url: `/api/v1/conversations/${created.conversation.id}`, headers })).json();
        assert.equal(detail.messages[1].content, 'Olá mundo');
        assert.equal(detail.messages[1].status, 'complete');
        await app.close();
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
test('rejects invalid settings and foreign origins, restores interrupted messages', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        const store = new Store(dir);
        const c = store.create('Teste');
        store.addMessage(c.conversation.id, 'assistant', 'parcial', 'streaming');
        store.close();
        const app = createServer(dir, fake);
        await app.ready();
        assert.equal((await app.inject({ method: 'PATCH', url: '/api/v1/settings', headers, payload: { temperature: 10 } })).statusCode, 400);
        assert.equal((await app.inject({ method: 'POST', url: '/api/v1/conversations', headers: { ...headers, origin: 'https://evil.example' }, payload: {} })).statusCode, 403);
        const detail = (await app.inject({ url: `/api/v1/conversations/${c.conversation.id}`, headers })).json();
        assert.equal(detail.messages[0].status, 'error');
        assert.equal(detail.messages[0].content, 'parcial');
        await app.close();
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
test('cancellation aborts provider and persists partial output', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    let started!: () => void;
    const ready = new Promise<void>(r => { started = r; });
    const provider = () => ({ health: async () => ({ connected: true }), listModels: async () => [], async *chat(request: {
            signal?: AbortSignal;
        }) { yield 'parcial'; started(); await new Promise<void>(resolve => { if (request.signal?.aborted)
            resolve();
        else
            request.signal?.addEventListener('abort', () => resolve(), { once: true }); }); } });
    try {
        const app = createServer(dir, provider);
        await app.ready();
        const c = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json();
        const pending = Promise.resolve(app.inject({ method: 'POST', url: `/api/v1/conversations/${c.conversation.id}/messages`, headers, payload: { content: 'Oi', model: 'local' } }));
        await ready;
        const conflict = await app.inject({ method: 'POST', url: `/api/v1/conversations/${c.conversation.id}/messages`, headers, payload: { content: 'Outra', model: 'local' } });
        assert.equal(conflict.statusCode, 409);
        const cancel = await app.inject({ method: 'POST', url: `/api/v1/conversations/${c.conversation.id}/cancel`, headers, payload: {} });
        assert.equal(cancel.json().cancelled, true);
        const result = await pending;
        const done = JSON.parse(result.body.trim().split('\n').at(-1)!);
        assert.equal(done.message.status, 'cancelled');
        assert.equal(done.message.activities.at(-1).status, 'cancelled');
        assert.equal(done.message.content, 'parcial');
        await app.close();
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
test('provider failure publishes final error status and preserves partial text', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    const provider = () => ({
        health: async () => ({ connected: true }),
        listModels: async () => [],
        async *chat() { yield 'parcial'; throw new Error('falha de conexão'); },
    });
    try {
        const app = createServer(dir, provider);
        await app.ready();
        const created = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json();
        const url = `/api/v1/conversations/${created.conversation.id}`;
        const response = await app.inject({ method: 'POST', url: `${url}/messages`, headers, payload: { content: 'Oi', model: 'local' } });
        const events = response.body.trim().split('\n').map(line => JSON.parse(line));
        assert.equal(events.at(-2).type, 'error');
        assert.equal(events.at(-1).message.status, 'error');
        const detail = (await app.inject({ url, headers })).json();
        assert.equal(detail.messages[1].content, 'parcial');
        assert.equal(detail.messages[1].status, 'error');
        assert.equal(detail.messages[1].activities.at(-1).status, 'error');
        await app.close();
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
test('shutdown aborts the active generation before closing storage', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const provider = () => ({
        health: async () => ({ connected: true }),
        listModels: async () => [],
        async *chat(request: {
            signal?: AbortSignal;
        }) {
            yield 'parcial';
            started();
            await new Promise<void>(resolve => {
                if (request.signal?.aborted)
                    resolve();
                else
                    request.signal?.addEventListener('abort', () => resolve(), { once: true });
            });
        },
    });
    try {
        const app = createServer(dir, provider);
        await app.ready();
        const created = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json();
        const pending = Promise.resolve(app.inject({ method: 'POST', url: `/api/v1/conversations/${created.conversation.id}/messages`, headers, payload: { content: 'Oi', model: 'local' } }));
        await ready;
        await app.close();
        await pending;
        const store = new Store(dir);
        assert.equal(store.get(created.conversation.id)?.messages[1].status, 'cancelled');
        store.close();
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('failed turn creation rolls back both messages and permits retry', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        const app = createServer(dir, fake);
        await app.ready();
        const created = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json();
        const db = new DatabaseSync(join(dir, 'codex-local.sqlite'));
        db.exec(`CREATE TRIGGER fail_assistant BEFORE INSERT ON messages WHEN NEW.role = 'assistant' BEGIN SELECT RAISE(ABORT, 'test failure'); END`);
        const url = `/api/v1/conversations/${created.conversation.id}`;
        const request = { method: 'POST' as const, url: `${url}/messages`, headers, payload: { content: 'Oi', model: 'local' } };
        assert.equal((await app.inject(request)).statusCode, 500);
        assert.deepEqual((await app.inject({ url, headers })).json().messages, []);
        db.exec('DROP TRIGGER fail_assistant');
        db.close();
        assert.equal((await app.inject(request)).statusCode, 200);
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('thinking preference is validated, persisted and passed to the provider', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    let received: boolean | undefined;
    const provider = () => ({
        health: async () => ({ connected: true }),
        listModels: async () => [],
        async *chat(request: { think?: boolean }) { received = request.think; yield 'resposta'; },
    });
    try {
        const app = createServer(dir, provider);
        await app.ready();
        assert.equal((await app.inject({ url: '/api/v1/settings', headers })).json().think, null);
        assert.equal((await app.inject({ method: 'PATCH', url: '/api/v1/settings', headers, payload: { think: '' } })).statusCode, 400);
        assert.equal((await app.inject({ method: 'PATCH', url: '/api/v1/settings', headers, payload: { think: false, followModelDefaults: false } })).json().think, false);
        const created = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json();
        await app.inject({ method: 'POST', url: `/api/v1/conversations/${created.conversation.id}/messages`, headers, payload: { content: 'Oi', model: 'local' } });
        assert.equal(received, false);
        await app.close();
        const reopened = createServer(dir, provider);
        await reopened.ready();
        assert.equal((await reopened.inject({ url: '/api/v1/settings', headers })).json().think, false);
        assert.equal((await reopened.inject({ method: 'PATCH', url: '/api/v1/settings', headers, payload: { think: null } })).json().think, null);
        await reopened.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('automatic mode omits generation overrides for each chosen model; manual mode sends saved values', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    const requests: Array<Record<string, unknown>> = [];
    const provider = () => ({
        health: async () => ({ connected: true }), listModels: async () => [],
        async *chat(request: Record<string, unknown>) { requests.push(request); yield 'ok'; },
    });
    try {
        const app = createServer(dir, provider);
        await app.ready();
        const settings = (await app.inject({ url: '/api/v1/settings', headers })).json();
        assert.equal(settings.followModelDefaults, true);
        await app.inject({ method: 'PATCH', url: '/api/v1/settings', headers, payload: { model: 'model-a', temperature: 0, numCtx: 8192, think: 'low' } });
        const created = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json();
        const url = `/api/v1/conversations/${created.conversation.id}/messages`;
        await app.inject({ method: 'POST', url, headers, payload: { content: 'Oi', model: 'model-b' } });
        assert.equal(requests[0].model, 'model-b');
        for (const key of ['temperature', 'think']) assert.equal(Object.hasOwn(requests[0], key), false);
        assert.equal((await app.inject({ method: 'PATCH', url: '/api/v1/settings', headers, payload: { followModelDefaults: 'false' } })).statusCode, 400);
        await app.inject({ method: 'PATCH', url: '/api/v1/settings', headers, payload: { followModelDefaults: false } });
        await app.inject({ method: 'POST', url, headers, payload: { content: 'Oi novamente', model: 'model-a' } });
        assert.equal(requests[1].temperature, 0);
        assert.equal(requests[0].numCtx, 2048);
        assert.equal(requests[1].numCtx, 8192);
        assert.equal(requests[1].think, 'low');
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('recommendations are requested per model and provider errors are reported', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    const provider = () => ({
        health: async () => ({ connected: true }), listModels: async () => [],
        async *chat() { yield 'ok'; },
        async recommendations(model: string) {
            if (model === 'offline') throw new Error('offline');
            return { model, temperature: model === 'a' ? 0 : null, numCtx: null, contextLimit: null, think: null, thinkingValues: [], thinkingSupported: null, capabilities: [], source: 'ollama' as const };
        },
    });
    try {
        const app = createServer(dir, provider);
        await app.ready();
        assert.equal((await app.inject({ url: '/api/v1/models/recommendations', headers })).statusCode, 400);
        assert.equal((await app.inject({ url: '/api/v1/models/recommendations?model=a', headers })).json().temperature, 0);
        assert.equal((await app.inject({ url: '/api/v1/models/recommendations?model=b', headers })).json().temperature, null);
        const error = await app.inject({ url: '/api/v1/models/recommendations?model=offline', headers });
        assert.equal(error.statusCode, 502);
        assert.equal(error.json().error, 'offline');
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
import { assessHardware, isLocalOllama } from '../src/hardware.js';
test('hardware policy estimates GPU, CPU and insufficient total capacity', () => {
    const GiB = 1024 ** 3;
    const recommendation = { model: 'a', temperature: null, numCtx: 8192, contextLimit: 32768, think: null, thinkingValues: [], thinkingSupported: null, capabilities: [], source: 'ollama' as const, modelSizeBytes: 6 * GiB, kvBytesPerToken: 512 * 1024 };
    const ram = { ramTotal: 32 * GiB, ramFree: 24 * GiB, gpu: { name: 'GPU', total: 12 * GiB, free: 11 * GiB }, running: [] };
    const gpu = assessHardware(recommendation, ram);
    assert.equal(gpu.hardware.execution, 'gpu');
    assert.equal(gpu.hardware.canRun, true);
    assert.ok(gpu.effectiveNumCtx <= 8192);
    const large = assessHardware({ ...recommendation, modelSizeBytes: 20 * GiB }, { ...ram, ramTotal: 64 * GiB, ramFree: 40 * GiB, gpu: { name: 'GPU', total: 32 * GiB, free: 30 * GiB } });
    assert.equal(large.hardware.execution, 'gpu');
    assert.equal(large.hardware.canRun, true);
    const cpu = assessHardware(recommendation, { ...ram, gpu: null });
    assert.equal(cpu.hardware.execution, 'cpu');
    assert.ok(cpu.hardware.contextCap <= 8192);
    const weak = assessHardware(recommendation, { ...ram, ramTotal: 4 * GiB, ramFree: 2 * GiB, gpu: null });
    assert.equal(weak.hardware.canRun, false);
    assert.match(weak.hardware.reason, /capacidade total estimada é insuficiente/);
    assert.equal(weak.hardware.contextCap, 128);
    const resident = assessHardware(recommendation, { ...ram, gpu: { ...ram.gpu, free: 2 * GiB }, running: [{ name: 'resident', size: 6 * GiB, sizeVram: 6 * GiB }] });
    assert.equal(resident.hardware.execution, 'gpu');
    assert.equal(resident.hardware.contextCap, gpu.hardware.contextCap);
    const remote = assessHardware(recommendation, null);
    assert.equal(remote.hardware.execution, 'unknown');
    assert.equal(remote.hardware.canRun, null);
    assert.equal(remote.effectiveNumCtx, 2048);
    assert.equal(isLocalOllama('http://192.168.1.2:11434'), false);
});
test('cancel during metadata preflight aborts promptly without starting chat', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    let signalSeen!: () => void;
    const started = new Promise<void>(resolve => { signalSeen = resolve; });
    let chatStarted = false;
    const provider = () => ({
        health: async () => ({ connected: true }), listModels: async () => [],
        recommendations: async (_model: string, signal?: AbortSignal): Promise<never> => {
            signalSeen();
            return new Promise((_, reject) => {
                if (signal?.aborted) reject(new Error('aborted'));
                else signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
            });
        },
        async *chat() { chatStarted = true; yield 'unexpected'; },
    });
    try {
        const app = createServer(dir, provider);
        await app.ready();
        const created = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json();
        const url = `/api/v1/conversations/${created.conversation.id}`;
        const pending = Promise.resolve(app.inject({ method: 'POST', url: `${url}/messages`, headers, payload: { content: 'Oi', model: 'local' } }));
        await started;
        const cancel = await app.inject({ method: 'POST', url: `${url}/cancel`, headers, payload: {} });
        assert.equal(cancel.json().cancelled, true);
        const events = (await pending).body.trim().split('\n').map(line => JSON.parse(line));
        assert.equal(events.at(-1).message.status, 'cancelled');
        assert.equal(chatStarted, false);
        assert.equal((await app.inject({ url, headers })).json().messages[1].status, 'cancelled');
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('context cap rounds down to safe presets and respects smaller model limits', () => {
    const GiB = 1024 ** 3;
    const rec = { model: 'a', temperature: null, numCtx: 3000, contextLimit: 100000, think: null, thinkingValues: [], thinkingSupported: null, capabilities: [], source: 'ollama' as const, modelSizeBytes: GiB, kvBytesPerToken: 512 * 1024 };
    const memory = { ramTotal: 16 * GiB, ramFree: 12 * GiB, gpu: null, running: [] };
    const result = assessHardware(rec, memory);
    assert.equal(result.hardware.contextCap, 8192);
    assert.equal(result.effectiveNumCtx, 3000);
    const small = assessHardware({ ...rec, contextLimit: 100 }, memory);
    assert.equal(small.hardware.contextCap, 100);
    assert.equal(small.effectiveNumCtx, 100);
});
test('insufficient estimated memory is a warning and still calls chat', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    let called = false;
    const provider = () => ({
        health: async () => ({ connected: true }), listModels: async () => [],
        async recommendations(model: string) { return { model, temperature: null, numCtx: null, contextLimit: null, think: null, thinkingValues: [], thinkingSupported: null, capabilities: [], source: 'ollama' as const, modelSizeBytes: 1e15 }; },
        async *chat() { called = true; yield 'unexpected'; },
    });
    try {
        const app = createServer(dir, provider);
        await app.ready();
        const created = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json();
        const url = `/api/v1/conversations/${created.conversation.id}`;
        const response = await app.inject({ method: 'POST', url: `${url}/messages`, headers, payload: { content: 'Oi', model: 'huge' } });
        const events = response.body.trim().split('\n').map(line => JSON.parse(line));
        assert.equal(events.at(-1).message.status, 'complete');
        assert.ok(events.some(event => event.type === 'activity' && event.activity.label.includes('Aviso: capacidade')));
        assert.equal((await app.inject({ url, headers })).json().messages[1].status, 'complete');
        assert.equal(called, true);
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('context recommendation remains stable across free memory and resident changes', () => {
    const GiB = 1024 ** 3;
    const rec = { model: 'a', temperature: null, numCtx: 16384, contextLimit: 65536, think: null, thinkingValues: [], thinkingSupported: null, capabilities: [], source: 'ollama' as const, modelSizeBytes: 6 * GiB, kvBytesPerToken: 512 * 1024 };
    const snapshot = { ramTotal: 32 * GiB, ramFree: 0, gpu: { name: 'GPU', total: 12 * GiB, free: 0 }, running: [] };
    const busy = assessHardware(rec, snapshot);
    const free = assessHardware(rec, { ...snapshot, ramFree: 28 * GiB, gpu: { ...snapshot.gpu, free: 10 * GiB }, running: [{ name: 'other', size: 8 * GiB, sizeVram: 5 * GiB }] });
    assert.equal(busy.hardware.contextCap, free.hardware.contextCap);
    assert.equal(busy.effectiveNumCtx, free.effectiveNumCtx);
    assert.equal(busy.hardware.canRun, free.hardware.canRun);
    assert.equal(busy.hardware.execution, free.hardware.execution);
    assert.notEqual(busy.hardware.ramAvailableBytes, free.hardware.ramAvailableBytes);
    const larger = assessHardware({ ...rec, modelSizeBytes: 10 * GiB }, snapshot);
    assert.ok(larger.hardware.contextCap < busy.hardware.contextCap || larger.hardware.execution !== busy.hardware.execution);
});
test('legacy database migrates idempotently, preserves data and pinned order', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        const db = new DatabaseSync(join(dir, 'codex-local.sqlite'));
        db.exec(`CREATE TABLE conversations (id TEXT PRIMARY KEY,title TEXT NOT NULL,model TEXT NOT NULL,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0); INSERT INTO conversations VALUES ('old','Antiga','m','2020','2020',0)`);
        db.close();
        let app = createServer(dir, fake); await app.ready();
        assert.equal((await app.inject({ url: '/api/v1/conversations/old', headers })).json().conversation.title, 'Antiga');
        const created = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json();
        const pinned = await app.inject({ method: 'PATCH', url: '/api/v1/conversations/old', headers, payload: { pinned: true } });
        assert.equal(pinned.json().pinned, true);
        assert.equal((await app.inject({ method: 'PATCH', url: '/api/v1/conversations/old', headers, payload: { pinned: 'true' } })).statusCode, 400);
        assert.equal((await app.inject({ url: '/api/v1/conversations', headers })).json().conversations[0].id, 'old');
        await app.close(); app = createServer(dir, fake); await app.ready();
        assert.equal((await app.inject({ url: '/api/v1/conversations/old', headers })).json().conversation.pinned, true);
        assert.equal((await app.inject({ url: `/api/v1/conversations/${created.conversation.id}`, headers })).statusCode, 200);
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('fork copies only the prefix with new identities and rejects foreign or assistant anchors', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        const app = createServer(dir, fake); await app.ready();
        const source = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: { title: 'Original' } })).json().conversation;
        const url = `/api/v1/conversations/${source.id}`;
        for (const content of ['primeira','segunda']) await app.inject({ method: 'POST', url: `${url}/messages`, headers, payload: { content, model: 'local' } });
        const before = (await app.inject({ url, headers })).json();
        const assistant = before.messages[1]; const anchor = before.messages[2];
        assert.equal((await app.inject({ method: 'POST', url: `${url}/fork`, headers, payload: { messageId: assistant.id } })).statusCode, 400);
        assert.equal((await app.inject({ method: 'POST', url: `${url}/fork`, headers, payload: { messageId: 'foreign' } })).statusCode, 404);
        const response = await app.inject({ method: 'POST', url: `${url}/fork`, headers, payload: { messageId: anchor.id } });
        assert.equal(response.statusCode, 201);
        const fork = response.json();
        assert.equal(fork.conversation.parentId, source.id);
        assert.equal(fork.conversation.forkedFromMessageId, anchor.id);
        assert.equal(fork.messages.length, 2);
        assert.deepEqual(fork.messages.map((m: any) => m.content), before.messages.slice(0,2).map((m: any) => m.content));
        assert.notEqual(fork.messages[0].id, before.messages[0].id);
        assert.equal(fork.messages[0].conversationId, fork.conversation.id);
        assert.deepEqual((await app.inject({ url, headers })).json(), before);
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('fork rolls back conversation when copying messages fails', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        const app = createServer(dir, fake); await app.ready();
        const source = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json().conversation;
        const url = `/api/v1/conversations/${source.id}`;
        for (const content of ['a','b']) await app.inject({ method: 'POST', url: `${url}/messages`, headers, payload: { content, model: 'local' } });
        const anchor = (await app.inject({ url, headers })).json().messages[2];
        const db = new DatabaseSync(join(dir,'codex-local.sqlite'));
        db.exec(`CREATE TRIGGER fail_copy BEFORE INSERT ON messages BEGIN SELECT RAISE(ABORT, 'copy failed'); END`);
        assert.equal((await app.inject({ method: 'POST', url: `${url}/fork`, headers, payload: { messageId: anchor.id } })).statusCode, 500);
        assert.equal((await app.inject({ url: '/api/v1/conversations', headers })).json().conversations.length, 1);
        db.close(); await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
import { allowedRequest, localHostnames, validBindHost } from '../src/network.js';
test('LAN access permits local hosts and same origin but rejects foreign hosts and origins', () => {
    const hosts = localHostnames('workstation', ['192.168.1.30', '10.1.0.2', '8.8.8.8', 'fd00::1']);
    assert.equal(allowedRequest('192.168.1.30:3001', 'http://192.168.1.30:3001', hosts), true);
    assert.equal(allowedRequest('workstation:3001', 'http://workstation:3001', hosts), true);
    assert.equal(allowedRequest('[fd00::1]:3001', 'http://[fd00::1]:3001', hosts), true);
    assert.equal(allowedRequest('192.168.1.31:3001', undefined, hosts), false);
    assert.equal(allowedRequest('evil.example:3001', undefined, hosts), false);
    assert.equal(allowedRequest('192.168.1.30:3001', 'http://evil.example:3001', hosts), false);
    assert.equal(allowedRequest('192.168.1.30:3001', 'https://192.168.1.30:3001', hosts), false);
    assert.equal(allowedRequest('192.168.1.30:3001', 'http://user@192.168.1.30:3001', hosts), false);
    assert.equal(allowedRequest('user@192.168.1.30:3001', undefined, hosts), false);
    assert.equal(allowedRequest('localhost:3001', 'http://localhost:5173', hosts), true);
    assert.equal(validBindHost('0.0.0.0', []), true);
    assert.equal(validBindHost('192.168.1.30', ['192.168.1.30']), true);
    assert.equal(validBindHost('192.168.1.31', ['192.168.1.30']), false);
});
test('server accepts LAN host and same-origin PATCH and stream', async () => {
    const lan = [...localHostnames()].find(host => host.startsWith('192.168.') || host.startsWith('10.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host));
    if (!lan) return;
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        const app = createServer(dir, fake); await app.ready();
        const localHeaders = { host: `${lan}:3001`, origin: `http://${lan}:3001`, 'content-type': 'application/json' };
        assert.equal((await app.inject({ method: 'PATCH', url: '/api/v1/settings', headers: localHeaders, payload: { model: 'local' } })).statusCode, 200);
        const created = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers: localHeaders, payload: {} })).json();
        const response = await app.inject({ method: 'POST', url: `/api/v1/conversations/${created.conversation.id}/messages`, headers: localHeaders, payload: { content: 'Olá' } });
        assert.equal(response.statusCode, 200);
        assert.equal(JSON.parse(response.body.trim().split('\n').at(-1)!).type, 'done');
        assert.equal((await app.inject({ method: 'PATCH', url: '/api/v1/settings', headers: { ...localHeaders, origin: 'http://evil.example' }, payload: {} })).statusCode, 403);
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('sections persist, reorder, move conversations, fork and remove without losing messages', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        let app = createServer(dir, fake); await app.ready();
        const post = (url: string, payload: unknown) => app.inject({ method: 'POST', url, headers, payload });
        const patch = (url: string, payload: unknown) => app.inject({ method: 'PATCH', url, headers, payload });
        const a = (await post('/api/v1/sections', { name: '  Trabalho  ' })).json();
        const b = (await post('/api/v1/sections', { name: 'Pessoal' })).json();
        assert.equal(a.name, 'Trabalho');
        assert.equal((await post('/api/v1/sections', { name: '  ' })).statusCode, 400);
        assert.equal((await patch(`/api/v1/sections/${b.id}`, { name: ' Projetos ', position: 0 })).json().name, 'Projetos');
        assert.deepEqual((await app.inject({ url: '/api/v1/sections', headers })).json().sections.map((section: any) => [section.id, section.position]), [[b.id,0],[a.id,1]]);
        assert.equal((await patch(`/api/v1/sections/${b.id}`, { position: 3 })).statusCode, 400);
        assert.equal((await post('/api/v1/conversations', { sectionId: 'missing' })).statusCode, 404);
        const source = (await post('/api/v1/conversations', { title: 'Teste', sectionId: a.id })).json().conversation;
        const url = `/api/v1/conversations/${source.id}`;
        await post(`${url}/messages`, { content: 'primeira', model: 'local' });
        await post(`${url}/messages`, { content: 'segunda', model: 'local' });
        assert.equal((await patch(url, { sectionId: 'missing' })).statusCode, 404);
        assert.equal((await patch(url, { sectionId: b.id })).json().sectionId, b.id);
        const before = (await app.inject({ url, headers })).json();
        const fork = (await post(`${url}/fork`, { messageId: before.messages[2].id })).json();
        assert.equal(fork.conversation.sectionId, b.id);
        await app.close(); app = createServer(dir, fake); await app.ready();
        assert.equal((await app.inject({ url, headers })).json().conversation.sectionId, b.id);
        assert.equal((await app.inject({ url: '/api/v1/sections', headers })).json().sections[0].name, 'Projetos');
        assert.equal((await post(`/api/v1/sections/${b.id}/remove`, {})).json().removed, true);
        const after = (await app.inject({ url, headers })).json();
        assert.equal(after.conversation.sectionId, undefined);
        assert.deepEqual(after.messages, before.messages);
        assert.equal((await app.inject({ url: `/api/v1/conversations/${fork.conversation.id}`, headers })).json().conversation.sectionId, undefined);
        assert.equal((await app.inject({ url: '/api/v1/sections', headers })).json().sections[0].position, 0);
        assert.equal((await post(`/api/v1/sections/${b.id}/remove`, {})).statusCode, 404);
        assert.equal((await patch(url, { sectionId: a.id })).json().sectionId, a.id);
        assert.equal((await patch(url, { sectionId: null })).json().sectionId, undefined);
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('project metadata validates, trims, persists and clears', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        let app = createServer(dir, fake); await app.ready();
        const created = await app.inject({ method: 'POST', url: '/api/v1/sections', headers, payload: { name: 'Projeto', folderPath: ' C:/repo ', repository: ' local/repo ', pinned: true } });
        const section = created.json(); assert.equal(section.folderPath, 'C:/repo'); assert.equal(section.repository, 'local/repo'); assert.equal(section.pinned, true);
        assert.equal((await app.inject({ method: 'PATCH', url: `/api/v1/sections/${section.id}`, headers, payload: { pinned: 'true' } })).statusCode, 400);
        assert.equal((await app.inject({ method: 'PATCH', url: `/api/v1/sections/${section.id}`, headers, payload: { repository: 'x'.repeat(2049) } })).statusCode, 400);
        await app.close(); app = createServer(dir, fake); await app.ready();
        assert.equal((await app.inject({ url: '/api/v1/sections', headers })).json().sections[0].repository, 'local/repo');
        const cleared = (await app.inject({ method: 'PATCH', url: `/api/v1/sections/${section.id}`, headers, payload: { folderPath: null, repository: ' ', pinned: false } })).json();
        assert.equal(cleared.folderPath, undefined); assert.equal(cleared.repository, undefined); assert.equal(cleared.pinned, false);
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('activity stream is persisted and unfinished activity is recovered on restart', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        let app = createServer(dir, fake); await app.ready();
        const id = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json().conversation.id;
        const url = `/api/v1/conversations/${id}`;
        const stream = await app.inject({ method: 'POST', url: `${url}/messages`, headers, payload: { content: 'Oi', model: 'local' } });
        const events = stream.body.trim().split('\n').map(line => JSON.parse(line));
        assert.deepEqual(events.filter(e => e.type === 'activity').map(e => e.activity.status), ['running','complete','running','complete','running','complete']);
        const message = events.at(-1).message;
        assert.deepEqual(message.activities.map((a: any) => a.kind), ['model','hardware','generation']);
        await app.close();
        const db = new DatabaseSync(join(dir, 'codex-local.sqlite'));
        db.prepare('UPDATE messages SET status=?,activities=? WHERE id=?').run('streaming', JSON.stringify([{ id:'x',kind:'generation',label:'Gerando',status:'running',startedAt:'2020' }]),message.id); db.close();
        app = createServer(dir, fake); await app.ready();
        const restored = (await app.inject({ url, headers })).json().messages[1];
        assert.equal(restored.status, 'error'); assert.equal(restored.activities[0].status, 'error'); assert.ok(restored.activities[0].completedAt);
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('buffered generation yields to a scheduled cancel request before exhausting output', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    const limit = 20000;
    let generated = 0;
    let start!: () => void;
    const started = new Promise<void>(resolve => { start = resolve; });
    const provider = () => ({
        health: async () => ({ connected: true }), listModels: async () => [],
        async *chat() { for (let i = 0; i < limit; i++) { generated++; if (i === 0) start(); yield 'x'; } },
    });
    try {
        const app = createServer(dir, provider); await app.ready();
        const id = (await app.inject({ method: 'POST', url: '/api/v1/conversations', headers, payload: {} })).json().conversation.id;
        const url = `/api/v1/conversations/${id}`;
        const pending = Promise.resolve(app.inject({ method: 'POST', url: `${url}/messages`, headers, payload: { content: 'Oi', model: 'local' } }));
        await started;
        const latency = await new Promise<number>((resolve, reject) => setTimeout(async () => {
            const began = performance.now();
            try { const response = await app.inject({ method: 'POST', url: `${url}/cancel`, headers, payload: {} }); assert.equal(response.json().cancelled, true); resolve(performance.now() - began); }
            catch (error) { reject(error); }
        }, 5));
        const events = (await pending).body.trim().split('\n').map(line => JSON.parse(line));
        assert.ok(generated < limit, `generated ${generated} buffered chunks`);
        assert.equal(events.at(-1).message.status, 'cancelled');
        assert.equal((await app.inject({ url, headers })).json().messages[1].content.length, events.filter(event => event.type === 'delta').length);
        console.log(`Buffered cancellation: ${generated}/${limit} chunks, ${latency.toFixed(1)} ms after request`);
        await app.close();
    } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('attachments validate before persistence and survive restart and fork', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        let app = createServer(dir, fake); await app.ready();
        const id = (await app.inject({ method:'POST',url:'/api/v1/conversations',headers,payload:{} })).json().conversation.id;
        const url = `/api/v1/conversations/${id}`;
        const text = {name:'notas.txt',kind:'text',mimeType:'text/plain',text:'Olá mundo'};
        for (const invalid of [{...text,name:'../x'}, {...text,text:'a\0b'}, {...text,text:'x'.repeat(262145)}, {name:'x.png',kind:'image',mimeType:'image/png',data:'AAAA'}]) {
            assert.equal((await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'',model:'local',attachments:[invalid]}})).statusCode,400);
        }
        assert.equal((await app.inject({url,headers})).json().messages.length,0);
        await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'',model:'local',attachments:[text]}});
        await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'segunda',model:'local'}});
        let detail=(await app.inject({url,headers})).json();
        assert.equal(detail.messages[0].attachments[0].text,'Olá mundo');
        const fork=(await app.inject({method:'POST',url:`${url}/fork`,headers,payload:{messageId:detail.messages[2].id}})).json();
        assert.equal(fork.messages[0].attachments[0].text,'Olá mundo');
        assert.notEqual(fork.messages[0].attachments[0].id,detail.messages[0].attachments[0].id);
        await app.close(); app=createServer(dir,fake); await app.ready();
        detail=(await app.inject({url,headers})).json(); assert.equal(detail.messages[0].attachments[0].text,'Olá mundo');
        await app.close();
    } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('image history requires vision and oversized attachment context stops inference', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-')); let calls=0;
    const provider=()=>({health:async()=>({connected:true}),listModels:async()=>[],async recommendations(model:string){return {model,temperature:null,numCtx:null,contextLimit:null,think:null,thinkingValues:[],thinkingSupported:null,capabilities:[],source:'ollama' as const};},async *chat(){calls++;yield 'ok';}});
    try {
        const app=createServer(dir,provider); await app.ready();
        const id=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{}})).json().conversation.id; const url=`/api/v1/conversations/${id}`;
        const image={name:'x.png',kind:'image',mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aWQAAAAASUVORK5CYII='};
        const response=await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'',model:'local',attachments:[image]}});
        const events=response.body.trim().split('\n').map(line=>JSON.parse(line)); assert.match(events.at(-2).error,/suporte a imagens/); assert.equal(calls,0);
        const detail=(await app.inject({url,headers})).json(); assert.equal(detail.messages[0].attachments[0].width,1);
        const next=await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'nova',model:'local'}}); assert.equal(JSON.parse(next.body.trim().split('\n').at(-1)!).message.status,'complete'); assert.equal(calls,1);
        const id2=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{}})).json().conversation.id;
        const large=await app.inject({method:'POST',url:`/api/v1/conversations/${id2}/messages`,headers,payload:{content:'',model:'local',attachments:[{name:'a.txt',kind:'text',mimeType:'text/plain',text:'x'.repeat(5000)}]}});
        assert.match(large.body,/excedem o contexto/); assert.equal(calls,1);
        await app.close();
    } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('large image base64 validates without regex overflow and code MIME is accepted', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'local-chat-'));
    try {
        const app = createServer(dir, fake); await app.ready();
        const id = (await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{}})).json().conversation.id;
        const url = `/api/v1/conversations/${id}/messages`;
        const bytes=Buffer.alloc(1024*1024+24); Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes); bytes.write('IHDR',12); bytes.writeUInt32BE(1,16); bytes.writeUInt32BE(1,20);
        const result=await app.inject({method:'POST',url,headers,payload:{content:'',model:'local',attachments:[{name:'large.png',kind:'image',mimeType:'image/png',data:bytes.toString('base64')}]}});
        assert.equal(result.statusCode,200);
        const invalid=await app.inject({method:'POST',url,headers,payload:{content:'',model:'local',attachments:[{name:'invalid.png',kind:'image',mimeType:'image/png',data:'A'.repeat(1400000)+'!'}]}});
        assert.equal(invalid.statusCode,400);
        const code=await app.inject({method:'POST',url,headers,payload:{content:'',model:'local',attachments:[{name:'a.json',kind:'text',mimeType:'application/json',text:'{"ok":true}'}]}});
        assert.equal(code.statusCode,200); await app.close();
    } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('vision provider receives image history, and fork preserves image with a new identity', async () => {
    const dir=mkdtempSync(join(tmpdir(),'local-chat-')); const requests: any[]=[];
    const provider=()=>({health:async()=>({connected:true}),listModels:async()=>[],async recommendations(model:string){return {model,temperature:null,numCtx:null,contextLimit:null,think:null,thinkingValues:[],thinkingSupported:null,capabilities:['vision'],source:'ollama' as const};},async *chat(request:any){requests.push(request);yield 'ok';}});
    try {
        const app=createServer(dir,provider); await app.ready(); const id=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{}})).json().conversation.id; const url=`/api/v1/conversations/${id}`;
        const data='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aWQAAAAASUVORK5CYII=';
        await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'veja',model:'vision',attachments:[{name:'x.png',kind:'image',mimeType:'image/png',data}]}});
        await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'e depois?',model:'vision'}});
        assert.equal(requests.length,2); assert.equal(requests[0].messages[0].images[0],data); assert.equal(requests[1].messages[0].images[0],data);
        const detail=(await app.inject({url,headers})).json(); const fork=(await app.inject({method:'POST',url:`${url}/fork`,headers,payload:{messageId:detail.messages[2].id}})).json();
        assert.equal(fork.messages[0].attachments[0].data,data); assert.notEqual(fork.messages[0].attachments[0].id,detail.messages[0].attachments[0].id); await app.close();
    } finally {rmSync(dir,{recursive:true,force:true});}
});
test('attachments remain persisted when inference fails or is cancelled', async () => {
    const dir=mkdtempSync(join(tmpdir(),'local-chat-')); let started!:()=>void; const ready=new Promise<void>(resolve=>{started=resolve;}); let mode='error';
    const provider=()=>({health:async()=>({connected:true}),listModels:async()=>[],async *chat(request:{signal?:AbortSignal}){if(mode==='error') throw new Error('falhou'); started(); await new Promise<void>(resolve=>request.signal?.addEventListener('abort',()=>resolve(),{once:true}));}});
    try {
        const app=createServer(dir,provider); await app.ready(); const id=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{}})).json().conversation.id; const url=`/api/v1/conversations/${id}`; const attachment={name:'a.sql',kind:'text',mimeType:'application/sql',text:'select 1'};
        await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'falha',model:'local',attachments:[attachment]}});
        mode='cancel'; const pending=Promise.resolve(app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'cancela',model:'local',attachments:[attachment]}})); await ready;
        await app.inject({method:'POST',url:`${url}/cancel`,headers,payload:{}}); await pending;
        const messages=(await app.inject({url,headers})).json().messages; assert.equal(messages[0].attachments[0].text,'select 1'); assert.equal(messages[1].status,'error'); assert.equal(messages[2].attachments[0].text,'select 1'); assert.equal(messages[3].status,'cancelled'); await app.close();
    } finally {rmSync(dir,{recursive:true,force:true});}
});
test('a preflight-rejected attachment is kept in history but omitted from later inference', async () => {
    const dir=mkdtempSync(join(tmpdir(),'local-chat-')); const requests: any[]=[];
    const provider=()=>({health:async()=>({connected:true}),listModels:async()=>[],async *chat(request:any){requests.push(request);yield 'ok';}});
    try {
        const app=createServer(dir,provider); await app.ready();
        const id=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{}})).json().conversation.id; const url=`/api/v1/conversations/${id}`;
        const big={name:'big.txt',kind:'text',mimeType:'text/plain',text:'x'.repeat(6000)};
        const rejected=await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'analise',model:'local',attachments:[big]}});
        assert.match(rejected.body,/excedem o contexto/); assert.equal(requests.length,0);
        const small={name:'small.txt',kind:'text',mimeType:'text/plain',text:'texto pequeno'};
        const retry=await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'tente novamente',model:'local',attachments:[small]}});
        assert.equal(JSON.parse(retry.body.trim().split('\n').at(-1)!).message.status,'complete'); assert.equal(requests.length,1);
        assert.ok(!JSON.stringify(requests[0]).includes('x'.repeat(6000))); assert.ok(JSON.stringify(requests[0]).includes('texto pequeno'));
        const subsequent=await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'continue',model:'local'}});
        assert.equal(JSON.parse(subsequent.body.trim().split('\n').at(-1)!).message.status,'complete'); assert.ok(JSON.stringify(requests[1]).includes('texto pequeno'));
        const saved=(await app.inject({url,headers})).json(); assert.equal(saved.messages[0].attachments[0].text,big.text); assert.equal(saved.messages[1].status,'error');
        await app.close();
    } finally {rmSync(dir,{recursive:true,force:true});}
});
test('manual context reaches provider unchanged above hardware and model limits, including unknown hardware', async () => {
    const dir=mkdtempSync(join(tmpdir(),'local-chat-')); const requests: any[]=[]; let metadata=true;
    const provider=()=>({health:async()=>({connected:true}),listModels:async()=>[],async recommendations(model:string){if(!metadata) throw new Error('offline'); return {model,temperature:null,numCtx:null,contextLimit:4096,think:null,thinkingValues:[],thinkingSupported:null,capabilities:[],source:'ollama' as const,modelSizeBytes:1e15};},async *chat(request:any){requests.push(request);yield 'ok';}});
    try {
        const app=createServer(dir,provider); await app.ready();
        await app.inject({method:'PATCH',url:'/api/v1/settings',headers,payload:{followModelDefaults:false,numCtx:32768}});
        const id=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{}})).json().conversation.id;
        const url=`/api/v1/conversations/${id}/messages`;
        const first=await app.inject({method:'POST',url,headers,payload:{content:'teste',model:'local'}});
        assert.equal(requests[0].numCtx,32768); assert.match(first.body,/Aviso: capacidade/);
        metadata=false; await app.inject({method:'POST',url,headers,payload:{content:'novamente',model:'local'}});
        assert.equal(requests[1].numCtx,32768);
        await app.close();
    } finally {rmSync(dir,{recursive:true,force:true});}
});
test('explicit endpoints persist per conversation and route model, generation and fork', async () => {
    const dir=mkdtempSync(join(tmpdir(),'local-chat-')); const urls: string[]=[];
    const provider=(url:string)=>({health:async()=>({connected:true}),listModels:async()=>{urls.push(`models:${url}`);return [];},async recommendations(model:string){urls.push(`recommendations:${url}`);return {model,temperature:null,numCtx:null,contextLimit:null,think:null,thinkingValues:[],thinkingSupported:null,capabilities:[],source:'ollama' as const};},async *chat(){urls.push(`chat:${url}`);yield 'ok';}});
    let app = createServer(dir,provider);
    try {
         await app.ready();
        assert.deepEqual((await app.inject({url:'/api/v1/endpoints',headers})).json().endpoints,[]);
        const endpoint=(await app.inject({method:'POST',url:'/api/v1/endpoints',headers,payload:{name:' Rede ',url:'http://192.168.1.5:11434'}})).json();
        assert.equal(endpoint.name,'Rede');
        assert.equal((await app.inject({method:'POST',url:'/api/v1/endpoints',headers,payload:{name:'x',url:'http://user:pass@example.com'}})).statusCode,400);
        assert.equal((await app.inject({url:'/api/v1/models?endpointId=missing',headers})).statusCode,404);
        await app.inject({url:`/api/v1/models?endpointId=${endpoint.id}`,headers});
        await app.inject({url:`/api/v1/models/recommendations?model=x&endpointId=${endpoint.id}`,headers});
        const id=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{endpointId:endpoint.id}})).json().conversation.id;
        const url=`/api/v1/conversations/${id}`;
        await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'Oi',model:'local'}});
        assert.ok(urls.includes('models:http://192.168.1.5:11434')); assert.ok(urls.includes('recommendations:http://192.168.1.5:11434')); assert.ok(urls.includes('chat:http://192.168.1.5:11434'));
        assert.equal((await app.inject({method:'DELETE',url:`/api/v1/endpoints/${endpoint.id}`,headers:{host:headers.host}})).statusCode,409);
        const detail=(await app.inject({url,headers})).json(); const fork=(await app.inject({method:'POST',url:`${url}/fork`,headers,payload:{messageId:detail.messages[0].id}})).json(); assert.equal(fork.conversation.endpointId,endpoint.id);
        await app.close(); app=createServer(dir,provider); await app.ready(); assert.equal((await app.inject({url,headers})).json().conversation.endpointId,endpoint.id);
        assert.equal((await app.inject({method:'PATCH',url,headers,payload:{endpointId:123}})).statusCode,400);
        assert.equal((await app.inject({method:'PATCH',url,headers,payload:{endpointId:'missing'}})).statusCode,404);
        assert.equal((await app.inject({method:'PATCH',url,headers,payload:{endpointId:null}})).json().endpointId,undefined);
        await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'Global',model:'local'}}); assert.ok(urls.includes('chat:http://127.0.0.1:11434'));
        await app.close();
    } finally { await app.close(); rmSync(dir,{recursive:true,force:true}); }
});
test('active generation prevents changing its endpoint or conversation binding', async () => {
    const dir=mkdtempSync(join(tmpdir(),'local-chat-')); let start!:()=>void; const ready=new Promise<void>(resolve=>{start=resolve;});
    const provider=()=>({health:async()=>({connected:true}),listModels:async()=>[],async *chat(req:{signal?:AbortSignal}){start();await new Promise<void>(resolve=>req.signal?.addEventListener('abort',()=>resolve(),{once:true}));}});
    try {
        const app=createServer(dir,provider); await app.ready();
        const endpoint=(await app.inject({method:'POST',url:'/api/v1/endpoints',headers,payload:{name:'Local',url:'http://127.0.0.1:11434'}})).json();
        const id=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{endpointId:endpoint.id}})).json().conversation.id; const url=`/api/v1/conversations/${id}`;
        const pending=Promise.resolve(app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'Oi',model:'local'}})); await ready;
        assert.equal((await app.inject({method:'PATCH',url:`/api/v1/endpoints/${endpoint.id}`,headers,payload:{url:'http://127.0.0.1:11435'}})).statusCode,409);
        assert.equal((await app.inject({method:'PATCH',url,headers,payload:{endpointId:null}})).statusCode,409);
        await app.inject({method:'POST',url:`${url}/cancel`,headers,payload:{}}); await pending; await app.close();
    } finally {rmSync(dir,{recursive:true,force:true});}
});

test('profiles resolve global, project, conversation and overrides and survive restart and fork', async () => {
    const dir=mkdtempSync(join(tmpdir(),'local-chat-')); const requests:any[]=[];
    const provider=()=>({health:async()=>({connected:true}),listModels:async()=>[],async *chat(request:any){requests.push(request);yield 'ok';}});
    let app=createServer(dir,provider);
    try {
         await app.ready();
        const profile=(name:string,model:string,temperature:number)=>({name,model,systemPrompt:`prompt ${name}`,followModelDefaults:false,temperature,numCtx:8192,think:false});
        const project=(await app.inject({method:'POST',url:'/api/v1/profiles',headers,payload:profile('Projeto','model-project',0.2)})).json();
        const direct=(await app.inject({method:'POST',url:'/api/v1/profiles',headers,payload:profile('Conversa','model-chat',0.4)})).json();
        const section=(await app.inject({method:'POST',url:'/api/v1/sections',headers,payload:{name:'Pasta',profileId:project.id}})).json();
        const id=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{sectionId:section.id}})).json().conversation.id;
        const url=`/api/v1/conversations/${id}`;
        let resolved=(await app.inject({url:`/api/v1/configuration?conversationId=${id}`,headers})).json(); assert.equal(resolved.source,'project'); assert.equal(resolved.settings.model,'model-project');
        await app.inject({method:'PATCH',url,headers,payload:{profileId:direct.id,configOverrides:{temperature:0.1}}});
        resolved=(await app.inject({url:`/api/v1/configuration?conversationId=${id}`,headers})).json(); assert.equal(resolved.source,'conversation'); assert.equal(resolved.profileId,direct.id); assert.equal(resolved.settings.model,'model-chat'); assert.equal(resolved.settings.temperature,0.1); assert.equal(resolved.hasOverrides,true);
        await app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'oi'}});
        assert.equal(requests[0].model,'model-chat'); assert.equal(requests[0].temperature,0.1); assert.equal(requests[0].numCtx,8192); assert.equal(requests[0].messages[0].content,'prompt Conversa');
        const detail=(await app.inject({url,headers})).json(); const fork=(await app.inject({method:'POST',url:`${url}/fork`,headers,payload:{messageId:detail.messages[0].id}})).json(); assert.equal(fork.conversation.profileId,direct.id); assert.equal(fork.conversation.configOverrides.temperature,0.1);
        assert.equal((await app.inject({method:'DELETE',url:`/api/v1/profiles/${project.id}`,headers:{host:headers.host}})).statusCode,409);
        await app.close(); app=createServer(dir,provider); await app.ready();
        assert.equal((await app.inject({url:`/api/v1/configuration?conversationId=${id}`,headers})).json().settings.temperature,0.1);
        await app.inject({method:'PATCH',url,headers,payload:{profileId:null,configOverrides:null}});
        assert.equal((await app.inject({url:`/api/v1/configuration?conversationId=${id}`,headers})).json().source,'project');
        assert.equal((await app.inject({method:'PATCH',url,headers,payload:{profileId:'missing'}})).statusCode,404);
        assert.equal((await app.inject({method:'PATCH',url,headers,payload:{configOverrides:{theme:'dark'}}})).statusCode,400);
        assert.equal((await app.inject({url:'/api/v1/configuration?sectionId=missing',headers})).statusCode,404);
        await app.close();
    } finally {await app.close(); rmSync(dir,{recursive:true,force:true});}
});
test('active generation protects its profile, project and conversation configuration', async () => {
    const dir=mkdtempSync(join(tmpdir(),'local-chat-')); let start!:()=>void; const ready=new Promise<void>(r=>{start=r;});
    const provider=()=>({health:async()=>({connected:true}),listModels:async()=>[],async *chat(req:{signal?:AbortSignal}){start();await new Promise<void>(r=>req.signal?.addEventListener('abort',()=>r(),{once:true}));}});
    try {
        const app=createServer(dir,provider); await app.ready();
        const profile=(await app.inject({method:'POST',url:'/api/v1/profiles',headers,payload:{name:'p',model:'local',systemPrompt:'',followModelDefaults:true,temperature:0.7,numCtx:4096,think:null}})).json();
        const section=(await app.inject({method:'POST',url:'/api/v1/sections',headers,payload:{name:'s',profileId:profile.id}})).json();
        const id=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{sectionId:section.id}})).json().conversation.id; const url=`/api/v1/conversations/${id}`;
        const pending=Promise.resolve(app.inject({method:'POST',url:`${url}/messages`,headers,payload:{content:'oi'}})); await ready;
        assert.equal((await app.inject({method:'PATCH',url:`/api/v1/profiles/${profile.id}`,headers,payload:{temperature:0.1}})).statusCode,409);
        assert.equal((await app.inject({method:'PATCH',url:`/api/v1/sections/${section.id}`,headers,payload:{profileId:null}})).statusCode,409);
        assert.equal((await app.inject({method:'PATCH',url,headers,payload:{configOverrides:{temperature:0}}})).statusCode,409);
        await app.inject({method:'POST',url:`${url}/cancel`,headers,payload:{}}); await pending; await app.close();
    } finally {rmSync(dir,{recursive:true,force:true});}
});
test('profile think null clears prior value and empty overrides inherit project', async () => {
    const dir=mkdtempSync(join(tmpdir(),'local-chat-'));
    try {
        const app=createServer(dir,fake); await app.ready();
        const profile=(await app.inject({method:'POST',url:'/api/v1/profiles',headers,payload:{name:'p',model:'local',systemPrompt:'',followModelDefaults:false,temperature:0.7,numCtx:4096,think:'low'}})).json();
        assert.equal((await app.inject({method:'PATCH',url:`/api/v1/profiles/${profile.id}`,headers,payload:{think:null}})).json().think,null);
        const section=(await app.inject({method:'POST',url:'/api/v1/sections',headers,payload:{name:'s',profileId:profile.id}})).json();
        const id=(await app.inject({method:'POST',url:'/api/v1/conversations',headers,payload:{sectionId:section.id,configOverrides:{}}})).json().conversation.id;
        const result=(await app.inject({url:`/api/v1/configuration?conversationId=${id}`,headers})).json(); assert.equal(result.source,'project'); assert.equal(result.hasOverrides,false);
        await app.inject({method:'PATCH',url:`/api/v1/conversations/${id}`,headers,payload:{configOverrides:{temperature:0}}});
        await app.inject({method:'PATCH',url:`/api/v1/conversations/${id}`,headers,payload:{configOverrides:{}}});
        const cleared=(await app.inject({url:`/api/v1/configuration?conversationId=${id}`,headers})).json(); assert.equal(cleared.hasOverrides,false); assert.equal(cleared.source,'project');
        await app.close();
    } finally {rmSync(dir,{recursive:true,force:true});}
});
