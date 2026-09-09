(function(){
"use strict";
const KEY='next-bite-v1';            // local CACHE of restaurants (not the source of truth)
const UIKEY='next-bite-ui';          // local UI prefs only (sort, last tab, etc.)
const API_BASE='/api';               // same-origin Worker API

/* ================= API CLIENT ================= *
 * The source of truth for restaurants is Cloudflare D1, reached through these calls.
 * DATA.restaurants is an in-memory working copy kept in sync so the existing (synchronous)
 * UI code keeps working unchanged; a small local cache lets the app paint instantly and
 * survive brief offline moments. */
const api={
  async list(){ const r=await fetch(API_BASE+'/restaurants'); if(!r.ok) throw new Error('list '+r.status); return r.json(); },
  async create(obj){ const r=await fetch(API_BASE+'/restaurants',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(obj)}); if(!r.ok) throw new Error('create '+r.status); return r.json(); },
  async update(id,obj){ const r=await fetch(API_BASE+'/restaurants/'+encodeURIComponent(id),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(obj)}); if(!r.ok) throw new Error('update '+r.status); return r.json(); },
  async remove(id){ const r=await fetch(API_BASE+'/restaurants/'+encodeURIComponent(id),{method:'DELETE'}); if(!r.ok && r.status!==404) throw new Error('delete '+r.status); return true; },
};
// Fields the DB owns; everything sent to the API is the full restaurant object.
function toApiPayload(r){
  const o={};
  ['name','cuisines','city','area','address','mapUrl','website','bookingUrl','menuUrl','deliveryUrl',
   'phone','visitStatus','craving','priceLevel','occasions','tags','dishesToTry','happyHours',
   'whySaved','notes','images','sourceUrl','emoji','themeKey','visits','visitCount','nextUp']
   .forEach(k=>{ if(r[k]!==undefined) o[k]=r[k]; });
  return o;
}
// track ids that only exist locally (created while offline / awaiting server id)
const pendingSync=new Set();
const pendingDelete=new Map();  // id -> timeout handle (deferred server delete during undo window)
const DAYS=['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const DAYS_FULL=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

/* ---------- utils ---------- */
const $=(id)=>document.getElementById(id);
const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const nowIso=()=>new Date().toISOString();
const splitList=(s)=>String(s||'').split(/[,،\n]/).map(x=>x.trim()).filter(Boolean);

const FINALS={'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
function normalize(s){
  if(!s) return '';
  s=String(s).normalize('NFKD').replace(/[\u0591-\u05C7]/g,'');
  s=s.replace(/[ךםןףץ]/g,c=>FINALS[c]||c).toLowerCase();
  s=s.replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
  return s;
}
const SYN={'סושי':'יפני','בורגר':'המבורגר','המבורגר':'בורגר','פסטה':'איטלקי','פיצה':'איטלקי','חומוס':'מזרחי','קפה':'בית קפה','דרינק':'בר','קוקטייל':'בר'};

/* ---------- cuisine visuals ---------- */
const EMOJI=[
  [['ראמן','ramen'],'🍜'],
  [['קארי','curry'],'🍛'],
  [['תאילנדי','פאד תאי','thai'],'🍤'],
  [['סשימי','נאים','sashimi'],'🍣'],
  [['בורגר דג','fish burger'],'🍔'],
  [['סנדוויץ','כריך','sandwich'],'🥪'],
  [['מתוק','קינוח','עוגה','גלידה','dessert','cake','טירמיסו'],'🍰'],
  [['יפני','סושי','אסייתי','סיני','וייטנאמי'],'🍣'],
  [['פיצה','pizza'],'🍕'],
  [['איטלקי','פסטה'],'🍝'],
  [['בורגר','המבורגר','אמריקאי'],'🍔'],
  [['מזרחי','חומוס','שווארמה','פלאפל','לבנטיני','ערבי'],'🧆'],
  [['ישראלי'],'🥙'],
  [['ים תיכוני','יווני','דגים','פירות ים'],'🐟'],
  [['בית קפה','קפה','בראנץ'],'☕'],
  [['שף','גורמה','טעימות','fine dining','chef'],'👨‍🍳'],
  [['מקסיקני','טאקו'],'🌮'],
  [['סטייק','בשרים','גריל'],'🥩'],
  [['צמחוני','טבעוני','סלט'],'🥗'],
  [['מאפים','קונדיטוריה','קינוחים'],'🥐'],
  [['בר','קוקטיילים','יין'],'🍸'],
  [['הודי'],'🍛'],
];
// Real food images (embedded as CSS classes; see #nb-images style).
// Specific dish entries come BEFORE the broad cuisine families, because cuisineImageKey()
// returns the first match — so a place tagged "ראמן" gets the ramen icon, while one tagged
// only "אסייתי" still falls through to the generic asian image.
const CUISINE_IMG=[
  [['ראמן','ramen'],'ramen'],
  [['סשימי','סושי','sashimi','נאים'],'sashimi'],
  [['תאילנדי','פאד תאי','thai','pad thai'],'thai'],
  [['קארי','curry'],'curry'],
  [['בורגר דג','המבורגר דג','פיש בורגר','fish burger','שניצל דג','fishburger'],'fishburger'],
  [['סנדוויץ','כריך','baguette','sandwich'],'sandwich'],
  [['מתוק','קינוח','עוגה','גלידה','קונדיטוריה','מאפים','dessert','cake','טירמיסו','וופל','פנקייק'],'dessert'],
  [['בורגר','המבורגר','burger','אמריקאי'],'burger'],
  [['פיצה','pizza','מרגריטה'],'pizza'],
  [['איטלקי','פסטה','pasta'],'italian'],
  [['אסייתי','יפני','סיני','וייטנאמי','נודלס','asian','sushi'],'asian'],
  [['בית קפה','קפה','בראנץ','cafe','coffee','brunch'],'cafe'],
  [['דגים','דג','פירות ים','fish','seafood'],'fish'],
  [['ים תיכוני','יווני','לבנטיני','מזרחי','mediterranean','greek'],'mediterranean'],
  [['ישראלי','חומוס','פלאפל','שווארמה','israeli','hummus'],'israeli'],
  [['שף','גורמה','טעימות','fine dining','chef','gourmet'],'chef'],
];
const KNOWN_IMG_KEYS=['burger','pizza','italian','asian','cafe','fish','mediterranean','israeli','chef','happyhour','fishburger','sashimi','sandwich','curry','ramen','thai','dessert'];
// Dish theme images the user can pick as the place's cover (§ theme picker).
// Order: cuisine-family images first, then specific-dish images. Each has a Hebrew label.
const THEME_IMAGES=[
  {key:'burger',label:'המבורגר'},
  {key:'pizza',label:'פיצה'},
  {key:'italian',label:'איטלקי / פסטה'},
  {key:'asian',label:'אסייתי'},
  {key:'ramen',label:'ראמן'},
  {key:'sashimi',label:'סשימי'},
  {key:'thai',label:'תאילנדי'},
  {key:'curry',label:'קארי'},
  {key:'fish',label:'דגים'},
  {key:'fishburger',label:'בורגר דג'},
  {key:'sandwich',label:'סנדוויץ׳'},
  {key:'dessert',label:'מתוק'},
  {key:'mediterranean',label:'ים תיכוני'},
  {key:'israeli',label:'ישראלי'},
  {key:'cafe',label:'בית קפה'},
  {key:'chef',label:'מסעדת שף'},
];
function themeLabel(key){ const t=THEME_IMAGES.find(x=>x.key===key); return t?t.label:''; }
// Core categories that always appear in "מה מתחשק" and the filter (each has an icon).
// Broad cuisine families first, then the specific dish categories (ramen, sashimi, …).
const CORE_CATEGORIES=['בורגר','פיצה','אסייתי','איטלקי','ים תיכוני','ישראלי','בית קפה','דגים','שף','ראמן','סשימי','תאילנדי','קארי','בורגר דג','סנדוויץ׳','מתוק'];
// "מתאים ל" selectable tags (emoji + label), in a deliberate order (time → who → vibe → experience).
const SUIT_TAGS=[['☕','ארוחת בוקר'],['🥐','בראנץ׳'],['☀️','צהריים'],['🌙','ערב'],['🍸','דרינק'],['💕','דייט'],['👥','עם חברים'],['👨‍👩‍👧','משפחה'],['💼','אחרי עבודה'],['🎉','חגיגה'],['😌','קליל'],['🌿','רגוע'],['🎶','אווירה'],['✨','ערב מיוחד'],['⚡','משהו מהיר'],['🌅','נוף'],['🪑','ישיבה בחוץ']];
// Cuisine option list = core categories + any cuisines already in the data/selection (single source of truth, deduped).
function cuisinePickList(selected){
  const seen=new Set(); const out=[];
  [...CORE_CATEGORIES, ...liveList().flatMap(r=>r.cuisines||[]), ...(selected||[])].forEach(c=>{ const k=normalize(c); if(c && !seen.has(k)){ seen.add(k); out.push(c); } });
  return out;
}
function cuisineChip(c){ const k=cuisineImageKey([c]); return '<span class="af-selchip">'+(k?uic('icon-'+k,18):'')+esc(c)+'</span>'; }
function cuisineValHtml(sel){
  if(!sel || !sel.length) return '<span class="ph">בחר סוג מטבח</span>';
  const fmt=c=>{ const e=cuisineVisual({cuisines:[c]}).emoji; return (e?e+' ':'')+esc(c); };
  let parts = sel.length<=3 ? sel.map(fmt) : [fmt(sel[0]),fmt(sel[1]),'+'+(sel.length-2)];
  return '<span class="af-selnames">'+parts.join(' · ')+'</span>';
}
/* Multi-select cuisine picker (separate overlay so it doesn't close the add sheet). */
function openCuisinePicker(current, onDone){
  const sel=(current||[]).slice();
  const all=cuisinePickList(current);
  const wrap=document.createElement('div'); wrap.id='cpick';
  const rows=(filter)=>{ const nf=normalize(filter||''); return all.filter(c=>!nf||normalize(c).includes(nf)).map(c=>{
      const k=cuisineImageKey([c]); const on=sel.some(x=>normalize(x)===normalize(c));
      return '<button type="button" class="row '+(on?'on':'')+'" data-c="'+esc(c)+'">'+(k?uic('icon-'+k,26):'<span style="font-size:22px">'+cuisineVisual({cuisines:[c]}).emoji+'</span>')+'<span class="nm">'+esc(c)+'</span><span class="chk">✓</span></button>';
    }).join(''); };
  wrap.innerHTML='<div class="bd"></div><div class="sh"><div class="hd"><h3>בחירת סוג מטבח</h3><div class="search">'+uic('ic-filter',16)+'<input id="cpick-q" placeholder="חיפוש סוג מטבח"></div></div><div class="list" id="cpick-list">'+rows('')+'</div><div class="foot"><button class="btn btn-primary full tap" id="cpick-ok">אישור</button></div></div>';
  document.body.appendChild(wrap); document.body.style.overflow='hidden';
  function close(){ wrap.remove(); document.body.style.overflow='hidden'; onDone(sel); }
  wrap.querySelector('.bd').onclick=close;
  wrap.querySelector('#cpick-ok').onclick=close;
  wrap.querySelector('#cpick-q').addEventListener('input',e=>{ wrap.querySelector('#cpick-list').innerHTML=rows(e.target.value); });
  wrap.querySelector('#cpick-list').addEventListener('click',e=>{ const b=e.target.closest('.row'); if(!b) return; const c=b.dataset.c; const i=sel.findIndex(x=>normalize(x)===normalize(c)); if(i>=0) sel.splice(i,1); else sel.push(c); b.classList.toggle('on'); });
}
function cuisineImageKey(cuisines){
  const cs=(cuisines||[]).map(normalize);
  for(const [keys,k] of CUISINE_IMG){ for(const kk of keys){ if(cs.some(c=>c.includes(normalize(kk)))) return k; } }
  return null;
}
// Keyword list for a given image key (used for text discovery). Falls back to [label] for
// categories without an image mapping.
function cuisineKeywords(label){
  const key=cuisineImageKey([label]);
  const words=new Set();
  words.add(label);
  if(key){ for(const [keys,k] of CUISINE_IMG){ if(k===key){ keys.forEach(w=>words.add(w)); } } }
  return [...words];
}
// True if the restaurant's free-text fields (dishes-to-try / why-saved / tags / notes)
// mention this cuisine/dish category — so writing "המבורגר דג" in "רוצה לנסות" makes the
// place findable under the "בורגר דג" filter. Multi-word keywords match as a phrase;
// single-word keywords match as a whole token to avoid false hits (e.g. "דג" inside "דגל").
function textMentionsCuisine(r, label){
  const fields=[ ...(r.dishesToTry||[]), r.whySaved||'', ...(r.tags||[]), r.notes||'' ];
  const hay=fields.map(normalize).filter(Boolean);
  if(!hay.length) return false;
  const tokenSets=hay.map(t=>new Set(t.split(' ')));
  for(const kw of cuisineKeywords(label)){
    const nk=normalize(kw); if(!nk) continue;
    if(nk.includes(' ')){ if(hay.some(t=>t.includes(nk))) return true; }      // phrase match
    else { if(tokenSets.some(s=>s.has(nk))) return true; }                     // whole-token match
  }
  return false;
}
function restaurantImageUrl(r){
  const u=r&&r.image;
  if(u && typeof u==='string' && /^(data:|https?:)/i.test(u.trim())) return u.trim();
  return null;
}
const GRAD=[['#FFE3D6','#FFD0BE'],['#E6EEF7','#D5E4F2'],['#EDE7F7','#DED4F0'],['#E6F2E9','#D3E9DA'],['#FBEFD6','#F6E2B8'],['#FCE1EC','#F8CFDD'],['#E4F0F1','#D2E7E8']];
function cuisineVisual(r){
  const cs=(r.cuisines||[]).map(normalize);
  let emoji=r.emoji||'🍽️';
  if(!r.emoji){
    outer: for(const [keys,e] of EMOJI){ for(const k of keys){ if(cs.some(c=>c.includes(normalize(k)))){emoji=e;break outer;} } }
  }
  let h=0; const base=(r.cuisines&&r.cuisines[0])||r.name||'x';
  for(const ch of base) h=(h*31+ch.charCodeAt(0))>>>0;
  const g=GRAD[h%GRAD.length];
  // Theme image: a user-picked themeKey wins; otherwise fall back to the cuisine image (§ hero rule).
  const themeKey=(r.themeKey && KNOWN_IMG_KEYS.includes(r.themeKey))? r.themeKey : null;
  const imgKey=themeKey || cuisineImageKey(r.cuisines);
  const imgUrl=null;                               // user-added URLs are gallery-only, never the primary
  return {emoji, grad:`linear-gradient(135deg,${g[0]},${g[1]})`, imgKey, imgUrl};
}
/* Icon overlay for small contexts (categories, thumbnails); banner for big ones. */
function hasVisualImg(v){ return !!(v && (v.imgUrl||v.imgKey)); }
function customFill(v){ return '<i class="imgfill cover" style="background-image:url(\''+String(v.imgUrl).replace(/'/g,'%27')+'\')"></i>'; }
function visualIcon(v){
  if(v.imgUrl) return customFill(v);
  if(v.imgKey) return '<i class="imgfill icon-'+v.imgKey+'"></i>';
  return '';
}
function visualBanner(v){
  if(v.imgUrl) return customFill(v);
  if(v.imgKey) return '<i class="imgfill cover banner-'+v.imgKey+'"></i>';
  return '';
}
/* inline UI icon (settings/filter/location/star) */
function uic(key,size){ size=size||20; return '<i class="ui-ic '+key+'" style="width:'+size+'px;height:'+size+'px"></i>'; }
// Central mapping: form field type → existing orange icon class (decorative, non-clickable).
// If a field type has no matching icon, it simply renders without one.
const FIELD_ICONS={
  phone:'ic-phone',
  website:'ic-globe',
  menu:'ic-book',
  reservation:'ic-clock',
  maps:'ic-navpin',
  delivery:'ic-delivery',
};
function fieldIcon(type){ const k=FIELD_ICONS[type]; return k?('<span class="fic"><i class="ui-ic '+k+'"></i></span>'):''; }
// Build a labelled link/text input with an optional decorative orange icon inside the field (RTL-aware).
// The icon lives in a relative wrapper around ONLY the input, so it centers on the input, not the label.
function afLinkField(label,id,value,type,extraAttr){
  const ic=fieldIcon(type);
  return '<label class="field"><span>'+esc(label)+'</span>'
    +'<span class="'+(ic?'fic-wrap':'')+'">'
    +'<input class="inp'+(ic?' has-fic':'')+'" id="'+id+'" '+(extraAttr||'')+' value="'+esc(value||'')+'">'
    +ic+'</span></label>';
}
function metaLine(r){ return [ (r.cuisines&&r.cuisines[0])||'', r.area||r.city||'' ].filter(Boolean).join(' · '); }
function priceStr(p){ return p? '₪'.repeat(p):''; }
function priceWord(p){ return ({1:'זול',2:'בינוני',3:'יקר',4:'יקר מאוד'})[p]||''; }
function heroTint(r){
  // A very light single-tone background matched to the place's palette (§ hero).
  const g=cuisineVisual(r).grad;
  const m=/#([0-9a-f]{6})/i.exec(g); const c=m?('#'+m[1]):'#FFE3D6';
  return 'linear-gradient(180deg,'+c+' 0%,'+c+' 55%,#fbf3ee 100%)';
}
function formatDaysRange(days){
  if(!days||!days.length) return '';
  const s=[...days].sort((a,b)=>a-b);
  let contiguous=true; for(let i=1;i<s.length;i++){ if(s[i]!==s[i-1]+1){contiguous=false;break;} }
  if(contiguous && s.length>=2) return DAYS[s[0]]+'–'+DAYS[s[s.length-1]];
  return s.map(d=>DAYS[d]).join(' ');
}
const DISH_EMOJI=[
  [['בורגר','המבורגר','burger'],'🍔'],[['צ׳יפס','ציפס','fries','תפוח'],'🍟'],
  [['סלט','salad','קיסר'],'🥗'],[['פיצה','pizza'],'🍕'],[['סושי','רול','sushi','מאקי'],'🍣'],
  [['ראמן','נודל','אטריות','ramen','פאד'],'🍜'],[['פסטה','pasta','ניוקי'],'🍝'],
  [['דג','סלמון','טונה','fish','קרודו'],'🐟'],[['שקשוקה','ביצה'],'🍳'],[['חומוס','פלאפל','פיתה'],'🧆'],
  [['טאקו','בוריטו','taco'],'🌮'],[['סטייק','אנטריקוט','בשר'],'🥩'],[['עוף','שניצל','chicken'],'🍗'],
  [['קינוח','עוגה','גלידה','dessert','טירמיסו'],'🍰'],[['קוקטייל','דרינק','בירה','יין'],'🍸'],
  [['קפה','אספרסו','cappuccino'],'☕'],[['פוקה','bowl','באול'],'🥣'],[['כמהין','טראפל'],'🍟']
];
function dishEmoji(name){
  const n=normalize(name);
  for(const [keys,e] of DISH_EMOJI){ for(const k of keys){ if(n.includes(normalize(k))) return e; } }
  return '🍽️';
}
function splitOffer(offer){
  // Bold a leading percentage / "1+1" for the Happy Hour promo, keep rest as text.
  if(!offer) return {lead:'',rest:''};
  const m=/^\s*(\d{1,3}\s*%|1\s*\+\s*1)\s*(.*)$/.exec(offer);
  if(m) return {lead:m[1].replace(/\s+/g,''), rest:m[2].trim()};
  return {lead:'', rest:offer};
}

/* ---------- happy hour ---------- */
const toMin=(t)=>{const m=/^(\d{1,2}):(\d{2})$/.exec(t||'');return m?(+m[1])*60+(+m[2]):NaN;};
function hhStatus(r, now){
  now=now||new Date();
  const rules=(r.happyHours||[]).filter(x=>x&&x.enabled&&x.days&&x.days.length&&!isNaN(toMin(x.start))&&!isNaN(toMin(x.end)));
  const day=now.getDay(), cur=now.getHours()*60+now.getMinutes();
  let soon=null, later=null;
  for(const ru of rules){
    const s=toMin(ru.start), e=toMin(ru.end);
    const active = e>s ? (cur>=s&&cur<e) : (cur>=s||cur<e);
    if(ru.days.includes(day) && active) return {kind:'activeNow',label:'Happy Hour עכשיו · עד '+ru.end};
    if(ru.days.includes(day) && s>cur && (s-cur)<=120){ if(!soon||s<toMin(soon.start)) soon=ru; }
    if(ru.days.includes(day) && s>cur){ if(!later||s<toMin(later.start)) later=ru; }
  }
  if(soon) return {kind:'startingSoon',label:'מתחיל ב־'+soon.start};
  if(later) return {kind:'laterToday',label:'היום · '+later.start+'–'+later.end};
  return {kind:'none',label:''};
}
function parseHH(text){
  if(!text) return null;
  const t=text.replace(/[–—-]/g,'-');
  const time=/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/.exec(t);
  if(!time) return null;
  let days=[0,1,2,3,4];
  const map={'א':0,'ב':1,'ג':2,'ד':3,'ה':4,'ו':5,'ש':6};
  const rng=/([אבגדהוש])['׳]?\s*-\s*([אבגדהוש])['׳]?/.exec(t);
  if(rng){ const a=map[rng[1]],b=map[rng[2]]; days=[]; for(let i=a;i<=b;i++) days.push(i); }
  let offer='';
  const pct=/(\d{1,3})\s*%/.exec(t); const one=/1\s*\+\s*1/.exec(t);
  if(one) offer='1+1'; else if(pct) offer=pct[1]+'% הנחה';
  return {days, start:time[1], end:time[2], offer, enabled:true, id:uid()};
}

/* ---------- AI text import (§34) ---------- */
const AI_TEMPLATE = (function(){
  const cuis = CORE_CATEGORIES.join(' · ');
  const suit = SUIT_TAGS.map(t=>t[1]).join(' · ');
  return [
'אני מוסיף מסעדה לאפליקציה שלי "הביס הבא".',
'מלא/י את הטופס שבסוף ההודעה, והחזר/י רק אותו — בלי הסברים ובלי טקסט נוסף.',
'אם פרט אינו ידוע בוודאות, השאר/י את השדה ריק. אל תמציא/י מידע.',
'שמור/י על שמות השדות והכותרות [בסוגריים] בדיוק כפי שהם.',
'',
'משמעות השדות:',
'',
'[מסעדה]',
'שם — שם המסעדה המדויק.',
'מטבח — סוג המטבח. בחר/י ערך אחד או יותר (מופרד בפסיקים) מתוך הרשימה:',
'  '+cuis,
'  (התמונה הראשית בעמוד המסעדה נבחרת אוטומטית לפי המטבח — לכן חשוב לבחור מהרשימה.)',
'עיר — העיר (לדוגמה: תל אביב).',
'אזור — השכונה/האזור (לדוגמה: פלורנטין, לב העיר).',
'כתובת — כתובת מלאה: רחוב, מספר ועיר. משמשת לכפתור "נווט" ולשורת הכתובת.',
'',
'[קישורים]',
'מפות — קישור Google Maps (אם קיים). אם ריק, הניווט מתבצע לפי הכתובת.',
'אתר — כתובת אתר האינטרנט. מפעילה את כפתור "אתר".',
'הזמנה — קישור להזמנת שולחן. מפעיל את כפתור "הזמנה".',
'תפריט — קישור לתפריט. מפעיל את כפתור "תפריט".',
'משלוח — קישור ישיר להזמנת משלוח או טייק אוואי. עדיפות לקישור ישיר למסעדה ב-Wolt;',
'  אם אין Wolt — תן ביס, משלוחה או מערכת ההזמנות העצמאית של המסעדה.',
'  אין לשים קישור כללי לדף הבית של שירות המשלוחים או לחיפוש — רק קישור ישיר לעמוד המסעדה.',
'טלפון — מספר הטלפון של המסעדה. מופיע בשורת "טלפון" בפרטים, ולחיצה עליו מחייגת.',
'',
'[מה חשוב]',
'סטטוס — האם כבר ביקרת. ערך: "עוד לא הייתי" או "כבר הייתי".',
'חשק — כמה מתחשק לך לאכול שם (זה שונה מ"הבא בתור"). ערך אחד מתוך:',
'  "רגיל" / "בא לי" / "ממש בא לי". הערך "ממש בא לי" מסמן 🔥 ומקדם את המקום בהמלצות.',
'הבא בתור — האם זה המקום הבא שתרצה לבקר בו. "כן" או "לא".',
'  (רק מקום אחד יכול להיות "הבא בתור" בכל רגע — הוא מוצג ככרטיס הראשי במסך הבית.)',
'מחיר — רמת מחיר, אחת מתוך: ₪ (זול) / ₪₪ / ₪₪₪ / ₪₪₪₪ (יקר).',
'מתאים ל — לאילו סיטואציות המקום מתאים. בחר/י ערך אחד או יותר (בפסיקים) מהרשימה:',
'  '+suit,
'  (משמש לתגיות בעמוד, להמלצות "מתאים עכשיו" ולסינון — לכן חשוב לבחור מהרשימה.)',
'תגיות — מילות מפתח חופשיות נוספות (לדוגמה: כשר, טבעוני, תמנון). לחיפוש בלבד.',
'',
'[Happy Hour]',
'(אם למקום יש שעת הטבה קבועה — זה מוצג כבאנר Happy Hour בולט בעמוד. אם אין, השאר/י ריק.)',
'ימים — הימים שבהם ההטבה פעילה. פורמט: "א׳–ה׳" או "א,ב,ג,ד,ה".',
'שעות — טווח שעות. פורמט: "17:00-19:00".',
'הטבה — תיאור ההטבה. לדוגמה: "30% הנחה על בירות" או "1+1 על קוקטיילים".',
'תנאים — תנאים נוספים אם יש (לדוגמה: "בישיבה בבר בלבד").',
'',
'[אישי]',
'רוצה לנסות — מנות שבא לך לטעום, מופרד בפסיקים. מופיע ב"מה בא לי לטעום".',
'למה שמרתי — משפט קצר: למה שמרת את המקום.',
'הערות — כל הערה אישית נוספת.',
'',
'[תמונות]',
'תמונה — קישורי תמונה (מופרד בפסיקים). אלו תמונות נוספות לגלריה בלבד —',
'  הן אינן מחליפות את התמונה הראשית (שנבחרת לפי המטבח).',
'',
'[מקור]',
'קישור — מאיפה שמעת על המקום (קישור לפוסט/כתבה), אם יש.',
'',
'──────────────────',
'מלא/י והחזר/י רק את הטופס הבא:',
'',
'[מסעדה]','שם:','מטבח:','עיר:','אזור:','כתובת:','',
'[קישורים]','מפות:','אתר:','הזמנה:','תפריט:','משלוח:','טלפון:','',
'[מה חשוב]','סטטוס:','חשק:','הבא בתור:','מחיר:','מתאים ל:','תגיות:','',
'[Happy Hour]','ימים:','שעות:','הטבה:','תנאים:','',
'[אישי]','רוצה לנסות:','למה שמרתי:','הערות:','',
'[תמונות]','תמונה:','',
'[מקור]','קישור:'
  ].join('\n');
})();

const KEY_ALIASES={
  'שם':'name','מסעדה':'name','restaurant':'name','name':'name',
  'מטבח':'cuisines','סוג':'cuisines','cuisine':'cuisines','food type':'cuisines',
  'עיר':'city','city':'city',
  'אזור':'area','שכונה':'area','area':'area','neighborhood':'area',
  'כתובת':'address','address':'address',
  'מפות':'mapUrl','google maps':'mapUrl','maps':'mapUrl',
  'אתר':'website','website':'website',
  'הזמנה':'bookingUrl','booking':'bookingUrl','reservation':'bookingUrl',
  'תפריט':'menuUrl','menu':'menuUrl',
  'משלוח':'deliveryUrl','delivery':'deliveryUrl','טייק אוואי':'deliveryUrl','טייקאווי':'deliveryUrl','wolt':'deliveryUrl',
  'טלפון':'phone','טל':'phone','phone':'phone','tel':'phone',
  'סטטוס':'status','status':'status',
  'חשק':'craving','craving':'craving',
  'הבא בתור':'nextUp','next up':'nextUp',
  'מחיר':'price','price':'price',
  'מתאים ל':'occasions','מתאים':'occasions','occasion':'occasions',
  'תגיות':'tags','tags':'tags',
  'ימים':'hhDays','days':'hhDays',
  'שעות':'hhHours','hours':'hhHours',
  'הטבה':'hhOffer','offer':'hhOffer',
  'תנאים':'hhConditions','conditions':'hhConditions',
  'רוצה לנסות':'dishesToTry','מנות':'dishesToTry','dishes':'dishesToTry',
  'למה שמרתי':'whySaved','reason':'whySaved','why saved':'whySaved',
  'הערות':'notes','notes':'notes',
  'תמונה':'image',
  'קישור מקור':'sourceUrl','קישור':'sourceUrl','source':'sourceUrl'
};
const DAY_LETTER={'א':0,'ב':1,'ג':2,'ד':3,'ה':4,'ו':5,'ש':6};
const DAY_NAME={'ראשון':0,'שני':1,'שלישי':2,'רביעי':3,'חמישי':4,'שישי':5,'שבת':6};

function normImportText(t){
  if(!t) return '';
  t=String(t).replace(/\r\n?/g,'\n').normalize('NFC');
  t=t.replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,''); // invisible / bidi
  t=t.replace(/[\u05f4\u201c\u201d\u201e\u201f]/g,'"').replace(/[\u05f3\u2018\u2019\u201b]/g,"'"); // heb quotes
  return t;
}
const splitMulti=(s)=>String(s||'').split(/[,|•\n]/).map(x=>x.trim()).filter(Boolean);
function padHM(h,m){h=String(h);m=String(m||'00');if(h.length<2)h='0'+h;if(m.length<2)m=m+'0'.repeat(2-m.length);return h+':'+m.slice(0,2);}
function rangeDays(a,b){const o=[];if(a<=b)for(let i=a;i<=b;i++)o.push(i);else{for(let i=a;i<=6;i++)o.push(i);for(let i=0;i<=b;i++)o.push(i);}return o;}
function parseDays(s){
  if(!s) return null;
  let t=s.replace(/['"׳״]/g,'').replace(/[–—]/g,'-').trim();
  let m=/(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)\s*(?:עד|-)\s*(ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת)/.exec(t);
  if(m) return rangeDays(DAY_NAME[m[1]],DAY_NAME[m[2]]);
  m=/([אבגדהוש])\s*(?:עד|-)\s*([אבגדהוש])/.exec(t);
  if(m) return rangeDays(DAY_LETTER[m[1]],DAY_LETTER[m[2]]);
  const parts=t.split(/[,|•\s]+/).filter(Boolean); const days=[];
  for(const p of parts){ if(DAY_LETTER[p]!=null)days.push(DAY_LETTER[p]); else if(DAY_NAME[p]!=null)days.push(DAY_NAME[p]); }
  return days.length?[...new Set(days)].sort((a,b)=>a-b):null;
}
function parseHours(s){
  if(!s) return null;
  let t=s.replace(/[–—]/g,'-');
  let m=/(\d{1,2}):(\d{2})\s*(?:-|עד)\s*(\d{1,2}):(\d{2})/.exec(t);
  if(m) return {start:padHM(m[1],m[2]),end:padHM(m[3],m[4])};
  m=/(\d{1,2})\s*(?:-|עד)\s*(\d{1,2})(?!\s*:)/.exec(t);
  if(m) return {start:padHM(m[1],'00'),end:padHM(m[2],'00')};
  return null;
}
function parseStatusText(s){
  const n=(s||'').toLowerCase();
  if(/לא הייתי|רוצה לנסות|עוד לא|want/.test(n)) return 'notVisited';
  if(/כבר הייתי|הייתי|visited/.test(n)) return 'visited';
  return null;
}
function parseCravingText(s){
  const n=(s||'');
  if(/🔥|ממש בא לי/.test(n)||/high/i.test(n)) return 'high';
  if(/בא לי/.test(n)||/want/i.test(n)) return 'want';
  if(/רגיל/.test(n)||/normal/i.test(n)) return 'normal';
  return null;
}
function parseBoolText(s){
  const n=(s||'').trim().toLowerCase();
  if(!n) return null;
  if(/✨/.test(n)||/^(כן|true|yes)$/.test(n)||n==='כן') return true;
  if(/^(לא|false|no)$/.test(n)) return false;
  return null;
}
function parsePriceText(s){
  if(!s) return undefined;
  const marks=(s.match(/[₪$]/g)||[]).length; if(marks>=1&&marks<=4) return marks;
  const dig=/([1-4])/.exec(s); if(dig) return +dig[1];
  if(/זול|cheap/.test(s)) return 1; if(/יקר|expensive/.test(s)) return 4;
  return undefined;
}
/* Returns {draft, warnings} — never throws, never invents data. */
function parseImport(raw){
  const warnings=[];
  const f={};
  const lines=normImportText(raw).split('\n');
  for(let line of lines){
    const t=line.trim();
    if(!t || t[0]==='#') continue;
    if(/^\[.*\]$/.test(t)) continue; // section header (unknown sections ignored too)
    const idx=t.indexOf(':'); if(idx<0) continue;
    const rawKey=t.slice(0,idx).trim(); const val=t.slice(idx+1).trim();
    if(!val) continue;
    const canon=KEY_ALIASES[rawKey]||KEY_ALIASES[rawKey.toLowerCase()];
    if(!canon) continue;
    if(f[canon]==null) f[canon]=val; // first non-empty wins
  }
  const d={};
  if(f.name) d.name=f.name;
  if(f.cuisines) d.cuisines=splitMulti(f.cuisines);
  if(f.city) d.city=f.city;
  if(f.area) d.area=f.area;
  if(f.address) d.address=f.address;
  if(f.mapUrl) d.mapUrl=f.mapUrl;
  if(f.website) d.website=f.website;
  if(f.bookingUrl) d.bookingUrl=f.bookingUrl;
  if(f.menuUrl) d.menuUrl=f.menuUrl;
  if(f.deliveryUrl) d.deliveryUrl=f.deliveryUrl;
  if(f.phone) d.phone=f.phone;
  if(f.sourceUrl) d.sourceUrl=f.sourceUrl;
  if(f.image){ const imgs=splitMulti(f.image).filter(u=>/^(https?:|data:)/i.test(u.trim())); if(imgs.length) d.images=imgs; }
  if(f.occasions) d.occasions=splitMulti(f.occasions);
  if(f.tags) d.tags=splitMulti(f.tags);
  if(f.dishesToTry) d.dishesToTry=splitMulti(f.dishesToTry);
  if(f.whySaved) d.whySaved=f.whySaved;
  if(f.notes) d.notes=f.notes;
  if(f.status){ const st=parseStatusText(f.status); if(st) d.visitStatus=st; else warnings.push('לא זוהה סטטוס ביקור'); }
  if(f.craving){ const cv=parseCravingText(f.craving); if(cv) d.cravingLevel=cv; }
  if(f.price){ const p=parsePriceText(f.price); if(p) d.priceLevel=p; }
  if(f.nextUp!=null){ const b=parseBoolText(f.nextUp); if(b===true) d.nextUp=true; }
  // Happy Hour
  if(f.hhDays||f.hhHours||f.hhOffer||f.hhConditions){
    const hours=parseHours(f.hhHours);
    if(!hours){
      warnings.push('לא הצלחתי לזהות שעות Happy Hour');
    } else {
      const days=parseDays(f.hhDays);
      d.happyHours=[{id:uid(),days:days||[0,1,2,3,4],start:hours.start,end:hours.end,offer:f.hhOffer||'',conditions:f.hhConditions||'',enabled:true}];
      if(!days) warnings.push('לא זוהו ימים ל־Happy Hour — הוגדר א׳–ה׳ כברירת מחדל');
    }
  }
  if(!d.name) warnings.push('חסר שם מסעדה — שדה חובה');
  return {draft:d, warnings};
}

/* ---------- scoring / sort / search / filter / pick ---------- */
function score(r, now){
  let s=0, reason='';
  const hh=hhStatus(r, now);
  if(hh.kind==='activeNow'){s+=60;reason='Happy Hour עכשיו';}
  else if(hh.kind==='startingSoon'){s+=35;reason=hh.label;}
  else if(hh.kind==='laterToday'){s+=15;reason=hh.label;}
  if(r.cravingLevel==='high'){s+=14; if(!reason) reason='🔥 ממש בא לי';}
  else if(r.cravingLevel==='want'){s+=6;}
  if(r.visitStatus!=='visited'){s+=10; if(!reason) reason='עוד לא היית';}
  const age=(Date.now()-new Date(r.createdAt||Date.now()).getTime())/86400000;
  if(age<=30){s+=8; if(!reason) reason='נוסף לאחרונה';}
  return {s,reason};
}
function sortList(list, mode, now){
  const arr=list.slice();
  if(mode==='newest') arr.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  else if(mode==='alphabetical') arr.sort((a,b)=>a.name.localeCompare(b.name,'he'));
  else arr.sort((a,b)=>{const d=score(b,now).s-score(a,now).s; if(d) return d; return String(b.updatedAt).localeCompare(String(a.updatedAt));});
  return arr;
}
function searchList(list, q){
  const nq=normalize(q); if(!nq) return list;
  const words=nq.split(' ').filter(Boolean);
  const out=[];
  for(const r of list){
    const nameN=normalize(r.name);
    const hay=[r.name,(r.cuisines||[]).join(' '),(r.altNames||[]).join(' '),r.area,r.city,(r.dishesToTry||[]).join(' '),(r.tags||[]).join(' '),(r.occasions||[]).join(' '),r.whySaved,r.notes].map(x=>normalize(x||'')).join(' ');
    let ok=true, sc=0;
    for(const w of words){
      const cands=[w]; if(SYN[w]) cands.push(normalize(SYN[w]));
      const hit=cands.some(c=>hay.includes(c));
      if(!hit){ok=false;break;}
      sc += nameN.includes(w)?5:1;
    }
    if(ok) out.push({r,sc});
  }
  out.sort((a,b)=>b.sc-a.sc);
  return out.map(x=>x.r);
}
function emptyFilters(){return {visitStatus:[],cuisines:[],occasions:[],areas:[],price:[],happyHour:false};}
function activeGroups(f){let n=0;if(f.visitStatus.length)n++;if(f.cuisines.length)n++;if((f.occasions||[]).length)n++;if(f.areas.length)n++;if(f.price.length)n++;if(f.happyHour)n++;return n;}
function applyFilters(list, f, now){
  return list.filter(r=>{
    if(f.visitStatus.length && !f.visitStatus.includes(r.visitStatus)) return false;
    if(f.cuisines.length){
      // A place matches a cuisine/dish category if one of its cuisines matches,
      // OR its chosen theme image (themeKey) corresponds to that category,
      // OR its free-text fields (dishes to try / why saved / tags / notes) mention it —
      // so a "בורגר דג" cover OR "המבורגר דג" written in "רוצה לנסות" both make it findable.
      const cuisineHit=(r.cuisines||[]).some(c=>f.cuisines.some(x=>normalize(x)===normalize(c)));
      const themeHit=!!r.themeKey && f.cuisines.some(x=>cuisineImageKey([x])===r.themeKey);
      const textHit=!cuisineHit && !themeHit && f.cuisines.some(x=>textMentionsCuisine(r,x));
      if(!cuisineHit && !themeHit && !textHit) return false;
    }
    if((f.occasions||[]).length && !(r.occasions||[]).some(o=>f.occasions.some(x=>normalize(x)===normalize(o)))) return false;
    if(f.areas.length && !f.areas.some(a=>normalize(a)===normalize(r.area||r.city||''))) return false;
    if(f.price.length && !f.price.includes(r.priceLevel)) return false;
    if(f.happyHour){ if(!(r.happyHours||[]).some(x=>x && x.enabled)) return false; }
    return true;
  });
}
function chooseForMe(list, now, avoidId){
  const cand=[];
  for(const r of list){
    let w=1;
    if(hhStatus(r,now).kind==='activeNow') w+=2;
    if(r.visitStatus!=='visited') w+=0.6;
    cand.push({r,w});
  }
  let pool=cand;
  if(avoidId && cand.length>1) pool=cand.filter(c=>c.r.id!==avoidId);
  if(!pool.length) return null;
  const total=pool.reduce((s,c)=>s+c.w,0); let roll=Math.random()*total;
  for(const c of pool){ roll-=c.w; if(roll<=0) return c.r; }
  return pool[pool.length-1].r;
}

/* ---------- state ---------- */
// DATA is the in-memory working copy. Source of truth = Cloudflare D1 (via api.*).
// We hydrate from a local cache first for instant paint, then refresh from the server.
let DATA=loadCache();
const UI={screen:{kind:'home'}, query:'', filters:emptyFilters(), lastChosenId:null};
let SNACK=null, SNACK_T=null, TRASH=null;

// Local CACHE only (not the source of truth). UI prefs stored separately under UIKEY.
function loadCache(){
  let settings={sortMode:'smart',recentSearches:[]};
  try{ const s=JSON.parse(localStorage.getItem(UIKEY)||'null'); if(s&&typeof s==='object') settings={...settings,...s}; }catch(e){}
  let restaurants=[];
  try{ const raw=JSON.parse(localStorage.getItem(KEY)||'null'); if(raw&&Array.isArray(raw.restaurants)) restaurants=raw.restaurants; }catch(e){}
  return {restaurants, settings};
}
function persist(){ // write the restaurant cache + UI prefs
  try{ localStorage.setItem(KEY,JSON.stringify({restaurants:DATA.restaurants})); }catch(e){}
  try{ localStorage.setItem(UIKEY,JSON.stringify(DATA.settings||{})); }catch(e){}
}
function persistPrefs(){ try{ localStorage.setItem(UIKEY,JSON.stringify(DATA.settings||{})); }catch(e){} }
function liveList(){ return DATA.restaurants.filter(r=>!r.deleted); }
function getR(id){ return DATA.restaurants.find(r=>String(r.id)===String(id)); }
function sortMode(){ return DATA.settings.sortMode||'smart'; }

// Load restaurants from the API and refresh the UI. Falls back to cache (then seed) if offline.
async function bootstrap(){
  try{
    const list=await api.list();
    DATA.restaurants=list.map(r=>({...r, nextUp:!!r.nextUp}));
    persist();
    if(typeof render==='function') render();
  }catch(e){
    // API unreachable: keep whatever cache we have; if totally empty, fall back to bundled seed
    if(!DATA.restaurants.length && typeof seed==='function'){ DATA.restaurants=seed(); persist(); if(typeof render==='function') render(); }
    console.warn('API unavailable, using local data:', e && e.message);
  }
}

// Create or update a restaurant. Updates memory + cache instantly, then syncs to D1.
function upsert(r){
  r.updatedAt=nowIso();
  const i=DATA.restaurants.findIndex(x=>String(x.id)===String(r.id));
  if(i>=0) DATA.restaurants[i]=r; else DATA.restaurants.push(r);
  persist();
  syncUpsert(r);
}
function isServerId(id){ return typeof id==='number' || /^[0-9]+$/.test(String(id)); }
async function syncUpsert(r){
  try{
    if(isServerId(r.id)){
      await api.update(r.id, toApiPayload(r));
    }else{
      // new local record -> create on server, then swap the temp id for the real one
      const tempId=r.id;
      const created=await api.create(toApiPayload(r));
      if(created && created.id!=null){
        const rec=DATA.restaurants.find(x=>String(x.id)===String(tempId));
        if(rec){ rec.id=created.id; }
        if(UI.lastChosenId===tempId) UI.lastChosenId=created.id;
        // if the user is currently viewing this just-created place, keep the view pointed at it
        if(UI.screen && UI.screen.kind==='detail' && String(UI.screen.id)===String(tempId)) UI.screen.id=created.id;
        pendingSync.delete(tempId);
        persist();
        if(typeof render==='function') render();   // refresh cards so data-id reflects the server id
      }
    }
  }catch(e){ pendingSync.add(r.id); console.warn('sync upsert failed:', e && e.message); }
}
function setNextUp(id){
  const prev=DATA.restaurants.find(r=>r.nextUp && String(r.id)!==String(id));
  DATA.restaurants.forEach(r=>{ r.nextUp=(String(r.id)===String(id)); });
  persist();
  // sync both the newly-set and the previously-set restaurant
  const cur=getR(id); if(cur) syncUpsert(cur);
  if(prev) syncUpsert(prev);
  return prev?prev.id:null;
}
function clearNextUp(id){ const r=getR(id); if(r){ r.nextUp=false; persist(); syncUpsert(r); } }

/* ---------- snackbar ---------- */
function snackbar(message, actionLabel, onAction, ms){
  SNACK={message,actionLabel,onAction};
  renderSnack();
  clearTimeout(SNACK_T);
  SNACK_T=setTimeout(()=>{SNACK=null;renderSnack();}, ms||4000);
}
function renderSnack(){
  const el=$('snack');
  if(!SNACK){el.innerHTML='';return;}
  el.innerHTML='<div class="bar"><span>'+esc(SNACK.message)+'</span>'+(SNACK.actionLabel?'<button id="snack-act">'+esc(SNACK.actionLabel)+'</button>':'')+'</div>';
  const b=$('snack-act');
  if(b) b.onclick=()=>{ const a=SNACK&&SNACK.onAction; SNACK=null; renderSnack(); if(a)a(); };
}

/* ---------- navigation ---------- */
let nbHomePending=true, nbDetailPending=false, nbResultsPending=false, nbSettingsPending=false;
function go(screen){ if(screen&&screen.kind==='detail') nbDetailPending=true; else if(screen&&screen.kind==='home') nbHomePending=true; else if(screen&&screen.kind==='settings') nbSettingsPending=true; UI.screen=screen; window.scrollTo(0,0); render(); }
function actNav(r){
  const u=r.mapUrl||('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([r.name,r.address,r.city].filter(Boolean).join(' ')));
  window.open(u,'_blank','noopener');
}
function openExternal(u){ if(!u) return; try{const url=new URL(u,location.href); if(url.protocol==='http:'||url.protocol==='https:') window.open(url.href,'_blank','noopener');}catch(e){} }

/* ================= RENDER: HOME ================= */
function render(){
  const s=UI.screen;
  if(s.kind==='detail') return renderDetail(s.id);
  if(s.kind==='settings') return renderSettings();
  renderHome();
}

function starHTML(r){ return '<button class="star tap '+(r.nextUp?'on':'')+'" data-act="star" data-id="'+r.id+'" aria-label="'+(r.nextUp?'הסר מהבא בתור':'סמן כהבא בתור')+'">✨</button>'; }

function cardMeta(r){
  const parts=[]; const seen=new Set();
  [(r.cuisines||[])[0], r.area, r.city].forEach(x=>{ if(x && !seen.has(normalize(x))){ seen.add(normalize(x)); parts.push(x); } });
  return parts.join(' · ');
}
function cardHTML(r, reason, showNextUpBadge){
  const v=cuisineVisual(r);
  const badges=[];
  if(showNextUpBadge && r.nextUp) badges.push('<span class="badge b-nextup">'+uic('ic-star',13)+' הבא בתור</span>');
  if(r.cravingLevel==='high') badges.push('<span class="badge b-nextup">🔥 בא לי</span>');
  if(r.visitStatus==='notVisited') badges.push('<span class="badge b-neutral">עוד לא הייתי</span>');
  else badges.push('<span class="badge b-pos">כבר הייתי ✅</span>');
  if(r.priceLevel) badges.push('<span class="badge b-neutral">'+priceStr(r.priceLevel)+'</span>');
  return '<article class="card tap" data-act="detail" data-id="'+r.id+'">'
    + '<div class="cardbody"><h3>'+esc(r.name)+'</h3><p class="meta">'+esc(cardMeta(r))+'</p>'
    + '<div class="cardbadges">'+badges.slice(0,3).join('')+'</div>'
    + '</div>'
    + '<div class="thumb" style="background:'+v.grad+'">'+(hasVisualImg(v)?visualBanner(v):v.emoji)+'</div>'
    + '</article>';
}
const MC_TINTS=['#FCEEEF','#EEF6F7','#FFF0E7','#FFF7E6'];
const SUIT_EMOJI=(function(){const m={};SUIT_TAGS.forEach(t=>{m[normalize(t[1])]=t[0];});return m;})();
function ccardHTML(r, reason, idx){
  const v=cuisineVisual(r);
  const occ=(r.occasions||[])[0];
  const tagLabel = occ || reason || '';
  const tagEmoji = SUIT_EMOJI[normalize(tagLabel)] || '';
  const status = r.visitStatus==='visited' ? 'כבר הייתי' : 'עוד לא הייתי';
  const tint = MC_TINTS[(idx||0)%MC_TINTS.length];
  const icon = hasVisualImg(v) ? '<i class="mc2-ic '+(v.imgUrl?'':'icon-'+v.imgKey)+'"'+(v.imgUrl?(' style="background-image:url(\''+String(v.imgUrl).replace(/'/g,'%27')+'\')"'):'')+'></i>' : '<span class="mc2-emoji">'+v.emoji+'</span>';
  return '<article class="mc2 tap" data-act="detail" data-id="'+r.id+'" style="background:'+tint+'">'
    +'<div class="mc2-tag">'+(tagEmoji?tagEmoji+' ':'')+esc(tagLabel)+'</div>'
    +'<div class="mc2-name">'+esc(r.name)+'</div>'
    +icon
    +'<div class="mc2-status" style="color:'+(r.visitStatus==='visited'?'var(--positive)':'var(--primary)')+'">'+status+'</div>'
    +'</article>';
}

/* ================= ENTRANCE ANIMATIONS ================= */
const NB_EASE='cubic-bezier(.22,1,.36,1)';
function nbReduced(){ try{return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;} }
function nbStagger(seq){
  seq.forEach(it=>{ if(!it.el) return; const k=it.kind==='s'?'nbEnterS':it.kind==='x'?'nbEnterX':'nbEnter';
    it.el.style.opacity='0'; it.el.style.animation=k+' '+(it.dur||420)+'ms '+NB_EASE+' '+it.delay+'ms both'; });
}
function nbReveal(rootEl, els){
  if(!rootEl||!els||!els.length) return;
  let io; try{ io=new IntersectionObserver(ents=>{ents.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('nb-in'); io.unobserve(e.target); } });},{root:rootEl,threshold:0.06}); }
  catch(e){ els.forEach(x=>x.classList.add('nb-in')); return; }
  els.forEach((e,i)=>{ e.classList.add('nb-rev'); e.style.transitionDelay=(Math.min(i,4)*55)+'ms'; io.observe(e); });
}
function runHomeEntrance(){
  const R=$('root'); if(!R||nbReduced()) return;
  const scroll=R.querySelector('.scroll')||R;
  const seq=[]; let t=0;
  const add=(el,gap,kind,dur)=>{ if(el){ t+=gap; seq.push({el,delay:t,kind:kind||'y',dur:dur}); } };
  add(R.querySelector('.hd'),0,'y',400);
  add(R.querySelector('.hd [data-act="settings"]'),80,'s',350);
  add(R.querySelector('.searchwrap'),110,'y',400);
  const catwrap=R.querySelector('.catwrap');
  if(catwrap){ add(catwrap.previousElementSibling,80,'y',360); R.querySelectorAll('.catwrap .cat').forEach((c,i)=>add(c,i===0?70:50,'s',330)); }
  const fhc=R.querySelector('#fhc');
  if(fhc){ add(fhc.previousElementSibling,90,'y',360); add(fhc,110,'s',470); add(R.querySelector('#fhc-dots'),90,'s',260); }
  else { const emp=R.querySelector('.fh-empty'); if(emp){ add(emp.previousElementSibling,90,'y',360); add(emp,90,'s',430); } }
  const mcs=[...R.querySelectorAll('.mc2')];
  if(mcs.length){ const car=mcs[0].closest('.carousel'); add(car?car.previousElementSibling:null,80,'y',360); mcs.forEach((m,i)=>add(m,i===0?70:65,'x',350)); }
  nbStagger(seq);
  const fab=$('fabroot'); const fbtn=fab&&fab.querySelector('button');
  if(fbtn){ fbtn.style.opacity='0'; fbtn.style.animation='nbEnter 450ms '+NB_EASE+' '+(t+140)+'ms both'; }
  // below-the-fold "כל המקומות"
  const apCards=[...R.querySelectorAll('.card')];
  if(apCards.length){ const apTitle=apCards[0].parentElement?apCards[0].parentElement.previousElementSibling:null; nbReveal(scroll, (apTitle?[apTitle]:[]).concat(apCards)); }
}
function nbCatRects(){ const m={}; document.querySelectorAll('.catwrap .cat').forEach(c=>{ m[c.dataset.id]=c.getBoundingClientRect().left; }); return m; }
function nbFlipCats(prev){
  if(nbReduced()||!prev) return;
  document.querySelectorAll('.catwrap .cat').forEach(c=>{
    const id=c.dataset.id; if(prev[id]==null) return;
    const dx=prev[id]-c.getBoundingClientRect().left;
    if(Math.abs(dx)>1){ c.style.transition='none'; c.style.transform='translateX('+dx+'px)';
      requestAnimationFrame(()=>{ c.style.transition='transform .38s cubic-bezier(.22,1,.36,1)'; c.style.transform=''; }); }
  });
}
function runSettingsEntrance(){
  const R=$('root'); if(!R||nbReduced()) return;
  const seq=[]; let t=0;
  const add=(el,gap,kind,dur)=>{ if(el){ t+=gap; seq.push({el,delay:t,kind:kind||'y',dur:dur}); } };
  add(R.querySelector('.hd h1')||R.querySelector('.hd'),0,'y',380);
  add(R.querySelector('.hd [data-act="home"]'),80,'s',300);
  R.querySelectorAll('.settsec').forEach(sec=>{
    const h2=sec.querySelector('h2'); const list=sec.querySelector('.settlist');
    if(h2) add(h2,90,'y',300);
    if(list){ add(list,60,'s',400); list.querySelectorAll('.settrow').forEach((row,i)=>add(row,i===0?45:50,'x',300)); }
    else if(!h2){ add(sec,90,'y',300); }
  });
  nbStagger(seq);
}
function runResultsEntrance(){
  const R=$('root'); if(!R||nbReduced()) return;
  const seq=[]; let t=0;
  const add=(el,gap,kind,dur)=>{ if(el){ t+=gap; seq.push({el,delay:t,kind:kind||'y',dur:dur}); } };
  const fhc=R.querySelector('#fhc');
  if(fhc){ add(fhc.previousElementSibling,0,'y',340); add(fhc,70,'s',420); add(R.querySelector('#fhc-dots'),70,'s',240); }
  else { const emp=R.querySelector('.fh-empty'); if(emp){ add(emp.previousElementSibling,0,'y',340); add(emp,60,'s',420); } }
  const mcs=[...R.querySelectorAll('.mc2')];
  if(mcs.length){ const car=mcs[0].closest('.carousel'); add(car?car.previousElementSibling:null,60,'y',340); mcs.forEach((m,i)=>add(m,i===0?50:55,'x',330)); }
  const apCards=[...R.querySelectorAll('.card')];
  if(apCards.length){ const cont=apCards[0].parentElement; add(cont?cont.previousElementSibling:null,60,'y',340); apCards.forEach((c,i)=>{ if(i<8) add(c,i===0?60:45,'y',350); }); }
  else { add(R.querySelector('.empty'),60,'y',340); }
  nbStagger(seq);
}
function runDetailEntrance(){
  const R=$('root'); if(!R||nbReduced()) return;
  const scroll=R.querySelector('.nd-scroll')||R;
  const hero=R.querySelector('.nd-hero');
  if(hero){ hero.style.opacity='0'; hero.style.animation='nbEnter 400ms '+NB_EASE+' 0ms both'; }
  const seq=[]; let t=40;
  const add=(el,gap,kind,dur)=>{ if(el){ t+=gap; seq.push({el,delay:t,kind:kind||'y',dur:dur}); } };
  add(R.querySelector('.nd-gal')||R.querySelector('.nd-hero-img'),30,'s',520);
  const btns=[...R.querySelectorAll('.nd-hero-top .nd-hero-btn')]; btns.forEach((b,i)=>add(b,i===0?70:50,'s',320));
  add(R.querySelector('.nd-sheet'),70,'y',500);
  add(R.querySelector('.nd-grip'),20,'y',250);
  add(R.querySelector('.nd-title h1'),40,'y',350);
  add(R.querySelector('.nd-sub'),30,'y',320);
  add(R.querySelector('.nd-pill'),0,'s',300);
  add(R.querySelector('.nd-meta'),45,'y',320);
  add(R.querySelector('.nd-hh'),65,'s',440);
  [...R.querySelectorAll('.nd-act')].forEach((a,i)=>add(a,i===0?60:50,'y',300));
  nbStagger(seq);
  nbReveal(scroll,[...R.querySelectorAll('.nd-card')]);
  const cta=R.querySelector('.stickybar'); if(cta){ cta.style.opacity='0'; cta.style.animation='nbEnter 400ms '+NB_EASE+' '+Math.max(t+80,620)+'ms both'; }
}

function renderHome(){
  const now=new Date();
  const all=liveList();
  const filtering = !!UI.query.trim() || activeGroups(UI.filters)>0;
  const nextUp=all.find(r=>r.nextUp);

  // base list after filters
  let base=applyFilters(all, UI.filters, now);
  if(UI.query.trim()) base=searchList(base, UI.query);

  // feed excludes nextUp when not filtering
  let feedSrc=filtering?base:base.filter(r=>!r.nextUp);
  const feed=sortList(feedSrc, sortMode(), now);

  // matches now
  const matches=[];
  for(const r of all){
    if(r.nextUp) continue;
    const hh=hhStatus(r,now);
    if(hh.kind==='activeNow') matches.push({r,reason:'Happy Hour עכשיו',w:100});
    else if(hh.kind==='startingSoon') matches.push({r,reason:hh.label,w:80});
    else if(hh.kind==='laterToday') matches.push({r,reason:hh.label,w:60});
    else{const age=(Date.now()-new Date(r.createdAt).getTime())/86400000; if(age<=7) matches.push({r,reason:'נוסף השבוע',w:40}); else if(r.visitStatus!=='visited') matches.push({r,reason:'עוד לא היית',w:20});}
  }
  matches.sort((a,b)=>b.w-a.w);
  const matchesTop=matches.slice(0,6);

  // categories
  const catMap=new Map();
  CORE_CATEGORIES.forEach(c=>catMap.set(normalize(c),c));
  for(const r of all){const c=(r.cuisines||[])[0]; if(!c)continue; const k=normalize(c); if(!catMap.has(k)) catMap.set(k,c);}
  let cats=[...catMap.values()].slice(0,18);
  // selected cuisines float to the front (appear rightmost in RTL)
  cats=cats.map((c,i)=>({c,i,sel:UI.filters.cuisines.some(x=>normalize(x)===normalize(c))?0:1}))
           .sort((a,b)=> a.sel-b.sel || a.i-b.i).map(o=>o.c);

  // header sub
  const hhToday=all.filter(r=>{const k=hhStatus(r,now).kind; return k==='activeNow'||k==='startingSoon'||k==='laterToday';}).length;
  const sub = hhToday? ('יש '+hhToday+' מקומות עם Happy Hour היום') : nextUp? 'המקום הבא שלך כבר מחכה' : all.length? ('יש לך '+all.length+' מקומות לבחור מהם') : '';

  const groups=activeGroups(UI.filters);

  // active filter chips
  const fchips=[];
  UI.filters.visitStatus.forEach(v=>fchips.push(chipRemove(v==='notVisited'?'עוד לא הייתי':'כבר הייתי','vs',v)));
  UI.filters.cuisines.forEach(c=>fchips.push(chipRemove(c,'c',c)));
  (UI.filters.occasions||[]).forEach(o=>fchips.push(chipRemove(o,'occ',o)));
  UI.filters.areas.forEach(a=>fchips.push(chipRemove(a,'a',a)));
  UI.filters.price.forEach(p=>fchips.push(chipRemove(priceStr(p),'p',p)));
  if(UI.filters.happyHour) fchips.push(chipRemove('Happy Hour','hh',''));

  let html='<div class="scroll noscroll" id="homescroll">';
  // header
  html+='<div class="hd"><div class="row-between"><div>'
    +'<p class="kick">בא לך משהו טעים? 👋</p><h1>מה בא לך לאכול?</h1></div>'
    +'<button class="iconbtn tap" data-act="settings" aria-label="הגדרות"><i class="ui-ic ic-settings" style="width:24px;height:24px"></i></button></div>'
    +(sub?'<p class="sub">'+esc(sub)+'</p>':'')+'</div>';
  // search
  html+='<div class="searchwrap"><div class="search">'
    +'<input id="search" type="search" enterkeyhint="search" placeholder="חפש מסעדה, מטבח, אזור או מנה…" value="'+esc(UI.query)+'" />'
    +(UI.query?'<button class="clr tap" data-act="clearq" aria-label="נקה">✕</button>':'')
    +'<span class="mag">'+uic('ic-search',22)+'</span></div>'
    +'<button class="filterbtn tap" data-act="filter" aria-label="סינון">'
    +'<i class="ui-ic ic-filter" style="width:24px;height:24px"></i>'
    +(groups?'<span class="badge-count">'+groups+'</span>':'')+'</button></div>';
  // active filters
  if(fchips.length) html+='<div class="chiprow" style="margin-top:6px">'+fchips.join('')+'</div>';
  // categories
  if(cats.length>=2 && !UI.query.trim()){
    html+='<div class="sec-title" style="margin-bottom:8px"><span style="font-size:15px">מה מתחשק?</span></div>';
    html+='<div class="catwrap"><div class="carousel">'+cats.map(c=>{
      const on=UI.filters.cuisines.some(x=>normalize(x)===normalize(c));
      const v=cuisineVisual({cuisines:[c]});
      return '<button class="cat tap '+(on?'active':'')+'" data-act="cat" data-id="'+esc(c)+'"><span class="disc">'+(hasVisualImg(v)?visualIcon(v):v.emoji)+'</span><span class="lbl">'+esc(c)+'</span></button>';
    }).join('')+'<span class="cat-end"></span></div><span class="cat-fade"></span></div>';
  }
  // featured recommendation carousel (הבא בתור / Happy Hour / מתאים ל…)
  if(!filtering){
    const slides=buildFeaturedSlides(all, now, nextUp);
    if(slides.length){
      html+='<div class="sec-title"><span style="font-size:15px">הכי בא לי עכשיו '+uic('ic-star',16)+'</span></div>';
      html+='<div class="fhc" id="fhc">'+slides.map(s=>'<div class="fhc-slide">'+featuredSlideHTML(s)+'</div>').join('')+'</div>';
      if(slides.length>1) html+='<div class="fhc-dots" id="fhc-dots">'+slides.map((s,i)=>'<button type="button" class="fhc-dot'+(i===0?' on':'')+'" data-i="'+i+'" aria-label="המלצה '+(i+1)+'"></button>').join('')+'</div>';
    } else if(all.length){
      html+='<div class="fh-empty"><h3>כבר החלטת מה המקום הבא?</h3>'
        +'<p class="meta" style="margin:0 0 12px">כשתסמן מקום עם '+uic('ic-star',14)+', הוא יחכה לך כאן.</p>'
        +'<button class="btn btn-soft full tap" data-act="choose">🎲 תבחר לי</button></div>';
    }
  }
  // matches now
  if(!filtering && matchesTop.length>=2){
    html+='<div class="sec-title"><span>מתאים עכשיו ✨</span></div>';
    html+='<div class="carousel">'+matchesTop.map((m,i)=>ccardHTML(m.r,m.reason,i)).join('')+'</div>';
  }
  // all places
  html+='<div class="sec-title"><span>'+(UI.query.trim()?'תוצאות חיפוש':'כל המקומות')+'</span><button class="right tap" data-act="cyclesort">'+feed.length+' מקומות</button></div>';
  if(feed.length){
    html+='<div style="display:flex;flex-direction:column;gap:12px;padding:0 18px">'
      +feed.map(r=>cardHTML(r, null, filtering)).join('')+'</div>';
  } else {
    if(!all.length){
      html+='<div class="empty"><div class="big">🍽️</div><h3>הרשימה שלך מתחילה בביס אחד</h3>'
        +'<p>הוסף מקומות שאהבת או כאלה שבא לך לנסות.</p>'
        +'<button class="btn btn-primary tap" style="margin-top:12px" data-act="add">הוסף מקום ראשון</button></div>';
    } else if(UI.query.trim()){
      html+='<div class="empty"><p>לא מצאתי מקום כזה ברשימה שלך</p>'
        +'<button class="btn btn-soft tap" style="margin-top:10px" data-act="addq">הוסף את “'+esc(UI.query.trim())+'”</button></div>';
    } else {
      html+='<div class="empty"><p>לא מצאתי מקום שמתאים לכל הבחירות</p>'
        +'<button class="btn btn-soft tap" style="margin-top:10px" data-act="clearfilters">נקה סינון</button></div>';
    }
  }
  html+='<div style="height:120px"></div></div>';
  $('root').innerHTML=html;

  // FAB
  $('fabroot').innerHTML='<div class="fab"><button class="tap" data-act="add">＋ הוסף מקום</button></div>';
  setupFeaturedCarousel();
  if(nbHomePending){ nbHomePending=false; nbResultsPending=false; try{ runHomeEntrance(); }catch(e){} }
  else if(nbResultsPending){ nbResultsPending=false; try{ runResultsEntrance(); }catch(e){} }

  // restore search focus
  if(document.activeElement && document.activeElement.id==='search'){}
}
/* Build up to 3 featured slides from live data (no hardcoding). */
function buildFeaturedSlides(all, now, nextUp){
  const slides=[]; const used=new Set();
  if(nextUp){
    const hh=hhStatus(nextUp,now);
    const status=(hh.kind==='activeNow'||hh.kind==='startingSoon'||hh.kind==='laterToday')?hh.label:(nextUp.visitStatus==='visited'?'כבר הייתי':'עוד לא הייתי');
    slides.push({kind:'nextup', r:nextUp, status}); used.add(nextUp.id);
  }
  // Happy Hour: active now > starting soon > later today
  let best=null,bestSc=-1;
  for(const r of all){ if(used.has(r.id)) continue;
    const rules=(r.happyHours||[]).filter(x=>x.enabled); if(!rules.length) continue;
    const s=hhStatus(r,now); let sc=-1;
    if(s.kind==='activeNow')sc=3; else if(s.kind==='startingSoon')sc=2; else if(s.kind==='laterToday')sc=1; else continue;
    if(sc>bestSc){bestSc=sc;best={r,s,ru:rules[0]};}
  }
  if(best){
    const off=splitOffer(best.ru.offer);
    let soon='';
    if(best.s.kind==='startingSoon'){ const m=toMin(best.ru.start)-(now.getHours()*60+now.getMinutes()); if(m>0) soon='מתחיל בעוד '+m+' דק׳'; }
    else if(best.s.kind==='activeNow') soon='פעיל עכשיו';
    slides.push({kind:'hh', r:best.r, offerLead:off.lead, offerRest:off.rest, time:best.ru.start+'–'+best.ru.end, soon}); used.add(best.r.id);
  }
  // Situation match from "מתאים ל" (smart-sorted so the pick feels relevant)
  const sorted=sortList(all, sortMode(), now);
  for(const r of sorted){ if(used.has(r.id)) continue; const occ=(r.occasions||[])[0]; if(occ){
    slides.push({kind:'occ', r, tag:occ, emoji:SUIT_EMOJI[normalize(occ)]||'', status:(r.visitStatus==='visited'?'כבר הייתי':'עוד לא היית')}); used.add(r.id); break; } }
  return slides;
}
function fcImage(v){
  if(v.imgUrl) return '<div class="fc-img" style="background-image:url(\''+String(v.imgUrl).replace(/'/g,'%27')+'\')"></div>';
  if(v.imgKey) return '<div class="fc-img bgimg cover banner-'+v.imgKey+'"></div>';
  return '<div class="fc-img fc-imgemoji">'+v.emoji+'</div>';
}
function featuredSlideHTML(s){
  const r=s.r; const v=cuisineVisual(r);
  let badge, mid, menu='';
  if(s.kind==='nextup'){ badge=uic('ic-star',13)+' הבא בתור'; mid='<p class="sub">'+esc(metaLine(r))+'</p><p class="st">'+esc(s.status)+'</p>';
    menu='<button class="fc-menu tap" data-act="heromenu" data-id="'+r.id+'" aria-label="אפשרויות">⋯</button>'; }
  else if(s.kind==='hh'){ badge='Happy Hour 🍸'; mid='<p class="sub">'+esc(metaLine(r))+'</p><p class="st">'+(s.offerLead?'<b class="fc-hh30">'+esc(s.offerLead)+'</b> · ':'')+esc(s.time)+'</p>'; }
  else { badge=(s.emoji?s.emoji+' ':'')+'מתאים ל'+esc(s.tag); mid='<p class="sub">'+esc(metaLine(r))+'</p><p class="st">'+esc(s.status)+'</p>'; }
  return '<div class="fc tap" data-act="detail" data-id="'+r.id+'">'
    +fcImage(v)+'<div class="fc-seam"></div>'+menu
    +'<div class="fc-panel"><span class="fc-badge">'+badge+'</span><h3>'+esc(r.name)+'</h3><div class="fc-mid">'+mid+'</div></div>'
    +'<div class="fc-actions"><button class="p tap" data-act="detail" data-id="'+r.id+'">פרטים</button>'
    +'<button class="s tap" data-act="nav" data-id="'+r.id+'">נווט '+uic('ic-pin',16)+'</button></div></div>';
}
function setupFeaturedCarousel(){
  const c=$('fhc'); if(!c) return; const dots=$('fhc-dots');
  function upd(){ if(!dots) return; const cc=c.getBoundingClientRect(); const mid=cc.left+cc.width/2; let best=0,bd=1e9;
    [...c.children].forEach((sl,i)=>{const r=sl.getBoundingClientRect();const ctr=r.left+r.width/2;const dd=Math.abs(ctr-mid);if(dd<bd){bd=dd;best=i;}});
    [...dots.children].forEach((d,i)=>d.classList.toggle('on',i===best)); }
  let raf; c.addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(upd);});
  if(dots) dots.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(!b)return;const i=+b.dataset.i;const sl=c.children[i];if(sl)sl.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});});
}
function chipRemove(label,type,val){
  return '<button class="chip on tap" data-act="rmfilter" data-type="'+type+'" data-id="'+esc(val)+'">'+esc(label)+' ✕</button>';
}

