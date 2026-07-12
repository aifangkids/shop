const GLOBAL_GAS_URL = "https://script.google.com/macros/s/AKfycbwrIptncgsBt4hAiRDniddghritIT8U9SXRvu8rTSY-t-LWYk4HoC7iQ_hGtaJLYIl5/exec";

let currentAfid = ""; 
let cartItems = [];
let allProductsRaw = []; 

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentAfid = urlParams.get('afid') || urlParams.get('uid') || "";

    setupPhoneFormatter();
    
    // 優先同步載入大庫商品資料，再載入購物車
    await fetchAllProducts();
    fetchCartItems();

    const orderForm = document.getElementById("order-form");
    if (orderForm) {
        orderForm.addEventListener("submit", handleOrderSubmit);
    }
});

/**
 * 載入商品大庫總表 (🎯 已修正 action 為 getProductCatalog)
 */
async function fetchAllProducts() {
    try {
        const response = await fetch(`${GLOBAL_GAS_URL}?action=getProductCatalog`);
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                allProductsRaw = result.data;
                console.log("🎯 大庫商品已成功載入，共計:", allProductsRaw.length, "筆");
            }
        }
    } catch (err) {
        console.error("載入大庫商品失敗:", err);
    }
}

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
        const itemPrice = Number(item.price || 0);
        const itemQty = Number(item.qty || 1);
        const itemTotal = Number(item.total || (itemPrice * itemQty));
        totalSum += itemTotal;

        // 精準尋找大庫對應的商品
        const rawProduct = allProductsRaw.find(p => p.code && item.code && p.code.toString().trim().toUpperCase() === item.code.toString().trim().toUpperCase());
        
        // 🎯【智慧雙重判定機制】
        let isSale = false;
        let rawPrice = itemPrice; 

        if (rawProduct) {
            rawPrice = Number(rawProduct.price || 0);
            const hasSaleCategory = rawProduct.category && rawProduct.category.toString().toUpperCase().includes("SALE");
            const hasPriceDifference = rawPrice > itemPrice;
            
            isSale = hasSaleCategory || hasPriceDifference;
        }

        const saleHint = isSale ? ` <span class="sale-tag">30% OFF</span>` : "";
        let priceDisplay = `NT$ ${itemPrice.toLocaleString()}`;
        let totalDisplay = `NT$ ${itemTotal.toLocaleString()}`;

        // 完美套用雙金額樣式 (單價與小計同步回溯原價)
        if (isSale) {
            const rawTotal = rawPrice * itemQty;
            priceDisplay = `<span class="price-original">NT$ ${rawPrice.toLocaleString()}</span><span class="price-sale">NT$ ${itemPrice.toLocaleString()}</span>`;
            totalDisplay = `<span class="price-original">NT$ ${rawTotal.toLocaleString()}</span><span class="price-sale">NT$ ${itemTotal.toLocaleString()}</span>`;
        }

        const itemCard = document.createElement("div");
        itemCard.className = "cart-item-card";
        itemCard.style.position = "relative";
        itemCard.innerHTML = `
            <div class="item-img-box">
                <img src="${item.imagemain || 'images/products/default.jpg'}" alt="${item.code}">
            </div>
            <div class="item-details">
                <div class="item-code">${item.code}${saleHint}</div>
                <div class="item-spec">規格：${item.color} / ${item.size}</div>
                <div class="item-price">單價：${priceDisplay}</div>
                <div class="item-qty">數量：${item.qty} 件</div>
            </div>
            <div class="item-total-box">${totalDisplay}</div>
            <button class="btn-delete-item" data-index="${index}" style="position:absolute; top:8px; right:8px; background:none; border:none; color:#c69774; font-size:18px; cursor:pointer; padding:4px; line-height:1;">☒</button>
        `;
        cartList.appendChild(itemCard);
    });

    if (txtSubtotal) txtSubtotal.innerText = totalSum.toLocaleString();
    if (txtGrandTotal) txtGrandTotal.innerText = totalSum.toLocaleString();

    document.querySelectorAll(".btn-delete-item").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const idx = e.target.getAttribute("data-index");
            const targetItem = cartItems[idx];
            
            cartItems.splice(idx, 1);
            renderCartList();

            try {
                // 🎯 已修正 action 為 deletePendingItem
                const delUrl = `${GLOBAL_GAS_URL}?action=deletePendingItem&afid=${encodeURIComponent(currentAfid)}&code=${encodeURIComponent(targetItem.code)}&color=${encodeURIComponent(targetItem.color)}&size=${encodeURIComponent(targetItem.size)}`;
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

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const randomNum = String(Math.floor(1000 + Math.random() * 9000));
    currentAfid = `${month}${date}${randomNum}`; 

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
    btnSubmit.innerText = "訂單傳送至系統...";

    try {
        const response = await fetch(GLOBAL_GAS_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });

        const resData = await response.json();

        if (resData.success) {
            let totalSum = cartItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
            showOrderSuccessModal(payload, totalSum);
        } else {
            btnSubmit.disabled = false;
            btnSubmit.innerText = "💗 完成訂單";
            alert("系統寫入失敗：" + resData.message);
        }
    } catch (err) {
        console.error("發送結帳請求失敗:", err);
        btnSubmit.innerText = "💗 完成訂單";
        btnSubmit.disabled = false;
        alert("連線發生錯誤，請檢查網路狀態後再試一次！");
    }
}

