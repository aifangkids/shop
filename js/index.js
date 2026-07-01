// ==========================================================
// 🧸 Aifangkids 璦坊微型電商 - 首頁前端串接大腦 (index.js)
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
    const btnGenerate = document.getElementById("btn-generate");
    if (btnGenerate) {
        btnGenerate.addEventListener("click", generateShoppingId);
    }
});

let clientAfid = "";

/**
 * 前端極速生成：af + 月日4碼 + 隨機4碼 (100%防撞、完全對齊後台 afid 欄位版)
 */
async function generateShoppingId() {
    const stepInit = document.getElementById("step-init");
    const stepLoading = document.getElementById("step-loading");
    const stepSuccess = document.getElementById("step-success");
    const uidDisplay = document.getElementById("uid-display"); // HTML標籤ID維持不變
    const btnGoDetail = document.getElementById("btn-go-detail");

    stepInit.classList.add("hidden");
    stepLoading.classList.remove("hidden");

    setTimeout(() => {
        try {
            // 🎯 核心防撞：加入當前月日
            const now = new Date();
            const mm = String(now.getMonth() + 1).padStart(2, '0'); // 月份 (例: 07)
            const dd = String(now.getDate()).padStart(2, '0');     // 日期 (例: 02)
            
            // 生成 0000 到 9999 之間的隨機 4 位數
            const randNum = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
            
            // 完美組合出老闆娘的 afid（例：af07028816）
            clientAfid = `af${mm}${dd}${randNum}`;

            if (uidDisplay) {
                uidDisplay.innerText = clientAfid;
            }

            if (btnGoDetail) {
                const newBtnGoDetail = btnGoDetail.cloneNode(true);
                btnGoDetail.parentNode.replaceChild(newBtnGoDetail, btnGoDetail);
                
                // 📌 關鍵修正：網址參數全面改為 afid=，完美交棒給 detail.html
                newBtnGoDetail.addEventListener("click", () => {
                    window.location.href = `detail.html?afid=${clientAfid}`;
                });
            }

            stepLoading.classList.add("hidden");
            stepSuccess.classList.remove("hidden");

        } catch (error) {
            console.error("生成編號發生異常:", error);
            alert("系統判定異常，請重新點擊一次。");
            resetToInit();
        }
    }, 400); 
}

function resetToInit() {
    document.getElementById("step-init").classList.remove("hidden");
    document.getElementById("step-loading").classList.add("hidden");
    document.getElementById("step-success").classList.add("hidden");
}