/* ================= RENDER: DETAIL ================= */
function renderDetail(id){
  const r=getR(id);
  $('fabroot').innerHTML='';
  if(!r||r.deleted){ $('root').innerHTML='<div class="scroll"><div class="empty" style="margin-top:120px"><p>המקום לא נמצא</p><button class="btn btn-soft tap" data-act="home">חזרה</button></div></div>'; return; }
  const now=new Date();
  const v=cuisineVisual(r);
  const website=r.website, phone=r.phone, address=r.address;
  const price=r.priceLevel;
  const hh=hhStatus(r,now);
  const rmap={great:'😍 מעולה',good:'🙂 טוב',okay:'😐 סביר',notAgain:'🙅 לא שוב'};

  // 4 — metadata row (continuous, with separators). Only populated parts.
  const meta=[];
  if(address) meta.push('<span class="mi">'+uic('ic-map',17)+'<span>'+esc(address)+'</span></span>');
  if(r.area||r.city) meta.push('<span class="mi">'+uic('ic-building',17)+'<b>'+esc(r.area||r.city)+'</b></span>');
  if(price){ const pw={1:'זול',2:'בינוני',3:'יקר',4:'יקר'}[price]||''; meta.push('<span class="mi">'+uic('ic-coin'+price,18)+'<b>'+priceStr(price)+'</b> · '+pw+'</span>'); }
  const metaHtml = meta.length? '<div class="nd-meta">'+meta.map((m,i)=>(i?'<span class="sep"></span>':'')+m).join('')+'</div>':'';

  // 5 — Happy Hour promo card (kept high on the page, right after metadata, before actions).
  //      Shows whenever the place has an enabled rule; renders only the parts that exist.
  let hhHtml='';
  const hhRules=(r.happyHours||[]).filter(x=>x && x.enabled);
  if(hhRules.length){
    const ru=hhRules[0];
    const off=splitOffer(ru.offer);
    const hasDays=ru.days && ru.days.length;
    const hasHours=/^\d{1,2}:\d{2}$/.test(ru.start||'') && /^\d{1,2}:\d{2}$/.test(ru.end||'');
    const parts=[];
    if(off.lead||off.rest) parts.push((off.lead?'<span class="nd-hh-pct">'+esc(off.lead)+'</span> ':'')+(off.rest?esc(off.rest):''));
    if(hasHours) parts.push('<span class="nd-hh-time">'+esc(ru.start)+'–'+esc(ru.end)+' '+uic('ic-clock',15)+'</span>');
    if(ru.conditions) parts.push('<span>'+esc(ru.conditions)+'</span>');
    hhHtml='<div class="nd-hh"><div class="nd-hh-body">'
      +'<div class="nd-hh-top"><span class="nd-hh-title">🍸 Happy Hour</span>'+(hasDays?'<span class="nd-hh-day">'+esc(formatDaysRange(ru.days))+'</span>':'')+'</div>'
      +(parts.length?'<div class="nd-hh-sub">'+parts.join('<span class="dot">•</span>')+'</div>':'')
      +'</div><div class="nd-hh-art bgimg bg-happyhour"></div></div>';
  }

  // 6 — action row: show the first 3 available actions by priority (נווט → משלוח → תפריט → הזמנה → אתר)
  const ndAct=(icon,label,act)=>
    '<button class="nd-act tap" data-act="'+act+'" data-id="'+r.id+'"><span class="ic">'+icon+'</span>'+label+'</button>';
  const actionCandidates=[
    {ok:!!address,      icon:uic('ic-navpin',20),   label:'נווט',   act:'nav'},
    {ok:!!r.deliveryUrl,icon:uic('ic-delivery',20), label:'משלוח',  act:'delivery'},
    {ok:!!r.menuUrl,    icon:uic('ic-book',20),     label:'תפריט',  act:'menu'},
    {ok:!!r.bookingUrl, icon:uic('ic-clock',20),    label:'הזמנה',  act:'book'},
    {ok:!!website,      icon:uic('ic-globe',20),    label:'אתר',    act:'web'},
  ].filter(a=>a.ok).slice(0,3);
  const actionsHtml = actionCandidates.length
    ? '<div class="nd-actions" style="--nd-cols:'+actionCandidates.length+'">'+actionCandidates.map(a=>ndAct(a.icon,a.label,a.act)).join('')+'</div>'
    : '';

  // 7 — "מה בא לי לטעום" compact carousel (only if dishes)
  let dishesHtml='';
  if((r.dishesToTry||[]).length){
    dishesHtml='<div class="nd-card"><div class="nd-card-hd"><h3>'+uic('ic-cuisinebowl',20)+' מה בא לי לטעום</h3></div>'
      +'<div style="display:flex;align-items:center;gap:8px">'
      +(r.dishesToTry.length>2?'<button class="nd-more tap" data-act="dishscroll" aria-label="עוד">‹</button>':'')
      +'<div class="nd-dishrow" id="nd-dishrow">'
      +r.dishesToTry.map(dn=>'<span class="nd-dish"><span class="thumb2">'+dishEmoji(dn)+'</span>'+esc(dn)+'</span>').join('')
      +'</div></div></div>';
  }

  // 8 — "מתאים ל" (occasions + tags)
  let occ=[...(r.occasions||[]),...(r.tags||[])];
  let occHtml='';
  if(occ.length){
    const occEmoji=(t)=>{const n=normalize(t);if(n.includes('חבר'))return '👥 ';if(n.includes('ערב')||n.includes('לילה'))return '🌙 ';if(n.includes('עבוד'))return '💼 ';if(n.includes('דייט')||n.includes('רומנט'))return '❤️ ';if(n.includes('משפח'))return '👨\u200d👩\u200d👧 ';if(n.includes('חגיג'))return '🎉 ';return '';};
    occHtml='<div class="nd-card"><div class="nd-card-hd"><h3>'+uic('ic-star',18)+' מתאים ל</h3></div><div class="nd-chips">'
      +occ.map(t=>'<span class="nd-chip">'+occEmoji(t)+esc(t)+'</span>').join('')+'</div></div>';
  }

  // 9 — "פרטים" (address / phone / website), compact — coral line icons
  const det=[];
  if(phone) det.push('<a class="nd-detrow" href="tel:'+esc(phone.replace(/[^\d+]/g,''))+'"><span class="dlabel">טלפון</span><span class="dval"><span dir="ltr">'+esc(phone)+'</span>'+uic('ic-phone',17)+'</span></a>');
  if(website) det.push('<button class="nd-detrow tap" data-act="web" data-id="'+r.id+'"><span class="dlabel">אתר</span><span class="dval"><span>'+esc(String(website).replace(/^https?:\/\//,'').replace(/\/$/,''))+'</span>'+uic('ic-globe',17)+'</span></button>');
  if(r.deliveryUrl) det.push('<button class="nd-detrow tap" data-act="delivery" data-id="'+r.id+'"><span class="dlabel">משלוח</span><span class="dval"><span>'+esc(String(r.deliveryUrl).replace(/^https?:\/\//,'').replace(/\/$/,''))+'</span>'+uic('ic-delivery',17)+'</span></button>');
  if(address) det.push('<button class="nd-detrow tap" data-act="nav" data-id="'+r.id+'"><span class="dlabel">כתובת</span><span class="dval"><span>'+esc(address)+'</span>'+uic('ic-navpin',17)+'</span></button>');
  let detHtml = det.length? '<div class="nd-card nd-details"><div class="nd-card-hd"><h3>פרטים</h3></div>'+det.join('')+'</div>':'';

  // Preserve remaining info: why saved / notes / visits (compact cards)
  let extraHtml='';
  if(r.whySaved) extraHtml+='<div class="nd-card"><div class="nd-card-hd"><h3>'+uic('ic-star',18)+' למה שמרתי</h3></div><div class="nd-body-text">'+esc(r.whySaved)+'</div></div>';
  if(r.notes) extraHtml+='<div class="nd-card"><div class="nd-card-hd"><h3>📝 הערות</h3></div><div class="nd-body-text">'+esc(r.notes)+'</div></div>';
  if((r.visits||[]).length){
    extraHtml+='<div class="nd-card"><div class="nd-card-hd"><h3>🗓️ ביקורים ('+r.visits.length+')</h3></div>'
      +r.visits.slice().reverse().map(vs=>'<div class="nd-visit"><div class="vtop"><span>'+esc(new Date(vs.date).toLocaleDateString('he-IL'))+'</span><span>'+(vs.reaction?rmap[vs.reaction]:'')+'</span></div>'+(vs.liked?'<div class="meta">אהבתי: '+esc(vs.liked)+'</div>':'')+(vs.notes?'<div class="meta">'+esc(vs.notes)+'</div>':'')+'</div>').join('')+'</div>';
  }

  // reaction pill (visited) — keep info without cluttering the hero
  const reactHtml = (r.visitStatus==='visited'&&r.personalReaction)? '<div class="nd-react"><span class="badge b-pos">'+rmap[r.personalReaction]+'</span></div>':'';

  let html='<div class="nd-scroll" id="detailscroll">';
  // 1 — Hero gallery (primary = cuisine image; extra = user-added URLs)
  const userImgs = (Array.isArray(r.images)&&r.images.length)? r.images.filter(u=>/^(https?:|data:)/i.test(String(u).trim()))
                  : (r.image && /^(https?:|data:)/i.test(String(r.image).trim()) ? [r.image] : []);
  const gallery = [{key:v.imgKey}].concat(userImgs.map(u=>({url:u})));
  const multi = gallery.length>1;
  const slideHtml = gallery.map((g,i)=> g.key
    ? '<div class="nd-gal-slide bgimg cover banner-'+g.key+'" data-gi="'+i+'"></div>'
    : '<div class="nd-gal-slide" data-gi="'+i+'" style="background-image:url(\''+String(g.url).replace(/'/g,'%27')+'\')"></div>'
  ).join('');
  html+='<div class="nd-hero" style="background:'+heroTint(r)+'">'
    +'<div class="nd-hero-top">'
    +'<button class="nd-hero-btn tap" data-act="home" aria-label="חזרה">→</button>'
    +'<button class="nd-hero-btn tap" data-act="detmenu" data-id="'+r.id+'" aria-label="אפשרויות">⋮</button>'
    +'</div>'
    +'<div class="nd-gal'+(multi?' nd-gal-multi':'')+'" id="nd-gal" data-id="'+r.id+'">'+slideHtml+'</div>'
    +(multi?'<span class="nd-gal-count" id="nd-gal-count">1/'+gallery.length+' 🖼️</span>':'')
    +(multi?'<div class="nd-gal-dots" id="nd-gal-dots">'+gallery.map((g,i)=>'<span class="'+(i===0?'on':'')+'"></span>').join('')+'</div>':'')
    +'</div>';
  // 2 — Bottom sheet
  html+='<div class="nd-sheet"><div class="nd-grip"></div>';
  // 3 — title + nextUp pill
  html+='<div class="nd-titlerow"><div class="nd-title" style="min-width:0"><h1>'+esc(r.name)+'</h1>'
    +'<p class="nd-sub">'+esc(metaLine(r))+'</p></div>'
    +(r.nextUp?'<button class="nd-pill tap" data-act="star" data-id="'+r.id+'" aria-label="הסר מהבא בתור">'+uic('ic-star',16)+' הבא בתור</button>':'')
    +'</div>';
  html+=metaHtml+reactHtml+hhHtml+actionsHtml+dishesHtml+occHtml+detHtml+extraHtml;
  html+='</div></div>';
  // 10 — sticky CTA (unchanged behaviour)
  html+='<div class="stickybar"><button class="btn btn-primary full tap" data-act="visit" data-id="'+r.id+'">'+(r.visitStatus==='visited'?'הוסף ביקור':'סמן שהייתי כאן')+'</button></div>';
  $('root').innerHTML=html;
  setupGallery();
  if(nbDetailPending){ nbDetailPending=false; try{ runDetailEntrance(); }catch(e){} }
}
function setupGallery(){
  const gal=$('nd-gal'); if(!gal) return;
  const slides=[...gal.children]; if(slides.length<2) return;
  const count=$('nd-gal-count'), dots=$('nd-gal-dots');
  const update=()=>{ const i=Math.round(gal.scrollLeft/ -(gal.clientWidth||1)); // RTL scrollLeft is negative
    let idx=Math.round(Math.abs(gal.scrollLeft)/(gal.clientWidth||1)); idx=Math.max(0,Math.min(slides.length-1,idx));
    if(count) count.textContent=(idx+1)+'/'+slides.length+' 🖼️';
    if(dots) [...dots.children].forEach((d,j)=>d.classList.toggle('on',j===idx));
  };
  gal.addEventListener('scroll',()=>{ window.requestAnimationFrame(update); });
  // tap → fullscreen
  gal.addEventListener('click',()=>{ let idx=Math.round(Math.abs(gal.scrollLeft)/(gal.clientWidth||1)); openGallery(gal.dataset.id, idx); });
}
function openGallery(id, start){
  const r=getR(id); if(!r) return;
  const v=cuisineVisual(r);
  const userImgs=(Array.isArray(r.images)&&r.images.length)?r.images.filter(u=>/^(https?:|data:)/i.test(String(u).trim())):(r.image&&/^(https?:|data:)/i.test(String(r.image).trim())?[r.image]:[]);
  const gallery=[{key:v.imgKey}].concat(userImgs.map(u=>({url:u})));
  const wrap=document.createElement('div'); wrap.id='gfull';
  wrap.innerHTML='<button class="gf-x" aria-label="סגור">✕</button><span class="gf-count" id="gf-count"></span>'
    +'<div class="gf-track" id="gf-track">'+gallery.map(g=> g.key
      ? '<div class="gf-slide bgimg bg-'+('banner-'+g.key)+'"></div>'
      : '<div class="gf-slide" style="background-image:url(\''+String(g.url).replace(/'/g,'%27')+'\')"></div>').join('')+'</div>';
  // fix: banner class name (no extra "bg-")
  wrap.querySelectorAll('.gf-slide.bgimg').forEach((s,i)=>{ if(gallery[i].key){ s.className='gf-slide bgimg banner-'+gallery[i].key; } });
  document.body.appendChild(wrap); document.body.style.overflow='hidden';
  const track=wrap.querySelector('#gf-track'); const cnt=wrap.querySelector('#gf-count');
  const upd=()=>{ let idx=Math.max(0,Math.min(gallery.length-1,Math.round(Math.abs(track.scrollLeft)/(track.clientWidth||1)))); cnt.textContent=(idx+1)+'/'+gallery.length; };
  track.addEventListener('scroll',()=>window.requestAnimationFrame(upd));
  const close=()=>{ wrap.remove(); document.body.style.overflow=''; };
  wrap.querySelector('.gf-x').onclick=close; wrap.addEventListener('click',e=>{ if(e.target===wrap) close(); });
  requestAnimationFrame(()=>{ if(start){ track.scrollLeft = -(start*track.clientWidth); } upd(); });
}

/* ================= RENDER: SETTINGS ================= */
function renderSettings(){
  $('fabroot').innerHTML='';
  const cnt=liveList().length;
  const rs=DATA.settings.recentSearches||[];
  let html='<div class="scroll"><div class="hd" style="display:flex;align-items:center;gap:12px">'
    +'<button class="iconbtn tap" data-act="home">→</button><h1 style="font-size:22px">הגדרות</h1></div>';
  html+='<div style="height:12px"></div>';
  html+='<div class="settsec"><h2>גיבוי ונתונים</h2><div class="settlist">'
    +'<button class="settrow tap" data-act="export"><span class="em">'+uic('ic-export',20)+'</span><span class="t"><b>ייצוא גיבוי</b><small>קובץ JSON להורדה</small></span></button>'
    +'<button class="settrow tap" data-act="import"><span class="em">'+uic('ic-import',20)+'</span><span class="t"><b>ייבוא גיבוי</b><small>מיזוג עם הרשימה הקיימת</small></span></button>'
    +'</div></div>';
  html+='<div class="settsec"><h2>חיפוש</h2><div class="settlist">'
    +'<button class="settrow tap" data-act="clearsearch"><span class="em">'+uic('ic-search',20)+'</span><span class="t"><b>נקה חיפושים אחרונים</b><small>'+(rs.length?rs.length+' שמורים':'אין')+'</small></span></button>'
    +'</div></div>';
  html+='<div class="settsec"><h2>איפוס</h2><div class="settlist">'
    +'<button class="settrow tap danger" data-act="reset"><span class="em">'+uic('ic-reset',20)+'</span><span class="t"><b class="danger">איפוס האפליקציה</b><small>מחיקת כל '+cnt+' המקומות</small></span></button>'
    +'</div></div>';
  html+='<div class="settsec" style="color:var(--muted);font-size:13px;display:flex;gap:8px;align-items:center">ℹ️ הביס הבא · הכול נשמר במכשיר שלך בלבד.</div>';
  html+='<div style="height:40px"></div></div>';
  $('root').innerHTML=html;
  if(nbSettingsPending){ nbSettingsPending=false; try{ runSettingsEntrance(); }catch(e){} }
}

/* ================= MODALS ================= */
function openModal(node, full){
  const m=$('modal'); m._closing=false; m.className='show'; m.innerHTML='';
  const bd=document.createElement('div'); bd.className='backdrop'; bd.onclick=closeModal;
  const sheet=document.createElement('div'); sheet.className='sheet'+(full?' full':'');
  sheet.onclick=e=>e.stopPropagation();
  sheet.appendChild(node);
  m.appendChild(bd); m.appendChild(sheet);
  document.body.style.overflow='hidden';
}
function closeModal(){
  const m=$('modal'); if(!m||!m.classList.contains('show')||m._closing) return;
  const finish=()=>{ m.className=''; m.innerHTML=''; m._closing=false; document.body.style.overflow=''; };
  if(nbReduced()){ finish(); return; }
  m._closing=true;
  m.classList.add('closing');
  const sheet=m.querySelector('.sheet');
  let done=false;
  const end=()=>{ if(done) return; done=true; finish(); };
  if(sheet){ sheet.addEventListener('animationend', end, {once:true}); }
  setTimeout(end, 320); // safety fallback if animationend doesn't fire
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });

/* ---- Filter sheet ---- */
function openFilter(){
  const all=liveList(); const now=new Date();
  const tmp={visitStatus:UI.filters.visitStatus.slice(),cuisines:UI.filters.cuisines.slice(),occasions:(UI.filters.occasions||[]).slice(),areas:UI.filters.areas.slice(),price:UI.filters.price.slice(),happyHour:UI.filters.happyHour};
  let tmpSort=sortMode();
  const exp={cuisine:false,suit:false,area:false};
  // sources of truth
  const cuisines=[]; { const seen=new Set(); [...CORE_CATEGORIES, ...all.flatMap(r=>r.cuisines||[])].forEach(c=>{ const k=normalize(c); if(c && !seen.has(k)){ seen.add(k); cuisines.push(c); } }); }
  const areas=[...new Set(all.map(r=>r.area||r.city).filter(Boolean))];
  const CUISINE_DEFAULT=['בורגר','פיצה','אסייתי','איטלקי','ים תיכוני','בית קפה'];
  const SUIT_DEFAULT=['דייט','עם חברים','משפחה','ערב','בראנץ׳','חגיגה'];
  const node=document.createElement('div');
  const nn=v=>normalize(String(v));

  function chip(v,label,iconHtml,on,dataT){ return '<button type="button" class="chip '+(on?'on':'off')+' tap" data-t="'+dataT+'" data-v="'+esc(v)+'">'+(iconHtml||'')+esc(label)+'</button>'; }
  function section(title, items, sel, dataT, limit, key, defaults){
    const selN=sel.map(nn);
    const expanded=exp[key];
    let shown;
    if(!limit || expanded) shown=items;
    else {
      const def = defaults ? items.filter(it=>defaults.some(dd=>nn(dd)===nn(it.v))) : items.slice(0,limit);
      const defSet=new Set(def.map(it=>nn(it.v)));
      const extra = items.filter(it=> selN.includes(nn(it.v)) && !defSet.has(nn(it.v)));
      shown=def.concat(extra);
    }
    const shownSet=new Set(shown.map(it=>nn(it.v)));
    const hiddenSel=items.filter(it=> selN.includes(nn(it.v)) && !shownSet.has(nn(it.v))).length;
    let h='<div class="fsec"><h3>'+esc(title)+'</h3><div class="fchips">';
    h+=shown.map(it=>chip(it.v,it.label,it.icon||'',selN.includes(nn(it.v)),dataT)).join('');
    if(limit && items.length>limit){
      h+='<button type="button" class="fmore" data-more="'+key+'">'+(expanded?'פחות ↑':('+ עוד'+(hiddenSel?' ('+hiddenSel+')':'')))+'</button>';
    }
    h+='</div></div>';
    return h;
  }

  function draw(){
    const count=applyFilters(all,tmp,now).length;
    const cuisItems=cuisines.map(c=>{const k=cuisineImageKey([c]); return {v:c,label:c,icon:(k?uic('icon-'+k,16)+' ':'')};});
    const suitItems=SUIT_TAGS.map(t=>({v:t[1],label:t[1],icon:t[0]+' '}));
    const areaItems=areas.map(a=>({v:a,label:a,icon:uic('ic-pin',15)+' '}));
    node.innerHTML='<div class="grip"></div><h2 class="title">סינון</h2><div class="fbody">'
      +'<div class="fsec"><h3>סטטוס ביקור</h3><div class="fchips">'
        +chip('notVisited','עוד לא הייתי',uic('ic-notvisited',18)+' ',tmp.visitStatus.includes('notVisited'),'vs')
        +chip('visited','כבר הייתי',uic('ic-visited',18)+' ',tmp.visitStatus.includes('visited'),'vs')
      +'</div></div>'
      +section('סוג מטבח', cuisItems, tmp.cuisines, 'c', 6, 'cuisine', CUISINE_DEFAULT)
      +section('מתאים ל', suitItems, tmp.occasions, 'occ', 6, 'suit', SUIT_DEFAULT)
      +section('אזור', areaItems, tmp.areas, 'a', 5, 'area', null)
      +'<div class="fsec"><h3>מחיר</h3><div class="fchips">'
        +[1,2,3,4].map(p=>chip(String(p),priceStr(p),uic('ic-coin'+p,18)+' ',tmp.price.includes(p),'p')).join('')
      +'</div></div>'
      +'<div class="fsec"><h3>Happy Hour</h3><div class="fchips">'
        +chip('1','יש Happy Hour',uic('bg-happyhour',18)+' ',tmp.happyHour,'hh')
      +'</div></div>'
      +'<div class="fsec"><h3>מיון</h3><div class="fchips">'
        +[['smart','חכם'],['newest','נוסף לאחרונה'],['alphabetical','א׳–ת׳']].map(m=>'<button type="button" class="chip '+(tmpSort===m[0]?'on':'off')+' tap" data-sort="'+m[0]+'">'+m[1]+'</button>').join('')
      +'</div></div></div>'
      +'<div class="sheetfoot"><button type="button" class="tap ffclear" data-clear="1">נקה הכול</button>'
      +'<button type="button" class="btn btn-primary flex1 tap" data-apply="1" '+(count===0?'disabled':'')+'>'+(count===0?'אין התאמות':'הצג '+count+' מקומות')+'</button></div>';
  }
  draw();
  node.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.more){ const key=b.dataset.more; exp[key]=!exp[key]; const was=exp[key]; draw();
      if(was){ // just expanded → gently animate the chips of that section
        const secs=[...node.querySelectorAll('.fsec')];
        // find the section whose more-button matches key
        const sec=secs.find(s=>s.querySelector('[data-more="'+key+'"]'));
        if(sec && !nbReduced()){ [...sec.querySelectorAll('.chip')].forEach((c,i)=>{ c.style.animation='fchipIn .26s cubic-bezier(.22,1,.36,1) '+(i*28)+'ms both'; }); }
      }
      return; }
    if(b.dataset.t){
      const t=b.dataset.t,v=b.dataset.v;
      const tog=(arr,val)=>{const i=arr.findIndex(x=>String(x)===String(val)); if(i>=0)arr.splice(i,1); else arr.push(val);};
      const togN=(arr,val)=>{const i=arr.findIndex(x=>normalize(x)===normalize(val)); if(i>=0)arr.splice(i,1); else arr.push(val);};
      if(t==='vs')tog(tmp.visitStatus,v); else if(t==='c')togN(tmp.cuisines,v); else if(t==='occ')togN(tmp.occasions,v); else if(t==='a')togN(tmp.areas,v);
      else if(t==='p')tog(tmp.price,+v); else if(t==='hh')tmp.happyHour=!tmp.happyHour;
      draw(); return;
    }
    if(b.dataset.sort){ tmpSort=b.dataset.sort; draw(); return; }
    if(b.dataset.clear){ tmp.visitStatus=[];tmp.cuisines=[];tmp.occasions=[];tmp.areas=[];tmp.price=[];tmp.happyHour=false; draw(); return; }
    if(b.dataset.apply){ UI.filters=tmp; DATA.settings.sortMode=tmpSort; persist(); closeModal(); nbResultsPending=true; render(); return; }
  });
  openModal(node,false);
}

/* ---- Choose for me ---- */
function openChoose(){
  const all=liveList(); const now=new Date();
  const node=document.createElement('div');
  let cur=null;
  function cardHtml(r){ const v=cuisineVisual(r); const reason=score(r,now).reason;
    return '<div class="hero" style="margin:0"><div class="himg" style="background:'+v.grad+'">'+(hasVisualImg(v)?visualBanner(v):v.emoji)+'</div>'
      +'<h3>'+esc(r.name)+'</h3><p class="meta" style="margin:2px 4px 0">'+esc(metaLine(r))+'</p>'
      +(reason?'<p class="reason" style="margin:6px 4px 0">'+esc(reason)+'</p>':'')+'</div>'; }
  function shell(){
    node.innerHTML='<div class="grip"></div><h2 class="title">🎲 מה בא לי לאכול?</h2>'
      +'<div style="padding:12px 20px 0"><div class="cfm-stage" id="cfm-stage"></div></div>'
      +'<div class="sheetfoot" id="cfm-foot" style="flex-direction:column;gap:8px;align-items:stretch">'
      +'<button class="btn btn-primary full tap" data-open="1">זה! פתח פרטים</button>'
      +'<div style="display:flex;gap:8px"><button class="btn btn-soft flex1 tap" data-more="1">עוד הצעה 🎲</button>'
      +'<button class="btn btn-outline flex1 tap" data-star="1">סמן כהבא בתור</button></div></div>';
  }
  function emptyShell(){
    node.innerHTML='<div class="grip"></div><h2 class="title">🎲 תבחר לי</h2><div style="padding:24px;text-align:center;color:var(--muted)">אין כרגע מקום להציע. נסה להוסיף מקומות או להסיר סינון.</div><div class="sheetfoot"><button class="btn btn-soft full tap" data-close="1">סגור</button></div>';
  }
  function setCard(r, animate){
    cur=r; UI.lastChosenId=r.id;
    const stage=node.querySelector('#cfm-stage'); if(!stage) return;
    const old=stage.firstElementChild;
    const el=document.createElement('div'); el.className='cfm-card'; el.innerHTML=cardHtml(r);
    if(old && animate && !nbReduced()){
      old.classList.add('cfm-out'); setTimeout(()=>{ if(old.parentNode) old.remove(); },320);
      el.classList.add('cfm-in'); stage.appendChild(el);
    } else { stage.innerHTML=''; stage.appendChild(el); }
  }
  function pick(avoid, animate){
    const r=chooseForMe(all,now,avoid);
    if(!r){ emptyShell(); return; }
    if(!node.querySelector('#cfm-stage')) shell();
    setCard(r, animate);
  }
  node.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.close){closeModal();return;}
    if(b.dataset.more){pick(cur?cur.id:UI.lastChosenId, true);return;}
    if(b.dataset.open){ if(cur){closeModal();go({kind:'detail',id:cur.id});} return;}
    if(b.dataset.star){ if(cur){const r=cur;setNextUp(r.id);closeModal();snackbar(r.name+' עכשיו הבא בתור');render();} return;}
  });
  pick(UI.lastChosenId, false);
  openModal(node,false);
}

/* ---- Visit sheet ---- */
function openVisit(id){
  const r=getR(id); if(!r) return;
  const node=document.createElement('div');
  const today=new Date().toISOString().slice(0,10);
  const reactions=[['great','😍','מעולה'],['good','🙂','טוב'],['okay','😐','סביר'],['notAgain','🙅','לא שוב']];
  let reaction=null;
  node.innerHTML='<div class="grip"></div><h2 class="title">סימון ביקור · '+esc(r.name)+'</h2><div style="padding:14px 20px">'
    +'<label class="field"><span>תאריך</span><input class="inp" type="date" id="v-date" value="'+today+'"></label>'
    +'<div class="field"><span>איך היה?</span><div class="seg" id="v-react">'+reactions.map(x=>'<button type="button" data-r="'+x[0]+'" style="flex-direction:column;gap:2px"><span style="font-size:22px">'+x[1]+'</span><span style="font-size:12px">'+x[2]+'</span></button>').join('')+'</div></div>'
    +'<label class="field"><span>מה כדאי להזמין שוב</span><input class="inp" id="v-liked" placeholder="המנה שאהבת"></label>'
    +'<label class="field"><span>הערה</span><textarea class="inp" id="v-notes"></textarea></label>'
    +'</div><div class="sheetfoot"><button class="btn btn-soft flex1 tap" data-save="1">שמור ביקור</button></div>';
  node.querySelector('#v-react').addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    reaction = reaction===b.dataset.r? null : b.dataset.r;
    [...node.querySelectorAll('#v-react button')].forEach(x=>x.classList.toggle('on',x.dataset.r===reaction));
  });
  node.querySelector('[data-save]').onclick=()=>{
    const date=node.querySelector('#v-date').value||today;
    r.visits=r.visits||[];
    r.visits.push({date:new Date(date).toISOString(),reaction:reaction||undefined,liked:node.querySelector('#v-liked').value.trim()||undefined,notes:node.querySelector('#v-notes').value.trim()||undefined});
    r.visitStatus='visited'; r.visitCount=(r.visitCount||0)+1; r.lastVisitedAt=new Date(date).toISOString();
    if(reaction) r.personalReaction=reaction; r.nextUp=false;
    upsert(r); closeModal(); snackbar('סומן שביקרת ב־'+r.name); render();
  };
  openModal(node,false);
}

