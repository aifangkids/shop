/**
 * 🧸 璦坊童裝 AiFang Studio —— 菜單大腦驅動器 (detail.js)
 */

const GLOBAL_GAS_URL = "https://script.google.com/macros/s/AKfycbwrIptncgsBt4hAiRDniddghritIT8U9SXRvu8rTSY-t-LWYk4HoC7iQ_hGtaJLYIl5/exec";

let currentAfid = "";
let allProductsRaw = [];
let currentSelectedBrand = "ALL";

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

    // STREAMING_CHUNK:Loading core product catalog...
    fetchProductCatalog();

    // STREAMING_CHUNK:Running initial cart preview load on bottom bar...
    fetchAndRenderBottomPreview();

    setupMobileScrollMenu();

    const btnGoCart = document.getElementById("btn-go-cart");
    if (btnGoCart) {
        btnGoCart.addEventListener("click", () => {
            window.location.href = `cart.html?afid=${currentAfid}`;
        });
    }
});

/**
 * 🎯 智慧連動：非同步撈取試算表並即時將資料填入底下留白預覽區 (取代原有死板文字)
 */
async function fetchAndRenderBottomPreview() {
    // STREAMING_CHUNK:Finding target preview element inside detail.html...
    // 鎖定 detail.html 底部固定列中的文字展示區
    const previewContainer = document.querySelector(".footer-hint");
    const btnGoCart = document.getElementById("btn-go-cart");
    if (!previewContainer) return;

    try {
        const targetUrl = `${GLOBAL_GAS_URL}?action=getCartItems&afid=${encodeURIComponent(currentAfid)}`;
        const response = await fetch(targetUrl);
        if (!response.ok) return;
        const result = await response.json();

        // 如果試算表裡面真的有這名客人的暫存衣服項目
        if (result.success && result.data && result.data.length > 0) {
            const items = result.data;
            
            if (items.length <= 2) {
                // STREAMING_CHUNK:Formatting item text to display (max 2 items)...
                // 🔹 暫存商品在 2 個以內（包含 2 個）：完整顯示純文字明細（無圖片）
                let htmlContent = "";
                items.forEach((item, index) => {
                    const price = Number(item.price || 0);
                    const total = Number(item.total || (price * item.qty));
                    htmlContent += `
                        <div class="preview-item-text" style="font-size: 12px; color: #5a4b41; margin-bottom: 2px;">
                            ${item.code}、NT$ ${price.toLocaleString()}、${item.color}、${item.size}、${item.qty}件、NT$ ${total.toLocaleString()}
                        </div>
                    `;
                });
                previewContainer.innerHTML = htmlContent;
                if (btnGoCart) {
                    btnGoCart.innerHTML = "前往結帳 ➔";
                }
            } else {
                // STREAMING_CHUNK:Formatting more than 2 items to simple 🛒 button indicator...
                // 🔹 暫存商品超過 2 個：直接隱藏明細，改用 🛒 按鈕與緊湊模式呈現
                previewContainer.innerHTML = `
                    <div class="preview-cart-badge" style="display: flex; align-items: center; gap: 8px; cursor: pointer;" onclick="document.getElementById('btn-go-cart').click();">
                        <span style="font-size: 22px; animation: bounce 1s infinite alternate;">🛒</span>
                        <span style="font-size: 13px; font-weight: bold; color: var(--baby-pink, #f2a6b2);">
                            已暫存追加商品 (${items.length} 件)
                        </span>
                    </div>
                `;
                if (btnGoCart) {
                    btnGoCart.innerHTML = "前往結帳 ➔";
                }
            }
        } else {
            // STREAMING_CHUNK:Default text when cart has no pending items...
            // 沒商品時的預設留白提示文字
            previewContainer.innerHTML = `
                <span class="summary-label" style="font-size: 12px; color: #888;">
                    選擇商品資料即可加入暫存追加區
                </span>
            `;
            if (btnGoCart) {
                btnGoCart.innerHTML = "🛒 前往我的暫存車";
            }
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

        // STREAMING_CHUNK:Binding save pending item trigger without alert popups...
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
                    // 🎯 核心修正：移除原先的追加成功提示 Alert (徹底刪除彈窗)
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
