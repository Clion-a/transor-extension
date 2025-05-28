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

// 状态变量
let isSubtitleMode = false;
let controlBarObserver = null;
let mainObserver = null;
let videoObserver = null;
let subtitlesOverlay = null;
let currentVideoId = '';
let subtitles = [];
let translatedSubtitles = [];
let currentSubtitleIndex = -1;
let subtitleUpdateInterval = null;
let originalVideo = null;

// 调试日志
const DEBUG = true;
function log(...args) {
  if (DEBUG) {
    console.log('%c[Netflix双语字幕]', 'color: #e50914; font-weight: bold;', ...args);
  }
}

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
    log('找到Netflix外层控制栏容器');
    return outerControlBar;
  }
  
  // 使用用户提供的精确选择器
  const controlBar = document.querySelector('.ltr-gpipej[style*="justify-content: flex-end"]');
  if (controlBar) {
    log('找到精确的Netflix控制栏');
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
      log(`使用备用选择器找到控制栏: ${selector}`);
      return element;
    }
  }
  
  return null;
}

// 在控制栏中添加按钮
function addButtonToControlBar(controlBar) {
  // 检查按钮是否已存在
  if (document.getElementById('transor-netflix-subtitle-btn')) {
    log('按钮已存在，无需再添加');
    return;
  }
  
  log('在控制栏中添加双语字幕按钮');
  
  // 查找右侧控制区域
  const rightControlsArea = controlBar.querySelector('.ltr-gpipej[style*="justify-content: flex-end"]');
  
  if (rightControlsArea) {
    log('找到右侧控制区域');
    
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
    log('已添加间隔元素和按钮到右侧控制区域');
  } else {
    // 备用方法：添加到控制栏末尾
    log('未找到右侧控制区域，使用备用方法');
    
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
        log('已添加按钮到最后一个按钮的后面');
      } else {
        controlBar.appendChild(spacerDiv);
        controlBar.appendChild(buttonContainer);
        log('直接添加到控制栏');
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
  log('开始监听控制栏变化');
  
  // 停止之前的观察器
  if (controlBarObserver) {
    controlBarObserver.disconnect();
  }
  if (mainObserver) {
    mainObserver.disconnect();
  }
  
  // 检查是否已存在控制栏
  const existingControlBar = findNetflixControlBar();
  if (existingControlBar) {
    log('找到现有控制栏，添加按钮');
    addButtonToControlBar(existingControlBar);
    
    // 监听控制栏变化
    controlBarObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          // 检查按钮是否被移除
          if (!document.getElementById('transor-netflix-subtitle-btn')) {
            log('按钮被移除，重新添加');
            const controlBar = findNetflixControlBar();
            if (controlBar) {
              addButtonToControlBar(controlBar);
            }
          }
          
          // 检查控制栏是否被移除
          if (!document.body.contains(existingControlBar)) {
            log('控制栏被移除，重新启动监听');
            startControlBarMonitoring();
            return;
          }
        }
      }
    });
    
    controlBarObserver.observe(existingControlBar, {
      childList: true,
      subtree: true
    });
  }
  
  // 设置主DOM观察器
  mainObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        const controlBar = findNetflixControlBar();
        if (controlBar && !controlBar.querySelector('#transor-netflix-subtitle-btn')) {
          log('检测到控制栏被添加，添加按钮');
          addButtonToControlBar(controlBar);
          startControlBarMonitoring();
          return;
        }
      }
    }
  });
  
  mainObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // 定期检查
  setInterval(() => {
    const controlBar = findNetflixControlBar();
    if (controlBar && !controlBar.querySelector('#transor-netflix-subtitle-btn')) {
      log('定期检查：发现控制栏但没有按钮，添加按钮');
      addButtonToControlBar(controlBar);
    }
  }, 2000);
}

