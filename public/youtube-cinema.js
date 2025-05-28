/**
 * Transor - YouTube影院模式
 * 为YouTube视频提供沉浸式双语字幕播放体验
 */

// 状态变量
let isCinemaMode = false;
let originalBodyStyles = {};
let subtitlesContainer = null;
let currentVideoId = '';
let subtitles = [];
let translatedSubtitles = [];
let currentSubtitleIndex = -1;
let subtitleUpdateInterval = null;

// 初始化
function initYouTubeCinema() {
  console.log('YouTube 影院模式初始化');
  
  // 检查是否是 YouTube 视频页面
  if (isYouTubeVideoPage()) {
    console.log('检测到 YouTube 视频页面');
    
    // 等待 YouTube 播放器加载完成
    waitForYouTubeControls().then(() => {
      // 添加影院模式按钮
      addCinemaButton();
      
      // 监听视频变化
      observeVideoChange();
    }).catch(error => {
      console.error('等待YouTube控制栏失败:', error);
    });
  }
}

// 判断是否是 YouTube 视频页面
function isYouTubeVideoPage() {
  return window.location.hostname.includes('youtube.com') && 
         window.location.pathname.includes('/watch');
}

// 切换影院模式
function toggleCinemaMode() {
  if (isCinemaMode) {
    exitCinemaMode();
  } else {
    enterCinemaMode();
  }
}

// 进入影院模式
function enterCinemaMode() {
  console.log('进入影院模式');
  
  // 获取当前视频ID
  currentVideoId = getYouTubeVideoId();
  if (!currentVideoId) {
    console.error('无法获取视频ID，无法进入影院模式');
    return;
  }

  // 暂停原始YouTube视频
  const originalVideo = document.querySelector('video');
  if (originalVideo) {
    console.log('暂停原始YouTube视频');
    originalVideo.pause();
  }
  
  // 保存原始状态
  saveOriginalState();
  
  // 创建影院模式UI
  createCinemaUI();
  
  // 应用影院模式CSS
  applyCinemaCSS();
  
  // 加载字幕
  loadSubtitles();
}

// 退出影院模式
function exitCinemaMode() {
  console.log('退出影院模式');
  
  // 清除字幕更新计时器
  if (subtitleUpdateInterval) {
    clearInterval(subtitleUpdateInterval);
    subtitleUpdateInterval = null;
  }
  
  // 移除影院模式容器
  const cinemaContainer = document.getElementById('cinema-mode-container');
  if (cinemaContainer) {
    document.body.removeChild(cinemaContainer);
  }
  
  // 恢复原始状态
  document.body.style.overflow = originalBodyStyles.overflow || '';
  
  // 修改状态
  isCinemaMode = false;
  subtitlesContainer = null;
  currentSubtitleIndex = -1;
}

// 添加影院模式按钮到YouTube播放器
function addCinemaButton() {
  // 检查按钮是否已存在
  if (document.getElementById('cinema-mode-btn')) {
    return;
  }
  
  // 寻找YouTube右侧控制栏容器
  const rightControlsContainer = document.querySelector('.ytp-right-controls');
  if (!rightControlsContainer) {
    console.error('未找到YouTube右侧控制栏，无法添加影院模式按钮');
    return;
  }
  
  // 获取用户界面语言设置，优先从Chrome存储中读取
  getUserLanguage().then(uiLanguage => {
    console.log('检测到用户界面语言:', uiLanguage);
    
    // 根据用户界面语言获取按钮提示文本
    const buttonTipText = getTranslatedText('cinema_mode_tip', uiLanguage);
    console.log('设置按钮提示文本:', buttonTipText);
    
    // 创建影院模式按钮
    const cinemaButton = document.createElement('button');
    cinemaButton.id = 'cinema-mode-btn';
    cinemaButton.className = 'ytp-button transor-cinema-btn';
    cinemaButton.title = buttonTipText;
    cinemaButton.setAttribute('data-tooltip-text', buttonTipText);
    cinemaButton.setAttribute('data-language', uiLanguage);
    
    // 获取扩展URL
    const logoUrl = chrome.runtime.getURL('logos/logo48.png');
    console.log('Logo URL:', logoUrl);
    
    // 使用Base64编码的图标作为备选方案
    const fallbackIcon = `
      <svg height="100%" viewBox="0 0 36 36" width="100%">
        <path d="M7,9 L29,9 C30.1045695,9 31,9.8954305 31,11 L31,25 C31,26.1045695 30.1045695,27 29,27 L7,27 C5.8954305,27 5,26.1045695 5,25 L5,11 C5,9.8954305 5.8954305,9 7,9 Z M28,13 L8,13 L8,23 L28,23 L28,13 Z" fill="white"></path>
        <path d="M12,17 L24,17 L24,19 L12,19 L12,17 Z" fill="white"></path>
      </svg>
    `;
    
    // 使用logo图片作为按钮图标，如果加载失败则使用备选图标
    cinemaButton.innerHTML = `
      <img src="${logoUrl}" alt="影院模式" style="width: 24px; height: 24px;" onerror="this.style.display='none'; this.parentNode.innerHTML='${fallbackIcon.replace(/'/g, "\\'")}'; ">
    `;
  
    // 创建自定义提示元素
    const tipElement = document.createElement('div');
    tipElement.id = 'transor-cinema-tip';
    tipElement.className = 'transor-cinema-tip';
    tipElement.textContent = buttonTipText;
    tipElement.style.display = 'none';
    document.body.appendChild(tipElement);
    
    // 添加鼠标悬停事件显示提示
    cinemaButton.addEventListener('mouseenter', () => {
      const rect = cinemaButton.getBoundingClientRect();
      tipElement.style.left = rect.left + 'px';
      tipElement.style.top = (rect.bottom + 10) + 'px';
      tipElement.style.display = 'block';
    });
    
    cinemaButton.addEventListener('mouseleave', () => {
      tipElement.style.display = 'none';
    });
    
    // 添加点击事件
    cinemaButton.addEventListener('click', toggleCinemaMode);
    
    // 查找trancy-youtube-button以便在其前面插入我们的按钮
    const trancyButton = rightControlsContainer.querySelector('.trancy-youtube-button');
    
    if (trancyButton) {
      // 在trancy按钮前插入我们的按钮
      rightControlsContainer.insertBefore(cinemaButton, trancyButton);
    } else {
      // 如果找不到trancy按钮，则插入到右侧控制栏的最后
      rightControlsContainer.appendChild(cinemaButton);
    }
    
    // 添加样式
    addCinemaStyles();
    
    console.log('影院模式按钮已添加到右侧控制栏');
  });
}

// 获取用户语言设置，优先从Chrome存储中读取，其次从localStorage读取
async function getUserLanguage() {
  // 首先尝试从Chrome存储读取
  try {
    return new Promise((resolve) => {
      chrome.storage.local.get('transor-ui-language', (result) => {
        if (chrome.runtime.lastError) {
          console.warn('从Chrome存储读取语言设置失败:', chrome.runtime.lastError);
          // 失败时从localStorage读取
          const localLang = localStorage.getItem('transor-ui-language') || 'zh-CN';
          console.log('从localStorage读取到语言设置:', localLang);
          resolve(localLang);
        } else if (result && result['transor-ui-language']) {
          console.log('从Chrome存储读取到语言设置:', result['transor-ui-language']);
          resolve(result['transor-ui-language']);
        } else {
          // Chrome存储中没有，从localStorage读取
          const localLang = localStorage.getItem('transor-ui-language') || 'zh-CN';
          console.log('Chrome存储中无语言设置，从localStorage读取:', localLang);
          resolve(localLang);
        }
      });
    });
  } catch (error) {
    console.warn('获取语言设置出错:', error);
    // 出错时从localStorage读取
    const localLang = localStorage.getItem('transor-ui-language') || 'zh-CN';
    console.log('出错回退到localStorage读取语言设置:', localLang);
    return localLang;
  }
}

