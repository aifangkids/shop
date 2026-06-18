document.addEventListener("DOMContentLoaded", async () => {
    
    // 【最上方加入】0. 接收自詳情頁點擊分類跳轉回來的網址參數 (例如: index.html?category=TOP)
    const urlParams = new URLSearchParams(window.location.search);
    const targetCategory = urlParams.get('category') ? urlParams.get('category').toUpperCase() : null;

    // 1. 初始化載入商品資料
    const grid = document.getElementById("product-grid");
    try {
        const products = await AiFangAPI.getProducts(); 
        window.cachedProducts = products; 

        if (products.length > 0) {
            // 🌟 核心邏輯：如果網址有帶分類參數，一載入就直接進行過濾渲染；否則展示全部
            if (targetCategory) {
                filterAndRenderProducts(targetCategory);
            } else {
                renderProducts(products);
            }
        } else {
            grid.innerHTML = '<div class="loading-text">目前還擺進任何寶貝商品唷！</div>'; 
        }
    } catch (error) {
        grid.innerHTML = '<div class="loading-text">載入商品失敗，請稍後再試。</div>';
    }

    // 2. 導覽列分類切換邏輯
    const navLinks = document.querySelectorAll(".nav-menu a");

    // 🌟 核心邏輯：如果網址有帶分類參數，初始化時自動把粉色膠囊 (active) 移到該分類上
    if (targetCategory) {
        navLinks.forEach(l => {
            if (l.dataset.category === targetCategory) {
                l.classList.add("active");
            } else {
                l.classList.remove("active");
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove("active"));
            e.target.classList.add("active");

            const category = e.target.dataset.category; 
            filterAndRenderProducts(category);
        });
    });

    // 3. 雲朵彈性跟隨滑鼠
    const cloudNav = document.getElementById('cloud-nav');
    document.addEventListener('mousemove', (e) => {
        if(!cloudNav) return; 
        if (cloudNav.classList.contains('scrolled-icon')) return; 

        const xAxis = (e.clientX / window.innerWidth) - 0.5;
        const yAxis = (e.clientY / window.innerHeight) - 0.5;
        cloudNav.style.transform = `translateX(calc(-50% + ${xAxis * 20}px)) translateY(${yAxis * 10}px)`; 
    });

    // 4. 滾動摺疊導覽列與 Logo 切換
    const nav = document.getElementById('cloud-nav');
    const logoBtn = document.getElementById('nav-logo-btn');
    window.addEventListener('scroll', () => {
        if(!nav) return; 
        
        const flyer = document.getElementById("scroll-decorator");
        if(flyer) flyer.style.transform = `translateY(${window.scrollY * 0.2}px) rotate(${window.scrollY * 0.5}deg)`; 

        if (window.scrollY > 100) {
            nav.classList.add('scrolled-icon'); 
        } else {
            nav.classList.remove('scrolled-icon'); 
            if (!nav.classList.contains('scrolled-icon')) {
                nav.style.transform = 'translateX(-50%)'; 
            }
        }
    });

    if(logoBtn) {
        logoBtn.addEventListener('click', () => {
            nav.classList.remove('scrolled-icon'); 
            nav.style.transform = 'translateX(-50%)'; 
        });
    }

    initPopup(); 

    // 🌟 新增：監聽視窗大小改變，重繪拼貼牆確保 RWD 正常運作
    window.addEventListener("resize", () => {
        if (window.cachedProducts) {
            const urlParams = new URLSearchParams(window.location.search);
            const currentActive = document.querySelector(".nav-menu a.active");
            const category = currentActive ? currentActive.dataset.category : (urlParams.get('category') || "ALL");
            filterAndRenderProducts(category.toUpperCase());
        }
    });
});

function filterAndRenderProducts(category) {
    const allProducts = window.cachedProducts || []; 
    if (category === "ALL") {
        renderProducts(allProducts); 
    } else {
        const filtered = allProducts.filter(p => String(p.category).toUpperCase() === category); 
        renderProducts(filtered);
    }
}