// 初始化Netflix双语字幕
function initNetflixSubtitles() {
  log('初始化Netflix双语字幕');
  
  if (isNetflixVideoPage()) {
    log('检测到Netflix视频页面，启动控制栏监听');
    startControlBarMonitoring();
    monitorUrlChanges();
  } else {
    log('不是Netflix视频页面，仅监听URL变化');
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
      log('URL已变化，当前URL:', currentUrl);
      
      // 如果在字幕模式中，退出
      if (isSubtitleMode) {
        exitSubtitleMode();
      }
      
      // 如果是视频页面，启动监听
      if (isNetflixVideoPage()) {
        log('导航到了视频页面，启动控制栏监听');
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
  log('Netflix双语字幕样式已添加');
}

// 切换字幕模式
function toggleSubtitleMode() {
  if (isSubtitleMode) {
    exitSubtitleMode();
  } else {
    enterSubtitleMode();
  }
}

// 进入字幕模式
function enterSubtitleMode() {
  log('进入Netflix双语字幕模式');
  
  // 获取当前视频ID
  currentVideoId = getNetflixVideoId();
  if (!currentVideoId) {
    log('无法获取视频ID，使用默认字幕');
    currentVideoId = 'netflix-default';
  }

  // 查找当前视频元素
  originalVideo = document.querySelector('video');
  if (!originalVideo) {
    log('未找到视频元素');
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
  isSubtitleMode = true;
  
  showStatusMessage('双语字幕已启用');
}

// 退出字幕模式
function exitSubtitleMode() {
  log('退出Netflix双语字幕模式');
  
  // 清除字幕更新计时器
  if (subtitleUpdateInterval) {
    clearInterval(subtitleUpdateInterval);
    subtitleUpdateInterval = null;
  }
  
  // 停止视频监听
  if (videoObserver) {
    videoObserver.disconnect();
    videoObserver = null;
  }
  
  // 移除字幕覆盖层
  if (subtitlesOverlay) {
    document.body.removeChild(subtitlesOverlay);
    subtitlesOverlay = null;
  }
  
  // 移除状态指示器
  const statusIndicator = document.querySelector('.subtitle-status-indicator');
  if (statusIndicator) {
    statusIndicator.remove();
  }
  
  // 取消激活按钮状态
  const button = document.getElementById('transor-netflix-subtitle-btn');
  if (button) {
    button.classList.remove('active');
  }
  
  // 修改状态
  isSubtitleMode = false;
  currentSubtitleIndex = -1;
  originalVideo = null;
  
  showStatusMessage('双语字幕已关闭');
  
  log('已退出双语字幕模式');
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
  log('创建字幕覆盖层');
  
  // 移除现有的覆盖层
  if (subtitlesOverlay) {
    document.body.removeChild(subtitlesOverlay);
  }
  
  // 创建新的覆盖层
  subtitlesOverlay = document.createElement('div');
  subtitlesOverlay.className = 'netflix-subtitle-overlay';
  subtitlesOverlay.innerHTML = `
    <div class="subtitle-loading">
      <div class="subtitle-loading-spinner"></div>
      <div class="subtitle-loading-text">正在加载字幕...</div>
    </div>
  `;
  
  document.body.appendChild(subtitlesOverlay);
  log('字幕覆盖层已创建');
}

// 开始视频时间跟踪
function startVideoTimeTracking() {
  log('开始视频时间跟踪');
  
  if (!originalVideo) {
    log('没有找到视频元素，无法开始时间跟踪');
    return;
  }
  
  // 清除之前的计时器
  if (subtitleUpdateInterval) {
    clearInterval(subtitleUpdateInterval);
    subtitleUpdateInterval = null;
  }
  
  // 使用高频率的时间跟踪以确保字幕同步精确
  subtitleUpdateInterval = setInterval(() => {
    if (originalVideo && !originalVideo.paused && isSubtitleMode) {
      const currentTime = originalVideo.currentTime;
      updateSubtitleByTime(currentTime);
    }
  }, 100); // 每100毫秒更新一次
  
  // 同时监听视频事件
  if (originalVideo) {
    originalVideo.addEventListener('timeupdate', handleVideoTimeUpdate);
    originalVideo.addEventListener('play', handleVideoPlay);
    originalVideo.addEventListener('pause', handleVideoPause);
    originalVideo.addEventListener('seeked', handleVideoSeeked);
  }
  
  log('视频时间跟踪已启动');
}

// 视频时间更新处理
function handleVideoTimeUpdate(event) {
  if (isSubtitleMode && event.target) {
    updateSubtitleByTime(event.target.currentTime);
  }
}

// 视频播放处理
function handleVideoPlay() {
  log('视频开始播放');
  if (isSubtitleMode && subtitlesOverlay) {
    subtitlesOverlay.style.opacity = '1';
  }
}

// 视频暂停处理
function handleVideoPause() {
  log('视频已暂停');
  if (isSubtitleMode && subtitlesOverlay) {
    subtitlesOverlay.style.opacity = '0.7';
  }
}

// 视频跳转处理
function handleVideoSeeked(event) {
  log('视频时间已跳转');
  if (isSubtitleMode && event.target) {
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
    
    log('开始拦截Netflix字幕请求...');
    this.isIntercepting = true;
    
    // 拦截XMLHttpRequest
    this.interceptXHR();
    
    // 拦截fetch请求
    this.interceptFetch();
    
    // 监听页面字幕元素变化
    this.observeSubtitleElements();
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
            log('读取字幕响应失败:', error);
          });
        }
        
        return response;
      });
    };
  }

  // 判断是否为字幕URL
  isSubtitleUrl(url) {
    if (typeof url !== 'string') return false;
    
    // Netflix字幕URL特征
    const subtitlePatterns = [
      /nflxvideo\.net\/.*\?o=/,  // Netflix CDN字幕
      /\.ttml$/,                 // TTML格式
      /\.vtt$/,                  // WebVTT格式
      /\.dfxp$/,                 // DFXP格式
      /timedtext/,               // 字幕相关
      /subtitle/,                // 字幕相关
      /caption/                  // 字幕相关
    ];
    
    return subtitlePatterns.some(pattern => pattern.test(url));
  }

  // 处理响应数据
  handleResponse(url, responseText) {
    if (!this.isSubtitleUrl(url) || !responseText) return;
    
    log('检测到字幕请求:', url);
    
    try {
      const subtitles = this.parseSubtitleContent(responseText);
      if (subtitles && subtitles.length > 0) {
        log(`成功解析${subtitles.length}条字幕`);
        this.subtitleCache.set(url, subtitles);
        
        // 触发字幕加载事件
        this.onSubtitlesFound(subtitles);
      }
    } catch (error) {
      log('解析字幕失败:', error);
    }
  }

  // 解析字幕内容
  parseSubtitleContent(content) {
    try {
      // 尝试解析TTML格式
      if (content.includes('<tt ') || content.includes('<ttml')) {
        return this.parseTTML(content);
      }
      
      // 尝试解析WebVTT格式
      if (content.includes('WEBVTT')) {
        return this.parseWebVTT(content);
      }
      
      // 尝试解析JSON格式
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        return this.parseJSON(content);
      }
      
      log('未识别的字幕格式');
      return null;
    } catch (error) {
      log('解析字幕内容失败:', error);
      return null;
    }
  }

  // 解析TTML格式字幕
  parseTTML(content) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      const pElements = xmlDoc.getElementsByTagName('p');
      
      const subtitles = [];
      
      for (let i = 0; i < pElements.length; i++) {
        const element = pElements[i];
        const begin = element.getAttribute('begin');
        const end = element.getAttribute('end');
        const text = element.textContent?.trim();
        
        if (begin && end && text) {
          subtitles.push({
            start: this.parseTimeToSeconds(begin),
            end: this.parseTimeToSeconds(end),
            text: text
          });
        }
      }
      
      return subtitles.sort((a, b) => a.start - b.start);
    } catch (error) {
      log('解析TTML失败:', error);
      return null;
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
      log('解析WebVTT失败:', error);
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
      log('解析JSON字幕失败:', error);
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
                log('检测到字幕元素变化:', selector);
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
      log('从元素提取字幕失败:', error);
    }
  }

  // 字幕找到回调
  onSubtitlesFound(subtitles) {
    log(`找到${subtitles.length}条字幕，开始翻译...`);
    
    // 更新全局字幕变量
    window.subtitles = subtitles;
    
    // 开始翻译
    this.translateSubtitles(subtitles);
  }

  // 翻译字幕
  async translateSubtitles(originalSubtitles) {
    try {
      log('开始翻译字幕...');
      
      if (!originalSubtitles || originalSubtitles.length === 0) {
        log('没有字幕需要翻译');
        return;
      }
      
      // 显示翻译进度
      updateTranslationProgress(0, originalSubtitles.length);
      
      // 批量翻译，每次翻译3条字幕
      const batchSize = 3;
      const translatedResults = [];
      
      for (let i = 0; i < originalSubtitles.length; i += batchSize) {
        const batch = originalSubtitles.slice(i, i + batchSize);
        const textsToTranslate = batch.map(sub => sub.text);
        
        try {
          // 调用background.js中的翻译服务
          const translations = await this.requestTranslation(textsToTranslate, 'auto', getUserTargetLanguage());
          
          // 将翻译结果与原字幕合并
          for (let j = 0; j < batch.length; j++) {
            translatedResults.push({
              ...batch[j],
              translatedText: translations[j] || '翻译失败'
            });
          }
          
          // 更新进度
          updateTranslationProgress(i + batch.length, originalSubtitles.length);
          
          // 避免请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          log(`翻译批次 ${i}-${i + batch.length} 失败:`, error);
          
          // 翻译失败时使用原文
          for (const sub of batch) {
            translatedResults.push({
              ...sub,
              translatedText: `[翻译失败] ${sub.text}`
            });
          }
        }
      }
      
      // 更新全局翻译字幕变量
      window.translatedSubtitles = translatedResults;
      translatedSubtitles = translatedResults;
      
      log(`字幕翻译完成，共翻译${translatedResults.length}条`);
      
      // 更新字幕显示
      updateSubtitleOverlay();
      
    } catch (error) {
      log('翻译字幕失败:', error);
      
      // 翻译失败时创建备用翻译
      translatedSubtitles = originalSubtitles.map(sub => ({
        ...sub,
        translatedText: `[待翻译] ${sub.text}`
      }));
      
      updateSubtitleOverlay();
    }
  }

  // 请求翻译服务
  async requestTranslation(texts, sourceLang, targetLang) {
    return new Promise((resolve, reject) => {
      // 发送消息到background.js
      chrome.runtime.sendMessage({
        action: 'translate',
        texts: texts,
        sourceLang: sourceLang,
        targetLang: targetLang
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response.translations);
        } else {
          reject(new Error(response?.error || '翻译服务响应错误'));
        }
      });
    });
  }

  // 停止拦截
  stopIntercepting() {
    this.isIntercepting = false;
    log('停止拦截Netflix字幕请求');
  }
}