// 根据语言获取翻译文本
function getTranslatedText(key, language) {
  console.log(`获取[${key}]的翻译，语言:`, language);
  
  const translations = {
    'cinema_mode_tip': {
      'zh-CN': '进入影院模式 (带双语字幕)',
      'en': 'Enter Cinema Mode (with Bilingual Subtitles)',
      'ja': 'シネマモードに入る (バイリンガル字幕付き)',
      'ko': '영화관 모드 시작 (이중 언어 자막 포함)'
    }
  };
  
  // 确保语言代码格式一致
  const normalizedLang = language ? language.trim() : 'zh-CN';
  
  // 检查此语言是否有对应翻译
  if (translations[key] && translations[key][normalizedLang]) {
    return translations[key][normalizedLang];
  }
  
  // 返回默认中文翻译
  console.log(`未找到语言[${normalizedLang}]的翻译，使用默认中文`);
  return translations[key]['zh-CN'];
}

// 更新影院模式按钮提示
async function updateCinemaButtonTip() {
  const cinemaButton = document.getElementById('cinema-mode-btn');
  const tipElement = document.getElementById('transor-cinema-tip');
  
  if (cinemaButton && tipElement) {
    // 获取最新的语言设置
    const uiLanguage = await getUserLanguage();
    console.log('更新提示，检测到语言:', uiLanguage);
    
    const currentLang = cinemaButton.getAttribute('data-language');
    console.log('按钮当前语言:', currentLang);
    
    // 只有当语言变更时才更新提示
    if (currentLang !== uiLanguage) {
      const buttonTipText = getTranslatedText('cinema_mode_tip', uiLanguage);
      
      cinemaButton.title = buttonTipText;
      cinemaButton.setAttribute('data-tooltip-text', buttonTipText);
      cinemaButton.setAttribute('data-language', uiLanguage);
      tipElement.textContent = buttonTipText;
      
      console.log('影院模式按钮提示已更新为:', buttonTipText);
    } else {
      console.log('语言未变更，无需更新提示');
    }
  }
}

// 添加影院模式CSS样式
function addCinemaStyles() {
  // 检查样式是否已存在
  if (document.getElementById('transor-cinema-styles')) {
    return;
  }
  
  // 创建样式元素
  const style = document.createElement('style');
  style.id = 'transor-cinema-styles';
  style.textContent = `
    /* 影院模式按钮样式 */
    .transor-cinema-btn {
      opacity: 0.9;
      transition: opacity 0.2s;
      width: 26px !important;
      height: 40px !important;
      background: transparent !important;
      border: none !important;
      cursor: pointer !important;
    }
    
    .transor-cinema-btn img {
      width: 24px !important;
      height: 24px !important;
      filter: brightness(1.8);
    }
    
    /* 自定义提示样式 */
    .transor-cinema-tip {
      position: fixed;
      z-index: 99999;
      background-color: rgba(28, 28, 28, 0.9);
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      white-space: nowrap;
      transform: translateX(-50%);
    }
    
    .transor-cinema-tip::after {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: transparent transparent rgba(28, 28, 28, 0.9) transparent;
    }
    
    /* 影院模式容器样式 */
    .cinema-mode {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #000;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    .cinema-mode-video-container {
      width: 80%;
      height: 65%;
      position: relative;
    }
    
    .cinema-mode-video-container iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #000;
    }
    
    .cinema-exit-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      font-size: 20px;
      cursor: pointer;
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .cinema-subtitles-container {
      width: 80%;
      max-height: 25%;
      color: white;
      background-color: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
      font-size: 18px;
      line-height: 1.5;
      overflow-y: auto;
    }
    
    .cinema-original-subtitle {
      margin-bottom: 8px;
      color: #fff;
      text-align: center;
    }
    
    .cinema-translated-subtitle {
      color: #ff5588;
      font-weight: 500;
      text-align: center;
    }
    
    .cinema-subtitle-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 5px 12px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    .cinema-subtitle-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    .loading-container {
      width: 100%;
      text-align: center;
    }
    
    .loading-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      margin-bottom: 10px;
    }
    
    .loading-progress {
      height: 100%;
      background: #ff5588;
      border-radius: 2px;
      transition: width 0.3s;
    }
    
    .loading-text {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
    }
  `;
  
  document.head.appendChild(style);
}

// 等待YouTube控制栏元素加载完成
function waitForYouTubeControls() {
  return new Promise((resolve, reject) => {
    // 尝试寻找YouTube控制栏容器
    const findControls = () => {
      const rightControlsContainer = document.querySelector('.ytp-right-controls');
      if (rightControlsContainer) {
        resolve(rightControlsContainer);
      } else if (document.readyState === 'complete') {
        // 如果已经完全加载且未找到，延迟重试几次
        let retryCount = 0;
        const maxRetries = 5;
        
        const retryFindControls = () => {
          const rightControls = document.querySelector('.ytp-right-controls');
          if (rightControls) {
            resolve(rightControls);
          } else {
            // 尝试寻找移动版布局的控制栏
            const mobileControls = document.querySelector('.ytp-chrome-bottom .ytp-chrome-controls');
            if (mobileControls) {
              resolve(mobileControls);
            } else if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(retryFindControls, 1000);
            } else {
              reject(new Error('未找到YouTube控制栏'));
            }
          }
        };
        
        setTimeout(retryFindControls, 1000);
      } else {
        // 页面还在加载中，等待完成
        window.addEventListener('load', findControls);
      }
    };
    
    findControls();
  });
}

// 获取YouTube视频ID
function getYouTubeVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v') || '';
}

