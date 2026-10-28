import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppSettings, Conversation, ConversationDetail, Message, MessageAttachment, SidebarSection, GenerationSettings, ModelProfile } from '@codex-local/contracts';
const defaults: AppSettings = { ollamaUrl: 'http://127.0.0.1:11434', model: '', systemPrompt: '', followModelDefaults: true, temperature: 0.7, numCtx: 4096, think: null, theme: 'system' };
export class Store {
    private db: DatabaseSync;
    private defaultOllamaUrl: string;
    constructor(directory: string, ollamaUrl = defaults.ollamaUrl) {
        this.defaultOllamaUrl = ollamaUrl;
        mkdirSync(directory, { recursive: true });
        this.db = new DatabaseSync(join(directory, 'codex-local.sqlite'));
        this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, model TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, conversationId TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, createdAt TEXT NOT NULL, status TEXT NOT NULL, model TEXT); CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversationId, createdAt);`);
        const columns = new Set((this.db.prepare('PRAGMA table_info(conversations)').all() as Array<{name: string}>).map(column => column.name));
        this.db.exec('BEGIN IMMEDIATE');
        try {
            this.db.exec('CREATE TABLE IF NOT EXISTS sections (id TEXT PRIMARY KEY, name TEXT NOT NULL, position INTEGER NOT NULL, createdAt TEXT NOT NULL)');
            const sectionColumns = new Set((this.db.prepare('PRAGMA table_info(sections)').all() as Array<{name:string}>).map(column => column.name));
            for (const field of ['folderPath','repository']) if (!sectionColumns.has(field)) this.db.exec(`ALTER TABLE sections ADD COLUMN ${field} TEXT`);
            if (!sectionColumns.has('profileId')) this.db.exec('ALTER TABLE sections ADD COLUMN profileId TEXT');
            if (!sectionColumns.has('pinned')) this.db.exec('ALTER TABLE sections ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0');
            const messageColumns = new Set((this.db.prepare('PRAGMA table_info(messages)').all() as Array<{name:string}>).map(column => column.name));
            if (!messageColumns.has('attachments')) this.db.exec('ALTER TABLE messages ADD COLUMN attachments TEXT');
            if (!messageColumns.has('activities')) this.db.exec('ALTER TABLE messages ADD COLUMN activities TEXT');
            const interrupted = this.db.prepare("SELECT id,activities FROM messages WHERE status='streaming'").all();
            const recover = this.db.prepare("UPDATE messages SET status='error',activities=? WHERE id=?");
            for (const row of interrupted) {
                const activities = row.activities ? JSON.parse(row.activities as string) : [];
                for (const activity of activities) if (activity.status === 'running') { activity.status = 'error'; activity.completedAt = new Date().toISOString(); }
                recover.run(activities.length ? JSON.stringify(activities) : null, row.id as string);
            }
            this.db.exec('CREATE TABLE IF NOT EXISTS endpoints (id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, createdAt TEXT NOT NULL)');
            this.db.exec('CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL, settings TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL)');
            if (!columns.has('profileId')) this.db.exec('ALTER TABLE conversations ADD COLUMN profileId TEXT');
            if (!columns.has('configOverrides')) this.db.exec('ALTER TABLE conversations ADD COLUMN configOverrides TEXT');
            if (!columns.has('endpointId')) this.db.exec('ALTER TABLE conversations ADD COLUMN endpointId TEXT');
            if (!columns.has('sectionId')) this.db.exec('ALTER TABLE conversations ADD COLUMN sectionId TEXT');
            if (!columns.has('pinned')) this.db.exec('ALTER TABLE conversations ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0');
            if (!columns.has('parentId')) this.db.exec('ALTER TABLE conversations ADD COLUMN parentId TEXT');
            if (!columns.has('forkedFromMessageId')) this.db.exec('ALTER TABLE conversations ADD COLUMN forkedFromMessageId TEXT');
            this.db.exec('COMMIT');
        } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    }
    close() { this.db.close(); }
    settings(): AppSettings { const row = this.db.prepare('SELECT value FROM settings WHERE id=1').get() as {
        value: string;
    } | undefined; return row ? { ...defaults, ollamaUrl: this.defaultOllamaUrl, ...JSON.parse(row.value) } : { ...defaults, ollamaUrl: this.defaultOllamaUrl }; }
    saveSettings(value: AppSettings) { this.db.prepare('INSERT INTO settings(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(JSON.stringify(value)); }
    private sectionRow(row: Record<string, unknown>): SidebarSection {
        return { id: row.id as string, name: row.name as string, position: row.position as number, createdAt: row.createdAt as string,
            ...(row.folderPath ? {folderPath: row.folderPath as string} : {}), ...(row.repository ? {repository: row.repository as string} : {}), pinned: !!row.pinned, ...(row.profileId ? {profileId: row.profileId as string} : {}) };
    }
    sections(): SidebarSection[] { return this.db.prepare('SELECT * FROM sections ORDER BY position,id').all().map(row => this.sectionRow(row)); }
    section(id: string): SidebarSection | undefined { const row = this.db.prepare('SELECT * FROM sections WHERE id=?').get(id); return row ? this.sectionRow(row) : undefined; }
    createSection(name: string, metadata: { folderPath?: string | null; repository?: string | null; pinned?: boolean; profileId?: string | null } = {}): SidebarSection {
        const id = randomUUID();
        this.db.prepare('INSERT INTO sections (id,name,position,createdAt,folderPath,repository,pinned,profileId) VALUES(?,?,?,?,?,?,?,?)').run(id,name,this.sections().length,new Date().toISOString(),metadata.folderPath || null,metadata.repository || null,Number(metadata.pinned ?? false),metadata.profileId ?? null);
        return this.section(id)!;
    }
    updateSection(id: string, patch: {name?: string; position?: number; folderPath?: string | null; repository?: string | null; pinned?: boolean; profileId?: string | null}): SidebarSection | undefined {
        const all = this.sections();
        const index = all.findIndex(section => section.id === id);
        if (index < 0) return undefined;
        const [section] = all.splice(index,1);
        if (patch.name !== undefined) section.name = patch.name;
        if (patch.folderPath !== undefined) section.folderPath = patch.folderPath || undefined;
        if (patch.repository !== undefined) section.repository = patch.repository || undefined;
        if (patch.pinned !== undefined) section.pinned = patch.pinned;
        if (patch.profileId !== undefined) section.profileId = patch.profileId || undefined;
        all.splice(patch.position ?? index, 0, section);
        this.db.exec('BEGIN IMMEDIATE');
        try {
            const update = this.db.prepare('UPDATE sections SET name=?,position=?,folderPath=?,repository=?,pinned=?,profileId=? WHERE id=?');
            all.forEach((item,position) => update.run(item.name,position,item.folderPath ?? null,item.repository ?? null,Number(item.pinned),item.profileId ?? null,item.id));
            this.db.exec('COMMIT');
        } catch (error) { this.db.exec('ROLLBACK'); throw error; }
        return this.section(id);
    }
    removeSection(id: string): boolean {
        if (!this.section(id)) return false;
        this.db.exec('BEGIN IMMEDIATE');
        try {
            this.db.prepare('UPDATE conversations SET sectionId=NULL WHERE sectionId=?').run(id);
            this.db.prepare('DELETE FROM sections WHERE id=?').run(id);
            const update = this.db.prepare('UPDATE sections SET position=? WHERE id=?');
            this.sections().forEach((item,position) => update.run(position,item.id));
            this.db.exec('COMMIT');
        } catch (error) { this.db.exec('ROLLBACK'); throw error; }
        return true;
    }
    profiles(): ModelProfile[] {
        return this.db.prepare('SELECT * FROM profiles ORDER BY createdAt,id').all().map(row => ({id:row.id as string,name:row.name as string,createdAt:row.createdAt as string,updatedAt:row.updatedAt as string,...JSON.parse(row.settings as string)}));
    }
    profile(id: string): ModelProfile | undefined { return this.profiles().find(profile => profile.id === id); }
    createProfile(name: string, settings: GenerationSettings): ModelProfile {
        const id = randomUUID(), now = new Date().toISOString();
        this.db.prepare('INSERT INTO profiles (id,name,settings,createdAt,updatedAt) VALUES(?,?,?,?,?)').run(id,name,JSON.stringify(settings),now,now);
        return this.profile(id)!;
    }
    updateProfile(id: string, name: string, settings: GenerationSettings): ModelProfile {
        this.db.prepare('UPDATE profiles SET name=?,settings=?,updatedAt=? WHERE id=?').run(name,JSON.stringify(settings),new Date().toISOString(),id);
        return this.profile(id)!;
    }
    profileInUse(id: string): boolean { return !!this.db.prepare('SELECT 1 FROM conversations WHERE profileId=? UNION ALL SELECT 1 FROM sections WHERE profileId=? LIMIT 1').get(id,id); }
    removeProfile(id: string): void { this.db.prepare('DELETE FROM profiles WHERE id=?').run(id); }
    endpoints(): Array<{id:string;name:string;url:string;createdAt:string}> {
        return this.db.prepare('SELECT id,name,url,createdAt FROM endpoints ORDER BY createdAt,id').all() as unknown as Array<{id:string;name:string;url:string;createdAt:string}>;
    }
    endpoint(id: string) { return this.endpoints().find(item => item.id === id); }
    createEndpoint(name: string, url: string) {
        const endpoint = {id:randomUUID(),name,url,createdAt:new Date().toISOString()};
        this.db.prepare('INSERT INTO endpoints (id,name,url,createdAt) VALUES(?,?,?,?)').run(endpoint.id,name,url,endpoint.createdAt);
        return endpoint;
    }
    updateEndpoint(id: string, patch: {name?:string;url?:string}) {
        const endpoint = this.endpoint(id); if (!endpoint) return undefined;
        const updated = {...endpoint,...patch}; this.db.prepare('UPDATE endpoints SET name=?,url=? WHERE id=?').run(updated.name,updated.url,id); return updated;
    }
    endpointInUse(id: string): boolean { return !!this.db.prepare('SELECT 1 FROM conversations WHERE endpointId=? LIMIT 1').get(id); }
    removeEndpoint(id: string): boolean { return Number(this.db.prepare('DELETE FROM endpoints WHERE id=?').run(id).changes) > 0; }
    private conversation(row: Record<string, unknown>): Conversation {
        return { id: row.id as string, title: row.title as string, model: row.model as string,
            createdAt: row.createdAt as string, updatedAt: row.updatedAt as string,
            archived: !!row.archived, pinned: !!row.pinned,
            ...(row.profileId ? { profileId: row.profileId as string } : {}),
            ...(row.configOverrides ? { configOverrides: JSON.parse(row.configOverrides as string) } : {}),
            ...(row.endpointId ? { endpointId: row.endpointId as string } : {}),
            ...(row.sectionId ? { sectionId: row.sectionId as string } : {}),
            ...(row.parentId ? { parentId: row.parentId as string } : {}),
            ...(row.forkedFromMessageId ? { forkedFromMessageId: row.forkedFromMessageId as string } : {}) };
    }
    list(): Conversation[] {
        return this.db.prepare('SELECT * FROM conversations ORDER BY pinned DESC, updatedAt DESC, id ASC').all().map(row => this.conversation(row));
    }
    get(id: string): ConversationDetail | undefined {
        const row = this.db.prepare('SELECT * FROM conversations WHERE id=?').get(id);
        if (!row) return undefined;
        const messages = this.db.prepare('SELECT * FROM messages WHERE conversationId=? ORDER BY rowid').all(id) as unknown as Message[];
        return { conversation: this.conversation(row), messages: messages.map(m => ({ ...m, model: m.model ?? undefined, activities: m.activities ? JSON.parse(m.activities as unknown as string) : undefined, attachments: m.attachments ? JSON.parse(m.attachments as unknown as string) : undefined })) };
    }
    create(title: string, sectionId?: string | null, endpointId?: string | null, profileId?: string | null, configOverrides?: Partial<GenerationSettings> | null): ConversationDetail {
        const now = new Date().toISOString();
        const c: Conversation = { id: randomUUID(), title, model: '', createdAt: now, updatedAt: now, archived: false, pinned: false, ...(sectionId ? { sectionId } : {}), ...(endpointId ? { endpointId } : {}), ...(profileId ? { profileId } : {}), ...(configOverrides ? { configOverrides } : {}) };
        this.db.prepare('INSERT INTO conversations (id,title,model,createdAt,updatedAt,archived,pinned,sectionId,endpointId,profileId,configOverrides) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(c.id,c.title,c.model,c.createdAt,c.updatedAt,0,0,sectionId ?? null,endpointId ?? null,profileId ?? null,configOverrides ? JSON.stringify(configOverrides) : null);
        return { conversation: c, messages: [] };
    }
    update(id: string, patch: Partial<Pick<Conversation,'title'|'archived'|'model'|'pinned'>> & { sectionId?: string | null; endpointId?: string | null; profileId?: string | null; configOverrides?: Partial<GenerationSettings> | null }): Conversation | undefined {
        const c = this.get(id)?.conversation;
        if (!c) return undefined;
        const updated = { ...c, ...patch, updatedAt: new Date().toISOString() };
        if (updated.sectionId === null) delete updated.sectionId;
        if (updated.endpointId === null) delete updated.endpointId;
        if (updated.profileId === null) delete updated.profileId;
        if (updated.configOverrides === null) delete updated.configOverrides;
        this.db.prepare('UPDATE conversations SET title=?,model=?,archived=?,pinned=?,sectionId=?,endpointId=?,profileId=?,configOverrides=?,updatedAt=? WHERE id=?').run(updated.title,updated.model,Number(updated.archived),Number(updated.pinned),updated.sectionId ?? null,updated.endpointId ?? null,updated.profileId ?? null,updated.configOverrides ? JSON.stringify(updated.configOverrides) : null,updated.updatedAt,id);
        return this.get(id)?.conversation;
    }
    fork(source: ConversationDetail, anchorId: string): ConversationDetail {
        const index = source.messages.findIndex(message => message.id === anchorId);
        const title = source.conversation.title.slice(0, 200 - ' — ramificação'.length) + ' — ramificação';
        const now = new Date().toISOString();
        const id = randomUUID();
        this.db.exec('BEGIN IMMEDIATE');
        try {
            this.db.prepare('INSERT INTO conversations (id,title,model,createdAt,updatedAt,archived,pinned,parentId,forkedFromMessageId,sectionId,endpointId,profileId,configOverrides) VALUES(?,?,?,?,?,0,0,?,?,?,?,?,?)').run(id,title,source.conversation.model,now,now,source.conversation.id,anchorId,source.conversation.sectionId ?? null,source.conversation.endpointId ?? null,source.conversation.profileId ?? null,source.conversation.configOverrides ? JSON.stringify(source.conversation.configOverrides) : null);
            const insert = this.db.prepare('INSERT INTO messages (id,conversationId,role,content,createdAt,status,model,activities,attachments) VALUES(?,?,?,?,?,?,?,?,?)');
            for (const message of source.messages.slice(0,index)) {
                insert.run(randomUUID(),id,message.role,message.content,message.createdAt,message.status,message.model ?? null,message.activities ? JSON.stringify(message.activities) : null,message.attachments ? JSON.stringify(message.attachments.map(a => ({ ...a, id: randomUUID() }))) : null);
            }
            this.db.exec('COMMIT');
        } catch (error) { this.db.exec('ROLLBACK'); throw error; }
        return this.get(id)!;
    }
    addMessage(id: string, role: Message['role'], content: string, status: Message['status'], model?: string, attachments?: MessageAttachment[]): Message { const m: Message = { id: randomUUID(), conversationId: id, role, content, createdAt: new Date().toISOString(), status, ...(model ? { model } : {}), ...(attachments?.length ? { attachments } : {}) }; this.db.prepare('INSERT INTO messages (id,conversationId,role,content,createdAt,status,model,attachments) VALUES(?,?,?,?,?,?,?,?)').run(m.id, id, role, content, m.createdAt, status, model ?? null, attachments?.length ? JSON.stringify(attachments) : null); return m; }
    createTurn(id: string, content: string, model: string, attachments?: MessageAttachment[]): { user: Message; assistant: Message } {
        this.db.exec('BEGIN IMMEDIATE');
        try {
            const user = this.addMessage(id, 'user', content, 'complete', undefined, attachments);
            const assistant = this.addMessage(id, 'assistant', '', 'streaming', model);
            this.update(id, { model });
            this.db.exec('COMMIT');
            return { user, assistant };
        } catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }
    updateMessage(m: Message) { this.db.prepare('UPDATE messages SET content=?,status=?,activities=? WHERE id=?').run(m.content, m.status, m.activities ? JSON.stringify(m.activities) : null, m.id); }
}


