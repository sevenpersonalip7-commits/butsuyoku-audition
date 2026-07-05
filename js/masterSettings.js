// masterSettings.js
// マスタ設定（作品ランク・ジャンル優先度・カスタム条件）の取得と
// 変更ロック状態の確認を行う（2章の仕様）

import { supabase } from "./supabaseClient.js";

// 現在有効な作品ランク一覧を取得 [{rank_no, score}, ...]
export async function getCurrentWorkRanks() {
  const { data, error } = await supabase
    .from("master_work_ranks")
    .select("rank_no, score")
    .eq("is_current", true)
    .order("rank_no", { ascending: true });
  if (error) throw error;
  return data;
}

// 現在有効なジャンル優先度一覧を取得 [{genre_name, score, max_slots}, ...]
export async function getCurrentGenrePriorities() {
  const { data, error } = await supabase
    .from("master_genre_priority")
    .select("genre_name, score, max_slots")
    .eq("is_current", true)
    .order("score", { ascending: false });
  if (error) throw error;
  return data;
}

// 現在有効なカスタム条件一覧を取得 [{id, label, points}, ...]
export async function getCurrentCustomConditions() {
  const { data, error } = await supabase
    .from("master_custom_conditions")
    .select("id, label, points")
    .eq("is_current", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * マスタ変更ロックの状態を確認する（2章②: 変更後24〜48時間は新規エントリー禁止）
 * @returns {Promise<{locked: boolean, until: Date|null}>}
 */
export async function checkMasterLock() {
  const { data, error } = await supabase
    .from("master_change_locks")
    .select("locked_until")
    .order("locked_until", { ascending: false })
    .limit(1);
  if (error) throw error;

  if (!data || data.length === 0) {
    return { locked: false, until: null };
  }

  const until = new Date(data[0].locked_until);
  return { locked: until > new Date(), until };
}