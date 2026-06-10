/**
 * 璦坊童裝 AiFang Studio - 核心資料撈取與優雅轉場驅動器
 */

// 1. 固定對照您的 API 網址，絕不動更
const API_URL = "https://script.google.com/macros/s/AKfycbwgwzu96gbL1s2b7ZPVOiPJZDaBRHrx2K0zXYT5fblENjKJBYDa6v9O2gnkBuIEuXcMyQ/exec";

document.addEventListener("DOMContentLoaded", async () => {
    // 綁定購物車與首頁的過場跳轉 (修復錯誤3)
    initPageTransition();

    const urlParams = new URLSearchParams(window.location.search);
    const productCode = urlParams.get('id');

    if (!productCode) {
        showErrorMessage("🐻 弄丟了魔法咒語，回大廳看其他的吧");
        setTimeout(() => { window.location.href = "index.html"; }, 3000);
        return;
    }

    try {
        const response = await fetch(API_URL).then(res => res.json());
        
        if (response && response.products) {
            const foundProduct = response.products.find(p => 
                p.code && String(p.code).trim().toUpperCase() === productCode.trim().toUpperCase()
            );

            if (foundProduct) {
                // 移除讀取字樣
                const loadingText = document.getElementById("loading-text");
                if (loadingText) loadingText.remove();

                // 顯示主結構並渲染
                document.getElementById("main-content-layout").style.display = "flex";
                renderProductDetails(foundProduct);

                initSizeGuidePopup();
                initBuyButtonAction(); // 綁定您最愛的蓋章爽快感特效
            } else {
                showErrorMessage("🐻 魔法已被凍結保存，無法顯示");
            }
        } else {
            showErrorMessage("🐻 魔法詠唱失敗，請稍後再試");
        }
    } catch (error) {
        console.error("讀取商品失敗：", error);
        showErrorMessage("🐻 魔法詠唱中斷，請檢查網路");
    }
});

/**
 * 核心渲染：多張隨機 1~4 號拍立得夾心生成
 */