// 监听视频变化
function observeVideoChange() {
  // 监听 URL 变化
  let lastUrl = window.location.href;
  
  // 定期检查 URL 变化
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('检测到 URL 变化，重新初始化影院模式');
      
      // 如果在影院模式中，先退出
      if (isCinemaMode) {
        exitCinemaMode();
      }
      
      // 检查是否是视频页面
      if (isYouTubeVideoPage()) {
        // 添加影院模式按钮
        setTimeout(() => {
          addCinemaButton();
        }, 1500);
      }
    }
  }, 1000);
  
  // 监听视频元素变化
  const observer = new MutationObserver(() => {
    if (isYouTubeVideoPage() && document.querySelector('video') && !document.getElementById('cinema-mode-btn')) {
      console.log('检测到视频元素变化，添加影院模式按钮');
      // 延迟添加按钮，确保右侧控制栏已加载
      setTimeout(() => {
        addCinemaButton();
      }, 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 创建影院模式UI元素
function createCinemaUI() {
  // 创建影院模式容器
  const cinemaContainer = document.createElement('div');
  cinemaContainer.id = 'cinema-mode-container';
  cinemaContainer.className = 'cinema-mode';
  
  // 获取当前视频
  const video = document.querySelector('video');
  if (!video) {
    console.error('影院模式无法找到视频元素');
    return;
  }
  
  // 创建视频容器
  const videoContainer = document.createElement('div');
  videoContainer.className = 'cinema-mode-video-container';
  
  // 使用YouTube嵌入式播放器
  const currentTime = video ? Math.floor(video.currentTime) : 0;
  videoContainer.innerHTML = `
    <iframe 
      id="cinema-youtube-iframe"
      width="100%" 
      height="100%" 
      src="https://www.youtube.com/embed/${currentVideoId}?autoplay=1&start=${currentTime}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}"
      frameborder="0" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
      allowfullscreen>
    </iframe>
  `;
  
  // 创建字幕容器
  const subtitlesElement = document.createElement('div');
  subtitlesElement.className = 'cinema-subtitles-container no-translate';
  
  // 创建加载进度UI
  subtitlesElement.innerHTML = `
    <div class="loading-container no-translate">
      <div class="loading-bar">
        <div class="loading-progress" style="width: 0%"></div>
      </div>
      <div class="loading-text">正在准备字幕...</div>
    </div>
  `;
  
  // 创建退出按钮
  const exitButton = document.createElement('button');
  exitButton.className = 'cinema-exit-btn';
  exitButton.innerHTML = '×';
  exitButton.addEventListener('click', exitCinemaMode);
  
  // 将元素添加到DOM
  cinemaContainer.appendChild(exitButton);
  cinemaContainer.appendChild(videoContainer);
  cinemaContainer.appendChild(subtitlesElement);
  document.body.appendChild(cinemaContainer);
  
  // 保存引用
  subtitlesContainer = subtitlesElement;
}

// 应用影院模式CSS
function applyCinemaCSS() {
  document.body.style.overflow = 'hidden';
  isCinemaMode = true;
}

// 保存原始状态
function saveOriginalState() {
  originalBodyStyles = {
    overflow: document.body.style.overflow
  };
}

// 加载字幕
async function loadSubtitles() {
  if (!currentVideoId) {
    console.error('未找到视频ID，无法加载字幕');
    showSubtitleError('未找到视频ID');
    return;
  }

  try {
    // 更新加载进度
    updateLoadingProgress(30, 'Loading...');
    
    // 直接获取字幕，不再通过background.js
    console.log(`正在获取视频ID为 ${currentVideoId} 的字幕...`);

    const webUrlResponse = await fetch(`https://www.youtube.com/watch?v=${currentVideoId}`);
    const html = await webUrlResponse.text();

    console.log('html', html)
    const ytInitialPlayerResponse = JSON.parse(html.split('ytInitialPlayerResponse = ')[1].split(`;var meta = document.createElement('meta')`)[0]);

    console.log('ytInitialPlayerResponse', ytInitialPlayerResponse)

    const defaultCaptionIndex = ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.audioTracks[0]?.defaultCaptionTrackIndex || 0;
    const requestUrl = ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks[defaultCaptionIndex]?.baseUrl;

    console.log('requestUrl', requestUrl)
    const response = await fetchYouTubeSubtitles(`${requestUrl}&fmt=json3`)
    // 检查响应结构并提取字幕数据
    console.log('字幕获取响应:', response);

    // 确保我们有一个有效的响应对象
    if (!response) {
      throw new Error('获取字幕时没有收到响应');
    }

    // 从响应中提取字幕数组
    let fetchedSubtitles;
    if (response.success && Array.isArray(response.subtitles)) {
      fetchedSubtitles = response.subtitles;
    } else if (Array.isArray(response)) {
      fetchedSubtitles = response;
    } else {
      throw new Error('无法从响应中获取字幕数据');
    }

    console.log('提取的字幕数据:', fetchedSubtitles);

    // 检查是否成功获取字幕
    if (!fetchedSubtitles || fetchedSubtitles.length === 0) {
      throw new Error('未找到字幕');
    }

    // 在保存字幕数据前进行智能合并处理
    const processedSubtitles = processSubtitlesSmartMerging(fetchedSubtitles);
    console.log(`字幕智能合并处理后，从${fetchedSubtitles.length}条优化为${processedSubtitles.length}条`);
    
    // 保存处理后的字幕数据到全局变量
    window.subtitles = processedSubtitles;
    subtitles = processedSubtitles; // 确保本地变量也更新
    
    // 检查第一条字幕的内容，判断是否为模拟数据
    const isMockData = processedSubtitles[0]?.text?.includes('模拟字幕');
    if (isMockData) {
      console.log('使用模拟字幕数据');
      // 对于模拟数据，我们可以直接构建翻译结果
      window.translatedSubtitles = processedSubtitles.map(sub => ({
        ...sub,
        translatedText: sub.text  // 模拟数据本身就是中文，无需翻译
      }));
      translatedSubtitles = window.translatedSubtitles; // 确保本地变量也更新
      
      // 更新加载进度
      updateLoadingProgress(100, '使用模拟字幕');
      
      // 显示字幕界面
      setTimeout(() => {
        console.log('显示模拟字幕UI...');
        showSubtitlesUI();
        
        // 初始化字幕更新
        initSubtitleTracking();
      }, 500);
      
      return; // 使用模拟数据时，不需要进行翻译步骤
    }
    
    console.log(`成功获取并处理${processedSubtitles.length}条字幕`);
    
    // 更新加载进度
    updateLoadingProgress(60, 'Loading...');
    
    try {
      // 使用translateSubtitles函数来翻译字幕
      await translateSubtitles(processedSubtitles);

      // 显示字幕界面
      console.log('字幕翻译完成，准备显示...');
      setTimeout(() => {
        console.log('显示字幕UI...');
        showSubtitlesUI();

        // 初始化字幕跟踪
        initSubtitleTracking();
      }, 500);
    } catch (translationError) {
      console.error('翻译字幕失败:', translationError);
      // 使用模拟翻译作为备选
      const texts = processedSubtitles.map(sub => sub.text);
      const translations = generateMockTranslations(texts);
      window.translatedSubtitles = processedSubtitles.map((sub, index) => {
      return {
        ...sub,
          translatedText: translations[index] || `[未翻译] ${sub.text}`
      };
    });
      translatedSubtitles = window.translatedSubtitles; // 确保本地变量也更新
    
    // 更新加载进度
      updateLoadingProgress(100, '使用模拟翻译完成');
    
      // 显示字幕UI
      showSubtitlesUI();
      initSubtitleTracking();
    }    
  } catch (error) {
    console.error('加载字幕失败:', error);
    updateLoadingProgress(100, '加载失败，使用备用字幕');

    // 直接使用备用字幕，而不是显示错误
    useBackupSubtitles();
  }
}

// 获取YouTube字幕
async function fetchYouTubeSubtitles(videoUrl) {
  try {
    // 官方API获取字幕
    try {
      const response = await fetch(videoUrl);
      if (response.ok) {
        const responseText = await response.text();
        const subtitles = parseYouTubeSubtitles(responseText);
        if (subtitles && subtitles.length > 0) {
          console.log('成功使用官方URL获取字幕，数量:', subtitles.length);
          return subtitles;
        }
      }
    } catch (error) {
      console.warn('使用官方API获取字幕失败:', error.message);
    }
  } catch (error) {
    console.error('获取YouTube字幕过程中出现错误:', error);
  }
}

// 解析YouTube字幕响应
function parseYouTubeSubtitles(responseText) {
  try {
    // 尝试解析为JSON
    try {
      const jsonData = JSON.parse(responseText);

      // 检查JSON3格式
      if (jsonData.events && Array.isArray(jsonData.events)) {
        return jsonData.events
          .filter(event => event.segs && Array.isArray(event.segs))
          .map(event => {
            const text = event.segs.map(seg => seg.utf8 || '').join(' ').trim()

            if (!text) return null;

            const start = event.tStartMs / 1000;
            const duration = event.dDurationMs / 1000;

            return {
              start: start,
              end: start + duration,
              text: text
            };
          })
          .filter(item => item !== null);
      }
    } catch (jsonError) {
      // 不是JSON格式，检查是否是XML
      if (responseText.includes('<?xml') || responseText.includes('<transcript>') || responseText.includes('<text')) {
        // 创建XML解析器
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(responseText, "text/xml");
        const textElements = xmlDoc.getElementsByTagName('text');

        if (!textElements || textElements.length === 0) {
          return [];
        }

        const subtitles = [];

        for (let i = 0; i < textElements.length; i++) {
          const element = textElements[i];
          const start = parseFloat(element.getAttribute('start') || '0');
          const dur = parseFloat(element.getAttribute('dur') || '0');
          let text = element.textContent || '';

          if (text) {
            // 移除XML格式字幕中的换行符
            text = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

            subtitles.push({
              start: start,
              end: start + dur,
              text: text
            });
          }
        }

        return subtitles;
      }
    }

    // 格式不支持
    throw new Error('不支持的字幕格式');
  } catch (error) {
    console.error('解析YouTube字幕失败:', error);
    return [];
  }
}

// 生成模拟翻译
function generateMockTranslations(texts) {
  const translationMap = {
    "Welcome to this video": "欢迎观看这个视频",
    "Today we're going to learn about translation": "今天我们将学习关于翻译的知识",
    "Let's get started with some examples": "让我们从一些例子开始",
    "First, we'll look at basic concepts": "首先，我们来看看基本概念",
    "Then we'll see how it works in practice": "然后，我们将看看它在实践中如何工作",
    "Thank you for watching this demonstration": "感谢您观看这个演示",
    "Subscribe for more content like this": "订阅以获取更多类似内容",
    "Leave your questions in the comments below": "请在下方评论区留下您的问题",
    "Hope this was helpful for you": "希望这对您有所帮助",
    "See you in the next video!": "下个视频再见！"
  };

  return texts.map(text => translationMap[text] || `[中文] ${text}`);
}

// 显示字幕UI
function showSubtitlesUI() {
  console.log('显示字幕UI...');

  if (!subtitlesContainer) {
    console.error('无法找到字幕容器');
    return;
  }

  // 清理并清空加载UI
  subtitlesContainer.innerHTML = '';

  // 创建字幕显示内容
  const subtitleContent = document.createElement('div');
  subtitleContent.className = 'subtitle-content';

  // 创建原文字幕元素
  const subtitleText = document.createElement('div');
  subtitleText.className = 'cinema-original-subtitle no-translate';
  subtitleText.id = 'subtitle-original-text';
  subtitleText.style.wordWrap = 'break-word';
  subtitleText.style.fontSize = '24px';
  subtitleText.style.lineHeight = '1.5';
  subtitleText.style.margin = '10px 0';
  // 初始化为空白，等待字幕显示
  subtitleText.textContent = '';

  // 创建翻译字幕元素
  const subtitleTranslation = document.createElement('div');
  subtitleTranslation.className = 'cinema-translated-subtitle no-translate';
  subtitleTranslation.id = 'subtitle-translation';
  subtitleTranslation.style.wordWrap = 'break-word';
  subtitleTranslation.style.fontSize = '20px';
  subtitleTranslation.style.lineHeight = '1.5';
  subtitleTranslation.style.margin = '10px 0';
  // 初始化为空白，等待字幕显示
  subtitleTranslation.textContent = '';

  // 添加字幕元素到容器
  subtitleContent.appendChild(subtitleText);
  subtitleContent.appendChild(subtitleTranslation);

  // 将所有元素添加到字幕容器
  subtitlesContainer.appendChild(subtitleContent);

  // 初始化并显示第一条字幕
  console.log('初始化第一条字幕...');
  displaySubtitle(0);
}

// 初始化字幕跟踪
function initSubtitleTracking() {
  console.log('初始化字幕跟踪，总字幕数:', subtitles ? subtitles.length : 0);

  // 检查字幕是否已加载
  if (!subtitles || subtitles.length === 0) {
    console.error('字幕未加载，无法初始化字幕跟踪');
    return;
  }

  // 清除之前的计时器
  if (subtitleUpdateInterval) {
    clearInterval(subtitleUpdateInterval);
    subtitleUpdateInterval = null;
  }
  
  // 获取影院模式中的YouTube iframe
  const iframe = document.getElementById('cinema-youtube-iframe');
  if (!iframe) {
    console.error('无法找到影院模式中的YouTube iframe');
    return;
  }

  // 初始化YouTube Player API
  // 确保iframe的src中包含enablejsapi=1参数
  if (!iframe.src.includes('enablejsapi=1')) {
    iframe.src = iframe.src.includes('?')
      ? iframe.src + '&enablejsapi=1'
      : iframe.src + '?enablejsapi=1';
  }

  // 记录iframe加载时间和初始视频时间
  iframe._loadTime = Date.now();
  iframe._lastUpdateTime = Date.now();
  iframe._lastVideoTime = 0;
  iframe._isPaused = false;
  iframe._playbackRate = 1.0;
  iframe._lastSubtitleIndex = -1;
  iframe._subtitleSwitchTime = 0;

  // 立即请求当前时间以显示第一条字幕
  if (iframe.contentWindow) {
    try {
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'getCurrentTime'
      }), '*');
      } catch (e) {
      console.warn('发送初始时间请求时出错:', e);
    }
  }

  // 设置更高频率的计时器更新字幕 - 每30毫秒请求一次当前时间
  subtitleUpdateInterval = setInterval(() => {
    try {
      if (iframe && iframe.contentWindow) {
        // 请求当前视频时间 - 通过postMessage直接询问
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'getCurrentTime'
        }), '*');

        // 同时也请求当前播放状态
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'getPlayerState'
        }), '*');
        }
      } catch (e) {
      console.warn('请求视频时间时出错:', e);
    }
  }, 30); // 降低到30毫秒，以获得更流畅的字幕体验

  // 添加一个清理方法，确保在iframe重载时能正确移除消息监听器
  if (window._ytMessageHandler) {
    window.removeEventListener('message', window._ytMessageHandler);
  }

  // 创建消息处理函数
  window._ytMessageHandler = function (event) {
    // 检查消息来源是否是我们的YouTube iframe
    if (iframe && event.source === iframe.contentWindow) {
      try {
        let data;
        // 尝试解析数据
        if (typeof event.data === 'string') {
          try {
            data = JSON.parse(event.data);
      } catch (e) {
            // 不是JSON格式，可能是其他消息
        return;
      }
    } else {
          data = event.data;
        }

        // 处理YouTube API的时间响应
        if (data.event === 'infoDelivery' && data.info && data.info.currentTime !== undefined) {
          const currentTime = data.info.currentTime;

          // 仅在时间变化超过一定阈值时更新（减少不必要的处理）
          const timeDiff = Math.abs(currentTime - (iframe._lastVideoTime || 0));
          if (timeDiff > 0.01) { // 10毫秒时间差阈值
            // 更新字幕
            updateSubtitleByTime(currentTime);
            iframe._lastVideoTime = currentTime;
          }
        }

        // 处理播放状态响应
        if (data.event === 'infoDelivery' && data.info && data.info.playerState !== undefined) {
          const playerState = data.info.playerState;
          const isPaused = playerState === 2; // 2 表示暂停状态

          // 如果播放状态改变，记录日志
          if (isPaused !== iframe._isPaused) {
            iframe._isPaused = isPaused;
            console.log(isPaused ? '视频已暂停' : '视频已开始播放');

            // 如果从暂停状态恢复播放，立即更新当前字幕
            if (!isPaused && iframe._lastVideoTime) {
              updateSubtitleByTime(iframe._lastVideoTime);
            }
          }
        }

        // 处理播放速率变化
        if (data.event === 'infoDelivery' && data.info && data.info.playbackRate !== undefined) {
          const newRate = data.info.playbackRate;
          if (newRate !== iframe._playbackRate) {
            iframe._playbackRate = newRate;
            console.log(`播放速率已更改为: ${newRate}x`);
          }
        }
      } catch (error) {
        console.error('处理YouTube消息时出错:', error);
      }
    }
  };

  // 监听来自iframe的消息
  window.addEventListener('message', window._ytMessageHandler);

  // 初始化前先发送一个准备就绪事件
  setTimeout(() => {
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'listening',
        id: 'transor-cinema'
      }), '*');

      // 然后立即请求当前时间和播放状态
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'getCurrentTime'
      }), '*');

      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'getPlayerState'
      }), '*');
    }
  }, 100); // 减少初始化等待时间

  // 2秒后检查字幕是否正常更新，如果没有，尝试重新初始化
  setTimeout(() => {
    if (currentSubtitleIndex === -1 && iframe._lastVideoTime > 2) {
      console.warn('字幕可能没有正确跟随视频，尝试重新初始化字幕跟踪');
      // 重新执行字幕更新
      updateSubtitleByTime(iframe._lastVideoTime);
    }
  }, 2000); // 减少等待时间，更快检测问题
}