function showOrderSuccessModal(orderData, totalAmount) {
    const backdrop = document.createElement("div");
    backdrop.style.position = "fixed";
    backdrop.style.top = "0";
    backdrop.style.left = "0";
    backdrop.style.width = "100vw";
    backdrop.style.height = "100vh";
    backdrop.style.background = "rgba(0, 0, 0, 0.5)";
    backdrop.style.zIndex = "99999";
    backdrop.style.display = "flex";
    backdrop.style.alignItems = "center";
    backdrop.style.justifyContent = "center";
    backdrop.style.padding = "15px";
    backdrop.style.boxSizing = "border-box";

    let itemsHtml = "";
    cartItems.forEach(item => {
        const itemPrice = Number(item.price || 0);
        const itemQty = Number(item.qty || 1);
        const itemTotal = Number(item.total || (itemPrice * itemQty));

        const rawProduct = allProductsRaw.find(p => p.code && item.code && p.code.toString().trim().toUpperCase() === item.code.toString().trim().toUpperCase());
        
        let isSale = false;
        let rawPrice = itemPrice;
        if (rawProduct) {
            rawPrice = Number(rawProduct.price || 0);
            isSale = (rawProduct.category && rawProduct.category.toString().toUpperCase().includes("SALE")) || (rawPrice > itemPrice);
        }

        const saleHint = isSale ? ` <span class="sale-tag" style="font-size: 10px;">30% OFF</span>` : "";

        let totalDisplay = `NT$ ${itemTotal.toLocaleString()}`;
        if (isSale) {
            const rawTotal = rawPrice * itemQty;
            totalDisplay = `<span class="price-original" style="font-size:11px;">NT$ ${rawTotal.toLocaleString()}</span><span class="price-sale">NT$ ${itemTotal.toLocaleString()}</span>`;
        }

        itemsHtml += `
            <div style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px dashed #eee; font-size:12px; color:#5a4b41;">
                <img src="${item.imagemain || 'images/products/default.jpg'}" style="width:35px; height:35px; object-fit:cover; border-radius:4px; flex-shrink:0;">
                <div style="flex-grow:1; line-height:1.4;">
                    <b>${item.code}</b>${saleHint}<br>
                    ${item.color} / ${item.size} / ${item.qty}件
                </div>
                <div style="text-align:right;">${totalDisplay}</div>
            </div>
        `;
    });

    backdrop.innerHTML = `
        <div style="background:#fff; width:100%; max-width:420px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.15); overflow:hidden; display:flex; flex-direction:column; max-height:90vh; animation: fadeIn 0.3s ease;">
            <div style="background:#fbf8f6; padding:18px; text-align:center; border-bottom:1px solid #f0e6df; position:relative;">
                <div style="font-size:18px; color:#c69774; font-weight:bold;">已完成預購訂單</div>
                <div style="font-size:12px; color:#8a7a71; margin-top:4px;">成功將明細送至系統</div>
                <button id="modal-close-x" type="button" style="position:absolute; top:12px; right:15px; background:none; border:none; color:#999; font-size:22px; cursor:pointer; line-height:1; user-select:none; padding:4px;">☒</button>
            </div>
            <div style="padding:20px; overflow-y:auto; flex-grow:1; box-sizing:border-box;">
                <div style="text-align:center; background:#fffcf7; border:1px dashed #d1bca7; padding:12px; border-radius:8px; margin-bottom:15px;">
                    <span style="font-size:12px; color:#8a7a71;">您的專屬訂單編號</span>
                    <div id="success-afid-num" style="font-size:24px; font-weight:bold; color:#b2825e; letter-spacing:1px; margin:6px 0;">${orderData.afid}</div>
                    <button id="btn-modal-copy" type="button" style="background:#b2825e; color:#fff; border:none; padding:5px 14px; font-size:12px; border-radius:20px; cursor:pointer; font-weight:bold; transition:all 0.2s;">一鍵複製編號</button>
                </div>
                <div style="font-size:12px; color:#5a4b41; background:#fdfdfd; border:1px solid #eee; padding:12px; border-radius:8px; margin-bottom:15px; line-height:1.8;">
                    <div style="border-bottom:1px solid #f5f5f5; padding-bottom:4px; margin-bottom:4px; font-weight:bold; color:#b2825e;">收件人資料</div>
                    <div><b>收件人：</b>${orderData.name}</div>
                    <div><b>電話：</b>${orderData.phone}</div>
                    <div><b>LINE 名稱：</b>${orderData.line || "未填寫"}</div>
                    <div><b>E-mail：</b>${orderData.email || "未填寫"}</div>
                    <div><b>配送方式：</b>${orderData.shipping}</div>
                    <div><b>取件門市：</b>${orderData.store || "無"}</div>
                </div>
                <div style="background:#fff; border:1px solid #eee; padding:12px; border-radius:8px; box-sizing:border-box;">
                    <div style="font-weight:bold; color:#b2825e; font-size:12px; border-bottom:1px solid #f5f5f5; padding-bottom:4px; margin-bottom:4px;">訂購商品明細</div>
                    <div style="max-height:150px; overflow-y:auto; padding-right:4px;">
                        ${itemsHtml}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:13px; font-weight:bold; color:#5a4b41;">
                        <span>預購商品總額：</span>
                        <span style="color:#ff4d4f; font-size:16px;">NT$ ${totalAmount.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            <div style="background:#fbf8f6; padding:15px; text-align:center; border-top:1px solid #f0e6df;">
                <div style="font-size:12px; color:#8a7a71; margin-bottom:10px;">請複製單號妥善保存，確認無誤後即可關閉視窗。</div>
                <button id="btn-modal-gohome" type="button" style="width:100%; background:#c69774; color:#fff; border:none; padding:10px; font-size:14px; border-radius:6px; cursor:pointer; font-weight:bold;">完成並立即返回首頁 ➔</button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);

    const copyBtn = backdrop.querySelector("#btn-modal-copy");
    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(orderData.afid).then(() => {
                copyBtn.innerText = "✓ 複製成功";
                copyBtn.style.background = "#8da994";
                setTimeout(() => {
                    copyBtn.innerText = "一鍵複製單號";
                    copyBtn.style.background = "#b2825e";
                }, 2000);
            });
        });
    }

    function redirectToHome() {
        localStorage.removeItem("aifang_afid");
        window.location.href = "index.html";
    }

    backdrop.querySelector("#modal-close-x").addEventListener("click", redirectToHome);
    backdrop.querySelector("#btn-modal-gohome").addEventListener("click", redirectToHome);
}