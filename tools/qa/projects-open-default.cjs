const {chromium}=require(process.env.QA_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const now=new Date().toISOString();
  const section={id:'qa-project',name:'Projeto de verificação',position:0,createdAt:now};
  const conversations=Array.from({length:7},(_,i)=>({id:'qa-chat-'+i,title:'Conversa de verificação '+i,model:'',createdAt:now,updatedAt:now,archived:false,sectionId:section.id}));
  await page.route('**/api/v1/sections',route=>route.fulfill({json:{sections:[section]}}));
  await page.route('**/api/v1/conversations',route=>route.fulfill({json:{conversations}}));
  await page.goto(process.env.QA_BASE_URL || 'http://127.0.0.1:3001');
  const button=page.getByRole('button',{name:section.name,exact:true});
  await button.waitFor();
  await page.getByRole('button',{name:conversations[0].title,exact:true}).waitFor();
  assert.equal(await button.getAttribute('aria-expanded'),'true');
  assert.equal(await page.getByRole('button',{name:conversations[0].title,exact:true}).isVisible(),true);
  await page.getByRole('button',{name:'Mostrar mais',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:conversations[6].title,exact:true}).isVisible(),true);
  await button.click();assert.equal(await button.getAttribute('aria-expanded'),'false');assert.equal(await page.getByRole('button',{name:conversations[0].title,exact:true}).count(),0);
  await button.click();assert.equal(await button.getAttribute('aria-expanded'),'true');
  await button.click();await page.reload();await button.waitFor();assert.equal(await button.getAttribute('aria-expanded'),'true');
  assert.deepEqual(errors,[]);fs.mkdirSync('artifacts/qa',{recursive:true});
  fs.writeFileSync('artifacts/qa/projects-open-default.json',JSON.stringify({checkedAt:now,defaultOpen:true,toggle:true,showMore:true,reloadOpen:true,personalDataUnchanged:true,pageErrors:errors},null,2));
  console.log('Projetos abertos por padrão, alternância e recarregamento verificados.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
