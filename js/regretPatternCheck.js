// regretPatternCheck.js
// 過去の処分理由データと、新規審査の購入理由をキーワードで照合し、
// 同じ後悔パターンの兆候があれば警告を出す（4章④の仕様）
// ※ 自然言語解析ではなく、簡易的なキーワード一致による判定

import { supabase } from "./supabaseClient.js";

// カテゴリごとの「危険な兆候ワード」の一例。実際の傾向に合わせて調整してよい
const CATEGORY_KEYWORDS = {
  stale_passion: ["可愛い", "尊い", "一目惚れ", "限定", "今だけ", "推せる"],
  impulsive: ["勢いで", "とりあえず", "なんとなく", "気づいたら"],
  no_space: ["置き場所は後で", "とりあえず飾る"],
  unused: ["いつか使う", "そのうち使う"],
  quality_dissatisfaction: ["写真で見ただけ", "実物は見てない"],
};

/**
 * 購入理由テキストを、過去の処分パターンと照合する
 * @param {string} purchaseReasonText
 * @returns {Promise<{matched: boolean, category: string|null, count: number}>}
 */
export async function checkRegretPattern(purchaseReasonText) {
  // 自分の過去の処分理由をカテゴリごとに集計
  const { data, error } = await supabase
    .from("disposal_records")
    .select("reason_category");
  if (error) throw error;

  const categoryCounts = {};
  for (const row of data) {
    categoryCounts[row.reason_category] = (categoryCounts[row.reason_category] || 0) + 1;
  }

  // 過去に1件以上処分歴があるカテゴリのキーワードのみチェック対象にする
  for (const [category, count] of Object.entries(categoryCounts)) {
    const keywords = CATEGORY_KEYWORDS[category] || [];
    const matchedKeyword = keywords.find((kw) => purchaseReasonText.includes(kw));
    if (matchedKeyword) {
      return { matched: true, category, count };
    }
  }

  return { matched: false, category: null, count: 0 };
}

// カテゴリの内部名 → 表示用の日本語ラベル
export const CATEGORY_LABELS = {
  stale_passion: "旬が過ぎた",
  no_space: "飾る場所がない",
  unused: "使わなかった",
  impulsive: "衝動的だった",
  quality_dissatisfaction: "画質・作り込みへの不満",
  other: "その他",
};