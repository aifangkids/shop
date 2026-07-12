const GLOBAL_GAS_URL = "https://script.google.com/macros/s/AKfycbwrIptncgsBt4hAiRDniddghritIT8U9SXRvu8rTSY-t-LWYk4HoC7iQ_hGtaJLYIl5/exec";

let currentAfid = "";
let cartItems = [];

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 🛠️ 智慧讀取邏輯：優先從網址，次之瀏覽器暫存
    let rawAfid = urlParams.get('afid') || urlParams.get('uid') || localStorage.getItem("aifang_afid");

    // 🛠️ 判定是否需要自動生成最新 8 位數純數字格式 (排除舊式超長 AF 格式)
    if (!rawAfid || rawAfid.startsWith("AF")) {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const randomNum = String(Math.floor(1000 + Math.random() * 9000)); // 4位隨機數
        currentAfid = `${month}${date}${randomNum}`; // 組合為 MMDDXXXX 8位純數字
        localStorage.setItem("aifang_afid", currentAfid);
    } else {
        currentAfid = rawAfid;
        localStorage.setItem("aifang_afid", currentAfid);
    }

    // 就地隱藏單號，直到結帳成功才顯示
    const idBadge = document.getElementById("display-afid");
    if (idBadge) idBadge.innerText = currentAfid;

    fetchCartItems();
    setupPhoneFormatter();

    const orderForm = document.getElementById("order-form");
    if (orderForm) {
        orderForm.addEventListener("submit", handleOrderSubmit);
    }
});

async function fetchCartItems() {
    const loadingBox = document.getElementById("cart-loading");
    const cartList = document.getElementById("cart-list");

    try {
        const targetUrl = `${GLOBAL_GAS_URL}?action=getCartItems&afid=${encodeURIComponent(currentAfid)}`;
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error("網路通訊異常");

        const result = await response.json();
        
        if (result.success && result.data) {
            cartItems = result.data;
            renderCartList();
        } else {
            cartList.innerHTML = `<p class="error-msg">購物車讀取失敗：${result.message}</p>`;
        }
    } catch (error) {
        console.error("讀取購物車失敗:", error);
        cartList.innerHTML = `<p class="error-msg">無法連線，請確認網路連線狀態！</p>`;
    } finally {
        if (loadingBox) loadingBox.style.display = "none";
    }
}

function renderCartList() {
    const cartList = document.getElementById("cart-list");
    const txtSubtotal = document.getElementById("text-subtotal");
    const txtGrandTotal = document.getElementById("text-grand-total");
    const btnSubmit = document.getElementById("btn-submit-order");

    cartList.innerHTML = "";
    let totalSum = 0;

    if (cartItems.length === 0) {
        cartList.innerHTML = `<div class="empty-cart" style="text-align:center; padding:30px; color:#8a7a71;">購物車內目前沒有商品</div>`;
        if (btnSubmit) btnSubmit.disabled = true;
        if (txtSubtotal) txtSubtotal.innerText = "0";
        if (txtGrandTotal) txtGrandTotal.innerText = "0";
        return;
    }

    if (btnSubmit) btnSubmit.disabled = false;

    cartItems.forEach((item, index) => {
        totalSum += Number(item.total || 0);

        const itemCard = document.createElement("div");
        itemCard.className = "cart-item-card";
        itemCard.style.position = "relative"; // 確保刪除鈕精準定位
        itemCard.innerHTML = `
            <div class="item-img-box">
                <img src="${item.imagemain || 'images/products/default.jpg'}" alt="${item.code}">
            </div>
            <div class="item-details">
                <div class="item-code">${item.code}</div>
                <div class="item-spec">規格：${item.color} / ${item.size}</div>
                <div class="item-price">單價：NT$ ${Number(item.price).toLocaleString()}</div>
                <div class="item-qty">數量：${item.qty} 件</div>
            </div>
            <div class="item-total-box">NT$ ${Number(item.total).toLocaleString()}</div>
            <button class="btn-delete-item" data-index="${index}" style="position:absolute; top:8px; right:8px; background:none; border:none; color:#c69774; font-size:18px; cursor:pointer; padding:4px; line-height:1;">☒</button>
        `;
        cartList.appendChild(itemCard);
    });

    if (txtSubtotal) txtSubtotal.innerText = totalSum.toLocaleString();
    if (txtGrandTotal) txtGrandTotal.innerText = totalSum.toLocaleString();

    // 綁定 ☒ 一鍵移除點擊邏輯（樂觀更新同步 GAS）
    document.querySelectorAll(".btn-delete-item").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const idx = e.target.getAttribute("data-index");
            const targetItem = cartItems[idx];
            
            // 1. 樂觀更新：前端先光速移除並重新渲染，讓媽媽體感零延遲
            cartItems.splice(idx, 1);
            renderCartList();

            // 2. 背景默默與 Google Apps Script 資料庫同步移除
            try {
                const delUrl = `${GLOBAL_GAS_URL}?action=deleteCartItem&afid=${encodeURIComponent(currentAfid)}&code=${encodeURIComponent(targetItem.code)}&color=${encodeURIComponent(targetItem.color)}&size=${encodeURIComponent(targetItem.size)}`;
                await fetch(delUrl);
            } catch (err) {
                console.error("後端同步移除失敗:", err);
            }
        });
    });
}

