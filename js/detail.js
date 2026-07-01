/**
 * 🧸 璦坊童裝 AiFang Studio —— 菜單大腦驅動器 (detail.js)
 */

// 1. 更換為闆娘提供最新的 GAS 正式網址
const GLOBAL_GAS_URL = "https://script.google.com/macros/s/AKfycbwrIptncgsBt4hAiRDniddghritIT8U9SXRvu8rTSY-t-LWYk4HoC7iQ_hGtaJLYIl5/exec";

let currentAfid = "";
let allProductsRaw = [];

document.addEventListener("DOMContentLoaded", () => {
    // 2. 彈性抓取網址專屬單號 (相容 uid 與 afid)
    const urlParams = new URLSearchParams(window.location.search);
    currentAfid = urlParams.get('uid') || urlParams.get('afid'); 

    if (!currentAfid) {
        alert("🧸 偵測不到您的專屬單號，系統將帶您回首頁重新配發編號唷！");
        window.location.href = "index.html";
        return;
    }

    // 將單號寫入網頁抬頭中
    const idBadge = document.getElementById("display-afid");
    if (idBadge) idBadge.innerText = currentAfid;

    // 3. 連線下載後端商品總表
    fetchProductCatalog();

    // 4. 綁定分類切換按鈕
    setupCategoryFilters();

    // 5. 綁定前往購物車按鈕
    const btnGoCart = document.getElementById("btn-go-cart");
    if (btnGoCart) {
        btnGoCart.addEventListener("click", () => {
            window.location.href = `cart.html?afid=${currentAfid}`;
        });
    }
});

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
            // 執行渲染
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

/**
 * 🎯 繪製商品卡片 (已完美對正後端關鍵字：code, color, size, stylingnote)
 */
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

        // 這張卡片的選取狀態包
        let selectedColor = "";
        let selectedSize = "";
        let currentQty = 1;

        // 🌟【精準修正】：對接您的後端欄位 item.color 與 item.size，並做防呆空值處理
        const arrColors = item.color ? String(item.color).split(",") : [];
        const arrSizes = item.size ? String(item.size).split(",") : [];

        // 1. 圖片外殼
        const imgBox = document.createElement("div");
        imgBox.className = "card-img-box";
        const img = document.createElement("img");
        // 對接後端 item.imagemain
        img.src = item.imagemain || "images/products/default.jpg";
        img.alt = item.code;
        imgBox.appendChild(img);
        card.appendChild(imgBox);

        // 2. 資訊外殼
        const infoBox = document.createElement("div");
        infoBox.className = "card-info";
        
        // 🌟【精準修正】：title 優先顯示小備註(stylingnote)，若沒有則用品牌大類組合，絕不出現 undefined！
        const displayTitle = item.stylingnote ? item.stylingnote : `【${item.brand}】${item.category}`;

        infoBox.innerHTML = `
            <div class="info-code">編號: ${item.code}</div>
            <div class="info-title">${displayTitle}</div>
            <div class="info-price">NT$ ${Number(item.price || 0).toLocaleString()}</div>
        `;

        // 建立顏色按鈕
        if (arrColors.length > 0 && arrColors[0] !== "") {
            const lblColor = document.createElement("div");
            lblColor.className = "spec-label";
            lblColor.innerText = "選擇顏色：";
            infoBox.appendChild(lblColor);

            const grpColor = document.createElement("div");
            grpColor.className = "spec-group";

            arrColors.forEach(colorName => {
                const btn = document.createElement("button");
                btn.className = "spec-btn";
                btn.innerText = colorName.trim();
                
                btn.addEventListener("click", () => {
                    grpColor.querySelectorAll(".spec-btn").forEach(b => b.classList.remove("selected"));
                    btn.classList.add("selected");
                    selectedColor = colorName.trim();
                    checkCardStatus();
                });
                grpColor.appendChild(btn);
            });
            infoBox.appendChild(grpColor);
        }

        // 建立尺寸按鈕
        if (arrSizes.length > 0 && arrSizes[0] !== "") {
            const lblSize = document.createElement("div");
            lblSize.className = "spec-label";
            lblSize.innerText = "選擇尺寸：";
            infoBox.appendChild(lblSize);

            const grpSize = document.createElement("div");
            grpSize.className = "spec-group";

            arrSizes.forEach(sizeName => {
                const btn = document.createElement("button");
                btn.className = "spec-btn";
                btn.innerText = sizeName.trim();
                
                btn.addEventListener("click", () => {
                    grpSize.querySelectorAll(".spec-btn").forEach(b => b.classList.remove("selected"));
                    btn.classList.add("selected");
                    selectedSize = sizeName.trim();
                    checkCardStatus();
                });
                grpSize.appendChild(btn);
            });
            infoBox.appendChild(grpSize);
        }

        // 建立數量調整
        const lblQty = document.createElement("div");
        lblQty.className = "spec-label";
        lblQty.innerText = "追加數量：";
        infoBox.appendChild(lblQty);

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
        infoBox.appendChild(rowQty);
        card.appendChild(infoBox);

        // 3. 雙規格選妥動作面板
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

        // 🌟【精準修正】：點選確認放入暫存區時，完美回傳符合後端 apiAddPending 規格的 payload
        btnSave.addEventListener("click", async () => {
            btnSave.disabled = true;
            btnSave.innerText = "正在寫入暫存車...";

            const payload = {
                action: "addPending", // 執行指令
                afid: currentAfid,     // 客人專屬編號
                code: item.code,       // 🌟 核心修正：必須是 code 欄位，不可寫 pid！
                color: selectedColor,  // 選定的中文顏色
                size: selectedSize,    // 選定的尺寸
                qty: Number(currentQty)
            };

            try {
                // 使用標準 POST 傳入您的後台
                const response = await fetch(GLOBAL_GAS_URL, {
                    method: "POST",
                    mode: "cors",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify(payload)
                });

                const resData = await response.json();
                if (resData.success) {
                    alert(`🧸 追加成功！\n商品編號【${item.code}】已成功排入您的底層待核對商品表暫存區！`);
                    
                    // 歸零這張卡片狀態
                    selectedColor = "";
                    selectedSize = "";
                    currentQty = 1;
                    numDisplay.innerText = 1;
                    card.querySelectorAll(".spec-btn").forEach(b => b.classList.remove("selected"));
                    card.classList.remove("active-highlight");
                } else {
                    alert("後台拒絕寫入：" + resData.message);
                }
            } catch (err) {
                console.error("發送暫存失敗:", err);
                alert("連線逾時或寫入失敗！請確認您的 Google 試算表共用權限，或再點擊一次。");
            } finally {
                btnSave.disabled = false;
                btnSave.innerText = "確認暫存追加";
            }
        });

        card.appendChild(savePanel);
        grid.appendChild(card);
    });
}

/**
 * 類別篩選器過濾
 */
function setupCategoryFilters() {
    const filterButtons = document.querySelectorAll(".cat-btn");
    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const selectedCategory = btn.getAttribute("data-cat");
            if (selectedCategory === "ALL") {
                renderProducts(allProductsRaw);
            } else {
                const filtered = allProductsRaw.filter(item => 
                    String(item.category).toUpperCase() === selectedCategory.toUpperCase()
                );
                renderProducts(filtered);
            }
        });
    });
}