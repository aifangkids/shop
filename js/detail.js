const API_URL = "https://script.google.com/macros/s/AKfycbwJ0ERb9MhwFqtkMSE9UpfcrtGB7tnnn7LoXYJwSCrCCzn40NubmxQZUCQWqgmMI64c/exec";

let currentProduct = null;
let selectedColor = "";
let selectedSize = "";
let colorImageMap = {};
let defaultMainImageUrl = "";

window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const prodId = urlParams.get('id');

  if (!prodId) {
    alert("找不到商品編號，為您導回首頁。");
    window.location.href = "index.html";
    return;
  }

  await loadProductDetail(prodId);
});

// 異步載入詳情與解析全新品牌、大分類結構
async function loadProductDetail(prodId) {
  try {
    const response = await fetch(`${API_URL}?action=getProductCatalog`);
    const result = await response.json();

    if (!result.success) {
      alert("讀取雲端商品庫失敗：" + result.message);
      return;
    }

    // 【自動動態小分類】：自動收集試算表裡所有上架衣服的「品牌」，放進下拉選單
    populateBrandSelector(result.data);

    // 尋找對應衣服
    currentProduct = result.data.find(p => p.prodId === prodId);

    if (!currentProduct) {
      alert("此商品已下架或編號不存在唷！");
      window.location.href = "index.html";
      return;
    }

    // 渲染畫面
    document.getElementById('product-title').innerText = currentProduct.prodName;
    document.getElementById('product-price').innerText = `TWD $${currentProduct.price.toLocaleString()}`;
    
    defaultMainImageUrl = currentProduct.imgUrl || "https://placehold.co/600x600?text=AiFang+Studio";
    document.getElementById('main-product-img').src = defaultMainImageUrl;

    if (currentProduct.note && currentProduct.note.trim() !== "") {
      document.getElementById('product-note').innerText = currentProduct.note;
    }

    parseColorImageMap(currentProduct.colorImgMap);
    renderColorButtons(currentProduct.color);
    renderSizeButtons(currentProduct.size);

  } catch (error) {
    alert("連線到 Google 資料庫發生異常：" + error.toString());
  }
}

// 動態將大表裡不重複的品牌做成下拉選項
function populateBrandSelector(allProducts) {
  const selectElement = document.getElementById('brand-nav-select');
  const uniqueBrands = new Set();

  allProducts.forEach(p => {
    if (p.brand && p.brand.trim() !== "") {
      uniqueBrands.add(p.brand.trim());
    }
  });

  uniqueBrands.forEach(brandName => {
    const opt = document.createElement('option');
    opt.value = brandName;
    opt.innerText = brandName;
    selectElement.appendChild(opt);
  });
}

// 小分類品牌跳轉控制
function navigateToBrand(selectElement) {
  const selectedBrand = selectElement.value;
  if (selectedBrand) {
    // 帶著品牌參數回到首頁進行篩選
    window.location.href = `index.html?brand=${encodeURIComponent(selectedBrand)}`;
  }
}

// 以下為原本運作完全正確的邏輯，完整保留：
function parseColorImageMap(mapStr) {
  colorImageMap = {};
  if (!mapStr || mapStr.trim() === "") return;
  const lines = mapStr.split(/[\n,]/);
  lines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const colorName = line.substring(0, colonIndex).trim();
      const imgUrl = line.substring(colonIndex + 1).trim();
      if (colorName && imgUrl) {
        colorImageMap[colorName] = imgUrl;
      }
    }
  });
}

function renderColorButtons(colorStr) {
  const container = document.getElementById('color-options');
  container.innerHTML = "";
  if (!colorStr) return;
  const colors = colorStr.split(',');
  colors.forEach(color => {
    const trimmedColor = color.trim();
    if (!trimmedColor) return;
    const btn = document.createElement('button');
    btn.className = "spec-btn";
    btn.innerText = trimmedColor;
    btn.onclick = () => {
      container.querySelectorAll('.spec-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = trimmedColor;
      const mainImgElement = document.getElementById('main-product-img');
      if (colorImageMap[trimmedColor]) {
        mainImgElement.src = colorImageMap[trimmedColor];
      } else {
        mainImgElement.src = defaultMainImageUrl;
      }
    };
    container.appendChild(btn);
  });
}

function renderSizeButtons(sizeStr) {
  const container = document.getElementById('size-options');
  container.innerHTML = "";
  if (!sizeStr) return;
  const sizes = sizeStr.split(',');
  sizes.forEach(size => {
    const trimmedSize = size.trim();
    if (!trimmedSize) return;
    const btn = document.createElement('button');
    btn.className = "spec-btn";
    btn.innerText = trimmedSize;
    btn.onclick = () => {
      container.querySelectorAll('.spec-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = trimmedSize;
    };
    container.appendChild(btn);
  });
}

async function handleAddToCart() {
  if (!currentProduct) return;
  if (!selectedColor) { alert("請先點選顏色唷！"); return; }
  if (!selectedSize) { alert("請先點選尺寸唷！"); return; }

  const cartBtn = document.getElementById('add-to-cart-btn');
  cartBtn.disabled = true;
  cartBtn.innerText = "正在放入購物車...";

  const payload = {
    action: "addPending",
    prodId: currentProduct.prodId,
    prodName: currentProduct.prodName,
    color: selectedColor,
    size: selectedSize,
    price: currentProduct.price,
    quantity: 1,
    imgUrl: colorImageMap[selectedColor] || defaultMainImageUrl
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.success) {
      window.location.href = "cart.html";
    } else {
      alert("購物車包裹遺失：" + result.message);
      cartBtn.disabled = false;
      cartBtn.innerText = "🛒 加入購物車並前往結帳";
    }
  } catch (error) {
    alert("連線逾時：" + error.toString());
    cartBtn.disabled = false;
    cartBtn.innerText = "🛒 加入購物車並前往結帳";
  }
}