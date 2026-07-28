const GLOBAL_GAS_URL = "https://script.google.com/macros/s/AKfycbwrIptncgsBt4hAiRDniddghritIT8U9SXRvu8rTSY-t-LWYk4HoC7iQ_hGtaJLYIl5/exec";

let currentAfid = ""; // 保持空字串，不進行初始化讀取與寫入
let allProductsRaw = [];
let currentSelectedBrand = "ALL";
let currentPendingCartItems = []; // 儲存當前購物車內的最新資料，與 modal 及 ☒ 共享

// 🎯 標準化分類對應表（最新版：包含外套、成人與最新名稱）
const FIX_CAT_MAP = [
    { key: "TOP", display: "上衣" },
    { key: "BOTTOM", display: "下著" },
    { key: "SET", display: "套裝" },
    { key: "OUTER", display: "外套" },
    { key: "BABY", display: "寶寶" },
    { key: "ADULT", display: "成人" },
    { key: "ACC", display: "飾品配件" },
    { key: "SALE", display: "SALE" }
];

// 🎯 智慧分類標準化轉換器
function getStandardCategoryKey(rawCat) {
    if (!rawCat) return "";
    const cat = String(rawCat).trim().toUpperCase();
    
    if (cat === "SALE" || cat === "SALE商品" || cat === "特價" || cat === "出清") return "SALE";
    if (cat === "TOP" || cat === "上衣" || cat === "上衣類") return "TOP";
    if (cat === "BOTTOM" || cat === "下裝" || cat === "下裝類" || cat === "下著" || cat === "BOTTOMS") return "BOTTOM";
    if (cat === "SET" || cat === "套裝" || cat === "套裝類") return "SET";
    if (cat === "OUTER" || cat === "外套" || cat === "外套類") return "OUTER";
    if (cat === "BABY" || cat === "寶寶" || cat === "寶寶類") return "BABY";
    if (cat === "ADULT" || cat === "成人" || cat === "成人類" || cat === "大人") return "ADULT";
    if (cat === "ACC" || cat === "飾品配件" || cat === "配件飾品" || cat === "配件" || cat === "配件/鞋襪類" || cat === "鞋襪" || cat === "鞋襪類") return "ACC";
    
    return cat; // 預設回傳原字
}

// 網頁載入完成後執行
document.addEventListener("DOMContentLoaded", () => {
    // 1. ⚡ 智慧緩存下載商品大庫 (0.1秒秒開) - 讀取「商品總表」
    fetchProductCatalogWithCache();

    // 2. 📲 讀取底部預覽並初始化 (優先讀取一次)
    fetchAndRenderBottomPreview();

    setupMobileScrollMenu();

    // 3. 初始化動態寫入 🛒 暫存明細懸浮抽屜 (Modal) 結構
    initCartPreviewModal();

    const btnGoCart = document.getElementById("btn-go-cart");
    if (btnGoCart) {
        btnGoCart.addEventListener("click", () => {
            // 單純跳轉，不夾帶任何 afid 參數
            window.location.href = "cart.html";
        });
    }
});

 // 🎯 新增功能：檢查大庫中是否有 SALE 商品，並控制頂部公告欄
