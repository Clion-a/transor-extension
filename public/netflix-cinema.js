/**
 * Transor - Netflix双语字幕
 * 为Netflix视频提供沉浸式双语字幕播放体验
 * 版本: 2.0.0 - 优化版本，避免DRM冲突
 */

// 简单的测试 - 确认脚本被加载
if (window.location.hostname.includes('netflix.com')) {
  console.log('%c[Netflix双语字幕] 脚本在Netflix网站上成功加载!', 'color: #e50914; font-weight: bold; font-size: 20px; background: yellow;');
}

// 立即执行的调试信息
console.log('%c[Netflix双语字幕] 脚本开始加载', 'color: #e50914; font-weight: bold; font-size: 16px;');
console.log('%c[Netflix双语字幕] 当前页面URL:', 'color: #e50914; font-weight: bold;', window.location.href);
console.log('%c[Netflix双语字幕] 页面加载状态:', 'color: #e50914; font-weight: bold;', document.readyState);

// 防止重复声明的全局变量检查
if (typeof window.netflixSubtitleExtensionInitialized !== 'undefined') {
  console.log('%c[Netflix双语字幕] 脚本已初始化，跳过重复加载', 'color: #e50914; font-weight: bold;');
} else {
  window.netflixSubtitleExtensionInitialized = true;
}

// 状态变量 - 使用window对象来避免重复声明
if (typeof window.isSubtitleMode === 'undefined') {
  window.isSubtitleMode = false;
  window.controlBarObserver = null;
  window.mainObserver = null;
  window.videoObserver = null;
  window.subtitlesOverlay = null;
  window.currentVideoId = '';
  window.subtitles = [];
  window.translatedSubtitles = [];
  window.currentSubtitleIndex = -1;
  window.subtitleUpdateInterval = null;
  window.originalVideo = null;

  // 新增：智能翻译相关变量
  window.translationCache = new Map(); // 翻译缓存
  window.translationQueue = new Set(); // 正在翻译的字幕索引
  window.lastSeekTime = 0; // 记录最后一次快进时间
  window.isTranslating = false; // 翻译状态锁
  window.lastVideoTime = 0; // 记录上一次的视频时间
  window.preTranslationRange = 10; // 预翻译字幕数量
  window.translationBatchSize = 20; // 批量翻译大小
  
  // 新增：存储接收到的字幕URL
  window.latestCapturedSubtitleUrl = null;
  window.latestCaptureTime = 0;
}

// 使用全局变量的引用 - 完全移除局部变量，直接使用window对象
// 这样可以避免重复声明错误，确保所有脚本实例使用相同的变量

// Netflix 字幕获取器 - 内容脚本
// 保存视频元数据
let videoMetadata = {};

// 发送消息到 background 脚本
function sendMessage(type, data) {
  if (!type) {
    console.error('[Netflix 字幕获取器] 发送消息失败: 缺少消息类型');
    return;
  }
  
  console.log(`[Netflix 字幕获取器] 发送消息: 类型=${type}, 数据=`, data);
  
  try {
    chrome.runtime.sendMessage(
      { type, data }, 
      response => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          console.error('[Netflix 字幕获取器] 消息发送出错:', lastError.message);
        } else if (response) {
          console.log(`[Netflix 字幕获取器] 收到响应:`, response);
        }
      }
    );
  } catch (error) {
    console.error('[Netflix 字幕获取器] 发送消息时出现异常:', error);
  }
}

// 拦截 JSON.parse 获取视频元数据
function hookJsonParse() {
  const originalJsonParse = JSON.parse;
  JSON.parse = function(text) {
    const result = originalJsonParse(text);
    try {
      // 检测是否是包含字幕信息的 Netflix 响应
      if (result && result.result && result.result.timedtexttracks && result.result.movieId) {
        console.log('[Netflix 字幕获取器] 发现视频元数据:', result.result);
        videoMetadata[result.result.movieId] = result.result;
        
        // 发送元数据到 background 脚本
        sendMessage('METADATA_FOUND', {
          movieId: result.result.movieId,
          tracks: result.result.timedtexttracks
        });
      }
    } catch (e) {
      console.error('[Netflix 字幕获取器] 解析元数据错误:', e);
    }
    return result;
  };
}

// 初始化字幕获取器
function initializeSubtitleGrabber() {
  console.log('[Netflix 字幕获取器] 内容脚本已加载');
  
  // 拦截 JSON.parse 获取视频元数据
  hookJsonParse();
}

// 在页面加载时初始化字幕获取器
initializeSubtitleGrabber();

// 监听来自 background 脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Netflix 字幕获取器] 接收到消息:', message);
  
  // 处理NEW_SUBTITLE_URL_CAPTURED消息，保存字幕URL
  if (message.type === 'NEW_SUBTITLE_URL_CAPTURED' && message.url) {
    console.log('[Netflix 字幕获取器] 收到新的字幕URL:', message.url);
    // 保存字幕URL到全局变量
    window.latestCapturedSubtitleUrl = message.url;
    window.latestCaptureTime = message.captureTime || Date.now();
    console.log('[Netflix 字幕获取器] 已保存字幕URL，捕获时间:', new Date(window.latestCaptureTime).toLocaleTimeString());
  }
  
  if (message.type === 'GET_METADATA') {
    sendResponse({ metadata: videoMetadata });
  }
  
  return true;
});

// 字幕配置
const SUBTITLES_CONFIG = {
  // 字幕请求相关设置
  REQUEST_OPTIONS: {
    // 请求头信息
    HEADERS: {
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://www.netflix.com',
      'Referer': 'https://www.netflix.com/'
    },
    // 请求超时时间(毫秒)
    TIMEOUT: 10000
  },
  
  // 字幕URL识别模式
  URL_PATTERNS: [
    /nflxvideo\.net\/.*\?o=/,         // Netflix CDN字幕
    /oca\.nflxvideo\.net\/\?o=/,      // 新的Netflix字幕API格式
    /api-netflix\.com\/subtitles/,    // 可能的字幕API
    /\.(ttml|dfxp|xml)$/              // 常见字幕文件后缀
  ]
};


// 判断是否是 Netflix 视频页面
function isNetflixVideoPage() {
  return window.location.hostname.includes('netflix.com') && 
         window.location.pathname.includes('/watch');
}

// 寻找Netflix控制栏
function findNetflixControlBar() {
  // 首先查找外层控制栏容器
  const outerControlBar = document.querySelector('.watch-video--bottom-controls-container');
  if (outerControlBar) {
    console.log('找到Netflix外层控制栏容器');
    return outerControlBar;
  }
  
  // 使用用户提供的精确选择器
  const controlBar = document.querySelector('.ltr-gpipej[style*="justify-content: flex-end"]');
  if (controlBar) {
    console.log('找到精确的Netflix控制栏');
    return controlBar;
  }
  
  // 备用选择器
  const backupSelectors = [
    '[data-uia="controls-standard"]',
    '[class*="controls-container"]'
  ];
  
  for (const selector of backupSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`使用备用选择器找到控制栏: ${selector}`);
      return element;
    }
  }
  
  return null;
}

// 在控制栏中添加按钮
function addButtonToControlBar(controlBar) {
  // 检查按钮是否已存在
  if (document.getElementById('transor-netflix-subtitle-btn')) {
    console.log('按钮已存在，无需再添加');
    return;
  }
  
  console.log('在控制栏中添加双语字幕按钮');
  
  // 查找右侧控制区域
  const rightControlsArea = controlBar.querySelector('.ltr-gpipej[style*="justify-content: flex-end"]');
  
  if (rightControlsArea) {
    console.log('找到右侧控制区域');
    
    // 首先添加一个间隔元素
    const spacerDiv = document.createElement('div');
    spacerDiv.className = 'ltr-1npqywr';
    spacerDiv.style.minWidth = '3rem';
    spacerDiv.style.width = '3rem';
    spacerDiv.id = 'transor-netflix-spacer';
    
    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'medium ltr-1dcjcj4';
    buttonContainer.id = 'transor-netflix-button-container';
    
    // 创建按钮
    const buttonElement = document.createElement('button');
    buttonElement.id = 'transor-netflix-subtitle-btn';
    buttonElement.className = 'ltr-1enhvti';
    buttonElement.setAttribute('aria-label', '双语字幕');
    buttonElement.setAttribute('data-uia', 'control-bilingual-subtitles');
    
    // 创建图标容器
    const iconContainer = document.createElement('div');
    iconContainer.className = 'control-medium ltr-iyulz3';
    iconContainer.setAttribute('role', 'presentation');
    iconContainer.style.display = 'flex';
    iconContainer.style.alignItems = 'center';
    iconContainer.style.justifyContent = 'center';
    iconContainer.style.width = '100%';
    iconContainer.style.height = '100%';
    
    // 使用Transor Logo作为图标
    iconContainer.innerHTML = `
      <img src="${chrome.runtime.getURL('logos/logo48.png')}" 
           alt="双语字幕" 
           width="24" 
           height="24" 
           style="display: block; margin: auto;"
      />
    `;
    
    buttonElement.appendChild(iconContainer);
    buttonContainer.appendChild(buttonElement);
    
    // 添加间隔元素和按钮到右侧控制区域
    rightControlsArea.appendChild(spacerDiv);
    rightControlsArea.appendChild(buttonContainer);
    console.log('已添加间隔元素和按钮到右侧控制区域');
  } else {
    // 备用方法：添加到控制栏末尾
    console.log('未找到右侧控制区域，使用备用方法');
    
    const controlButtons = controlBar.querySelectorAll('.medium.ltr-1dcjcj4');
    
    if (controlButtons.length > 0) {
      const lastButtonContainer = controlButtons[controlButtons.length - 1];
      
      const spacerDiv = document.createElement('div');
      spacerDiv.className = 'ltr-1npqywr';
      spacerDiv.style.minWidth = '3rem';
      spacerDiv.style.width = '3rem';
      spacerDiv.id = 'transor-netflix-spacer';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'medium ltr-1dcjcj4';
      buttonContainer.id = 'transor-netflix-button-container';
      
      const buttonElement = document.createElement('button');
      buttonElement.id = 'transor-netflix-subtitle-btn';
      buttonElement.className = lastButtonContainer.querySelector('button') ? 
                              lastButtonContainer.querySelector('button').className : 
                              'ltr-1enhvti';
      buttonElement.setAttribute('aria-label', '双语字幕');
      buttonElement.setAttribute('data-uia', 'control-bilingual-subtitles');
      
      const iconContainer = document.createElement('div');
      const referenceIconContainer = lastButtonContainer.querySelector('div[role="presentation"]');
      iconContainer.className = referenceIconContainer ? 
                              referenceIconContainer.className : 
                              'control-medium ltr-iyulz3';
      iconContainer.setAttribute('role', 'presentation');
      iconContainer.style.display = 'flex';
      iconContainer.style.alignItems = 'center';
      iconContainer.style.justifyContent = 'center';
      iconContainer.style.width = '100%';
      iconContainer.style.height = '100%';
      
      iconContainer.innerHTML = `
        <img src="${chrome.runtime.getURL('logos/logo48.png')}" 
             alt="双语字幕" 
             width="24" 
             height="24" 
             style="display: block; margin: auto;"
        />
      `;
      
      buttonElement.appendChild(iconContainer);
      buttonContainer.appendChild(buttonElement);
      
      if (lastButtonContainer.parentNode) {
        lastButtonContainer.parentNode.appendChild(spacerDiv);
        lastButtonContainer.parentNode.appendChild(buttonContainer);
        console.log('已添加按钮到最后一个按钮的后面');
      } else {
        controlBar.appendChild(spacerDiv);
        controlBar.appendChild(buttonContainer);
        console.log('直接添加到控制栏');
      }
    }
  }
  
  // 添加点击事件
  const buttonElement = document.getElementById('transor-netflix-subtitle-btn');
  if (buttonElement) {
    buttonElement.addEventListener('click', toggleSubtitleMode);
  }
  
  // 添加样式
  addNetflixSubtitleStyles();
}

