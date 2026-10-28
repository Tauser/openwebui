// Referências vetoriais autorais do planejamento; não implementa o produto.
// Uso: node docs/design/gerar-referencias.cjs
const fs = require('node:fs');
const path = require('node:path');

const themes = {
  escuro: { bg:'#141414',side:'#101010',surface:'#1C1C1C',raised:'#252525',hover:'#2C2C2C',border:'#343434',text:'#F2F2F2',muted:'#B0B0B0',accent:'#9DDDC5',ok:'#8BDBAA',warn:'#F3CB80',added:'#173025',removed:'#352021',outer:'#080A09' },
  claro: { bg:'#FFFFFF',side:'#F5F5F4',surface:'#F7F7F6',raised:'#FFFFFF',hover:'#ECECE9',border:'#DADAD5',text:'#202020',muted:'#61615B',accent:'#19624B',ok:'#206C3C',warn:'#805600',added:'#E8F5EC',removed:'#FCEBEC',outer:'#EAECE9' }
};
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function canvas(width,height,c,title) {
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${esc(title)}</title><desc id="desc">Proposta estática de aparência. Todos os modelos, resultados e estados são ilustrativos.</desc>`];
  const rect = (x,y,w,h,fill,r=0,stroke) => out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke?` stroke="${stroke}"`:''}/>`);
  const text = (x,y,value,size=14,color=c.text,weight=400,mono=false) => out.push(`<text x="${x}" y="${y}" fill="${color}" font-family="${mono?'Cascadia Code,Consolas,monospace':'Segoe UI,Arial,sans-serif'}" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`);
  const line = (x1,y1,x2,y2,color=c.border) => out.push(`<path d="M${x1} ${y1}H${x2}"${y1!==y2?` transform="rotate(${Math.atan2(y2-y1,x2-x1)*180/Math.PI} ${x1} ${y1})"`:''} stroke="${color}"/>`);
  const vline = (x,y,h,color=c.border) => out.push(`<path d="M${x} ${y}v${h}" stroke="${color}"/>`);
  const dot = (x,y,color=c.accent,r=3) => out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`);
  const chip = (x,y,w,label,fill=c.raised,color=c.muted) => {rect(x,y,w,26,fill,7,c.border);text(x+10,y+18,label,11,color);};
  const icon = (x,y,type,color=c.muted) => {
    const attrs=`fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`;
    const paths={plus:'M8 2v12M2 8h12',search:'M11 11l4 4M12 7a5 5 0 1 1-10 0a5 5 0 0 1 10 0',folder:'M1 4h5l2 2h7v8H1z',chat:'M2 2h12v9H7l-4 3v-3H2z',file:'M3 1h7l3 3v11H3zM9 1v4h4',check:'M2 8l4 4L14 3',menu:'M2 4h12M2 8h12M2 12h12',arrow:'M8 13V3M3 8l5-5l5 5',terminal:'M2 4l4 4l-4 4M8 12h6',gear:'M2 8a6 6 0 1 0 12 0a6 6 0 0 0-12 0M5 8a3 3 0 1 0 6 0a3 3 0 0 0-6 0',mic:'M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0zM2 7v1a6 6 0 0 0 12 0V7M8 14v2',branch:'M4 2v8a4 4 0 0 0 8 0V6M2 2a2 2 0 1 0 4 0M10 4a2 2 0 1 0 4 0'};
    out.push(`<g transform="translate(${x} ${y})"><path d="${paths[type]||paths.file}" ${attrs}/></g>`);
  };
  return {rect,text,line,vline,dot,chip,icon,finish:()=>out.join('\n')+'\n</svg>\n'};
}

function desktop(theme) {
  const c=themes[theme], s=canvas(1600,1000,c,`Codex Web Local — referência desktop ${theme}`);
  const {rect,text,line,vline,dot,chip,icon}=s;
  rect(0,0,1600,1000,c.outer);
  text(32,34,'CODEX WEB LOCAL',16,c.text,600);
  text(230,34,`REFERÊNCIA VISUAL / TEMA ${theme.toUpperCase()} / V2.0`,11,c.muted);
  text(1242,34,'DADOS ILUSTRATIVOS · 27 OUT 2026',11,c.muted);
  rect(32,64,1536,864,c.bg,14,c.border);
  rect(33,65,247,834,c.side,12);
  rect(33,88,247,811,c.side);
  rect(280,65,1287,51,c.bg);
  vline(280,65,834); line(280,116,1567,116); vline(904,116,784);
  dot(56,91);text(69,96,'Codex Web Local',15,c.text,600);icon(248,82,'menu');
  rect(48,128,216,36,c.raised,8,c.border);icon(62,138,'plus');text(89,151,'Nova conversa',13,c.text,500);
  icon(61,185,'search');text(89,198,'Pesquisar',13,c.muted);text(214,198,'Ctrl K',10,c.muted);
  text(52,244,'FIXADAS',10,c.muted,600);
  icon(59,263,'chat');text(86,276,'Arquitetura do agente',12);
  text(52,321,'PROJETOS',10,c.muted,600);icon(244,309,'plus');
  icon(57,343,'folder');text(84,356,'OpenwebUi',13,c.text,600);dot(250,351,c.ok);
  rect(48,372,216,34,c.hover,7);text(67,394,'Recuperar tarefas',12,c.text,500);dot(250,389,c.ok,2.5);
  text(67,430,'Interface e temas',12,c.muted);text(67,466,'Configurar Ollama',12,c.muted);
  icon(57,491,'folder');text(84,504,'Outro projeto',13,c.muted);
  text(52,568,'FERRAMENTAS',10,c.muted,600);
  [['Tarefas e agentes','chat'],['Automações','check'],['Modelos locais','file'],['Artefatos','folder']].forEach(([label,type],i)=>{icon(59,588+i*38,type);text(87,601+i*38,label,12,c.muted);});
  line(48,813,264,813);dot(61,839,c.ok);text(75,844,'Ollama local',12,c.text);text(75,863,'Conexão de exemplo',10,c.muted);
  icon(59,878,'gear');text(87,891,'Configurações',12,c.muted);
  text(304,97,'OpenwebUi',13,c.muted);text(403,97,'/  Recuperar tarefas',13,c.text,500);
  chip(1170,78,133,'Este computador');chip(1315,78,130,'feature/restore');icon(1509,83,'search');
  text(310,156,'Recuperar tarefas',20,c.text,600);text(310,179,'Local · PowerShell · Conversa do projeto',12,c.muted);
  rect(310,206,564,80,c.surface,12);text(330,232,'VOCÊ',10,c.muted,600);
  text(330,256,'Corrija a retomada das tarefas após reiniciar',14);text(330,276,'o servidor e verifique o resultado.',14);
  dot(316,324);text(329,329,'AGENTE',11,c.text,600);text(400,329,'Modelo local selecionado',11,c.muted);
  text(310,365,'Vou verificar a persistência e o ciclo de execução.',14);
  text(310,389,'A tarefa deve retomar sem repetir comandos concluídos.',13,c.muted);
  const cards=[['Leu 3 arquivos','RunStore · Coordinator · testes',true],['Aplicou alterações em 2 arquivos','Checkpoint registrado · diff disponível',true],['Executou a verificação','Resultado ilustrativo: 8 testes passaram',true]];
  cards.forEach(([title,sub],i)=>{const y=416+i*78;rect(310,y,564,64,c.surface,9,c.border);icon(326,y+13,'check',c.ok);text(352,y+26,title,13,c.text,500);text(352,y+46,sub,11,c.muted);text(849,y+30,'›',19,c.muted);});
  text(310,686,'A recuperação agora reconcilia as ações já executadas.',13,c.text);text(310,708,'As alterações e a evidência estão no painel ao lado.',13,c.muted);
  rect(308,738,568,128,c.surface,16,c.border);
  text(326,768,'Adicione uma verificação de recuperação.',14,c.text);
  icon(326,826,'plus');chip(355,818,94,'Executar');chip(457,818,119,'Modelo local');text(590,836,'Acesso total',11,c.accent);icon(784,825,'mic');rect(826,816,34,34,c.text,10);icon(835,825,'arrow',c.bg);
  text(325,888,'Contexto selecionado  ·  2 arquivos  ·  Sem envio à nuvem',10,c.muted);
  text(925,145,'Alterações',13,c.text,600);text(1024,145,'Arquivos',12,c.muted);text(1104,145,'Preview',12,c.muted);text(1182,145,'Artefatos',12,c.muted);line(923,160,1000,160,c.accent);line(905,166,1567,166);
  text(926,192,'2 arquivos alterados',12,c.text);text(1080,192,'+24  −6',12,c.ok);chip(1353,173,190,'Revisar alterações');
  rect(922,211,627,41,c.surface,7,c.border);icon(936,223,'file');text(962,237,'server / RunCoordinator.ts',12,c.text,500);text(1455,237,'+18  −4',11,c.ok);
  text(932,280,'ANTES / DEPOIS',10,c.muted,600);text(1366,280,'Diff unificado',11,c.muted);
  const code=[['  48','  async function resume(runId: string) {','normal'],['  49','-   await executePending(runId);','removed'],['  49','+   const run = await store.load(runId);','added'],['  50','+   await reconcileEffects(run);','added'],['  51','+   return continueFromCheckpoint(run);','added'],['  52','  }','normal'],['  53','','normal'],['  54','  async function reconcileEffects(run: Run) {','normal'],['  55','+   for (const call of run.toolCalls) {','added'],['  56','+     if (call.state === "completed") continue;','added'],['  57','+     await reconcile(call);','added'],['  58','+   }','added'],['  59','  }','normal']];
  code.forEach(([num,value,type],i)=>{const y=306+i*23;if(type!=='normal')rect(921,y-16,628,23,type==='added'?c.added:c.removed);text(930,y,num,11,c.muted,400,true);text(982,y,value,12,type==='added'?c.ok:c.text,400,true);});
  rect(922,622,627,35,c.surface,7,c.border);icon(936,632,'chat');text(963,645,'Comentar trecho selecionado',11,c.muted);text(1437,645,'Restaurar',11,c.muted);
  line(905,677,1567,677);rect(905,678,661,221,c.side);icon(924,695,'terminal');text(949,707,'Terminal',12,c.text,500);text(1036,707,'Verificações',12,c.muted);text(1150,707,'Logs',12,c.muted);text(1435,707,'PowerShell',11,c.muted);
  text(927,748,'PS D:\\Projetos\\OpenwebUi> npm test',12,c.text,400,true);
  text(927,776,'PASS  tests/run-recovery.test.ts',12,c.ok,400,true);text(927,800,'PASS  tests/checkpoint.test.ts',12,c.ok,400,true);text(927,833,'Tests: 8 passed · Exit code: 0',12,c.text,400,true);text(927,865,'Saída de exemplo para referência de layout.',11,c.muted);
  rect(33,900,1534,27,c.surface);line(33,900,1567,900);dot(51,914,c.ok);text(63,918,'Local',10,c.muted);text(119,918,'Ollama',10,c.muted);text(184,918,'Modelo: exemplo',10,c.muted);text(346,918,'Tarefa concluída',10,c.ok);text(1182,918,'UTF-8     CRLF     TypeScript',10,c.muted);
  text(32,967,'COMPOSIÇÃO PROPOSTA',11,c.text,600);text(204,967,'Navegação persistente · Conversa · Editor e diff · Terminal · Estado da execução',12,c.muted);
  return s.finish();
}

function mobile() {
  const c=themes.escuro,s=canvas(390,844,c,'Codex Web Local — referência móvel');
  const {rect,text,line,dot,chip,icon}=s;
  rect(0,0,390,844,c.bg);rect(0,0,390,30,c.side);text(16,20,'REFERÊNCIA VISUAL · DADOS ILUSTRATIVOS',9,c.muted);
  icon(18,48,'menu');text(48,58,'OpenwebUi',15,c.text,600);chip(257,39,116,'Host local');line(0,78,390,78);
  text(20,112,'Recuperar tarefas',20,c.text,600);dot(24,137,c.ok);text(34,141,'Concluída · Modelo local',11,c.muted);text(302,141,'Ver diff ›',11,c.accent);
  rect(18,169,354,93,c.surface,12);text(34,192,'VOCÊ',10,c.muted,600);text(34,217,'Corrija a retomada das tarefas',14);text(34,241,'após reiniciar o servidor.',14);
  dot(24,297);text(36,302,'AGENTE',11,c.text,600);text(20,334,'A recuperação foi ajustada para evitar',14);text(20,358,'a repetição de comandos concluídos.',14);
  [['Leitura e alteração','2 arquivos · checkpoint criado'],['Verificação concluída','Exemplo: 8 testes passaram']].forEach(([a,b],i)=>{const y=384+i*76;rect(18,y,354,62,c.surface,9,c.border);icon(32,y+15,'check',c.ok);text(60,y+25,a,13,c.text,500);text(60,y+45,b,11,c.muted);text(348,y+28,'›',18,c.muted);});
  rect(18,542,354,42,c.raised,9,c.border);icon(32,555,'file');text(60,568,'Abrir alterações e evidências',12,c.accent);text(347,568,'›',17,c.muted);
  text(20,620,'O trabalho continua ao trocar de tela.',11,c.muted);
  rect(14,649,362,118,c.surface,16,c.border);text(30,678,'Continue o trabalho…',14,c.muted);icon(30,731,'plus');chip(57,720,83,'Executar');text(153,738,'Acesso total',11,c.accent);icon(279,730,'mic');rect(322,718,38,38,c.text,10);icon(333,729,'arrow',c.bg);
  text(20,789,'Conexão local · 2 arquivos no contexto',10,c.muted);
  rect(0,804,390,40,c.side);line(0,804,390,804);text(26,829,'Conversa',11,c.accent,600);text(126,829,'Arquivos',11,c.muted);text(223,829,'Tarefas',11,c.muted);text(325,829,'Mais',11,c.muted);
  return s.finish();
}

for(const theme of ['escuro','claro'])fs.writeFileSync(path.join(__dirname,`desktop-${theme}.svg`),desktop(theme));
fs.writeFileSync(path.join(__dirname,'mobile.svg'),mobile());
process.stdout.write('Referências SVG geradas: desktop-escuro, desktop-claro, mobile.\n');
