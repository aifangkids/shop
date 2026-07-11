// 🎯 已自動校正為老闆娘最新的 GAS 正式後端網址
const GLOBAL_GAS_URL = "https://script.google.com/macros/s/AKfycbwrIptncgsBt4hAiRDniddghritIT8U9SXRvu8rTSY-t-LWYk4HoC7iQ_hGtaJLYIl5/exec";

let currentAfid = "";
let allProductsRaw = [];
let currentSelectedBrand = "ALL";
let currentPendingCartItems = []; // 儲存當前暫存車內的最新資料，與 modal 及 ☒ 共享

// 網頁載入完成後執行
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // 🛠️ 核心修改：優先嘗試從網址抓單號，抓不到就去客人的手機瀏覽器暫存（localStorage）撈取
    currentAfid = urlParams.get('uid') || urlParams.get('afid') || localStorage.getItem("aifang_afid"); 

    // 🛠️ 核心修改：如果連瀏覽器都沒有（代表是全新客人第一次進站），就在背景自動悄悄生成一個！
    if (!currentAfid) {
        currentAfid = "AF" + new Date().getTime(); // 利用時間戳記生成絕對不重複的編號
        localStorage.setItem("aifang_afid", currentAfid); // 存入瀏覽器，下次進站自動沿用
    } else {
        // 確保網址沒帶但 localStorage 有的時候，也同步更新快取，安全保險
        localStorage.setItem("aifang_afid", currentAfid);
    }

    // 🛠️ 核心修改：為了不讓客人看見編號，不論有沒有抓到，都強制把網頁上的單號標籤隱藏
    const idBadge = document.getElementById("display-afid");
    if (idBadge) {
        idBadge.innerText = currentAfid;
        idBadge.style.display = "none"; // 💡 畫面完全隱藏，不干擾視覺
    }
    
    // 如果有包裹編號的整個外層區塊（例如 block/div），也可以在這裡一併隱藏
    const idBadgeContainer = document.getElementById("afid-container"); // 視您的 HTML 結構而定
    if (idBadgeContainer) {
        idBadgeContainer.style.display = "none";
    }

    // 1. ⚡ 智慧緩存下載商品大庫 (0.1秒秒開)
    fetchProductCatalogWithCache();

    // 2. 📲 讀取底部預覽並初始化 (優先讀取一次)
    fetchAndRenderBottomPreview();

    setupMobileScrollMenu();

    // 3. 初始化動態寫入 🛒 暫存明細懸浮抽屜 (Modal) 結構
    initCartPreviewModal();

    const btnGoCart = document.getElementById("btn-go-cart");
    if (btnGoCart) {
        btnGoCart.addEventListener("click", () => {
            // 前往結帳頁面時，依然把這個 afid 帶過去給 cart.html 讀取
            window.location.href = `cart.html?afid=${currentAfid}`;
        });
    }
});

/**
 * 🎯 動態注入並初始化 🛒 暫存明細預覽懸浮窗 HTML 結構
 */
