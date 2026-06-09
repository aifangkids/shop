document.addEventListener("DOMContentLoaded", async () => {
    // 1. 從網址取得商品 Code 碼
    const urlParams = new URLSearchParams(window.location.search);
    const productCode = urlParams.get('id');

    if (!productCode) {
        showErrorPage("🐻 找不到藏寶地圖，將帶您回到溫馨小屋唷！");
        setTimeout(() => { window.location.href = "index.html"; }, 3000);
        return;
    }

    // 2. 向 Google Apps Script 撈取資料並篩選出此單品
    try {
        const products = await AiFangAPI.getProducts();
        const product = products.find(p => String(p.code).toUpperCase() === productCode.toUpperCase());

        if (product) {
            // 【修復第1點】資料成功載入後，移除 Loading 提示文字
            const loadingText = document.querySelector(".detail-loading");
            if (loadingText) loadingText.remove();

            // 渲染所有內容
            renderProductDetails(product);
            
            // 綁定所有互動功能
            initSizeGuidePopup();
            initBuyButtonAction();
            initDetailInteractions();
        } else {
            showErrorPage("🐻 這件魔法衣裳消失在森林裡了（商品已下架或不存在）。");
        }
    } catch (error) {
        console.error("載入單品資料失敗：", error);
        showErrorPage("🐻 故事書封面卡住了，請稍後再試。");
    }
});

/**
 * 動態多圖渲染與規格填入
 */
function renderProductDetails(item) {
    // 【修復第2點 & 第6點】動態解析多張圖片，並呈現左右交錯往下放的視覺
    const leftPanel = document.getElementById("left-panel");
    if (leftPanel) {
        leftPanel.innerHTML = ""; // 清空原本寫死的靜態相框

        // 清理後台可能帶有的大括號 {}
        let rawImages = item.imageextra || item.imagemain || "./images/products/default.jpg";
        rawImages = rawImages.replace(/[{}]/g, "");
        
        // 依照逗號或分號切開成陣列
        const imageArray = rawImages.split(/[,，;]/).map(url => url.trim()).filter(url => url !== "");

        // 循環生成拍立得相框
        imageArray.forEach((imgUrl, index) => {
            const polaroidCard = document.createElement("div");
            // 奇數張往左歪、偶數張往右歪，形成隨性拼貼
            const tiltClass = (index % 2 === 0) ? "tilt-left" : "tilt-right";
            polaroidCard.className = `polaroid-card ${tiltClass}`;

            polaroidCard.innerHTML = `
                <div class="polaroid-photo-wrapper">
                    <img src="${imgUrl}" alt="${item.name} - 圖片 ${index + 1}">
                    <div class="polaroid-frame-overlay"></div>
                </div>
            `;
            leftPanel.appendChild(polaroidCard);
        });
    }

    // 填入文字資料
    if (document.getElementById("product-brand")) document.getElementById("product-brand").innerText = item.brand || "璦坊嚴選";
    if (document.getElementById("product-name")) document.getElementById("product-name").innerText = item.name || "質感童裝";
    if (document.getElementById("product-price")) document.getElementById("product-price").innerText = item.price || "0";

    // 衣服故事防空值
    const defaultStories = [
        "這件衣裳帶著微風的祝福，精選最柔軟的純棉面料，親膚透氣，讓寶貝像在雲朵裡翻滾一樣自在。",
        "嚴選韓國質感設計，版型帶著鬆軟的慵懶感。不管是搭配小短褲還是奔跑在草地上，都能襯托出寶貝最天然純真的可愛笑容。"
    ];
    const storyText = item.stylingnote || item.memo || defaultStories[Math.floor(Math.random() * defaultStories.length)];
    if (document.getElementById("product-note")) document.getElementById("product-note").innerText = storyText;

    // 處理顏色規格
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

    // 處理尺寸規格
    const sizeGroup = document.getElementById("size-options");
    if (sizeGroup) {
        sizeGroup.innerHTML = "";
        const sizes = item.size ? item.size.split(/[,/，、]/) : ["F"];
        sizes.forEach((s, index) => {
            const pill = document.createElement("button");
            pill.className = "option-pill size-badge"; 
            pill.innerText = s.trim();
            if (index === 0) pill.classList.add("active");
            pill.onclick = () => selectPill(sizeGroup, pill);
            sizeGroup.appendChild(pill);
        });
    }

    // 彈出視窗尺寸圖預載
    const popupSizeImg = document.getElementById("popup-size-img");
    if (popupSizeImg) {
        popupSizeImg.src = item.sizeguide || "images/products/size.jpg";
    }
}

function selectPill(groupElement, targetPill) {
    const pills = groupElement.querySelectorAll(".option-pill, .size-badge");
    pills.forEach(p => p.classList.remove("selected", "active"));
    targetPill.classList.add("active");
}

function showErrorPage(message) {
    const container = document.getElementById("detail-container");
    if (container) {
        container.innerHTML = `<div class="detail-error" style="text-align:center; padding:100px; font-size:1.2rem; color:#5a4b41;">${message}</div>`;
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
    const cartIcon = document.getElementById("cart-icon");
    const cartCount = document.getElementById("cart-count");

    if (!buyBtn || !buyZone || !cartIcon) return;

    buyBtn.addEventListener("click", () => {
        if (buyZone.querySelector(".dynamic-stamp-icon")) return;

        const randomStampNum = Math.floor(Math.random() * 2) + 1;
        const stamp = document.createElement("img");
        stamp.src = `images/ui/stamp${randomStampNum}.png`;
        stamp.className = "dynamic-stamp-icon";
        
        const randomRotate = Math.floor(Math.random() * 30) - 15;
        stamp.style.setProperty('--random-rotate', `${randomRotate}deg`);
        buyZone.appendChild(stamp);
        
        cartIcon.classList.add("cart-shake-active");
        if (cartCount) {
            let currentCount = parseInt(cartCount.innerText) || 0;
            cartCount.innerText = currentCount + 1;
        }

        setTimeout(() => {
            stamp.style.transition = "opacity 0.4s ease";
            stamp.style.opacity = "0";
            setTimeout(() => {
                stamp.remove();
                cartIcon.classList.remove("cart-shake-active");
            }, 400);
        }, 1500);
    });
}

function initDetailInteractions() {
    const backBtn = document.getElementById("back-home");
    if (backBtn && backBtn.dataset.bound !== "true") {
        backBtn.dataset.bound = "true";
        backBtn.addEventListener("click", (e) => {
            e.preventDefault();
            document.body.classList.add("page-leaving");
            setTimeout(() => { window.location.href = "index.html"; }, 600);
        });
    }
}