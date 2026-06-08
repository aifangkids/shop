const AiFangAPI = {
    // 您的 Google Apps Script 部署網址
    URL: "https://script.google.com/macros/s/AKfycbwgwzu96gbL1s2b7ZPVOiPJZDaBRHrx2K0zXYT5fblENjKJBYDa6v9O2gnkBuIEuXcMyQ/exec",

    /**
     * 🌸 1. 取得商品列表 
     * @param {boolean} nocache 
     * @returns {Promise<Array>} 
     */
    async getProducts(nocache = false) {
        try {
            let fetchUrl = `${this.URL}?mode=getProducts`;
            if (nocache) fetchUrl += "&nocache=1";

            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error("網路連線回應異常");
            
            const data = await response.json();
            return data.products || [];
        } catch (error) {
            console.error("[API 錯誤] 取得商品列表失敗:", error);
            return [];
        }
    },

    /**
     * 🛒 2. 送出新訂單 
     * @param {Object} orderData 訂單基本資訊 
     * @param {Array} items 購物車內商品的明細陣列 
     * @returns {Promise<Object>} 回傳 
     */
    async submitOrder(orderData, items) {
        try {
            const payload = {
                order_data: {
                    orderid: orderData.orderid,
                    customername: orderData.customername,
                    customeremail: orderData.customeremail,
                    total: Number(orderData.total),
                    shipping: orderData.shipping || "7-11"
                },
                items: items.map(item => ({
                    code: String(item.code).trim(),
                    name: item.name,
                    color: item.color,
                    size: item.size,
                    quantity: Number(item.quantity),
                    unitprice: Number(item.unitprice),
                    koreancolor: item.koreancolor || "" 
                }))
            };

            const response = await fetch(this.URL, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("網路連線回應異常");

            const result = await response.json();
            return result;
        } catch (error) {
            console.error("[API 錯誤] 提交訂單失敗:", error);
            return { success: false, error: error.toString() };
        }
    },

    /**
     * 🔑 3. 抓取全站訂單與明細 
     * @param {boolean} nocache 是否強制跳過快取更新 (預設為 false)
     * @returns {Promise<Object>} 回傳包含 
     */
    async getOrders(nocache = false) {
        try {
            let fetchUrl = `${this.URL}?mode=getOrders`;
            if (nocache) fetchUrl += "&nocache=1";

            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error("網路連線回應異常");

            const data = await response.json();
            return {
                orders: data.orders || [],
                items: data.items || []
            };
        } catch (error) {
            console.error("[API 錯誤] 抓取訂單明細失敗:", error);
            return { orders: [], items: [] };
        }
    }
};

/* ==========================================================================
   🌸 自動化動態飄落背景系統 
   ========================================================================== */
function startGlobalFallingParticles() {
    // 統一的圖片路徑
    const particleImages = [
        './images/ui/01.png',
        './images/ui/02.png',
        './images/ui/03.png',
        './images/ui/04.png',
        './images/ui/05.png'
    ];

    function createParticle() {
        const container = document.getElementById('falling-container');
        if (!container) return;

        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // 隨機抽取圖片
        const randomImg = particleImages[Math.floor(Math.random() * particleImages.length)];
        particle.style.backgroundImage = `url('${randomImg}')`;

        // 隨機設定尺寸 (20px ~ 100px)
        const size = Math.random() * 20 + 80;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}vw`;

        // 隨機設定下落速度 (9秒 ~ 16秒，營造慢速質感)
        const duration = Math.random() * 7 + 9;
        particle.style.animationDuration = `${duration}s`;

        // 隨機左右物理飄移與旋轉角度
        const driftX = (Math.random() * 100) - 50; 
        const driftRotate = (Math.random() * 360) - 180;
        particle.style.setProperty('--drift-x', `${driftX}px`);
        particle.style.setProperty('--drift-rotate', `${driftRotate}deg`);

        container.appendChild(particle);

        // 動畫結束後自動刪除，不佔用手機記憶體
        setTimeout(() => { particle.remove(); }, duration * 1000);
    }

    // 每 800 毫秒產生一顆新粒子
    setInterval(createParticle, 800);
    
    // 初始化立刻產生 5 顆，避免剛開網頁時畫面太光禿禿
    for(let i = 0; i < 5; i++) {
        setTimeout(createParticle, i * 400);
    }
}

// 監聽全網頁載入事件：當 HTML 準備好時，自動塞入容器並啟動
window.addEventListener('DOMContentLoaded', () => {
    // 如果頁面中還沒有這個背景容器，就自動用 JS 在 <body> 的最上方幫它生一個出來
    if (!document.getElementById('falling-container')) {
        const fallingDiv = document.createElement('div');
        fallingDiv.id = 'falling-container';
        document.body.prepend(fallingDiv);
    }
    // 啟動飄落系統
    startGlobalFallingParticles();
});