// testConnection.js
// Supabase接続確認用の一時的な機能。
// 本番の購買審査フォーム（audition.js）が完成したら、このファイルと
// index.html内の「接続テスト」セクションはまとめて削除してよい。

import { supabase } from "./supabaseClient.js";

export function setupTestConnection() {
  const btn = document.getElementById("test-insert-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const resultEl = document.getElementById("test-result");
    resultEl.textContent = "登録中...";

    const { data, error } = await supabase
      .from("items")
      .insert({
        name: "接続テストアイテム",
        genre: "テスト",
        image_url: "https://example.com/test.jpg",
        purchase_reason:
          "Supabase接続テストのためのダミーデータです。30文字以上の条件を満たすために文章を伸ばしています。",
        usage_plan: "テスト用のため実際には使用しません。",
        status: "reviewing",
      })
      .select();

    if (error) {
      resultEl.textContent = "❌ 失敗: " + error.message;
      console.error(error);
    } else {
      resultEl.textContent = "✅ 成功！登録されたID: " + data[0].id;
      console.log(data);
    }
  });
}