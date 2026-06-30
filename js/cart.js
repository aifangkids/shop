// 全局變數
let checkoutItems = [];
let orderId = "";
let totalAmount = 0;
let totalQty = 0;

document.addEventListener("DOMContentLoaded", () => {
    // 1. 從 localStorage 讀取前一頁打包過來的核心商品資料與訂單 ID
    orderId = localStorage.getItem("aifang_orderId");
    const cachedItems = localStorage.getItem("aifang_checkout_items");

    if (!orderId || !cachedItems) {
        alert("未偵測到結帳商品資訊，將為您導回首頁。");
        window.location.href = "index.html";
        return;
    }

    checkoutItems = JSON.parse(cachedItems);

    // 2. 畫面上方顯示訂單 ID (例如 afID)
    const orderIdEl = document.getElementById("checkout-order-id");
    if (orderIdEl) orderIdEl.innerText = orderId;

    // 3. 渲染右側或上方的「本次結帳商品明細小卡」
    renderCheckoutSummaryList();

    // 4. 計算總金額與總件數 (無運費規則)
    updateCheckoutPrice();

    // 5. 監聽物流切換事件（切換 7-11 或 全家 門市輸入框）
    setupShippingToggle();
});

/**
 * 縮小版商品明細清單渲染（單純複查）
 */
function renderCheckoutSummaryList() {
    const listContainer = document.getElementById("checkout-summary-list");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    checkoutItems.forEach(item => {
        const miniCard = document.createElement("div");
        miniCard.className = "mini-prod-item";

        // 處理預設圖片防呆
        const imgUrl = item.imgUrl && item.imgUrl.startsWith("http") ? item.imgUrl : "images/ui/seal3.png";

        miniCard.innerHTML = `
            <img src="${imgUrl}" alt="${item.prodName}" class="mini-prod-img">
            <div class="mini-prod-info">
                <div class="mini-title" title="${item.prodName}">${item.prodName}</div>
                <div class="mini-spec">${item.color} / ${item.size} × ${item.quantity} 件</div>
            </div>
            <div class="mini-price">NT$ ${(item.price * item.quantity).toLocaleString()}</div>
        `;
        listContainer.appendChild(miniCard);
    });
}

/**
 * 計算並更新結帳金額明細
 */
function updateCheckoutPrice() {
    totalAmount = 0;
    totalQty = 0;

    checkoutItems.forEach(item => {
        totalQty += item.quantity;
        totalAmount += (item.price * item.quantity);
    });

    const subtotalEl = document.getElementById("summary-items-subtotal");
    const totalEl = document.getElementById("summary-final-total");

    if (subtotalEl) subtotalEl.innerText = `NT$ ${totalAmount.toLocaleString()}`;
    if (totalEl) totalEl.innerText = `NT$ ${totalAmount.toLocaleString()}`;
}

/**
 * 控制 7-11 與 全家 物流輸入欄位的顯示與隱藏
 */
function setupShippingToggle() {
    const ship711Radio = document.getElementById("ship-711");
    const shipFamilyRadio = document.getElementById("ship-family");
    const sec711 = document.getElementById("section-711-store");
    const secFamily = document.getElementById("section-family-store");

    if (!ship711Radio || !shipFamilyRadio) return;

    const toggleLogisticsFields = () => {
        if (ship711Radio.checked) {
            if (sec711) sec711.style.display = "block";
            if (secFamily) secFamily.style.display = "none";
            // 切換時清除另一邊的必填屬性防呆
            setInputsRequired(sec711, true);
            setInputsRequired(secFamily, false);
        } else {
            if (sec711) sec711.style.display = "none";
            if (secFamily) secFamily.style.display = "block";
            setInputsRequired(sec711, false);
            setInputsRequired(secFamily, true);
        }
    };

    ship711Radio.addEventListener("change", toggleLogisticsFields);
    shipFamilyRadio.addEventListener("change", toggleLogisticsFields);

    // 初始執行一次設定
    toggleLogisticsFields();
}

/**
 * 輔助工具：動態設定特定容器內輸入框的 required 屬性
 */
function setInputsRequired(container, isRequired) {
    if (!container) return;
    const inputs = container.querySelectorAll("input");
    inputs.forEach(input => {
        if (isRequired) {
            input.setAttribute("required", "required");
        } else {
            input.removeAttribute("required");
            input.value = ""; // 切換時順便清空隱藏欄位的值
        }
    });
}

/**
 * 表單提交核心控制邏輯
 */
async function submitOrderForm(event) {
    event.preventDefault(); // 阻擋表單預設跳轉

    const submitBtn = document.getElementById("submit-order-btn");
    
    // 1. 讀取並清除前後空白欄位值
    const lineName = document.getElementById("client-line-name").value.trim();
    const receiverName = document.getElementById("receiver-name").value.trim();
    const receiverPhone = document.getElementById("receiver-phone").value.trim();
    const clientEmail = document.getElementById("client-email").value.trim();
    const bankLast5 = document.getElementById("bank-last5").value.trim();

    // 2. 表單格式基礎防呆
    if (!/^\d{5}$/.test(bankLast5)) {
        alert("請確認匯款帳號後五碼是否為 5 位純數字");
        return;
    }
    if (!/^09\d{8}$/.test(receiverPhone)) {
        alert("請確認收件人手機號碼格式是否正確（例：0912345678）");
        return;
    }

    // 收集物流門市資訊
    let logistics = "7-11 店到店";
    let storeInfo = "";

    if (document.getElementById("ship-711").checked) {
        const sName = document.getElementById("store-711-name").value.trim();
        const sCode = document.getElementById("store-711-code").value.trim();
        if (!sName || !sCode) {
            alert("請完整填寫 7-11 門市名稱與 6 位數店號");
            return;
        }
        storeInfo = `${sName} (店號:${sCode})`;
    } else {
        logistics = "全家 店到店";
        const sName = document.getElementById("store-family-name").value.trim();
        const sCode = document.getElementById("store-family-code").value.trim();
        if (!sName || !sCode) {
            alert("請完整填寫全家門市名稱與 5 位數服務代號");
            return;
        }
        storeInfo = `${sName} (代號:${sCode})`;
    }

    // 鎖定提交按鈕，避免重複點擊
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "訂單傳送中，請稍候...";
    }

    // 3. 完美打包符合後台 code.gs 期待的物件結構
    const orderPayload = {
        action: "submitOrder",
        orderId: orderId, 
        checkoutInfo: {
            lineName: lineName,
            receiverName: receiverName,
            phone: receiverPhone,
            email: clientEmail || "-", 
            logistics: logistics,
            storeInfo: storeInfo,
            lastFive: bankLast5
        },
        finalItems: checkoutItems
    };
    
    try {
        // 呼叫 api.js 的送出訂單功能
        const res = await AifangAPI.submitFinalOrder(orderPayload);
        
        if (res.success) {
            // 清除暫存
            localStorage.removeItem("aifang_checkout_items");
            alert("感謝您的購買！訂單與匯款資料已成功送達後台，AIFANG KIDS 會盡快為您處理 🧸");
            window.location.href = "thankyou.html"; 
        } else {
            alert(`傳送失敗：${res.message || '請通知 LINE 官方客服'}`);
            resetSubmitButton();
        }
    } catch (err) {
        console.error("提交表單發生連線錯誤:", err);
        alert("網路連線不穩定，請再點擊一次按鈕試試看");
        resetSubmitButton();
    }
}

/**
 * 重設提交按鈕狀態（失敗時復原）
 */
function resetSubmitButton() {
    const submitBtn = document.getElementById("submit-order-btn");
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "確認無誤，提交系統核對";
    }
}