// 监听控制栏的变化
function startControlBarMonitoring() {
  console.log('开始监听控制栏变化');
  
  // 停止之前的观察器
  if (window.controlBarObserver) {
    window.controlBarObserver.disconnect();
  }
  if (window.mainObserver) {
    window.mainObserver.disconnect();
  }
  
  // 检查是否已存在控制栏
  const existingControlBar = findNetflixControlBar();
  if (existingControlBar) {
    console.log('找到现有控制栏，添加按钮');
    addButtonToControlBar(existingControlBar);
    
    // 监听控制栏变化
    window.controlBarObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          // 检查按钮是否被移除
          if (!document.getElementById('transor-netflix-subtitle-btn')) {
            console.log('按钮被移除，重新添加');
            const controlBar = findNetflixControlBar();
            if (controlBar) {
              addButtonToControlBar(controlBar);
            }
          }
          
          // 检查控制栏是否被移除
          if (!document.body.contains(existingControlBar)) {
            console.log('控制栏被移除，重新启动监听');
            startControlBarMonitoring();
            return;
          }
        }
      }
    });
    
    window.controlBarObserver.observe(existingControlBar, {
      childList: true,
      subtree: true
    });
  }
  
  // 设置主DOM观察器
  window.mainObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        const controlBar = findNetflixControlBar();
        if (controlBar && !controlBar.querySelector('#transor-netflix-subtitle-btn')) {
          console.log('检测到控制栏被添加，添加按钮');
          addButtonToControlBar(controlBar);
          startControlBarMonitoring();
          return;
        }
      }
    }
  });
  
  window.mainObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // 定期检查
  setInterval(() => {
    const controlBar = findNetflixControlBar();
    if (controlBar && !controlBar.querySelector('#transor-netflix-subtitle-btn')) {
      console.log('定期检查：发现控制栏但没有按钮，添加按钮');
      addButtonToControlBar(controlBar);
    }
  }, 2000);
}

// 初始化Netflix双语字幕
function initNetflixSubtitles() {
  console.log('初始化Netflix双语字幕');
  
  if (isNetflixVideoPage()) {
    console.log('检测到Netflix视频页面，启动控制栏监听');
    startControlBarMonitoring();
    monitorUrlChanges();
  } else {
    console.log('不是Netflix视频页面，仅监听URL变化');
    monitorUrlChanges();
  }
}

// 监听URL变化
function monitorUrlChanges() {
  let lastUrl = window.location.href;
  
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('URL已变化，当前URL:', currentUrl);
      
      // 如果在字幕模式中，退出
      if (window.isSubtitleMode) {
        exitSubtitleMode();
      }
      
      // 重置字幕获取器状态
      if (subtitleExtractor && subtitleExtractor.isIntercepting) {
        subtitleExtractor.stopIntercepting();
      }
      
      // 清空videoMetadata缓存，确保获取新页面的元数据
      videoMetadata = {};
      
      // 如果是视频页面，重新初始化
      if (isNetflixVideoPage()) {
        console.log('导航到了视频页面，重新初始化...');
        
        // 重新初始化字幕获取器
        initializeSubtitleGrabber();
        
        // 启动控制栏监听
        startControlBarMonitoring();
      }
    }
  }, 1000);
}

// 添加Netflix双语字幕CSS样式
function addNetflixSubtitleStyles() {
  // 检查样式是否已存在
  if (document.getElementById('transor-netflix-subtitle-styles')) {
    return;
  }
  
  // 创建样式元素
  const style = document.createElement('style');
  style.id = 'transor-netflix-subtitle-styles';
  style.textContent = `
    /* Netflix按钮容器样式 */
    #transor-netflix-button-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 4.8rem;
      height: 4.8rem;
    }
    
    /* 双语字幕按钮样式 */
    #transor-netflix-subtitle-btn {
      opacity: 0.9;
      transition: opacity 0.2s, transform 0.2s;
      cursor: pointer !important;
      color: white;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
     width: 4.8rem;
      height: 4.8rem;
      padding: 0;
      background: transparent;
      border: none;
    }
    
    #transor-netflix-subtitle-btn:hover {
      opacity: 1;
      transform: scale(1.05);
    }
    
    #transor-netflix-subtitle-btn.active {
      background-color: rgba(229, 9, 20, 0.3);
      border-radius: 4px;
    }
    
    /* 按钮中的logo样式 */
    #transor-netflix-subtitle-btn img {
      width: 24px;
      height: 24px;
      filter: brightness(1.2);
      display: block;
      margin: auto;
    }
    
    /* 双语字幕覆盖层样式 */
    .netflix-subtitle-overlay {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9998;
      max-width: 80%;
      min-width: 400px;
      background-color: rgba(0, 0, 0, 0.8);
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      pointer-events: none;
      user-select: none;
    }
    
    /* 字幕文字样式 */
    .netflix-subtitle-text {
      color: white;
      text-align: center;
      margin: 0;
      line-height: 1.4;
    }
    
    .netflix-subtitle-original {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 8px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    }
    
    .netflix-subtitle-translation {
      font-size: 20px;
      color: #ff6b6b;
      font-weight: 400;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    }
    
    /* 分词高亮样式 */
    .subtitle-token {
      display: inline;
      transition: color 0.3s, background-color 0.3s;
      cursor: default;
    }
    
    .subtitle-token.space {
      margin-right: 2px;
    }
    
    .subtitle-token:hover {
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      padding: 1px 2px;
    }
    
    /* 字幕状态指示器 */
    .subtitle-status-indicator {
      position: fixed;
      top: 100px;
      right: 20px;
      background-color: rgba(229, 9, 20, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .subtitle-status-indicator.show {
      opacity: 1;
    }
    
    /* 加载状态样式 */
    .subtitle-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding: 10px;
    }
    
    .subtitle-loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid #ff6b6b;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 8px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .subtitle-loading-text {
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
    }
  `;
  
  document.head.appendChild(style);
  console.log('Netflix双语字幕样式已添加');
}

// 切换字幕模式
function toggleSubtitleMode() {
  if (window.isSubtitleMode) {
    exitSubtitleMode();
  } else {
    enterSubtitleMode();
  }
}

// 进入字幕模式
function enterSubtitleMode() {
  console.log('进入Netflix双语字幕模式');
  
  // 获取当前视频ID
  window.currentVideoId = getNetflixVideoId();
  if (!window.currentVideoId) {
    console.log('无法获取视频ID，使用默认字幕');
    window.currentVideoId = 'netflix-default';
  }

  // 查找当前视频元素
  window.originalVideo = document.querySelector('video');
  if (!window.originalVideo) {
    console.log('未找到视频元素');
    showStatusMessage('未找到视频元素，请刷新页面重试');
    return;
  }
  
  // 创建字幕覆盖层
  createSubtitleOverlay();
  
  // 激活按钮状态
  const button = document.getElementById('transor-netflix-subtitle-btn');
  if (button) {
    button.classList.add('active');
  }
  
  // 开始监听视频
  startVideoTimeTracking();
  
  // 加载字幕
  loadSubtitles();
  
  // 标记状态
  window.isSubtitleMode = true;
  
  showStatusMessage('双语字幕已启用');
}

// 退出字幕模式
function exitSubtitleMode() {
  try {
    console.log('退出字幕模式，清理所有资源...');
  
    // 清空翻译状态
    if (window.translationCache) {
      window.translationCache.clear();
    }
    if (window.translationQueue) {
      window.translationQueue.clear();
    }
    window.lastSeekTime = 0;
    window.isTranslating = false;
    window.lastVideoTime = 0;

    // 停止所有观察器
    if (window.controlBarObserver) {
      window.controlBarObserver.disconnect();
      window.controlBarObserver = null;
    }

    if (window.mainObserver) {
      window.mainObserver.disconnect();
      window.mainObserver = null;
  }
  
    if (window.videoObserver) {
      window.videoObserver.disconnect();
      window.videoObserver = null;
  }
  
    // 停止定时器
    if (window.subtitleUpdateInterval) {
      clearInterval(window.subtitleUpdateInterval);
      window.subtitleUpdateInterval = null;
  }
  
    if (window.originalVideo) {
      window.originalVideo.removeEventListener('seeked', updateSubtitleByTime);
      window.originalVideo.removeEventListener('timeupdate', updateSubtitleByTime);
  }
  
    // 移除字幕覆盖层
    if (window.subtitlesOverlay && window.subtitlesOverlay.parentNode) {
      window.subtitlesOverlay.parentNode.removeChild(window.subtitlesOverlay);
      window.subtitlesOverlay = null;
  }
  
    // 重置所有状态变量
    window.isSubtitleMode = false;
    window.currentVideoId = null;
    window.subtitles = [];
    window.translatedSubtitles = [];
    window.currentSubtitleIndex = -1;

    console.log('字幕模式已成功退出，所有资源已清理');
  } catch (error) {
    console.log('退出字幕模式时出错:', error);
  }
}

