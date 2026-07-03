/**
 * 🧸 璦坊童裝 AiFang Studio —— 購物車結帳大腦 (cart.js)
 */

const GLOBAL_GAS_URL = "https://script.google.com/macros/s/AKfycbwrIptncgsBt4hAiRDniddghritIT8U9SXRvu8rTSY-t-LWYk4HoC7iQ_hGtaJLYIl5/exec";

let currentAfid = "";
let cartItems = [];

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentAfid = urlParams.get('afid') || urlParams.get('uid');

    if (!currentAfid) {
        alert("🧸 偵測不到您的專屬單號，請由商品選單頁面的購物車按鈕進入");
        return;
    }

    const idBadge = document.getElementById("display-afid");
    if (idBadge) idBadge.innerText = currentAfid;

    // STREAMING_CHUNK:Latching fetch cart item queue...
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
        cartList.innerHTML = `<p class="error-msg">無法連線至資料庫，請確認網路連線狀態！</p>`;
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
        cartList.innerHTML = `<div class="empty-cart">您的購物車目前空空如也唷 🧸</div>`;
        if (btnSubmit) btnSubmit.disabled = true;
        txtSubtotal.innerText = "0";
        txtGrandTotal.innerText = "0";
        return;
    }

    if (btnSubmit) btnSubmit.disabled = false;

    // STREAMING_CHUNK:Looping through active cart item array...
    cartItems.forEach(item => {
        totalSum += Number(item.total || 0);

        const itemCard = document.createElement("div");
        itemCard.className = "cart-item-card";

        const imgBox = document.createElement("div");
        imgBox.className = "item-img-box";
        const img = document.createElement("img");
        img.src = item.imagemain || "images/products/default.jpg";
        img.alt = item.code;
        imgBox.appendChild(img);

        const infoBox = document.createElement("div");
        infoBox.className = "item-details";
        infoBox.innerHTML = `
            <div class="item-code">${item.code}</div>
            <div class="item-spec">規格：${item.color} / ${item.size}</div>
            <div class="item-price">單價：NT$ ${Number(item.price).toLocaleString()}</div>
            <div class="item-qty">數量：${item.qty} 件</div>
        `;

        const totalBox = document.createElement("div");
        totalBox.className = "item-total-box";
        totalBox.innerHTML = `NT$ ${Number(item.total).toLocaleString()}`;

        itemCard.appendChild(imgBox);
        itemCard.appendChild(infoBox);
        itemCard.appendChild(totalBox);
        cartList.appendChild(itemCard);
    });

    txtSubtotal.innerText = totalSum.toLocaleString();
    txtGrandTotal.innerText = totalSum.toLocaleString();
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

// STREAMING_CHUNK:Submitting clean order form to GAS...
async function handleOrderSubmit(e) {
    e.preventDefault();

    const btnSubmit = document.getElementById("btn-submit-order");
    if (!currentAfid) {
        alert("專屬單號遺失，無法完成結帳。");
        return;
    }

    const lineVal = document.getElementById("input-line").value.trim();
    const nameVal = document.getElementById("input-name").value.trim();
    const phoneRaw = document.getElementById("input-phone").value.trim();
    const emailVal = document.getElementById("input-email").value.trim();
    const shippingVal = document.getElementById("select-shipping").value;
    const storeVal = document.getElementById("input-store").value.trim();
    
    const lastfiveVal = document.getElementById("ipt-lastFive").value.trim();

    const purePhone = phoneRaw.replace(/\D/g, "");
    if (purePhone.length !== 10 || !purePhone.startsWith("09")) {
        alert("⚠️ 請填寫正確的 10 位數手機號碼（格式如：0912345678）");
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerText = "正在為您向韓國追加登記中...";

    const payload = {
        action: "submitOrder",
        afid: currentAfid,
        line: lineVal,
        name: nameVal,
        phone: phoneRaw,
        email: emailVal,
        shipping: shippingVal,
        store: storeVal,
        lastfive: lastfiveVal
    };

    try {
        const response = await fetch(GLOBAL_GAS_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });

        const resData = await response.json();

        if (resData.success) {
            alert(`🧸 恭喜您！訂單順利成立！\n\n為您排入追加排程。後續您可以利用專屬單號【${currentAfid}】至查詢頁面追蹤進度與補填匯款後五碼`);
            cartItems = [];
            renderCartList();
            document.getElementById("order-form").reset();
        } else {
            alert("結帳失敗，請聯繫 LINE 官方客服協助處理：" + resData.message);
        }
    } catch (err) {
        console.error("發送結帳請求失敗:", err);
        alert("連線發生錯誤，請檢查網路狀態後再試一次！");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "🛒 確認完成訂單";
    }
}