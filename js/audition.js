// audition.js
// 購買審査（オーディション）のメインロジック（3章の仕様全体）
//
// フロー:
//  1. 画像アップロード → フォーム活性化
//  2. ジャンル選択 → ベンチマーク（歴代最強）を表示
//  3. 各項目入力（理由・用途・作品ランク・星評価・情熱の持続性）
//  4. 緊急審査を使う場合は追加検証
//  5. 送信 → スコアはブラックボックスのまま結果画面のみ表示
//  6. 結果画面で初めてスコア内訳を開示

import { supabase } from "./supabaseClient.js";
import { compressImage } from "./imageCompress.js";
import { getCurrentWorkRanks, getCurrentGenrePriorities, getCurrentCustomConditions, checkMasterLock } from "./masterSettings.js";
import { getThisMonthEntryCount, calcSubmissionDebuff } from "./monthlyCount.js";
import { getBenchmarkForGenre } from "./benchmarkItem.js";
import { checkRegretPattern, CATEGORY_LABELS } from "./regretPatternCheck.js";
import { validateEmergencyEntry } from "./emergencyMode.js";

// 合格ラインのスコア（仕様書に数値の明記がなかったため暫定値。要調整可）
const PASS_THRESHOLD = 70;
const MIN_REASON_LENGTH = 30;

let state = {
  imageBlob: null,
  imagePreviewUrl: null,
  workRanks: [],
  genrePriorities: [],
  customConditions: [],
  selectedCustomConditionIds: new Set(),
  isEmergency: false,
};

export async function initAuditionForm() {
  const section = document.getElementById("audition-section");
  if (!section) return;

  // マスタ設定ロード
  try {
    [state.workRanks, state.genrePriorities, state.customConditions] = await Promise.all([
      getCurrentWorkRanks(),
      getCurrentGenrePriorities(),
      getCurrentCustomConditions(),
    ]);
  } catch (err) {
    showFormError("マスタ設定の読み込みに失敗しました: " + err.message);
    return;
  }

  if (state.genrePriorities.length === 0 || state.workRanks.length === 0) {
    showFormError("マスタ設定（作品ランク・ジャンル優先度）が未登録です。先にマスタ設定を作成してください。");
    return;
  }

  // マスタ変更ロック確認
  const lockStatus = await checkMasterLock();
  if (lockStatus.locked) {
    showFormError(
      `マスタ設定が変更されたため、${lockStatus.until.toLocaleString("ja-JP")}まで新規審査はロックされています。`
    );
    return;
  }

  populateGenreOptions();
  populateWorkRankOptions();
  populateCustomConditions();
  bindEvents();
}

function showFormError(message) {
  const el = document.getElementById("audition-error");
  if (el) {
    el.textContent = message;
    el.classList.remove("hidden");
  }
}

function populateGenreOptions() {
  const select = document.getElementById("genre-select");
  select.innerHTML = '<option value="">選択してください</option>';
  for (const g of state.genrePriorities) {
    const opt = document.createElement("option");
    opt.value = g.genre_name;
    opt.textContent = g.genre_name;
    select.appendChild(opt);
  }
}

function populateWorkRankOptions() {
  const select = document.getElementById("work-rank-select");
  select.innerHTML = '<option value="">選択してください</option>';
  for (const r of state.workRanks) {
    const opt = document.createElement("option");
    opt.value = r.rank_no;
    opt.textContent = `${r.rank_no}位`;
    select.appendChild(opt);
  }
}

function populateCustomConditions() {
  const container = document.getElementById("custom-conditions-list");
  container.innerHTML = "";
  for (const c of state.customConditions) {
    const label = document.createElement("label");
    label.className = "checkbox-row";
    label.innerHTML = `
      <input type="checkbox" value="${c.id}" data-points="${c.points}" />
      ${c.label}
    `;
    container.appendChild(label);
  }
}

function bindEvents() {
  document.getElementById("image-input").addEventListener("change", onImageSelected);
  document.getElementById("genre-select").addEventListener("change", onGenreChanged);
  document.getElementById("emergency-toggle").addEventListener("change", onEmergencyToggle);
  document.getElementById("submit-audition-btn").addEventListener("click", onSubmit);

  document.getElementById("custom-conditions-list").addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    if (e.target.checked) state.selectedCustomConditionIds.add(e.target.value);
    else state.selectedCustomConditionIds.delete(e.target.value);
  });
}

// 1. 画像必須アップロード: 選択されるまで他の入力を無効化する
async function onImageSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    state.imageBlob = await compressImage(file);
    state.imagePreviewUrl = URL.createObjectURL(state.imageBlob);

    document.getElementById("image-preview").src = state.imagePreviewUrl;
    document.getElementById("image-preview").classList.remove("hidden");

    // 画像確定後にフォーム本体を活性化
    document.getElementById("audition-fields").classList.remove("disabled");
  } catch (err) {
    showFormError("画像の処理に失敗しました: " + err.message);
  }
}