// 获取Netflix视频ID
function getNetflixVideoId() {
  // 尝试从URL获取视频ID
  const watchMatch = window.location.pathname.match(/\/watch\/(\d+)/);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }
  
  // 尝试从视频元素获取ID
  const videoElement = document.querySelector('video');
  if (videoElement && videoElement.src) {
    const srcMatch = videoElement.src.match(/\/([a-zA-Z0-9]+)/);
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1];
    }
  }
  
  // 如果都失败了，生成一个临时ID
  return 'netflix-' + Date.now();
}

// 创建字幕覆盖层
function createSubtitleOverlay() {
  console.log('创建字幕覆盖层');
  
  // 移除现有的覆盖层
  if (window.subtitlesOverlay) {
    document.body.removeChild(window.subtitlesOverlay);
  }
  
  // 创建新的覆盖层
  window.subtitlesOverlay = document.createElement('div');
  window.subtitlesOverlay.className = 'netflix-subtitle-overlay';
  window.subtitlesOverlay.innerHTML = `
    <div class="subtitle-loading">
      <div class="subtitle-loading-spinner"></div>
      <div class="subtitle-loading-text">正在加载字幕...</div>
    </div>
  `;
  
  // 初始状态为隐藏
  window.subtitlesOverlay.style.display = 'none';
  
  document.body.appendChild(window.subtitlesOverlay);
  console.log('字幕覆盖层已创建（初始为隐藏状态）');
}

// 开始视频时间跟踪
function startVideoTimeTracking() {
  console.log('开始视频时间跟踪');
  
  if (!window.originalVideo) {
    console.log('没有找到视频元素，无法开始时间跟踪');
    return;
  }
  
  // 清除之前的计时器
  if (window.subtitleUpdateInterval) {
    clearInterval(window.subtitleUpdateInterval);
    window.subtitleUpdateInterval = null;
  }
  
  // 使用高频率的时间跟踪以确保字幕同步精确
  window.subtitleUpdateInterval = setInterval(() => {
    if (window.originalVideo && !window.originalVideo.paused && window.isSubtitleMode) {
      const currentTime = window.originalVideo.currentTime;
      updateSubtitleByTime(currentTime);
    }
  }, 100); // 每100毫秒更新一次
  
  // 同时监听视频事件
  if (window.originalVideo) {
    window.originalVideo.addEventListener('timeupdate', handleVideoTimeUpdate);
    window.originalVideo.addEventListener('play', handleVideoPlay);
    window.originalVideo.addEventListener('pause', handleVideoPause);
    window.originalVideo.addEventListener('seeked', handleVideoSeeked);
  }
  
  console.log('视频时间跟踪已启动');
}

// 视频时间更新处理
function handleVideoTimeUpdate(event) {
  if (window.isSubtitleMode && event.target) {
    updateSubtitleByTime(event.target.currentTime);
  }
}

// 视频播放处理
function handleVideoPlay() {
  console.log('视频开始播放');
  if (window.isSubtitleMode && window.subtitlesOverlay) {
    window.subtitlesOverlay.style.opacity = '1';
  }
}

// 视频暂停处理
function handleVideoPause() {
  console.log('视频已暂停');
  if (window.isSubtitleMode && window.subtitlesOverlay) {
    window.subtitlesOverlay.style.opacity = '0.7';
  }
}

// 视频跳转处理
function handleVideoSeeked(event) {
  console.log('视频时间已跳转');
  if (window.isSubtitleMode && event.target) {
    // 先清除当前字幕显示，避免字幕滞留
    clearSubtitleDisplay();
    // 再更新到新位置的字幕
    updateSubtitleByTime(event.target.currentTime);
  }
}

// 真实的Netflix字幕获取和翻译实现
class NetflixSubtitleExtractor {
  constructor() {
    this.interceptedRequests = new Map();
    this.subtitleCache = new Map();
    this.isIntercepting = false;
  }

  // 开始拦截网络请求
  startIntercepting() {
    if (this.isIntercepting) return;
    
    console.log('开始拦截Netflix字幕请求...');
    this.isIntercepting = true;
    
    // 尝试直接加载指定URL的字幕
    this.tryLoadSpecificSubtitleUrl();
    
    // 拦截XMLHttpRequest
    this.interceptXHR();
    
    // 拦截fetch请求
    this.interceptFetch();
    
    // 监听页面字幕元素变化
    this.observeSubtitleElements();
  }
  
  // 尝试直接加载指定URL的字幕
  async tryLoadSpecificSubtitleUrl() {
    try {
      // 首先尝试获取从background.js捕获的最新字幕URL
      const capturedUrl = await getLatestSubtitleUrl();
      
      // 如果有捕获的URL，优先使用它
      if (capturedUrl) {
        console.log('尝试使用捕获到的实时字幕URL:', capturedUrl);
        
        try {
          const response = await fetchWithTimeout(capturedUrl, {
            method: 'GET',
            headers: SUBTITLES_CONFIG.REQUEST_OPTIONS.HEADERS,
            timeout: SUBTITLES_CONFIG.REQUEST_OPTIONS.TIMEOUT
          });
          
          if (!response.ok) {
            throw new Error(`字幕请求失败: ${response.status} ${response.statusText}`);
          }
          
          let data;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            data = JSON.stringify(data);
            console.log('成功获取JSON格式字幕数据，长度:', data.length);
          } else {
            data = await response.text();
            console.log('成功获取文本格式字幕数据，长度:', data.length);
          }
          
          // 发送字幕数据到background.js进行保存
          if (data && data.length > 0) {
            sendMessage('SUBTITLE_FOUND', {
              url: capturedUrl,
              content: data
            });
            
            this.handleResponse(capturedUrl, data);
            console.log('字幕数据已发送到background.js并处理');
            return true;
          } else {
            console.log('获取到的字幕数据为空');
          }
        } catch (error) {
          console.log('加载捕获的字幕URL失败:', error);
        }
      }
      
      // 如果没有捕获的URL或加载失败，回退到查找函数
      console.log('尝试查找其他字幕URL来源...');
      const subtitleUrl = await findNetflixSubtitleUrl();
      
      if (subtitleUrl) {
        console.log('尝试加载查找到的字幕URL:', subtitleUrl);
        
        try {
          const response = await fetchWithTimeout(subtitleUrl, {
            method: 'GET',
            headers: SUBTITLES_CONFIG.REQUEST_OPTIONS.HEADERS,
            timeout: SUBTITLES_CONFIG.REQUEST_OPTIONS.TIMEOUT
          });
          
          if (!response.ok) {
            throw new Error(`字幕请求失败: ${response.status} ${response.statusText}`);
          }
          
          let data;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            data = JSON.stringify(data);
            console.log('成功获取JSON格式字幕数据，长度:', data.length);
          } else {
            data = await response.text();
            console.log('成功获取文本格式字幕数据，长度:', data.length);
          }
          
          // 发送字幕数据到background.js进行保存
          if (data && data.length > 0) {
            sendMessage('SUBTITLE_FOUND', {
              url: subtitleUrl,
              content: data
            });
            
            this.handleResponse(subtitleUrl, data);
            console.log('字幕数据已发送到background.js并处理');
            return true;
          } else {
            console.log('获取到的字幕数据为空');
          }
        } catch (error) {
          console.log('加载字幕URL内容失败:', error);
        }
      } else {
        console.log('未找到可用的Netflix字幕URL');
      }
      
