// monthlyCount.js
// 今月のエントリー数に応じた動的デバフ（3章③の仕様）
//   1〜2件目: デバフなし
//   3〜4件目: 【注意報】 -10点
//   5件目以降: 【暴走警報】 -30点

import { supabase } from "./supabaseClient.js";

export async function getThisMonthEntryCount() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count, error } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .gte("entered_at", firstOfMonth);

  if (error) throw error;
  return count ?? 0;
}

/**
 * 今月これまでのエントリー数から、今回のエントリー（=count+1件目）の
 * デバフ点数とラベルを返す
 */
export function calcSubmissionDebuff(countSoFar) {
  const nth = countSoFar + 1; // 今回のエントリーが何件目か
  if (nth <= 2) return { debuff: 0, label: null };
  if (nth <= 4) return { debuff: -10, label: "【注意報】" };
  return { debuff: -30, label: "【暴走警報】" };
}