// ui.js
// ログイン状態に応じた画面表示の切り替えを担当する

const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const auditionSection = document.getElementById("audition-section");
const auditionResult = document.getElementById("audition-result");
const userStatus = document.getElementById("user-status");

export function showLoggedIn(user) {
  userStatus.textContent = user.email;
  loginSection.classList.add("hidden");
  appSection.classList.remove("hidden");
  auditionSection.classList.add("hidden");
  auditionResult.classList.add("hidden");
}

export function showLoggedOut() {
  userStatus.textContent = "";
  loginSection.classList.remove("hidden");
  appSection.classList.add("hidden");
  auditionSection.classList.add("hidden");
  auditionResult.classList.add("hidden");
}