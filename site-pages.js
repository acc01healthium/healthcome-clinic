
'use strict';
(()=>{
 const current=location.pathname.split('/').pop()||'index.html';
 document.querySelectorAll('.site-header nav a').forEach(a=>{if(a.getAttribute('href')===current)a.setAttribute('aria-current','page');});
 const defaults=window.CLINIC_DEFAULTS||{};

 function renderSchedule(schedule){
 const container=document.getElementById('scheduleImages');if(!container)return;
 const note=document.getElementById('scheduleIntro');if(note){note.textContent=schedule.note||'';note.hidden=!schedule.note;}
 container.replaceChildren();
 const items=(Array.isArray(schedule.items)?schedule.items:[]).slice(0,2);
 items.forEach((item,i)=>{
 const url=safeImage(item.image);if(!url)return;
 const title=item.title||'門診時刻表 '+(i+1);
 const figure=document.createElement('figure'),caption=document.createElement('figcaption');caption.textContent=title;
 const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','開啟 '+title+' 原圖（新分頁）');
 const img=document.createElement('img');img.src=url;img.alt='立康診所 '+title;link.append(img);figure.append(caption,link);container.append(figure);
 });
 if(!container.children.length){const empty=document.createElement('p');empty.textContent='門診時刻表更新中，歡迎來電洽詢。';container.append(empty);}
 }

 function renderContent(content){
  const h=content.home||{};
  const title=document.querySelector('.welcome-card h2'),description=document.querySelector('.welcome-card p');
  if(title&&h.title)title.textContent=h.title;if(description&&h.description)description.textContent=h.description;
  if(Array.isArray(content.services?.items))document.querySelectorAll('.service-grid article').forEach((card,i)=>{const item=content.services.items[i];if(item){card.querySelector('h2').textContent=item.title||'';card.querySelector('p').textContent=item.description||'';}});
  if(content.hours)renderClinicHours(content.hours);
  if(content.schedule)renderSchedule(content.schedule);
  const c=content.contact||{};
  if(c.phone)document.querySelectorAll('[data-clinic-phone]').forEach(a=>{a.textContent=c.phone;a.href='tel:'+String(c.phone).replace(/[^+0-9]/g,'');});
  if(c.address)document.querySelectorAll('[data-clinic-address]').forEach(e=>e.textContent=c.address);
 }
 function renderClinicHours(hours){document.querySelectorAll('.hours-table').forEach(table=>{[...table.tBodies[0].rows].forEach((row,i)=>{const header=row.cells[0];header.replaceChildren();header.append(document.createTextNode(['早診','午診','晚診'][i]),document.createElement('br'));const time=document.createElement('span');time.className='session-time';time.textContent=[hours.morning,hours.afternoon,hours.evening][i];header.append(time);for(let day=0;day<7;day++){const cell=row.cells[day+1],closed=i===2&&day>=5&&hours.weekendEveningClosed;cell.className=closed?'closed':'available';cell.replaceChildren();if(closed)cell.textContent='休診';else{const dot=document.createElement('span');dot.textContent='●';dot.setAttribute('aria-label','有門診');cell.append(dot);if(i===1&&day>=5&&hours.weekendAfternoon&&hours.weekendAfternoon!==hours.afternoon){const note=document.createElement('small');if(day===5){note.className='weekend-hours-note';const end=hours.weekendAfternoon.split(/[–-]/)[1];note.textContent='週末下午到'+(end==='18:00'?'18點':end);cell.append(note);}cell.classList.add('weekend-afternoon');}}}});table.tFoot.rows[0].cells[0].textContent=hours.note||'';});}

 renderContent(defaults);
 const db=window.supabase?.createClient('https://utwhtjtgwryeljgwlwzm.supabase.co','sb_publishable_207N7AlFmADOQAdTxcahEg_iVAdw4KU');
 async function loadContent(){
  if(!db)return;
  try{const {data,error}=await db.from('healthcome_site_content').select('key,value');if(error)throw error;const content=JSON.parse(JSON.stringify(defaults));for(const row of data||[])if(row.key in content&&row.value&&typeof row.value==='object')content[row.key]={...content[row.key],...row.value};renderContent(content);}catch(error){console.info('暫時使用網站預設內容');}
 }
 function safeImage(value){if(!value)return '';try{const u=new URL(value,location.href);return ['http:','https:','file:'].includes(u.protocol)?u.href:'';}catch{return '';}}
 const team=document.getElementById('doctorTeam'),dialog=document.getElementById('doctorDialog');let returnFocus;
 if(dialog){
 dialog.querySelector('button').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{document.body.style.overflow='';returnFocus?.focus();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 }
 async function loadDoctors(){
 if(!team)return;const retry=document.getElementById('retryDoctors');retry.hidden=true;team.textContent='醫師資料載入中…';
 try{
 if(!db)throw Error('服務暫時不可用');
 const {data,error}=await db.from('healthcome_doctors').select('*').eq('is_active',true).order('sort_order',{ascending:true});if(error)throw error;
 team.replaceChildren();if(!data?.length){team.textContent='目前尚無醫師資料。';return;}
 const names=['張家芸','羅名宇','吳奇霖','羅錦祥','林儀儒','張簡世新','李建宇'];
 const rank=d=>{const i=names.findIndex(n=>String(d.name||'').includes(n));return i<0?names.length:i;};
 for(const d of [...data].sort((a,b)=>rank(a)-rank(b))){
 const photo=safeImage(d.photo_url),poster=safeImage(d.poster_url)||photo;
 const card=document.createElement(poster?'button':'article');card.className='doctor';if(poster)card.type='button';
 if(photo){const img=document.createElement('img');img.src=photo;img.alt=String(d.name||'')+'醫師';img.loading='lazy';card.append(img);}
 const meta=document.createElement('div');meta.className='meta';const name=document.createElement('h3');name.textContent=(d.name||'')+' '+(d.title||'醫師');meta.append(name);for(const value of [d.specialty,d.slogan]){if(!value)continue;const detail=document.createElement('p');detail.textContent=value;detail.style.whiteSpace='pre-line';meta.append(detail);}card.append(meta);
 if(poster)card.addEventListener('click',()=>{returnFocus=card;const img=document.getElementById('doctorPoster');img.src=poster;img.alt=(d.name||'')+'醫師完整介紹';dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('button').focus();});team.append(card);
 }
 }catch(error){team.textContent='醫師資料暫時無法載入，請稍後再試。';retry.hidden=false;}
 }
 document.getElementById('retryDoctors')?.addEventListener('click',loadDoctors);
 loadContent();loadDoctors();
})();
