// ==========================================================================
// Aifangkids 官網明細頁核心邏輯控制 (js/detail.js)
// ==========================================================================

// 全局變數：用來儲存從雲端撈出來的原始商品資料
let currentOrderItems = []; 
let currentCustomerId = "";

document.addEventListener("DOMContentLoaded", () => {
    // 1. 從網址取得客人的識別 ID (afID 或 LINE 名稱)
    currentCustomerId = AifangAPI.getURLParameter("id");
    
    if (!currentCustomerId) {
        alert("未偵測到您的訂單編號，將為您導回首頁。");
        window.location.href = "index.html";
        return;
    }

    // 2. 顯示訂單編號在網頁畫面上
    const customerIdEl = document.getElementById("customer-id-text");
    if (customerIdEl) customerIdEl.innerText = currentCustomerId;

    // 📌 4. 隨機挑選一張小海豹圖片，替換掉標題前面的圖示
    const sealImages = [
        "images/ui/seal1.png",
        "images/ui/seal2.png",
        "images/ui/seal3.png",
        "images/ui/seal4.png"
    ];
    const randomIndex = Math.floor(Math.random() * sealImages.length);
    const sealImgEl = document.getElementById("title-random-seal");
    if (sealImgEl) {
        sealImgEl.src = sealImages[randomIndex];
    }

    // 3. 正式向後台撈取資料
    fetchAndRenderPendingItems();
});

/**
 * 從 後台 撈取【待核對商品表】並渲染畫面
 */
async function fetchAndRenderPendingItems() {
    const loadingEl = document.getElementById("loading-spinner");
    const container = document.getElementById("product-list-container");
    
    if (loadingEl) loadingEl.style.display = "block";
    if (container) container.innerHTML = "";

    try {
        const res = await AifangAPI.getPendingItems(currentCustomerId);
        
        if (loadingEl) loadingEl.style.display = "none";

        if (res.success && res.data.length > 0) {
            currentOrderItems = res.data;
            // 渲染商品卡片
            renderProductCards(currentOrderItems);
            // 渲染完成後，立刻計算一次總金額與件數
            updateSummaryAndCartState();
        } else {
            if (container) {
                container.innerHTML = `
                    <div class="no-data-alert">
                        🧸 嗨！目前查無此訂單編號。<br>
                        您的商品資料還未處理喔！<br>
                        如有疑問請通知 LINE 官方客服協助。
                    </div>
                `;
            }
            disableCheckoutButton();
        }
    } catch (err) {
        console.error("撈取明細發生錯誤:", err);
        if (loadingEl) loadingEl.style.display = "none";
        alert("連線失敗，請重新整理網頁再試一次唷！");
    }
}

/**
 * 依據資料陣列，動態組裝 HTML 商品卡片（已移除悄悄話備註欄）
 */
