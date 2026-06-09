document.addEventListener("DOMContentLoaded", async () => {
    // 1. 從網址取得商品 Code 碼
    const urlParams = new URLSearchParams(window.location.search);
    const productCode = urlParams.get('id');

    if (!productCode) {
        showErrorPage("🐻 找不到藏寶地圖，將帶您回到溫馨小屋唷！");
        setTimeout(() => { window.location.href = "index.html"; }, 3000);
        return;
    }

    // 2. 向 Google Apps Script 撈取資料
    try {
        const products = await AiFangAPI.getProducts();
        const product = products.find(p => String(p.code).toUpperCase() === productCode.toUpperCase());

        if (product) {
            // 移除 Loading 提示
            const loadingText = document.querySelector(".detail-loading");
            if (loadingText) loadingText.remove();

            // 執行網頁渲染
            renderProductDetails(product);
            
            // 初始化動態互動與【購物車跳轉】
            initSizeGuidePopup();
            initBuyButtonAction();
            initCartPageTransition(); // 👈 啟動錯誤3的跳轉大限
        } else {
            showErrorPage("🐻 這件魔法衣裳消失在森林裡了。");
        }
    } catch (error) {
        console.error("載入單品資料失敗：", error);
        showErrorPage("🐻 故事書封面卡住了，請稍後再試。");
    }
});

/**
 * 核心渲染：雙層拍立得完美夾心結構
 */
function renderProductDetails(item) {
    const leftPanel = document.getElementById("left-panel");
    if (leftPanel) {
        leftPanel.innerHTML = ""; // 清空舊區塊

        // 優先抓取多圖欄位 imageextra，沒有就抓 imagemain
        let rawImages = item.imageextra || item.imagemain || "./images/products/default.jpg";
        rawImages = rawImages.replace(/[{}]/g, ""); // 清理可能夾帶的大括號
        const imageArray = rawImages.split(/[,，;]/).map(url => url.trim()).filter(url => url !== "");

        // 【修復錯誤 1 & 2】多圖循環生成完美的夾心拍立得
        imageArray.forEach((imgUrl, index) => {
            const polaroidContainer = document.createElement("div");
            // 奇數張左斜、偶數張右斜
            const tiltClass = (index % 2 === 0) ? "tilt-left" : "tilt-right";
            polaroidContainer.className = `polaroid-container ${tiltClass}`;

            polaroidContainer.innerHTML = `
                <div class="polaroid-photo-layer">
                    <img src="${imgUrl}" alt="${item.name} - 實穿細節 ${index + 1}">
                </div>
                <div class="frame-layer-top"></div>
                <div class="frame-layer-bottom"></div>
            `;
            leftPanel.appendChild(polaroidContainer);
        });
    }

    // 填入右側文字資料
    if (document.getElementById("product-brand")) document.getElementById("product-brand").innerText = item.brand || "璦坊嚴選";
    if (document.getElementById("product-name")) document.getElementById("product-name").innerText = item.name || "經典童裝";
    if (document.getElementById("product-price")) document.getElementById("product-price").innerText = item.price || "0";

    const defaultStory = "這件衣裳帶著微風的祝福，精選最柔軟的面料，親膚透氣，讓寶貝自在翻滾。";
    if (document.getElementById("product-note")) {
        document.getElementById("product-note").innerText = item.stylingnote || item.memo || defaultStory;
    }

    // 動態生成顏色按鈕
    const colorGroup = document.getElementById("color-options");
    if (colorGroup) {
        colorGroup.innerHTML = "";
        const colors = item.color ? item.color.split(/[,/，、]/) : ["單一顏色"];
        colors.forEach((c, index) => {
            const pill = document.createElement("button");
            pill.className = "option-pill";
            pill.innerText = c.trim();
            if (index === 0) pill.classList.add("active");
            pill.onclick = () => selectPill(colorGroup, pill);
            colorGroup.appendChild(pill);
        });
    }

    // 動態生成尺寸按鈕
    const sizeGroup = document.getElementById("size-options");
    if (sizeGroup) {
        sizeGroup.innerHTML = "";
        const sizes = item.size ? item.size.split(/[,/，、]/) : ["F"];
        sizes.forEach((s, index) => {
            const pill = document.createElement("button");
            pill.className = "option-pill"; 
            pill.innerText = s.trim();
            if (index === 0) pill.classList.add("active");
            pill.onclick = () => selectPill(sizeGroup, pill);
            sizeGroup.appendChild(pill);
        });
    }

    // 尺寸圖預載
    const popupSizeImg = document.getElementById("popup-size-img");
    if (popupSizeImg) {
        popupSizeImg.src = item.sizeguide || "images/products/size.jpg";
    }
}

function selectPill(groupElement, targetPill) {
    const pills = groupElement.querySelectorAll(".option-pill");
    pills.forEach(p => p.classList.remove("active"));
    targetPill.classList.add("active");
}

function showErrorPage(message) {
    const container = document.getElementById("detail-container");
    if (container) {
        container.innerHTML = `<div class="detail-error" style="text-align:center; padding:100px; color:#5a4b41;">${message}</div>`;
    }
}

function initSizeGuidePopup() {
    const trigger = document.getElementById("size-guide-btn");
    const overlay = document.getElementById("size-popup-overlay");
    const closeBtn = document.getElementById("close-size-popup");
    if (!trigger || !overlay || !closeBtn) return;

    trigger.onclick = () => overlay.classList.add("open");
    closeBtn.onclick = () => overlay.classList.remove("open");
    overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove("open"); };
}

function initBuyButtonAction() {
    const buyBtn = document.getElementById("buy-now-btn");
    const buyZone = document.getElementById("buy-zone");
    const cartCount = document.getElementById("cart-count");
    if (!buyBtn || !buyZone) return;

    buyBtn.addEventListener("click", () => {
        if (buyZone.querySelector(".dynamic-stamp-icon")) return;

        const randomStampNum = Math.floor(Math.random() * 2) + 1;
        const stamp = document.createElement("img");
        stamp.src = `images/ui/stamp${randomStampNum}.png`;
        stamp.className = "dynamic-stamp-icon";
        
        const randomRotate = Math.floor(Math.random() * 30) - 15;
        stamp.style.setProperty('--random-rotate', `${randomRotate}deg`);
        buyZone.appendChild(stamp);
        
        if (cartCount) {
            let currentCount = parseInt(cartCount.innerText) || 0;
            cartCount.innerText = currentCount + 1;
        }

        setTimeout(() => {
            stamp.style.transition = "opacity 0.4s ease";
            stamp.style.opacity = "0";
            setTimeout(() => { stamp.remove(); }, 400);
        }, 1500);
    });
}

/**
 * 【修復錯誤 3】精準綁定購物車按鈕與優雅網頁轉場
 */
function initCartPageTransition() {
    // 尋找右上角購物車圖標區塊 (相容 .cart-box 或 #cart-icon)
    const cartBtn = document.querySelector(".cart-box") || document.getElementById("cart-icon");
    const backBtn = document.getElementById("back-home");

    // 購物車跳轉 cart.html
    if (cartBtn) {
        cartBtn.addEventListener("click", (e) => {
            e.preventDefault(); // 攔截直接跳轉
            document.body.classList.add("page-leaving"); // 啟動淡出縮小動畫
            setTimeout(() => {
                window.location.href = "cart.html"; // 0.5秒後滑順切換網頁
            }, 500);
        });
    }

    // 返回首頁跳轉 index.html
    if (backBtn) {
        backBtn.addEventListener("click", (e) => {
            e.preventDefault();
            document.body.classList.add("page-leaving");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 500);
        });
    }
}