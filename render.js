/* ===== 共通レンダリングエンジン ===== */

let doneMap = {};
let openCards = {};
let currentView = "list";
let currentPhaseFilter = "all";

function subjectTotal(s){ return s.phases.reduce((a,p)=>a+p.weeks.length,0); }
function subjectDone(s){ return s.phases.reduce((a,p)=>a+p.weeks.filter(w=>doneMap[s.key+':'+w[0]]).length,0); }

/* Obsidian風の軽量記法をHTMLに変換（テキストのみ、リンクは今回未対応） */
function formatNoteText(text){
  if(!text) return "";
  let html = text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
  return html;
}

function renderCard(subj, w){
  const [n,title,def,struct,rule,obs,intervene,fail] = w;
  const id = subj.key+':'+n;
  const isDone = !!doneMap[id];
  const isOpen = !!openCards[id];
  const noteText = (NOTES[subj.key] && NOTES[subj.key][n]) ? NOTES[subj.key][n] : null;
  return `
  <div class="card ${isOpen?'open':''}" data-id="${id}">
    <div class="card-head" data-toggle="${id}">
      <div class="wknum">W${String(n).padStart(2,'0')}</div>
      <div class="wktitle">${title}</div>
      <div class="chev">▶</div>
      <div class="check ${isDone?'done':''}" data-check="${id}">${isDone?'✓':''}</div>
    </div>
    <div class="card-body">
      <div class="field"><div class="fl">① 定義</div><div class="fv">${def}</div></div>
      <div class="field"><div class="fl">② 構造</div><div class="fv">${struct.join(' ／ ')}</div></div>
      <div class="field rule"><div class="fl">③ 意思決定ルール</div><div class="fv">${rule}</div></div>
      <div class="field obs"><div class="fl">④ 観測ポイント</div><div class="fv">${obs}</div></div>
      <div class="field"><div class="fl">⑤ 介入</div><div class="fv">${intervene}</div></div>
      <div class="field fail"><div class="fl">⑥ 失敗パターン</div><div class="fv">${fail}</div></div>
      <div class="note-section">
        ${noteText
          ? `<div class="note-toggle" data-note="${id}">▶ 講義ノートを見る</div><div class="note-body" id="note-${id.replace(':','-')}">${formatNoteText(noteText)}</div>`
          : `<div class="note-empty">講義ノート未登録</div>`}
      </div>
    </div>
  </div>`;
}

function bindCardEvents(onChange){
  document.querySelectorAll('[data-toggle]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.dataset.toggle;
      openCards[id] = !openCards[id];
      onChange();
    });
  });
  document.querySelectorAll('[data-check]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id = el.dataset.check;
      doneMap[id] = !doneMap[id];
      saveProgressMap(doneMap);
      onChange();
    });
  });
  document.querySelectorAll('[data-note]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      e.stopPropagation();
      const id = el.dataset.note;
      const body = document.getElementById('note-'+id.replace(':','-'));
      if(body){
        body.classList.toggle('open');
        el.textContent = (body.classList.contains('open') ? '▼' : '▶') + ' 講義ノートを見る';
      }
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
    <div class="progress-track"><div class="progress-fill" style="width:${total?done/total*100:0}%; background:${subj.color}"></div></div>
    <div class="progress-label">${subj.name} — ${done} / ${total} 週 完了</div>
  `;
}

function renderListView(container, subj){
  let html = '';
  subj.phases.forEach((p, idx)=>{
    if(currentPhaseFilter !== 'all' && currentPhaseFilter !== idx) return;
    html += `<div class="phase-block">
      <div class="phase-title">${p.title} <span class="range">W${String(p.weeks[0][0]).padStart(2,'0')}–W${String(p.weeks[p.weeks.length-1][0]).padStart(2,'0')}</span></div>
      ${p.weeks.map(w=>renderCard(subj,w)).join('')}
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
        <div class="tl-title" data-toggle="${id}">${w[1]}</div>
      </div>`;
    });
  });
  html += '</div></div>';
  container.innerHTML = html;
  container.querySelectorAll('[data-toggle]').forEach(el=>{
    el.addEventListener('click', ()=>{ onJumpToList(el.dataset.toggle); });
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
      bindCardEvents(fullRender);
    }else{
      renderTimelineView(content, subj, (id)=>{
        currentView = 'list';
        btnList.classList.add('active'); btnTimeline.classList.remove('active');
        openCards[id] = true;
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

/* ===== トップページの初期化 ===== */
async function initIndexPage(allSubjects, upcoming){
  doneMap = await loadProgress();
  const totalAll = allSubjects.reduce((a,s)=>a+subjectTotal(s),0);
  const doneAll = allSubjects.reduce((a,s)=>a+subjectDone(s),0);

  document.getElementById('statRow').innerHTML = `
    <div class="stat"><div class="n">${allSubjects.length}<span style="font-size:13px;">/${allSubjects.length+upcoming.length}</span></div><div class="l">科目 実装済</div></div>
    <div class="stat"><div class="n">${totalAll}</div><div class="l">総講義数</div></div>
    <div class="stat"><div class="n">${doneAll}</div><div class="l">完了</div></div>
    <div class="stat"><div class="n">${totalAll?Math.round(doneAll/totalAll*100):0}%</div><div class="l">全体進捗</div></div>
  `;

  const grid = document.getElementById('subjectGrid');
  let html = allSubjects.map(s=>{
    const total = subjectTotal(s), done = subjectDone(s);
    return `<a class="subj-card" href="${s.key}.html">
      <div class="bar" style="background:${s.color}"></div>
      <div class="name">${s.name}</div>
      <div class="meta">${total}週 ／ ${done}完了</div>
      <div class="prog-track"><div class="prog-fill" style="width:${total?done/total*100:0}%; background:${s.color}"></div></div>
    </a>`;
  }).join('');
  html += upcoming.map(u=>`<div class="subj-card disabled">
      <div class="bar" style="background:var(--rule)"></div>
      <div class="name">${u.name}</div>
      <div class="meta">${u.note}・準備中</div>
    </div>`).join('');
  grid.innerHTML = html;
}