// 根据时间更新字幕
function updateSubtitleByTime(currentTime) {
  // 检查必要条件
  if (!subtitles || subtitles.length === 0 || !isCinemaMode) {
      return;
    }

  // 调试信息 - 减少日志输出频率，每秒只输出一次
  const now = Date.now();
  const iframe = document.getElementById('cinema-youtube-iframe');
  if (!iframe) return;

  if (!iframe._lastLogTime || now - iframe._lastLogTime > 1000) {
    console.log(`当前时间: ${currentTime.toFixed(2)}秒, 查找匹配字幕...`);
    iframe._lastLogTime = now;
  }

  // 字幕提前显示时间 - 提前0.3秒显示字幕(减少提前量，提高精准度)
  const PREVIEW_TIME = 0.3;

  // 字幕切换防抖时间 - 避免频繁切换
  const DEBOUNCE_TIME = 0.05; // 50毫秒

  let foundIndex = -1;
  let closestStartTime = Infinity;
  let foundSubtitle = null;

  // 预排序字幕数组，如果尚未排序
  if (!iframe._subtitlesSorted) {
    // 按开始时间排序
    subtitles.sort((a, b) => (a.start || 0) - (b.start || 0));
    iframe._subtitlesSorted = true;
    console.log('字幕已按时间排序，优化查找效率');
  }

  // 二分查找最接近当前时间的字幕
  let bestMatchIndex = -1;

  // 优先查找在时间范围内的字幕
  for (let i = 0; i < subtitles.length; i++) {
    const subtitle = subtitles[i];
    if (!subtitle || subtitle.start === undefined || subtitle.end === undefined) {
      continue;
    }

    // 判断当前时间是否落入字幕的时间范围内（包含提前量）
    if (currentTime >= subtitle.start - PREVIEW_TIME && currentTime <= subtitle.end) {
      // 如果当前时间在多个字幕的范围内，优先选择开始时间更接近的
      if (foundIndex === -1 || Math.abs(subtitle.start - currentTime) < Math.abs(subtitles[foundIndex].start - currentTime)) {
      foundIndex = i;
        foundSubtitle = subtitle;
      }
    }

    // 记录最接近的即将到来的字幕
    if (subtitle.start > currentTime && subtitle.start < closestStartTime) {
      closestStartTime = subtitle.start;
      // 记录最接近的即将显示的字幕索引
      bestMatchIndex = i;
    }
  }

  // 如果没有找到当前范围内的字幕，但找到了即将显示的字幕
  if (foundIndex === -1 && bestMatchIndex !== -1) {
    const timeToNext = subtitles[bestMatchIndex].start - currentTime;

    // 如果非常接近下一个字幕（小于PREVIEW_TIME秒），提前显示
    if (timeToNext > 0 && timeToNext < PREVIEW_TIME) {
      foundIndex = bestMatchIndex;
      foundSubtitle = subtitles[bestMatchIndex];
      console.log(`提前${timeToNext.toFixed(2)}秒显示字幕 #${foundIndex + 1}`);
    }
  }

  // 检查是否找到了匹配的字幕
  if (foundIndex !== -1 && foundSubtitle) {
    // 检查是否需要更新显示
    if (foundIndex !== currentSubtitleIndex) {
      // 防抖：检查上次切换时间，避免频繁切换
      const lastSwitchTime = iframe._lastSubtitleSwitchTime || 0;
      if (now - lastSwitchTime > DEBOUNCE_TIME * 1000) {
        // 计算字幕延迟时间
        const delay = currentTime - foundSubtitle.start;
        const delayStatus = delay >= 0 ? `延迟=${delay.toFixed(2)}s` : `提前=${(-delay).toFixed(2)}s`;

        console.log(`显示字幕 #${foundIndex + 1}/${subtitles.length}: 起始=${foundSubtitle.start.toFixed(2)}s, 结束=${foundSubtitle.end.toFixed(2)}s, ${delayStatus}, 当前=${currentTime.toFixed(2)}s`);

        // 更新显示字幕
    displaySubtitle(foundIndex);

        // 更新最后切换时间
        iframe._lastSubtitleSwitchTime = now;
        iframe._lastSubtitleIndex = foundIndex;
      }
    }
  }
  // 如果当前有字幕显示，但当前时间超出了该字幕的结束时间，清除显示
  else if (currentSubtitleIndex !== -1) {
    const currentSub = subtitles[currentSubtitleIndex];

    // 当前时间超出结束时间，清除字幕
    if (currentSub && currentSub.end !== undefined && currentTime > currentSub.end) {
      console.log(`清除字幕 #${currentSubtitleIndex + 1}/${subtitles.length}: 当前时间=${currentTime.toFixed(2)}s, 结束时间=${currentSub.end.toFixed(2)}s`);
    clearSubtitleDisplay();

      // 记录下一个字幕的信息
      if (closestStartTime !== Infinity) {
        const timeToNext = closestStartTime - currentTime;
        console.log(`下一字幕在 ${timeToNext.toFixed(2)}秒后显示`);
      }
    }
  }

  // 预加载下一个字幕的翻译（如果有必要）
  if (bestMatchIndex !== -1 && bestMatchIndex !== currentSubtitleIndex) {
    const timeToNext = subtitles[bestMatchIndex].start - currentTime;
    if (timeToNext > 0 && timeToNext < PREVIEW_TIME &&
      (!translatedSubtitles[bestMatchIndex] || !translatedSubtitles[bestMatchIndex].translatedText)) {
      // 如果下一个字幕很快就要显示但还没有翻译，可以触发翻译预加载
      console.log(`预加载字幕 #${bestMatchIndex + 1} 的翻译，将在 ${timeToNext.toFixed(2)}秒后显示`);
    }
  }
}