/* ---- Delete ---- */
function openDelete(id){
  const r=getR(id); if(!r) return;
  const node=document.createElement('div'); const v=cuisineVisual(r);
  node.innerHTML='<div class="grip"></div><h2 class="title">להסיר מהרשימה?</h2><div style="padding:14px 20px">'
    +'<div style="display:flex;gap:12px;align-items:center;background:var(--soft);border-radius:var(--r-card);padding:12px">'
    +'<div class="thumb" style="width:56px;height:56px;font-size:24px;background:'+v.grad+'">'+v.emoji+'</div>'
    +'<div style="min-width:0"><b>'+esc(r.name)+'</b><div class="meta">'+esc(metaLine(r))+'</div></div></div>'
    +'<p class="meta" style="margin-top:12px">אפשר יהיה לשחזר מיד לאחר ההסרה.</p></div>'
    +'<div class="sheetfoot"><button class="btn btn-outline flex1 tap" data-cancel="1">ביטול</button><button class="btn btn-danger flex1 tap" data-del="1">הסר</button></div>';
  node.querySelector('[data-cancel]').onclick=closeModal;
  node.querySelector('[data-del]').onclick=()=>{
    r.deleted=true; const wasNext=r.nextUp; r.nextUp=false; persist();
    closeModal(); go({kind:'home'});
    // Defer the server delete until the undo window passes, so "ביטול" is instant and lossless.
    const delId=r.id;
    if(isServerId(delId)){
      const h=setTimeout(()=>{
        pendingDelete.delete(delId);
        // remove locally + on server once the user did NOT undo
        const idx=DATA.restaurants.findIndex(x=>String(x.id)===String(delId));
        if(idx>=0 && DATA.restaurants[idx].deleted){ DATA.restaurants.splice(idx,1); persist(); }
        api.remove(delId).catch(e=>console.warn('delete sync failed:', e && e.message));
      },6200);
      pendingDelete.set(delId,h);
    }
    snackbar(r.name+' הוסר','ביטול',()=>{
      r.deleted=false; if(wasNext && !liveList().some(x=>x.nextUp)) r.nextUp=true; persist();
      const h=pendingDelete.get(delId); if(h){ clearTimeout(h); pendingDelete.delete(delId); }
      syncUpsert(r);   // make sure server reflects the restored state
      render();
    },6000);
  };
  openModal(node,false);
}

