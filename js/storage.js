/* ===== ストレージ抽象化レイヤー（Supabase対応版） =====
   ログイン中: Supabaseのthinkingos_progressテーブルに保存（端末間で同期）
   未ログイン: localStorageに保存（この端末だけ）
   ページを開いた時に一度だけ現在のログイン状態を確認する。
*/
let currentUser = null;
let authReady = false;

async function initAuth(){
  currentUser = await getCurrentUser();
  authReady = true;
  onAuthChange((user)=>{ currentUser = user; if(window.onAuthStateChanged) window.onAuthStateChanged(user); });
  return currentUser;
}

const AppStorage = {
  async get(key){
    if(currentUser){
      try{
        const { data, error } = await sb
          .from('thinkingos_progress')
          .select('value')
          .eq('user_id', currentUser.id)
          .eq('key', key)
          .maybeSingle();
        if(error) throw error;
        if(data) return data.value;
        // Supabaseに無ければローカルにあるか確認（初回移行用）
      }catch(e){ /* フォールバックへ */ }
    }
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  },

  async set(key, value){
    // ローカルにも常に保存しておく（オフライン保険）
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}

    if(currentUser){
      try{
        const { error } = await sb
          .from('thinkingos_progress')
          .upsert({ user_id: currentUser.id, key, value, updated_at: new Date().toISOString() });
        if(error) throw error;
        return true;
      }catch(e){ return false; }
    }
    return true;
  }
};

const PROGRESS_KEY = "curriculum-progress";

async function loadProgress(){
  if(!authReady) await initAuth();
  const v = await AppStorage.get(PROGRESS_KEY);
  return v || {};
}
async function saveProgressMap(map){
  await AppStorage.set(PROGRESS_KEY, map);
}