function initCartPreviewModal() {
    if (document.getElementById("cart-preview-backdrop")) return;
    const backdrop = document.createElement("div");
    backdrop.id = "cart-preview-backdrop";
    backdrop.className = "cart-preview-backdrop";
    backdrop.innerHTML = `
        <div class="cart-preview-modal" id="cart-preview-modal">
            <div class="modal-header">
                <div class="modal-title">購物車明細</div>
                <div class="modal-close-btn" id="modal-close-btn">☒</div>
            </div>
            <div class="modal-item-list" id="modal-item-list">
                </div>
            <div class="modal-total-section">
                <span><b>預購商品總額：</b></span>
                <span class="modal-total-price">NT$ <span id="modal-grand-total">0</span></span>
            </div>
        </div>
    `;
    document.body.appendChild(backdrop);

    // 點選背景遮罩與關閉按鈕收起視窗
    backdrop.addEventListener("click", () => backdrop.classList.remove("is-active"));
    const modalContent = backdrop.querySelector("#cart-preview-modal");
    modalContent.addEventListener("click", (e) => e.stopPropagation());
    const closeBtn = backdrop.querySelector("#modal-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => backdrop.classList.remove("is-active"));
}

/**
 * 展開暫存明細預覽彈窗
 */
function showCartPreviewModal() {
    const backdrop = document.getElementById('receipt-modal') || document.getElementById('cart-preview-backdrop');
    if (!backdrop) return;
    // 如果是舊有的 receipt-modal 邏輯，可安全避開或轉移
    if (backdrop.id === "receipt-modal") {
        const customBackdrop = document.getElementById("cart-preview-backdrop");
        if (customBackdrop) {
            renderModalItemList();
            customBackdrop.classList.add("is-active");
        }
    } else {
        renderModalItemList();
        backdrop.classList.add("is-active");
    }
}

/**
 * 渲染預覽視窗中的品項 (自動套用 SALE 計算完後的單價)
 */
function renderModalItemList() {
    const listContainer = document.getElementById("modal-item-list");
    const grandTotalSpan = document.getElementById("modal-grand-total");
    if (!listContainer) return;

    listContainer.innerHTML = "";
    let grandTotal = 0;
    if (currentPendingCartItems.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#5a4b41; font-size:13px;">購物車沒有商品</div>`;
        if (grandTotalSpan) grandTotalSpan.innerText = "0";
        return;
    }

    currentPendingCartItems.forEach((item, index) => {
        const itemPrice = Number(item.price || 0);
        const itemQty = Number(item.qty || 1);
        const itemTotal = Number(item.total || (itemPrice * itemQty));
        grandTotal += itemTotal;

        const row = document.createElement("div");
        row.className = "modal-item-row";

        row.innerHTML = `
            <div class="modal-item-text">
                 <b>${item.code}</b> | NT$ ${itemPrice.toLocaleString()} | ${item.color} | ${item.size} | ${itemQty}件 | 小計: NT$ ${itemTotal.toLocaleString()}
            </div>
            <div class="btn-delete-preview-item" title="刪除此商品">☒</div>
        `;

        const delBtn = row.querySelector(".btn-delete-preview-item");
        delBtn.addEventListener("click", async () => {
            const originalBackup = [...currentPendingCartItems];
            currentPendingCartItems.splice(index, 1);
            
            renderBottomOnlyUI(); 
            renderModalItemList();
            const payload = {
                action: "deletePendingItem",
                afid: currentAfid,
                code: item.code,
                color: item.color,
                size: item.size
            };

            try {
                const response = await fetch(GLOBAL_GAS_URL, {
                    method: "POST",
                    mode: "cors",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify(payload)
                });
                const resData = await response.json();

                if (!resData.success) {
                    currentPendingCartItems = originalBackup;
                    renderBottomOnlyUI();
                    renderModalItemList();
                    alert("後端同步失敗，請再試一次：" + resData.message);
                }
            } catch (err) {
                console.error("刪除連線異常:", err);
                currentPendingCartItems = originalBackup;
                renderBottomOnlyUI();
                renderModalItemList();
                alert("連線超時，已還原項目，請檢查網路！");
            }
        });

        listContainer.appendChild(row);
    });
    if (grandTotalSpan) {
        grandTotalSpan.innerText = grandTotal.toLocaleString();
    }
}

/**
 * 純前端繪製底部留白預覽區 (不重新連線，極速回饋)
 */
function renderBottomOnlyUI() {
    const previewContainer = document.querySelector(".footer-hint");
    const btnGoCart = document.getElementById("btn-go-cart");
    if (!previewContainer) return;

    if (currentPendingCartItems.length > 0) {
        const items = currentPendingCartItems;
        if (items.length <= 2) {
            let htmlContent = "";
            items.forEach(item => {
                const price = Number(item.price || 0);
                const total = Number(item.total || (price * item.qty));
                htmlContent += `
                    <div class="preview-item-text" style="font-size: 11px; color: #5a4b41; margin-bottom: 2px; line-height: 1.3;">
                         ${item.code}、NT$ ${price.toLocaleString()}、${item.color}、${item.size}、${item.qty}件、NT$ ${total.toLocaleString()}
                    </div>
                `;
            });
            previewContainer.innerHTML = htmlContent;
            if (btnGoCart) btnGoCart.innerHTML = "前往結帳 ➔";
        } else {
            previewContainer.innerHTML = `
                <div class="preview-cart-badge" id="btn-trigger-preview-modal" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                    <span style="font-size: 22px; cursor: pointer; animation: bounce 1s infinite alternate;">🛒</span>
                    <span style="font-size: 13px; font-weight: bold; color: var(--baby-pink, #f2a6b2); text-decoration: underline;">
                        選擇的預購商品 (${items.length} 件)
                    </span>
                </div>
            `;
            const triggerBadge = document.getElementById("btn-trigger-preview-modal");
            if (triggerBadge) {
                triggerBadge.addEventListener("click", (e) => {
                    e.stopPropagation();
                    showCartPreviewModal();
                });
            }

            if (btnGoCart) btnGoCart.innerHTML = "前往結帳 ➔";
        }
    } else {
        previewContainer.innerHTML = `
            <span class="summary-label" style="font-size: 12px; color: #888;">
                購物車沒有預購商品
            </span>
        `;
        if (btnGoCart) btnGoCart.innerHTML = "結帳";
        const backdrop = document.getElementById("cart-preview-backdrop");
        if (backdrop) backdrop.classList.remove("is-active");
    }
}

/**
 * 🎯 智慧連動：向伺服器拉取最新的追加清單，並重繪畫面
 */
async function fetchAndRenderBottomPreview() {
    try {
        const targetUrl = `${GLOBAL_GAS_URL}?action=getCartItems&afid=${encodeURIComponent(currentAfid)}`;
        const response = await fetch(targetUrl);
        if (!response.ok) return;
        const result = await response.json();

        currentPendingCartItems = (result.success && result.data) ? result.data : [];
        renderBottomOnlyUI();
    } catch (err) {
        console.error("讀取底部預覽清單發生異常:", err);
    }
}

/**
 * ⚡ 雙重保障：利用 LocalStorage 緩存商品大庫，防止每次切換都等 10 秒
 */
async function fetchProductCatalogWithCache() {
    const loadingBox = document.getElementById("catalog-loading");
    const grid = document.getElementById("products-grid");

    const CACHE_KEY = "aifang_catalog_data";
    const CACHE_TIME_KEY = "aifang_catalog_time";
    const FIVE_MINUTES = 5 * 60 * 1000;
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

    if (cachedData && cachedTime && (Date.now() - Number(cachedTime) < FIVE_MINUTES)) {
        try {
            allProductsRaw = JSON.parse(cachedData);
            buildBrandAndCategoryNav();
            renderProducts(allProductsRaw);
            if (loadingBox) loadingBox.classList.add("hidden");
            
            silentUpdateProductCatalog(CACHE_KEY, CACHE_TIME_KEY);
            return;
        } catch (e) {
            console.error("解析緩存失敗，將向伺服器重新取得", e);
        }
    }

    await fetchProductCatalogFromServer(CACHE_KEY, CACHE_TIME_KEY, loadingBox, grid);
}

/**
 * 從伺服器下載商品大庫，並存入快取
 */
async function fetchProductCatalogFromServer(cacheKey, timeKey, loadingBox, grid) {
    try {
        const targetUrl = `${GLOBAL_GAS_URL}?action=getProductCatalog`;
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error("網路連線失敗");

        const result = await response.json();
        if (result.success && result.data) {
            allProductsRaw = result.data;
            localStorage.setItem(cacheKey, JSON.stringify(allProductsRaw));
            localStorage.setItem(timeKey, String(Date.now()));

            buildBrandAndCategoryNav();
            renderProducts(allProductsRaw);
        } else {
            if (grid) grid.innerHTML = `<p style="padding:20px; color:red;">商品讀取失敗：${result.message}</p>`;
        }
    } catch (error) {
        console.error("連線發生異常:", error);
        if (grid) grid.innerHTML = `<p style="padding:20px; color:red;">無法與後端資料庫連線，請檢查網路並重新整理！</p>`;
    } finally {
        if (loadingBox) loadingBox.classList.add("hidden");
    }
}

/**
 * 默默在背景同步最新商品
 */
async function silentUpdateProductCatalog(cacheKey, timeKey) {
    try {
        const targetUrl = `${GLOBAL_GAS_URL}?action=getProductCatalog`;
        const response = await fetch(targetUrl);
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                localStorage.setItem(cacheKey, JSON.stringify(result.data));
                localStorage.setItem(timeKey, String(Date.now()));
            }
        }
    } catch (e) {
        console.warn("更新商品失敗，繼續使用舊版快取", e);
    }
}

