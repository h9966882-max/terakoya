/* ===== ストレージ抽象化レイヤー =====
   今は localStorage を使っているが、Supabase接続後は
   このファイルの中身だけを差し替えれば全ページに反映される。
   （get/set のインターフェースは変えないこと）
*/
const AppStorage = {
  async get(key){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  },
  async set(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }catch(e){ return false; }
  }
};

/* 進捗保存用のキー */
const PROGRESS_KEY = "curriculum-progress";

async function loadProgress(){
  const v = await AppStorage.get(PROGRESS_KEY);
  return v || {};
}
async function saveProgressMap(map){
  await AppStorage.set(PROGRESS_KEY, map);
}
