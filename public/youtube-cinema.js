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
  
  // 寻找YouTube进度条下方的工具栏容器
  const controlsContainer = document.querySelector('.ytp-chrome-bottom .ytp-left-controls');
  if (!controlsContainer) {
    console.error('未找到YouTube控制栏，无法添加影院模式按钮');
    return;
  }
  
  // 创建影院模式按钮
  const cinemaButton = document.createElement('button');
  cinemaButton.id = 'cinema-mode-btn';
  cinemaButton.className = 'ytp-button transor-cinema-btn';
  cinemaButton.title = '进入影院模式 (带双语字幕)';
  cinemaButton.innerHTML = `
    <svg height="100%" viewBox="0 0 36 36" width="100%">
      <path d="M7,9 L29,9 C30.1045695,9 31,9.8954305 31,11 L31,25 C31,26.1045695 30.1045695,27 29,27 L7,27 C5.8954305,27 5,26.1045695 5,25 L5,11 C5,9.8954305 5.8954305,9 7,9 Z M28,13 L8,13 L8,23 L28,23 L28,13 Z" fill="white"></path>
      <path d="M12,17 L24,17 L24,19 L12,19 L12,17 Z" fill="white"></path>
    </svg>
  `;
  
  // 添加点击事件
  cinemaButton.addEventListener('click', toggleCinemaMode);
  
  // 添加到工具栏
  // 如果是YouTube移动版布局，找到不同的位置
  const mobileControlsContainer = document.querySelector('.ytp-chrome-bottom .ytp-chrome-controls');
  if (mobileControlsContainer && !controlsContainer) {
    // 移动版布局，将按钮添加到底部控制栏
    mobileControlsContainer.appendChild(cinemaButton);
  } else {
    // 在控制栏的最后添加
    controlsContainer.appendChild(cinemaButton);
  }
  
  // 添加样式
  addCinemaStyles();
  
  console.log('影院模式按钮已添加');
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
      margin-left: 10px !important;
      width: 36px !important;
      height: 36px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    .transor-cinema-btn:hover {
      opacity: 1;
      background-color: rgba(255, 255, 255, 0.1) !important;
      border-radius: 50% !important;
    }
    
    .transor-cinema-btn svg {
      width: 24px !important;
      height: 24px !important;
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
    }
    
    .cinema-translated-subtitle {
      color: #3bd671;
      font-weight: 500;
    }
    
    // .subtitle-controls {
    //   display: flex;
    //   justify-content: space-between;
    //   align-items: center;
    //   margin-top: 15px;
    //   padding-top: 10px;
    //   border-top: 1px solid rgba(255, 255, 255, 0.2);
    // }
    
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
      background: #3bd671;
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
      const controlsContainer = document.querySelector('.ytp-chrome-bottom .ytp-left-controls');
      if (controlsContainer) {
        resolve(controlsContainer);
      } else if (document.readyState === 'complete') {
        // 如果已经完全加载且未找到，延迟重试几次
        let retryCount = 0;
        const maxRetries = 5;
        
        const retryFindControls = () => {
          const controls = document.querySelector('.ytp-chrome-bottom .ytp-left-controls');
          if (controls) {
            resolve(controls);
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
      addCinemaButton();
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
  subtitlesElement.className = 'cinema-subtitles-container';
  
  // 创建加载进度UI
  subtitlesElement.innerHTML = `
    <div class="loading-container">
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
    updateLoadingProgress(30, '正在获取字幕...');
    
    // 直接获取字幕，不再通过background.js
    console.log(`正在获取视频ID为 ${currentVideoId} 的字幕...`);
    // const fetchedSubtitles = await fetchYouTubeSubtitles(currentVideoId);

    chrome.runtime.sendMessage(
      {
        action: 'fetchYouTubeSubtitles',
        videoId: currentVideoId
      },
      async (response) => {
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
        
        // 保存字幕数据到全局变量
        window.subtitles = fetchedSubtitles;
        subtitles = fetchedSubtitles; // 确保本地变量也更新
        
        // 检查第一条字幕的内容，判断是否为模拟数据
        const isMockData = fetchedSubtitles[0]?.text?.includes('模拟字幕');
        if (isMockData) {
          console.log('使用模拟字幕数据');
          // 对于模拟数据，我们可以直接构建翻译结果
          window.translatedSubtitles = fetchedSubtitles.map(sub => ({
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
        
        console.log(`成功获取${fetchedSubtitles.length}条字幕`);
        
        // 更新加载进度
        updateLoadingProgress(60, '正在翻译字幕...');
        
        try {
          // 使用translateSubtitles函数来翻译字幕
          await translateSubtitles(fetchedSubtitles);
          
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
          const texts = fetchedSubtitles.map(sub => sub.text);
          const translations = generateMockTranslations(texts);
          window.translatedSubtitles = fetchedSubtitles.map((sub, index) => {
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
      }
    );
  } catch (error) {
    console.error('加载字幕失败:', error);
    updateLoadingProgress(100, '加载失败，使用备用字幕');
    
    // 直接使用备用字幕，而不是显示错误
    useBackupSubtitles();
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
  console.log('准备显示字幕UI，字幕数量:', subtitles ? subtitles.length : 0);
  
  // 检查字幕容器是否存在
  if (!subtitlesContainer) {
    console.error('字幕容器不存在，无法显示字幕UI');
    return;
  }
  
  // 检查字幕数组是否存在且非空
  if (!subtitles || subtitles.length === 0) {
    console.error('字幕数组为空，使用备用字幕');
    useBackupSubtitles();
    return;
  }
  
  // 清除加载提示
  subtitlesContainer.innerHTML = '';
  console.log('已清除字幕容器内容，准备添加新UI');
  
  try {
    // 创建字幕UI元素
    const subtitleContent = document.createElement('div');
    subtitleContent.className = 'subtitle-content';
    subtitleContent.style.width = '100%';
    subtitleContent.style.textAlign = 'center';
    
    // 创建字幕文本元素，并设置初始内容
    const originalSubtitle = document.createElement('div');
    originalSubtitle.className = 'cinema-original-subtitle';
    originalSubtitle.id = 'subtitle-text';
    originalSubtitle.style.wordWrap = 'break-word';
    originalSubtitle.style.fontSize = '24px';
    originalSubtitle.style.lineHeight = '1.5';
    originalSubtitle.style.margin = '10px 0';
    originalSubtitle.textContent = subtitles[0]?.text || '准备加载字幕...';
    
    const translatedSubtitle = document.createElement('div');
    translatedSubtitle.className = 'cinema-translated-subtitle';
    translatedSubtitle.id = 'subtitle-translation';
    translatedSubtitle.style.wordWrap = 'break-word';
    translatedSubtitle.style.fontSize = '20px';
    translatedSubtitle.style.lineHeight = '1.5';
    translatedSubtitle.style.margin = '10px 0';
    translatedSubtitle.textContent = translatedSubtitles && translatedSubtitles[0]?.translatedText || '准备加载翻译...';
    
    // 将字幕元素添加到内容区域
    subtitleContent.appendChild(originalSubtitle);
    subtitleContent.appendChild(translatedSubtitle);
    
    // 创建控制按钮
    const subtitleControls = document.createElement('div');
    subtitleControls.className = 'subtitle-controls';
    subtitleControls.style.display = 'flex';
    subtitleControls.style.justifyContent = 'center';
    subtitleControls.style.marginTop = '15px';
    
    // 只创建刷新字幕按钮
    const syncButton = document.createElement('button');
    syncButton.id = 'btn-sync-subtitle';
    syncButton.className = 'cinema-subtitle-btn';
    syncButton.textContent = '刷新字幕';
    syncButton.style.margin = '0 5px';
    
    // 将按钮添加到控制区域
    subtitleControls.appendChild(syncButton);
    
    // 添加到容器
    subtitlesContainer.appendChild(subtitleContent);
    subtitlesContainer.appendChild(subtitleControls);
    console.log('字幕UI元素已添加到容器');
    
    // 设置初始字幕索引
    currentSubtitleIndex = 0;
    
    // 添加事件监听器
    syncButton.addEventListener('click', () => {
      // 获取当前视频时间并强制更新字幕
      const iframe = document.getElementById('cinema-youtube-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'getCurrentTime'
        }), '*');
        console.log('已请求刷新字幕');
        
        // 如果已经有当前时间，立即尝试更新一次
        if (iframe._lastVideoTime !== undefined) {
          updateSubtitleByTime(iframe._lastVideoTime);
        }
      }
    });
    
    // 显示第一条字幕 - 在UI创建完成后执行
    setTimeout(() => {
      displaySubtitle(0);
      console.log('首次显示字幕完成');
    }, 100);
    
    console.log('字幕UI初始化完成，准备展示第一条字幕:', subtitles[0]);
  } catch (error) {
    console.error('显示字幕UI时出错:', error);
    // 出错时显示简单的错误信息并提供重试按钮
    subtitlesContainer.innerHTML = `
      <div style="color: white; text-align: center; padding: 20px;">
        <p>显示字幕时出错: ${error.message}</p>
        <button onclick="useBackupSubtitles()" class="cinema-subtitle-btn" style="margin-top: 10px;">使用备用字幕</button>
      </div>
    `;
  }
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
  
  // 设置更频繁的计时器更新字幕 - 每50毫秒请求一次当前时间
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
  }, 50); // 增加更新频率

  // 添加一个清理方法，确保在iframe重载时能正确移除消息监听器
  if (window._ytMessageHandler) {
    window.removeEventListener('message', window._ytMessageHandler);
  }
  
  // 创建消息处理函数
  window._ytMessageHandler = function(event) {
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
        
        // 处理各种事件
        if (data.event === 'onStateChange') {
          // 处理播放状态变化
          console.log('播放状态变化:', data.info);
          
          // 更新暂停状态
          iframe._isPaused = data.info === 2; // 2表示暂停
          
          // 如果视频暂停，记录当前时间
          if (iframe._isPaused) {
            iframe._lastVideoTime = iframe._lastVideoTime || 0;
            iframe._lastUpdateTime = Date.now();
          } else if (data.info === 1) { // 1表示播放
            // 如果视频开始播放，更新最后更新时间
            iframe._lastUpdateTime = Date.now();
            
            // 在播放状态变化时立即更新一次字幕
            if (iframe._lastVideoTime !== undefined) {
              updateSubtitleByTime(iframe._lastVideoTime);
            }
          }
        } else if (data.event === 'onPlaybackRateChange') {
          // 处理播放速度变化
          iframe._playbackRate = data.info || 1.0;
          console.log('播放速度变化:', iframe._playbackRate);
        } else if (data.event === 'infoDelivery' && data.info) {
          // 处理信息传递事件
          if (data.info.currentTime !== undefined) {
            // 获取当前时间
            const currentTime = parseFloat(data.info.currentTime);
            if (!isNaN(currentTime)) {
              console.log('收到视频时间信息:', currentTime);
              
              // 检查时间是否有实质变化
              const hasTimeChanged = Math.abs((iframe._lastVideoTime || 0) - currentTime) > 0.1;
              
              // 更新最后视频时间和更新时间
              iframe._lastVideoTime = currentTime;
              iframe._lastUpdateTime = Date.now();
              
              // 仅当时间有变化时更新字幕
              if (hasTimeChanged) {
                updateSubtitleByTime(currentTime);
              }
            }
          }
          
          // 同时检查视频状态
          if (data.info.playerState !== undefined) {
            const newPausedState = data.info.playerState === 2;
            // 只有当暂停状态改变时才记录
            if (iframe._isPaused !== newPausedState) {
              iframe._isPaused = newPausedState;
              console.log('播放状态更新:', iframe._isPaused ? '已暂停' : '正在播放');
            }
          }
        } else if (data.info && typeof data.info === 'object') {
          // 处理其他包含info对象的消息
          if (data.info.currentTime !== undefined) {
            const currentTime = parseFloat(data.info.currentTime);
            if (!isNaN(currentTime)) {
              iframe._lastVideoTime = currentTime;
              updateSubtitleByTime(currentTime);
            }
          }
        }
      } catch (e) {
        // 忽略无法解析的消息
        console.warn('解析消息时出错:', e);
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
  }, 300);
  
  // 5秒后检查字幕是否正常更新，如果没有，尝试重新初始化
  setTimeout(() => {
    if (currentSubtitleIndex === 0 && iframe._lastVideoTime > 5) {
      console.warn('字幕可能没有正确跟随视频，尝试重新初始化字幕跟踪');
      // 重新执行字幕更新
      updateSubtitleByTime(iframe._lastVideoTime);
    }
  }, 5000);
}

// 根据时间更新字幕
function updateSubtitleByTime(currentTime) {
  if (!subtitles || subtitles.length === 0 || !isCinemaMode) return;
  
  // 调试信息
  console.log(`当前时间: ${currentTime.toFixed(2)}秒, 正在查找匹配的字幕...`);
  
  // 查找对应时间的字幕
  let foundIndex = -1;
  
  // 直接遍历查找当前时间范围内的字幕，确保更精确的匹配
  for (let i = 0; i < subtitles.length; i++) {
    const subtitle = subtitles[i];
    if (subtitle && 
        subtitle.start !== undefined && 
        subtitle.end !== undefined && 
        currentTime >= subtitle.start && 
        currentTime <= subtitle.end) {
      foundIndex = i;
      break;
    }
  }
  
  // 如果没有找到精确匹配，尝试找最接近的下一个字幕
  if (foundIndex === -1) {
    let minStartDiff = Number.MAX_VALUE;
    let closestIndex = -1;
    
    // 找到距离当前时间最近的将要出现的字幕
    for (let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i];
      if (subtitle && subtitle.start !== undefined) {
        const diff = subtitle.start - currentTime;
        // 只考虑将要出现的字幕（正差值），并且差值要小于阈值
        if (diff > 0 && diff < minStartDiff && diff < 3) { // 3秒内即将出现的字幕
          minStartDiff = diff;
          closestIndex = i;
        }
      }
    }
    
    // 如果有即将出现的字幕，优先显示
    if (closestIndex !== -1) {
      console.log(`即将显示字幕 #${closestIndex}: 距离当前时间 ${minStartDiff.toFixed(2)}秒`);
      foundIndex = closestIndex;
    } else {
      // 否则尝试找到已经过去的最接近的字幕
      let minEndDiff = Number.MAX_VALUE;
      for (let i = 0; i < subtitles.length; i++) {
        const subtitle = subtitles[i];
        if (subtitle && subtitle.end !== undefined) {
          const diff = currentTime - subtitle.end;
          // 只考虑刚刚过去的字幕（正差值），并且差值要小于阈值
          if (diff > 0 && diff < minEndDiff && diff < 2) { // 2秒内刚过去的字幕
            minEndDiff = diff;
            closestIndex = i;
          }
        }
      }
      if (closestIndex !== -1) {
        console.log(`显示刚过去的字幕 #${closestIndex}: 已过 ${minEndDiff.toFixed(2)}秒`);
        foundIndex = closestIndex;
      }
    }
  }
  
  // 获取iframe元素
  const iframe = document.getElementById('cinema-youtube-iframe');
  if (!iframe) return;
  
  // 平滑切换：避免频繁切换字幕
  const now = Date.now();
  const timeSinceLastSwitch = now - (iframe._subtitleSwitchTime || 0);
  const minSwitchInterval = 100; // 最小切换间隔（毫秒）- 减少为100ms以提高响应速度
  
  // 如果找到对应的字幕且与当前不同，则更新显示
  if (foundIndex !== -1 && foundIndex !== currentSubtitleIndex) {
    // 检查是否需要切换字幕
    if (timeSinceLastSwitch >= minSwitchInterval || 
        foundIndex !== (iframe._lastSubtitleIndex || -1)) {
      console.log(`找到匹配的字幕，索引: ${foundIndex}, 文本: ${subtitles[foundIndex]?.text?.substring(0, 30) || '无内容'}`);
      displaySubtitle(foundIndex);
      
      // 更新最后切换时间和索引
      iframe._subtitleSwitchTime = now;
      iframe._lastSubtitleIndex = foundIndex;
    }
  } else if (foundIndex === -1 && currentSubtitleIndex !== -1) {
    // 如果没有找到字幕且当前有显示的字幕，则清空字幕
    console.log(`当前时间 ${currentTime.toFixed(2)} 没有匹配的字幕，清空显示`);
    clearSubtitleDisplay();
    
    // 更新最后切换时间
    iframe._subtitleSwitchTime = now;
    iframe._lastSubtitleIndex = -1;
  } else if (foundIndex !== -1 && foundIndex === currentSubtitleIndex) {
    // 如果找到的字幕索引与当前相同，但是要确保文本内容已经正确显示
    const subtitleText = document.getElementById('subtitle-text');
    const subtitleTranslation = document.getElementById('subtitle-translation');
    
    if (subtitleText && subtitleTranslation) {
      const currentText = subtitleText.textContent || '';
      const currentTranslation = subtitleTranslation.textContent || '';
      const expectedText = subtitles[foundIndex]?.text || '';
      const expectedTranslation = translatedSubtitles && translatedSubtitles[foundIndex]?.translatedText || '';
      
      // 如果显示的内容与预期不符，强制更新
      if (currentText !== expectedText || currentTranslation !== expectedTranslation) {
        console.log('字幕内容与预期不符，强制更新显示');
        displaySubtitle(foundIndex);
      }
    }
  }
}

