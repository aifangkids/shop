document.addEventListener("DOMContentLoaded", async () => {
    
    // 1. 初始化載入商品資料
    const grid = document.getElementById("product-grid");
    try {
        const products = await AiFangAPI.getProducts(); /* [cite: 52] */
        window.cachedProducts = products; 

        if (products.length > 0) {
            renderProducts(products);
        } else {
            grid.innerHTML = '<div class="loading-text">目前還沒有上架商品唷！</div>'; /* [cite: 52] */
        }
    } catch (error) {
        grid.innerHTML = '<div class="loading-text">載入商品失敗，請稍後再試。</div>';
    }

    // 2. 導覽列分類切換邏輯
    const navLinks = document.querySelectorAll(".nav-menu a");
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove("active"));
            e.target.classList.add("active");

            const category = e.target.dataset.category; /* [cite: 54] */
            filterAndRenderProducts(category);
        });
    });

    // 3. 雲朵彈性跟隨滑鼠
    const cloudNav = document.getElementById('cloud-nav');
    document.addEventListener('mousemove', (e) => {
        if(!cloudNav) return; /* [cite: 56] */
        if (cloudNav.classList.contains('scrolled-icon')) return; /* [cite: 56] */

        const xAxis = (e.clientX / window.innerWidth) - 0.5;
        const yAxis = (e.clientY / window.innerHeight) - 0.5;
        cloudNav.style.transform = `translateX(calc(-50% + ${xAxis * 20}px)) translateY(${yAxis * 10}px)`; /* [cite: 56] */
    });

    // 4. 滾動摺疊導覽列與 Logo 切換
    const nav = document.getElementById('cloud-nav');
    const logoBtn = document.getElementById('nav-logo-btn');
    window.addEventListener('scroll', () => {
        if(!nav) return; /* [cite: 58] */
        
        const flyer = document.getElementById("scroll-decorator");
        if(flyer) flyer.style.transform = `translateY(${window.scrollY * 0.2}px) rotate(${window.scrollY * 0.5}deg)`; /* [cite: 58] */

        if (window.scrollY > 100) {
            nav.classList.add('scrolled-icon'); /* [cite: 58] */
        } else {
            nav.classList.remove('scrolled-icon'); /* [cite: 59] */
            if (!nav.classList.contains('scrolled-icon')) {
                nav.style.transform = 'translateX(-50%)'; /* [cite: 59] */
            }
        }
    });

    if(logoBtn) {
        logoBtn.addEventListener('click', () => {
            nav.classList.remove('scrolled-icon'); /* [cite: 60] */
            nav.style.transform = 'translateX(-50%)'; /* [cite: 60] */
        });
    }

    initPopup(); /* [cite: 61] */
});

function filterAndRenderProducts(category) {
    const allProducts = window.cachedProducts || []; /* [cite: 62] */
    if (category === "ALL") {
        renderProducts(allProducts); /* [cite: 63] */
    } else {
        const filtered = allProducts.filter(p => String(p.category).toUpperCase() === category); /* [cite: 64] */
        renderProducts(filtered);
    }
}

// 核心渲染：徹底解放紙膠帶位置
function renderProducts(products) {
    const grid = document.getElementById("product-grid");
    grid.innerHTML = ""; /* [cite: 65] */
    
    const doodlePool = ['✨', '🥨', '🧸', '🎶', '🍒', '☁️', '🎈', '🐾'];
    const tapeImages = [
        'images/ui/seal1.png',
        'images/ui/seal2.png',
        'images/ui/seal3.png',
        'images/ui/seal4.png'
    ];

    products.forEach((item, index) => {
        // 每隔 2 個商品就穿插一個小塗鴉，確保少數商品也能看到
        if (index > 0 && index % 2 === 0) {
            const doodleDiv = document.createElement("div");
            doodleDiv.className = "sticker-doodle";
            
            // 每次完全隨機抽取符號
            const randomDoodle = doodlePool[Math.floor(Math.random() * doodlePool.length)];
            doodleDiv.innerHTML = randomDoodle;
            
            // 全隨機跳動：隨機旋轉、縮放與左右位移
            const doodleRotate = Math.floor(Math.random() * 50) - 25; 
            const doodleScale = (Math.random() * 0.4 + 0.8).toFixed(2); 
            const doodleOffset = Math.floor(Math.random() * 60) - 30; 
            
            doodleDiv.style.transform = `rotate(${doodleRotate}deg) scale(${doodleScale})`;
            doodleDiv.style.marginLeft = `${doodleOffset}px`;
            
            grid.appendChild(doodleDiv);
        }

        const code = item.code || "K000"; /* [cite: 66] */
        const name = item.name || "質感童裝"; /* [cite: 66] */
        const price = item.price || "0"; /* [cite: 66] */
        const mainImgUrl = item.imagemain || "./images/products/momoann01.jpg"; /* [cite: 66] */

        const card = document.createElement("div");
        card.className = "product-card";
        card.onclick = (e) => navigateToDetail(e, code); /* [cite: 67] */

        // 隨機卡片頂部間距，打造手工拼貼錯落美感
        card.style.marginTop = `${Math.floor(Math.random() * 35)}px`;

        card.innerHTML = `
            <div class="product-img-wrap">
                <img src="${mainImgUrl}" class="product-img main-img" alt="${name}">
            </div>
            <div class="product-info">
                <h3 class="product-name">${name}</h3>
                <div class="product-price">NT$ ${price}</div>
            </div>
        `;

        // 🌟 【核心修復：紙膠帶全卡片任意漂浮】🌟
        const tape = document.createElement("div");
        tape.className = "washi-tape";
        
        const randomTapeImg = tapeImages[Math.floor(Math.random() * tapeImages.length)];
        tape.style.backgroundImage = `url(${randomTapeImg})`;

        // 允許出現在整張卡片的任何地方 (從最上面到文字區皆可貼)
        const randomTop = Math.floor(Math.random() * 75) + 5;     // 垂直區間：卡片的 5% ~ 80% 高度
        const randomLeft = Math.floor(Math.random() * 55) + 20;    // 水平區間：卡片的 20% ~ 75% 寬度
        const randomRotate = Math.floor(Math.random() * 46) - 23;  // 隨機傾斜：大幅度傾斜 -23deg ~ 23deg

        tape.style.top = `${randomTop}%`;
        tape.style.left = `${randomLeft}%`;
        tape.style.transform = `translate(-50%, -50%) rotate(${randomRotate}deg)`; // 改用雙向居中對齊

        card.appendChild(tape);
        grid.appendChild(card); /* [cite: 69] */
    });
}

function initPopup() {
    const popupOverlay = document.getElementById('home-popup');
    const popupImg = document.getElementById('popup-image');
    const closeBtn = document.getElementById('close-popup');
    if (!popupOverlay || !popupImg) return; /* [cite: 70] */

    const popupImages = ['images/popup/popup1.jpg', 'images/popup/popup2.jpg', 'images/popup/popup3.jpg'];
    popupImg.src = popupImages[Math.floor(Math.random() * popupImages.length)];
    setTimeout(() => popupOverlay.classList.add('show'), 1200); /* [cite: 70] */

    closeBtn.addEventListener('click', () => popupOverlay.classList.remove('show')); /* [cite: 71] */
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) popupOverlay.classList.remove('show'); /* [cite: 71] */
    });
}

function navigateToDetail(event, productCode) {
    event.preventDefault(); /* [cite: 72] */
    document.body.classList.add("page-leaving"); /* [cite: 72] */
    setTimeout(() => { window.location.href = `detail.html?id=${productCode}`; }, 600); /* [cite: 72] */
}