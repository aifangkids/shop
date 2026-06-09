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

// 核心渲染：徹底解放紙膠帶位置
function renderProducts(products) {
    const grid = document.getElementById("product-grid");
    grid.innerHTML = ""; 
    
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

        const code = item.code || "K000"; 
        const name = item.name || "質感童裝"; 
        const price = item.price || "0"; 
        
        // ⚙️ 修正點：防呆機制，若主圖不存在，改用 logo.png 代替，防止已下架圖片噴 404 錯誤
        const mainImgUrl = item.imagemain || "images/ui/subplot.png"; 

        const card = document.createElement("div");
        card.className = "product-card";
        card.onclick = (e) => navigateToDetail(e, code); 

        // 隨機卡片頂部間距，打造手工拼貼錯落美感
        card.style.marginTop = `${Math.floor(Math.random() * 10)}px`;

        card.innerHTML = `
            <div class="product-img-wrap">
                <img src="${mainImgUrl}" class="product-img main-img" alt="${name}">
            </div>
            <div class="product-info">
                <h3 class="product-name">${name}</h3>
                <div class="product-price">NT$ ${price}</div>
            </div>
        `;

        // 🌟 紙膠帶全卡片任意漂浮
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
        tape.style.transform = `translate(-50%, -50%) rotate(${randomRotate}deg)`; 

        card.appendChild(tape);
        grid.appendChild(card); 
    });
}

function initPopup() {
    const popupOverlay = document.getElementById('home-popup');
    const popupImg = document.getElementById('popup-image');
    const closeBtn = document.getElementById('close-popup');
    if (!popupOverlay || !popupImg) return; 

    const popupImages = ['images/popup/popup1.jpg', 'images/popup/popup2.jpg', 'images/popup/popup3.jpg'];
    popupImg.src = popupImages[Math.floor(Math.random() * popupImages.length)];
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