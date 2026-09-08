const msgLogin = document.getElementById("msgLogin");
const msgReg = document.getElementById("msgReg");
(() => {
  const v = new URLSearchParams(location.search);
  const v2 = v.get("ban");
  if (v2) {
    msgLogin.textContent = v2;
    msgLogin.className = "msg bad";
  }
})();
let paymentLinks = {
  cardUrl: "",
  walletUrl: "",
  patreonUrl: "",
  paypalUrl: "",
  vodafoneCash: "",
  supportContact: "",
  note: ""
};
window.switchTab = p => {
  document.getElementById("tabLogin").classList.toggle("active", p === "login");
  document.getElementById("tabPro").classList.toggle("active", p === "pro");
  document.getElementById("paneLogin").classList.toggle("active", p === "login");
  document.getElementById("paneRegister").classList.toggle("active", false);
  document.getElementById("panePro").classList.toggle("active", p === "pro");
};
window.showRegister = () => {
  document.getElementById("paneLogin").classList.toggle("active", false);
  document.getElementById("panePro").classList.toggle("active", false);
  document.getElementById("paneRegister").classList.toggle("active", true);
};
window.showLogin = () => {
  document.getElementById("paneRegister").classList.toggle("active", false);
  document.getElementById("panePro").classList.toggle("active", false);
  document.getElementById("paneLogin").classList.toggle("active", true);
};
async function doLogin() {
  const v3 = document.getElementById("loginEmail").value.trim();
  const v4 = document.getElementById("loginPass").value;
  if (!v3 || !v4) {
    msgLogin.textContent = "املأ الإيميل والباسورد";
    msgLogin.className = "msg bad";
    return;
  }
  msgLogin.textContent = "جاري تسجيل الدخول...";
  msgLogin.className = "msg info";
  const v5 = await window.api.login(v3, v4);
  if (v5.ok) {
    msgLogin.textContent = "أهلًا بيك! جاري فتح البرنامج... (" + (v5.tier === "free" ? "الباقة المجانية" : "باقة " + v5.tier.toUpperCase()) + ")";
    msgLogin.className = "msg ok";
    setTimeout(() => window.api.closeLicenseAndOpenMain(), 700);
  } else {
    msgLogin.textContent = v5.reason || "تعذر الدخول";
    msgLogin.className = "msg bad";
  }
}
document.getElementById("loginBtn").addEventListener("click", doLogin);
document.getElementById("loginPass").addEventListener("keydown", p2 => {
  if (p2.key === "Enter") {
    doLogin();
  }
});
document.getElementById("loginEmail").addEventListener("keydown", p3 => {
  if (p3.key === "Enter") {
    document.getElementById("loginPass").focus();
  }
});
async function doRegister() {
  const v6 = document.getElementById("regEmail").value.trim();
  const v7 = document.getElementById("regPass").value;
  const v8 = document.getElementById("regPass2").value;
  if (!v6 || !v7 || !v8) {
    msgReg.textContent = "املأ كل الخانات";
    msgReg.className = "msg bad";
    return;
  }
  if (v7 !== v8) {
    msgReg.textContent = "الباسورد وتأكيده مش متطابقين";
    msgReg.className = "msg bad";
    return;
  }
  msgReg.textContent = "جاري إنشاء الحساب...";
  msgReg.className = "msg info";
  const v9 = await window.api.register(v6, v7);
  if (v9.ok) {
    msgReg.textContent = "تم إنشاء حسابك! جاري فتح البرنامج...";
    msgReg.className = "msg ok";
    setTimeout(() => window.api.closeLicenseAndOpenMain(), 700);
  } else {
    msgReg.textContent = v9.reason || "تعذر التسجيل";
    msgReg.className = "msg bad";
  }
}
document.getElementById("regBtn").addEventListener("click", doRegister);
document.getElementById("regPass2").addEventListener("keydown", p4 => {
  if (p4.key === "Enter") {
    doRegister();
  }
});
window.showForgot = () => {
  const v10 = document.getElementById("forgotBox");
  const v11 = v10.style.display === "none";
  v10.style.display = v11 ? "" : "none";
  if (v11) {
    document.getElementById("forgotEmail").value = document.getElementById("loginEmail").value;
  }
};
document.getElementById("forgotBtn").addEventListener("click", async () => {
  const v12 = document.getElementById("forgotEmail").value.trim();
  const v13 = document.getElementById("msgForgot");
  if (!v12) {
    v13.textContent = "اكتب الإيميل";
    v13.className = "msg bad";
    return;
  }
  v13.textContent = "جاري الإرسال...";
  v13.className = "msg info";
  const v14 = await window.api.sendPasswordReset(v12);
  if (v14.ok) {
    v13.textContent = "اتبعت! 📧 افتح إيميلك ودوس على اللينك وغير الباسورد، وبعدين ارجع سجّل دخول";
    v13.className = "msg ok";
  } else {
    v13.textContent = v14.reason || "تعذر الإرسال";
    v13.className = "msg bad";
  }
});
document.getElementById("walletNum").addEventListener("click", () => {
  const v15 = paymentLinks.vodafoneCash || "01558345646";
  window.api.copyText(v15);
});
document.getElementById("patreonBtn").addEventListener("click", () => {
  const patreonLink = paymentLinks.patreonUrl;
  if (patreonLink) {
    window.api.openExternal(patreonLink);
  } else {
    msgLogin.textContent = "روابط الدفع لسه متظبطتش — تواصل مع الدعم";
    msgLogin.className = "msg bad";
    switchTab("login");
  }
});
document.getElementById("discordLink").addEventListener("click", () => {
  window.api.openExternal("https://discordapp.com/users/860940128939409408");
});
(async () => {
  try {
    paymentLinks = (await window.api.getPaymentLinks()) || paymentLinks;
    if (paymentLinks.vodafoneCash) {
      document.getElementById("walletNum").textContent = paymentLinks.vodafoneCash;
    }
    // زرار باتريون بيظهر بس لما اللينك يكون متسجل في الإعدادات
    if (paymentLinks.patreonUrl) {
      document.getElementById("patreonBtn").style.display = "";
      document.getElementById("patreonNote").style.display = "";
    }
  } catch (e) {}
})();

// ===== إظهار / إخفاء الباسورد (زرار العين) =====
document.querySelectorAll(".eye-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "🙈" : "👁";
    input.focus();
  });
});