// ==========================================================================
// 璦坊童裝 AiFang Studio - 購物車核心交互控制 (完全對齊 LocalStorage 與 GAS 版)
// ==========================================================================

// 串接老闆娘專屬的 Google Apps Script 後台網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwgwzu96gbL1s2b7ZPVOiPJZDaBRHrx2K0zXYT5fblENjKJBYDa6v9O2gnkBuIEuXcMyQ/exec";

// 真正從瀏覽器緩存庫撈取資料，若無資料則初始化為空陣列
let cartDatabase = [];
try {
    cartDatabase = JSON.parse(localStorage.getItem('cart')) || [];
} catch (e) {
    console.error("讀取瀏覽器購物車資料失敗：", e);
    cartDatabase = [];
}

// 初始化載入
document.addEventListener("DOMContentLoaded", () => {
    renderCartSystem();
    
    // 綁定確認送出訂單點擊事件
    const submitBtn = document.getElementById("btn-submit-order");
    if (submitBtn) {
        submitBtn.addEventListener("click", submitOrderToGAS);
    }
});

// ==========================================================================
// 【核心渲染功能】雙邊同步繪製與即時價格計算
// ==========================================================================
function renderCartSystem() {
    const summaryContainer = document.getElementById("summary-items-container");
    const detailContainer = document.getElementById("detail-items-container");

    if (!summaryContainer || !detailContainer) return;

    // 清空舊畫面
    summaryContainer.innerHTML = "";
    detailContainer.innerHTML = "";

    // 完美保留闆娘的魔法咒語
    if (cartDatabase.length === 0) {
        summaryContainer.innerHTML = `<p style="text-align:center; padding: 20px 0;">MP不足，需要喝點 MP 藥水</p>`;
        detailContainer.innerHTML = `<p style="text-align:center; padding: 20px 0;">噗嚕嚕噗魯，發咪發咪發！</p>`;
        document.getElementById("order-total-price").innerText = "NT$ 0";
        return;
    }

    let currentTotal = 0;

    cartDatabase.forEach((item, index) => {
        // 累加總金額
        currentTotal += item.unitprice * item.quantity;

        // A. 渲染右上方：商品小計計算便籤 (code name - quantity + unitprice)
        const summaryRow = document.createElement("div");
        summaryRow.className = "summary-item-row";
        summaryRow.innerHTML = `
            <div class="item-meta-txt">
                <strong>${item.codename || item.code}</strong> - ${item.name} <br>
                <span style="color:#888;">NT$ ${item.unitprice}</span>
            </div>
            <div class="quantity-control-set">
                <button class="qty-btn" onclick="updateQty(${index}, -1)">-</button>
                <span style="font-weight: bold; width: 20px; text-align: center;">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQty(${index}, 1)">+</button>
                <button class="qty-btn" style="border-color:#f2a6b2; color:#f2a6b2; margin-left: 10px;" onclick="deleteItem(${index})">✕</button>
            </div>
        `;
        summaryContainer.appendChild(summaryRow);

        // B. 渲染右下方：商品詳細薄荷綠圖文便籤 (imagemain code name color size)
        const detailCard = document.createElement("div");
        detailCard.className = "detail-item-card";
        detailCard.innerHTML = `
            <img src="${item.imagemain}" alt="${item.name}" class="detail-card-img" onerror="this.src='images/products/default.jpg'">
            <div class="detail-card-info">
                <div class="detail-card-name">${item.codename || item.code} ${item.name}</div>
                <div class="detail-card-specs">
                    顏色：${item.color} ${item.koreancolor ? `(${item.koreancolor})` : ''} <br>
                    尺寸：${item.size} 號
                </div>
            </div>
        `;
        detailContainer.appendChild(detailCard);
    });

    // 格式化輸出總金額 NT$
    document.getElementById("order-total-price").innerText = `NT$ ${currentTotal}`;
}

// ==========================================================================
// 【即時加減與刪除邏輯】同步回存 LocalStorage
// ==========================================================================
window.updateQty = function(index, change) {
    cartDatabase[index].quantity += change;
    if (cartDatabase[index].quantity < 1) {
        cartDatabase[index].quantity = 1; // 防呆：最少需要 1 件衣服
    }
    saveCartAndRefresh();
};

window.deleteItem = function(index) {
    cartDatabase.splice(index, 1);
    saveCartAndRefresh();
};

function saveCartAndRefresh() {
    localStorage.setItem('cart', JSON.stringify(cartDatabase));
    renderCartSystem();
}

// ==========================================================================
// 【表單打包送出】完全對齊 code.gs 後台接收名稱 (order_data + items)
// ==========================================================================
function submitOrderToGAS() {
    const form = document.getElementById("checkout-form");
    if (!form || !form.checkValidity()) {
        alert("訂單資訊尚未完成");
        if (form) form.reportValidity();
        return;
    }

    if (cartDatabase.length === 0) {
        alert("沒有預購商品，無法送出");
        return;
    }

    // 生成唯一的訂單編號與時間戳記
    const generatedOrderId = "AF" + Date.now();
    const todayDate = new Date().toISOString().split('T')[0];
    
    // 計算總金額
    let finalTotal = cartDatabase.reduce((sum, item) => sum + (item.unitprice * item.quantity), 0);
    
    // 🚀【破案修正點】：大包裹欄位名稱完美對齊 code.gs 的 payload.order_data 與 payload.items
    const payload = {
        order_data: {
            orderid: generatedOrderId,
            orderdate: todayDate,
            orderstatus: "處理中",
            customername: document.getElementById("customername").value,
            customeremail: document.getElementById("customeremail").value,
            total: finalTotal,
            shipping: document.getElementById("shipping").value,
            phone: document.getElementById("phone").value // 雖然試算表沒存，但依然傳輸備用
        },
        items: cartDatabase.map(item => ({
            orderid: generatedOrderId,
            code: item.codename || item.code, // 🚀 修正點：對齊 code.gs 找的 item.code 欄位
            name: item.name,
            color: item.color,
            koreanname: item.koreanname || "",
            koreancolor: item.koreancolor || "",
            size: item.size,
            quantity: item.quantity,
            unitprice: item.unitprice
        }))
    };

    alert("在愛與勇氣以及希望的名義之下，魔法寶貝神聖誕生 ✨");

    // Fetch 非同步發送給後台
    fetch(GAS_API_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })
    .then(() => {
        alert("🐻 魔法詠唱成功，已送出訂單");
        
        // 成功後清空前台購物車緩存
        cartDatabase = [];
        localStorage.removeItem('cart');
        renderCartSystem();
        form.reset();
    })
    .catch(error => {
        console.error("提交失敗：", error);
        alert("🐻 魔法詠唱中斷，請檢查網路");
    });
}