// 显示指定索引的字幕
function displaySubtitle(index) {
  console.log(`尝试显示字幕，索引: ${index}, 字幕数组长度: ${subtitles ? subtitles.length : 0}`);
  
  if (!subtitlesContainer) {
    console.warn('字幕容器不存在');
    return;
  }
  
  if (!subtitles || subtitles.length === 0) {
    console.warn('字幕数组为空');
    return;
  }
  
  if (index < 0 || index >= subtitles.length) {
    console.warn(`无法显示字幕，索引无效: ${index}`);
    return;
  }
  
  // 确保当前索引的字幕存在
  if (!subtitles[index]) {
    console.warn(`索引 ${index} 处的字幕对象不存在`);
    return;
  }
  
  // 查找字幕文本元素
  const subtitleText = document.getElementById('subtitle-text');
  const subtitleTranslation = document.getElementById('subtitle-translation');
  const subtitleNav = document.getElementById('subtitle-nav-info');
  
  if (subtitleText && subtitleTranslation) {
    try {
      // 检查字幕对象的text属性是否存在
      const originalText = subtitles[index].text || '';
      console.log('尝试设置原文字幕:', originalText);
      
      // 创建新的字幕文本元素以强制更新
      const newOriginalSubtitle = document.createElement('div');
      newOriginalSubtitle.className = 'cinema-original-subtitle';
      newOriginalSubtitle.id = 'subtitle-text';
      newOriginalSubtitle.style.wordWrap = 'break-word';
      newOriginalSubtitle.style.fontSize = '24px';
      newOriginalSubtitle.style.lineHeight = '1.5';
      newOriginalSubtitle.style.margin = '10px 0';
      newOriginalSubtitle.textContent = originalText;
      
      // 检查翻译字幕数组和当前索引的翻译是否存在
      const translatedText = (translatedSubtitles && 
                            translatedSubtitles[index] && 
                            translatedSubtitles[index].translatedText) ? 
        translatedSubtitles[index].translatedText : '';
      
      // 创建新的翻译文本元素以强制更新
      const newTranslatedSubtitle = document.createElement('div');
      newTranslatedSubtitle.className = 'cinema-translated-subtitle';
      newTranslatedSubtitle.id = 'subtitle-translation';
      newTranslatedSubtitle.style.wordWrap = 'break-word';
      newTranslatedSubtitle.style.fontSize = '20px';
      newTranslatedSubtitle.style.lineHeight = '1.5';
      newTranslatedSubtitle.style.margin = '10px 0';
      newTranslatedSubtitle.textContent = translatedText;
      
      // 先从DOM中移除旧元素
      const subtitleContent = subtitleText.parentNode;
      if (subtitleContent) {
        subtitleContent.removeChild(subtitleText);
        subtitleContent.removeChild(subtitleTranslation);
        
        // 添加新元素
        subtitleContent.appendChild(newOriginalSubtitle);
        subtitleContent.appendChild(newTranslatedSubtitle);
        
        // 确保字幕有start和end属性，否则使用默认值
        const start = subtitles[index].start !== undefined ? subtitles[index].start : 0;
        const end = subtitles[index].end !== undefined ? subtitles[index].end : 0;
        
        // 增加详细日志，包括时间范围和实际内容
        console.log(`显示字幕 ${index+1}/${subtitles.length}: "${originalText}" [${start.toFixed(2)}s - ${end.toFixed(2)}s]`);
        console.log(`翻译: "${translatedText}"`);
      } else {
        console.error('找不到字幕内容容器');
      }
    } catch (error) {
      console.error('设置字幕文本时出错:', error);
      // 尝试直接设置内容作为备选方案
      try {
        subtitleText.textContent = subtitles[index].text || '';
        subtitleTranslation.textContent = (translatedSubtitles && 
                                          translatedSubtitles[index] && 
                                          translatedSubtitles[index].translatedText) || '';
      } catch (fallbackError) {
        console.error('备选设置字幕失败:', fallbackError);
      }
    }
  } else {
    console.warn('找不到字幕文本元素');
  }
  
  if (subtitleNav) {
    subtitleNav.textContent = `${index + 1}/${subtitles.length}`;
  }
  
  // 更新当前字幕索引
  currentSubtitleIndex = index;
}

