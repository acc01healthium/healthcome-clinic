const newsUploads = new Map();
const newsObjectUrls = new Map();
function newsImageUrl(url) { try { const u=new URL(url,location.href);return ['http:','https:','blob:'].includes(u.protocol)?u.href:'';} catch{return '';} }
function newsDraftItems(){return (contentValue.items||[]).map((item,i)=>({...item,id:item.id||crypto.randomUUID(),title:item.title||'',body:item.body||'',image:item.image||'',date:item.date||''}));}
function renderNewsEditor(){
 contentValue.items=newsDraftItems();const container=document.getElementById('contentFields');container.replaceChildren();
 const note=document.createElement('p');note.textContent='每篇消息可加入一張圖片與完整內文。網站會以文章卡片顯示，點開即可閱讀全文。圖片限 JPG、PNG、WebP，最大 5 MB。';container.append(note);
 contentValue.items.forEach((item,i)=>{
 const fieldset=document.createElement('fieldset');fieldset.dataset.newsId=item.id;
 fieldset.innerHTML='<legend>文章 '+(i+1)+'</legend>'+field('文章標題','newsTitle'+i,item.title)+field('發布日期（可不填）','newsDate'+i,item.date)+field('文章內文','newsBody'+i,item.body,true)+'<label for="newsImage'+i+'">文章圖片</label><input id="newsImage'+i+'" type="file" accept="image/jpeg,image/png,image/webp"><div class="news-image-preview"></div><div class="news-editor-actions"><button type="button" data-remove-image>移除圖片</button><button type="button" data-remove-article>移除文章</button></div>';
 fieldset.querySelector('#newsDate'+i).type='date';
 const preview=fieldset.querySelector('.news-image-preview');const url=newsObjectUrls.get(item.id)||newsImageUrl(item.image);if(url){const img=document.createElement('img');img.src=url;img.alt='文章圖片預覽';preview.append(img);}
 fieldset.querySelector('input[type=file]').addEventListener('change',event=>{
 const file=event.target.files[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){event.target.value='';document.getElementById('contentStatus').textContent='請使用 5 MB 以內的 JPG、PNG 或 WebP 圖片。';return;}
 if(newsObjectUrls.has(item.id))URL.revokeObjectURL(newsObjectUrls.get(item.id));const objectUrl=URL.createObjectURL(file);newsObjectUrls.set(item.id,objectUrl);newsUploads.set(item.id,file);contentDirty=true;preview.replaceChildren();const img=document.createElement('img');img.src=objectUrl;img.alt='新文章圖片預覽';preview.append(img);
 });
 fieldset.querySelector('[data-remove-image]').addEventListener('click',()=>{contentValue=readNewsEditor();contentValue.items[i].image='';newsUploads.delete(item.id);if(newsObjectUrls.has(item.id))URL.revokeObjectURL(newsObjectUrls.get(item.id));newsObjectUrls.delete(item.id);contentDirty=true;renderNewsEditor();});
 fieldset.querySelector('[data-remove-article]').addEventListener('click',()=>{if(!confirm('移除這篇文章？按下儲存後才會更新網站。'))return;contentValue=readNewsEditor();contentValue.items.splice(i,1);newsUploads.delete(item.id);if(newsObjectUrls.has(item.id))URL.revokeObjectURL(newsObjectUrls.get(item.id));newsObjectUrls.delete(item.id);contentDirty=true;renderNewsEditor();});
 container.append(fieldset);
 });
 const add=document.createElement('button');add.type='button';add.className='add-news';add.textContent='＋ 新增一篇消息';add.addEventListener('click',()=>{contentValue=readNewsEditor();contentValue.items.push({id:crypto.randomUUID(),title:'',body:'',image:'',date:''});contentDirty=true;renderNewsEditor();container.querySelector('#newsTitle'+(contentValue.items.length-1)).focus();});container.append(add);
}
function readNewsEditor(){return {items:(contentValue.items||[]).map((item,i)=>({...item,title:document.getElementById('newsTitle'+i).value.trim(),body:document.getElementById('newsBody'+i).value.trim(),date:document.getElementById('newsDate'+i).value,image:item.image||''}))};}
async function uploadNewsImages(value){for(const item of value.items){const file=newsUploads.get(item.id);if(!file)continue;document.getElementById('contentStatus').textContent='正在上傳「'+item.title+'」的圖片…';item.image=await uploadDoctorImage(file,'news');const original=contentValue.items.find(old=>old.id===item.id);if(original)original.image=item.image;newsUploads.delete(item.id);if(newsObjectUrls.has(item.id))URL.revokeObjectURL(newsObjectUrls.get(item.id));newsObjectUrls.delete(item.id);}}
const newsStyle=document.createElement('style');newsStyle.textContent='.news-image-preview img{display:block;max-width:100%;max-height:260px;object-fit:contain;margin:14px 0;border-radius:12px}.news-editor-actions{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}.news-editor-actions button,.add-news{background:white;border:1px solid #b9ccc5;border-radius:8px;padding:10px 16px;color:#2f786b;cursor:pointer}.news-editor-actions button:last-child{color:#a44040}.add-news{margin-top:12px}';document.head.append(newsStyle);
