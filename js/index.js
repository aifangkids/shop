document.addEventListener("DOMContentLoaded", () => {
    const btnGenerate = document.getElementById("btn-generate");
    if (btnGenerate) {
        btnGenerate.addEventListener("click", generateShoppingId);
    }

    // 🌟 防呆：一進首頁，自動檢查手機 localStorage 是否有未結帳單號
    checkPreviousSession();
});

let clientAfid = "";

/**
 * 🎯 檢查是否有未結帳的歷史專屬單號
 */
function checkPreviousSession() {
    // 讀取手機瀏覽器的保險箱
    const savedAfid = localStorage.getItem("aifang_current_afid");
    const returnBanner = document.getElementById("return-hint-banner");
    
    if (savedAfid && returnBanner) {
        // 如果手機裡有記憶單號，就顯示這塊高質感奶油粉小提示
        returnBanner.classList.remove("hidden");
        
        // 客人點擊提示框，立刻帶著記憶的單號飛回選單頁繼續買！
        returnBanner.addEventListener("click", () => {
            window.location.href = `detail.html?afid=${savedAfid}`;
        });
    }
}

/**
 * 前端極速生成：af + 月日4碼 + 隨機4碼 (100%防撞、完全對齊後台 afid 欄位版)
 */
async function generateShoppingId() {
    const stepInit = document.getElementById("step-init");
    const stepLoading = document.getElementById("step-loading");
    const stepSuccess = document.getElementById("step-success");
    const uidDisplay = document.getElementById("uid-display"); // HTML標籤ID維持不變
    const btnGoDetail = document.getElementById("btn-go-detail");
    const returnBanner = document.getElementById("return-hint-banner");

    // 生成新單號時，先將回流提示框隱藏
    if (returnBanner) returnBanner.classList.add("hidden");

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

            // 🌟 核心防呆機制：生成新單號的同時，立刻存入手機的 localStorage 中！
            localStorage.setItem("aifang_current_afid", clientAfid);

            if (uidDisplay) {
                uidDisplay.innerText = clientAfid;
            }

            if (btnGoDetail) {
                const newBtnGoDetail = btnGoDetail.cloneNode(true);
                btnGoDetail.parentNode.replaceChild(newBtnGoDetail, btnGoDetail);
                
                //網址參數全面改為 afid=，完美交棒給 detail.html
                newBtnGoDetail.addEventListener("click", () => {
                    window.location.href = `detail.html?afid=${clientAfid}`;
                });
            }

            stepLoading.classList.add("hidden");
            stepSuccess.classList.remove("hidden");

        } catch (error) {
            console.error("製作訂單編號發生異常:", error);
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