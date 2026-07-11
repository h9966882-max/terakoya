/* ===== 共通ログインウィジェット =====
   画面右上に小さく表示。ログインしなくても閲覧は可能、
   ログインすると進捗がSupabase経由で端末間同期される。
*/
(function(){
  const style = document.createElement('style');
  style.textContent = `
    #authWidget{
      position:fixed; top:14px; right:14px; z-index:1000;
      font-family:'Cormorant Garamond', serif; font-size:13px;
    }
    #authWidget button, #authWidget .authLink{
      background:rgba(0,0,0,.25); border:1px solid rgba(201,162,75,.5); color:#E0C374;
      padding:6px 12px; border-radius:20px; cursor:pointer; font-family:inherit; font-size:12.5px;
      letter-spacing:.03em;
    }
    #authModal{
      display:none; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:2000;
      align-items:center; justify-content:center;
    }
    #authModal.open{display:flex;}
    #authModal .box{
      background:#EFE7D4; color:#2A2418; padding:26px 28px; border-radius:4px; width:280px;
      font-family:'Zen Kaku Gothic New', sans-serif; box-shadow:0 10px 40px rgba(0,0,0,.5);
    }
    #authModal h4{font-family:'Shippori Mincho',serif; margin:0 0 16px; font-size:16px;}
    #authModal input{
      width:100%; padding:9px 10px; margin-bottom:10px; border:1px solid #C9A24B; border-radius:3px;
      font-size:14px; background:#FBF9F3;
    }
    #authModal button.submit{
      width:100%; padding:10px; background:#C9A24B; border:none; border-radius:3px; color:#152A20;
      font-weight:600; cursor:pointer; margin-top:4px;
    }
    #authModal .close{position:absolute; top:10px; right:14px; cursor:pointer; font-size:18px; color:#8B3A3A;}
    #authModal .msg{font-size:12px; margin-top:10px; color:#8B3A3A; min-height:16px;}
  `;
  document.head.appendChild(style);

  const widget = document.createElement('div');
  widget.id = 'authWidget';
  document.body.appendChild(widget);

  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.innerHTML = `
    <div class="box" style="position:relative;">
      <span class="close" id="authModalClose">×</span>
      <h4>ログイン</h4>
      <input type="email" id="authEmail" placeholder="メールアドレス">
      <input type="password" id="authPassword" placeholder="パスワード">
      <button class="submit" id="authSubmit">ログイン</button>
      <div class="msg" id="authMsg"></div>
    </div>
  `;
  document.body.appendChild(modal);

  function renderWidget(user){
    widget.innerHTML = user
      ? `<button id="signOutBtn">${user.email} ／ ログアウト</button>`
      : `<button id="signInOpenBtn">ログイン</button>`;
    const so = document.getElementById('signOutBtn');
    if(so) so.addEventListener('click', async ()=>{ await signOut(); location.reload(); });
    const si = document.getElementById('signInOpenBtn');
    if(si) si.addEventListener('click', ()=>{ modal.classList.add('open'); });
  }

  document.getElementById('authModalClose').addEventListener('click', ()=>{ modal.classList.remove('open'); });
  document.getElementById('authSubmit').addEventListener('click', async ()=>{
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const msg = document.getElementById('authMsg');
    msg.textContent = 'ログイン中…';
    try{
      await signIn(email, password);
      msg.textContent = 'ログインしました';
      setTimeout(()=>location.reload(), 400);
    }catch(e){
      msg.textContent = 'ログインに失敗しました（メールアドレスかパスワードが違うかも）';
    }
  });

  (async function(){
    await initAuth();
    renderWidget(currentUser);
  })();
})();
 