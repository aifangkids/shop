document.addEventListener("DOMContentLoaded", () => {
    startFallingParticles();
});

function startFallingParticles() {
    const container = document.getElementById('falling-container');
    if (!container) return;

    // 📌 妳的五張專屬 UI 飄落圖片路徑
    const particleImages = [
        'images/ui/01.png',
        'images/ui/02.png',
        'images/ui/03.png',
        'images/ui/04.png',
        'images/ui/05.png'
    ];

    function createParticle() {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // 隨機尺寸 (20px ~ 40px)
        const size = Math.random() * 20 + 20; 
        // 隨機水平起點
        const left = Math.random() * 100;
        // 隨機飄落速度 (7秒 ~ 12秒)
        const duration = Math.random() * 5 + 7; 
        // 隨機左右物理飄移與旋轉（由 CSS var 承接）
        const driftX = (Math.random() * 120 - 60) + 'px';
        const driftRotate = (Math.random() * 360 - 180) + 'deg';

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${left}vw`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.setProperty('--drift-x', driftX);
        particle.style.setProperty('--drift-rotate', driftRotate);
        
        // 隨機挑選一張圖片作為背景
        const randomImage = particleImages[Math.floor(Math.random() * particleImages.length)];
        particle.style.backgroundImage = `url('${randomImage}')`;

        container.appendChild(particle);

        // 動畫結束後自動刪除，釋放手機記憶體
        setTimeout(() => { 
            particle.remove(); 
        }, duration * 1000);
    }

    // 每 500 毫秒（0.5秒）產生一顆
    setInterval(createParticle, 500);
}