function renderProductCards(items) {
    const container = document.getElementById("product-list-container");
    if (!container) return;

    let html = "";
    items.forEach((item, index) => {
        // 防止沒有圖片時破圖，給予一張優雅的預設愛心或暖色占位圖
        const imgUrl = item.imgUrl ? item.imgUrl : 'images/ui/seal4.png';

        html += `
            <div class="prod-card" data-index="${index}">
                <div class="card-checkbox-wrapper">
                    <input type="checkbox" class="prod-checkbox" checked onchange="updateSummaryAndCartState()">
                </div>

                <div class="prod-img-wrapper">
                    <img src="${imgUrl}" alt="${item.prodName}" onerror="this.src='images/ui/seal4.png'">
                </div>

                <div class="prod-details">
                    <h3 class="prod-title">${item.prodName}</h3>
                    <div class="prod-spec">
                        <span class="spec-tag">編號: ${item.prodId}</span>
                        <span class="spec-tag">規格: ${item.color} / ${item.size}</span>
                    </div>
                    <div class="prod-price-row">
                        <span class="prod-price">NT$ ${item.price}</span>
                        <div class="qty-counter">
                            <button type="button" class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                            <input type="number" class="qty-input" value="${item.quantity}" min="1" readonly>
                            <button type="button" class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                        </div>
                    </div>
                </div>

                <button type="button" class="delete-card-btn" onclick="deleteItemFromServer(${index})">×</button>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * 點擊 + 或 - 時觸發的即時變更
 */
async function changeQty(index, delta) {
    const card = document.querySelector(`.prod-card[data-index="${index}"]`);
    if (!card) return;

    const qtyInput = card.querySelector(".qty-input");
    let currentQty = parseInt(qtyInput.value);
    let newQty = currentQty + delta;

    if (newQty < 1) {
        alert("數量至少要 1 件唷！如果不想購買此件，可以直接點擊右上角的刪除。");
        return;
    }

    // 貼心防呆優化：如果客人在沒勾選狀態下按了加減，自動幫他把 Checkbox 重新勾選
    const checkbox = card.querySelector(".prod-checkbox");
    if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
    }

    // 1. 先更新前台畫面與記憶體資料
    qtyInput.value = newQty;
    currentOrderItems[index].quantity = newQty;
    updateSummaryAndCartState();

    // 2. 即時呼叫 api.js 同步至 Google 試算表後台
    const updatePayload = [{
        orderId: currentOrderItems[index].orderId,
        prodId: currentOrderItems[index].prodId,
        color: currentOrderItems[index].color,
        size: currentOrderItems[index].size,
        quantity: newQty,
        note: currentOrderItems[index].note || "" // 雖然前台拿掉，但後台原本有的備註仍幫妳保留同步
    }];

    // 異步在背景更新，不阻礙客人操作
    AifangAPI.updatePendingData(updatePayload, []);
}

/**
 * 點擊右上角叉叉，直接從雲端試算表「完全刪除」該列資料
 */
async function deleteItemFromServer(index) {
    const item = currentOrderItems[index];
    const confirmDelete = confirm(`確定不要這件「${item.prodName} (${item.color}/${item.size})」了嗎？`);
    if (!confirmDelete) return;

    // 獲取該卡片元件並加上淡出動畫特效
    const card = document.querySelector(`.prod-card[data-index="${index}"]`);
    if (card) {
        card.style.opacity = "0.3";
        card.style.pointerEvents = "none";
    }

    try {
        // 傳送 rowNum 到後台進行刪除
        const res = await AifangAPI.updatePendingData([], [item.rowNum]);
        
        if (res.success) {
            // 重新後台拉取最新狀態，確保 rowNum 列號物理校正不衝突
            fetchAndRenderPendingItems();
        } else {
            alert("刪除失敗，請重新整理網頁再試。");
            if (card) {
                card.style.opacity = "1";
                card.style.pointerEvents = "auto";
            }
        }
    } catch (err) {
        console.error("刪除品項發生錯誤:", err);
        alert("網路異常，無法刪除。");
    }
}

/**
 * 核心計算機：掃描畫面上所有「有被勾選」的卡片，重新計算總件數與總金額
 */
function updateSummaryAndCartState() {
    let totalQty = 0;
    let totalAmount = 0;
    let checkedCount = 0;

    const cards = document.querySelectorAll(".prod-card");
    cards.forEach(card => {
        const index = parseInt(card.getAttribute("data-index"));
        const checkbox = card.querySelector(".prod-checkbox");
        const qtyInput = card.querySelector(".qty-input");

        if (checkbox && checkbox.checked && qtyInput) {
            const qty = parseInt(qtyInput.value);
            const price = currentOrderItems[index].price;
            
            totalQty += qty;
            totalAmount += (price * qty);
            checkedCount++;
        }
    });

    // 更新下方固定欄位的資訊
    const totalQtyEl = document.getElementById("summary-total-qty");
    const totalAmountEl = document.getElementById("summary-total-amount");
    
    if (totalQtyEl) totalQtyEl.innerText = totalQty;
    if (totalAmountEl) totalAmountEl.innerText = totalAmount.toLocaleString();

    // 📌 修正：只控制按鈕開關，不碰內文圖片！
    const checkoutBtn = document.getElementById("goto-checkout-btn");
    if (checkoutBtn) {
        if (checkedCount === 0) {
            checkoutBtn.disabled = true; // 啟用 CSS 的變淡防呆效果
        } else {
            checkoutBtn.disabled = false; // 恢復正常亮度與點擊功能
        }
    }
}

/**
 * 查無商品資料時的按鈕防呆
 */
function disableCheckoutButton() {
    const checkoutBtn = document.getElementById("goto-checkout-btn");
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
    }
}

/**
 * 按下大粉紅結帳按鈕：將有勾選的商品打包進快取，跳轉到下一頁 cart.html
 */
function proceedToCheckout() {
    const finalCartItems = [];
    const cards = document.querySelectorAll(".prod-card");

    cards.forEach(card => {
        const checkbox = card.querySelector(".prod-checkbox");
        if (checkbox && checkbox.checked) {
            const index = parseInt(card.getAttribute("data-index"));
            finalCartItems.push(currentOrderItems[index]);
        }
    });

    if (finalCartItems.length === 0) {
        alert("請至少勾選一件欲購買的衣服唷！");
        return;
    }

    // 📌 將這筆訂單最核心的資料打包存進 localStorage 暫存區，傳給 cart.html
    localStorage.setItem("aifang_orderId", currentCustomerId);
    localStorage.setItem("aifang_checkout_items", JSON.stringify(finalCartItems));

    // 順利出發前往下一關：填寫物流收件與匯款後五碼！
    window.location.href = "cart.html";
}