// 显示指定索引的字幕
function displaySubtitle(index) {
  try {
    // 获取DOM元素
    const subtitleText = document.getElementById('subtitle-original-text');
    const subtitleTranslation = document.getElementById('subtitle-translation');
    
    if (!subtitleText || !subtitleTranslation) {
      console.error('字幕DOM元素不存在', {subtitleText, subtitleTranslation});
      return;
    }

    // 检查索引是否有效
    if (!subtitles || !Array.isArray(subtitles) || index < 0 || index >= subtitles.length) {
      console.error(`无效的字幕索引: ${index}, 总字幕数: ${subtitles ? subtitles.length : 0}`);
      subtitleText.textContent = '无法显示字幕';
      subtitleTranslation.textContent = '请检查视频是否有可用字幕';
      return;
    }

    // 更新当前索引
    currentSubtitleIndex = index;

    // 获取当前字幕
    const currentSubtitle = subtitles[index];

    if (!currentSubtitle) {
      console.error(`索引 ${index} 处的字幕为空`);
      subtitleText.textContent = '字幕数据错误';
      subtitleTranslation.textContent = '请尝试刷新页面';
      return;
    }

    // 清理并显示原文字幕
    let cleanText = '';
    if (currentSubtitle.text) {
      cleanText = cleanTextThoroughly(currentSubtitle.text);
      console.log('原始字幕文本:', currentSubtitle.text);
      console.log('清理后文本:', cleanText);
      
      // 使用多种方法设置文本，确保显示正确
      try {
        // 先尝试使用textContent
        subtitleText.innerHTML = cleanText;
        console.log('innerHTML', subtitleText, cleanText)
        // 如果textContent设置后仍为空，尝试innerText
        if (!subtitleText.innerHTML && cleanText) {
          console.log('textContent', cleanText)
          subtitleText.textContent = cleanText;
        }
        // 如果仍然为空，尝试innerHTML作为最后手段
        if (!subtitleText.innerHTML && !subtitleText.textContent && cleanText) {
          console.log('innerText', cleanText)
          subtitleText.innerText = cleanText;
        }
      } catch (e) {
        console.error('设置字幕文本时出错:', e);
        // 最后尝试使用innerHTML作为备选
        subtitleText.innerHTML = cleanText;
      }
      
      // 检查DOM是否已更新
      setTimeout(() => {
        console.log('DOM更新后的字幕文本:', subtitleText.textContent || subtitleText.innerText);
        if ((!subtitleText.textContent && !subtitleText.innerText) && cleanText) {
          console.warn('字幕文本未正确显示，强制再次尝试');
          // 强制刷新DOM
          const tempText = document.createElement('div');
          tempText.id = 'subtitle-original-text';
          tempText.className = 'cinema-original-subtitle no-translate';
          tempText.style.cssText = subtitleText.style.cssText;
          tempText.textContent = cleanText;
          
          if (subtitleText.parentNode) {
            subtitleText.parentNode.replaceChild(tempText, subtitleText);
          }
        }
      }, 20);
    } else {
      subtitleText.textContent = '[无原文]';
    }

    // 显示翻译文本（如果有）
    if (translatedSubtitles && translatedSubtitles[index] && translatedSubtitles[index].translatedText) {
      let cleanTranslation = cleanTextThoroughly(translatedSubtitles[index].translatedText);
      console.log('翻译字幕文本:', translatedSubtitles[index].translatedText);
      console.log('清理后翻译文本:', cleanTranslation);
      
      // 使用与原文相同的方法设置翻译文本
      try {
        // 先尝试使用textContent
        subtitleTranslation.textContent = cleanTranslation;
        // 如果textContent设置后仍为空，尝试innerText
        if (!subtitleTranslation.textContent && cleanTranslation) {
          subtitleTranslation.innerText = cleanTranslation;
        }
        // 如果仍然为空，尝试innerHTML作为最后手段
        if (!subtitleTranslation.textContent && !subtitleTranslation.innerText && cleanTranslation) {
          subtitleTranslation.innerHTML = cleanTranslation;
        }
      } catch (e) {
        console.error('设置翻译文本时出错:', e);
        // 最后尝试使用innerHTML作为备选
        subtitleTranslation.innerHTML = cleanTranslation;
      }
      
      // 检查DOM是否已更新
      setTimeout(() => {
        console.log('DOM更新后的翻译文本:', subtitleTranslation.textContent || subtitleTranslation.innerText);
        if ((!subtitleTranslation.textContent && !subtitleTranslation.innerText) && cleanTranslation) {
          console.warn('翻译文本未正确显示，强制再次尝试');
          // 强制刷新DOM
          const tempTranslation = document.createElement('div');
          tempTranslation.id = 'subtitle-translation';
          tempTranslation.className = 'cinema-translated-subtitle no-translate';
          tempTranslation.style.cssText = subtitleTranslation.style.cssText;
          tempTranslation.textContent = cleanTranslation;
          
          if (subtitleTranslation.parentNode) {
            subtitleTranslation.parentNode.replaceChild(tempTranslation, subtitleTranslation);
          }
        }
      }, 20);
      } else {
      // 如果没有翻译，显示加载中
      subtitleTranslation.textContent = '加载翻译中...';
    }

    console.log(`显示字幕 #${index + 1}/${subtitles.length}: ${cleanText?.substring(0, 50)}${cleanText?.length > 50 ? '...' : ''}`);
  } catch (error) {
    console.error('显示字幕时出错:', error);

    // 尝试恢复UI
    try {
      const subtitleText = document.getElementById('subtitle-original-text');
      const subtitleTranslation = document.getElementById('subtitle-translation');

      if (subtitleText) subtitleText.innerHTML = '显示字幕时出错';
      if (subtitleTranslation) subtitleTranslation.innerHTML = '请刷新页面重试';
    } catch (e) {
      console.error('无法恢复UI:', e);
    }
  }
}