// 核心渲染：絕對定位拼貼舞台與紙膠帶位置
function renderProducts(products) {
    const grid = document.getElementById("product-grid"); // 對應 CSS 的 .masonry-grid 舞台
    grid.innerHTML = ""; 
    
    if (products.length === 0) {
        grid.style.height = "auto";
        grid.innerHTML = '<div class="loading-text">該分類目前沒有商品唷！</div>';
        return;
    }

    const doodlePool = ['🥨', '🧸', '🍒', '☁️', '🐾'];
    const tapeImages = [
        'images/ui/seal1.png',
        'images/ui/seal2.png',
        'images/ui/seal3.png',
        'images/ui/seal4.png'
    ];

    // 🌸 拼貼幾何計算核心參數
    const windowWidth = grid.clientWidth; 
    let colsCount = 4; // 電腦版預設 4 欄
    if (windowWidth < 480) { colsCount = 2; }       // 手機版 2 欄
    else if (windowWidth < 768) { colsCount = 3; }  // 平板版 3 欄

    const cardWidth = 240; // 對應 CSS 中寫死的商品卡片寬度
    const containerWidth = grid.getBoundingClientRect().width;
    
    // 計算出完美的欄間距，讓卡片均勻分散在畫面上
    const remainingSpace = containerWidth - (cardWidth * colsCount);
    const gapX = colsCount > 1 ? remainingSpace / (colsCount - 1) : 0;
    const gapY = 40; // 上下排的基礎間距

    // 用一個陣列來紀錄每一欄目前累積的「底部最新 Y 座標高度」
    const colHeights = Array(colsCount).fill(0);

    products.forEach((item, index) => {
        // 1. 算出這張卡片應該放在哪一欄 (尋找目前高度最短的那一欄放進去)
        let targetCol = 0;
        let minHeight = colHeights[0];
        for (let i = 1; i < colsCount; i++) {
            if (colHeights[i] < minHeight) {
                minHeight = colHeights[i];
                targetCol = i;
            }
        }

        // 2. 規律的基礎 X 座標與 Y 座標
        let leftPos = targetCol * (cardWidth + gapX);
        let topPos = colHeights[targetCol];

        // 3. 拼貼魔法：隨機加上微幅的「手帳不對齊落差」與「隨機角度」
        const randomOffsetX = Math.floor(Math.random() * 16) - 8;   // -8px ~ +8px 左右錯落
        const randomOffsetY = Math.floor(Math.random() * 20) - 5;   // -5px ~ +15px 上下錯落
        const randomCardRotate = (Math.random() * 6 - 3).toFixed(1); // -3deg ~ +3deg 卡片歪斜

        // 建立商品卡片節點
        const code = item.code || "K000"; 
        const name = item.name || "質感童裝"; 
        const price = item.price || "0"; 
        const mainImgUrl = item.imagemain || "images/ui/subplot.png"; 

        const card = document.createElement("div");
        card.className = "product-card";
        card.onclick = (e) => navigateToDetail(e, code); 

        // 🌸 把算好的絕對定位座標與旋轉直接灌入樣式
        card.style.left = `${leftPos + randomOffsetX}px`;
        card.style.top = `${topPos + randomOffsetY}px`;
        card.style.transform = `rotate(${randomCardRotate}deg)`;

        card.innerHTML = `
            <div class="product-img-wrap">
                <img src="${mainImgUrl}" class="product-img main-img" alt="${name}">
            </div>
            <div class="product-info">
                <h3 class="product-name">${name}</h3>
                <div class="product-price">NT$ ${price}</div>
            </div>
        `;

        // 4. 紙膠帶全卡片任意漂浮
        const tape = document.createElement("div");
        tape.className = "washi-tape";
        
        const randomTapeImg = tapeImages[Math.floor(Math.random() * tapeImages.length)];
        tape.style.backgroundImage = `url(${randomTapeImg})`;

        const randomTop = Math.floor(Math.random() * 60) + 10;     // 貼在卡片 10% ~ 70% 高度
        const randomLeft = Math.floor(Math.random() * 50) + 25;    // 貼在卡片 25% ~ 75% 寬度
        const randomTapeRotate = Math.floor(Math.random() * 46) - 23;

        tape.style.top = `${randomTop}%`;
        tape.style.left = `${randomLeft}%`;
        tape.style.transform = `translate(-50%, -50%) rotate(${randomTapeRotate}deg)`; 

        card.appendChild(tape);
        grid.appendChild(card); 

        // 5. 新增：穿插貼紙小塗鴉（讓塗鴉像貼紙一樣獨立存在卡片旁的空隙中）
        if (index > 0 && index % 2 === 0) {
            const doodleDiv = document.createElement("div");
            doodleDiv.className = "sticker-doodle";
            
            const randomDoodle = doodlePool[Math.floor(Math.random() * doodlePool.length)];
            doodleDiv.innerHTML = randomDoodle;
            
            // 讓塗鴉也變成絕對定位，隨機塞在目前卡片的下方或左側空隙
            doodleDiv.style.position = "absolute";
            const doodleRotate = Math.floor(Math.random() * 60) - 30; 
            const doodleScale = (Math.random() * 0.3 + 0.8).toFixed(2); 
            
            // 算在目前卡片的附近空隙中
            doodleDiv.style.left = `${leftPos + cardWidth / 2 + (Math.random() * 60 - 30)}px`;
            doodleDiv.style.top = `${topPos + 350}px`; // 大約在圖片與資訊交界附近
            doodleDiv.style.transform = `rotate(${doodleRotate}deg) scale(${doodleScale})`;
            doodleDiv.style.width = "auto";
            doodleDiv.style.pointerEvents = "none"; // 防止擋住點擊
            
            grid.appendChild(doodleDiv);
        }

        // 6. 更新此欄位的累計高度（3:4比例下卡片估計總高約為 320px 圖片 + 90px 文字與內距）
        const estimatedCardHeight = 410; 
        colHeights[targetCol] = topPos + estimatedCardHeight + gapY;
    });

    // 🌸 終極魔法：找出所有欄位中最高的那一欄，並強制塞給舞台當作總高度，網頁底部就不會縮水！
    const maxHeight = Math.max(...colHeights);
    grid.style.height = `${maxHeight}px`;
}

function initPopup() {
    const popupOverlay = document.getElementById('home-popup');
    const popupImg = document.getElementById('popup-image');
    const closeBtn = document.getElementById('close-popup');
    if (!popupOverlay || !popupImg) return; 

    const popupImages = ['images/popup/popup1.jpg', 'images/popup/popup2.jpg', 'images/popup/popup3.jpg'];
    const selectedPopup = popupImages[Math.floor(Math.random() * popupImages.length)];
    popupImg.src = selectedPopup;
    setTimeout(() => popupOverlay.classList.add('show'), 1200); 

    closeBtn.addEventListener('click', () => popupOverlay.classList.remove('show')); 
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) popupOverlay.classList.remove('show'); 
    });
}

function navigateToDetail(event, productCode) {
    event.preventDefault(); 
    document.body.classList.add("page-leaving"); 
    setTimeout(() => { window.location.href = `detail.html?id=${productCode}`; }, 600); 
}