'use strict';
const scheduleDateJobs=new Map(),scheduleDateMessages=new Map();
let scheduleDateQueue=Promise.resolve(),scheduleOcrLibrary,scheduleOcrWorker;
function scheduleDateRange(text,yearHint){
 const s=String(text||'').normalize('NFKC').replace(/\s+/g,'').replace(/[～~—–至到]/g,'-');
 const year=Number(s.match(/((?:19|20)\d{2})(?=.{0,2}\d{1,2}月)/)?.[1]||yearHint)||null;
 const patterns=[
 /((?:19|20)\d{2})年(\d{1,2})月(\d{1,2})日?-(?:((?:19|20)\d{2})年)?(?:(\d{1,2})月)?(\d{1,2})日?/,
 /((?:19|20)\d{2})[/.\-](\d{1,2})[/.\-](\d{1,2})-(?:((?:19|20)\d{2})[/.\-])?(\d{1,2})[/.\-](\d{1,2})/,
 /(\d{1,2})月(\d{1,2})日?-(?:(\d{1,2})月)?(\d{1,2})日/,
 /(\d{1,2})[/.](\d{1,2})-(\d{1,2})[/.](\d{1,2})/
 ];
 let parts;
 for(let i=0;i<patterns.length;i++){
 const m=s.match(patterns[i]);if(!m)continue;
 if(i<2)parts=[+m[1],+m[2],+m[3],m[4]?+m[4]:null,m[5]?+m[5]:+m[2],+m[6]];
 else if(i===2)parts=[year,+m[1],+m[2],null,m[3]?+m[3]:+m[1],+m[4]];
 else parts=[year,+m[1],+m[2],null,+m[3],+m[4]];
 break;
 }
 if(!parts)return '';
 let [y,m,d,ey,em,ed]=parts;
 if(m<1||m>12||em<1||em>12||d<1||ed<1)return '';
 if(!ey&&y)ey=y+(m===12&&em===1?1:0);
 const start=new Date(Date.UTC(y||2000,m-1,d)),end=new Date(Date.UTC(ey||(m===12&&em===1?2001:2000),em-1,ed));
 if(start.getUTCMonth()!==m-1||start.getUTCDate()!==d||end.getUTCMonth()!==em-1||end.getUTCDate()!==ed||end<start||end-start>62*86400000)return '';
 return (y?y+' 年 ':'')+m+' 月 '+d+' 日–'+(ey&&ey!==y?ey+' 年 ':'')+em+' 月 '+ed+' 日';
}
function scheduleFilenameRange(name){
 const s=String(name||'').normalize('NFKC'),direct=scheduleDateRange(s);if(direct)return direct;
 const m=s.match(/((?:19|20)\d{2})年(\d{1,2})月.*?(\d{1,2})[-–~～至](\d{1,2})日/);
 return m?scheduleDateRange(m[1]+'年'+m[2]+'月'+m[3]+'日-'+m[4]+'日'):'';
}
function scheduleSyncDateSave(){const b=document.getElementById('saveContentButton');if(b)b.disabled=contentSaving||(selectedSection==='schedule'&&scheduleDateJobs.size>0);}
function scheduleDateMessage(i,message){scheduleDateMessages.set(i,message);const p=document.getElementById('scheduleDateStatus'+i);if(p){p.textContent=message;p.hidden=!message;}}
function cancelScheduleDate(i){scheduleDateJobs.delete(i);scheduleDateMessages.delete(i);scheduleSyncDateSave();}
function resetScheduleDates(){scheduleDateJobs.clear();scheduleDateMessages.clear();scheduleSyncDateSave();}
function scheduleTimeout(promise,ms){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('日期辨識逾時')),ms);})]).finally(()=>clearTimeout(timer));}
async function scheduleLoadOcr(){
 if(window.Tesseract)return window.Tesseract;
 if(!scheduleOcrLibrary)scheduleOcrLibrary=scheduleTimeout(new Promise((resolve,reject)=>{
 const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(Error('無法載入日期辨識工具'));script.onerror=()=>{script.remove();reject(Error('無法載入日期辨識工具'));};document.head.append(script);
 }),20000).catch(error=>{scheduleOcrLibrary=null;throw error;});
 return scheduleOcrLibrary;
}
async function scheduleGetOcrWorker(){
 if(!scheduleOcrWorker)scheduleOcrWorker=(async()=>{const ocr=await scheduleLoadOcr();return ocr.createWorker(['chi_tra','eng'],1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0'});})().catch(error=>{scheduleOcrWorker=null;throw error;});
 return scheduleTimeout(scheduleOcrWorker,60000);
}
async function scheduleImageDate(source,filename){
 const file=typeof source==='string'?await fetch(source).then(r=>{if(!r.ok)throw Error('圖片無法讀取');return r.blob();}):source;
 const bitmap=await createImageBitmap(file);
 try{
 const worker=await scheduleGetOcrWorker();
 const hint=String(filename||'').match(/(?:19|20)\d{2}/)?.[0];
 for(const [top,bottom,mode]of [[0.27,0.35,'7'],[0,0.65,'11']]){
 await worker.setParameters({tessedit_pageseg_mode:mode});
 const canvas=document.createElement('canvas');canvas.width=Math.min(bitmap.width,2000);canvas.height=Math.max(1,Math.round(bitmap.height*(bottom-top)*canvas.width/bitmap.width));
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,Math.round(bitmap.height*top),bitmap.width,Math.round(bitmap.height*(bottom-top)),0,0,canvas.width,canvas.height);
 const result=await scheduleTimeout(worker.recognize(canvas),60000);const range=scheduleDateRange(result.data.text,hint);if(range)return range;
 }
 return '';
 }finally{bitmap.close();}
}
function scheduleRecognizeDate(i,source,filename=''){
 const token=Symbol('date'),title=document.getElementById('scheduleTitle'+i),before=title?.value;
 scheduleDateJobs.set(i,token);scheduleDateMessage(i,'正在辨識圖片日期，首次使用需下載辨識工具…');scheduleSyncDateSave();
 const job=scheduleDateQueue.catch(()=>{}).then(async()=>{
 if(scheduleDateJobs.get(i)!==token)return;
 let range='',fromImage=true;
 try{range=await scheduleImageDate(source,filename);}catch(error){if(scheduleOcrWorker){scheduleOcrWorker.then(w=>w.terminate()).catch(()=>{});scheduleOcrWorker=null;}}
 if(!range){range=scheduleFilenameRange(filename);fromImage=false;}
 if(scheduleDateJobs.get(i)!==token)return;
 const field=document.getElementById('scheduleTitle'+i);if(!field)return;
 if(range&&field.value===before){field.value=range;contentDirty=true;scheduleDateMessage(i,(fromImage?'已從圖片辨識：':'圖片未能辨識，已從檔名填入：')+range+'。請確認日期後儲存。');}
 else if(range)scheduleDateMessage(i,'辨識結果：'+range+'。已保留你手動修改的標題。');
 else scheduleDateMessage(i,'未能辨識日期，請手動填寫「班表標題／日期」。');
 }).finally(()=>{if(scheduleDateJobs.get(i)===token)scheduleDateJobs.delete(i);scheduleSyncDateSave();});
 scheduleDateQueue=job;return job;
}