function buildBrandAndCategoryNav() {
    const brandNavList = document.getElementById("brand-nav-list");
    if (!brandNavList) return;

    const uniqueBrands = new Set();
    allProductsRaw.forEach(item => {
        if (item.brand && String(item.brand).trim() !== "") {
            uniqueBrands.add(String(item.brand).trim());
        }
    });
    const brandArray = ["ALL", ...Array.from(uniqueBrands)];
    brandNavList.innerHTML = "";

    brandArray.forEach(brand => {
        const btn = document.createElement("button");
        btn.className = `brand-btn ${brand === "ALL" ? "active" : ""}`;
        btn.innerText = brand === "ALL" ? "全部品牌" : brand;

        btn.addEventListener("click", () => {
            document.querySelectorAll(".brand-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
         
            currentSelectedBrand = brand;
            updateCategoryNavRow(brand);
        });
        brandNavList.appendChild(btn);
    });
    updateCategoryNavRow("ALL");
}

function updateCategoryNavRow(brand) {
    const catContainer = document.getElementById("category-nav-container");
    const catNavList = document.getElementById("category-nav-list");
    if (!catContainer || !catNavList) return;
    const availableCategories = new Set();
    allProductsRaw.forEach(item => {
        const matchBrand = (brand === "ALL" || String(item.brand).trim() === brand);
        if (matchBrand && item.category && String(item.category).trim() !== "") {
            availableCategories.add(String(item.category).trim().toUpperCase());
        }
    });
    if (availableCategories.size === 0) {
        catContainer.classList.add("hidden");
        filterAndRenderGrid();
        return;
    }

    catContainer.classList.remove("hidden");
    const catArray = ["ALL", ...Array.from(availableCategories)];
    catNavList.innerHTML = "";

    catArray.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = `cat-btn ${cat === "ALL" ? "active" : ""}`;
        btn.innerText = cat === "ALL" ? "全部商品" : cat;
        btn.setAttribute("data-cat-value", cat);

        btn.addEventListener("click", () => {
            document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            filterAndRenderGrid();
            const navWrapper = document.getElementById("navigation-wrapper");
            if (navWrapper) navWrapper.classList.remove("mobile-force-show");
        });
        catNavList.appendChild(btn);
    });
    filterAndRenderGrid();
}

