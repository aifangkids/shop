// ==========================================================
// 🧸 Aifangkids 璦坊微型電商 - 選衣服頁前端大腦 (detail.js)
// ==========================================================

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwJ0ERb9MhwFqtkMSE9UpfcrtGB7tnnn7LoXYJwSCrCCzn40NubmxQZUCQWqgmMI64c/exec";

let clientUid = "";
let productCatalog = []; // 存放從試算表撈回來的衣服清單
let cartSelections = {}; // 存放買家選擇的規格數量，結構如：{ "P001": 2, "P002": 1 }

document.addEventListener("DOMContentLoaded", () => {
    // 1. 解析網址參數，取得客人的訂單編號
    const urlParams = new URLSearchParams(window.location.search);
    clientUid = urlParams.get("uid") || "";

    if (!clientUid) {
        alert("偵測不到您的專屬訂單編號，將為您導回首頁生成訂單編號");
        window.location.href = "index.html";
        return;
    }

    // 顯示編號於網頁頂部看板
    document.getElementById("txt-user-uid").innerText = clientUid;

    // 2. 向後台調度衣服資料
    fetchProducts();

    // 3. 綁定「前往購物車」按鈕點擊事件
    document.getElementById("btn-go-cart").addEventListener("click", submitSelectionsToPending);
});

/**
 * 從 GAS 撈取【商品上架總表】數據
 */
async function fetchProducts() {
    const loader = document.getElementById("catalog-loading");
    const emptyBox = document.getElementById("catalog-empty");
    const grid = document.getElementById("product-grid");

    try {
        const response = await fetch(`${GAS_API_URL}?action=getProducts`);
        if (!response.ok) throw new Error("讀取商品失敗");
        
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            productCatalog = result.data;
            renderProductGrid(productCatalog);
            
            // 翻開畫面
            loader.classList.add("hidden");
            grid.classList.remove("hidden");
            document.getElementById("sticky-cart-bar").removeProperty ? document.getElementById("sticky-cart-bar").style.removeProperty("display") : document.getElementById("sticky-cart-bar").classList.remove("hidden");
        } else {
            loader.classList.add("hidden");
            emptyBox.classList.remove("hidden");
        }
    } catch (error) {
        console.error("載入商品異常:", error);
        loader.innerHTML = "<p style='color:red;'>🐾 連線發生一點小問題，請重新整理網頁看看</p>";
    }
}

/**
 * 動態渲染衣服卡片到 HTML 裡面
 */
function renderProductGrid(products) {
    const grid = document.getElementById("product-grid");
    grid.innerHTML = ""; // 清空舊畫面

    products.forEach(item => {
        // 防止圖片網址為空，給予精緻的預設圖
        const displayImg = item.imgUrl && item.imgUrl.trim() !== "" ? item.imgUrl : "https://placehold.co/400x400/fdfaf7/8c7662?text=Aifangkids";
        
        const card = document.createElement("div");
        card.classList.add("product-card");
        
        card.innerHTML = `
            <div class="product-img-wrapper">
                <img class="product-img" src="${displayImg}" alt="${item.prodName}" onerror="this.src='https://placehold.co/400x400/fdfaf7/8c7662?text=Aifangkids'">
            </div>
            <div class="product-info">
                <h3 class="product-title">${item.prodName}</h3>
                <div class="product-spec">
                    ${item.color ? `<span class="badge-spec badge-color">${item.color}</span>` : ''}
                    ${item.size ? `<span class="badge-spec badge-size">${item.size}</span>` : ''}
                </div>
                <div class="product-price">$${item.price}</div>
                
                <div class="quantity-controller">
                    <button class="btn-stepper" onclick="updateQty('${item.prodId}', -1)">−</button>
                    <span id="qty-${item.prodId}" class="stepper-value">0</span>
                    <button class="btn-stepper" onclick="updateQty('${item.prodId}', 1)">+</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

/**
 * 點擊 ＋ 或 － 時更新畫面上與記憶體中的選購數量
 */
window.updateQty = function(prodId, change) {
    let currentQty = cartSelections[prodId] || 0;
    let newQty = currentQty + change;

    if (newQty < 0) newQty = 0; // 最少就是 0 件
    if (newQty > 10) {          // 貼心防呆，單一規格限制 10 件
        alert("寶貝的衣服同款同規格最多先選 10 件唷");
        return;
    }

    cartSelections[prodId] = newQty;
    
    // 更新該張卡片的計數器數字
    const qtyLabel = document.getElementById(`qty-${prodId}`);
    if (qtyLabel) qtyLabel.innerText = newQty;

    // 重新計算底部總件數
    calculateTotalQty();
};

/**
 * 計算當前累計點選了幾件衣服，並同步到浮動購物條
 */
function calculateTotalQty() {
    let total = 0;
    Object.keys(cartSelections).forEach(key => {
        total += cartSelections[key];
    });
    document.getElementById("total-qty-badge").innerText = total;
}

/**
 * 按下「前往購物車結帳」時，打包數據 POST 送回 GAS 暫存資料庫
 */
async function submitSelectionsToPending() {
    // 1. 篩選出真的有選數量的商品
    const selectedItems = [];
    
    productCatalog.forEach(product => {
        const qty = cartSelections[product.prodId] || 0;
        if (qty > 0) {
            selectedItems.push({
                prodId: product.prodId,
                prodName: product.prodName,
                color: product.color,
                size: product.size,
                price: product.price,
                quantity: qty,
                imgUrl: product.imgUrl,
                note: product.note,
                lineName: "" // 留待購物車頁填寫
            });
        }
    });

    if (selectedItems.length === 0) {
        alert("訂單中沒有任何衣服，趕快幫寶貝選一件 🧸");
        return;
    }

    // 2. 切換按鈕狀態防止重複點擊
    const btnGoCart = document.getElementById("btn-go-cart");
    btnGoCart.innerText = "🐾 正在為您打包中";
    btnGoCart.disabled = true;

    // 3. 籌備 POST 資料包
    const payload = {
        action: "addPending",
        uid: clientUid,
        items: selectedItems
    };

    try {
        const response = await fetch(GAS_API_URL, {
            method: "POST",
            mode: "cors",
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("後台儲存失敗");
        const result = await response.json();

        if (result.success) {
            // 4. 暫存成功，順暢帶著 uid 前往下一關購物車頁面
            window.location.href = `cart.html?uid=${clientUid}`;
        } else {
            alert("打包儲存時發生一點小狀況：" + result.message);
            btnGoCart.innerText = "🛒 前往購物車結帳 ➔";
            btnGoCart.disabled = false;
        }
    } catch (error) {
        console.error("提交暫存異常:", error);
        alert("連線後台逾時，請檢查手機網路是否穩定");
        btnGoCart.innerText = "🛒 前往購物車結帳 ➔";
        btnGoCart.disabled = false;
    }
}