/* ---- Add / Edit ---- */
function openAddEdit(mode, id, prefill){
  const editing = mode==='edit'? getR(id) : null;
  const pf = (prefill && typeof prefill==='object') ? prefill : null;
  const prefillName = (typeof prefill==='string') ? prefill : (pf ? pf.name : '');
  const node=document.createElement('div');
  const src = editing || pf || {};
  // local HH draft
  let hh = (editing? (editing.happyHours||[]) : (pf? (pf.happyHours||[]) : [])).map(x=>Object.assign({},x,{days:(x.days||[]).slice()}));
  const d = src;
  function val(k){return d[k]!=null?d[k]:'';}
  let price = src.priceLevel || null;
  let visited = src.visitStatus==='visited';
  let nextUp = !!src.nextUp;

  function drawHH(){
    const box=node.querySelector('#hh-list'); if(!box) return;
    box.innerHTML = hh.map((ru,i)=>'<div class="hhrow" data-i="'+i+'">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="display:flex;gap:4px;flex-wrap:wrap">'
      +DAYS.map((dd,di)=>'<button type="button" class="daychip '+(ru.days.includes(di)?'on':'')+'" data-day="'+di+'">'+dd+'</button>').join('')
      +'</div><button type="button" class="tap danger" data-rm="'+i+'">'+uic('ic-trash',18)+'</button></div>'
      +'<button type="button" class="tap" data-week="1" style="font-size:12.5px;font-weight:700;color:var(--primary);margin-bottom:8px">א׳–ה׳</button>'
      +'<div style="display:flex;gap:8px"><input class="inp" data-f="start" type="time" value="'+esc(ru.start)+'" style="min-height:44px">'
      +'<input class="inp" data-f="end" type="time" value="'+esc(ru.end)+'" style="min-height:44px"></div>'
      +'<input class="inp" data-f="offer" placeholder="מה מקבלים? (50% על קוקטיילים)" value="'+esc(ru.offer||'')+'" style="min-height:44px;margin-top:8px">'
      +'</div>').join('');
  }
  node.innerHTML='<div class="af-head"><div class="row"><div><h2 class="af-title">'+(editing?'עריכת מקום':'הוספת מקום')+'</h2><p class="af-sub">'+(editing?'עדכון פרטי המקום':'מוסיפים מקום חדש לרשימה שלך')+'</p></div>'
    +'<button class="af-x tap" data-close="1" aria-label="סגור">✕</button></div>'
    +(editing?'<div style="height:16px"></div>':'<button type="button" id="f-aiimport" class="af-ai tap"><span class="rb">'+uic('ic-robot',26)+'</span><span class="txt"><b>'+uic('ic-star',14)+' ייבוא חכם — הדבק פרטים שהוכנו ע״י AI</b><small>מדביקים טקסט, ואנחנו ממלאים בשבילך</small></span><span class="chev">›</span></button>')
    +'</div>'
    +'<div class="af-body">'
    +'<div class="af-field"><span>שם המסעדה *</span><div class="af-inp"><input id="f-name" placeholder="לדוגמה: Taizu" value="'+esc(prefillName||val('name'))+'"><span class="ib">'+uic('ic-shop',22)+'</span></div></div>'
    +'<p id="f-err" style="color:var(--destructive);font-size:13px;margin:-10px 0 12px;display:none"></p>'
    +'<div class="af-field"><span>סוג מטבח</span><button type="button" class="af-inp af-select" id="f-cuisine-field"><span class="af-selval" id="f-cuisine-val"></span><span class="af-chev">›</span><span class="ib">'+uic('ic-cuisinebowl',22)+'</span></button><input type="hidden" id="f-cuisines"></div>'
    +'<div class="af-field af-theme"><span>תמונת נושא</span><div id="f-theme"></div><input type="hidden" id="f-themekey"></div>'
    +'<div class="af-grid">'
      +'<div class="af-field"><span>עיר</span><div class="af-inp"><input id="f-city" placeholder="תל אביב" value="'+esc(val('city'))+'"><span class="ib">'+uic('ic-building',20)+'</span></div></div>'
      +'<div class="af-field"><span>אזור</span><div class="af-inp"><input id="f-area" placeholder="פלורנטין" value="'+esc(val('area'))+'"><span class="ib">'+uic('ic-pin',20)+'</span></div></div></div>'
    +'<div class="af-field"><span>כתובת</span><div class="af-inp"><input id="f-address" placeholder="הקלד כתובת מלאה" value="'+esc(val('address'))+'"><span class="ib">'+uic('ic-map',20)+'</span></div></div>'
    +'<div class="af-field"><span>מחיר</span><div class="af-price" id="f-price">'+[1,2,3,4].map(p=>'<button type="button" data-p="'+p+'" class="'+(price===p?'on':'')+'"><span class="p">'+priceStr(p)+'</span>'+uic('ic-coin'+p,24)+'</button>').join('')+'</div></div>'
    +'<div class="af-field"><div class="af-status" id="f-status"><button type="button" data-s="0" class="'+(!visited?'on':'')+'">'+uic('ic-notvisited',30)+'עוד לא הייתי</button><button type="button" data-s="1" class="'+(visited?'on':'')+'">'+uic('ic-visited',30)+'כבר הייתי</button></div></div>'
    +'<label class="af-next"><span class="sbox">'+uic('ic-star2',24)+'</span><span class="txt"><b>הבא בתור</b><small>סמן אם זה המקום הבא שתרצה לבקר בו</small></span><input type="checkbox" id="f-next" class="af-check" '+(nextUp?'checked':'')+'><span class="af-toggle"></span></label>'
    +'<div class="af-field"><span>מתאים ל</span><div class="af-help">אפשר לבחור כמה</div><div class="af-tags" id="f-occ-tags"></div><input type="hidden" id="f-occ"></div>'
    +'<button type="button" class="disclosure tap" id="f-more-btn"><span class="disc-arrow">▾</span> <span class="disc-txt">הוסף עוד פרטים</span></button>'
    +'<div id="f-more" class="af-collapse"><div class="af-collapse-inner">'
      +'<label class="field"><span>תגיות</span><input class="inp" id="f-tags" value="'+esc((d.tags||[]).join(', '))+'"></label>'
      +'<label class="field"><span>מנות שרוצה לנסות</span><input class="inp" id="f-dishes" value="'+esc((d.dishesToTry||[]).join(', '))+'"></label>'
      +'<label class="field"><span>למה שמרתי</span><textarea class="inp" id="f-why">'+esc(val('whySaved'))+'</textarea></label>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +afLinkField('טלפון','f-phone',val('phone'),'phone','inputmode="tel"')
        +afLinkField('אתר','f-web',val('website'),'website','inputmode="url"')+'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
        +afLinkField('תפריט','f-menu',val('menuUrl'),'menu','inputmode="url"')
        +afLinkField('הזמנת שולחן','f-book',val('bookingUrl'),'reservation','inputmode="url"')+'</div>'
      +afLinkField('קישור למשלוח','f-delivery',val('deliveryUrl'),'delivery','inputmode="url" placeholder="https://wolt.com/..."')
      +afLinkField('קישור Google Maps','f-map',val('mapUrl'),'maps','inputmode="url"')
      +'<label class="field"><span>תמונות נוספות (קישור בכל שורה)</span><textarea class="inp" id="f-image" inputmode="url" style="min-height:70px" placeholder="https://…&#10;התמונה הראשית תמיד נקבעת לפי סוג המטבח">'+esc((Array.isArray(d.images)&&d.images.length?d.images:(d.image?[d.image]:[])).join('\n'))+'</textarea></label>'
      +'<div class="field"><span>Happy Hour</span><div id="hh-list"></div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="chip on tap" id="hh-add">+ הוסף טווח</button>'
        +'<button type="button" class="chip off tap" id="hh-paste">📋 הדבק טקסט</button></div>'
        +'<div id="hh-paste-box" style="display:none;margin-top:10px"><textarea class="inp" id="hh-paste-text" placeholder="א׳–ה׳ 17:00-19:00, 50% על קוקטיילים"></textarea><button type="button" class="btn btn-soft tap" id="hh-paste-apply" style="margin-top:8px">נתח והוסף</button></div>'
      +'</div>'
      +'<label class="field"><span>הערה אישית</span><textarea class="inp" id="f-notes">'+esc(val('notes'))+'</textarea></label>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'<div class="sheetfoot"><button class="btn btn-primary full tap" id="f-save">'+(editing?'שמור שינויים':'שמור מקום')+'</button></div>';

  // interactions
  node.querySelector('[data-close]').onclick=closeModal;
  // cuisine multi-select (keeps hidden #f-cuisines in sync for the unchanged save logic)
  let selCuisines = Array.isArray(d.cuisines)? d.cuisines.slice() : splitList(d.cuisines);
  const cfHidden=node.querySelector('#f-cuisines');
  // ---- Dish theme image picker (tap preview → animated strip; pick to override the cuisine cover) ----
  // Declared before paintCuisine() runs, since paintCuisine refreshes the theme preview.
  let selTheme = (d.themeKey && KNOWN_IMG_KEYS.includes(d.themeKey)) ? d.themeKey : null; // null = auto-by-cuisine
  let themeOpen = false;
  const themeBox = node.querySelector('#f-theme');
  const themeHidden = node.querySelector('#f-themekey');
  function themeAutoKey(){ return cuisineImageKey(selCuisines); } // may be null when no cuisine chosen
  function themeTile(key){ // markup for a filled/emoji preview swatch
    if(key) return '<i class="imgfill cover banner-'+key+'"></i>';
    return '<span class="af-theme-emoji">🍽️</span>';
  }
  function paintTheme(){
    if(!themeBox) return;
    const autoKey = themeAutoKey();
    const effKey = selTheme || autoKey;            // what the cover will actually show
    const isAuto = !selTheme;
    const label = selTheme ? themeLabel(selTheme) : (autoKey ? (themeLabel(autoKey)+' · אוטומטי') : 'אוטומטי · לפי סוג המטבח');
    const strip = THEME_IMAGES.map((t,i)=>
      '<button type="button" class="af-theme-item'+(selTheme===t.key?' on':'')+'" data-theme="'+t.key+'" style="animation-delay:'+(i*22)+'ms">'
      +'<i class="imgfill cover banner-'+t.key+'"></i><span class="tick">✓</span><span class="lbl">'+esc(t.label)+'</span></button>'
    ).join('')
    + '<button type="button" class="af-theme-auto'+(isAuto?' on':'')+'" data-theme="__auto">'+uic('ic-star',14)+' אוטומטי — לפי סוג המטבח</button>';
    themeBox.innerHTML =
      '<div class="af-theme-row">'
        +'<div class="af-theme-preview'+(themeOpen?' open':'')+'" id="f-theme-preview" role="button" aria-label="בחירת תמונת נושא">'+themeTile(effKey)+'<span class="af-theme-edit">'+(themeOpen?'▴':'✎')+'</span></div>'
        +'<div class="af-theme-meta"><b>תמונת נושא למקום</b><small>נלחצים על התמונה כדי לבחור מתוך המנות</small><span class="cur">'+esc(label)+'</span></div>'
      +'</div>'
      +'<div class="af-theme-grid'+(themeOpen?' open':'')+'" id="f-theme-grid"><div class="af-theme-grid-inner"><div class="af-theme-strip">'+strip+'</div></div></div>';
    themeHidden.value = selTheme || '';
  }
  if(themeBox){
    themeBox.addEventListener('click',e=>{
      const prev=e.target.closest('#f-theme-preview');
      if(prev){ themeOpen=!themeOpen; paintTheme(); return; }
      const pick=e.target.closest('[data-theme]');
      if(pick){
        const k=pick.dataset.theme;
        selTheme = (k==='__auto') ? null : k;
        themeOpen=false;            // collapse after choosing, so the new cover is front-and-center
        paintTheme();
      }
    });
  }
  function paintCuisine(){ cfHidden.value=selCuisines.join(', '); node.querySelector('#f-cuisine-val').innerHTML=cuisineValHtml(selCuisines); paintTheme(); }
  paintCuisine();
  node.querySelector('#f-cuisine-field').onclick=()=>openCuisinePicker(selCuisines,(res)=>{ selCuisines=res; paintCuisine(); });
  // "מתאים ל" tags (backward-compatible: reads array or old comma string, writes hidden #f-occ)
  let selOcc = Array.isArray(d.occasions)? d.occasions.slice() : splitList(d.occasions);
  let occExpanded=false;
  function paintOcc(){
    const box=node.querySelector('#f-occ-tags'); if(!box) return;
    const predef=SUIT_TAGS.map(t=>({emoji:t[0],label:t[1]}));
    const predefN=predef.map(p=>normalize(p.label));
    const customs=selOcc.filter(o=>!predefN.includes(normalize(o))).map(o=>({emoji:'🏷️',label:o}));
    const list=[...predef,...customs];
    const shown= occExpanded? list : list.filter((t,i)=> i<10 || selOcc.some(o=>normalize(o)===normalize(t.label)));
    let html=shown.map(t=>{const on=selOcc.some(o=>normalize(o)===normalize(t.label));return '<button type="button" class="af-tag '+(on?'on':'')+'" data-occ="'+esc(t.label)+'">'+(on?'<span class="ck">✓</span>':'')+t.emoji+' '+esc(t.label)+'</button>';}).join('');
    if(!occExpanded && list.length>shown.length) html+='<button type="button" class="af-tag" data-more="1">+ עוד</button>';
    box.innerHTML=html;
    node.querySelector('#f-occ').value=selOcc.join(', ');
  }
  paintOcc();
  node.querySelector('#f-occ-tags').addEventListener('click',e=>{
    if(e.target.closest('[data-more]')){occExpanded=true;paintOcc();return;}
    const t=e.target.closest('[data-occ]'); if(!t) return; const label=t.dataset.occ;
    const i=selOcc.findIndex(o=>normalize(o)===normalize(label)); if(i>=0)selOcc.splice(i,1); else selOcc.push(label);
    paintOcc();
  });
  node.querySelector('#f-price').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=+b.dataset.p;price=(price===p?null:p);[...node.querySelectorAll('#f-price button')].forEach(x=>x.classList.toggle('on',+x.dataset.p===price));});
  node.querySelector('#f-status').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;visited=b.dataset.s==='1';[...node.querySelectorAll('#f-status button')].forEach(x=>x.classList.toggle('on',(x.dataset.s==='1')===visited));});
  node.querySelector('#f-more-btn').onclick=function(){
    const m=node.querySelector('#f-more');
    const open=!m.classList.contains('open');
    m.classList.toggle('open',open);
    this.classList.toggle('open',open);
    const t=this.querySelector('.disc-txt'); if(t) t.textContent=open?'פחות פרטים':'הוסף עוד פרטים';
  };
  node.querySelector('#hh-add').onclick=()=>{hh.push({id:uid(),days:[0,1,2,3,4],start:'17:00',end:'19:00',offer:'',enabled:true});drawHH();};
  node.querySelector('#hh-paste').onclick=()=>{const b=node.querySelector('#hh-paste-box');b.style.display=b.style.display==='none'?'block':'none';};
  node.querySelector('#hh-paste-apply').onclick=()=>{const t=node.querySelector('#hh-paste-text').value;const p=parseHH(t);if(p){hh.push(p);node.querySelector('#hh-paste-text').value='';node.querySelector('#hh-paste-box').style.display='none';drawHH();}else{alert('לא זוהה טווח שעות בטקסט');}};
  node.querySelector('#hh-list').addEventListener('click',e=>{
    const row=e.target.closest('[data-i]'); if(!row) return; const i=+row.dataset.i;
    const day=e.target.closest('[data-day]'); if(day){const di=+day.dataset.day;const arr=hh[i].days;const j=arr.indexOf(di);if(j>=0)arr.splice(j,1);else arr.push(di);arr.sort();drawHH();return;}
    if(e.target.closest('[data-rm]')){hh.splice(i,1);drawHH();return;}
    if(e.target.closest('[data-week]')){hh[i].days=[0,1,2,3,4];drawHH();return;}
  });
  node.querySelector('#hh-list').addEventListener('input',e=>{
    const row=e.target.closest('[data-i]'); if(!row) return; const i=+row.dataset.i; const f=e.target.dataset.f; if(f) hh[i][f]=e.target.value;
  });
  drawHH();
  if(editing){ const m=node.querySelector('#f-more'); const b=node.querySelector('#f-more-btn'); m.classList.add('open'); b.classList.add('open'); const t=b.querySelector('.disc-txt'); if(t) t.textContent='פחות פרטים'; }

  node.querySelector('#f-save').onclick=()=>{
    const name=node.querySelector('#f-name').value.trim();
    if(!name){const er=node.querySelector('#f-err');er.textContent='שם המסעדה הוא שדה חובה';er.style.display='block';return;}
    // duplicate check on add
    if(!editing){
      const dup=liveList().find(r=>normalize(r.name)===normalize(name));
      if(dup){ if(!confirm('“'+name+'” כבר קיים ברשימה. להוסיף בכל זאת?')) return; }
    }
    const r = editing || {id:uid(), createdAt:nowIso(), visits:[], visitCount:0};
    if(!editing && pf){ if(pf.cravingLevel) r.cravingLevel=pf.cravingLevel; if(pf.sourceUrl) r.sourceUrl=pf.sourceUrl; if(pf.images) r.images=pf.images; if(pf.image) r.image=pf.image; }
    r.name=name;
    r.cuisines=splitList(node.querySelector('#f-cuisines').value);
    r.city=node.querySelector('#f-city').value.trim()||undefined;
    r.area=node.querySelector('#f-area').value.trim()||undefined;
    r.address=node.querySelector('#f-address').value.trim()||undefined;
    r.priceLevel=price||undefined;
    r.visitStatus=visited?'visited':'notVisited';
    r.occasions=splitList((node.querySelector('#f-occ')||{}).value);
    r.tags=splitList((node.querySelector('#f-tags')||{}).value);
    r.dishesToTry=splitList((node.querySelector('#f-dishes')||{}).value);
    r.whySaved=((node.querySelector('#f-why')||{}).value||'').trim()||undefined;
    r.phone=((node.querySelector('#f-phone')||{}).value||'').trim()||undefined;
    r.website=((node.querySelector('#f-web')||{}).value||'').trim()||undefined;
    r.menuUrl=((node.querySelector('#f-menu')||{}).value||'').trim()||undefined;
    r.deliveryUrl=((node.querySelector('#f-delivery')||{}).value||'').trim()||undefined;
    r.bookingUrl=((node.querySelector('#f-book')||{}).value||'').trim()||undefined;
    r.mapUrl=((node.querySelector('#f-map')||{}).value||'').trim()||undefined;
    r.themeKey=(function(){const k=((node.querySelector('#f-themekey')||{}).value||'').trim();return (k && KNOWN_IMG_KEYS.includes(k))?k:undefined;})();
    r.images=String((node.querySelector('#f-image')||{}).value||'').split(/[\n,]/).map(x=>x.trim()).filter(u=>/^(https?:|data:)/i.test(u)); if(!r.images.length) r.images=undefined; r.image=undefined;
    r.notes=((node.querySelector('#f-notes')||{}).value||'').trim()||undefined;
    r.happyHours=hh.filter(x=>x.days.length && x.start && x.end);
    upsert(r);
    const wantNext=node.querySelector('#f-next').checked;
    if(wantNext) setNextUp(r.id); else if(editing && editing.nextUp && !wantNext) clearNextUp(r.id);
    closeModal(); snackbar(r.name+(editing?' עודכן':' נוסף לרשימה')); render();
  };
  const aiBtn=node.querySelector('#f-aiimport'); if(aiBtn) aiBtn.onclick=()=>openImport();
  openModal(node,true);
}