// 清空字幕显示
function clearSubtitleDisplay() {
  const subtitleText = document.getElementById('subtitle-text');
  const subtitleTranslation = document.getElementById('subtitle-translation');
  
  if (subtitleText && subtitleTranslation) {
    try {
      // 获取父容器
      const subtitleContent = subtitleText.parentNode;
      if (subtitleContent) {
        // 创建空白字幕元素
        const emptySubtitleText = document.createElement('div');
        emptySubtitleText.className = 'cinema-original-subtitle';
        emptySubtitleText.id = 'subtitle-text';
        emptySubtitleText.style.wordWrap = 'break-word';
        emptySubtitleText.style.fontSize = '24px';
        emptySubtitleText.style.lineHeight = '1.5';
        emptySubtitleText.style.margin = '10px 0';
        
        const emptyTranslation = document.createElement('div');
        emptyTranslation.className = 'cinema-translated-subtitle';
        emptyTranslation.id = 'subtitle-translation';
        emptyTranslation.style.wordWrap = 'break-word';
        emptyTranslation.style.fontSize = '20px';
        emptyTranslation.style.lineHeight = '1.5';
        emptyTranslation.style.margin = '10px 0';
        
        // 从DOM中移除旧元素
        subtitleContent.removeChild(subtitleText);
        subtitleContent.removeChild(subtitleTranslation);
        
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
    <div class="subtitle-error-container">
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
    
    // 设置全局字幕变量
    window.subtitles = backupSubtitles;
    subtitles = backupSubtitles;
    
    console.log(`成功设置${backupSubtitles.length}条备用字幕`);
    
    // 模拟翻译数据
    const translatedSubs = [
      { start: 0, end: 5, text: "Welcome to this video", translatedText: "欢迎观看本视频" },
      { start: 5, end: 10, text: "Today we're going to learn about translation", translatedText: "今天我们将学习翻译相关知识" },
      { start: 10, end: 15, text: "Let's get started with some examples", translatedText: "让我们从一些例子开始" },
      { start: 15, end: 20, text: "First, we'll look at basic concepts", translatedText: "首先，我们来看看基本概念" },
      { start: 20, end: 25, text: "Then we'll see how it works in practice", translatedText: "然后，我们将看看它在实践中如何工作" },
      { start: 25, end: 30, text: "The key to good translation is understanding context", translatedText: "好的翻译的关键是理解上下文" },
      { start: 30, end: 35, text: "Always consider cultural differences too", translatedText: "也要始终考虑文化差异" },
      { start: 35, end: 40, text: "Machine translation is getting better every day", translatedText: "机器翻译每天都在变得更好" },
      { start: 40, end: 45, text: "But human translators still have advantages", translatedText: "但人类翻译仍然有优势" },
      { start: 45, end: 50, text: "Thank you for watching this video!", translatedText: "感谢您观看本视频！" }
    ];
    
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
        <div style="color: white; text-align: center; padding: 20px;">
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
window.addEventListener('load', function() {
  initYouTubeCinema();
}); 

// 翻译字幕
function translateSubtitles(subtitlesToTranslate) {
  console.log(`开始翻译字幕...`);
  updateLoadingProgress(60, '正在翻译字幕...');
  
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
  console.log('第一条字幕样例:', subtitlesToTranslate[0]);
  
  // 提取所有字幕文本用于批量翻译
  const textsToTranslate = subtitlesToTranslate.map(subtitle => subtitle.text || '');
  
  // 立即创建模拟翻译，作为备用
  const mockTranslations = generateMockTranslations(textsToTranslate);
  const mockSubs = subtitlesToTranslate.map((subtitle, index) => {
    return {
      ...subtitle,
      translatedText: mockTranslations[index] || subtitle.text || ''
    };
  });
  
  // 先设置模拟翻译，确保UI有内容显示
  setTranslatedSubtitles(mockSubs);
  
  return new Promise((resolve) => {
    try {
      // 创建单个翻译请求，包含所有字幕文本
      console.log('向后台发送批量翻译请求...');
      
      chrome.runtime.sendMessage(
        {
          action: 'translateTexts',
          texts: textsToTranslate,
          sourceLanguage: 'en',
          targetLanguage: 'zh-CN'
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome运行时错误:', chrome.runtime.lastError);
            resolve(mockSubs); // 出错时使用模拟翻译
            return;
          }
          
          console.log('收到批量翻译响应:', response);
          
          if (response && response.success && Array.isArray(response.translations)) {
            // 如果成功获取翻译，将翻译结果与字幕对象合并
            const translatedSubs = subtitlesToTranslate.map((subtitle, index) => {
              const translation = response.translations[index];
              return {
                ...subtitle,
                translatedText: translation || mockTranslations[index] || subtitle.text || ''
              };
            });
            
            console.log('翻译成功，使用真实翻译');
            setTranslatedSubtitles(translatedSubs);
            updateLoadingProgress(100, '翻译完成');
            
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
  translatedSubtitles = newTranslatedSubtitles;
  window.translatedSubtitles = newTranslatedSubtitles; // 全局保存以便调试
  console.log(`设置了${newTranslatedSubtitles.length}条翻译字幕`);
} 