      return false;
    } catch (error) {
      console.log('加载字幕URL过程失败:', error);
      return false;
    }
  }

  // 拦截XMLHttpRequest
  interceptXHR() {
    const originalXHR = window.XMLHttpRequest;
    const self = this;
    
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      
      xhr.open = function(method, url, ...args) {
        this._url = url;
        return originalOpen.apply(this, [method, url, ...args]);
      };
      
      xhr.send = function(...args) {
        this.addEventListener('load', function() {
          self.handleResponse(this._url, this.responseText, this.responseType);
        });
        return originalSend.apply(this, args);
      };
      
      return xhr;
    };
  }

  // 拦截fetch请求
  interceptFetch() {
    const originalFetch = window.fetch;
    const self = this;
    
    window.fetch = function(url, options) {
      return originalFetch(url, options).then(response => {
        // 克隆响应以避免消费原始响应
        const clonedResponse = response.clone();
        
        if (self.isSubtitleUrl(url)) {
          clonedResponse.text().then(text => {
            self.handleResponse(url, text, 'text');
          }).catch(error => {
            console.log('读取字幕响应失败:', error);
          });
        }
        
        return response;
      });
    };
  }

  // 判断是否为字幕URL
  isSubtitleUrl(url) {
    if (typeof url !== 'string') return false;
    
    // 使用配置中的URL模式进行匹配
    if (SUBTITLES_CONFIG.URL_PATTERNS.some(pattern => pattern.test(url))) {
      return true;
    }
    
    // 其他字幕URL特征
    const otherSubtitlePatterns = [
      /\.ttml$/,                 // TTML格式
      /\.vtt$/,                  // WebVTT格式
      /\.dfxp$/,                 // DFXP格式
      /timedtext/,               // 字幕相关
      /subtitle/,                // 字幕相关
      /caption/                  // 字幕相关
    ];
    
    return otherSubtitlePatterns.some(pattern => pattern.test(url));
  }

  // 处理响应数据
  handleResponse(url, responseText) {
    if (!this.isSubtitleUrl(url) || !responseText) return;
    
    console.log('检测到字幕请求:', url);
    
    try {
      // 针对新的Netflix字幕API格式特殊处理
      if (url.includes('oca.nflxvideo.net/?o=')) {
        console.log('检测到Netflix字幕CDN接口，特殊处理');
        const subtitles = this.parseNetflixCDNSubtitles(responseText);
        if (subtitles && subtitles.length > 0) {
          console.log(`成功解析Netflix CDN接口的${subtitles.length}条字幕`);
          this.subtitleCache.set(url, subtitles);
          this.onSubtitlesFound(subtitles);
          return;
        }
      }
      
      // 标准解析逻辑
      const subtitles = this.parseSubtitleContent(responseText);
      if (subtitles && subtitles.length > 0) {
        console.log(`成功解析${subtitles.length}条字幕`);
        this.subtitleCache.set(url, subtitles);
        
        // 触发字幕加载事件
        this.onSubtitlesFound(subtitles);
      }
    } catch (error) {
      console.log('解析字幕失败:', error);
    }
  }

  // 解析Netflix CDN字幕接口数据
  parseNetflixCDNSubtitles(content) {
    try {
      console.log('解析Netflix CDN字幕数据');
      
      // 尝试JSON解析
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        const data = JSON.parse(content);
        
        // 检查是否有标准字幕格式
        if (data.events && Array.isArray(data.events)) {
          console.log('找到标准格式的字幕事件数组');
          return data.events
            .filter(event => event.text || (event.segs && event.segs.length > 0))
            .map(event => {
              let text = event.text || '';
              
              // 处理分段文本
              if (event.segs && Array.isArray(event.segs)) {
                text = event.segs.map(seg => seg.utf8 || seg.text || '').join('');
              }
              
              return {
                start: (event.tStartMs || event.start || 0) / 1000,
                end: ((event.tStartMs || event.start || 0) + (event.dDurationMs || event.duration || 0)) / 1000,
                text: text.trim()
              };
            })
            .filter(sub => sub.text)
            .sort((a, b) => a.start - b.start);
        }
        
        // 检查备用格式1：cues
        if (data.cues && Array.isArray(data.cues)) {
          console.log('找到cues格式的字幕数组');
          return data.cues
            .filter(cue => cue.text || cue.content)
            .map(cue => ({
              start: (cue.start || 0) / 1000,
              end: (cue.end || 0) / 1000,
              text: (cue.text || cue.content || '').trim()
            }))
            .filter(sub => sub.text)
            .sort((a, b) => a.start - b.start);
        }
        
        // 检查备用格式2：subtitles/tracks
        if (data.subtitles || data.tracks) {
          const tracks = data.subtitles || data.tracks;
          if (Array.isArray(tracks) && tracks.length > 0) {
            console.log('找到tracks/subtitles格式的字幕');
            
            // 找到第一个有items的轨道
            for (const track of tracks) {
              if (track.items && Array.isArray(track.items) && track.items.length > 0) {
                return track.items
                  .filter(item => item.text || item.content || item.caption)
                  .map(item => ({
                    start: (item.start || item.startTime || 0) / 1000,
                    end: (item.end || item.endTime || 0) / 1000,
                    text: (item.text || item.content || item.caption || '').trim()
                  }))
                  .filter(sub => sub.text)
                  .sort((a, b) => a.start - b.start);
              }
            }
          }
        }
        
        // 尝试从复杂结构中搜索可能的字幕数据
        const subtitles = this.extractPossibleSubtitlesFromObject(data);
        if (subtitles && subtitles.length > 0) {
          console.log('从复杂结构中提取到字幕数据');
          return subtitles;
        }
      }
      
      console.log('无法识别的Netflix CDN字幕格式');
      return null;
    } catch (error) {
      console.log('解析Netflix CDN字幕失败:', error);
      return null;
    }
  }

  // 从复杂对象结构中提取可能的字幕数据
  extractPossibleSubtitlesFromObject(obj, path = '') {
    if (!obj || typeof obj !== 'object') return null;
    
    // 递归搜索可能包含字幕的数组
    for (const key in obj) {
      const value = obj[key];
      const currentPath = path ? `${path}.${key}` : key;
      
      // 如果是数组且元素看起来像字幕
      if (Array.isArray(value) && value.length > 0) {
        // 检查数组的第一个元素是否包含字幕相关字段
        const firstItem = value[0];
        if (
          firstItem && typeof firstItem === 'object' && 
          (
            (firstItem.text && (firstItem.start !== undefined || firstItem.tStartMs !== undefined)) ||
            (firstItem.content && (firstItem.start !== undefined || firstItem.startTime !== undefined)) ||
            (firstItem.caption && firstItem.time !== undefined)
          )
        ) {
          console.log(`在路径 ${currentPath} 找到可能的字幕数组`);
          
          return value
            .map(item => {
              // 提取开始和结束时间
              let start = 0;
              if (item.start !== undefined) start = item.start;
              else if (item.tStartMs !== undefined) start = item.tStartMs;
              else if (item.startTime !== undefined) start = item.startTime;
              else if (item.time !== undefined) start = item.time;
              
              // 提取结束时间或计算结束时间
              let end = 0;
              if (item.end !== undefined) end = item.end;
              else if (item.endTime !== undefined) end = item.endTime;
              else if (item.tStartMs !== undefined && item.dDurationMs !== undefined) 
                end = item.tStartMs + item.dDurationMs;
              else if (start !== undefined) end = start + 5000; // 默认5秒
              
              // 提取文本内容
              const text = item.text || item.content || item.caption || '';
              
              return {
                start: start / 1000, // 转换为秒
                end: end / 1000,     // 转换为秒
                text: text.trim()
              };
            })
            .filter(sub => sub.text)
            .sort((a, b) => a.start - b.start);
        }
      }
      
      // 递归检查嵌套对象
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const result = this.extractPossibleSubtitlesFromObject(value, currentPath);
        if (result && result.length > 0) {
          return result;
        }
      }
    }
    
    return null;
  }

  // 解析字幕内容
  parseSubtitleContent(content) {
    try {
      // 尝试清理可能的格式问题
      content = this.cleanupXMLContent(content);
      
      // 优先尝试解析TTML格式
      if (content.includes('<tt') || content.includes('<tt ') || content.includes('xmlns="http://www.w3.org/ns/ttml')) {
        console.log('检测到TTML格式字幕');
        return this.parseTTML(content);
      }
      
      // 尝试解析WebVTT格式
      if (content.includes('WEBVTT')) {
        console.log('检测到WebVTT格式字幕');
        return this.parseWebVTT(content);
      }
      
      // 尝试解析JSON格式
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        console.log('检测到JSON格式字幕');
        return this.parseJSON(content);
      }
      
      console.log('未识别的字幕格式，尝试作为TTML格式解析');
      // 尝试作为TTML解析，因为有些TTML内容可能格式不完全标准
      const ttmlResult = this.parseTTML(content);
      if (ttmlResult && ttmlResult.length > 0) {
        return ttmlResult;
      }
      
      console.log('所有格式解析尝试失败');
      return null;
    } catch (error) {
      console.log('解析字幕内容失败:', error);
      return null;
    }
  }

  // 清理XML内容中的问题
  cleanupXMLContent(content) {
    // 如果不是字符串，直接返回
    if (typeof content !== 'string') {
      return content;
    }
    
    try {
      // 修复常见的XML格式问题
      let cleanContent = content
        // 移除多余的空格和换行
        .replace(/\s+/g, ' ')
        // 修复破损的XML声明
        .replace(/<\?xml[^>]*\?>/, '<?xml version="1.0" encoding="UTF-8"?>')
        // 替换特殊引号
        .replace(/[\u201C\u201D]/g, '"')
        // 替换特殊撇号
        .replace(/[\u2018\u2019]/g, "'")
        // 修复没有引号的属性
        .replace(/(\w+)=(\w+)/g, '$1="$2"')
        // 修复空格分隔的TTML元素
        .replace(/<tt\s+([^>]*)>/g, '<tt $1>')
        // 修复破损的命名空间声明
        .replace(/xmlns\s*=\s*"([^"]*)"/g, 'xmlns="$1"')
        .replace(/xmlns:(\w+)\s*=\s*"([^"]*)"/g, 'xmlns:$1="$2"');
        
      // 如果是TTML格式但没有完整的tt标签，尝试添加
      if (cleanContent.includes('xmlns="http://www.w3.org/ns/ttml') && !cleanContent.includes('<tt')) {
        cleanContent = `<tt ${cleanContent.substring(cleanContent.indexOf('xmlns'))}`;
        // 确保正确关闭
        if (!cleanContent.includes('</tt>')) {
          cleanContent += '</tt>';
        }
      }
      
      return cleanContent;
    } catch (error) {
      console.log('清理XML内容失败:', error);
      return content; // 返回原始内容
    }
  }

  // 解析TTML格式字幕
  parseTTML(content) {
    try {
      console.log('解析TTML格式字幕...');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      
      // 获取tickRate，用于时间计算
      let tickRate = 10000000; // 默认值
      const ttElement = xmlDoc.querySelector('tt');
      if (ttElement && ttElement.getAttribute('ttp:tickRate')) {
        tickRate = parseInt(ttElement.getAttribute('ttp:tickRate')) || tickRate;
        console.log('TTML使用tickRate:', tickRate);
      }
      
      // 获取所有字幕段落
      const pElements = xmlDoc.getElementsByTagName('p');
      
      const subtitles = [];
      
      for (let i = 0; i < pElements.length; i++) {
        const element = pElements[i];
        const begin = element.getAttribute('begin');
        const end = element.getAttribute('end');
        
        // 提取纯文本内容，忽略内部标签
        let text = '';
        if (element.textContent) {
          text = element.textContent.trim();
        } else {
          // 手动处理内部节点
          for (const childNode of element.childNodes) {
            if (childNode.nodeType === Node.TEXT_NODE) {
              text += childNode.nodeValue;
            } else if (childNode.nodeType === Node.ELEMENT_NODE && childNode.tagName.toLowerCase() === 'br') {
              text += '\n';
            } else if (childNode.nodeType === Node.ELEMENT_NODE) {
              text += childNode.textContent;
            }
          }
          text = text.trim();
        }
        
        if (begin && end && text) {
          // 转换时间为秒
          const startTime = this.parseTTMLTimeToSeconds(begin, tickRate);
          const endTime = this.parseTTMLTimeToSeconds(end, tickRate);
          
          subtitles.push({
            start: startTime,
            end: endTime,
            text: text
          });
          
          if (i < 3) {
            console.log(`TTML字幕示例 #${i+1}: ${startTime}s-${endTime}s "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
          }
        }
      }
      
      console.log(`成功解析${subtitles.length}条TTML字幕`);
      return subtitles.sort((a, b) => a.start - b.start);
    } catch (error) {
      console.log('解析TTML失败:', error);
      return null;
    }
  }

  // 解析TTML时间格式为秒
  parseTTMLTimeToSeconds(timeStr, tickRate = 10000000) {
    try {
      // 处理Netflix特有的tick时间格式: "178928750t"
      if (timeStr.endsWith('t')) {
        const ticks = parseInt(timeStr.slice(0, -1));
        return ticks / tickRate;
      }
      
      // 处理标准TTML时间格式: "00:00:17.893"
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseFloat(parts[2]) || 0;
        return hours * 3600 + minutes * 60 + seconds;
      } 
      // 处理其他形式: "17.893s"
      else if (timeStr.includes('s')) {
        return parseFloat(timeStr.replace('s', ''));
      } 
      // 处理纯数字: "17.893"
      else {
        return parseFloat(timeStr) || 0;
      }
    } catch (error) {
      console.log('解析TTML时间失败:', error);
      return 0;
    }
  }

  // 解析WebVTT格式字幕
  parseWebVTT(content) {
    try {
      const lines = content.split('\n');
      const subtitles = [];
      let currentSubtitle = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 跳过空行和WEBVTT标识
        if (!line || line === 'WEBVTT') continue;
        
        // 时间戳行
        if (line.includes('-->')) {
          const [startTime, endTime] = line.split('-->').map(t => t.trim());
          currentSubtitle = {
            start: this.parseVTTTimeToSeconds(startTime),
            end: this.parseVTTTimeToSeconds(endTime),
            text: ''
          };
        }
        // 字幕文本行
        else if (currentSubtitle && line) {
          if (currentSubtitle.text) {
            currentSubtitle.text += ' ' + line;
          } else {
            currentSubtitle.text = line;
          }
        }
        // 空行表示字幕结束
        else if (currentSubtitle && !line) {
          subtitles.push(currentSubtitle);
          currentSubtitle = null;
        }
      }
      
      // 添加最后一条字幕
      if (currentSubtitle) {
        subtitles.push(currentSubtitle);
      }
      
      return subtitles.sort((a, b) => a.start - b.start);
    } catch (error) {
      console.log('解析WebVTT失败:', error);
      return null;
    }
  }

  // 解析JSON格式字幕
  parseJSON(content) {
    try {
      const data = JSON.parse(content);
      
      // Netflix JSON字幕格式
      if (data.events && Array.isArray(data.events)) {
        return data.events
          .filter(event => event.text || (event.segs && event.segs.length > 0))
          .map(event => {
            let text = event.text || '';
            
            // 处理分段文本
            if (event.segs && Array.isArray(event.segs)) {
              text = event.segs.map(seg => seg.utf8 || seg.text || '').join('');
            }
            
            return {
              start: (event.tStartMs || event.start || 0) / 1000,
              end: ((event.tStartMs || event.start || 0) + (event.dDurationMs || event.duration || 0)) / 1000,
              text: text.trim()
            };
          })
          .filter(sub => sub.text)
          .sort((a, b) => a.start - b.start);
      }
      
      return null;
    } catch (error) {
      console.log('解析JSON字幕失败:', error);
      return null;
    }
  }

  // 将时间字符串转换为秒数
  parseTimeToSeconds(timeStr) {
    try {
      // 处理TTML时间格式: 00:00:01.500 或 1.5s
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseFloat(parts[2]) || 0;
        return hours * 3600 + minutes * 60 + seconds;
      } else if (timeStr.includes('s')) {
        return parseFloat(timeStr.replace('s', ''));
      } else {
        return parseFloat(timeStr) || 0;
      }
    } catch (error) {
      return 0;
    }
  }

  // 将VTT时间格式转换为秒数
  parseVTTTimeToSeconds(timeStr) {
    try {
      // VTT时间格式: 00:00:01.500
      const parts = timeStr.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseFloat(parts[2]) || 0;
        return hours * 3600 + minutes * 60 + seconds;
      } else if (parts.length === 2) {
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseFloat(parts[1]) || 0;
        return minutes * 60 + seconds;
      }
      return parseFloat(timeStr) || 0;
    } catch (error) {
      return 0;
    }
  }

  // 监听页面字幕元素变化
  observeSubtitleElements() {
    const subtitleSelectors = [
      '.player-timedtext',
      '.timedtext-text-container',
      '.subtitle-text',
      '[data-uia="player-caption-text"]',
      '.ltr-1472mwy',
      '.player-timedtext-text-container'
    ];
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            subtitleSelectors.forEach(selector => {
              const elements = node.querySelectorAll ? node.querySelectorAll(selector) : [];
              if (elements.length > 0) {
                console.log('检测到字幕元素变化:', selector);
                this.extractFromElements(elements);
              }
            });
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 从DOM元素提取字幕
  extractFromElements(elements) {
    try {
      const subtitles = [];
      
      elements.forEach(element => {
        const text = element.textContent?.trim();
        if (text) {
          // 这里可以根据需要添加时间戳逻辑
          subtitles.push({
            start: 0,
            end: 5,
            text: text
          });
        }
      });
      
      if (subtitles.length > 0) {
        this.onSubtitlesFound(subtitles);
      }
    } catch (error) {
      console.log('从元素提取字幕失败:', error);
    }
  }

  // 字幕找到回调
  onSubtitlesFound(subtitles) {
    console.log(`找到${subtitles.length}条字幕，开始翻译...`);
    console.log(subtitles, 'subtitles')
    // 更新全局字幕变量
    window.subtitles = subtitles;
    
    // 开始翻译
    translateSubtitles(subtitles);
  }

  // 翻译字幕
  async translateSubtitles(originalSubtitles) {
    // 使用全局translateSubtitles函数
    return translateSubtitles(originalSubtitles);
  }

  // 停止拦截
  stopIntercepting() {
    this.isIntercepting = false;
    console.log('停止拦截Netflix字幕请求');
  }
}

// 创建字幕提取器实例
const subtitleExtractor = new NetflixSubtitleExtractor();

// 修改loadSubtitles函数使用真实的字幕获取
async function loadSubtitles() {
  if (!window.currentVideoId) {
    console.log('未找到视频ID，使用备用字幕');
    useBackupSubtitles();
    return;
  }

  try {
    console.log(`正在尝试获取Netflix视频ID为 ${window.currentVideoId} 的字幕...`);
    
    // 先检查是否有保存的字幕URL
    if (window.latestCapturedSubtitleUrl) {
      console.log('使用已保存的字幕URL:', window.latestCapturedSubtitleUrl);
      console.log('捕获时间:', new Date(window.latestCaptureTime).toLocaleTimeString());
      
      try {
        const response = await fetchWithTimeout(window.latestCapturedSubtitleUrl, {
          method: 'GET',
          headers: SUBTITLES_CONFIG.REQUEST_OPTIONS.HEADERS,
          timeout: SUBTITLES_CONFIG.REQUEST_OPTIONS.TIMEOUT
        });
        
        if (!response.ok) {
          throw new Error(`字幕请求失败: ${response.status} ${response.statusText}`);
        }
        
        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
          data = JSON.stringify(data);
          console.log('成功获取JSON格式字幕数据，长度:', data.length);
        } else {
          data = await response.text();
          console.log('成功获取文本格式字幕数据，长度:', data.length);
        }
        
        // 处理字幕数据
        if (data && data.length > 0) {
          // 发送字幕数据到background.js进行保存
          sendMessage('SUBTITLE_FOUND', {
            url: window.latestCapturedSubtitleUrl,
            content: data
          });
          
          // 解析字幕
          const parsedSubtitles = subtitleExtractor.parseSubtitleContent(data);
          if (parsedSubtitles && parsedSubtitles.length > 0) {
            console.log(`成功解析${parsedSubtitles.length}条字幕`);
            window.subtitles = parsedSubtitles;
            
            // 开始翻译
            await translateSubtitles(parsedSubtitles);
            return;
          }
        }
      } catch (error) {
        console.log('使用保存的字幕URL加载失败:', error);
      }
    }
    
    // 如果没有保存的URL或使用保存的URL失败，尝试其他方法
    console.log('没有可用的保存字幕URL或使用保存的URL失败，尝试其他方法');
    
    // 尝试直接从字幕CDN加载
    const cdnSubtitles = await loadNetflixCDNSubtitles();
    if (cdnSubtitles && cdnSubtitles.length > 0) {
      console.log(`从Netflix CDN成功加载了${cdnSubtitles.length}条字幕`);
      window.subtitles = cdnSubtitles;
      console.log(cdnSubtitles, "cdnSubtitles")
      // 开始翻译
      await translateSubtitles(cdnSubtitles);
      return;
    }
      
    // 如果直接加载失败，开始拦截字幕请求
    subtitleExtractor.startIntercepting();
    
    // 尝试从页面提取现有字幕
    const pageSubtitles = await extractCurrentSubtitlesFromPage();
    if (pageSubtitles && pageSubtitles.length > 0) {
      console.log(`从页面提取到${pageSubtitles.length}条字幕`);
      subtitleExtractor.onSubtitlesFound(pageSubtitles);
      return;
    }
    
    // 如果没有找到字幕，等待拦截器捕获
    setTimeout(() => {
      if (!window.subtitles || window.subtitles.length === 0) {
        console.log('未能获取到真实字幕，使用备用字幕');
        useBackupSubtitles();
      }
    }, 5000); // 等待5秒
    
  } catch (error) {
    console.log('加载字幕失败:', error);
    useBackupSubtitles();
  }
}

// 直接从Netflix CDN加载字幕
async function loadNetflixCDNSubtitles() {
  try {
    console.log('尝试直接从Netflix CDN加载字幕...');
    
    // 使用配置的URL
    const configUrl = SUBTITLES_CONFIG.NETFLIX_SUBTITLE_URL;
    
    // 优先使用已保存的URL
    let subtitleUrl = window.latestCapturedSubtitleUrl;
    
    // 如果没有保存的URL，尝试从页面查找
    if (!subtitleUrl) {
      subtitleUrl = await findNetflixSubtitleUrl();
    } else {
      console.log('使用已保存的字幕URL:', subtitleUrl);
    }
    
    // 如果仍然没有找到，使用配置URL
    if (!subtitleUrl) {
      subtitleUrl = configUrl;
      console.log('使用配置的字幕URL:', subtitleUrl);
    }
    
    if (!subtitleUrl) {
      throw new Error('未找到可用的字幕URL');
    }
    
    // 直接请求字幕URL
    const response = await fetchWithTimeout(subtitleUrl, {
      method: 'GET',
      headers: SUBTITLES_CONFIG.REQUEST_OPTIONS.HEADERS,
      timeout: SUBTITLES_CONFIG.REQUEST_OPTIONS.TIMEOUT
    });
    
    if (!response.ok) {
      throw new Error(`字幕请求失败: ${response.status} ${response.statusText}`);
    }
    
    // 获取响应类型
    const contentType = response.headers.get('content-type');
    let responseData;
    
    // 根据内容类型处理响应
    if (contentType && (contentType.includes('application/json') || contentType.includes('text/json'))) {
      responseData = await response.json();
      console.log('收到JSON格式字幕数据');
          
      // 如果需要将JSON对象转换为字符串进行处理
      const jsonText = JSON.stringify(responseData);
      const parsedSubtitles = subtitleExtractor.parseNetflixCDNSubtitles(jsonText);
      if (parsedSubtitles && parsedSubtitles.length > 0) {
        return parsedSubtitles;
      }
    } else if (contentType && (contentType.includes('application/xml') || contentType.includes('text/xml') || contentType.includes('application/ttml+xml'))) {
      // XML/TTML格式
      responseData = await response.text();
      console.log('收到XML/TTML格式字幕数据');
      
      // 尝试作为TTML解析
      const ttmlSubtitles = subtitleExtractor.parseTTML(responseData);
      if (ttmlSubtitles && ttmlSubtitles.length > 0) {
        return ttmlSubtitles;
      }
    } else {
      // 其他格式，先当作文本处理
      responseData = await response.text();
      console.log('收到未知格式字幕数据，尝试自动识别');
      
      // 尝试所有支持的解析方法
      return subtitleExtractor.parseSubtitleContent(responseData);
    }
    
    console.log('无法解析获取到的字幕数据');
    return null;
        } catch (error) {
    console.log('直接加载Netflix CDN字幕失败:', error);
    return null;
  }
}

// 带超时的fetch函数
async function fetchWithTimeout(url, options = {}) {
  const { timeout = 8000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// 获取用户目标语言
function getUserTargetLanguage() {
  // 可以从用户设置中获取，这里默认返回中文
  return 'zh-CN';
}

// 从Netflix页面查找字幕URL
async function findNetflixSubtitleUrl() {
  try {
    console.log('尝试从页面查找字幕URL...');
    
    // 方法1: 从video元素的track标签获取
    const videoElement = document.querySelector('video');
    if (videoElement && videoElement.textTracks && videoElement.textTracks.length > 0) {
      for (const track of videoElement.textTracks) {
        if (track.kind === 'subtitles' || track.kind === 'captions') {
          const trackElement = document.querySelector(`track[kind="${track.kind}"][srclang="${track.language || 'en'}"]`);
          if (trackElement && trackElement.src) {
            console.log('从track元素找到字幕URL:', trackElement.src);
            return trackElement.src;
          }
        }
      }
    }
    
    // 方法2: 从网络请求捕获的字幕中获取
    // 获取当前视频ID
    const videoId = getNetflixVideoId();
    
    if (videoId) {
      console.log(`尝试为视频ID ${videoId} 查找已捕获的字幕URL...`);
      
      // 请求background脚本获取元数据
      return new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage({
            type: 'GET_METADATA'
          }, (response) => {
            // 处理可能的错误
            const lastError = chrome.runtime.lastError;
            if (lastError) {
              console.log('获取元数据时出错:', lastError.message);
              // 错误情况下尝试直接获取字幕
              tryGetSubtitlesFromStorage(resolve);
              return;
            }
            
            if (response && response.metadata && response.metadata[videoId]) {
              const tracks = response.metadata[videoId].tracks;
              if (tracks && Array.isArray(tracks) && tracks.length > 0) {
                // 寻找合适的字幕轨道 - 优先使用中文或英文
                const preferredLanguages = ['zh', 'en', 'zh-Hans', 'zh-CN', 'en-US', 'en-GB'];
                let bestTrack = null;
                
                for (const lang of preferredLanguages) {
                  const track = tracks.find(t => t.language === lang);
                  if (track && track.ttDownloadables) {
                    bestTrack = track;
                    break;
                  }
                }
                
                // 如果没有找到首选语言，使用第一个可用的字幕
                if (!bestTrack && tracks[0].ttDownloadables) {
                  bestTrack = tracks[0];
                }
                
                if (bestTrack && bestTrack.ttDownloadables) {
                  // 尝试获取最高质量的字幕URL
                  const formatKeys = Object.keys(bestTrack.ttDownloadables);
                  if (formatKeys.length > 0) {
                    const format = bestTrack.ttDownloadables[formatKeys[0]];
                    if (format && format.downloadUrls) {
                      const urlKeys = Object.keys(format.downloadUrls);
                      if (urlKeys.length > 0) {
                        const subtitleUrl = format.downloadUrls[urlKeys[0]];
                        console.log('从元数据中找到字幕URL:', subtitleUrl);
                        resolve(subtitleUrl);
                        return;
                      }
                    }
                  }
                }
              }
            } else {
              console.log('未获取到有效的元数据或视频ID不匹配');
            }
            
            // 如果没有找到字幕URL，使用网络请求拦截器中最后捕获的URL
            tryGetSubtitlesFromStorage(resolve);
          });
        } catch (error) {
          console.log('发送消息获取元数据时出错:', error);
          tryGetSubtitlesFromStorage(resolve);
        }
      });
    } else {
      console.log('未找到有效的视频ID');
    }
    
    // 如果上述方法都失败，尝试备用方案
    console.log('尝试备用方案获取字幕URL');
    return new Promise((resolve) => {
      tryGetSubtitlesFromStorage(resolve);
    });
  } catch (error) {
    console.log('查找字幕URL失败:', error);
    return null;
  }
}

// 辅助函数：从存储中获取字幕
function tryGetSubtitlesFromStorage(resolve) {
  try {
    // 先检查字幕可用性
    chrome.runtime.sendMessage({
      type: 'CHECK_SUBTITLE_AVAILABLE'
    }, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        console.log('检查字幕可用性出错:', lastError.message);
        resolve(null);
        return;
      }
      
      if (response && response.success && response.available) {
        console.log(`发现${response.count}条可用字幕记录`);
        
        // 获取字幕列表
        chrome.storage.local.get(['subtitles'], (result) => {
          if (chrome.runtime.lastError) {
            console.log('从存储获取字幕失败:', chrome.runtime.lastError.message);
            resolve(null);
            return;
          }
          
          if (result.subtitles) {
            const urls = Object.keys(result.subtitles);
            if (urls.length > 0) {
              // 使用最近捕获的字幕URL
              const latestUrl = urls[urls.length - 1];
              console.log('从storage中找到最近捕获的字幕URL:', latestUrl);
              resolve(latestUrl);
              return;
            }
          }
          
          // 如果没有找到任何字幕URL
          console.log('未找到字幕URL');
          resolve(null);
        });
      } else {
        console.log('没有可用的字幕记录');
        resolve(null);
      }
    });
  } catch (error) {
    console.log('从存储获取字幕时出错:', error);
    resolve(null);
  }
}

// 翻译字幕 - 优化版：智能批量翻译
async function translateSubtitles(originalSubtitles) {
  try {
    console.log('开始智能批量翻译字幕...');
    
    if (!originalSubtitles || originalSubtitles.length === 0) {
      console.log('没有字幕需要翻译');
      return;
      }
      
    // 初始化翻译结果数组
    if (!window.translatedSubtitles || window.translatedSubtitles.length !== originalSubtitles.length) {
      window.translatedSubtitles = originalSubtitles.map(sub => ({
        ...sub,
        translatedText: null // null表示未翻译，string表示已翻译
      }));
    }
    
    // 清空缓存和队列
    window.translationCache.clear();
    window.translationQueue.clear();
    
    // 设置全局字幕变量
    window.subtitles = originalSubtitles;
    
    // 获取当前播放时间，确定初始翻译范围
    const currentTime = window.originalVideo ? window.originalVideo.currentTime : 0;
    const startIndex = findSubtitleIndexByTime(currentTime);
    
    console.log(`当前播放时间: ${currentTime.toFixed(2)}s, 起始字幕索引: ${startIndex}`);
    
    // 立即翻译当前时间点附近的字幕（当前 + 后续10条）
    await translateSubtitlesInRange(startIndex, startIndex + window.preTranslationRange);
      
      // 更新字幕显示
      updateSubtitleOverlay();
      
    // 启动背景翻译任务，逐步翻译所有字幕
    startBackgroundTranslation();
      
    } catch (error) {
    console.log('智能翻译字幕失败:', error);
      
      // 翻译失败时创建备用翻译
    window.translatedSubtitles = originalSubtitles.map(sub => ({
        ...sub,
        translatedText: `[待翻译] ${sub.text}`
      }));
      
      updateSubtitleOverlay();
    }
  }

// 根据时间范围翻译字幕
async function translateSubtitlesInRange(startIndex, endIndex) {
  if (!window.subtitles || startIndex < 0 || startIndex >= window.subtitles.length) {
    return;
  }
  
  // 确保索引范围有效
  const actualStartIndex = Math.max(0, startIndex);
  const actualEndIndex = Math.min(window.subtitles.length - 1, endIndex);
  
  console.log(`翻译字幕范围: ${actualStartIndex} - ${actualEndIndex}`);
  
  // 收集需要翻译的字幕
  const subtitlesToTranslate = [];
  const indexMapping = [];
  
  for (let i = actualStartIndex; i <= actualEndIndex; i++) {
    // 跳过已翻译或正在翻译的字幕
    if (window.translatedSubtitles[i].translatedText || window.translationQueue.has(i)) {
      continue;
    }
    
    // 标记为正在翻译
    window.translationQueue.add(i);
    
    subtitlesToTranslate.push(window.subtitles[i].text);
    indexMapping.push(i);
  }
  
  if (subtitlesToTranslate.length === 0) {
    console.log('该范围内没有需要翻译的字幕');
    return;
  }
  
  try {
    // // 显示翻译进度
    // updateTranslationProgress(
    //   window.translatedSubtitles.filter(sub => sub.translatedText).length,
    //   window.subtitles.length
    // );
    
    console.log(`开始翻译 ${subtitlesToTranslate.length} 条字幕...`);
    
    // 调用翻译服务
    const translations = await requestTranslation(subtitlesToTranslate, 'auto', getUserTargetLanguage());
    
    console.log(translations, "translations")
    // 处理翻译结果
    if (translations && Array.isArray(translations)) {
      for (let i = 0; i < indexMapping.length; i++) {
        const subtitleIndex = indexMapping[i];
        const translation = translations[i] || `[翻译失败] ${window.subtitles[subtitleIndex].text}`;
        
        // 更新翻译结果
        window.translatedSubtitles[subtitleIndex].translatedText = translation;
        
        // 添加到缓存
        window.translationCache.set(subtitleIndex, translation);
        
        // 从翻译队列中移除
        window.translationQueue.delete(subtitleIndex);
      }
      
      console.log(`成功翻译 ${translations.length} 条字幕`);
        } else {
      console.log('翻译服务返回无效数据，使用备用文本');
      // 翻译失败时的处理
      for (const subtitleIndex of indexMapping) {
        window.translatedSubtitles[subtitleIndex].translatedText = `[翻译服务异常] ${window.subtitles[subtitleIndex].text}`;
        window.translationQueue.delete(subtitleIndex);
  }
}

    // 如果当前显示的字幕在翻译范围内，立即更新显示
    if (window.currentSubtitleIndex >= actualStartIndex && window.currentSubtitleIndex <= actualEndIndex) {
      displaySubtitle(window.currentSubtitleIndex);
    }
    
  } catch (error) {
    console.log(`翻译范围 ${actualStartIndex}-${actualEndIndex} 失败:`, error);

    // 错误处理：标记为翻译失败
    for (const subtitleIndex of indexMapping) {
      window.translatedSubtitles[subtitleIndex].translatedText = `[翻译失败] ${window.subtitles[subtitleIndex].text}`;
      window.translationQueue.delete(subtitleIndex);
    }
  }
}

// 启动背景翻译任务
function startBackgroundTranslation() {
  if (!window.subtitles || window.subtitles.length === 0) return;
  
  console.log('启动背景翻译任务...');
  
  // 使用低频率的定时器进行背景翻译
  const backgroundTranslationInterval = setInterval(async () => {
    if (!window.isSubtitleMode || window.isTranslating) {
    return;
  }

    // 查找下一个未翻译的字幕批次
    const nextUntranslatedIndex = findNextUntranslatedIndex();
    
    if (nextUntranslatedIndex === -1) {
      // 所有字幕都已翻译完成
      console.log('背景翻译任务完成');
      clearInterval(backgroundTranslationInterval);
      return;
    }
    
    // 翻译下一个批次
    window.isTranslating = true;
    await translateSubtitlesInRange(nextUntranslatedIndex, nextUntranslatedIndex + window.translationBatchSize - 1);
    window.isTranslating = false;
    
    // 控制翻译频率，避免过于频繁的请求
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  }, 2000); // 每2秒检查一次
}

// 查找下一个未翻译的字幕索引
function findNextUntranslatedIndex() {
  for (let i = 0; i < window.translatedSubtitles.length; i++) {
    if (!window.translatedSubtitles[i].translatedText && !window.translationQueue.has(i)) {
      return i;
    }
  }
  return -1;
}

// 根据时间查找字幕索引
function findSubtitleIndexByTime(time) {
  if (!window.subtitles || window.subtitles.length === 0) return 0;
  
  // 查找当前时间点应该显示的字幕
  for (let i = 0; i < window.subtitles.length; i++) {
    const subtitle = window.subtitles[i];
    if (subtitle.start <= time && time <= subtitle.end) {
      return i;
    }
  }
  
  // 如果没有找到精确匹配，找最接近的字幕
  for (let i = 0; i < window.subtitles.length; i++) {
    if (window.subtitles[i].start > time) {
      return Math.max(0, i - 1);
    }
  }
  
  return window.subtitles.length - 1;
}

// 检测快进并处理
function handleVideoSeekOptimized(currentTime) {
  const timeDiff = Math.abs(currentTime - window.lastVideoTime);
  
  // 如果时间跳跃超过2秒，认为是快进/快退
  if (timeDiff > 2) {
    console.log(`检测到快进/快退: ${window.lastVideoTime.toFixed(2)}s -> ${currentTime.toFixed(2)}s`);
    
    // 记录快进时间（用于统计分析）
    window.lastSeekTime = Date.now();
    
    // 立即清除当前字幕，避免字幕滞留
    clearSubtitleDisplay();
    
    // 立即翻译目标时间点附近的字幕
    const targetIndex = findSubtitleIndexByTime(currentTime);
    const startIndex = Math.max(0, targetIndex - 2); // 前2条
    const endIndex = Math.min(window.subtitles.length - 1, targetIndex + window.preTranslationRange); // 后10条
    
    console.log(`快进优化: 立即翻译索引 ${startIndex} - ${endIndex}`);
    
    // 异步翻译，不阻塞UI
    if (!window.isTranslating) {
      window.isTranslating = true;
      translateSubtitlesInRange(startIndex, endIndex)
        .finally(() => {
          window.isTranslating = false;
        })
        .catch(error => {
          console.log('快进翻译失败:', error);
        });
    }
  }
  
  window.lastVideoTime = currentTime;
}

// 请求翻译服务
async function requestTranslation(texts, sourceLang, targetLang) {
  return new Promise((resolve, reject) => {
    // 检查输入参数
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      console.log('翻译请求参数无效: texts不是有效数组或为空');
      resolve([]);
      return;
}

    // 记录请求信息
    console.log(`发送翻译请求: ${texts.length}条文本, 源语言: ${sourceLang}, 目标语言: ${targetLang}`);
    
    console.log(texts, "texts")
    // 发送消息到background.js
    chrome.runtime.sendMessage({
      action: 'translateTexts',
      texts: texts,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang
    }, (response) => {

      console.log(response, "response")
      if (chrome.runtime.lastError) {
        console.log('翻译请求出错:', chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.success && response.translations) {
        // 确保返回的是数组
        if (Array.isArray(response.translations)) {
          console.log(`翻译成功: 收到${response.translations.length}条翻译结果`);
          resolve(response.translations);
        } else {
          console.log('翻译服务返回了无效数据格式，不是数组:', response.translations);
          // 返回空数组而不是reject，避免外部代码出错
          resolve([]);
        }
      } else {
        const errorMsg = response?.error || '翻译服务响应错误';
        console.log('翻译请求失败:', errorMsg);
        // 返回空数组而不是reject，避免外部代码出错
        resolve([]);
      }
    });
  });
}

// 从Netflix页面提取字幕
async function extractCurrentSubtitlesFromPage() {
  console.log('尝试从页面提取字幕...');
  
  try {
    // 方法1: 查找video元素的text tracks
    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      if (video.textTracks && video.textTracks.length > 0) {
        for (const track of video.textTracks) {
          if (track.cues && track.cues.length > 0) {
            console.log('找到text track字幕:', track.cues.length, '条');
            return Array.from(track.cues).map(cue => ({
              start: cue.startTime,
              end: cue.endTime,
              text: cue.text
            }));
          }
        }
      }
    }
    
    // 方法2: 查找字幕容器元素
    const subtitleSelectors = [
      '.player-timedtext',
      '.timedtext-text-container',
      '.subtitle-text',
      '[data-uia="player-caption-text"]',
      '.ltr-1472mwy',
      '.player-timedtext-text-container'
    ];
    
    for (const selector of subtitleSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log('找到字幕容器元素:', selector);
        // 这里可以进一步处理字幕元素
        break;
      }
    }
    
    // 方法3: 监听字幕变化
    return await interceptNetflixSubtitleRequests();
    
  } catch (error) {
    console.log('从页面提取字幕失败:', error);
    return null;
  }
}

// 更新翻译进度
// function updateTranslationProgress(current, total) {
//   if (window.subtitlesOverlay) {
//     const percentage = Math.round((current / total) * 100);
//     window.subtitlesOverlay.innerHTML = `
//       <div class="subtitle-loading">
//         <div class="subtitle-loading-spinner"></div>
//         <div class="subtitle-loading-text">正在翻译字幕... ${percentage}% (${current}/${total})</div>
//       </div>
//     `;
//     // 确保字幕背景框可见
//     window.subtitlesOverlay.style.display = 'block';
//   }
// }

// 使用备用模拟字幕数据
function useBackupSubtitles() {
  console.log('使用备用模拟字幕数据');

  try {
    // 模拟字幕数据
    const backupSubtitles = [
      { start: 0, end: 5, text: "Welcome to this series" },
      { start: 5, end: 10, text: "Today we're exploring new adventures" },
      { start: 10, end: 15, text: "Join us on this incredible journey" },
      { start: 15, end: 20, text: "Discover amazing stories and characters" },
      { start: 20, end: 25, text: "Experience the thrill of entertainment" },
      { start: 25, end: 30, text: "Every moment brings new surprises" },
      { start: 30, end: 35, text: "The plot thickens with each scene" },
      { start: 35, end: 40, text: "Characters develop in unexpected ways" },
      { start: 40, end: 45, text: "Emotions run high in this episode" },
      { start: 45, end: 50, text: "Don't miss what happens next" },
      { start: 50, end: 55, text: "The story continues to unfold" },
      { start: 55, end: 60, text: "Thank you for watching with us" }
    ];

    // 设置字幕变量
    window.subtitles = backupSubtitles;
    console.log(`成功设置${backupSubtitles.length}条备用字幕`);

    // 模拟翻译数据
    const translatedSubs = backupSubtitles.map(sub => {
      let translatedText = '';
      
      if (sub.text.includes("Welcome to this series")) {
        translatedText = "欢迎观看本系列";
      } else if (sub.text.includes("Today we're exploring")) {
        translatedText = "今天我们探索新的冒险";
      } else if (sub.text.includes("Join us on this")) {
        translatedText = "加入我们这个不可思议的旅程";
      } else if (sub.text.includes("Discover amazing")) {
        translatedText = "发现令人惊叹的故事和角色";
      } else if (sub.text.includes("Experience the thrill")) {
        translatedText = "体验娱乐的刺激";
      } else if (sub.text.includes("Every moment brings")) {
        translatedText = "每一刻都带来新的惊喜";
      } else if (sub.text.includes("The plot thickens")) {
        translatedText = "情节在每个场景中都在加深";
      } else if (sub.text.includes("Characters develop")) {
        translatedText = "角色以意想不到的方式发展";
      } else if (sub.text.includes("Emotions run high")) {
        translatedText = "在这一集中情绪高涨";
      } else if (sub.text.includes("Don't miss what")) {
        translatedText = "不要错过接下来发生的事情";
      } else if (sub.text.includes("The story continues")) {
        translatedText = "故事继续展开";
      } else if (sub.text.includes("Thank you for watching")) {
        translatedText = "感谢您与我们一起观看";
      } else {
        translatedText = `[译文] ${sub.text}`;
      }
      
      return {
        ...sub,
        translatedText: translatedText
      };
    });

    window.translatedSubtitles = translatedSubs;
    console.log(`成功设置${translatedSubs.length}条备用翻译字幕`);

    // 更新覆盖层显示
    updateSubtitleOverlay();

  } catch (error) {
    console.log('设置备用字幕时出错:', error);
    showSubtitleError('字幕加载失败');
  }
}

// 更新字幕覆盖层
function updateSubtitleOverlay() {
  try {
    if (!window.subtitlesOverlay || !window.isSubtitleMode) {
      return;
    }
  
    if (window.originalVideo && window.originalVideo.currentTime !== undefined) {
      updateSubtitleByTime(window.originalVideo.currentTime);
    }
  } catch (error) {
    console.log('更新字幕显示时出错:', error);
  }
}

// 根据时间更新字幕 - 优化版：集成智能翻译
function updateSubtitleByTime(currentTime) {
  if (!window.subtitles || window.subtitles.length === 0 || !window.isSubtitleMode) {
    return;
  }

  // 检测快进并处理
  handleVideoSeekOptimized(currentTime);

  const PREVIEW_TIME = 0.2; // 提前0.2秒显示字幕
  let foundIndex = -1;

  // 查找当前时间点应该显示的字幕
  for (let i = 0; i < window.subtitles.length; i++) {
    const subtitle = window.subtitles[i];
    if (!subtitle || subtitle.start === undefined || subtitle.end === undefined) {
      continue;
    }

    if (currentTime >= subtitle.start - PREVIEW_TIME && currentTime <= subtitle.end) {
      foundIndex = i;
      break;
    }
  }

  // 更新字幕显示
  if (foundIndex !== -1 && foundIndex !== window.currentSubtitleIndex) {
    displaySubtitle(foundIndex);
    
    // 智能预翻译：如果当前字幕还没翻译，或者接近播放边界，触发预翻译
    if (window.translatedSubtitles && foundIndex < window.translatedSubtitles.length) {
      const currentSub = window.translatedSubtitles[foundIndex];
      
      // 如果当前字幕未翻译，立即翻译当前及后续字幕
      if (!currentSub.translatedText && !window.isTranslating) {
        console.log(`字幕 #${foundIndex} 未翻译，触发预翻译`);
        window.isTranslating = true;
        translateSubtitlesInRange(foundIndex, foundIndex + window.preTranslationRange)
          .finally(() => {
            window.isTranslating = false;
          });
      }
      
      // 预翻译检测：当播放接近未翻译区域时，提前翻译
      const upcomingUntranslatedIndex = findUpcomingUntranslatedIndex(foundIndex);
      if (upcomingUntranslatedIndex !== -1 && 
          upcomingUntranslatedIndex - foundIndex <= 3 && 
          !window.isTranslating) {
        console.log(`即将播放到未翻译字幕 #${upcomingUntranslatedIndex}，提前翻译`);
        window.isTranslating = true;
        translateSubtitlesInRange(upcomingUntranslatedIndex, upcomingUntranslatedIndex + window.preTranslationRange)
          .finally(() => {
            window.isTranslating = false;
          });
      }
    }
    
  } else if (foundIndex === -1 && window.currentSubtitleIndex !== -1) {
    // 找不到当前时间对应的字幕，但之前有显示字幕，则清除显示
    clearSubtitleDisplay();
  } else if (window.currentSubtitleIndex !== -1) {
    const currentSub = window.subtitles[window.currentSubtitleIndex];
    if (currentSub && currentSub.end !== undefined && currentTime > currentSub.end) {
      clearSubtitleDisplay();
    }
  }
}

// 查找即将播放到的未翻译字幕索引
function findUpcomingUntranslatedIndex(currentIndex) {
  if (!window.translatedSubtitles || currentIndex < 0) return -1;
  
  // 从当前位置开始查找未翻译的字幕
  for (let i = currentIndex; i < window.translatedSubtitles.length; i++) {
    if (!window.translatedSubtitles[i].translatedText && !window.translationQueue.has(i)) {
      return i;
    }
  }
  
  return -1;
}

// 显示指定索引的字幕
function displaySubtitle(index) {
  try {
    if (!window.subtitlesOverlay) {
      return;
    }

    // 确保字幕覆盖层有正确的结构
    if (!window.subtitlesOverlay.querySelector('.netflix-subtitle-original')) {
      window.subtitlesOverlay.innerHTML = `
        <div class="netflix-subtitle-text netflix-subtitle-original"></div>
        <div class="netflix-subtitle-text netflix-subtitle-translation"></div>
      `;
    }
    
    const originalElement = window.subtitlesOverlay.querySelector('.netflix-subtitle-original');
    const translationElement = window.subtitlesOverlay.querySelector('.netflix-subtitle-translation');

    if (!window.subtitles || index < 0 || index >= window.subtitles.length) {
      window.subtitlesOverlay.style.display = 'none';
      return;
    }

    window.currentSubtitleIndex = index;
    const currentSubtitle = window.subtitles[index];

    if (!currentSubtitle) {
      window.subtitlesOverlay.style.display = 'none';
      return;
    }

    // 获取原文和翻译文本
    const originalText = currentSubtitle.text || '';
    let translationText = '';
    
    if (window.translatedSubtitles && window.translatedSubtitles[index] && window.translatedSubtitles[index].translatedText) {
      translationText = window.translatedSubtitles[index].translatedText;
    } else {
      translationText = '翻译加载中...';
    }
    
    // 如果原文和翻译都为空，隐藏字幕背景框
    if (!originalText.trim() && (!translationText.trim() || translationText === '翻译加载中...')) {
      window.subtitlesOverlay.style.display = 'none';
      return;
    }

    // 确保字幕背景框可见
    window.subtitlesOverlay.style.display = 'block';
    
    // 显示原文字幕 - 使用简单分词
    if (originalText) {
      originalElement.innerHTML = originalText
        .split(' ')
        .map(word => `<span class="subtitle-token">${word}</span>`)
        .join('<span class="subtitle-token space"> </span>');
    } else {
      originalElement.textContent = '';
    }

    // 显示翻译字幕
    translationElement.textContent = translationText;

    console.log(`显示字幕 #${index + 1}/${window.subtitles.length}: ${originalText.substring(0, 50)}${originalText.length > 50 ? '...' : ''}`);
  } catch (error) {
    console.log('显示字幕时出错:', error);
  }
}

// 清空字幕显示
function clearSubtitleDisplay() {
  try {
    if (window.subtitlesOverlay) {
      // 清空原文字幕
      const originalElement = window.subtitlesOverlay.querySelector('.netflix-subtitle-original');
      if (originalElement) {
    originalElement.textContent = '';
      }

      // 清空翻译字幕
      const translationElement = window.subtitlesOverlay.querySelector('.netflix-subtitle-translation');
      if (translationElement) {
    translationElement.textContent = '';
  }

      // 隐藏字幕背景框
      window.subtitlesOverlay.style.display = 'none';
    }
  
    window.currentSubtitleIndex = -1;
  } catch (error) {
    console.log('清空字幕显示时出错:', error);
  }
}

// 显示字幕错误信息
function showSubtitleError(errorMessage) {
  if (!window.subtitlesOverlay) return;
  
  console.log('显示字幕错误:', errorMessage);
  
  window.subtitlesOverlay.innerHTML = `
    <div class="netflix-subtitle-text" style="color: #ff6b6b; text-align: center;">
      ⚠️ ${errorMessage || '字幕加载失败'}
    </div>
    <div class="netflix-subtitle-text" style="color: #ccc; font-size: 14px; text-align: center; margin-top: 8px;">
      请刷新页面重试
    </div>
  `;
  
  // 确保错误信息可见
  window.subtitlesOverlay.style.display = 'block';
}

// 显示状态消息
function showStatusMessage(message) {
  // 移除现有的状态指示器
  const existingIndicator = document.querySelector('.subtitle-status-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // 创建新的状态指示器
  const indicator = document.createElement('div');
  indicator.className = 'subtitle-status-indicator';
  indicator.textContent = message;
  
  document.body.appendChild(indicator);
  
  // 显示指示器
  setTimeout(() => {
    indicator.classList.add('show');
  }, 100);
  
  // 3秒后隐藏
  setTimeout(() => {
    indicator.classList.remove('show');
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 300);
  }, 3000);
}

// 拦截Netflix字幕请求（占位函数）
async function interceptNetflixSubtitleRequests() {
  console.log('尝试拦截Netflix字幕请求...');
  
  // 这个函数将由字幕提取器的拦截机制处理
  // 返回null表示没有通过此方法获取到字幕
  return null;
}

// 立即执行初始化
(function() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('页面已加载，立即初始化Netflix双语字幕');
    initNetflixSubtitles();
  } else {
    console.log('页面正在加载中，等待load事件...');
    window.addEventListener('load', initNetflixSubtitles);
  }
})(); 

// 获取最新捕获的字幕URL - 优先使用内存中保存的URL
async function getLatestSubtitleUrl() {
  // 如果已经有保存的URL并且不超过10分钟，直接使用它
  if (window.latestCapturedSubtitleUrl && 
      window.latestCaptureTime && 
      Date.now() - window.latestCaptureTime < 10 * 60 * 1000) {
    console.log('使用内存中保存的字幕URL:', window.latestCapturedSubtitleUrl);
    console.log('URL捕获时间:', new Date(window.latestCaptureTime).toLocaleTimeString());
    return window.latestCapturedSubtitleUrl;
  }
  
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type: 'GET_LATEST_SUBTITLE_URL' },
        response => {
          if (chrome.runtime.lastError) {
            console.log('获取最新字幕URL时出错:', chrome.runtime.lastError.message);
            resolve(null);
            return;
          }
          
          if (response && response.success && response.hasUrl) {
            console.log('从background.js成功获取最新字幕URL:', response.url);
            // 保存到内存变量
            window.latestCapturedSubtitleUrl = response.url;
            window.latestCaptureTime = Date.now();
            resolve(response.url);
          } else {
            console.log('未找到有效的字幕URL');
            resolve(null);
          }
        }
      );
    } catch (error) {
      console.log('获取字幕URL时发生异常:', error);
      resolve(null);
    }
  });
}