/* ---- AI Smart Import (§34) ---- */
function copyToClipboard(text, okMsg){
  const done=()=>snackbar(okMsg||'הועתק');
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done,()=>fallback()); }
  else fallback();
  function fallback(){ try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();document.execCommand('copy');document.body.removeChild(ta);done();}catch(e){alert('העתקה נכשלה — אפשר להעתיק ידנית');} }
}
const AI_PLACEHOLDER='[מסעדה]\nשם:\nמטבח:\nעיר:\n\n[Happy Hour]\nימים:\nשעות:\nהטבה:\n\n[אישי]\nרוצה לנסות:\nלמה שמרתי:';

function openImport(){
  const node=document.createElement('div');
  function drawInput(){
    node.innerHTML='<div class="sheethd"><h2 style="font-size:18px;font-weight:800;margin:0">✨ ייבוא חכם</h2><button class="tap" style="color:var(--muted);font-weight:700" data-close="1">סגור</button></div>'
      +'<div style="padding:16px 16px 24px">'
      +'<p class="meta" style="margin:0 0 12px">הדבק פרטים שהוכנו עבורך על ידי AI</p>'
      +'<button type="button" class="chip off tap" id="ai-copy" style="margin-bottom:12px">📋 העתק תבנית ל־AI</button>'
      +'<textarea class="inp" id="ai-text" style="min-height:240px;font-family:monospace;direction:rtl" placeholder="'+esc(AI_PLACEHOLDER)+'"></textarea>'
      +'</div>'
      +'<div class="sheetfoot"><button class="btn btn-primary full tap" id="ai-parse" disabled>פענח פרטים</button></div>';
    const ta=node.querySelector('#ai-text'); const parse=node.querySelector('#ai-parse');
    ta.addEventListener('input',()=>{ parse.disabled=!ta.value.trim(); });
    node.querySelector('#ai-copy').onclick=()=>copyToClipboard(AI_TEMPLATE,'התבנית הועתקה — הדבק אותה ב־AI');
    parse.onclick=()=>{ const {draft,warnings}=parseImport(ta.value); drawPreview(draft,warnings); };
    node.querySelector('[data-close]').onclick=closeModal;
  }

  function drawPreview(draft, warnings){
    // nextUp conflict detection (§34.8)
    const existingNext = draft.nextUp ? liveList().find(r=>r.nextUp) : null;
    let doReplace = false; // default: keep existing (§34.8)

    const rmap={great:'😍 מעולה',good:'🙂 טוב',okay:'😐 סביר',notAgain:'🙅 לא שוב'};
    const cravLabel={high:'🔥 ממש בא לי',want:'בא לי',normal:'רגיל'};

    function render(){
      const rows=[];
      const field=(id,label,value)=> '<label class="field"><span>'+label+'</span><input class="inp" id="'+id+'" value="'+esc(value||'')+'"></label>';
      const area=(id,label,value)=> '<label class="field"><span>'+label+'</span><textarea class="inp" id="'+id+'">'+esc(value||'')+'</textarea></label>';
      // editable text fields (only if populated, name always)
      rows.push(field('p-name','שם המסעדה *', draft.name||''));
      if(draft.cuisines) rows.push(field('p-cuisines','מטבח', draft.cuisines.join(', ')));
      if(draft.city!=null||draft.area!=null) rows.push('<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+field('p-city','עיר',draft.city)+field('p-area','אזור',draft.area)+'</div>');
      if(draft.address!=null) rows.push(field('p-address','כתובת', draft.address));
      if(draft.dishesToTry) rows.push(field('p-dishes','רוצה לנסות', draft.dishesToTry.join(', ')));
      if(draft.whySaved!=null) rows.push(area('p-why','למה שמרתי', draft.whySaved));
      if(draft.notes!=null) rows.push(area('p-notes','הערות', draft.notes));

      // read-only chips for structured values
      const chips=[];
      if(draft.visitStatus) chips.push('<span class="badge b-neutral">'+(draft.visitStatus==='visited'?'✅ כבר הייתי':'✨ עוד לא הייתי')+'</span>');
      if(draft.cravingLevel) chips.push('<span class="badge b-nextup">'+esc(cravLabel[draft.cravingLevel]||draft.cravingLevel)+'</span>');
      if(draft.priceLevel) chips.push('<span class="badge b-neutral">'+priceStr(draft.priceLevel)+'</span>');
      if(draft.nextUp) chips.push('<span class="badge b-nextup">'+uic('ic-star',13)+' הבא בתור</span>');
      (draft.occasions||[]).forEach(o=>chips.push('<span class="badge b-primary">'+esc(o)+'</span>'));
      (draft.tags||[]).forEach(t=>chips.push('<span class="badge b-neutral">'+esc(t)+'</span>'));
      let chipsHtml = chips.length? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 16px">'+chips.join('')+'</div>':'';

      // happy hour summary
      let hhHtml='';
      if(draft.happyHours&&draft.happyHours[0]){const ru=draft.happyHours[0];
        hhHtml='<div class="hhrow" style="margin-bottom:16px"><b>🍸 Happy Hour</b><div class="meta">'+ru.days.map(d=>DAYS[d]).join(' ')+' · '+esc(ru.start)+'–'+esc(ru.end)+(ru.offer?' · '+esc(ru.offer):'')+'</div></div>';}

      // links summary
      const links=[];
      if(draft.mapUrl) links.push('מפות'); if(draft.website) links.push('אתר'); if(draft.bookingUrl) links.push('הזמנה'); if(draft.menuUrl) links.push('תפריט'); if(draft.deliveryUrl) links.push('משלוח'); if(draft.sourceUrl) links.push('מקור');
      let linksHtml = links.length? '<p class="meta" style="margin:0 0 16px">🔗 נשמרו קישורים: '+links.join(' · ')+'</p>':'';

      // warnings (§34.11)
      let warnHtml='';
      if(warnings.filter(w=>!/חובה/.test(w)).length){
        warnHtml='<div style="background:var(--cream);border:1px solid #F0DFC0;border-radius:var(--r-input);padding:12px;margin-bottom:16px">'
          +'<b style="color:var(--warning);font-size:14px">שים לב</b><ul style="margin:6px 18px 0;padding:0;font-size:13.5px;color:var(--warning)">'
          +warnings.filter(w=>!/חובה/.test(w)).map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul></div>';
      }

      // nextUp conflict (§34.8)
      let conflictHtml='';
      if(existingNext && !doReplace){
        conflictHtml='<div style="background:var(--nextup-soft);border-radius:var(--r-input);padding:12px;margin-bottom:16px">'
          +'<div style="font-size:14px;font-weight:700;color:var(--warning)">כבר יש מקום שמסומן כהבא בתור: '+esc(existingNext.name)+'</div>'
          +'<div class="meta" style="margin-top:2px">להחליף ל־'+esc(draft.name||'')+'?</div>'
          +'<div style="display:flex;gap:8px;margin-top:10px"><button type="button" class="chip on tap" id="c-replace">החלף</button><button type="button" class="chip off tap" id="c-keep">שמור בלי להחליף</button></div></div>';
      }

      const nameMissing=!draft.name;
      node.innerHTML='<div class="sheethd"><button class="tap" style="color:var(--muted);font-weight:700" data-back="1">→ חזרה</button><h2 style="font-size:18px;font-weight:800;margin:0">תצוגה מקדימה</h2><button class="tap" style="color:var(--muted);font-weight:700" data-close="1">סגור</button></div>'
        +'<div style="padding:16px 16px 24px">'+warnHtml+conflictHtml+rows.join('')+chipsHtml+hhHtml+linksHtml
        +(nameMissing?'<p style="color:var(--destructive);font-size:13px">לא זוהה שם מסעדה. הוסף שם כדי להמשיך.</p>':'')
        +'</div>'
        +'<div class="sheetfoot"><button class="btn btn-outline tap" id="p-edit">ערוך</button><button class="btn btn-primary flex1 tap" id="p-add">הוסף לרשימה</button></div>';

      node.querySelector('[data-close]').onclick=closeModal;
      node.querySelector('[data-back]').onclick=drawInput;
      const rep=node.querySelector('#c-replace'); if(rep) rep.onclick=()=>{doReplace=true;render();};
      const keep=node.querySelector('#c-keep'); if(keep) keep.onclick=()=>{doReplace=false;render();};

      function collect(){
        const g=(id)=>{const el=node.querySelector('#'+id);return el?el.value.trim():'';};
        const d=Object.assign({}, draft);
        d.name=g('p-name');
        if(node.querySelector('#p-cuisines')) d.cuisines=splitList(g('p-cuisines'));
        if(node.querySelector('#p-city')) d.city=g('p-city')||undefined;
        if(node.querySelector('#p-area')) d.area=g('p-area')||undefined;
        if(node.querySelector('#p-address')) d.address=g('p-address')||undefined;
        if(node.querySelector('#p-dishes')) d.dishesToTry=splitList(g('p-dishes'));
        if(node.querySelector('#p-why')) d.whySaved=g('p-why')||undefined;
        if(node.querySelector('#p-notes')) d.notes=g('p-notes')||undefined;
        return d;
      }

      node.querySelector('#p-edit').onclick=()=>{ const d=collect(); if(!d.name){alert('חסר שם מסעדה');return;} openAddEdit('add', null, d); };
      node.querySelector('#p-add').onclick=()=>{
        const d=collect();
        if(!d.name){ alert('חסר שם מסעדה — שדה חובה'); return; }
        const dup=liveList().find(r=>normalize(r.name)===normalize(d.name));
        if(dup){ if(!confirm('“'+d.name+'” כבר קיים ברשימה. להוסיף בכל זאת?')) return; }
        const wantNext = !!d.nextUp && (!existingNext || doReplace);
        const r={id:uid(),createdAt:nowIso(),updatedAt:nowIso(),visits:[],visitCount:0,
          name:d.name, cuisines:d.cuisines||[], city:d.city||undefined, area:d.area||undefined, address:d.address||undefined,
          mapUrl:d.mapUrl||undefined, website:d.website||undefined, bookingUrl:d.bookingUrl||undefined, menuUrl:d.menuUrl||undefined, deliveryUrl:d.deliveryUrl||undefined, phone:d.phone||undefined, sourceUrl:d.sourceUrl||undefined, images:(d.images||undefined), image:d.image||undefined,
          visitStatus:d.visitStatus||'notVisited', cravingLevel:d.cravingLevel||undefined, priceLevel:d.priceLevel||undefined,
          occasions:d.occasions||[], tags:d.tags||[], dishesToTry:d.dishesToTry||[], whySaved:d.whySaved||undefined, notes:d.notes||undefined,
          happyHours:(d.happyHours||[]), nextUp:false };
        upsert(r);
        if(wantNext) setNextUp(r.id);
        closeModal(); snackbar(r.name+' נוסף לרשימה'); go({kind:'home'});
      };
    }
    render();
  }

  drawInput();
  openModal(node,true);
}

/* ---- Hero / detail overflow menus ---- */
function heroMenu(id, anchorTop){
  if($('pop')){ closePop(); return; }
  const r=getR(id); if(!r) return;
  const pop=document.createElement('div'); pop.className='pop pop-in'; pop.id='pop';
  pop.innerHTML='<button data-act="choose">🎲 החלף (תבחר לי)</button><button class="danger" data-act="removenext" data-id="'+id+'">הסר מהבא בתור</button>';
  document.body.appendChild(pop);
  pop.style.top=(anchorTop||120)+'px';
}
function detMenu(id){
  if($('pop')){ closePop(); return; }
  const r=getR(id);
  const pop=document.createElement('div'); pop.className='pop pop-in'; pop.id='pop';
  pop.style.top='calc(var(--safe-top) + 68px)';
  pop.innerHTML='<button data-act="star" data-id="'+id+'">'+(r&&r.nextUp?(uic('ic-star',15)+' הסר מהבא בתור'):(uic('ic-star',15)+' סמן כהבא בתור'))+'</button>'
    +'<button data-act="edit" data-id="'+id+'">'+uic('ic-edit',18)+' עריכה</button>'
    +'<button data-act="share" data-id="'+id+'">'+uic('ic-share',18)+' שיתוף</button>'
    +'<button class="danger" data-act="delete" data-id="'+id+'">'+uic('ic-trash',18)+' הסרה</button>';
  document.body.appendChild(pop);
}
function removePop(){const p=$('pop'); if(p) p.remove();}
function closePop(){ const p=$('pop'); if(!p||p._closing) return; p._closing=true; if(nbReduced()){p.remove();return;} p.classList.remove('pop-in'); p.classList.add('pop-out'); setTimeout(()=>{ if(p&&p.parentNode) p.remove(); },175); }
document.addEventListener('click',e=>{ if(!e.target.closest('#pop') && !e.target.closest('[data-act="detmenu"]') && !e.target.closest('[data-act="heromenu"]')) closePop(); }, true);

/* ---- share / export / import / reset ---- */
function shareR(r){
  const text=r.name+' — '+metaLine(r);
  if(navigator.share) navigator.share({title:r.name,text}).catch(()=>{});
  else if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>snackbar('הועתק'));}
}
function exportBackup(){
  const blob=new Blob([JSON.stringify({app:'next-bite',version:1,exportedAt:nowIso(),restaurants:DATA.restaurants,settings:DATA.settings},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='next-bite-backup-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000); snackbar('קובץ הגיבוי ירד');
}
function importBackup(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json,.json';
  inp.onchange=()=>{const f=inp.files[0]; if(!f)return; const fr=new FileReader();
    fr.onload=()=>{try{const j=JSON.parse(fr.result); if(!j.restaurants) throw 0;
      const existing=new Set(DATA.restaurants.map(r=>normalize(r.name)+'|'+normalize(r.address||'')));
      let added=0;
      for(const r of j.restaurants){const k=normalize(r.name)+'|'+normalize(r.address||''); if(existing.has(k))continue; existing.add(k); DATA.restaurants.push(r); added++;}
      persist(); snackbar('יובאו '+added+' מקומות'); render();
    }catch(e){alert('הקובץ אינו גיבוי תקין');}};
    fr.readAsText(f);};
  inp.click();
}

/* ================= EVENT DELEGATION ================= */
$('root').addEventListener('input',e=>{
  if(e.target.id==='search'){
    UI.query=e.target.value; renderHome();
    const s=$('search'); if(s){ s.focus(); const L=s.value.length; try{s.setSelectionRange(L,L);}catch(_){}}
  }
});
document.body.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]'); if(!el) return;
  const act=el.dataset.act, id=el.dataset.id;
  switch(act){
    case 'settings': closePop(); go({kind:'settings'}); break;
    case 'home': closePop(); go({kind:'home'}); break;
    case 'detail': go({kind:'detail',id}); break;
    case 'add': openAddEdit('add'); break;
    case 'addq': openAddEdit('add',null,UI.query.trim()); break;
    case 'edit': closePop(); openAddEdit('edit',id); break;
    case 'delete': closePop(); openDelete(id); break;
    case 'visit': openVisit(id); break;
    case 'filter': openFilter(); break;
    case 'choose': closePop(); openChoose(); break;
    case 'clearq': UI.query=''; renderHome(); break;
    case 'clearfilters': UI.filters=emptyFilters(); nbResultsPending=true; render(); break;
    case 'cyclesort': {const order=['smart','newest','alphabetical'];DATA.settings.sortMode=order[(order.indexOf(sortMode())+1)%order.length];persist();nbResultsPending=true;render();break;}
    case 'cat': {const before=nbCatRects();const c=id;const arr=UI.filters.cuisines;const i=arr.findIndex(x=>normalize(x)===normalize(c));if(i>=0)arr.splice(i,1);else arr.push(c);nbResultsPending=true;render();nbFlipCats(before);break;}
    case 'rmfilter': {const t=el.dataset.type,v=el.dataset.id;const f=UI.filters;
      if(t==='vs')f.visitStatus=f.visitStatus.filter(x=>x!==v);
      else if(t==='c')f.cuisines=f.cuisines.filter(x=>normalize(x)!==normalize(v));
      else if(t==='occ')f.occasions=(f.occasions||[]).filter(x=>normalize(x)!==normalize(v));
      else if(t==='a')f.areas=f.areas.filter(x=>normalize(x)!==normalize(v));
      else if(t==='p')f.price=f.price.filter(x=>String(x)!==v && '₪'.repeat(x)!==v);
      else if(t==='hh')f.happyHour=false; nbResultsPending=true; render();break;}
    case 'star': {closePop();const r=getR(id);if(!r)break; if(r.nextUp){clearNextUp(id);snackbar(r.name+' הוחזרה לרשימה','ביטול',()=>{setNextUp(id);render();},6000);}else{const prev=setNextUp(id);snackbar(r.name+' עכשיו הבא בתור','ביטול',()=>{clearNextUp(id);if(prev)setNextUp(prev);render();},6000);} render();break;}
    case 'nav': {const r=getR(id);if(r)actNav(r);break;}
    case 'web': {const r=getR(id);if(r)openExternal(r.website);break;}
    case 'book': {const r=getR(id);if(r)openExternal(r.bookingUrl||r.website);break;}
    case 'menu': {const r=getR(id);if(r)openExternal(r.menuUrl);break;}
    case 'delivery': {const r=getR(id);if(r)openExternal(r.deliveryUrl);break;}
    case 'dishscroll': {const el=document.getElementById('nd-dishrow');if(el)el.scrollBy({left:-180,behavior:'smooth'});break;}
    case 'heromenu': {const rect=el.getBoundingClientRect();heroMenu(id, rect.bottom+6);break;}
    case 'detmenu': detMenu(id); break;
    case 'removenext': {const r=getR(id);if(r){clearNextUp(id);closePop();snackbar(r.name+' הוחזרה לרשימה');render();}break;}
    case 'share': {const r=getR(id);closePop();if(r)shareR(r);break;}
    case 'export': exportBackup(); break;
    case 'import': importBackup(); break;
    case 'clearsearch': DATA.settings.recentSearches=[];persist();render();snackbar('החיפושים נוקו');break;
    case 'reset': if(confirm('לאפס הכול? כל המקומות והביקורים יימחקו.')){DATA={restaurants:[],settings:{sortMode:'smart',recentSearches:[]}};persist();go({kind:'home'});snackbar('האפליקציה אופסה');}break;
  }
});

