// ==========================================================
// 🧸 Aifangkids 璦坊微型電商 - 首頁前端串接大腦 (index.js)
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
    const btnGenerate = document.getElementById("btn-generate");
    if (btnGenerate) {
        btnGenerate.addEventListener("click", generateShoppingId);
    }
});

// 📌 老闆娘部署完畢的專屬純 API 後台網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwJ0ERb9MhwFqtkMSE9UpfcrtGB7tnnn7LoXYJwSCrCCzn40NubmxQZUCQWqgmMI64c/exec";

let clientUid = "";

/**
 * 向 GAS 後台索取一個全新的不重複 af 購物編號
 */
async function generateShoppingId() {
    // 1. 抓取三個進度狀態的 HTML 區塊
    const stepInit = document.getElementById("step-init");
    const stepLoading = document.getElementById("step-loading");
    const stepSuccess = document.getElementById("step-success");
    const uidDisplay = document.getElementById("uid-display");
    const btnGoDetail = document.getElementById("btn-go-detail");

    // 2. 切換成「載入中」畫面
    stepInit.classList.add("hidden");
    stepLoading.classList.remove("hidden");

    try {
        // 3. 發送 GET 請求給總機，帶入指令 action=generateUid
        const targetUrl = `${GAS_API_URL}?action=generateUid`;
        const response = await fetch(targetUrl);
        
        if (!response.ok) throw new Error("網路回應不正常");
        
        const result = await response.json();

        if (result.success && result.uid) {
            clientUid = result.uid;
            
            // 4. 將生成的 af 編號塞入畫面中
            uidDisplay.innerText = clientUid;
            
            // 5. 設定下一步按鈕的跳轉目標 (帶上 ?uid=參數)
            btnGoDetail.addEventListener("click", () => {
                window.location.href = `detail.html?p=detail&uid=${clientUid}`;
            });

            // 6. 翻開成功畫面
            stepLoading.classList.add("hidden");
            stepSuccess.classList.remove("hidden");
        } else {
            alert("後台系統忙碌中，請重新點擊一次");
            resetToInit();
        }

    } catch (error) {
        console.error("生成編號失敗:", error);
        alert("連線失敗，請檢查網路是否通暢，或稍後再試");
        resetToInit();
    }
}

/**
 * 發生異常時的防呆重置
 */
function resetToInit() {
    document.getElementById("step-init").classList.remove("hidden");
    document.getElementById("step-loading").classList.add("hidden");
    document.getElementById("step-success").classList.add("hidden");
}