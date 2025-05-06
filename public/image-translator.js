/**
 * Transor - 图片文案翻译功能
 * 为网页图片提供文字识别和翻译功能
 */

// 状态变量
let selectedImage = null;
let isProcessing = false;
let ocrResult = '';
let translatedText = '';

// 初始化图片翻译功能
function initImageTranslator() {
  console.log('图片翻译功能初始化');
  
  // 注册右键菜单点击事件
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'translateImage') {
      handleImageTranslation(message.imageUrl);
      sendResponse({ success: true });
    }
  });
  
  // 监听页面上所有图片的右键点击
  document.addEventListener('contextmenu', function(event) {
    // 检查是否点击的是图片
    if (event.target.tagName === 'IMG') {
      selectedImage = event.target;
      
      // 记录最近右键点击的图片URL
      chrome.runtime.sendMessage({
        action: 'setContextImage',
        imageUrl: selectedImage.src
      });
    }
  });
  
  // 创建翻译结果弹窗的样式
  createTranslatorStyles();
}

// 处理图片翻译
async function handleImageTranslation(imageUrl) {
  if (!imageUrl || isProcessing) return;
  
  try {
    isProcessing = true;
    
    // 创建并显示翻译弹窗
    const translatorContainer = createTranslatorUI(imageUrl);
    document.body.appendChild(translatorContainer);
    
    // 显示加载状态
    updateTranslationStatus('正在识别图片文字...');
    
    // 提取图片文字 (OCR)
    ocrResult = await extractTextFromImage(imageUrl);
    
    if (!ocrResult || ocrResult.trim() === '') {
      throw new Error('未能识别出图片中的文字');
    }
    
    // 显示识别结果
    document.getElementById('image-original-text').innerText = ocrResult;
    updateTranslationStatus('正在翻译文字...');
    
    // 翻译识别出的文字
    translatedText = await translateText(ocrResult);
    
    // 显示翻译结果
    document.getElementById('image-translated-text').innerText = translatedText;
    updateTranslationStatus('翻译完成');
    
  } catch (error) {
    console.error('图片翻译过程出错:', error);
    updateTranslationStatus(`处理失败: ${error.message}`);
  } finally {
    isProcessing = false;
  }
}

// 从图片中提取文字 (OCR)
async function extractTextFromImage(imageUrl) {
  // 发送消息给background.js，请求OCR服务
  return new Promise((resolve, reject) => {
    console.log(`开始OCR识别图片: ${imageUrl}`);
    
    // 使用Tesseract.js的worker进行OCR
    // 这里通过发送消息给background.js来处理，而不是直接在content script中加载库
    chrome.runtime.sendMessage({
      action: 'performOCR',
      imageUrl: imageUrl
    }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      if (response && response.success) {
        console.log('OCR识别成功:', response.text);
        resolve(response.text);
      } else {
        reject(new Error(response?.error || '图片文字识别失败'));
      }
    });
  });
}

// 翻译文字
async function translateText(text) {
  // 发送消息给background.js，请求翻译服务
  return new Promise((resolve, reject) => {
    console.log(`开始翻译文字: ${text}`);
    // 首先获取翻译引擎配置
    chrome.storage.sync.get(['translationEngine', 'sourceLanguage', 'targetLanguage'], (result) => {
      // 使用获取到的配置或默认值
      const engine = result.translationEngine || 'google';
      const sourceLanguage = result.sourceLanguage || 'auto';
      const targetLanguage = result.targetLanguage || 'zh-CN';
      
      chrome.runtime.sendMessage({
        action: 'translateTexts',
        texts: [text],
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        engine: engine
      }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success && response.translations && response.translations.length > 0) {
          console.log('翻译成功:', response.translations[0]);
          resolve(response.translations[0]);
        } else {
          reject(new Error(response?.error || '翻译失败'));
        }
      });
    });
  });
}