/* ================= SEED ================= */
function daysAgo(n){return new Date(Date.now()-n*86400000).toISOString();}
function seed(){
  return [
    {id:uid(), name:'Gaijin Izakaya', cuisines:['אסייתי','דגים','שף'], city:'תל אביב', area:'לב העיר', address:'לילינבלום 29, תל אביב', phone:'052-3119298', priceLevel:4, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דרינק','דייט','עם חברים','חגיגה','אווירה','ערב מיוחד'], tags:['יפני','איזקאיה','סושי','סשימי','סאקה','גריל יפני'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(1), updatedAt:daysAgo(1)},
    {id:uid(), name:'קפה טאיזו', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/cafe-taizu', cuisines:['אסייתי','שף'], city:'תל אביב', area:'מרכז העיר', address:'דרך מנחם בגין 23, תל אביב', notes:'הכתובת העדכנית: דרך מנחם בגין 23.', priceLevel:3, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','דייט','עם חברים','משפחה','אווירה'], tags:['אסייתי','יובל בן נריה','דרום מזרח אסיה'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(2), updatedAt:daysAgo(2)},
    {id:uid(), name:'Joseph \'N\' Sons', cuisines:['דגים'], city:'תל אביב', area:'כיכר רבין', address:'מלכי ישראל 10, תל אביב', phone:'03-9611141', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/joseph-n-sons', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','עם חברים','משפחה','קליל','משהו מהיר','ישיבה בחוץ'], tags:['פיש אנד צ׳יפס','סלמון בורגר','דגים','קלמרי','שרימפס'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(3), updatedAt:daysAgo(3)},
    {id:uid(), name:'Rothschild 48 Brasserie', cuisines:['שף','ים תיכוני','דגים'], city:'תל אביב', area:'לב העיר', address:'שדרות רוטשילד 48, תל אביב', phone:'03-5560011', priceLevel:4, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','דרינק','דייט','חגיגה','אווירה','ערב מיוחד'], tags:['בראסרי','R2M','רותי ברודו','מלון R48'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(4), updatedAt:daysAgo(4)},
    {id:uid(), name:'רובע א׳', cuisines:['ים תיכוני','דגים','שף'], city:'תל אביב', area:'נווה צדק', address:'יהושע התלמי 18, תל אביב', phone:'053-5500605', notes:'מסעדה כשרה חלבית ודגים.', priceLevel:3, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דייט','חגיגה','אווירה','ערב מיוחד','ישיבה בחוץ'], tags:['כשר','חלבי','דגים','אביתר מלכה','מלון אלקונין'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(5), updatedAt:daysAgo(5)},
    {id:uid(), name:'WABI Ramen', cuisines:['אסייתי'], city:'תל אביב', area:'לב העיר', address:'דה פיג׳וטו 23, תל אביב', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','עם חברים','קליל','משהו מהיר'], tags:['יפני','ראמן','אטריות בעבודת יד','דין שושני'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(6), updatedAt:daysAgo(6)},
    {id:uid(), name:'נאם', cuisines:['אסייתי'], city:'תל אביב', area:'הצפון הישן', address:'דיזנגוף 293, תל אביב', phone:'03-6708050', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/nam-dizengoff', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','דייט','עם חברים','משפחה','קליל'], tags:['תאילנדי','קארי','נודלס','פירות ים'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(7), updatedAt:daysAgo(7)},
    {id:uid(), name:'אנסטסיה', cuisines:['בית קפה'], city:'תל אביב', area:'מרכז העיר', address:'פרישמן 54, תל אביב', phone:'03-5290095', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/anastasia', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ארוחת בוקר','בראנץ׳','צהריים','ערב','דייט','קליל','רגוע'], tags:['טבעוני','בריאות','ללא סוכר לבן','ללא קמח לבן'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(8), updatedAt:daysAgo(8)},
    {id:uid(), name:'טאלי לאמה', cuisines:['אסייתי'], city:'תל אביב', area:'מרכז העיר', address:'דרך מנחם בגין 48, תל אביב', phone:'051-2608026', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/tali-lama-tlv', notes:'ישיבה במקום א׳–ה׳ 11:00-15:30.', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','קליל','משהו מהיר'], tags:['הודי','טבעוני','כשר','ללא גלוטן','תבשילים'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(9), updatedAt:daysAgo(9)},
    {id:uid(), name:'הקטן', cuisines:['שף','דגים','ישראלי'], city:'תל אביב', area:'שוק לוינסקי', address:'לוינסקי 46, תל אביב', priceLevel:3, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דרינק','דייט','עם חברים','אווירה','ישיבה בחוץ'], tags:['עידו קבלן','שוק לוינסקי','יין','אוכל ישראלי עכשווי'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(10), updatedAt:daysAgo(10)},
    {id:uid(), name:'Sachi Ramen & Sushi', cuisines:['אסייתי','דגים'], city:'תל אביב', area:'כיכר דיזנגוף', address:'דיזנגוף 98, תל אביב', phone:'054-5370076', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/sachi-sushi-tlv', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','דייט','עם חברים','קליל'], tags:['יפני','ראמן','סושי','סשימי'], dishesToTry:[], happyHours:[{id:uid(),enabled:true,days:[0,1,2,3,4],start:'12:30',end:'15:00',offer:'20% הנחה על מנות פתיחה, סושי, בירה ויין',conditions:'לא כולל ראמן; לא תקף בחגים ובאירועים מיוחדים'},{id:uid(),enabled:true,days:[0,1,2,3,4],start:'17:00',end:'20:00',offer:'20% הנחה על מנות פתיחה, סושי, בירה ויין',conditions:'לא כולל ראמן; לא תקף בחגים ובאירועים מיוחדים'}], visits:[], createdAt:daysAgo(11), updatedAt:daysAgo(11)},
    {id:uid(), name:'Thai 148', cuisines:['אסייתי'], city:'תל אביב', area:'הצפון הישן', address:'דיזנגוף 148, תל אביב', phone:'053-5430586', notes:'עסקית א׳–ד׳ 12:00-16:00 עם 15% הנחה על התפריט.', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','דרינק','דייט','עם חברים','אווירה'], tags:['תאילנדי','קוקטיילים'], dishesToTry:[], happyHours:[{id:uid(),enabled:true,days:[0,1,2,3,4,6],start:'17:00',end:'19:00',offer:'20% הנחה על האלכוהול',conditions:'לא מתקיים ביום שישי'}], visits:[], createdAt:daysAgo(12), updatedAt:daysAgo(12)},
    {id:uid(), name:'גברת קוואיטיאו', cuisines:['אסייתי'], city:'תל אביב', area:'שוק הכרמל', address:'יום טוב 2, תל אביב', phone:'053-8848618', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','קליל','משהו מהיר','ישיבה בחוץ'], tags:['תאילנדי','אוכל רחוב','קוואי טיאו','שוק הכרמל'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(13), updatedAt:daysAgo(13)},
    {id:uid(), name:'ASA Izakaya', cuisines:['אסייתי','דגים'], city:'תל אביב', area:'לב העיר', address:'אחד העם 54, תל אביב', phone:'03-3752977', priceLevel:3, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דרינק','דייט','עם חברים','חגיגה','אווירה','ערב מיוחד'], tags:['יפני','איזקאיה','אירורי','סושי','גיוזה','ראמן','אודון','טמפורה','יקיטורי'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(14), updatedAt:daysAgo(14)},
    {id:uid(), name:'Kimura-ya.J', cuisines:['אסייתי'], city:'תל אביב', area:'לב העיר', address:'מזא״ה 3, תל אביב', phone:'055-2996579', notes:'פתוח ב׳–ש׳ 18:00-00:00; הזמנה אחרונה ב-23:00.', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דייט','עם חברים','קליל','אווירה'], tags:['יפני','איזקאיה','ראמן','סושי','יקיטורי','שאבו שאבו','סוקיאקי'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(15), updatedAt:daysAgo(15)},
    {id:uid(), name:'אליבי', cuisines:['אסייתי','דגים'], city:'תל אביב', area:'מרכז העיר', address:'פרישמן 41, תל אביב', phone:'054-5784838', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/alibi-sushi-bar', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דרינק','דייט','עם חברים','אחרי עבודה','אווירה','ישיבה בחוץ'], tags:['אסייתי','סושי','קוקטיילים'], dishesToTry:[], happyHours:[{id:uid(),enabled:true,days:[0,1,2,3,4],start:'18:00',end:'20:00',offer:'20% הנחה על אוכל, 40% הנחה על שתייה',conditions:'לא חל על מנות עם טונה אדומה'}], visits:[], createdAt:daysAgo(16), updatedAt:daysAgo(16)},
    {id:uid(), name:'Saka Ba', cuisines:['אסייתי'], city:'תל אביב', area:'פלורנטין', address:'זבולון 8, תל אביב', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דרינק','דייט','עם חברים','אווירה'], tags:['יפני','סאקה','איזקאיה'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(17), updatedAt:daysAgo(17)},
    {id:uid(), name:'OBI', cuisines:['אסייתי','דגים'], city:'תל אביב', area:'לב העיר', address:'יבנה 31, תל אביב', phone:'077-8801744', priceLevel:3, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דרינק','דייט','עם חברים','אחרי עבודה','אווירה','ערב מיוחד'], tags:['יפני','איזקאיה','סאקה','גריל פחמים','מוזיקה','DJ'], dishesToTry:[], happyHours:[{id:uid(),enabled:true,days:[0,1,2,3,4],start:'18:00',end:'19:30',offer:'25% הנחה על התפריט + סאקה ללא תחתית',conditions:'סאקה ללא תחתית בהזמנת קראף'}], visits:[], createdAt:daysAgo(18), updatedAt:daysAgo(18)},
    {id:uid(), name:'Cichukai', cuisines:['אסייתי','דגים','שף'], city:'תל אביב', area:'שוק הפשפשים', address:'עמיעד 10, יפו', phone:'03-9653565', priceLevel:3, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דרינק','דייט','עם חברים','אחרי עבודה','אווירה','ערב מיוחד'], tags:['יפני','פרואני','ניקיי','אור גינסברג','קוקטיילים'], dishesToTry:[], happyHours:[{id:uid(),enabled:true,days:[1,2,3,6],start:'18:00',end:'19:00',offer:'20% הנחה על יין וקוקטיילים, 10% הנחה על התפריט והספיישלים',conditions:'לא כולל ארוחה זוגית'}], visits:[], createdAt:daysAgo(19), updatedAt:daysAgo(19)},
    {id:uid(), name:'Selas', cuisines:['אסייתי','דגים','שף'], city:'תל אביב', area:'יפו', address:'רבי תנחום 6, יפו', phone:'03-9653565', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/sales', priceLevel:3, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דרינק','דייט','עם חברים','חגיגה','אווירה','ערב מיוחד'], tags:['אור גינסברג','אסייתי','סושי','דגים','פיוז׳ן'], dishesToTry:[], happyHours:[{id:uid(),enabled:true,days:[1,2,3],start:'18:00',end:'19:00',offer:'20% הנחה על יין וקוקטיילים'},{id:uid(),enabled:true,days:[4,5,6],start:'17:00',end:'18:30',offer:'20% הנחה על יין וקוקטיילים'}], visits:[], createdAt:daysAgo(20), updatedAt:daysAgo(20)},
    {id:uid(), name:'אונמי', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/onami', cuisines:['אסייתי','דגים'], city:'תל אביב', area:'מתחם הארבעה', address:'הארבעה 18, תל אביב', priceLevel:3, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','דייט','עם חברים','משפחה'], tags:['יפני','סושי','סשימי'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(21), updatedAt:daysAgo(21)},
    {id:uid(), name:'בטשון', cuisines:['דגים'], city:'תל אביב', area:'מרכז העיר', address:'קרליבך 29, תל אביב', phone:'077-5575315', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','עם חברים','קליל','משהו מהיר','ישיבה בחוץ'], tags:['דגים','פירות ים','חנות דגים','סטריט פוד'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(22), updatedAt:daysAgo(22)},
    {id:uid(), name:'האומקאסה של עומר ניצן', cuisines:['אסייתי','דגים','שף'], visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דייט','חגיגה','ערב מיוחד'], tags:['אומקאסה','יפני'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(23), updatedAt:daysAgo(23)},
    {id:uid(), name:'UMAI', cuisines:['אסייתי','דגים','שף'], city:'תל אביב', area:'יפו', address:'עבד אל ראוף אל ביטאר 8, יפו', phone:'052-5977897', notes:'חלל אירוח אינטימי עם ערבי טעימות בהזמנה מראש.', priceLevel:4, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דייט','חגיגה','אווירה','ערב מיוחד'], tags:['יפני','קייסקי','ניקו קאפו','איזקאיה','אלכס אברמוב','ארוחת טעימות'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(24), updatedAt:daysAgo(24)},
    {id:uid(), name:'טראסו', cuisines:['אסייתי','דגים','שף'], city:'תל אביב', area:'יפו', address:'יפת 20, יפו', phone:'055-9899366', priceLevel:4, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דייט','חגיגה','אווירה','ערב מיוחד'], tags:['יפני','אומקאסה','סושי','דניאל שיף','ארוחת טעימות'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(25), updatedAt:daysAgo(25)},
    {id:uid(), name:'הגלריה של השף אורי זיסו', cuisines:['אסייתי','דגים','שף'], city:'פתח תקווה', area:'מושב רינתיה', address:'מושב רינתיה', phone:'054-6655185', notes:'אומקאסה כ-12 מנות; Pop Omakase כ-8 מנות; סיטים 18:30 ו-21:00; עד 16 סועדים.', priceLevel:4, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דייט','חגיגה','אווירה','ערב מיוחד'], tags:['יפני','איזקאיה','אומקאסה','ארוחת טעימות','אורי זיסו'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(26), updatedAt:daysAgo(26)},
    {id:uid(), name:'NOEMA', cuisines:['ים תיכוני','דגים','שף'], city:'תל אביב', area:'נחלת בנימין', address:'נחלת בנימין 59, תל אביב-יפו', phone:'077-9386186', menuUrl:'https://ontopo.com/he/il/page/15172114', bookingUrl:'https://ontopo.com/he/il/page/15172114', notes:'בסופי שבוע מוגש בראנץ׳ (שישי ושבת 12:00-17:00).', priceLevel:3, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דרינק','דייט','עם חברים','חגיגה','אווירה','ערב מיוחד'], tags:['בר אוכל','קוקטיילים','מטבח מקומי','דרך המשי','דגים','פסטות','מושיקו אברהם'], dishesToTry:[], happyHours:[{id:uid(),enabled:true,days:[0,1,2,3,4],start:'18:00',end:'20:00',offer:'20% הנחה על האוכל, 30% הנחה על האלכוהול'}], visits:[], createdAt:daysAgo(0), updatedAt:daysAgo(0)},
    {id:uid(), name:'TYO', cuisines:['אסייתי','דגים','שף'], city:'תל אביב', area:'נווה צדק', address:'שבזי 58, תל אביב-יפו', phone:'03-9300333', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/tyo', website:'https://tyo.co.il/', menuUrl:'https://tyo.co.il/tyo-%D7%AA%D7%A4%D7%A8%D7%99%D7%98-%D7%A2%D7%A8%D7%91/', bookingUrl:'https://ontopo.com/he/il/page/tyo', notes:'א׳–ד׳ 12:00-16:00 גם הטבת צהריים של 15% הנחה על התפריט.', priceLevel:4, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','דרינק','דייט','עם חברים','חגיגה','אווירה','ערב מיוחד'], tags:['יפני','סושי','סשימי','סאקה','יאמה סאן','לא כשר'], dishesToTry:[], happyHours:[{id:uid(),enabled:true,days:[0,1,2,3],start:'16:00',end:'19:00',offer:'25% הנחה על כל תפריט האוכל והאלכוהול'}], visits:[], createdAt:daysAgo(0), updatedAt:daysAgo(0)},
    {id:uid(), name:'פופינה', cuisines:['דגים','שף'], city:'תל אביב', area:'נווה צדק', address:'אחד העם 3, תל אביב-יפו', phone:'03-5757477', website:'https://www.popina.co.il/', menuUrl:'https://www.popina.co.il/menus-1', bookingUrl:'https://ontopo.com/he/il/page/popina', notes:'ארוחת טעימות 6 מנות ב-430 ₪; התאמת 5 כוסות אלכוהול ב-215 ₪.', priceLevel:4, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ערב','דרינק','דייט','עם חברים','חגיגה','אווירה','ערב מיוחד','ישיבה בחוץ'], tags:['אוראל קמחי','מסעדת שף','ארוחת טעימות','דגים','פירות ים','קוקטיילים','לא כשר'], dishesToTry:['ארוחת טעימות','סשימי טונה','טליוליני שרימפס','פילה דג צלוי'], happyHours:[], visits:[], createdAt:daysAgo(0), updatedAt:daysAgo(0)},
    {id:uid(), name:'Brasserie 18', cuisines:['איטלקי','ים תיכוני','דגים'], city:'תל אביב', area:'לבונטין', address:'לבונטין 19, תל אביב-יפו', phone:'03-5472548', deliveryUrl:'https://orders.beecommcloud.com/#/sites/p-0/655eeb12d541bee19f59e443', notes:'בראסרי כשרה חלבית. שעות: א׳–ה׳ בראנץ׳ 09:30-13:00, צהריים 13:00-16:00, ערב 17:00-22:00; שישי בראנץ׳ 09:00-15:00; שבת סגור.', sourceUrl:'https://brasstlv.co.il/', website:'https://brasstlv.co.il/', bookingUrl:'https://brasstlv.co.il/', menuUrl:'https://brasstlv.co.il/menu/', priceLevel:3, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ארוחת בוקר','בראנץ׳','צהריים','ערב','דרינק','דייט','עם חברים','אחרי עבודה','חגיגה','רגוע','אווירה','ערב מיוחד','ישיבה בחוץ'], tags:['כשר','חלבי','בראסרי','צרפתי','אירופאי','דגים','יין'], dishesToTry:[], happyHours:[{id:uid(),enabled:true,days:[0,1,2,3,4],start:'17:00',end:'19:00',offer:'30% הנחה'}], visits:[], createdAt:daysAgo(0), updatedAt:daysAgo(0)},
    {id:uid(), name:'מתחת לעץ', cuisines:['בית קפה','ישראלי'], city:'תל אביב', area:'הצפון הישן', address:'בן יהודה 202, תל אביב', phone:'03-6359033', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/under-the-tree', notes:'הסניף המקורי בבן יהודה 202; קיים גם סניף בלבונטין 13. פעיל לאורך רוב שעות היממה.', sourceUrl:'https://www.hashulchan.co.il/restaurant/%D7%9E%D7%AA%D7%97%D7%AA-%D7%9C%D7%A2%D7%A5/', website:'https://underthetree.co.il/', menuUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/under-the-tree', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['ארוחת בוקר','בראנץ׳','צהריים','ערב','עם חברים','משפחה','קליל','רגוע','משהו מהיר','ישיבה בחוץ'], tags:['בית קפה שכונתי','טבעוני','ללא גלוטן','ארוחות בוקר','כריכים','סלטים','בולים'], dishesToTry:[], happyHours:[], visits:[], createdAt:daysAgo(0), updatedAt:daysAgo(0)},
    {id:uid(), name:'הכרמל 40', cuisines:['דגים'], city:'תל אביב', area:'שוק הכרמל', address:'הכרמל 40, תל אביב-יפו', phone:'054-489-8022', mapUrl:'https://www.waze.com/live-map/directions/il/tel-aviv-district/tel-aviv-yafo/%D7%94%D7%9B%D7%A8%D7%9E%D7%9C-40-hacarmel?to=place.ChIJU1A3LyxNHRURbxIdXiNg3H8', website:'https://www.facebook.com/hacarmel40', sourceUrl:'https://timeout.co.il/%D7%94%D7%9B%D7%A8%D7%9E%D7%9C-40/', notes:'המקום עובד בשיתוף עם חנות הדגים דגי רוסתום בשוק הכרמל. מנת הדגל היא "כריך דייגים" — כריך דג בסגנון באליק אקמק, עם דג טרי בלחם; ביקורות עדכניות מזכירות בין היתר גרסה עם פילה לברק, לחם/פרנה קלוי וחריף. בנוסף מופיעים סביצ׳ה אינטיאס ומנגו ומנות דגים ופירות ים מטוגנים. שעות פעילות שמופיעות כיום: א׳–ה׳ 11:00-17:30, ו׳ 10:00-17:00, שבת סגור.', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','עם חברים','קליל','משהו מהיר','ישיבה בחוץ'], tags:['כריך דייגים','סנדוויץ דג','דגים טריים','לברק','אינטיאס','מנגו','שוק הכרמל','דגי רוסתום','אלעד אמיתי'], dishesToTry:['כריך דייגים','סביצ׳ה אינטיאס ומנגו'], happyHours:[], visits:[], createdAt:daysAgo(0), updatedAt:daysAgo(0)},
    {id:uid(), name:'Grinberg Burger', cuisines:['בורגר','דגים'], city:'תל אביב', area:'לב העיר', address:'שינקין 22, תל אביב', phone:'073-3277294', deliveryUrl:'https://wolt.com/he/isr/tel-aviv/restaurant/grinberg-burger-sheinkin', website:'https://www.grinbergburger.co.il/lp/gb', bookingUrl:'https://www.grinbergburger.co.il/lp/gb', menuUrl:'https://www.grinbergburger.co.il/warehouse/dynamic/466853.pdf', sourceUrl:'https://13tv.co.il/item/yummies/food-news/fo37g-904486793/', notes:'מנת הדג נקראת GRIN-FISH: דג ים פריך, רוטב טרטר טרגון, לימון וגבינת צ׳דר בלחמנייה. בתפריט הרשמי המחיר למנה הוא 64 ₪; ארוחת GRIN FISH ב-Wolt כוללת את כריך הדג, צ׳יפס עם כוסברה, שום ופטרוזיליה ושתייה ב-86 ₪. הסניף בשינקין פתוח לפי האתר הרשמי 12:00-22:30. למקום יש גם סניף בצפון תל אביב, גרינברג 25. לא נמצא Happy Hour קבוע ומאומת.', priceLevel:2, visitStatus:'notVisited', visitCount:0, nextUp:false, occasions:['צהריים','ערב','עם חברים','משפחה','קליל','משהו מהיר'], tags:['פיש בורגר','שניצל דג','GRIN-FISH','דג ים','טרטר טרגון','צ׳דר','לימון','המבורגר','אורי עשת'], dishesToTry:['GRIN-FISH'], happyHours:[], visits:[], createdAt:daysAgo(0), updatedAt:daysAgo(0)}
  ];
}

/* ================= INIT ================= */
render();          // paint immediately from local cache (instant)
bootstrap();       // then load the real data from the D1-backed API and re-render
})();