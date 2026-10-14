'use strict';
const newsList = document.getElementById('newsList');
const newsStatus = document.getElementById('newsStatus');
const retryNews = document.getElementById('retryNews');
const newsLightbox = document.getElementById('newsLightbox');
let lightboxTrigger;
function safeNewsImage(value) {
  if (!value) return '';
  try { const url = new URL(value, location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
function newsCopy(text) {
  const wrapper = document.createElement('div');
  const p = document.createElement('p'); p.className = 'news-copy'; p.textContent = text; wrapper.append(p);
  if (text.length > 200 || text.split('\n').length > 4) {
    p.classList.add('collapsed');
    const button = document.createElement('button'); button.type = 'button'; button.className = 'expand-copy'; button.textContent = '查看更多 ▼'; button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => { const collapsed = p.classList.toggle('collapsed'); button.textContent = collapsed ? '查看更多 ▼' : '收合 ▲'; button.setAttribute('aria-expanded', String(!collapsed)); });
    wrapper.append(button);
  }
  return wrapper;
}
function renderNewsPage(items) {
  const articles = (Array.isArray(items) ? items : []).filter(item => item && item.title && item.is_published !== false).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  newsList.replaceChildren();
  newsStatus.hidden = articles.length > 0; newsStatus.textContent = '目前尚無最新消息。';
  for (const item of articles) {
    const article = document.createElement('article'); article.className = 'news-item';
    if (item.id) article.id = 'news-' + item.id;
    const url = safeNewsImage(item.image);
    if (url) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'news-picture'; button.setAttribute('aria-label', '放大檢視：' + item.title);
      const image = document.createElement('img'); image.src = url; image.alt = item.title + '的消息圖片'; image.loading = 'lazy'; button.append(image);
      button.addEventListener('click', () => { lightboxTrigger = button; const large = document.getElementById('lightboxImage'); large.src = url; large.alt = image.alt; newsLightbox.showModal(); document.body.style.overflow = 'hidden'; document.getElementById('closeLightbox').focus(); });
      article.append(button);
    }
    const text = document.createElement('div'); text.className = 'news-text';
    const meta = document.createElement('div'); meta.className = 'news-meta';
    const category = document.createElement('span'); category.className = 'news-category'; category.textContent = item.category || '公告'; meta.append(category);
    if (item.date) { const date = document.createElement('time'); date.dateTime = item.date; date.textContent = item.date; meta.append(date); }
    const title = document.createElement('h2'); title.textContent = item.title; text.append(meta, title);
    if (item.excerpt) text.append(newsCopy(String(item.excerpt)));
    if (item.body) text.append(newsCopy(String(item.body)));
    article.append(text); newsList.append(article);
  }
}
async function loadNewsPage() {
  retryNews.hidden = true; newsStatus.hidden = false; newsStatus.textContent = '正在載入最新消息…';
  try {
    if (!window.supabase) throw new Error('消息服務未載入');
    const db = window.supabase.createClient('https://utwhtjtgwryeljgwlwzm.supabase.co', 'sb_publishable_207N7AlFmADOQAdTxcahEg_iVAdw4KU');
    const { data, error } = await db.from('healthcome_site_content').select('value').eq('key', 'news').maybeSingle();
    if (error) throw error;
    renderNewsPage(data?.value?.items || []);
  } catch (error) { newsList.replaceChildren(); newsStatus.textContent = '最新消息暫時無法載入，請稍後再試。'; newsStatus.hidden = false; retryNews.hidden = false; }
}
document.getElementById('closeLightbox').addEventListener('click', () => newsLightbox.close());
newsLightbox.addEventListener('click', event => { if (event.target === newsLightbox) { const r = newsLightbox.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) newsLightbox.close(); } });
newsLightbox.addEventListener('close', () => { document.body.style.overflow = ''; lightboxTrigger?.focus(); });
retryNews.addEventListener('click', loadNewsPage);
loadNewsPage();