// 清空字幕显示
function clearSubtitleDisplay() {
  const subtitleText = document.getElementById('subtitle-original-text');
  const subtitleTranslation = document.getElementById('subtitle-translation');
  
  if (subtitleText && subtitleTranslation) {
    try {
      // 获取父容器
      const subtitleContent = subtitleText.parentNode;
      if (subtitleContent) {
        // 创建空白字幕元素
        const emptySubtitleText = document.createElement('div');
        emptySubtitleText.className = 'cinema-original-subtitle no-translate';
        emptySubtitleText.id = 'subtitle-original-text';
        emptySubtitleText.style.wordWrap = 'break-word';
        emptySubtitleText.style.fontSize = '24px';
        emptySubtitleText.style.lineHeight = '1.5';
        emptySubtitleText.style.margin = '10px 0';

        const emptyTranslation = document.createElement('div');
        emptyTranslation.className = 'cinema-translated-subtitle no-translate';
        emptyTranslation.id = 'subtitle-translation';
        emptyTranslation.style.wordWrap = 'break-word';
        emptyTranslation.style.fontSize = '20px';
        emptyTranslation.style.lineHeight = '1.5';
        emptyTranslation.style.margin = '10px 0';

        // 安全地从DOM中移除旧元素
        // 首先检查元素是否确实是其父元素的子节点
        if (subtitleContent.contains(subtitleText)) {
          subtitleContent.removeChild(subtitleText);
        }

        if (subtitleContent.contains(subtitleTranslation)) {
          subtitleContent.removeChild(subtitleTranslation);
        }

        // 添加新的空元素
        subtitleContent.appendChild(emptySubtitleText);
        subtitleContent.appendChild(emptyTranslation);

        console.log('已清空字幕显示');
      }
    } catch (error) {
      console.error('清空字幕显示时出错:', error);
      // 备选方案：直接尝试清空内容
      if (subtitleText) subtitleText.textContent = '';
      if (subtitleTranslation) subtitleTranslation.textContent = '';
    }
  }

  currentSubtitleIndex = -1;
}

// 显示字幕错误信息
function showSubtitleError(errorMessage) {
  if (!subtitlesContainer) return;
  
  console.log('显示字幕错误:', errorMessage);
  
  subtitlesContainer.innerHTML = `
    <div class="subtitle-error-container no-translate">
      <div class="subtitle-error-icon">⚠️</div>
      <div class="subtitle-error-message">${errorMessage || '未知错误'}</div>
      <button id="btn-retry-subtitle" class="subtitle-retry-button">重试</button>
      <button id="btn-use-mock" class="subtitle-retry-button" style="margin-left: 10px; background-color: #555;">使用模拟数据</button>
    </div>
  `;
  
  // 添加事件监听器
  setTimeout(() => {
    const retryButton = document.getElementById('btn-retry-subtitle');
    const mockButton = document.getElementById('btn-use-mock');
    
    if (retryButton) {
      retryButton.addEventListener('click', loadSubtitles);
    }
    
    if (mockButton) {
      mockButton.addEventListener('click', useBackupSubtitles);
    }
  }, 0);
}

// 使用备用模拟字幕数据
function useBackupSubtitles() {
  console.log('使用备用模拟字幕数据');

  try {
    // 模拟字幕数据
    const backupSubtitles = [
      { start: 0, end: 5, text: "Welcome to this video" },
      { start: 5, end: 10, text: "Today we're going to learn about translation" },
      { start: 10, end: 15, text: "Let's get started with some examples" },
      { start: 15, end: 20, text: "First, we'll look at basic concepts" },
      { start: 20, end: 25, text: "Then we'll see how it works in practice" },
      { start: 25, end: 30, text: "The key to good translation is understanding context" },
      { start: 30, end: 35, text: "Always consider cultural differences too" },
      { start: 35, end: 40, text: "Machine translation is getting better every day" },
      { start: 40, end: 45, text: "But human translators still have advantages" },
      { start: 45, end: 50, text: "Thank you for watching this video!" }
    ];

    // 对模拟字幕进行智能合并处理
    const processedBackupSubtitles = processSubtitlesSmartMerging(backupSubtitles);

    // 设置全局字幕变量
    window.subtitles = processedBackupSubtitles;
    subtitles = processedBackupSubtitles;

    console.log(`成功设置${processedBackupSubtitles.length}条备用字幕`);

    // 模拟翻译数据
    const translatedSubs = processedBackupSubtitles.map(sub => {
      // 根据原始文本生成对应的翻译
      let translatedText = '';
      
      if (sub.text.includes("Welcome to this video")) {
        translatedText = "欢迎观看本视频";
      } else if (sub.text.includes("Today we're going to learn")) {
        translatedText = "今天我们将学习翻译相关知识";
      } else if (sub.text.includes("Let's get started")) {
        translatedText = "让我们从一些例子开始";
      } else if (sub.text.includes("First, we'll look")) {
        translatedText = "首先，我们来看看基本概念";
      } else if (sub.text.includes("Then we'll see")) {
        translatedText = "然后，我们将看看它在实践中如何工作";
      } else if (sub.text.includes("key to good translation")) {
        translatedText = "好的翻译的关键是理解上下文";
      } else if (sub.text.includes("cultural differences")) {
        translatedText = "也要始终考虑文化差异";
      } else if (sub.text.includes("Machine translation")) {
        translatedText = "机器翻译每天都在变得更好";
      } else if (sub.text.includes("human translators")) {
        translatedText = "但人类翻译仍然有优势";
      } else if (sub.text.includes("Thank you")) {
        translatedText = "感谢您观看本视频！";
      } else {
        translatedText = `[中文翻译] ${sub.text}`;
      }
      
      return {
        ...sub,
        translatedText: translatedText
      };
    });

    // 设置全局翻译字幕变量
    window.translatedSubtitles = translatedSubs;
    translatedSubtitles = translatedSubs;

    console.log(`成功设置${translatedSubs.length}条备用翻译字幕`);

    // 更新加载进度
    updateLoadingProgress(100, '已加载备用字幕');

    // 显示字幕UI
    setTimeout(() => {
      showSubtitlesUI();
    }, 100);

    // 初始化字幕跟踪
    setTimeout(() => {
      initSubtitleTracking();
    }, 200);

  } catch (error) {
    console.error('设置备用字幕时出错:', error);

    // 即使出错，也确保UI不会停留在加载状态
    if (subtitlesContainer) {
      subtitlesContainer.innerHTML = `
        <div style="color: white; text-align: center; padding: 20px;" class="no-translate">
          <p>无法加载字幕: ${error.message}</p>
          <p>请尝试刷新页面或退出影院模式后重试</p>
    </div>
  `;
    }
  }
}

