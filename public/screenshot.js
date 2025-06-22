let screenshotData = null;

// 从 URL 参数或消息中获取截图数据
function loadScreenshot() {
    // 监听来自 background 脚本的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'displayScreenshot') {
            displayScreenshot(message.dataUrl, message.timestamp);
            sendResponse({ success: true });
        }
    });

    // 检查 URL 参数
    const urlParams = new URLSearchParams(window.location.search);
    const dataUrl = urlParams.get('data');
    const timestamp = urlParams.get('timestamp');
    
    if (dataUrl && timestamp) {
        try {
            const decodedData = decodeURIComponent(dataUrl);
            displayScreenshot(decodedData, decodeURIComponent(timestamp));
        } catch (error) {
            console.error('解析URL参数失败:', error);
            showError();
        }
    }
}

function displayScreenshot(dataUrl, timestamp) {
    screenshotData = dataUrl;
    
    // 更新时间戳
    document.getElementById('timestamp').textContent = '截取时间: ' + timestamp;
    
    // 隐藏加载状态
    document.getElementById('loading').style.display = 'none';
    
    // 显示截图
    const img = document.getElementById('screenshot');
    img.src = dataUrl;
    img.style.display = 'block';
    
    // 显示信息栏
    document.getElementById('infoBar').style.display = 'flex';
    
    // 启用按钮
    document.getElementById('downloadBtn').disabled = false;
    document.getElementById('copyBtn').disabled = false;
    
    // 图片加载完成后计算大小
    img.onload = calculateImageSize;
}

function showError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
}

// 计算并显示图片大小
function calculateImageSize() {
    const img = document.getElementById('screenshot');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob(blob => {
        const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
        const dimensions = img.naturalWidth + ' × ' + img.naturalHeight;
        document.getElementById('imageSize').textContent = 
            dimensions + ' • ' + sizeInMB + ' MB';
    }, 'image/png');
}

// 下载截图
function downloadScreenshot() {
    if (!screenshotData) return;
    
    const link = document.createElement('a');
    link.download = '网页快照_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.png';
    link.href = screenshotData;
    link.click();
}

// 复制到剪贴板
async function copyToClipboard() {
    if (!screenshotData) return;
    
    try {
        // 直接从 data URL 创建 blob，避免 CSP 限制
        const base64Data = screenshotData.split(',')[1];
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        
        for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'image/png' });
        const item = new window.ClipboardItem({'image/png': blob});
        await navigator.clipboard.write([item]);
        
        // 显示成功提示
        showToast('图片已复制到剪贴板');
    } catch (error) {
        console.error('复制失败:', error);
        showToast('复制失败，请尝试下载图片');
    }
}

// 切换图片缩放
function toggleZoom() {
    const img = document.getElementById('screenshot');
    const overlay = document.getElementById('overlay');
    
    if (img.classList.contains('zoomed')) {
        img.classList.remove('zoomed');
        overlay.classList.remove('show');
    } else {
        img.classList.add('zoomed');
        overlay.classList.add('show');
    }
}

// 显示提示消息
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--bs-secondary);
        color: var(--bs-light);
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        z-index: 10000;
        border: 1px solid var(--bs-border-color);
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 触发显示动画
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    // 3秒后隐藏并移除
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadScreenshot();
    
    // 绑定按钮事件
    document.getElementById('downloadBtn').addEventListener('click', downloadScreenshot);
    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
    document.getElementById('screenshot').addEventListener('click', toggleZoom);
    
    // 点击遮罩层关闭放大
    document.getElementById('overlay').addEventListener('click', toggleZoom);
    
    // ESC键关闭放大
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const img = document.getElementById('screenshot');
            if (img.classList.contains('zoomed')) {
                toggleZoom();
            }
        }
    });
}); 