function filterAndRenderGrid() {
    const activeCatBtn = document.querySelector(".cat-btn.active");
    const currentSelectedCat = activeCatBtn ? activeCatBtn.getAttribute("data-cat-value") : "ALL";
    const filteredProducts = allProductsRaw.filter(item => {
        const brandMatch = (currentSelectedBrand === "ALL" || String(item.brand).trim() === currentSelectedBrand);
        const catMatch = (currentSelectedCat === "ALL" || String(item.category).trim().toUpperCase() === currentSelectedCat.toUpperCase());
        return brandMatch && catMatch;
    });
    renderProducts(filteredProducts);
}

/**
 * 🎨 渲染商品清單 (新增：SALE 30% OFF 折扣邏輯判定)
 */
function renderProducts(products) {
    const grid = document.getElementById("products-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (products.length === 0) {
        grid.innerHTML = `<p style="grid-column:span 4; text-align:center; padding:40px; color:#999;">該分類沒有上架商品</p>`;
        return;
    }

    products.forEach(item => {
        const card = document.createElement("div");
        card.className = "product-card";

        let selectedColor = "";
        let selectedSize = "";
        let currentQty = 1;

        const arrColors = item.color ? String(item.color).split(",").map(s => s.trim()).filter(s => s) : [];
        const arrSizes = item.size ? String(item.size).split(",").map(s => s.trim()).filter(s => s) : [];

        // 🎯 核心特調：判定是否為折扣 SALE 商品 (不區分大小寫)
        const isSale = (item.category && String(item.category).trim().toUpperCase() === "SALE");
        const originalPrice = Number(item.price || 0);
        // 7折四捨五入計算
        const displayPrice = isSale ? Math.round(originalPrice * 0.7) : originalPrice;

        const imgBox = document.createElement("div");
        imgBox.className = "card-img-box";
        const img = document.createElement("img");
        img.src = item.imagemain || "images/products/default.jpg";
        img.alt = item.code;
        imgBox.appendChild(img);

        // 🎯 如果是 SALE 折扣商品，動態塞入極簡黑白「30% OFF」標籤
        if (isSale) {
            const saleBadge = document.createElement("div");
            saleBadge.className = "sale-badge-overlay";
            saleBadge.innerText = "30% OFF";
            imgBox.appendChild(saleBadge);
        }
        card.appendChild(imgBox);

        // 🎯 價格顯示邏輯：SALE 顯示原價刪除線 + 驚喜打折價
        const infoBox = document.createElement("div");
        infoBox.className = "card-info";
        let priceHtml = `NT$ ${displayPrice.toLocaleString()}`;
        if (isSale) {
            priceHtml = `
                <span class="original-price-strikethrough">NT$ ${originalPrice.toLocaleString()}</span>
                <span class="sale-price-highlight">NT$ ${displayPrice.toLocaleString()}</span>
            `;
        }

        infoBox.innerHTML = `
            <div class="info-code"> ${item.code || ""}</div>
            <div class="info-price">${priceHtml}</div>
        `;
        if (item.stylingnote && item.stylingnote.trim() !== "") {
            const lblTitle = document.createElement("div");
            lblTitle.className = "info-title";
            lblTitle.innerText = item.stylingnote;
            infoBox.appendChild(lblTitle);
        }
        card.appendChild(infoBox);

        const hamburgerSpecs = document.createElement("div");
        hamburgerSpecs.className = "card-hamburger-specs";
        hamburgerSpecs.addEventListener("click", (e) => e.stopPropagation());

        const specHeaderRow = document.createElement("div");
        specHeaderRow.className = "spec-header-panel";
        specHeaderRow.innerHTML = `<span class="spec-main-title">請選取規格：</span>`;
        const resetBtn = document.createElement("span");
        resetBtn.className = "btn-reset-spec";
        resetBtn.innerHTML = "☒";
        resetBtn.title = "取消並還原";
        resetBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            selectedColor = "";
            selectedSize = "";
            currentQty = 1;
            hamburgerSpecs.querySelectorAll(".spec-btn").forEach(b => b.classList.remove("selected"));
            numDisplay.innerText = "1";
            card.classList.remove("is-expanded");
            card.classList.remove("active-highlight");
        });
        specHeaderRow.appendChild(resetBtn);
        hamburgerSpecs.appendChild(specHeaderRow);

        if (arrColors.length > 0) {
            const lblColor = document.createElement("div");
            lblColor.className = "spec-label";
            lblColor.innerText = "顏色";
            hamburgerSpecs.appendChild(lblColor);

            const grpColor = document.createElement("div");
            grpColor.className = "spec-group";
            arrColors.forEach(colorName => {
                const btn = document.createElement("button");
                btn.className = "spec-btn";
                btn.innerText = colorName;
                btn.addEventListener("click", () => {
                    grpColor.querySelectorAll(".spec-btn").forEach(b => b.classList.remove("selected"));
                    btn.classList.add("selected");
                    selectedColor = colorName;
                    checkCardStatus();
                });
                grpColor.appendChild(btn);
             });
            hamburgerSpecs.appendChild(grpColor);
        }

        if (arrSizes.length > 0) {
            const lblSize = document.createElement("div");
            lblSize.className = "spec-label";
            lblSize.innerText = "尺寸";
            hamburgerSpecs.appendChild(lblSize);

            const grpSize = document.createElement("div");
            grpSize.className = "spec-group";
            arrSizes.forEach(sizeName => {
                const btn = document.createElement("button");
                btn.className = "spec-btn";
                btn.innerText = sizeName;
                btn.addEventListener("click", () => {
                    grpSize.querySelectorAll(".spec-btn").forEach(b => b.classList.remove("selected"));
                    btn.classList.add("selected");
                    selectedSize = sizeName;
                    checkCardStatus();
                });
                grpSize.appendChild(btn);
             });
            hamburgerSpecs.appendChild(grpSize);
        }

        const lblQty = document.createElement("div");
        lblQty.className = "spec-label";
        lblQty.innerText = "數量";
        hamburgerSpecs.appendChild(lblQty);

        const rowQty = document.createElement("div");
        rowQty.className = "qty-row";
        
        const btnMinus = document.createElement("button");
        btnMinus.className = "qty-btn";
        btnMinus.innerText = "－";
        btnMinus.addEventListener("click", () => {
            if (currentQty > 1) {
                currentQty--;
                numDisplay.innerText = currentQty;
                checkCardStatus();
            }
        });
        const numDisplay = document.createElement("span");
        numDisplay.className = "qty-num";
        numDisplay.innerText = currentQty;

        const btnPlus = document.createElement("button");
        btnPlus.className = "qty-btn";
        btnPlus.innerText = "＋";
        btnPlus.addEventListener("click", () => {
            currentQty++;
            numDisplay.innerText = currentQty;
            checkCardStatus();
        });
        rowQty.appendChild(btnMinus);
        rowQty.appendChild(numDisplay);
        rowQty.appendChild(btnPlus);
        hamburgerSpecs.appendChild(rowQty);

        const savePanel = document.createElement("div");
        savePanel.className = "card-save-panel";
        savePanel.innerHTML = `
            <div class="summary-line">已選：<span class="txt-sum">--</span></div>
            <div class="summary-line">小計：NT$ <span class="txt-subtotal">0</span></div>
            <button class="btn-save-pending">放進購物車</button>
        `;
        const txtSum = savePanel.querySelector(".txt-sum");
        const txtSubtotal = savePanel.querySelector(".txt-subtotal");
        const btnSave = savePanel.querySelector(".btn-save-pending");

        // 🎯 確保選取完畢後，小計是以「折價後的單價」去計算
        function checkCardStatus() {
            if (selectedColor && selectedSize) {
                card.classList.add("active-highlight");
                if (txtSum) txtSum.innerText = `${selectedColor} / ${selectedSize} / ${currentQty}件`;
                if (txtSubtotal) txtSubtotal.innerText = (displayPrice * currentQty).toLocaleString();
            } else {
                card.classList.remove("active-highlight");
            }
        }

        // 🚀【確認暫存追加——極速樂觀更新版】
        btnSave.addEventListener("click", async () => {
            if (!selectedColor || !selectedSize) {
                alert("請選好顏色與尺寸規格");
                return;
            }

            const savedColor = selectedColor;
            const savedSize = selectedSize;
            const savedQty = Number(currentQty);

            // A. 🚀【樂觀更新】立刻在前端虛擬一筆打折後的暫存項目
            const newItem = {
                code: item.code,
                color: savedColor,
                size: savedSize,
                qty: savedQty,
                price: displayPrice, // 🎯 帶入打折後單價
                total: displayPrice * savedQty, // 🎯 帶入打折後小計
                imagemain: item.imagemain || ""
             };

            const originalBackup = [...currentPendingCartItems]; 
            
            const existingIndex = currentPendingCartItems.findIndex(i => i.code === newItem.code && i.color === newItem.color && i.size === newItem.size);
            if (existingIndex > -1) {
                currentPendingCartItems[existingIndex].qty += newItem.qty;
                currentPendingCartItems[existingIndex].total = currentPendingCartItems[existingIndex].qty * currentPendingCartItems[existingIndex].price;
            } else {
                currentPendingCartItems.push(newItem);
            }

            renderBottomOnlyUI();
            resetBtn.click();

            // B. 背景默默去和試算表同步
            const payload = {
                action: "addPending",
                afid: currentAfid,
                code: item.code,
                color: savedColor, 
                size: savedSize,   
                qty: savedQty      
            };
            try {
                const response = await fetch(GLOBAL_GAS_URL, {
                    method: "POST",
                    mode: "cors",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify(payload)
                });
                const resData = await response.json();
                if (!resData.success) {
                    currentPendingCartItems = originalBackup;
                    renderBottomOnlyUI();
                    alert("後端同步失敗：" + resData.message);
                }
            } catch (err) {
                console.error("發送購物車失敗:", err);
                currentPendingCartItems = originalBackup;
                renderBottomOnlyUI();
                alert("連線不穩定，暫存同步失敗！已還原狀態，請檢查網路。");
            }
        });

        hamburgerSpecs.appendChild(savePanel);
        card.appendChild(hamburgerSpecs);
        card.addEventListener("click", () => {
            if (!card.classList.contains("is-expanded")) {
                card.classList.add("is-expanded");
            }
        });
        grid.appendChild(card);
    });
}

function setupMobileScrollMenu() {
    const body = document.body;
    const navWrapper = document.getElementById("navigation-wrapper");
    const menuTrigger = document.getElementById("mobile-menu-trigger");
    if (!menuTrigger || !navWrapper) return;

    window.addEventListener("scroll", () => {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > 80) {
            body.classList.add("page-scrolled");
        } else {
            body.classList.remove("page-scrolled");
            navWrapper.classList.remove("mobile-force-show");
        }
    }, { passive: true });
    menuTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        navWrapper.classList.toggle("mobile-force-show");
    });
    document.addEventListener("click", () => {
        navWrapper.classList.remove("mobile-force-show");
    });
}