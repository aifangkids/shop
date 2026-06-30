const API_URL = "https://script.google.com/macros/s/AKfycbxp4Zus5yzQO7VhNBPb3KsP8RC100RCz0niw12UuZuXNgQwKXGiIcwSrUyzDcfJdY-U/exec";

const AifangAPI = {
    /**
     * 行為 A (讀取)：從【待核對商品表】撈取屬於客人的多件商品明細
     * 適用頁面：index.html (驗證)、detail.html (載入清單)
     * @param {string} id - 專屬訂單編號 (afXXXX) 或 LINE 暱稱
     */
    getPendingItems: async function(id) {
        try {
            const response = await fetch(`${API_URL}?action=getPending&id=${encodeURIComponent(id)}`);
            if (!response.ok) throw new Error("網路連線異常");
            return await response.json();
        } catch (error) {
            console.error("getPendingItems 發生錯誤:", error);
            return { success: false, message: "無法連線至後台，請稍後再試。" };
        }
    },

    /**
     * 行為 B (讀取)：從【已成立訂單總表】與【明細表】撈取歷史訂單與狀態進度
     * 適用頁面：order_lookup.html (歷史訂單查詢)
     * @param {string} afId - 專屬訂單編號 (afXXXX)
     */
    lookupHistoryOrder: async function(afId) {
        try {
            const response = await fetch(`${API_URL}?action=lookupOrder&id=${encodeURIComponent(afId)}`);
            if (!response.ok) throw new Error("網路連線異常");
            return await response.json();
        } catch (error) {
            console.error("lookupHistoryOrder 發生錯誤:", error);
            return { success: false, message: "訂單查詢失敗，請確認編號是否正確。" };
        }
    },

    /**
     * 行為 A (寫入/即時同步)：客人在 detail.html 調整數量、刪除或填寫備註時，即時更新至【待核對商品表】
     * @param {Array} updates - 需要更新數量與備註的商品陣列
     * @param {Array} deleteRows - 需要刪除的 Excel 列號 (rowNum) 陣列
     */
    syncPendingChanges: async function(updates, deleteRows) {
        try {
            const payload = {
                action: "updatePending",
                updates: updates,
                deleteRows: deleteRows
            };
            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("網路連線異常");
            return await response.json();
        } catch (error) {
            console.error("syncPendingChanges 發生錯誤:", error);
            return { success: false, message: "即時同步至後台失敗。" };
        }
    },

    /**
     * 行為 B (寫入/正式下單)：客人在 cart.html 按下「完成訂單」，結帳並轉移至正式表
     * 📌 已加入終極防呆：完美支援單一包裝物件與多參數傳入，精準對接 googleappscode.gs
     */
    submitFinalOrder: async function(orderId, checkoutInfo, finalItems) {
        try {
            let payload;

            // 檢查第一個參數是否為已經打包好的完整 Payload 物件
            if (typeof orderId === "object" && orderId !== null && orderId.action === "submitOrder") {
                payload = orderId;
            } else {
                // 如果是個別參數傳入，則自動組裝成後台 code.gs 期待的結構
                payload = {
                    action: "submitOrder",
                    orderId: orderId,
                    checkoutInfo: checkoutInfo,
                    finalItems: finalItems
                };
            }

            // 發送請求 (不主動設定 Content-Type 以避免觸發瀏覽器的 OPTIONS 預檢連線阻擋)
            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("網路連線異常");
            return await response.json();
        } catch (error) {
            console.error("submitFinalOrder 發生錯誤:", error);
            return { success: false, message: "訂單送出失敗，請確認網路連線或通知 LINE 官方客服。" };
        }
    },

    /**
     * 工具小幫手：從目前網頁網址列中快速撈取特定的 URL 參數值
     * @param {string} name - 參數名稱 (例如 'id')
     */
    getURLParameter: function(name) {
        const results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
            return null;
        }
        return decodeURIComponent(results[1]) || 0;
    }
};