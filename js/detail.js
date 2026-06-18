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
                initBuyButtonAction(foundProduct); // ⭕ 讓按鈕知道要存哪一件衣服的資料！// 綁定您最愛的蓋章爽快感特效
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
    let rawImages = item.imageextra || item.imagemain || "images/ui/logo.png";
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
 * ✨ 完美存檔特效升級版：不但會蓋章，還會真正把選好的尺寸顏色存進 LocalStorage！
 */
function initBuyButtonAction(item) {
    const buyBtn = document.getElementById("buy-now-btn");
    const buyZone = document.getElementById("buy-zone");
    const cartIcon = document.getElementById("cart-icon");
    const cartCount = document.getElementById("cart-count");
    const collageZone = document.querySelector(".bottom-collage-zone");
    const appendTarget = collageZone || buyZone;

    if (!buyBtn || !appendTarget || !cartIcon) return;

    // 網頁剛打開時，先同步計算目前購物車裡有多少件衣服，顯示在右上角
    let currentCart = [];
    try { currentCart = JSON.parse(localStorage.getItem('cart')) || []; } catch(e) {}
    if (cartCount) {
        cartCount.innerText = currentCart.reduce((sum, i) => sum + (i.quantity || 1), 0);
    }

    buyBtn.addEventListener("click", () => {
        if (appendTarget.querySelector(".dynamic-stamp-icon")) return;

        // 🚀【核心補救功能】：抓取當下畫面上哪一粒藥丸按鈕被啟動了 (.active)
        const activeColorPill = document.querySelector("#color-options .option-pill.active");
        const activeSizePill = document.querySelector("#size-options .option-pill.active");
        
        const selectedColor = activeColorPill ? activeColorPill.innerText.trim() : "單色";
        const selectedSize = activeSizePill ? activeSizePill.innerText.trim() : "F";

        // 🚀【核心補救功能】：寫入 LocalStorage 購物車資料庫
        let cart = [];
        try { cart = JSON.parse(localStorage.getItem('cart')) || []; } catch(e) {}
        
        // 檢查車子裡是不是已經有一模一樣（同編號、同顏色、同尺寸）的衣服了
        const existingItem = cart.find(i => i.code === item.code && i.color === selectedColor && i.size === selectedSize);
        
        if (existingItem) {
            existingItem.quantity += 1; // 有的話，數量加 1
        } else {
            // 沒有的話，整件衣服打包塞進去，並完美對齊前端所需的所有欄位
            cart.push({
                id: item.code,
                code: item.code,
                codename: item.code,
                name: item.name || "韓國童裝",
                koreanname: item.koreanname || "",
                color: selectedColor,
                koreancolor: item.koreancolor || "", // 後台 code.gs 會自動比對中文色對照，免擔心
                size: selectedSize,
                quantity: 1,
                unitprice: parseFloat(item.price) || 0,
                // 防呆切出第一張主圖
                imagemain: item.imagemain ? item.imagemain.split(/[,;]/)[0].replace(/[{}"'\[\]]/g, "").trim() : "images/products/default.jpg"
            });
        }
        
        // 完美存回瀏覽器
        localStorage.setItem('cart', JSON.stringify(cart));

        // 📅 下方維持闆娘最愛的精緻蓋章動畫與右上角搖晃效果...
        const today = new Date();
        const month = today.getMonth(); 
        let stampSrc = "";

        if (month === 11) {
            const randomXmasNum = Math.floor(Math.random() * 5) + 1; 
            stampSrc = `images/ui/stamp_christmas${randomXmasNum}.png`;
        } else {
            const randomStampNum = Math.floor(Math.random() * 5) + 1; 
            stampSrc = `images/ui/stamp${randomStampNum}.png`;
        }

        const stamp = document.createElement("img");
        stamp.src = stampSrc;
        stamp.className = "dynamic-stamp-icon";
        
        const randomRotate = Math.floor(Math.random() * 30) - 15;
        stamp.style.setProperty('--random-rotate', `${randomRotate}deg`);
        
        appendTarget.appendChild(stamp);
        cartIcon.classList.add("cart-shake-active");
        
        // 即時刷新右上角購物車總數
        if (cartCount) {
            cartCount.innerText = cart.reduce((sum, i) => sum + i.quantity, 0);
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