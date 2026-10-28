import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, ChevronDown, ChevronRight, CircleAlert, Clipboard, Cpu, FileDown, LoaderCircle, MoreHorizontal, Pencil, RotateCcw, Sparkles, SquareTerminal } from 'lucide-react';
import type { Message, MessageActivity } from '@codex-local/contracts';
import './MessageView.css';

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Try the legacy path on insecure LAN origins. */ }
  }
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const area = document.createElement('textarea');
  area.value = text; area.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.appendChild(area); area.select();
  try { if (!document.execCommand('copy')) throw new Error('Cópia indisponível'); } finally { area.remove(); previous?.focus({ preventScroll: true }); }
}
function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  useEffect(() => { if (state === 'idle') return; const timer = window.setTimeout(() => setState('idle'), 2000); return () => clearTimeout(timer); }, [state]);
  return <><button type="button" className="msg-icon" aria-label={state === 'copied' ? 'Copiado' : label} title={state === 'copied' ? 'Copiado' : label} onClick={() => { void copyText(text).then(() => setState('copied'), () => setState('error')); }}>{state === 'copied' ? <Check size={14}/> : <Clipboard size={14}/>}</button><span className="msg-sr" role="status">{state === 'copied' ? 'Copiado' : state === 'error' ? 'Não foi possível copiar' : ''}</span></>;
}
export function CodeBlock({ children }: { children?: React.ReactNode }) {
  const child = React.Children.toArray(children)[0];
  const props = React.isValidElement<{ className?: string; children?: React.ReactNode }>(child) ? child.props : {};
  const code = String(props.children ?? '').replace(/\n$/, '');
  const language = /language-([^\s]+)/.exec(props.className ?? '')?.[1] ?? 'texto';
  if (/^(markdown|md)$/i.test(language)) return <div className="msg-markdown-inline"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock }}>{code}</ReactMarkdown></div>;
  return <div className="msg-code"><div className="msg-code-header"><span><SquareTerminal size={14}/> {language}</span><CopyButton text={code} label="Copiar código"/></div><pre><code>{code}</code></pre></div>;
}
function duration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60);
  return hours ? `${hours} h ${minutes % 60} min ${seconds % 60} s` : minutes ? `${minutes} min ${seconds % 60} s` : `${seconds} s`;
}
function Activity({ activities, streaming, createdAt }: { activities: MessageActivity[]; streaming: boolean; createdAt: string }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const [now, setNow] = useState(Date.now());
  const running = streaming || activities.some(a => a.status === 'running');
  const expanded = open ?? running;
  useEffect(() => { if (!running) return; setNow(Date.now()); const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [running]);
  if (!activities.length && !streaming) return null;
  const timestamps = activities.map(a => Date.parse(a.startedAt)).filter(Number.isFinite);
  const start = timestamps.length ? Math.min(...timestamps) : Date.parse(createdAt);
  const ends = activities.map(a => Date.parse(a.completedAt ?? '')).filter(Number.isFinite);
  const end = running ? now : ends.length ? Math.max(...ends) : start;
  const elapsed = duration(Number.isFinite(start) && Number.isFinite(end) ? end - start : 0);
  return <div className="msg-activity"><button type="button" className="msg-activity-heading" aria-expanded={expanded} onClick={() => setOpen(!expanded)}>{running ? `Processando há ${elapsed}` : `Trabalhou por ${elapsed}`} {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button>{expanded && <ul>{activities.map(a => <li key={a.id}>{a.status === 'running' ? <LoaderCircle size={14} className="msg-spin"/> : a.status === 'error' ? <CircleAlert size={14}/> : a.kind === 'hardware' ? <Cpu size={14}/> : a.kind === 'model' ? <Sparkles size={14}/> : <Check size={14}/>}<span>{a.label}</span><small>{a.status === 'cancelled' ? 'Interrompido' : a.status === 'error' ? 'Falhou' : a.status === 'complete' ? 'Concluído' : 'Em andamento'}</small></li>)}{running && !activities.length && <li><LoaderCircle size={14} className="msg-spin"/><span>Aguardando modelo…</span></li>}</ul>}</div>;
}
export function MessageView({ message, busy, canRetry, onEdit, onRetry }: { message: Message; busy: boolean; canRetry: boolean; onEdit: (button: HTMLButtonElement) => void; onRetry: () => void }) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!menu) return; const pointer = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenu(false); }; const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenu(false); triggerRef.current?.focus(); } }; document.addEventListener('pointerdown', pointer); document.addEventListener('keydown', key); return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key); }; }, [menu]);
  const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (message.role === 'user') return <article className="msg-user" aria-label="Mensagem do usuário"><div className="msg-user-bubble">{message.content && <div className="msg-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock }}>{message.content}</ReactMarkdown></div>}{message.attachments?.map(a => <div className="msg-attachment" key={a.id}>{a.kind === 'image' && a.data && <img alt={`Imagem anexada: ${a.name}`} src={`data:${a.mimeType};base64,${a.data}`}/>}<button className="msg-attachment-download" title={`Baixar ${a.name}`} aria-label={`Baixar ${a.name}`} onClick={() => { const blob = a.kind === 'text' ? new Blob([a.text || ''], { type: 'text/plain;charset=utf-8' }) : new Blob([Uint8Array.from(atob(a.data || ''), c => c.charCodeAt(0))], { type: a.mimeType }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = a.name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }}><FileDown size={14}/> {a.name} · {(a.size / 1024).toFixed(1)} KiB</button></div>)}</div><div className="msg-user-actions"><time dateTime={message.createdAt}>{time}</time><CopyButton text={message.content} label="Copiar mensagem"/><button className="msg-icon" type="button" title="Editar mensagem" aria-label="Editar mensagem" disabled={busy} onClick={e => onEdit(e.currentTarget)}><Pencil size={14}/></button></div></article>;
  return <article className="msg-assistant" aria-label="Resposta do assistente"><Activity activities={message.activities ?? []} streaming={message.status === 'streaming'} createdAt={message.createdAt}/>{message.content && <div ref={responseRef} className="msg-markdown" tabIndex={-1}><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock }}>{message.content}</ReactMarkdown></div>}{message.status === 'cancelled' && <div className="msg-status">Interrompida</div>}{message.status === 'error' && <div className="msg-status msg-error">Falha na resposta</div>}{message.content && <div className="msg-assistant-actions"><CopyButton text={message.content} label="Copiar resposta"/><button className="msg-icon" type="button" aria-label="Tentar novamente" title="Tentar novamente" disabled={busy || !canRetry} onClick={onRetry}><RotateCcw size={14}/></button><div className="msg-menu-wrap" ref={menuRef}><button ref={triggerRef} className="msg-icon" type="button" aria-label="Mais opções" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(v => !v)}><MoreHorizontal size={15}/></button>{menu && <div className="msg-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setMenu(false); responseRef.current?.focus({ preventScroll: true }); responseRef.current?.scrollIntoView({ block: "nearest" }); }}>Ver no chat</button></div>}</div></div>}</article>;
}
