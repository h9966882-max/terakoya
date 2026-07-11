/* ===== 共通レンダリングエンジン（Victorian書斎版） ===== */

let doneMap = {};
let openWeek = null; // 現在展開中の週番号（1つだけ）
let currentView = "list";
let currentPhaseFilter = "all";

/* 科目キーの請求記号プレフィックス（3〜4文字） */
const CALLNO_PREFIX = {
  philosophy:"PHIL", semantics:"SEM", cogsci:"COG", behavior:"BEHV", game:"GAME", strategy:"STRT"
};

function subjectTotal(s){ return s.phases.reduce((a,p)=>a+p.weeks.length,0); }
function subjectDone(s){ return s.phases.reduce((a,p)=>a+p.weeks.filter(w=>doneMap[s.key+':'+w[0]]).length,0); }

function formatNoteText(text){
  if(!text) return "";
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/* 講義ノートは notes/科目キー/週番号(2桁).txt を都度fetchして読み込む。
   ファイルが無ければ「未登録」と表示するだけなので、
   ノートを増やすときはこのファイル(render.js)を一切編集しなくてよい。 */
const noteCache = {};
async function fetchNoteText(subjKey, weekNum){
  const cacheKey = subjKey+':'+weekNum;
  if(noteCache[cacheKey] !== undefined) return noteCache[cacheKey];
  const path = `notes/${subjKey}/${String(weekNum).padStart(2,'0')}.txt`;
  try{
    const res = await fetch(path);
    if(!res.ok){ noteCache[cacheKey] = null; return null; }
    const text = await res.text();
    noteCache[cacheKey] = text;
    return text;
  }catch(e){
    noteCache[cacheKey] = null;
    return null;
  }
}

function renderExpandPanel(subj, w){
  const [n,title,def,struct,rule,obs,intervene,fail] = w;
  const id = subj.key+':'+n;
  const prefix = CALLNO_PREFIX[subj.key] || subj.key.toUpperCase();
  return `<div class="expand-panel">
    <span class="callno">${prefix} · W${String(n).padStart(2,'0')}</span>
    <h3>${title}</h3>
    <div class="e-field"><div class="e-fl">① 定義</div><div class="e-fv">${def}</div></div>
    <div class="e-field"><div class="e-fl">② 構造</div><div class="e-fv">${struct.join(' ／ ')}</div></div>
    <div class="e-field"><div class="e-fl">③ 意思決定ルール</div><div class="e-fv">${rule}</div></div>
    <div class="e-field"><div class="e-fl">④ 観測ポイント</div><div class="e-fv">${obs}</div></div>
    <div class="e-field"><div class="e-fl">⑤ 介入</div><div class="e-fv">${intervene}</div></div>
    <div class="e-field"><div class="e-fl">⑥ 失敗パターン</div><div class="e-fv">${fail}</div></div>
    <div class="note-section">
      <div class="note-toggle" data-note="${id}" data-week="${n}" data-subj="${subj.key}">❧ 講義ノートを見る</div>
      <div class="note-body" id="note-${id.replace(':','-')}"></div>
    </div>
  </div>`;
}

function renderCatalogCard(subj, w){
  const [n,title] = w;
  const id = subj.key+':'+n;
  const isDone = !!doneMap[id];
  const prefix = CALLNO_PREFIX[subj.key] || subj.key.toUpperCase();
  return `<div class="catalog-card ${isDone?'done':''}" data-open="${id}">
    <div class="check ${isDone?'done':''}" data-check="${id}">${isDone?'✓':''}</div>
    <div class="callno">${prefix} · W${String(n).padStart(2,'0')}</div>
    <div class="catalog-title">${title}</div>
  </div>`;
}

function bindGridEvents(container, onChange){
  container.querySelectorAll('[data-open]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.dataset.open;
      openWeek = (openWeek === id) ? null : id;
      onChange();
    });
  });
  container.querySelectorAll('[data-check]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id = el.dataset.check;
      doneMap[id] = !doneMap[id];
      saveProgressMap(doneMap);
      onChange();
    });
  });
  container.querySelectorAll('[data-note]').forEach(el=>{
    el.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const id = el.dataset.note;
      const body = document.getElementById('note-'+id.replace(':','-'));
      if(!body) return;
      const isOpen = body.classList.contains('open');
      if(isOpen){
        body.classList.remove('open');
        el.innerHTML = '❧ 講義ノートを見る';
        return;
      }
      if(body.dataset.loaded !== 'true'){
        el.innerHTML = '❧ 読み込み中…';
        const text = await fetchNoteText(el.dataset.subj, Number(el.dataset.week));
        body.innerHTML = text ? formatNoteText(text) : '<span style="opacity:.6">講義ノート未登録</span>';
        body.dataset.loaded = 'true';
      }
      body.classList.add('open');
      el.innerHTML = '❧ 閉じる';
    });
  });
}

function renderPhaseFilter(container, subj, onChange){
  let html = `<div class="pf ${currentPhaseFilter==='all'?'active':''}" data-p="all">全フェーズ</div>`;
  html += subj.phases.map((p,i)=>`<div class="pf ${currentPhaseFilter===i?'active':''}" data-p="${i}">${p.title.replace(/^Phase\d+\s/,'')}</div>`).join('');
  container.innerHTML = html;
  container.querySelectorAll('.pf').forEach(el=>{
    el.addEventListener('click', ()=>{
      currentPhaseFilter = el.dataset.p === 'all' ? 'all' : Number(el.dataset.p);
      onChange();
    });
  });
}