// 创建翻译器UI
function createTranslatorUI(imageUrl) {
  // 移除可能已存在的翻译器容器
  const existingContainer = document.getElementById('transor-image-translator-container');
  if (existingContainer) {
    document.body.removeChild(existingContainer);
  }
  
  // 创建翻译器容器
  const container = document.createElement('div');
  container.id = 'transor-image-translator-container';
  
  // 创建内容
  container.innerHTML = `
    <div class="transor-image-translator">
      <div class="translator-header">
        <h3>图片文字翻译</h3>
        <button id="close-translator" class="translator-close-btn">×</button>
      </div>
      
      <div class="translator-body">
        <div class="image-preview-container">
          <img src="${imageUrl}" alt="要翻译的图片" id="translated-image-preview" />
        </div>
        
        <div class="translator-section">
          <div class="section-header">
            <h4>原文</h4>
            <div class="section-actions">
              <button id="copy-original" class="translator-action-btn">复制</button>
            </div>
          </div>
          <div id="image-original-text" class="text-content">正在识别中...</div>
        </div>
        
        <div class="translator-section">
          <div class="section-header">
            <h4>译文</h4>
            <div class="section-actions">
              <button id="copy-translation" class="translator-action-btn">复制</button>
            </div>
          </div>
          <div id="image-translated-text" class="text-content">等待翻译...</div>
        </div>
      </div>
      
      <div class="translator-footer">
        <div id="translation-status" class="status-message">准备中...</div>
      </div>
    </div>
  `;
  
  // 添加事件监听器
  setTimeout(() => {
    // 关闭按钮
    document.getElementById('close-translator').addEventListener('click', () => {
      document.body.removeChild(container);
    });
    
    // 复制原文按钮
    document.getElementById('copy-original').addEventListener('click', () => {
      copyTextToClipboard(document.getElementById('image-original-text').innerText);
      updateTranslationStatus('已复制原文到剪贴板');
    });
    
    // 复制译文按钮
    document.getElementById('copy-translation').addEventListener('click', () => {
      copyTextToClipboard(document.getElementById('image-translated-text').innerText);
      updateTranslationStatus('已复制译文到剪贴板');
    });
    
    // 点击外部区域关闭弹窗
    container.addEventListener('click', (event) => {
      if (event.target === container) {
        document.body.removeChild(container);
      }
    });
    
    // 按ESC键关闭弹窗
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.body.contains(container)) {
        document.body.removeChild(container);
      }
    });
  }, 0);
  
  return container;
}

// 更新翻译状态
function updateTranslationStatus(message) {
  const statusElement = document.getElementById('translation-status');
  if (statusElement) {
    statusElement.innerText = message;
  }
}

// 复制文本到剪贴板
function copyTextToClipboard(text) {
  if (!text) return;
  
  try {
    // 使用异步剪贴板API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      return;
    }
    
    // 兼容旧浏览器的方法
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
  }
}

// 创建翻译器样式
function createTranslatorStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    #transor-image-translator-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.6);
      z-index: 9999999;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Arial', sans-serif;
    }
    
    .transor-image-translator {
      width: 90%;
      max-width: 600px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }
    
    .translator-header {
      padding: 15px 20px;
      background-color: #f5f5f5;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .translator-header h3 {
      margin: 0;
      font-size: 16px;
      color: #333;
    }
    
    .translator-close-btn {
      background: none;
      border: none;
      font-size: 24px;
      color: #888;
      cursor: pointer;
    }
    
    .translator-close-btn:hover {
      color: #333;
    }
    
    .translator-body {
      padding: 15px 20px;
      flex: 1;
      overflow-y: auto;
      max-height: 70vh;
    }
    
    .image-preview-container {
      display: flex;
      align-items: center;
      justify-content: center;
      align-items: center;
      margin-bottom: 15px;
      text-align: center;
      overflow: hidden;
      border-radius: 4px;
      border: 1px solid #ddd;
      background-color: #f9f9f9;
    }
    
    #translated-image-preview {
      max-width: 100%;
      max-height: 200px;
      object-fit: contain;
    }
    
    .translator-section {
      margin-bottom: 15px;
      border: 1px solid #eee;
      border-radius: 4px;
    }
    
    .section-header {
      padding: 10px 15px;
      background-color: #f8f8f8;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .section-header h4 {
      margin: 0;
      font-size: 14px;
      color: #555;
    }
    
    .section-actions {
      display: flex;
      gap: 5px;
    }
    
    .translator-action-btn {
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 3px;
      padding: 3px 8px;
      font-size: 12px;
      cursor: pointer;
      color: #666;
    }
    
    .translator-action-btn:hover {
      background-color: #e5e5e5;
    }
    
    .text-content {
      padding: 15px;
      min-height: 60px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: break-word;
      color: #333;
      font-size: 14px;
    }
    
    .translator-footer {
      padding: 10px 20px;
      background-color: #f9f9f9;
      border-top: 1px solid #eee;
    }
    
    .status-message {
      font-size: 13px;
      color: #666;
      text-align: center;
    }
  `;
  
  document.head.appendChild(styleElement);
}

// 在页面加载时初始化
window.addEventListener('load', function() {
  initImageTranslator();
}); 