// 更新加载进度的函数
function updateLoadingProgress(progress, message) {
  const loadingEl = document.querySelector('.loading-progress');
  if (loadingEl) {
    loadingEl.style.width = `${progress}%`;
  }

  const loadingTextEl = document.querySelector('.loading-text');
  if (loadingTextEl && message) {
    loadingTextEl.textContent = message;
  }
}

// 在页面加载时初始化
window.addEventListener('load', function () {
  chrome.storage.sync.get({ youtubeCinemaEnabled: true }, (res) => {
    if (res.youtubeCinemaEnabled !== false) {
      initYouTubeCinema();
    } else {
      console.log('YouTube 影院模式已在设置中禁用');
    }
  });

  // 监听设置变化，动态启用/停用
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.youtubeCinemaEnabled) {
      const enabled = changes.youtubeCinemaEnabled.newValue;
      if (enabled) {
        if (!isCinemaMode) {
          initYouTubeCinema();
        }
      } else {
        if (isCinemaMode) {
          exitCinemaMode();
        }
      }
    }
  });

  // 监听语言变化 - localStorage变化
  window.addEventListener('storage', function(event) {
    if (event.key === 'transor-ui-language') {
      console.log('localStorage语言变更检测:', event.newValue);
      // 语言设置已更改，更新提示文本
      updateCinemaButtonTip();
    }
  });
  
  // 监听来自扩展的消息
  try {
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      console.log('收到扩展消息:', message);
      
      if (message.action === 'language-changed') {
        // 接收到语言变更通知
        console.log('接收到语言变更通知:', message.language);
        updateCinemaButtonTip();
        // 发送响应
        if (sendResponse) {
          sendResponse({success: true, status: "正在更新语言设置"});
        }
      }
      
      // 专门处理设置语言的消息
      if (message.action === 'set-language') {
        console.log('接收到设置语言消息:', message.language);
        updateCinemaButtonTip();
        // 发送响应
        if (sendResponse) {
          sendResponse({success: true, status: "语言设置已更新"});
        }
      }
      
      return true; // 保持消息通道开放
    });
    
    // 主动请求当前语言设置
    setTimeout(() => {
      console.log('向扩展发送获取当前语言设置请求');
      try {
        chrome.runtime.sendMessage({
          action: 'get-language'
        }, function(response) {
          if (chrome.runtime.lastError) {
            console.warn('获取语言设置失败:', chrome.runtime.lastError);
          } else if (response && response.language) {
            console.log('收到当前语言设置:', response.language);
            updateCinemaButtonTip();
          }
        });
      } catch (error) {
        console.warn('发送获取语言请求失败:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.warn('无法设置扩展消息监听器:', error);
  }
});

// 翻译字幕
function translateSubtitles(subtitlesToTranslate) {
  console.log(`开始翻译字幕...`);
  updateLoadingProgress(60, 'Loading...');

  // 确保subtitlesToTranslate是数组
  if (!Array.isArray(subtitlesToTranslate)) {
    console.error('translateSubtitles: 传入的参数不是数组', subtitlesToTranslate);
    // 如果不是数组，尝试转换为数组或创建一个空数组
    subtitlesToTranslate = Array.isArray(subtitlesToTranslate) ? subtitlesToTranslate :
      (subtitlesToTranslate ? [subtitlesToTranslate] : []);
  }

  // 如果数组为空，返回空数组
  if (subtitlesToTranslate.length === 0) {
    console.warn('没有字幕需要翻译');
    return Promise.resolve([]);
  }

  console.log(`准备翻译${subtitlesToTranslate.length}条字幕...`);

  // 准备字幕文本数组 - 并清理所有文本中的特殊字符
  const textsToTranslate = subtitlesToTranslate.map(subtitle => {
    // 确保我们有有效的字幕文本
    let text = subtitle && subtitle.text ? subtitle.text : '';

    // 清理文本中的所有特殊字符：换行符、回车符、制表符等
    return cleanTextThoroughly(text);
  });

  console.log(`第一条字幕样本: "${textsToTranslate[0]}"`);

  // 准备模拟翻译（以防翻译失败时使用）
  const mockTranslations = generateMockTranslations(textsToTranslate);
  const mockSubs = subtitlesToTranslate.map((subtitle, index) => {
    return {
      ...subtitle, // 保留所有原始属性，包括start和end
      translatedText: mockTranslations[index] || `[未翻译] ${subtitle.text || ''}`
    };
  });

  // 设置模拟翻译以快速显示UI，后续会被真实翻译替换
  setTranslatedSubtitles(mockSubs);
  updateLoadingProgress(70, 'Loading...');

  return new Promise((resolve) => {
    try {
      // 创建单个翻译请求，包含所有字幕文本
      console.log('向后台发送批量翻译请求...');
      console.log(textsToTranslate, "textsToTranslate")
      chrome.runtime.sendMessage(
        {
          action: 'translateTexts',
          texts: textsToTranslate,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome运行时错误:', chrome.runtime.lastError);
            resolve(mockSubs); // 出错时使用模拟翻译
            return;
          }

          console.log('收到批量翻译响应:', response);

          if (response && response.success && Array.isArray(response.translations)) {
            // 如果成功获取翻译，将翻译结果与字幕对象合并并清理结果
            const translatedSubs = subtitlesToTranslate.map((subtitle, index) => {
              // 获取翻译结果，如果没有则使用备选
              let translation = response.translations[index] ||
                mockTranslations[index] ||
                subtitle.text || '';

              // 清理翻译结果中的所有特殊字符
              translation = cleanTextThoroughly(translation);
              console.log({
                ...subtitle, // 保留原始字幕的所有属性，包括start和end
                translatedText: translation
              }, "translatedTexttranslatedText")
              return {
                ...subtitle, // 保留原始字幕的所有属性，包括start和end
                translatedText: translation
              };
            });

            console.log('翻译成功，使用真实翻译');

            // 记录首尾字幕的时间信息，用于校验
            console.log(`字幕时间校验 - 第一条: ${translatedSubs[0]?.start}s - ${translatedSubs[0]?.end}s`);
            console.log(`字幕时间校验 - 最后一条: ${translatedSubs[translatedSubs.length - 1]?.start}s - ${translatedSubs[translatedSubs.length - 1]?.end}s`);

            setTranslatedSubtitles(translatedSubs);
            updateLoadingProgress(100, 'Success');

            // 更新当前显示的字幕，如果有的话
            if (currentSubtitleIndex >= 0 && currentSubtitleIndex < translatedSubs.length) {
              displaySubtitle(currentSubtitleIndex);
            }

            resolve(translatedSubs);
          } else {
            console.error('翻译请求失败:', response ? response.error : '无响应');

            // 使用之前准备的模拟翻译
            console.log('使用模拟翻译作为备选');
            updateLoadingProgress(100, '使用模拟翻译');

            resolve(mockSubs);
          }
        }
      );
    } catch (err) {
      console.error('翻译请求过程出错:', err);

      // 出错时使用模拟翻译
      updateLoadingProgress(100, '翻译出错，使用备用翻译');

      resolve(mockSubs);
        }
      });
    }
    