function checkAndSetupSaleBanner() {
    const topBanner = document.getElementById("top-sale-banner");
    if (!topBanner) return;

    // 檢查有沒有任何一件商品的 category 是 SALE
    const hasSaleItems = allProductsRaw.some(item => getStandardCategoryKey(item.category) === "SALE");

    if (hasSaleItems) {
        topBanner.classList.remove("hidden"); // 秀出公告欄
        
        // 綁定點擊事件：點擊公告欄，自動幫客人點擊「SALE」分類按鈕！
        topBanner.onclick = function(e) {
            e.preventDefault();
            const saleBtn = document.querySelector('.cat-btn[data-cat-value="SALE"]');
            if (saleBtn) {
                saleBtn.click(); // 模擬點擊
                // 順便平滑滾動到商品區，讓客人的手機畫面自動對準衣服
                const grid = document.getElementById("products-grid");
                if (grid) {
                    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        };
    } else {
        topBanner.classList.add("hidden"); // 後台沒特價品，自動隱藏公告欄
    }
}

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
            <div class="modal-item-list" id="modal-item-list"></div>
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
 * 渲染預覽視窗中的品項 (功能更新：加入商品圖片、特價原價刪除線雙金額顯示)
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

        const rawProduct = allProductsRaw.find(p => p.code === item.code);
        const isSale = rawProduct ? (getStandardCategoryKey(rawProduct.category) === "SALE") : false;
        const saleHint = isSale ? ` <span style="font-size: 11px; color: #ff4d4f; font-weight: bold; margin-left: 2px;">30% OFF</span>` : "";

        // 🎯【功能 2】智慧安全取得主圖網址，若無則套用預設圖
        const imgUrl = (rawProduct && rawProduct.imagemain) ? rawProduct.imagemain : (item.imagemain || "images/products/default.jpg");

        // 🎯【功能 1】處理金額顯示邏輯 (原價與特價連動)
        let priceText = `NT$ ${itemPrice.toLocaleString()}`;
        let totalText = `NT$ ${itemTotal.toLocaleString()}`;
        
        if (isSale && rawProduct) {
            const rawPrice = Number(rawProduct.price || 0); // 試算表原始大庫金額
            const rawTotal = rawPrice * itemQty;
            
            // 轉化為：原價(刪除線) + 紅字特價 樣式
            priceText = `<span style="text-decoration: line-through; color: #999; font-size: 11px; margin-right: 4px;">NT$ ${rawPrice.toLocaleString()}</span><span style="color: #ff4d4f; font-weight: bold;">NT$ ${itemPrice.toLocaleString()}</span>`;
            totalText = `<span style="text-decoration: line-through; color: #999; font-size: 11px; margin-right: 4px;">NT$ ${rawTotal.toLocaleString()}</span><span style="color: #ff4d4f; font-weight: bold;">NT$ ${itemTotal.toLocaleString()}</span>`;
        }

        const row = document.createElement("div");
        row.className = "modal-item-row";
        
        // 額外微調彈窗單列佈局，確保小圖、換行文字與刪除鈕排列整齊美觀
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "10px";
        row.style.justifyContent = "space-between";
        row.style.padding = "8px 0";
        row.style.borderBottom = "1px dashed #eee";

        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex-grow: 1;">
                <!-- 圖片小圖區塊 -->
                <div class="modal-item-img-box" style="width: 45px; height: 45px; flex-shrink: 0; border-radius: 4px; overflow: hidden; background: #f5f5f5;">
                    <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${item.code}">
                </div>
                <!-- 詳細文字明細區塊 -->
                <div class="modal-item-text" style="font-size: 12px; line-height: 1.5; color: #5a4b41; flex-grow: 1;">
                     <b>${item.code}</b>${saleHint}<br>
                     規格: ${item.color} / ${item.size} / ${itemQty}件<br>
                     單價: ${priceText} | 小計: ${totalText}
                </div>
            </div>
            <div class="btn-delete-preview-item" title="刪除此商品" style="cursor: pointer; padding: 0 4px; font-size: 16px; color: #999; user-select: none;">☒</div>
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
 * 核心修改：只要暫存追加件數大於 0，100% 轉為預覽懸浮窗 Modal 觸發結構
 */
function renderBottomOnlyUI() {
    const previewContainer = document.querySelector(".footer-hint");
    const btnGoCart = document.getElementById("btn-go-cart");
    if (!previewContainer) return;

    if (currentPendingCartItems.length > 0) {
        const items = currentPendingCartItems;
        const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

        previewContainer.innerHTML = `
            <div class="preview-cart-badge" id="btn-trigger-preview-modal" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                <span style="font-size: 22px; cursor: pointer; animation: bounce 1s infinite alternate;">🛒</span>
                <span style="font-size: 13px; font-weight: bold; color: var(--baby-pink, #f2a6b2); text-decoration: underline;">
                    選擇的預購商品 (${totalQty} 件)
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
            checkAndSetupSaleBanner(); 
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
            checkAndSetupSaleBanner(); 
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

/**
 * 🛠️ 將品牌按照 A-Z 順序升序排列
 */
function buildBrandAndCategoryNav() {
    const brandNavList = document.getElementById("brand-nav-list");
    if (!brandNavList) return;

    const uniqueBrands = new Set();
    allProductsRaw.forEach(item => {
        if (item.brand && String(item.brand).trim() !== "") {
            uniqueBrands.add(String(item.brand).trim());
        }
    });
    
    const sortedBrands = Array.from(uniqueBrands).sort((a, b) => String(a).localeCompare(String(b), 'en', { sensitivity: 'base' }));
    const brandArray = ["ALL", ...sortedBrands];
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

/**
 * 🛠️ 前台分類選單之順序將永遠嚴格為特定排列
 */
function updateCategoryNavRow(brand) {
    const catContainer = document.getElementById("category-nav-container");
    const catNavList = document.getElementById("category-nav-list");
    if (!catContainer || !catNavList) return;
    
    const catArray = [{ key: "ALL", display: "全部商品" }];
    
    FIX_CAT_MAP.forEach(mapObj => {
        const exists = allProductsRaw.some(item => {
            const matchBrand = (brand === "ALL" || String(item.brand).trim() === brand);
            return matchBrand && getStandardCategoryKey(item.category) === mapObj.key;
        });
        if (exists) {
            catArray.push(mapObj);
        }
    });
    
    if (catArray.length <= 1) {
        catContainer.classList.add("hidden");
        filterAndRenderGrid();
        return;
    }

    catContainer.classList.remove("hidden");
    catNavList.innerHTML = "";

    catArray.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = `cat-btn ${cat.key === "ALL" ? "active" : ""}`;
        btn.innerText = cat.display;
        btn.setAttribute("data-cat-value", cat.key);

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

/**
 * 🎯 智慧連動過濾
 */
function filterAndRenderGrid() {
    const activeCatBtn = document.querySelector(".cat-btn.active");
    const currentSelectedCat = activeCatBtn ? activeCatBtn.getAttribute("data-cat-value") : "ALL";
    const filteredProducts = allProductsRaw.filter(item => {
        const brandMatch = (currentSelectedBrand === "ALL" || String(item.brand).trim() === currentSelectedBrand);
        const catMatch = (currentSelectedCat === "ALL" || getStandardCategoryKey(item.category) === currentSelectedCat);
        return brandMatch && catMatch;
    });
    renderProducts(filteredProducts);
}

/**
 * 🎨 渲染商品清單 (包含寫入動作至「待核對商品表」之發送邏輯)
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

        const isSale = (getStandardCategoryKey(item.category) === "SALE");
        const originalPrice = Number(item.price || 0);
        const displayPrice = isSale ? Math.round(originalPrice * 0.7) : originalPrice;

        const imgBox = document.createElement("div");
        imgBox.className = "card-img-box";
        const img = document.createElement("img");
        img.src = item.imagemain || "images/products/default.jpg";
        img.alt = item.code;
        imgBox.appendChild(img);

        if (isSale) {
            const saleBadge = document.createElement("div");
            saleBadge.className = "sale-badge-overlay";
            saleBadge.innerText = "30% OFF";
            imgBox.appendChild(saleBadge);
        }
        card.appendChild(imgBox);

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

        function checkCardStatus() {
            if (selectedColor && selectedSize) {
                card.classList.add("active-highlight");
                if (txtSum) txtSum.innerText = `${selectedColor} / ${selectedSize} / ${currentQty}件`;
                if (txtSubtotal) txtSubtotal.innerText = (displayPrice * currentQty).toLocaleString();
            } else {
                card.classList.remove("active-highlight");
            }
        }

        // 🚀【確認暫存追加——發送至待核對商品表】
        btnSave.addEventListener("click", async () => {
            if (!selectedColor || !selectedSize) {
                alert("請選好顏色與尺寸規格");
                return;
            }

            const savedColor = selectedColor;
            const savedSize = selectedSize;
            const savedQty = Number(currentQty);

            const newItem = {
                code: item.code,
                color: savedColor,
                size: savedSize,
                qty: savedQty,
                price: displayPrice, 
                total: displayPrice * savedQty, 
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

            // 寫入「待核對商品表」的網路要求
            const payload = {
                action: "addPending",
                afid: currentAfid, // 此處為空字串，完全不帶單號
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