function renderProductDetails(item) {
    const leftPanel = document.getElementById("left-panel");
    if (!leftPanel) return;

    leftPanel.innerHTML = "";

    // 處理陣列、過濾大括號
    let rawImages = item.imageextra || item.imagemain || "images/products/default.jpg";
    rawImages = rawImages.replace(/[{}"'\[\]]/g, ""); 
    const imageArray = rawImages.split(/[,;]/).map(url => url.trim()).filter(url => url !== "");

    imageArray.forEach((imgUrl, index) => {
        const polaroidContainer = document.createElement("div");
        const tiltClass = (index % 2 === 0) ? "tilt-left" : "tilt-right";
        polaroidContainer.className = `polaroid-container ${tiltClass}`;

        // 隨機抽取 1~4 號拍立得框
        const randomFrameNum = Math.floor(Math.random() * 4) + 1;

        // 雙層夾心結構：照片置底絕對定位，外框圖置頂負責撐起高度不變形
        polaroidContainer.innerHTML = `
            <div class="polaroid-photo-layer">
                <img src="${imgUrl}" alt="${item.name || '商品細節'}">
            </div>
            <img class="frame-layer-overlay" src="images/ui/detail_polaroid${randomFrameNum}.png" alt="拍立得相框">
        `;
        leftPanel.appendChild(polaroidContainer);
    });

    if (document.getElementById("product-brand")) document.getElementById("product-brand").innerText = item.brand || "璦坊嚴選";
    if (document.getElementById("product-name")) document.getElementById("product-name").innerText = item.name || "未命名精選童裝";
    if (document.getElementById("product-price")) document.getElementById("product-price").innerText = item.price || "0";
    if (document.getElementById("product-note")) document.getElementById("product-note").innerText = item.stylingnote || item.memo || "這件衣裳帶著微風的祝福，精選最柔軟的面料。";

    // 生成選項
    generatePills("color-options", item.color);
    generatePills("size-options", item.size);

    const popupSizeImg = document.getElementById("popup-size-img");
    if (popupSizeImg) popupSizeImg.src = item.sizeguide || "images/products/size.jpg";
}

function generatePills(containerId, dataString) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    
    const items = dataString ? String(dataString).split(/[,/，、;]/) : ["F"];
    items.forEach((val, idx) => {
        const pill = document.createElement("button");
        const cleanVal = val.trim();
        pill.className = "option-pill";
        pill.innerText = cleanVal;
        
        // 如果是第一個選項，自動激活
        if (idx === 0) pill.classList.add("active");
        
        pill.onclick = () => {
            container.querySelectorAll(".option-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
        };
        container.appendChild(pill);
    });
}

function showErrorMessage(msg) {
    const container = document.getElementById("detail-container");
    if (container) {
        container.innerHTML = `<div class="detail-error" style="text-align:center; padding:100px; color:#5a4b41; font-size:1.2rem;">${msg}</div>`;
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

/**
 * ✨ 修正版：印章重蓋特效（日常 5 款隨機、12月聖誕 5 款隨機、取消春節章）
 */
function initBuyButtonAction() {
    const buyBtn = document.getElementById("buy-now-btn");
    const buyZone = document.getElementById("buy-zone");
    const cartIcon = document.getElementById("cart-icon");
    const cartCount = document.getElementById("cart-count");

    if (!buyBtn || !buyZone || !cartIcon) return;

    buyBtn.addEventListener("click", () => {
        // 如果前一個印章還在「砰」，先不重複蓋，維持完美視覺
        if (buyZone.querySelector(".dynamic-stamp-icon")) return;

        // 📅 獲取今天日期
        const today = new Date();
        const month = today.getMonth(); // 💡 11 代表 12 月
        
        let stampSrc = "";

        // 🎄 1. 聖誕節判定 (整整 12 月，每天隨機跳 1~5 號聖誕章)
        if (month === 11) {
            const randomXmasNum = Math.floor(Math.random() * 5) + 1; // 🚀 隨機 1 ~ 5
            stampSrc = `images/ui/stamp_christmas${randomXmasNum}.png`;
        } 
        // 🧸 2. 平常日子 (其餘月份，每天隨機跳 1~5 號日常章)
        else {
            const randomStampNum = Math.floor(Math.random() * 5) + 1; // 🚀 隨機 1 ~ 5
            stampSrc = `images/ui/stamp${randomStampNum}.png`;
        }

        // 建立印章圖片元素
        const stamp = document.createElement("img");
        stamp.src = stampSrc;
        stamp.className = "dynamic-stamp-icon";
        
        // 讓每一次蓋下去的角度稍微隨機歪斜（-15度 ~ +15度），更有手工蓋章的俏皮感！
        const randomRotate = Math.floor(Math.random() * 30) - 15;
        stamp.style.setProperty('--random-rotate', `${randomRotate}deg`);
        buyZone.appendChild(stamp);
        
        // 右上角小購物車開始歡樂搖晃
        cartIcon.classList.add("cart-shake-active");
   
        // 購物車數量 +1
        if (cartCount) {
            let currentCount = parseInt(cartCount.innerText) || 0;
            cartCount.innerText = currentCount + 1;
        }

        // 1.5 秒後讓印章優雅淡出並移除，同時停止購物車搖晃
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

/**
 * 過場轉場跳轉
 */
function initPageTransition() {
    const cartBtn = document.getElementById("cart-icon") || document.querySelector(".cart-box");
    const backBtn = document.getElementById("back-home");

    if (cartBtn) {
        cartBtn.addEventListener("click", (e) => {
            e.preventDefault();
            document.body.classList.add("page-leaving");
            setTimeout(() => { window.location.href = "cart.html"; }, 400); 
        });
    }

    if (backBtn) {
        backBtn.addEventListener("click", (e) => {
            e.preventDefault();
            document.body.classList.add("page-leaving");
            setTimeout(() => { window.location.href = "index.html"; }, 400);
        });
    }
}