// 设置翻译后的字幕
function setTranslatedSubtitles(newTranslatedSubtitles) {
  console.log(`设置翻译字幕，总数: ${newTranslatedSubtitles ? newTranslatedSubtitles.length : 0}`);

  if (!newTranslatedSubtitles || !Array.isArray(newTranslatedSubtitles)) {
    console.error('无效的翻译字幕数据');
    return;
  }

  // 清理所有字幕中的特殊字符，但保留时间属性
  translatedSubtitles = newTranslatedSubtitles.map(subtitle => {
    if (!subtitle) return subtitle;

    // 创建新对象，避免修改原始对象
    const cleanedSubtitle = { ...subtitle };

    // 清理原文中的特殊字符
    if (cleanedSubtitle.text) {
      cleanedSubtitle.text = cleanTextThoroughly(cleanedSubtitle.text);
    }

    // 清理翻译文本中的特殊字符
    if (cleanedSubtitle.translatedText) {
      cleanedSubtitle.translatedText = cleanTextThoroughly(cleanedSubtitle.translatedText);
    }

    // 确保start和end时间属性被保留
    if (subtitle.start !== undefined) {
      cleanedSubtitle.start = subtitle.start;
    }

    if (subtitle.end !== undefined) {
      cleanedSubtitle.end = subtitle.end;
    }

    return cleanedSubtitle;
  });

  // 检查第一条和最后一条字幕的时间信息，确保时间信息正确保留
  if (translatedSubtitles.length > 0) {
    const first = translatedSubtitles[0];
    const last = translatedSubtitles[translatedSubtitles.length - 1];

    console.log(`字幕时间检查 - 第一条: ${first.start}s - ${first.end}s`);
    console.log(`字幕时间检查 - 最后一条: ${last.start}s - ${last.end}s`);
  }

  // 同时更新全局变量
  window.translatedSubtitles = translatedSubtitles;
}

// 彻底清理文本中的所有特殊字符和分隔符
function cleanTextThoroughly(text) {
  if (!text) return '';

  // 处理基本的可见字符和常见空白
  let cleanedText = text
    // 替换所有常见的换行、回车、制表符等
    .replace(/[\r\n\t\f\v]/g, ' ')
    // 替换特殊Unicode空白字符
    .replace(/[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ')
    // 替换翻译API可能引入的分隔符
    .replace(/@@@TRANSOR_SPLIT@@@/g, '')
    .replace(/@@@ transor_split @@@/g, '')
    .replace(/@@@ TRANSOR_SPLIT @@@/g, '')
    .replace(/transor_split/g, '')
    .replace(/TRANSOR_SPLIT/g, '')
    // 替换多个连续空格为单个空格
    .replace(/\s+/g, ' ')
    // 移除前后空格
    .trim();

  // 手动过滤出可打印字符
  let result = '';
  for (let i = 0; i < cleanedText.length; i++) {
    const charCode = cleanedText.charCodeAt(i);
    // 只保留基本可见字符和空格
    if (charCode > 31 && charCode < 127 || charCode > 160 || charCode === 32) {
      result += cleanedText[i];
    }
  }

  return result.trim();
}

// 新增: 智能合并字幕的函数
function processSubtitlesSmartMerging(subtitles) {
  if (!subtitles || !Array.isArray(subtitles) || subtitles.length === 0) {
    return subtitles;
  }

  console.log('开始智能处理字幕，原始字幕数量:', subtitles.length);
  
  // 按时间顺序排序字幕
  const sortedSubtitles = [...subtitles].sort((a, b) => a.start - b.start);
  
  // 处理后的字幕数组
  const processedSubtitles = [];
  
  // 定义合并条件参数 - 调整参数以提高匹配精度
  const MAX_TIME_GAP = 1.5;        // 最大时间间隔（秒）- 减小间隔，提高匹配精度
  const MAX_SENTENCE_LENGTH = 160; // 最大句子长度（字符）- 减小长度，防止合并过多
  const PUNCTUATION_END = ['.', '!', '?', '。', '！', '？']; // 仅保留主要句子结束标点符号
  const CONJUNCTION_WORDS = ['and', 'but', 'or', 'because']; // 减少连接词列表，只保留主要连接词
  
  // 辅助函数：检查文本是否以句子结束标点结尾
  const endsWithPunctuation = (text) => {
    if (!text || text.length === 0) return false;
    const lastChar = text.trim().slice(-1);
    return PUNCTUATION_END.includes(lastChar);
  };
  
  // 辅助函数：检查文本是否小写字母开头
  const startsWithLowerCase = (text) => {
    if (!text || text.length === 0) return false;
    const firstChar = text.trim()[0];
    return firstChar >= 'a' && firstChar <= 'z';
  };
  
  // 辅助函数：检查文本是否以连接词开头
  const startsWithConjunction = (text) => {
    if (!text) return false;
    const words = text.trim().toLowerCase().split(/\s+/);
    return words.length > 0 && CONJUNCTION_WORDS.includes(words[0]);
  };
  
  // 简化的不完整句子检测
  const isIncompletePhrase = (text) => {
    if (!text) return false;
    
    // 清理并获取最后一个单词
    const words = text.trim().toLowerCase().replace(/[,.!?]$/, '').split(/\s+/);
    if (words.length === 0) return false;
    
    const lastWord = words[words.length - 1];
    
    // 简化的不完整句子标记词列表
    const incompleteEndWords = [
      'in', 'on', 'at', 'to', 'a', 'an', 'the', 'and', 'but', 'or', 'if'
    ];
    
    return incompleteEndWords.includes(lastWord);
  };
  
  // 简化的合并判断函数 - 更保守的合并策略
  const shouldMerge = (current, next) => {
    if (!current || !next) return false;
    
    // 检查时间间隔 - 更严格的时间限制
    const timeGap = next.start - current.end;
    if (timeGap > MAX_TIME_GAP) return false;
    
    // 当前文本和下一条文本
    const currentText = current.text || '';
    const nextText = next.text || '';
    
    // 如果时间间隔很小（几乎无间隔），强制合并
    if (timeGap < 0.3) {
      // 但仍然检查合并后的总长度
      const mergedTextLength = (currentText + ' ' + nextText).length;
      if (mergedTextLength <= MAX_SENTENCE_LENGTH) {
        return true;
      }
    }
    
    // 检查是否为明显的不完整句子
    if (isIncompletePhrase(currentText)) {
      return true;
    }
    
    // 如果下一个字幕以小写字母开头或以连接词开头，很可能是前一句的延续
    if (startsWithLowerCase(nextText) || startsWithConjunction(nextText)) {
      // 但仍然需要检查合并后的总长度
      const mergedTextLength = (currentText + ' ' + nextText).length;
      if (mergedTextLength <= MAX_SENTENCE_LENGTH) {
        return true;
      }
    }
    
    // 如果当前字幕已经以句号等结束，通常不需要合并
    if (endsWithPunctuation(currentText)) {
      return false;
    }
    
    // 检查合并后长度
    const mergedTextLength = (currentText + ' ' + nextText).length;
    if (mergedTextLength > MAX_SENTENCE_LENGTH) {
      return false;
    }
    
    // 如果当前字幕不是完整句子且合并后长度合理，倾向于合并
    return !endsWithPunctuation(currentText);
  };
  
  // 保留字幕时间信息的简化版合并处理
  for (let i = 0; i < sortedSubtitles.length; i++) {
    const currentSubtitle = sortedSubtitles[i];
    
    // 清理当前字幕文本
    if (currentSubtitle.text) {
      currentSubtitle.text = cleanTextThoroughly(currentSubtitle.text);
    }
    
    // 如果是第一条字幕，直接添加
    if (i === 0) {
      processedSubtitles.push({...currentSubtitle});
      continue;
    }
    
    // 获取上一条处理过的字幕
    const lastProcessed = processedSubtitles[processedSubtitles.length - 1];
    
    // 判断是否应该合并
    if (shouldMerge(lastProcessed, currentSubtitle)) {
      // 合并文本
      lastProcessed.text = `${lastProcessed.text} ${currentSubtitle.text}`;
      // 更新结束时间为当前字幕的结束时间
      lastProcessed.end = currentSubtitle.end;
    } else {
      // 不合并，添加为新的字幕条目
      processedSubtitles.push({...currentSubtitle});
    }
  }
  
  console.log(`智能合并完成，从${subtitles.length}条优化为${processedSubtitles.length}条`);
  
  // 确保排序正确
  return processedSubtitles.sort((a, b) => a.start - b.start);
} 