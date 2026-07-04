// auth.js
// メール/パスワードでのログイン・ログアウト・セッション監視の最小構成
import { supabase } from "./supabaseClient.js";

// 現在のログイン状態を取得する
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("ユーザー取得エラー:", error.message);
    return null;
  }
  return data.user;
}

// ログイン
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.user;
}

// 新規登録（最初の自分用アカウント作成時のみ使う想定）
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

// ログアウト
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// セッション状態の変化を監視する（ログイン/ログアウトでUIを切り替えるため）
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}