// 创建字幕提取器实例
const subtitleExtractor = new NetflixSubtitleExtractor();

// 修改loadSubtitles函数使用真实的字幕获取
async function loadSubtitles() {
  if (!currentVideoId) {
    log('未找到视频ID，使用备用字幕');
    useBackupSubtitles();
    return;
  }

  try {
    log(`正在尝试获取Netflix视频ID为 ${currentVideoId} 的字幕...`);
    
    // 开始拦截字幕请求
    subtitleExtractor.startIntercepting();
    
    // 尝试从页面提取现有字幕
    const pageSubtitles = await extractCurrentSubtitlesFromPage();
    if (pageSubtitles && pageSubtitles.length > 0) {
      log(`从页面提取到${pageSubtitles.length}条字幕`);
      subtitleExtractor.onSubtitlesFound(pageSubtitles);
      return;
    }
    
    // 如果没有找到字幕，等待拦截器捕获
    setTimeout(() => {
      if (!window.subtitles || window.subtitles.length === 0) {
        log('未能获取到真实字幕，使用备用字幕');
        useBackupSubtitles();
      }
    }, 5000); // 等待5秒
    
  } catch (error) {
    log('加载字幕失败:', error);
    useBackupSubtitles();
  }
}

// 获取用户目标语言
function getUserTargetLanguage() {
  // 可以从用户设置中获取，这里默认返回中文
  return 'zh-CN';
}

