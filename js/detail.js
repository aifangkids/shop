/**
 * 🧸 璦坊童裝 AiFang Studio —— 菜單大腦驅動器 (detail.js)
 */

const GLOBAL_GAS_URL = "https://script.google.com/macros/s/AKfycbwrIptncgsBt4hAiRDniddghritIT8U9SXRvu8rTSY-t-LWYk4HoC7iQ_hGtaJLYIl5/exec";

let currentAfid = "";
let allProductsRaw = [];
let currentSelectedBrand = "ALL";
let currentPendingCartItems = []; // 儲存當前暫存車內的最新資料，與 modal 及 ☒ 共享

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentAfid = urlParams.get('uid') || urlParams.get('afid'); 

    if (!currentAfid) {
        alert("🧸 偵測不到您的專屬單號，系統將帶您回首頁重新配發編號唷！");
        window.location.href = "index.html";
        return;
    }

    const idBadge = document.getElementById("display-afid");
    if (idBadge) idBadge.innerText = currentAfid;

    // 1. 下載商品大庫
    fetchProductCatalog();

    // 2. 📲 核心修正：網頁一打開，立刻同步撈取該單號在試算表已有的暫存內容，顯示在底部！
    fetchAndRenderBottomPreview();

    setupMobileScrollMenu();

    // 3. 初始化動態寫入 🛒 暫存明細懸浮抽屜 (Modal) 結構
    initCartPreviewModal();

    const btnGoCart = document.getElementById("btn-go-cart");
    if (btnGoCart) {
        // 固定為 前往結帳 ➔ 跳轉
        btnGoCart.addEventListener("click", () => {
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
                <div class="modal-title">🧸 暫存追加明細</div>
                <div class="modal-close-btn" id="modal-close-btn">☒</div>
            </div>
            <div class="modal-item-list" id="modal-item-list">
                <!-- 暫存商品項目將動態渲染於此 -->
            </div>
            <div class="modal-total-section">
                <span><b>全部商品總額：</b></span>
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
    const backdrop = document.getElementById("cart-preview-backdrop");
    if (!backdrop) return;
    
    // 即時繪製清單內容
    renderModalItemList();
    backdrop.classList.add("is-active");
}

/**
 * 渲染預覽彈窗內部的純文字暫存列表 (包含實時 ☒ 刪除連動與全部商品總額計量)
 */
function renderModalItemList() {
    const listContainer = document.getElementById("modal-item-list");
    const grandTotalSpan = document.getElementById("modal-grand-total");
    if (!listContainer) return;

    listContainer.innerHTML = "";
    let grandTotal = 0;

    if (currentPendingCartItems.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#baa38f; font-size:13px;">暫存追加內空空如也 🧸</div>`;
        if (grandTotalSpan) grandTotalSpan.innerText = "0";
        return;
    }

    currentPendingCartItems.forEach((item) => {
        const itemPrice = Number(item.price || 0);
        const itemQty = Number(item.qty || 1);
        const itemTotal = Number(item.total || (itemPrice * itemQty));
        grandTotal += itemTotal;

        const row = document.createElement("div");
        row.className = "modal-item-row";

        // 純文字呈現：編號、單價、顏色、尺寸、數量、小計 (無圖片)
        row.innerHTML = `
            <div class="modal-item-text">
                📌 <b>${item.code}</b> | NT$ ${itemPrice.toLocaleString()} | ${item.color} | ${item.size} | ${itemQty}件 | 小計: NT$ ${itemTotal.toLocaleString()}
            </div>
            <div class="btn-delete-preview-item" title="刪除此商品">☒</div>
        `;

        // 綁定單品 ☒ 刪除鈕點擊事件 (連動 API 與前台渲染)
        const delBtn = row.querySelector(".btn-delete-preview-item");
        delBtn.addEventListener("click", async () => {
            delBtn.style.pointerEvents = "none";
            delBtn.innerText = "⏳";

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

                if (resData.success) {
                    // 實時重新加載底下留白與 Modal 明細
                    await fetchAndRenderBottomPreview();
                    renderModalItemList(); 
                } else {
                    alert("刪除失敗：" + resData.message);
                    delBtn.style.pointerEvents = "auto";
                    delBtn.innerText = "☒";
                }
            } catch (err) {
                console.error("刪除連線異常:", err);
                alert("連線超時，請再試一次！");
                delBtn.style.pointerEvents = "auto";
                delBtn.innerText = "☒";
            }
        });

        listContainer.appendChild(row);
    });

    if (grandTotalSpan) {
        grandTotalSpan.innerText = grandTotal.toLocaleString();
    }
}

/**
 * 🎯 智慧連動：非同步撈取試算表並即時將資料填入底下留白預覽區 (動態呈現、不跑版)
 */
async function fetchAndRenderBottomPreview() {
    const previewContainer = document.querySelector(".footer-hint");
    const btnGoCart = document.getElementById("btn-go-cart");
    if (!previewContainer) return;

    try {
        const targetUrl = `${GLOBAL_GAS_URL}?action=getCartItems&afid=${encodeURIComponent(currentAfid)}`;
        const response = await fetch(targetUrl);
        if (!response.ok) return;
        const result = await response.json();

        // 寫入全域資料包
        currentPendingCartItems = (result.success && result.data) ? result.data : [];

        if (currentPendingCartItems.length > 0) {
            const items = currentPendingCartItems;
            
            if (items.length <= 2) {
                // 🔹 暫存商品在 2 個以內（包含 2 個）：完整顯示純文字明細（無圖片），中間用「、」串接
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
                if (btnGoCart) {
                    btnGoCart.innerHTML = "前往結帳 ➔";
                }
            } else {
                // 🔹 暫存商品超過 2 個（3 件以上）：隱藏純文字，左側顯示一個可愛的 🛒 按鈕指示
                previewContainer.innerHTML = `
                    <div class="preview-cart-badge" id="btn-trigger-preview-modal" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                        <span style="font-size: 22px; cursor: pointer; animation: bounce 1s infinite alternate;">🛒</span>
                        <span style="font-size: 13px; font-weight: bold; color: var(--baby-pink, #f2a6b2); text-decoration: underline;">
                            點擊查看選擇的商品資訊 (${items.length} 件)
                        </span>
                    </div>
                `;
                
                // 點選左側 🛒 彈出抽屜預覽 (不跳轉)
                const triggerBadge = document.getElementById("btn-trigger-preview-modal");
                if (triggerBadge) {
                    triggerBadge.addEventListener("click", (e) => {
                        e.stopPropagation();
                        showCartPreviewModal();
                    });
                }

                if (btnGoCart) {
                    btnGoCart.innerHTML = "前往結帳 ➔";
                }
            }
        } else {
            // 沒商品時的預設留白提示文字
            previewContainer.innerHTML = `
                <span class="summary-label" style="font-size: 12px; color: #888;">
                    選擇商品資料即可加入暫存追加區
                </span>
            `;
            if (btnGoCart) {
                btnGoCart.innerHTML = "🛒 前往我的暫存車";
            }
            // 若商品已被清空，自動收拢 Modal 視窗
            const backdrop = document.getElementById("cart-preview-backdrop");
            if (backdrop) backdrop.classList.remove("is-active");
        }
    } catch (err) {
        console.error("讀取底部預覽清單發生異常:", err);
    }
}

/**
 * 從 GAS 後台安全下載商品大庫
 */
async function fetchProductCatalog() {
    const loadingBox = document.getElementById("catalog-loading");
    const grid = document.getElementById("products-grid");

    try {
        const targetUrl = `${GLOBAL_GAS_URL}?action=getProductCatalog`;
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error("網路連線失敗");

        const result = await response.json();
        if (result.success && result.data) {
            allProductsRaw = result.data;
            buildBrandAndCategoryNav();
            renderProducts(allProductsRaw);
        } else {
            grid.innerHTML = `<p style="padding:20px; color:red;">商品大庫讀取失敗：${result.message}</p>`;
        }
    } catch (error) {
        console.error("連線發生異常:", error);
        grid.innerHTML = `<p style="padding:20px; color:red;">無法與後端資料庫連線，請檢查網路並重新整理！</p>`;
    } finally {
        if (loadingBox) loadingBox.classList.add("hidden");
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
            document.getElementById("navigation-wrapper").classList.remove("mobile-force-show");
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

function renderProducts(products) {
    const grid = document.getElementById("products-grid");
    if (!grid) return;
    grid.innerHTML = "";

    if (products.length === 0) {
        grid.innerHTML = `<p style="grid-column:span 4; text-align:center; padding:40px; color:#999;">該分類目前沒有上架商品唷 🧸</p>`;
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

        const imgBox = document.createElement("div");
        imgBox.className = "card-img-box";
        const img = document.createElement("img");
        img.src = item.imagemain || "images/products/default.jpg";
        img.alt = item.code;
        imgBox.appendChild(img);
        card.appendChild(imgBox);

        const infoBox = document.createElement("div");
        infoBox.className = "card-info";
        infoBox.innerHTML = `
            <div class="info-code"> ${item.code || ""}</div>
            <div class="info-price">NT$ ${Number(item.price || 0).toLocaleString()}</div>
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
        lblQty.innerText = "追加數量";
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
            <button class="btn-save-pending">確認暫存追加</button>
        `;

        const txtSum = savePanel.querySelector(".txt-sum");
        const txtSubtotal = savePanel.querySelector(".txt-subtotal");
        const btnSave = savePanel.querySelector(".btn-save-pending");

        function checkCardStatus() {
            if (selectedColor && selectedSize) {
                card.classList.add("active-highlight");
                if (txtSum) txtSum.innerText = `${selectedColor} / ${selectedSize} / ${currentQty}件`;
                if (txtSubtotal) txtSubtotal.innerText = (Number(item.price || 0) * currentQty).toLocaleString();
            } else {
                card.classList.remove("active-highlight");
            }
        }

        btnSave.addEventListener("click", async () => {
            if (!selectedColor || !selectedSize) {
                alert("請選好顏色與尺寸規格唷 🧸");
                return;
            }
            btnSave.disabled = true;
            btnSave.innerText = "正在寫入暫存車...";

            const payload = {
                action: "addPending",
                afid: currentAfid,
                code: item.code,
                color: selectedColor,
                size: selectedSize,
                qty: Number(currentQty)
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
                    // 🎯 核心修正：移除原先的追加成功提示 Alert (徹底靜音追加)
                    resetBtn.click();
                    
                    // 🌟 核心聯動：成功寫入資料庫後，立刻呼叫刷新底部的留白區！
                    fetchAndRenderBottomPreview();
                } else {
                    alert("後台拒絕寫入：" + resData.message);
                }
            } catch (err) {
                console.error("發送暫存失敗:", err);
                alert("連線失敗！請再試一次。");
            } finally {
                btnSave.disabled = false;
                btnSave.innerText = "確認暫存追加";
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