// 2. ジャンル選択時: 同ジャンルの歴代最強アイテムをベンチマーク表示
async function onGenreChanged(e) {
  const genre = e.target.value;
  const benchmarkArea = document.getElementById("benchmark-area");
  if (!genre) {
    benchmarkArea.classList.add("hidden");
    return;
  }

  const benchmark = await getBenchmarkForGenre(genre);
  if (!benchmark) {
    benchmarkArea.innerHTML = "<p class='text-muted'>このジャンルにはまだ一軍コレクションがありません（比較対象なし）。</p>";
    benchmarkArea.classList.remove("hidden");
    return;
  }

  benchmarkArea.innerHTML = `
    <p class="text-muted">歴代最強と見比べてから評価してください</p>
    <div class="benchmark-card">
      <img src="${benchmark.image_url}" alt="${benchmark.name}" />
      <div>
        <strong>${benchmark.name}</strong>
        ${renderBenchmarkStars(benchmark)}
      </div>
    </div>
  `;
  benchmarkArea.classList.remove("hidden");
}

// ベンチマークの星評価を表示（スコアは見せず、評価の目安だけ伝える）
function renderBenchmarkStars(benchmark) {
  const stars = (n) => (n ? "★".repeat(n) + "☆".repeat(5 - n) : "-");
  return `
    <p class="text-muted benchmark-stars">
      クオリティ ${stars(benchmark.quality_rating)} /
      作画 ${stars(benchmark.art_style_rating)} /
      レア度 ${stars(benchmark.rarity_rating)}
    </p>
  `;
}

function onEmergencyToggle(e) {
  state.isEmergency = e.target.checked;
  document.getElementById("emergency-fields").classList.toggle("hidden", !state.isEmergency);
}

