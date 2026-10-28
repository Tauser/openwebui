import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { setImmediate as yieldToEventLoop } from 'node:timers/promises';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OllamaClient, prepareAttachmentMessages, estimateAttachmentContext } from '@codex-local/providers';
import { validateAttachments } from './attachments.js';
import type { AppSettings, ChatStreamEvent, OllamaChatRequest, ModelInfo, ModelRecommendations, MessageActivity, GenerationSettings } from '@codex-local/contracts';
import { Store } from './store.js';
import { allowedRequest, localHostnames } from './network.js';
import { assessHardware, isLocalOllama, readMemory, type RunningModel } from './hardware.js';
type Provider = {
    health(signal?: AbortSignal): Promise<{
        connected: boolean;
        error?: string;
    }>;
    listModels(signal?: AbortSignal): Promise<ModelInfo[]>;
    runningModels?(signal?: AbortSignal): Promise<RunningModel[]>;
    recommendations?(model: string, signal?: AbortSignal): Promise<ModelRecommendations>;
    chat(request: OllamaChatRequest): AsyncGenerator<string>;
};
type Factory = (url: string) => Provider;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Falha ao acessar Ollama';
function validSettings(patch: unknown): patch is Partial<AppSettings> {
    if (!object(patch))
        return false;
    const allowed = ['ollamaUrl', 'model', 'systemPrompt', 'followModelDefaults', 'temperature', 'numCtx', 'think', 'theme'];
    if (Object.keys(patch).some(k => !allowed.includes(k)))
        return false;
    if (patch.ollamaUrl !== undefined) {
        if (typeof patch.ollamaUrl !== 'string')
            return false;
        try {
            const u = new URL(patch.ollamaUrl);
            if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash)
                return false;
        }
        catch {
            return false;
        }
    }
    return (patch.followModelDefaults === undefined || typeof patch.followModelDefaults === 'boolean') && (patch.think === undefined || patch.think === null || typeof patch.think === 'boolean' || typeof patch.think === 'string' && !!patch.think.trim() && patch.think.length <= 128) && (patch.model === undefined || typeof patch.model === 'string' && patch.model.length <= 512) && (patch.systemPrompt === undefined || typeof patch.systemPrompt === 'string' && patch.systemPrompt.length <= 100000) && (patch.temperature === undefined || typeof patch.temperature === 'number' && Number.isFinite(patch.temperature) && patch.temperature >= 0 && patch.temperature <= 2) && (patch.numCtx === undefined || Number.isInteger(patch.numCtx) && (patch.numCtx as number) >= 128 && (patch.numCtx as number) <= 1048576) && (patch.theme === undefined || ['dark', 'light', 'system'].includes(patch.theme as string));
}
export function createServer(directory: string, factory: Factory = url => new OllamaClient(url)) {
    const app = Fastify({ logger: false, bodyLimit: 16 * 1024 * 1024 });
    const defaultUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
    if (!validSettings({ ollamaUrl: defaultUrl }))
        throw new Error('OLLAMA_URL inválida');
    const store = new Store(directory, defaultUrl);
    let active: {
        id: string;
        controller: AbortController;
        endpointId?: string;
        profileId?: string;
        sectionId?: string;
        finished: Promise<void>;
    } | undefined;
    app.addHook('preClose', async () => {
        const generation = active;
        if (generation) {
            generation.controller.abort();
            await generation.finished;
        }
    });
    app.addHook('onClose', async () => { store.close(); });
    const webDist = fileURLToPath(new URL('../../web/dist/', import.meta.url));
    if (existsSync(webDist)) {
        app.register(fastifyStatic, { root: webDist, prefix: '/' });
        app.setNotFoundHandler((req, reply) => {
            if (req.method === 'GET' && !req.url.split('?')[0].startsWith('/api/')) {
                return reply.sendFile('index.html');
            }
            return reply.code(404).send({ error: 'Não encontrado' });
        });
    }
    app.addHook('onRequest', async (req, reply) => {
        const host = req.headers.host ?? '';
        const origin = req.headers.origin;
        if (!allowedRequest(host, origin, localHostnames())) return reply.code(403).send({ error: 'Host ou origem não permitida' });
        if (origin) {
            reply.header('Access-Control-Allow-Origin', origin);
            reply.header('Vary', 'Origin');
            reply.header('Access-Control-Allow-Headers', 'Content-Type');
            reply.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        }
        if (req.method === 'OPTIONS')
            return reply.code(204).send();
        if (['POST', 'PATCH'].includes(req.method) && req.headers['content-type']?.split(';')[0] !== 'application/json')
            return reply.code(415).send({ error: 'Use application/json' });
    });
    app.get('/api/v1/health', async () => { const settings = store.settings(); const health = await factory(settings.ollamaUrl).health(); return { status: 'ok', version: '0.1.0', ollama: { ...health, url: settings.ollamaUrl }, storage: 'sqlite' }; });
    app.get('/api/v1/settings', async () => store.settings());
    app.patch('/api/v1/settings', async (req, reply) => { if (!validSettings(req.body))
        return reply.code(400).send({ error: 'Configurações inválidas' }); const settings = { ...store.settings(), ...req.body }; store.saveSettings(settings); return settings; });
    app.get<{ Querystring: { endpointId?: unknown } }>('/api/v1/models', async (req, reply) => {
        const endpointId = req.query.endpointId;
        if (endpointId !== undefined && (typeof endpointId !== 'string' || !endpointId.trim())) return reply.code(400).send({error:'Endpoint inválido'});
        const endpoint = typeof endpointId === 'string' ? store.endpoint(endpointId) : undefined;
        if (endpointId !== undefined && !endpoint) return reply.code(404).send({error:'Endpoint não encontrado'});
        try { return {models:await factory(endpoint?.url ?? store.settings().ollamaUrl).listModels(),connected:true}; }
        catch (error) { return {models:[],connected:false,error:errorText(error)}; }
    });
    async function estimate(provider: Provider, url: string, rec: ModelRecommendations | null, requested?: number, signal?: AbortSignal) {
        if (!isLocalOllama(url)) return assessHardware(rec, null, requested);
        if (!rec?.modelSizeBytes) return assessHardware(rec, await readMemory([], signal), requested);
        return assessHardware(rec, await readMemory([], signal), requested);
    }
    app.get<{ Querystring: { model?: unknown; endpointId?: unknown } }>('/api/v1/models/recommendations', async (req, reply) => {
        const model = req.query.model;
        if (typeof model !== 'string' || !model.trim() || model.length > 512) {
            return reply.code(400).send({ error: 'Modelo inválido' });
        }
        const endpointId = req.query.endpointId;
        if (endpointId !== undefined && (typeof endpointId !== 'string' || !endpointId.trim())) return reply.code(400).send({error:'Endpoint inválido'});
        const endpoint = typeof endpointId === 'string' ? store.endpoint(endpointId) : undefined;
        if (endpointId !== undefined && !endpoint) return reply.code(404).send({error:'Endpoint não encontrado'});
        const url = endpoint?.url ?? store.settings().ollamaUrl;
        try {
            const provider = factory(url);
            if (!provider.recommendations) throw new Error('Recomendações não disponíveis neste provedor');
            const rec = await provider.recommendations(model.trim());
            return { ...rec, ...await estimate(provider, url, rec) };
        } catch (error) {
            return reply.code(502).send({ error: errorText(error) });
        }
    });
    const generationKeys = ['model','systemPrompt','followModelDefaults','temperature','numCtx','think'] as const;
    function validGeneration(value: unknown, complete = false): value is Partial<GenerationSettings> {
        return object(value) && !Object.keys(value).some(key => !generationKeys.includes(key as typeof generationKeys[number])) &&
            (!complete || generationKeys.every(key => Object.hasOwn(value,key))) && validSettings(value);
    }
    function resolveConfiguration(conversation?: {profileId?:string;sectionId?:string;endpointId?:string;configOverrides?:Partial<GenerationSettings>}, sectionId?: string) {
        let settings = store.settings();
        const section = store.section(conversation?.sectionId ?? sectionId ?? '');
        const profileId = conversation?.profileId ?? section?.profileId;
        const profile = profileId ? store.profile(profileId) : undefined;
        if (profile) for (const key of generationKeys) Object.assign(settings,{[key]:profile[key]});
        settings = {...settings,...conversation?.configOverrides};
        if (conversation?.endpointId) settings.ollamaUrl = store.endpoint(conversation.endpointId)?.url ?? settings.ollamaUrl;
        return {settings,source: conversation?.profileId || conversation?.configOverrides ? 'conversation' as const : profile ? 'project' as const : 'global' as const, ...(profileId ? {profileId} : {}), hasOverrides: !!conversation?.configOverrides};
    }
    const validId = (v: unknown): v is string | null => v === null || typeof v === 'string' && !!v.trim() && v.length <= 512;
    app.get<{Querystring:{conversationId?:unknown;sectionId?:unknown}}>('/api/v1/configuration', async (req,reply) => {
        const {conversationId,sectionId}=req.query;
        if (conversationId !== undefined && sectionId !== undefined || conversationId !== undefined && (typeof conversationId !== 'string' || !conversationId.trim()) || sectionId !== undefined && (typeof sectionId !== 'string' || !sectionId.trim())) return reply.code(400).send({error:'Consulta inválida'});
        const conversation = typeof conversationId === 'string' ? store.get(conversationId)?.conversation : undefined;
        if (conversationId !== undefined && !conversation || typeof sectionId === 'string' && !store.section(sectionId)) return reply.code(404).send({error:'Conversa ou seção não encontrada'});
        return resolveConfiguration(conversation,typeof sectionId === 'string' ? sectionId : undefined);
    });
    app.get('/api/v1/profiles', async () => ({profiles:store.profiles()}));
    app.post('/api/v1/profiles', async (req,reply) => {
        const b=req.body;
        if (!object(b) || typeof b.name !== 'string' || !b.name.trim() || b.name.trim().length > 80) return reply.code(400).send({error:'Perfil inválido'});
        const {name,...settings}=b;
        if (!validGeneration(settings,true)) return reply.code(400).send({error:'Configurações de perfil inválidas'});
        return reply.code(201).send(store.createProfile((name as string).trim(),settings as GenerationSettings));
    });
    app.patch<{Params:{id:string}}>('/api/v1/profiles/:id', async (req,reply) => {
        const b=req.body;
        if (!object(b) || b.name !== undefined && (typeof b.name !== 'string' || !b.name.trim() || b.name.trim().length > 80)) return reply.code(400).send({error:'Perfil inválido'});
        const {name,...settings}=b;
        if (!validGeneration(settings)) return reply.code(400).send({error:'Configurações de perfil inválidas'});
        const profile=store.profile(req.params.id); if (!profile) return reply.code(404).send({error:'Perfil não encontrado'});
        if (active?.profileId === profile.id) return reply.code(409).send({error:'Perfil em uso por geração ativa'});
        const merged = Object.fromEntries(generationKeys.map(key => [key, Object.hasOwn(settings,key) ? settings[key] : profile[key]])) as GenerationSettings;
        return store.updateProfile(profile.id,typeof name === 'string' ? name.trim() : profile.name,merged);
    });
    app.delete<{Params:{id:string}}>('/api/v1/profiles/:id', async (req,reply) => {
        if (!store.profile(req.params.id)) return reply.code(404).send({error:'Perfil não encontrado'});
        if (store.profileInUse(req.params.id) || active?.profileId === req.params.id) return reply.code(409).send({error:'Perfil vinculado a projeto ou conversa'});
        store.removeProfile(req.params.id); return {removed:true};
    });
    app.get('/api/v1/endpoints', async () => ({endpoints:store.endpoints()}));
    app.post('/api/v1/endpoints', async (req, reply) => {
        const b = req.body;
        if (!object(b) || Object.keys(b).some(k => !['name','url'].includes(k)) || typeof b.name !== 'string' || !b.name.trim() || b.name.trim().length > 80 || typeof b.url !== 'string' || b.url.length > 2048 || !validSettings({ollamaUrl:b.url})) return reply.code(400).send({error:'Endpoint inválido'});
        return reply.code(201).send(store.createEndpoint(b.name.trim(),b.url));
    });
    app.patch<{Params:{id:string}}>('/api/v1/endpoints/:id', async (req, reply) => {
        const b = req.body;
        if (!object(b) || Object.keys(b).some(k => !['name','url'].includes(k)) || (b.name !== undefined && (typeof b.name !== 'string' || !b.name.trim() || b.name.trim().length > 80)) || (b.url !== undefined && (typeof b.url !== 'string' || b.url.length > 2048 || !validSettings({ollamaUrl:b.url})))) return reply.code(400).send({error:'Endpoint inválido'});
        if (!store.endpoint(req.params.id)) return reply.code(404).send({error:'Endpoint não encontrado'});
        if (active?.endpointId === req.params.id) return reply.code(409).send({error:'Endpoint em uso por geração ativa'});
        const patch: {name?:string;url?:string} = {}; if (typeof b.name === 'string') patch.name=b.name.trim(); if (typeof b.url === 'string') patch.url=b.url;
        return store.updateEndpoint(req.params.id,patch);
    });
    app.delete<{Params:{id:string}}>('/api/v1/endpoints/:id', async (req, reply) => {
        if (!store.endpoint(req.params.id)) return reply.code(404).send({error:'Endpoint não encontrado'});
        if (store.endpointInUse(req.params.id) || active?.endpointId === req.params.id) return reply.code(409).send({error:'Endpoint vinculado a uma conversa ou geração'});
        store.removeEndpoint(req.params.id); return {removed:true};
    });
    app.get('/api/v1/sections', async () => ({ sections: store.sections() }));
    const validMetadata = (body: Record<string, unknown>) =>
        (body.profileId === undefined || validId(body.profileId)) && ['folderPath','repository'].every(key => body[key] === undefined || body[key] === null || typeof body[key] === 'string' && (body[key] as string).trim().length <= 2048) &&
        (body.pinned === undefined || typeof body.pinned === 'boolean');
    const metadata = (body: Record<string, unknown>) => ({
        ...(body.folderPath !== undefined ? { folderPath: typeof body.folderPath === 'string' ? body.folderPath.trim() || null : null } : {}),
        ...(body.repository !== undefined ? { repository: typeof body.repository === 'string' ? body.repository.trim() || null : null } : {}),
        ...(typeof body.pinned === 'boolean' ? { pinned: body.pinned } : {}),
        ...(body.profileId === null || typeof body.profileId === 'string' ? {profileId:body.profileId} : {}),
    });
    app.post('/api/v1/sections', async (req, reply) => {
        const body = req.body;
        if (!object(body) || Object.keys(body).some(key => !['name','folderPath','repository','pinned','profileId'].includes(key)) || !validMetadata(body) || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80)
            return reply.code(400).send({ error: 'Nome de seção inválido' });
        if (typeof body.profileId === 'string' && !store.profile(body.profileId)) return reply.code(404).send({error:'Perfil não encontrado'});
        return reply.code(201).send(store.createSection(body.name.trim(), metadata(body)));
    });
    app.patch<{ Params: { id: string } }>('/api/v1/sections/:id', async (req, reply) => {
        const body = req.body;
        if (!object(body) || Object.keys(body).some(key => !['name','position','folderPath','repository','pinned','profileId'].includes(key)) ||
            !validMetadata(body) || (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80)) ||
            (body.position !== undefined && (!Number.isInteger(body.position) || (body.position as number) < 0 || (body.position as number) >= store.sections().length)))
            return reply.code(400).send({ error: 'Dados de seção inválidos' });
        if (typeof body.profileId === 'string' && !store.profile(body.profileId)) return reply.code(404).send({error:'Perfil não encontrado'});
        if (body.profileId !== undefined && active?.sectionId === req.params.id) return reply.code(409).send({error:'Projeto em geração'});
        const patch: { name?: string; position?: number } = {};
        if (typeof body.name === 'string') patch.name = body.name.trim();
        if (typeof body.position === 'number') patch.position = body.position;
        return store.updateSection(req.params.id, { ...patch, ...metadata(body) }) ?? reply.code(404).send({ error: 'Seção não encontrada' });
    });
    app.post<{ Params: { id: string } }>('/api/v1/sections/:id/remove', async (req, reply) => {
        if (!object(req.body) || Object.keys(req.body).length) return reply.code(400).send({ error: 'Dados inválidos' });
        if (!store.removeSection(req.params.id)) return reply.code(404).send({ error: 'Seção não encontrada' });
        return { removed: true };
    });
    const validSectionId = (value: unknown): value is string | null => value === null || typeof value === 'string' && !!value.trim() && value.length <= 512;
    app.get('/api/v1/conversations', async () => ({ conversations: store.list() }));
    app.post('/api/v1/conversations', async (req, reply) => {
        const body = req.body;
        if (!object(body) || Object.keys(body).some(key => !['title','sectionId','endpointId','profileId','configOverrides'].includes(key)) ||
            (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200)) ||
            (body.sectionId !== undefined && !validSectionId(body.sectionId)) || (body.endpointId !== undefined && !validSectionId(body.endpointId)) || (body.profileId !== undefined && !validId(body.profileId)) || (body.configOverrides !== undefined && body.configOverrides !== null && !validGeneration(body.configOverrides))) return reply.code(400).send({ error: 'Dados inválidos' });
        if (typeof body.sectionId === 'string' && !store.section(body.sectionId)) return reply.code(404).send({ error: 'Seção não encontrada' });
        if (typeof body.endpointId === 'string' && !store.endpoint(body.endpointId)) return reply.code(404).send({error:'Endpoint não encontrado'});
        if (typeof body.profileId === 'string' && !store.profile(body.profileId)) return reply.code(404).send({error:'Perfil não encontrado'});
        return reply.code(201).send(store.create(typeof body.title === 'string' ? body.title.trim() : 'Nova conversa', body.sectionId as string | null | undefined, body.endpointId as string | null | undefined, body.profileId as string | null | undefined, object(body.configOverrides) && Object.keys(body.configOverrides).length ? body.configOverrides as Partial<GenerationSettings> : null));
    });
    app.get<{ Params: { id: string } }>('/api/v1/conversations/:id', async (req, reply) => store.get(req.params.id) ?? reply.code(404).send({ error: 'Conversa não encontrada' }));
    app.patch<{ Params: { id: string } }>('/api/v1/conversations/:id', async (req, reply) => {
        const body = req.body;
        if (!object(body) || Object.keys(body).some(key => !['title','archived','pinned','sectionId','endpointId','profileId','configOverrides'].includes(key)) ||
            (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200)) ||
            (body.archived !== undefined && typeof body.archived !== 'boolean') || (body.pinned !== undefined && typeof body.pinned !== 'boolean') ||
            (body.sectionId !== undefined && !validSectionId(body.sectionId)) || (body.endpointId !== undefined && !validSectionId(body.endpointId)) || (body.profileId !== undefined && !validId(body.profileId)) || (body.configOverrides !== undefined && body.configOverrides !== null && !validGeneration(body.configOverrides))) return reply.code(400).send({ error: 'Dados inválidos' });
        if (!store.get(req.params.id)) return reply.code(404).send({ error: 'Conversa não encontrada' });
        if (typeof body.sectionId === 'string' && !store.section(body.sectionId)) return reply.code(404).send({ error: 'Seção não encontrada' });
        if (typeof body.endpointId === 'string' && !store.endpoint(body.endpointId)) return reply.code(404).send({error:'Endpoint não encontrado'});
        if (typeof body.profileId === 'string' && !store.profile(body.profileId)) return reply.code(404).send({error:'Perfil não encontrado'});
        if ((body.profileId !== undefined || body.configOverrides !== undefined || body.sectionId !== undefined) && active?.id === req.params.id) return reply.code(409).send({error:'Conversa em geração'});
        if (body.endpointId !== undefined && active?.id === req.params.id) return reply.code(409).send({error:'Conversa em geração'});
        const patch: { title?: string; archived?: boolean; pinned?: boolean; sectionId?: string | null; endpointId?: string | null; profileId?: string | null; configOverrides?: Partial<GenerationSettings> | null } = {};
        if (typeof body.title === 'string') patch.title = body.title.trim();
        if (typeof body.archived === 'boolean') patch.archived = body.archived;
        if (typeof body.pinned === 'boolean') patch.pinned = body.pinned;
        if (body.sectionId === null || typeof body.sectionId === 'string') patch.sectionId = body.sectionId;
        if (body.endpointId === null || typeof body.endpointId === 'string') patch.endpointId = body.endpointId;
        if (body.profileId === null || typeof body.profileId === 'string') patch.profileId = body.profileId;
        if (body.configOverrides === null || object(body.configOverrides)) patch.configOverrides = body.configOverrides && Object.keys(body.configOverrides).length ? body.configOverrides as Partial<GenerationSettings> : null;
        return store.update(req.params.id, patch);
    });
    app.post<{ Params: { id: string } }>('/api/v1/conversations/:id/fork', async (req, reply) => {
        const body = req.body;
        if (!object(body) || Object.keys(body).some(key => key !== 'messageId') || typeof body.messageId !== 'string' || !body.messageId.trim() || body.messageId.length > 512)
            return reply.code(400).send({ error: 'Mensagem inválida' });
        const source = store.get(req.params.id);
        if (!source) return reply.code(404).send({ error: 'Conversa não encontrada' });
        const anchor = source.messages.find(message => message.id === body.messageId);
        if (!anchor) return reply.code(404).send({ error: 'Mensagem não encontrada nesta conversa' });
        if (anchor.role !== 'user') return reply.code(400).send({ error: 'A mensagem deve ser do usuário' });
        if (active?.id === req.params.id || source.messages.some(message => message.status === 'streaming')) return reply.code(409).send({ error: 'A conversa está em geração' });
        return reply.code(201).send(store.fork(source, anchor.id));
    });
    app.post<{
        Params: {
            id: string;
        };
    }>('/api/v1/conversations/:id/cancel', async (req) => {
        const generation = active;
        if (generation?.id !== req.params.id) return { cancelled: false };
        generation.controller.abort();
        await generation.finished;
        return { cancelled: true };
    });
    app.post<{
        Params: {
            id: string;
        };
    }>('/api/v1/conversations/:id/messages', async (req, reply) => {
        const b = req.body;
        if (!object(b) || Object.keys(b).some(k => !['content', 'model', 'attachments'].includes(k)) || typeof b.content !== 'string' || b.content.length > 100000 || (b.model !== undefined && (typeof b.model !== 'string' || !b.model.trim() || b.model.length > 512)))
            return reply.code(400).send({ error: 'Mensagem inválida' });
        let attachments;
        try { attachments = validateAttachments(b.attachments); }
        catch (error) { return reply.code(400).send({ error: errorText(error) }); }
        if (!b.content.trim() && !attachments.length) return reply.code(400).send({ error: 'Mensagem vazia' });
        const detail = store.get(req.params.id);
        if (!detail)
            return reply.code(404).send({ error: 'Conversa não encontrada' });
        const resolved = resolveConfiguration(detail.conversation);
        const settings = resolved.settings;
        const model = (typeof b.model === 'string' ? b.model : settings.model).trim();
        if (!model)
            return reply.code(400).send({ error: 'Selecione um modelo Ollama' });
        if (active)
            return reply.code(409).send({ error: 'Já existe uma geração em andamento' });
        const endpoint = detail.conversation.endpointId ? store.endpoint(detail.conversation.endpointId) : undefined;
        if (detail.conversation.endpointId && !endpoint) return reply.code(404).send({error:'Endpoint não encontrado'});
        const endpointUrl = endpoint?.url ?? settings.ollamaUrl;
        const provider = factory(endpointUrl);
        const { user, assistant } = store.createTurn(req.params.id, b.content, model, attachments);
        const controller = new AbortController();
        let finish!: () => void;
        const finished = new Promise<void>(resolve => { finish = resolve; });
        active = { id: req.params.id, controller, finished, endpointId: detail.conversation.endpointId, profileId: resolved.profileId, sectionId: detail.conversation.sectionId };
        // A rejected attachment remains visible in storage but must not poison later requests.
        // Cancelled turns and errors after generation retain their previous context behavior.
        const history = [...detail.messages.filter((message, index, all) => {
            if (message.status !== 'complete') return false;
            const response = all[index + 1];
            return !(message.role === 'user' && message.attachments?.length && response?.role === 'assistant' &&
                response.status === 'error' && !response.activities?.some(activity => activity.kind === 'generation'));
        }), user];
        const allAttachments = history.flatMap(message => message.attachments ?? []);
        const messages = prepareAttachmentMessages(history, settings.systemPrompt);
        reply.hijack();
        reply.raw.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', ...(req.headers.origin ? { 'Access-Control-Allow-Origin': req.headers.origin, 'Vary': 'Origin' } : {}) });
        const write = (event: ChatStreamEvent) => { if (!reply.raw.destroyed)
            reply.raw.write(JSON.stringify(event) + '\n'); };
        const disconnect = () => { if (!reply.raw.writableEnded)
            controller.abort(); };
        reply.raw.on('close', disconnect);
        write({ type: 'message', message: user });
        write({ type: 'message', message: assistant });
        let current: MessageActivity | undefined;
        const startActivity = (kind: MessageActivity['kind'], label: string) => {
            current = { id: randomUUID(), kind, label, status: 'running', startedAt: new Date().toISOString() };
            (assistant.activities ??= []).push(current);
            store.updateMessage(assistant);
            write({ type: 'activity', messageId: assistant.id, activity: current });
        };
        const finishActivity = (status: MessageActivity['status']) => {
            if (!current) return;
            current.status = status;
            current.completedAt = new Date().toISOString();
            store.updateMessage(assistant);
            write({ type: 'activity', messageId: assistant.id, activity: current });
            current = undefined;
        };
        try {
            let recommendation: ModelRecommendations | null = null;
            startActivity('model', 'Consultando informações do modelo');
            try { recommendation = await provider.recommendations?.(model, controller.signal) ?? null; }
            catch { if (controller.signal.aborted) throw new Error('Cancelado'); finishActivity('error'); }
            if (controller.signal.aborted) throw new Error('Cancelado');
            finishActivity('complete');
            startActivity('hardware', 'Avaliando capacidade de memória');
            const estimateResult = await estimate(provider, endpointUrl, recommendation, settings.followModelDefaults ? undefined : settings.numCtx, controller.signal);
            if (controller.signal.aborted) throw new Error('Cancelado');
            if (current && (estimateResult.hardware.canRun === false || !settings.followModelDefaults && (settings.numCtx > estimateResult.hardware.contextCap || recommendation?.contextLimit != null && settings.numCtx > recommendation.contextLimit))) {
                current.label = estimateResult.hardware.canRun === false
                    ? 'Aviso: capacidade de memória estimada insuficiente'
                    : 'Aviso: contexto manual acima do limite recomendado';
            }
            if (allAttachments.some(attachment => attachment.kind === 'image') && !recommendation?.capabilities.includes('vision')) throw new Error('O modelo não confirmou suporte a imagens.');
            if (allAttachments.length && !estimateAttachmentContext(messages, allAttachments, estimateResult.effectiveNumCtx).fits) throw new Error('Os anexos e o histórico excedem o contexto disponível para este modelo.');
            finishActivity('complete');
            startActivity('generation', 'Gerando resposta');
            for await (const delta of provider.chat({ model, messages, numCtx: estimateResult.effectiveNumCtx, ...(settings.followModelDefaults ? {} : { temperature: settings.temperature, ...(settings.think === null ? {} : { think: settings.think }) }), signal: controller.signal })) {
                if (controller.signal.aborted)
                    break;
                assistant.content += delta;
                store.updateMessage(assistant);
                write({ type: 'delta', content: delta });
                // Give incoming cancellation requests a turn even when provider chunks are buffered.
                await yieldToEventLoop();
            }
            finishActivity(controller.signal.aborted ? 'cancelled' : 'complete');
            assistant.status = controller.signal.aborted ? 'cancelled' : 'complete';
            store.updateMessage(assistant);
            write({ type: 'done', message: assistant });
        }
        catch (error) {
            finishActivity(controller.signal.aborted ? 'cancelled' : 'error');
            assistant.status = controller.signal.aborted ? 'cancelled' : 'error';
            store.updateMessage(assistant);
            if (controller.signal.aborted)
                write({ type: 'done', message: assistant });
            else {
                write({ type: 'error', error: errorText(error) });
                write({ type: 'done', message: assistant });
            }
        }
        finally {
            active = undefined;
            reply.raw.off('close', disconnect);
            reply.raw.end();
            finish();
        }
    });
    return app;
}

