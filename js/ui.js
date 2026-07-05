// ui.js
// ログイン状態に応じた画面表示の切り替えを担当する

const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const userStatus = document.getElementById("user-status");

export function showLoggedIn(user) {
  userStatus.textContent = user.email;
  loginSection.classList.add("hidden");
  appSection.classList.remove("hidden");
}

export function showLoggedOut() {
  userStatus.textContent = "";
  loginSection.classList.remove("hidden");
  appSection.classList.add("hidden");
}