// 从Netflix页面提取字幕
async function extractCurrentSubtitlesFromPage() {
  log('尝试从页面提取字幕...');
  
  try {
    // 方法1: 查找video元素的text tracks
    const videos = document.querySelectorAll('video');
    for (const video of videos) {
      if (video.textTracks && video.textTracks.length > 0) {
        for (const track of video.textTracks) {
          if (track.cues && track.cues.length > 0) {
            log('找到text track字幕:', track.cues.length, '条');
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
        log('找到字幕容器元素:', selector);
        // 这里可以进一步处理字幕元素
        break;
      }
    }
    
    // 方法3: 监听字幕变化
    return await interceptNetflixSubtitleRequests();
    
  } catch (error) {
    log('从页面提取字幕失败:', error);
    return null;
  }
}

// 更新翻译进度
function updateTranslationProgress(current, total) {
  if (subtitlesOverlay) {
    const percentage = Math.round((current / total) * 100);
    subtitlesOverlay.innerHTML = `
      <div class="subtitle-loading">
        <div class="subtitle-loading-spinner"></div>
        <div class="subtitle-loading-text">正在翻译字幕... ${percentage}% (${current}/${total})</div>
      </div>
    `;
  }
}

// 使用备用模拟字幕数据
function useBackupSubtitles() {
  log('使用备用模拟字幕数据');

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
    subtitles = backupSubtitles;
    log(`成功设置${backupSubtitles.length}条备用字幕`);

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

    translatedSubtitles = translatedSubs;
    log(`成功设置${translatedSubs.length}条备用翻译字幕`);

    // 更新覆盖层显示
    updateSubtitleOverlay();

  } catch (error) {
    log('设置备用字幕时出错:', error);
    showSubtitleError('字幕加载失败');
  }
}

// 更新字幕覆盖层
function updateSubtitleOverlay() {
  if (!subtitlesOverlay) return;
  
  subtitlesOverlay.innerHTML = `
    <div class="netflix-subtitle-text netflix-subtitle-original" id="subtitle-original"></div>
    <div class="netflix-subtitle-text netflix-subtitle-translation" id="subtitle-translation"></div>
  `;
  
  log('字幕覆盖层已更新为显示状态');
}

// 根据时间更新字幕
function updateSubtitleByTime(currentTime) {
  if (!subtitles || subtitles.length === 0 || !isSubtitleMode) {
    return;
  }

  const PREVIEW_TIME = 0.2; // 提前0.2秒显示字幕
  let foundIndex = -1;

  // 查找当前时间点应该显示的字幕
  for (let i = 0; i < subtitles.length; i++) {
    const subtitle = subtitles[i];
    if (!subtitle || subtitle.start === undefined || subtitle.end === undefined) {
      continue;
    }

    if (currentTime >= subtitle.start - PREVIEW_TIME && currentTime <= subtitle.end) {
      foundIndex = i;
      break;
    }
  }

  // 更新字幕显示
  if (foundIndex !== -1 && foundIndex !== currentSubtitleIndex) {
    displaySubtitle(foundIndex);
  } else if (currentSubtitleIndex !== -1) {
    const currentSub = subtitles[currentSubtitleIndex];
    if (currentSub && currentSub.end !== undefined && currentTime > currentSub.end) {
      clearSubtitleDisplay();
    }
  }
}

// 显示指定索引的字幕
function displaySubtitle(index) {
  try {
    const originalElement = document.getElementById('subtitle-original');
    const translationElement = document.getElementById('subtitle-translation');
    
    if (!originalElement || !translationElement) {
      return;
    }

    if (!subtitles || index < 0 || index >= subtitles.length) {
      return;
    }

    currentSubtitleIndex = index;
    const currentSubtitle = subtitles[index];

    if (!currentSubtitle) {
      return;
    }

    // 显示原文字幕 - 使用简单分词
    const originalText = currentSubtitle.text || '';
    if (originalText) {
      originalElement.innerHTML = originalText
        .split(' ')
        .map(word => `<span class="subtitle-token">${word}</span>`)
        .join('<span class="subtitle-token space"> </span>');
    } else {
      originalElement.textContent = '';
    }

    // 显示翻译字幕
    if (translatedSubtitles && translatedSubtitles[index] && translatedSubtitles[index].translatedText) {
      translationElement.textContent = translatedSubtitles[index].translatedText;
    } else {
      translationElement.textContent = '翻译加载中...';
    }

    log(`显示字幕 #${index + 1}/${subtitles.length}: ${originalText.substring(0, 50)}${originalText.length > 50 ? '...' : ''}`);
  } catch (error) {
    log('显示字幕时出错:', error);
  }
}

// 清空字幕显示
function clearSubtitleDisplay() {
  const originalElement = document.getElementById('subtitle-original');
  const translationElement = document.getElementById('subtitle-translation');
  
  if (originalElement && translationElement) {
    originalElement.textContent = '';
    translationElement.textContent = '';
  }

  currentSubtitleIndex = -1;
}

// 显示字幕错误信息
function showSubtitleError(errorMessage) {
  if (!subtitlesOverlay) return;
  
  log('显示字幕错误:', errorMessage);
  
  subtitlesOverlay.innerHTML = `
    <div class="netflix-subtitle-text" style="color: #ff6b6b; text-align: center;">
      ⚠️ ${errorMessage || '字幕加载失败'}
    </div>
    <div class="netflix-subtitle-text" style="color: #ccc; font-size: 14px; text-align: center; margin-top: 8px;">
      请刷新页面重试
    </div>
  `;
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
  log('尝试拦截Netflix字幕请求...');
  
  // 这个函数将由字幕提取器的拦截机制处理
  // 返回null表示没有通过此方法获取到字幕
  return null;
}

// 立即执行初始化
(function() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    log('页面已加载，立即初始化Netflix双语字幕');
    initNetflixSubtitles();
  } else {
    log('页面正在加载中，等待load事件...');
    window.addEventListener('load', initNetflixSubtitles);
  }
})(); 