function setupPhoneFormatter() {
    const phoneInput = document.getElementById("input-phone");
    if (!phoneInput) return;

    phoneInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.startsWith("09")) {
            if (value.length > 4 && value.length <= 7) {
                value = value.replace(/(\d{4})(\d+)/, "$1-$2");
            } else if (value.length > 7) {
                value = value.replace(/(\d{4})(\d{3})(\d+)/, "$1-$2-$3");
            }
        }
        e.target.value = value;
    });
}

async function handleOrderSubmit(e) {
    e.preventDefault();

    const btnSubmit = document.getElementById("btn-submit-order");
    const purePhone = document.getElementById("input-phone").value.replace(/\D/g, "");
    
    if (purePhone.length !== 10 || !purePhone.startsWith("09")) {
        const errorTip = document.getElementById("phone-error-tip") || document.createElement("div");
        errorTip.id = "phone-error-tip";
        errorTip.style.color = "#d9534f";
        errorTip.style.fontSize = "12px";
        errorTip.style.marginTop = "4px";
        errorTip.innerText = "⚠️ 請填寫正確的 10 位數手機號碼（格式如：0912345678）";
        document.getElementById("input-phone").parentNode.appendChild(errorTip);
        return;
    }

    const payload = {
        action: "submitOrder",
        afid: currentAfid,
        line: document.getElementById("input-line").value.trim(),
        name: document.getElementById("input-name").value.trim(),
        phone: document.getElementById("input-phone").value.trim(),
        email: document.getElementById("input-email").value.trim(),
        shipping: document.getElementById("select-shipping").value,
        store: document.getElementById("input-store").value.trim(),
    };

    btnSubmit.disabled = true;
    btnSubmit.innerText = "訂單傳送至系統";

    try {
        const response = await fetch(GLOBAL_GAS_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });

        const resData = await response.json();

        if (resData.success) {
            // 🚀 華麗彈出精美收據 Modal 代替傳統 Alert 視窗
            const receiptModal = document.getElementById('receipt-modal') || document.getElementById('cart-preview-backdrop');
            if (receiptModal) {
                // 更新 Modal 內的收據資訊
                const modalList = document.getElementById("modal-item-list");
                if (modalList) {
                    modalList.innerHTML = `
                        <div style="text-align:center; padding:15px; background:#fbf8f6; border-radius:8px;">
                            <p style="font-size:16px; color:#c69774; font-weight:bold; margin-bottom:10px;">🎉 訂單順利成立</p>
                            <p style="font-size:13px; color:#5a4b41;">專屬訂單編號：</p>
                            <p id="final-copy-afid" style="font-size:22px; font-weight:bold; color:#b2825e; letter-spacing:1px; margin:10px 0; background:#fff; padding:8px; border:1px dashed #d1bca7; display:inline-block; border-radius:4px;">${currentAfid}</p>
                            <button id="btn-copy-afid" type="button" style="display:block; margin:5px auto 15px; padding:4px 12px; font-size:12px; background:#b2825e; color:#fff; border:none; border-radius:20px; cursor:pointer;">一鍵複製單號</button>
                            <p style="font-size:12px; color:#8a7a71; line-height:1.4;">後續可以至「查詢訂單」查看進度</p>
                        </div>
                    `;
                }
                
                // 顯示視窗
                receiptModal.classList.add("is-active");

                // 一鍵複製單號功能
                const copyBtn = document.getElementById("btn-copy-afid");
                if (copyBtn) {
                    copyBtn.addEventListener("click", () => {
                        navigator.clipboard.writeText(currentAfid).then(() => {
                            copyBtn.innerText = "✓ 複製成功";
                            copyBtn.style.background = "#8da994";
                        });
                    });
                }

                // 綁定收據視窗關閉或點擊後強制回到首頁並清除單號快取 [cite: 140]
                const closeBtn = receiptModal.querySelector("#modal-close-btn") || receiptModal;
                closeBtn.addEventListener("click", () => {
                    localStorage.removeItem("aifang_afid");
                    window.location.href = "index.html";
                });
                
                // 5秒後若未手動關閉，也安全自動跳轉
                setTimeout(() => {
                    localStorage.removeItem("aifang_afid");
                    window.location.href = "index.html";
                }, 8000);
            } else {
                // 如果沒有撈到 Modal 結構，則進行安全 fallback 跳轉
                localStorage.removeItem("aifang_afid");
                window.location.href = "index.html";
            }
        } 
    } catch (err) {
        console.error("發送結帳請求失敗:", err);
        btnSubmit.innerText = "💗 完成訂單";
        btnSubmit.disabled = false;
        alert("連線發生錯誤，請檢查網路狀態後再試一次！");
    }
}