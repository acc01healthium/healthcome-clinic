
'use strict';
const scheduleUploads=new Map(),scheduleObjectUrls=new Map();
function resetScheduleUploads(){for(const url of scheduleObjectUrls.values())URL.revokeObjectURL(url);scheduleObjectUrls.clear();scheduleUploads.clear();}
function scheduleUrl(value){if(!value)return '';try{const u=new URL(value,location.href);return ['https:','http:','blob:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function scheduleDraft(){return {note:contentValue.note||'',items:Array.from({length:2},(_,i)=>({title:contentValue.items?.[i]?.title||'',image:contentValue.items?.[i]?.image||''}))};}
function renderScheduleEditor(){
 contentValue=scheduleDraft();const container=document.getElementById('contentFields');container.replaceChildren();
 const info=document.createElement('p');info.textContent='可同時顯示兩張門診時刻表。選擇圖片、修改標題後按「儲存」，前台即可更新。支援 JPG、PNG、WebP，每張最大 5 MB。';container.append(info);
 const note=document.createElement('div');note.innerHTML=field('頁面說明','scheduleNote',contentValue.note,true);container.append(note);
 contentValue.items.forEach((item,i)=>{
 const box=document.createElement('fieldset');box.dataset.scheduleSlot=String(i);
 box.innerHTML='<legend>第 '+(i+1)+' 張時刻表</legend>'+field('班表標題／日期','scheduleTitle'+i,item.title)+'<label for="scheduleFile'+i+'">上傳班表圖片</label><input id="scheduleFile'+i+'" type="file" accept="image/jpeg,image/png,image/webp"><div class="schedule-image-preview"></div><button type="button" class="schedule-remove">移除這張圖片</button>';
 const preview=box.querySelector('.schedule-image-preview'),input=box.querySelector('input[type=file]');
 function paint(){preview.replaceChildren();const url=scheduleObjectUrls.get(i)||scheduleUrl(contentValue.items[i].image);if(!url){const empty=document.createElement('p');empty.textContent='尚未設定圖片';preview.append(empty);return;}const img=document.createElement('img');img.src=url;img.alt='第 '+(i+1)+' 張班表預覽';preview.append(img);}
 input.addEventListener('change',()=>{
 const file=input.files[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){input.value='';document.getElementById('contentStatus').textContent='請選擇 5 MB 以內的 JPG、PNG 或 WebP 圖片。';return;}
 if(scheduleObjectUrls.has(i))URL.revokeObjectURL(scheduleObjectUrls.get(i));scheduleUploads.set(i,file);scheduleObjectUrls.set(i,URL.createObjectURL(file));contentDirty=true;paint();
 });
 box.querySelector('button').addEventListener('click',()=>{contentValue=readScheduleEditor();contentValue.items[i].image='';scheduleUploads.delete(i);if(scheduleObjectUrls.has(i))URL.revokeObjectURL(scheduleObjectUrls.get(i));scheduleObjectUrls.delete(i);contentDirty=true;renderScheduleEditor();});
 paint();container.append(box);
 });
 const link=document.createElement('a');link.href='schedule.html';link.target='_blank';link.rel='noopener';link.textContent='查看前台門診時刻表 ↗';container.append(link);
}
function readScheduleEditor(){return {note:document.getElementById('scheduleNote').value.trim(),items:contentValue.items.map((item,i)=>({...item,title:document.getElementById('scheduleTitle'+i).value.trim()}))};}
async function uploadScheduleImages(value){
 for(const [i,file]of [...scheduleUploads]){
 document.getElementById('contentStatus').textContent='正在上傳第 '+(i+1)+' 張班表…';
 const url=await uploadDoctorImage(file,'schedule');value.items[i].image=url;contentValue.items[i].image=url;scheduleUploads.delete(i);if(scheduleObjectUrls.has(i))URL.revokeObjectURL(scheduleObjectUrls.get(i));scheduleObjectUrls.delete(i);
 }
}
const scheduleStyle=document.createElement('style');scheduleStyle.textContent='#contentFields fieldset[data-schedule-slot]{border:2px solid #99bcae;border-left:6px solid #358f7f;padding:10px 12px;background:#f1f8f4;margin:14px 0}#contentFields fieldset[data-schedule-slot] legend{background:#2f786b;color:white;padding:4px 10px;border-radius:5px;font-weight:700}#contentFields fieldset[data-schedule-slot]>label{margin:8px 0 4px}#contentFields fieldset[data-schedule-slot] input{padding:6px 8px}.schedule-image-preview img{display:block;width:auto;max-width:100%;max-height:260px;margin:10px 0;object-fit:contain}.schedule-remove{padding:6px 10px;background:white;border:1px solid #b9ccc5;border-radius:6px;color:#a44040;cursor:pointer}#scheduleNote{height:64px;resize:vertical}';document.head.append(scheduleStyle);
