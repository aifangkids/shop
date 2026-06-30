document.addEventListener("DOMContentLoaded", () => {
    // 監聽輸入框的「Enter 鍵」，讓客人打完字按 Enter 也能直接查詢
    const queryInput = document.getElementById("queryInput");
    if (queryInput) {
        queryInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                searchOrder();
            }
        });
    }
});

/**
 * 核心查單功能：對接 js/api.js 的通訊模組
 */
async function searchOrder() {
    const queryInput = document.getElementById("queryInput");
    if (!queryInput) return;

    const queryValue = queryInput.value.trim();
    if (!queryValue) {
        alert("請輸入您的專屬訂單編號或 LINE 名稱唷！");
        return;
    }

    // 獲取按鈕，切換連線中狀態，防止客人連續重複點擊
    const btn = document.querySelector(".search-btn");
    let originalText = "查詢我的商品";
    if (btn) {
        originalText = btn.innerText;
        btn.innerText = "正在為您搜尋...";
        btn.disabled = true;
    }

    try {
        // 直接呼叫 api.js 裡面打包好的 AifangAPI 模組去撈資料
        const res = await AifangAPI.getPendingItems(queryValue);

        if (res.success && res.data.length > 0) {
            // 成功撈到商品！帶入參數跳轉到 detail.html
            window.location.href = `detail.html?id=${encodeURIComponent(queryValue)}`;
        } else {
            alert("找不到您的商品，請確認輸入是否正確，或通知 LINE 官方客服協助處理");
            resetButton(btn, originalText);
        }
    } catch (err) {
        console.error("首頁查詢發生錯誤:", err);
        alert("連線發生錯誤，請稍後再試。");
        resetButton(btn, originalText);
    }
}

function resetButton(btn, text) {
    if (btn) {
        btn.innerText = text;
        btn.disabled = false;
    }
}