function renderProgressBar(container, subj){
  const total = subjectTotal(subj);
  const done = subjectDone(subj);
  container.innerHTML = `
    <div class="progress-track"><div class="progress-fill" style="width:${total?done/total*100:0}%"></div></div>
    <div class="progress-label">${subj.name} — ${done} / ${total} 週 完了</div>
  `;
}

function renderListView(container, subj){
  let html = '';
  subj.phases.forEach((p, idx)=>{
    if(currentPhaseFilter !== 'all' && currentPhaseFilter !== idx) return;
    const cards = p.weeks.map(w=>{
      const id = subj.key+':'+w[0];
      const card = renderCatalogCard(subj, w);
      return (openWeek === id) ? card + renderExpandPanel(subj, w) : card;
    }).join('');
    html += `<div class="phase-block">
      <div class="phase-title">${p.title} <span class="range">W${String(p.weeks[0][0]).padStart(2,'0')}–W${String(p.weeks[p.weeks.length-1][0]).padStart(2,'0')}</span></div>
      <div class="card-grid">${cards}</div>
    </div>`;
  });
  container.innerHTML = html;
}

function renderTimelineView(container, subj, onJumpToList){
  let html = '<div class="timeline"><div class="tl-track">';
  subj.phases.forEach((p, idx)=>{
    if(currentPhaseFilter !== 'all' && currentPhaseFilter !== idx) return;
    html += `<div class="tl-phase-label">${p.title}</div>`;
    p.weeks.forEach(w=>{
      const id = subj.key+':'+w[0];
      const isDone = !!doneMap[id];
      html += `<div class="tl-row">
        <div class="tl-dot ${isDone?'done':''}" data-check="${id}"></div>
        <div class="tl-week">W${String(w[0]).padStart(2,'0')}</div>
        <div class="tl-title" data-open="${id}">${w[1]}</div>
      </div>`;
    });
  });
  html += '</div></div>';
  container.innerHTML = html;
  container.querySelectorAll('[data-open]').forEach(el=>{
    el.addEventListener('click', ()=>{ onJumpToList(el.dataset.open); });
  });
  container.querySelectorAll('[data-check]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id = el.dataset.check;
      doneMap[id] = !doneMap[id];
      saveProgressMap(doneMap);
      renderTimelineView(container, subj, onJumpToList);
    });
  });
}

/* ===== 科目ページ全体の初期化 ===== */
async function initSubjectPage(subj){
  doneMap = await loadProgress();

  const content = document.getElementById('content');
  const phaseFilterEl = document.getElementById('phaseFilter');
  const progressEl = document.getElementById('progressWrap');
  const btnList = document.getElementById('btnList');
  const btnTimeline = document.getElementById('btnTimeline');

  function fullRender(){
    renderPhaseFilter(phaseFilterEl, subj, fullRender);
    renderProgressBar(progressEl, subj);
    if(currentView === 'list'){
      renderListView(content, subj);
      bindGridEvents(content, fullRender);
    }else{
      renderTimelineView(content, subj, (id)=>{
        currentView = 'list';
        btnList.classList.add('active'); btnTimeline.classList.remove('active');
        openWeek = id;
        fullRender();
      });
    }
  }

  btnList.addEventListener('click', ()=>{
    currentView='list'; btnList.classList.add('active'); btnTimeline.classList.remove('active'); fullRender();
  });
  btnTimeline.addEventListener('click', ()=>{
    currentView='timeline'; btnTimeline.classList.add('active'); btnList.classList.remove('active'); fullRender();
  });

  fullRender();
}

/* ===== トップページ（本棚）の初期化 ===== */
async function initIndexPage(allSubjects, upcoming){
  doneMap = await loadProgress();
  const totalAll = allSubjects.reduce((a,s)=>a+subjectTotal(s),0);
  const doneAll = allSubjects.reduce((a,s)=>a+subjectDone(s),0);

  document.getElementById('statRow').innerHTML = `
    <div class="stat"><div class="n">${allSubjects.length}</div><div class="l">Volumes</div></div>
    <div class="stat"><div class="n">${totalAll}</div><div class="l">Weeks</div></div>
    <div class="stat"><div class="n">${doneAll}</div><div class="l">Completed</div></div>
    <div class="stat"><div class="n">${totalAll?Math.round(doneAll/totalAll*100):0}%</div><div class="l">Progress</div></div>
  `;

  const shelf = document.getElementById('shelf');
  let html = allSubjects.map(s=>{
    const t = subjectTotal(s), d = subjectDone(s);
    const inProgress = d > 0 && d < t;
    const completed = t > 0 && d === t;
    return `<a class="spine" href="${s.key}.html" style="background:linear-gradient(180deg, ${s.color}dd, ${s.color}aa 60%, ${s.color}88)">
      ${inProgress ? '<div class="ribbon"></div>' : ''}
      ${completed ? '<div class="stamp">読了</div>' : ''}
      <div class="cap"></div>
      <div class="title">${s.name}</div>
      <div class="plate">${d}/${t}</div>
    </a>`;
  }).join('');
  html += upcoming.map(u=>`<div class="spine disabled" style="background:linear-gradient(180deg,#3a3a3add,#2a2a2aaa)">
      <div class="cap"></div>
      <div class="title">${u.name}</div>
      <div class="plate">準備中</div>
    </div>`).join('');
  shelf.innerHTML = html;
}
 