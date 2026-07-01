// ==========================================================
// 🧸 Aifangkids 璦坊微型電商 - 購物車前端資料大腦 (cart.js)
// ==========================================================

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwJ0ERb9MhwFqtkMSE9UpfcrtGB7tnnn7LoXYJwSCrCCzn40NubmxQZUCQWqgmMI64c/exec";

let clientUid = "";
let loadedCartItems = []; // 儲存從後台撈回來的暫存衣服

document.addEventListener("DOMContentLoaded", () => {
    // 1. 解析網址中的 uid
    const urlParams = new URLSearchParams(window.location.search);
    clientUid = urlParams.get("uid") || "";

    if (!clientUid) {
        alert("找不到您的專屬訂單編號，將引導您返回首頁");
        window.location.href = "index.html";
        return;
    }

    document.getElementById("txt-cart-uid").innerText = clientUid;

    // 2. 自動向 GAS 調度該代號底下的購物車明細
    fetchCartDetails();
});

/**
 * 撈取該 uid 的購物車暫存列表
 */
async function fetchCartDetails() {
    const loader = document.getElementById("cart-loading");
    const container = document.getElementById("cart-items-container");

    try {
        const response = await fetch(`${GAS_API_URL}?action=getCart&uid=${clientUid}`);
        if (!response.ok) throw new Error("撈取購物車失敗");
        
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            loadedCartItems = result.data;
            renderCartList(loadedCartItems);
            loader.classList.add("hidden");
        } else {
            loader.innerHTML = "🫙 您的購物車目前空空如也唷！趕快回上一頁挑選";
            document.getElementById("btn-submit-order").disabled = true;
            document.getElementById("btn-submit-order").style.opacity = "0.5";
        }
    } catch (error) {
        console.error("購物車載入錯誤:", error);
        loader.innerHTML = "<p style='color:red;'>🐾 撈取明細時線路稍微塞車，請重新整理網頁</p>";
    }
}

/**
 * 渲染購物車內每件衣服的精緻小橫列
 */
function renderCartList(items) {
    const container = document.getElementById("cart-items-container");
    container.innerHTML = "";

    let totalQty = 0;
    let totalAmount = 0;

    items.forEach(item => {
        const subtotal = item.price * item.quantity;
        totalQty += item.quantity;
        totalAmount += subtotal;

        const displayImg = item.imgUrl && item.imgUrl.trim() !== "" ? item.imgUrl : "https://placehold.co/100x100/fdfaf7/8c7662?text=衣物";

        const row = document.createElement("div");
        row.classList.add("cart-item-row");
        row.innerHTML = `
            <img class="cart-item-thumb" src="${displayImg}" alt="${item.prodName}" onerror="this.src='https://placehold.co/100x100/fdfaf7/8c7662?text=衣物'">
            <div class="cart-item-detail">
                <div class="cart-item-name">${item.prodName}</div>
                <div class="cart-item-meta">
                    ${item.color ? `<span>顏色: ${item.color}</span>` : ''}
                    ${item.size ? `<span>規格: ${item.size}</span>` : ''}
                </div>
            </div>
            <div class="cart-item-right">
                <div class="cart-item-qty">x ${item.quantity}</div>
                <div class="cart-item-subtotal">$${subtotal}</div>
            </div>
        `;
        container.appendChild(row);
    });

    // 將總計數值寫入畫面
    document.getElementById("total-qty").innerText = totalQty;
    document.getElementById("total-amount").innerText = totalAmount;
}

/**
 * 📌 依據選定的超商物流，動態調整門市提示字樣（依最新規格限定 7-11 與 全家）
 */
window.toggleStoreInfoHint = function() {
    const logistics = document.getElementById("ipt-logistics").value;
    const textarea = document.getElementById("ipt-storeInfo");
    
    if (logistics === "7-11") {
        textarea.placeholder = "請輸入 7-11 的【門市店號(六碼)】與【店名】\n（例如：123456 豐業門市）";
    } else if (logistics === "全家") {
        textarea.placeholder = "請輸入全家的【店舖號(六碼)】與【店名】\n（例如：012345 全家新福店）";
    } else {
        textarea.placeholder = "請先選擇上方的取貨方式";
    }
};

/**
 * 送出表單：打包所有欄位，以 POST 正式遞交給 GAS 成立訂單
 */
async function handleCheckout(event) {
    event.preventDefault(); // 攔截傳統網頁跳轉

    const btnSubmit = document.getElementById("btn-submit-order");
    btnSubmit.innerText = "🐾 正在為您向雲端傳送訂單中，請勿關閉網頁...";
    btnSubmit.disabled = true;

    // 彙整資料欄位
    const orderData = {
        uid: clientUid,
        lineName: document.getElementById("ipt-lineName").value.trim(),
        receiverName: document.getElementById("ipt-receiverName").value.trim(),
        phone: document.getElementById("ipt-phone").value.trim(),
        email: document.getElementById("ipt-email").value.trim(),
        logistics: document.getElementById("ipt-logistics").value,
        storeInfo: document.getElementById("ipt-storeInfo").value.trim(),
        lastFive: document.getElementById("ipt-lastFive").value.trim(),
        items: loadedCartItems // 把剛剛讀到的衣物陣列一併附上
    };

    const payload = {
        action: "submitOrder",
        orderData: orderData
    };

    try {
        const response = await fetch(GAS_API_URL, {
            method: "POST",
            mode: "cors",
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("正式結帳網路異常");
        const result = await response.json();

        if (result.success) {
            // 訂單成立成功！秀出收據畫面
            document.getElementById("cart-main-view").classList.add("hidden");
            
            document.getElementById("rec-uid").innerText = clientUid;
            document.getElementById("rec-shippingId").innerText = result.shippingId; // 來自後台生出的 shXXXX 單號
            
            document.getElementById("cart-success-view").classList.remove("hidden");
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("後台系統拒絕了這次提交：" + result.message);
            btnSubmit.innerText = "✨ 儲存資料，正式成立訂單 ➔";
            btnSubmit.disabled = false;
        }

    } catch (error) {
        console.error("提交正式訂單異常:", error);
        alert("連線後台逾時，請檢查手機網路，或點擊下方按鈕重新試一次唷！");
        btnSubmit.innerText = "✨ 儲存資料，正式成立訂單 ➔";
        btnSubmit.disabled = false;
    }
}