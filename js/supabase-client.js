/* ===== Supabase 接続・認証の土台 =====
   編み物カウンターと同じSupabaseプロジェクトに相乗りしている。
   テーブルは thinkingos_ プレフィックスで分離済み。
*/
const SUPABASE_URL = "https://cvlqufhuwiswretosfuj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2bHF1Zmh1d2lzd3JldG9zZnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MjEzMzIsImV4cCI6MjA5ODE5NzMzMn0.ag0coPnNA2O5trTp-rckUWkqfwJMNZHH_4E-29IEZf0";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* 現在のログインユーザーを取得（未ログインならnull） */
async function getCurrentUser(){
  const { data } = await sb.auth.getUser();
  return data?.user || null;
}

async function signIn(email, password){
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error) throw error;
  return data.user;
}

async function signOut(){
  await sb.auth.signOut();
}

/* ログイン状態が変わるたびに呼ばれるコールバックを登録 */
function onAuthChange(callback){
  sb.auth.onAuthStateChange((_event, session)=>{
    callback(session?.user || null);
  });
}
