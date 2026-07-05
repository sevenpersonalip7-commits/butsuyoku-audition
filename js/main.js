// main.js
// アプリのエントリーポイント。認証状態の監視とログイン/ログアウト操作の配線を行う。

import { getCurrentUser, signIn, signOut, onAuthStateChange } from "./auth.js";
import { showLoggedIn, showLoggedOut } from "./ui.js";
import { initAuditionForm } from "./audition.js";
import { registerServiceWorker } from "./sw-register.js";

const authError = document.getElementById("auth-error");

// 初期状態の判定
getCurrentUser().then((user) => {
  if (user) showLoggedIn(user);
  else showLoggedOut();
});

// ログイン状態の変化を監視
onAuthStateChange((user) => {
  if (user) showLoggedIn(user);
  else showLoggedOut();
});

// ログインボタン
document.getElementById("signin-btn").addEventListener("click", async () => {
  authError.classList.add("hidden");
  const email = document.getElementById("email-input").value;
  const password = document.getElementById("password-input").value;
  try {
    await signIn(email, password);
  } catch (err) {
    authError.textContent = "ログイン失敗: " + err.message;
    authError.classList.remove("hidden");
  }
});

// ログアウトボタン
document.getElementById("signout-btn").addEventListener("click", async () => {
  await signOut();
});

// 「新規審査を始める」ボタン
document.getElementById("start-audition-btn").addEventListener("click", async () => {
  document.getElementById("app-section").classList.add("hidden");
  document.getElementById("audition-section").classList.remove("hidden");
  await initAuditionForm();
});

// PWA化
registerServiceWorker();