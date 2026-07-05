// emergencyMode.js
// 緊急審査モード（3章④の仕様）
//   - 150文字以上の超具体的な理由入力を強制
//   - NGワード検知でエラー
//   - 対象は作品ランク2位以上限定。3位以下は一発アウト

const MIN_LENGTH = 150;

const NG_WORDS = [
  "可愛い", "尊い", "一目惚れ", "限定", "とりあえず",
  "推せる", "萌え", "今だけ", "勢いで", "なんとなく",
];

/**
 * 緊急審査の入力内容を検証する
 * @param {string} reasonText
 * @param {number} workRankNo - 選択された作品ランク（1位=1, 2位=2, ...）
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateEmergencyEntry(reasonText, workRankNo) {
  const errors = [];

  if (workRankNo == null || workRankNo > 2) {
    errors.push("緊急審査は作品ランク2位以上のアイテムのみ対象です。3位以下は通常審査（またはロック解除後の再エントリー）をご利用ください。");
    // ランク条件を満たさない場合は他の検証をしても意味がないため、ここで返す
    return { ok: false, errors };
  }

  if (!reasonText || reasonText.trim().length < MIN_LENGTH) {
    errors.push(`緊急審査の理由は${MIN_LENGTH}文字以上の具体的な記述が必要です（現在${reasonText ? reasonText.trim().length : 0}文字）。`);
  }

  const foundNgWords = NG_WORDS.filter((w) => reasonText && reasonText.includes(w));
  if (foundNgWords.length > 0) {
    errors.push(`直感的な表現（${foundNgWords.join("、")}）が検出されました。感情ではなく具体的な理由に言い換えてください。`);
  }

  return { ok: errors.length === 0, errors };
}