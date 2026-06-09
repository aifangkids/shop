document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. 從網址取得商品 Code 碼 (例如: detail.html?id=K001)
    const urlParams = new URLSearchParams(window.location.search);
    const productCode = urlParams.get('id');

    if (!productCode) {
        alert("找不到商品代碼唷，為您導回首頁。");
        window.location.href = "index.html";
        return;
    }

    // 2. 隨機盲盒抽 1~4 號拍立得相框背景
    const polaroidFrame = document.getElementById("polaroid-frame");
    if (polaroidFrame) {
        const randomFrameNum = Math.floor(Math.random() * 4) + 1;
        polaroidFrame.style.backgroundImage = `url('images/ui/detail_polaroid${randomFrameNum}.png')`;
    }

    // 3. 向 Google Apps Script 撈取資料並篩選出此單品
    try {
        // 使用您在 index.js 相同的 API 來獲取完整商品清單
        const products = await AiFangAPI.getProducts();
        const product = products.find(p => String(p.code).toUpperCase() === productCode.toUpperCase());

        if (product) {
            renderProductDetails(product);
        } else {
            document.getElementById("product-name").innerText = "商品已下架或不存在";
        }
    } catch (error) {
        console.error("載入單品資料失敗：", error);
        document.getElementById("product-name").innerText = "連線失敗，請稍後再試。";
    }

    // 4. 綁定按鈕點擊事件：尺寸表彈出視窗
    initSizeGuidePopup();

    // 5. 綁定按鈕點擊事件：BUY NOW 驚喜蓋章與購物車晃動
    initBuyButtonAction();
});

// 渲染試算表內容到對應欄位
function renderProductDetails(item) {
    // 左側相框套入細節長圖 imageextra
    const detailImg = document.getElementById("product-extra-img");
    detailImg.src = item.imageextra || "./images/products/default_extra.jpg";
    detailImg.alt = item.name;

    // 右側便條紙文字串接 (自動對應試算表欄位名稱)
    document.getElementById("product-brand").innerText = item.brand || "璦坊嚴選";
    document.getElementById("product-name").innerText = item.name || "質感童裝";
    document.getElementById("product-code").innerText = `編號: ${item.code || 'K000'}`;
    document.getElementById("product-price").innerText = item.price || "0";
    document.getElementById("product-note").innerText = item.stylingnote || "無特別備註。";

    // 處理顏色規格按鈕 (假設試算表是用逗號「,」或斜線「/」分開，例如: 奶油白/草莓粉)
    const colorGroup = document.getElementById("color-options");
    const colors = item.color ? item.color.split(/[,/，、]/) : ["單一顏色"];
    colors.forEach((c, index) => {
        const pill = document.createElement("button");
        pill.className = "option-pill";
        pill.innerText = c.trim();
        if(index === 0) pill.classList.add("selected"); // 預選第一個
        pill.onclick = () => selectPill(colorGroup, pill);
        colorGroup.appendChild(pill);
    });

    // 處理尺寸規格按鈕
    const sizeGroup = document.getElementById("size-options");
    const sizes = item.size ? item.size.split(/[,/，、]/) : ["F"];
    sizes.forEach((s, index) => {
        const pill = document.createElement("button");
        pill.className = "option-pill";
        pill.innerText = s.trim();
        if(index === 0) pill.classList.add("selected"); // 預選第一個
        pill.onclick = () => selectPill(sizeGroup, pill);
        sizeGroup.appendChild(pill);
    });

    // 預先將尺寸表圖片來源埋進彈出視窗中 (串接 sizeguide 欄位)
    const popupSizeImg = document.getElementById("popup-size-img");
    if(item.sizeguide) {
        popupSizeImg.src = item.sizeguide;
    } else {
        // 如果該商品沒填尺寸表，就用一般公規尺寸圖當備份
        popupSizeImg.src = "images/products/size.jpg"; 
    }
}

// 規格按鈕切換選取狀態
function selectPill(groupElement, targetPill) {
    const pills = groupElement.querySelectorAll(".option-pill");
    pills.forEach(p => p.classList.remove("selected"));
    targetPill.classList.add("selected");
}

// 尺寸表彈出視窗（Popup）開關邏輯
function initSizeGuidePopup() {
    const trigger = document.getElementById("size-guide-btn");
    const overlay = document.getElementById("size-popup-overlay");
    const closeBtn = document.getElementById("close-size-popup");

    if(!trigger || !overlay || !closeBtn) return;

    // 點擊打開
    trigger.addEventListener("click", () => {
        overlay.classList.add("open");
    });

    // 點擊 X 關閉
    closeBtn.addEventListener("click", () => {
        overlay.classList.remove("open");
    });

    // 點擊黑影處關閉
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            overlay.classList.remove("open");
        }
    });
}

// BUY NOW 點擊觸發：隨機印章覆蓋蓋上 1.5 秒＋購物車晃動
function initBuyButtonAction() {
    const buyBtn = document.getElementById("buy-now-btn");
    const buyZone = document.getElementById("buy-zone");
    const cartIcon = document.getElementById("cart-icon");
    const cartCount = document.getElementById("cart-count");

    if (!buyBtn || !buyZone || !cartIcon) return;

    buyBtn.addEventListener("click", () => {
        
        // 1. 防止瘋狂連續點擊產生一堆印章
        if (buyZone.querySelector(".dynamic-stamp-icon")) return;

        // 2. 隨機抽選 1 號或 2 號印章 (未來您加到 10 個，就把 2 改成 10)
        const randomStampNum = Math.floor(Math.random() * 2) + 1;
        
        // 3. 建立印章圖片元件
        const stamp = document.createElement("img");
        stamp.src = `images/ui/stamp${randomStampNum}.png`;
        stamp.className = "dynamic-stamp-icon";
        
        // 4. 製造隨機微調歪斜角度，讓蓋章更具備手繪拼貼真實感 (-15度 ~ +15度)
        const randomRotate = Math.floor(Math.random() * 30) - 15;
        stamp.style.setProperty('--random-rotate', `${randomRotate}deg`);

        // 5. 啪！一聲把印章扔進 BuyZone（覆蓋在按鈕中間正上方）
        buyZone.appendChild(stamp);

        // 6. 觸發右上角購物車靈動搖晃
        cartIcon.classList.add("cart-shake-active");
        
        // 7. 模擬購物車數字加 1
        if(cartCount) {
            let currentCount = parseInt(cartCount.innerText) || 0;
            cartCount.innerText = currentCount + 1;
        }

        // 8. 精準停留在畫面上 1.5 秒後，溫柔淡出消失，並停止購物車搖晃
        setTimeout(() => {
            stamp.style.transition = "opacity 0.4s ease";
            stamp.style.opacity = "0";
            
            // 動畫播完後徹底從網頁拔除該印章標籤
            setTimeout(() => {
                stamp.remove();
                cartIcon.classList.remove("cart-shake-active");
            }, 400);

        }, 1500); // 1500 毫秒 = 1.5 秒
    });
}