// 5. 送信処理: スコア計算 → DB保存 → ブラックボックスのままリザルト表示
async function onSubmit() {
  showFormError("");
  document.getElementById("audition-error").classList.add("hidden");

  const name = document.getElementById("item-name").value.trim();
  const genre = document.getElementById("genre-select").value;
  const workRankNo = Number(document.getElementById("work-rank-select").value) || null;
  const price = Number(document.getElementById("price-input").value) || null;
  const purchaseReason = document.getElementById("purchase-reason").value.trim();
  const usagePlan = document.getElementById("usage-plan").value.trim();
  const passionDurability = document.getElementById("passion-select").value;
  const emergencyReason = document.getElementById("emergency-reason").value.trim();

  const qualityRating = Number(document.getElementById("quality-rating").value) || null;
  const artStyleRating = Number(document.getElementById("art-style-rating").value) || null;
  const rarityRating = Number(document.getElementById("rarity-rating").value) || null;

  // --- 入力検証 ---
  const errors = [];
  if (!state.imageBlob) errors.push("画像が未アップロードです。");
  if (!name) errors.push("アイテム名を入力してください。");
  if (!genre) errors.push("ジャンルを選択してください。");
  if (!workRankNo) errors.push("作品ランクを選択してください。");
  if (purchaseReason.length < MIN_REASON_LENGTH) {
    errors.push(`購入理由は${MIN_REASON_LENGTH}文字以上で入力してください（現在${purchaseReason.length}文字）。`);
  }
  if (!usagePlan) errors.push("どこに飾るか/どう使うかを入力してください。");
  if (!passionDurability) errors.push("情熱の持続性を選択してください。");

  if (state.isEmergency) {
    const emergencyCheck = validateEmergencyEntry(emergencyReason, workRankNo);
    if (!emergencyCheck.ok) errors.push(...emergencyCheck.errors);
  }

  if (errors.length > 0) {
    showFormError(errors.join(" "));
    document.getElementById("audition-error").classList.remove("hidden");
    return;
  }

  const submitBtn = document.getElementById("submit-audition-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "審査中...";

  try {
    // --- 画像アップロード ---
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user.id;
    const filePath = `${userId}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(filePath, state.imageBlob, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from("item-images").getPublicUrl(filePath);
    const imageUrl = publicUrlData.publicUrl;

    // --- スコア計算（ブラックボックス: ここでは画面に一切出さない） ---
    const workRankScore = state.workRanks.find((r) => r.rank_no === workRankNo)?.score ?? 0;
    const genreScore = state.genrePriorities.find((g) => g.genre_name === genre)?.score ?? 0;
    const baseScore = workRankScore + genreScore;

    const customBonusTotal = [...state.selectedCustomConditionIds].reduce((sum, id) => {
      const cond = state.customConditions.find((c) => c.id === id);
      return sum + (cond ? cond.points : 0);
    }, 0);

    const countSoFar = await getThisMonthEntryCount();
    const { debuff: submissionDebuff, label: debuffLabel } = calcSubmissionDebuff(countSoFar);

    const passionPenaltyMap = { lasting: 0, unsure: -5, temporary: -15 };
    const passionPenalty = passionPenaltyMap[passionDurability] ?? 0;

    const regretCheck = await checkRegretPattern(purchaseReason);
    const regretDebuff = regretCheck.matched ? -5 : 0;

    const finalScore = baseScore + customBonusTotal + submissionDebuff + passionPenalty + regretDebuff;
    const decision = finalScore >= PASS_THRESHOLD ? "approved" : "rejected";
    const status = decision === "approved" ? "collection" : "wishlist";

    // --- DB保存 ---
    const { data: inserted, error: insertError } = await supabase
      .from("items")
      .insert({
        name,
        genre,
        work_rank_no: workRankNo,
        image_url: imageUrl,
        purchase_reason: purchaseReason,
        usage_plan: usagePlan,
        price,
        is_emergency: state.isEmergency,
        emergency_reason: state.isEmergency ? emergencyReason : null,
        passion_durability: passionDurability,
        passion_durability_penalty: passionPenalty,
        base_score: baseScore,
        custom_bonus_total: customBonusTotal,
        submission_debuff: submissionDebuff,
        regret_warning_debuff: regretDebuff,
        final_score: finalScore,
        status,
        decision,
        decided_at: new Date().toISOString(),
        purchased_at: decision === "approved" ? new Date().toISOString() : null,
        quality_rating: qualityRating,
        art_style_rating: artStyleRating,
        rarity_rating: rarityRating,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    // 後悔パターン警告ログを記録
    if (regretCheck.matched) {
      await supabase.from("regret_pattern_warnings").insert({
        item_id: inserted.id,
        matched_category: regretCheck.category,
        matched_count: regretCheck.count,
      });
    }

    // 緊急審査の場合は事後トラッキングを仕込む（7日後に満足度確認）
    if (state.isEmergency) {
      const notifyAt = new Date();
      notifyAt.setDate(notifyAt.getDate() + 7);
      await supabase.from("emergency_review_followups").insert({
        item_id: inserted.id,
        emergency_reason: emergencyReason,
        notify_at: notifyAt.toISOString(),
      });
    }

    showResult({
      decision,
      finalScore,
      breakdown: {
        baseScore,
        customBonusTotal,
        submissionDebuff,
        debuffLabel,
        passionPenalty,
        regretDebuff,
        regretCategory: regretCheck.category ? CATEGORY_LABELS[regretCheck.category] : null,
        regretCount: regretCheck.count,
      },
    });
  } catch (err) {
    showFormError("審査中にエラーが発生しました: " + err.message);
    document.getElementById("audition-error").classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "審査を提出する";
  }
}

// 6. リザルト表示（ブラックボックス解除: ここで初めて点数を見せる）
function showResult({ decision, finalScore, breakdown }) {
  document.getElementById("audition-fields").classList.add("hidden");
  document.getElementById("image-input").parentElement.classList.add("hidden");

  const resultArea = document.getElementById("audition-result");
  resultArea.classList.remove("hidden");

  const decisionLabel = decision === "approved" ? "✅ 購入許可" : "❌ 見送り（未練ボックスへ）";
  const decisionClass = decision === "approved" ? "result-approved" : "result-rejected";

  resultArea.innerHTML = `
    <h2 class="${decisionClass}">${decisionLabel}</h2>
    <p class="final-score">最終納得度スコア: ${finalScore}</p>
    <details>
      <summary>スコア内訳を見る</summary>
      <ul>
        <li>作品ランク＋ジャンル優先度: ${breakdown.baseScore}</li>
        <li>カスタム条件加減算: ${breakdown.customBonusTotal >= 0 ? "+" : ""}${breakdown.customBonusTotal}</li>
        ${breakdown.debuffLabel ? `<li>${breakdown.debuffLabel} 提出件数デバフ: ${breakdown.submissionDebuff}</li>` : ""}
        <li>情熱の持続性デバフ: ${breakdown.passionPenalty}</li>
        ${breakdown.regretDebuff !== 0
          ? `<li>⚠️ 過去に「${breakdown.regretCategory}」という理由で${breakdown.regretCount}件処分しているパターンに一致: ${breakdown.regretDebuff}</li>`
          : ""}
      </ul>
    </details>
    <button id="new-audition-btn">別のアイテムを審査する</button>
  `;

  document.getElementById("new-audition-btn").addEventListener("click", () => {
    location.reload();
  });
}