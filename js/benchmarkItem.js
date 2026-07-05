// benchmarkItem.js
// 同ジャンルの所持済み一軍（歴代最高スコア）を取得し、比較表示に使う（3章②の仕様）

import { supabase } from "./supabaseClient.js";

/**
 * 指定ジャンルの一軍コレクションの中で、最高スコアのアイテムを1件取得する
 * @param {string} genre
 * @returns {Promise<object|null>} {name, image_url, final_score, ...} または該当なしならnull
 */
export async function getBenchmarkForGenre(genre) {
  const { data, error } = await supabase
    .from("items")
    .select("id, name, image_url, final_score, quality_rating, art_style_rating, rarity_rating")
    .eq("genre", genre)
    .eq("status", "collection")
    .order("final_score", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}