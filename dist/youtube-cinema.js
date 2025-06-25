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

// 视频字幕翻译功能状态变量
let isTransorSubtitleEnabled = true; // 默认启用
let videoSubtitleContainer = null;
let videoSubtitleUpdateInterval = null;
let videoSubtitles = [];
let videoTranslatedSubtitles = [];
let currentVideoSubtitleIndex = -1;
let subtitleDisplayMode = '双语字幕'; // 默认显示模式
let subtitleStyle = '默认'; // 默认字幕样式
let lastVideoId = ''; // 记录上一次加载的视频ID

// 尝试从本地存储中加载字幕开关状态
try {
  const savedSubtitleEnabled = localStorage.getItem('transor-subtitle-enabled');
  if (savedSubtitleEnabled !== null) {
    isTransorSubtitleEnabled = savedSubtitleEnabled === 'true';
    console.log('从存储加载字幕开关状态:', isTransorSubtitleEnabled);
  }
} catch (e) {
  console.error('加载字幕开关状态失败:', e);
}

// 新增：字幕时间映射变量，用于优化字幕查找和匹配
let subtitleTimeMap = new Map();

// 初始化
function initYouTubeCinema() {
  console.log('YouTube 影院模式初始化');
  
  // 尝试加载用户字幕显示模式设置
  try {
    const savedMode = localStorage.getItem('transor-subtitle-display-mode');
    if (savedMode) {
      subtitleDisplayMode = savedMode;
      console.log('从存储加载字幕显示模式:', savedMode);
    }
    
    const savedStyle = localStorage.getItem('transor-subtitle-style');
    if (savedStyle) {
      subtitleStyle = savedStyle;
      console.log('从存储加载字幕样式:', savedStyle);
    }
  } catch (e) {
    console.error('加载字幕设置失败:', e);
  }
  
  // 检查是否是 YouTube 视频页面 - 使用增强版检测
  if (isEnhancedYouTubeVideoPage()) {
    console.log('检测到 YouTube 视频页面');
    
    // 等待 YouTube 播放器加载完成
    waitForYouTubeControls().then(() => {
      // 添加影院模式按钮
      addCinemaButton();
      
      // 监听视频变化
      observeVideoChange();
      
      // 初始化视频字幕翻译功能
      initVideoSubtitleTranslation();
    }).catch(error => {
      console.error('等待YouTube控制栏失败:', error);
      
      // 即使等待失败，也尝试通过轮询方式加载按钮
      console.log('尝试通过轮询方式添加按钮...');
      startButtonPoller();
      
      // 尝试初始化其他功能
      setTimeout(() => {
        observeVideoChange();
        initVideoSubtitleTranslation();
      }, 2000);
    });
  } else {
    // 不是视频页面，可能是主页或其他页面
    console.log('当前不是视频页面，仅设置监听器');
    
    // 仍然监听URL变化，以便在导航到视频页面时初始化
    setTimeout(() => {
      observeVideoChange();
    }, 1000);
  }
  
  // 页面加载完成后再次检查（双重保障）
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => {
      if (isEnhancedYouTubeVideoPage() && !document.getElementById('cinema-mode-btn')) {
        console.log('页面加载完成后再次检查，尝试加载影院模式');
        setTimeout(() => {
          addCinemaButton();
          initVideoSubtitleTranslation();
        }, 1500);
      }
    });
  }
}

// 判断是否是 YouTube 视频页面
function isYouTubeVideoPage() {
  return window.location.hostname.includes('youtube.com') && 
         window.location.pathname.includes('/watch');
}

// 增强版判断视频页面函数 - 增加兼容性
function isEnhancedYouTubeVideoPage() {
  const isStandardVideoPage = window.location.hostname.includes('youtube.com') && 
                              window.location.pathname.includes('/watch');
  const hasVideoElement = document.querySelector('video') !== null;
  const hasVideoId = getYouTubeVideoId() !== '';
  
  return isStandardVideoPage && (hasVideoElement || hasVideoId);
}

// 切换影院模式
function toggleCinemaMode() {
  if (isCinemaMode) {
    exitCinemaMode();
  } else {
    // 显示字幕设置弹窗，而不是直接进入影院模式
    showSubtitleOptionsPopup();
  }
}

// 显示字幕选项弹窗
function showSubtitleOptionsPopup() {
  console.log('显示字幕选项弹窗');
  
  // 检查弹窗是否已存在
  if (document.getElementById('subtitle-options-popup')) {
    return;
  }
  
  // 获取影院模式按钮位置，用于定位弹窗
  const cinemaButton = document.getElementById('cinema-mode-btn');
  if (!cinemaButton) {
    console.error('未找到影院模式按钮，无法定位弹窗');
    return;
  }
  
  // 获取按钮位置用于弹窗定位 - 实际使用在positionPopup函数内
  // const buttonRect = cinemaButton.getBoundingClientRect(); // 暂时注释掉未使用的变量
  
  // 创建弹窗容器
  const popupContainer = document.createElement('div');
  popupContainer.id = 'subtitle-options-popup';
  popupContainer.className = 'subtitle-options-popup';
  
  // 创建弹窗内容
  popupContainer.innerHTML = `
    <div class="subtitle-options-content no-translate">
      <div class="subtitle-options-body no-translate">
        
        <div class="subtitle-option-item no-translate">
          <div class="subtitle-option-icon no-translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 3H3C1.9 3 1 3.9 1 5V19C1 20.1 1.9 21 3 21H21C22.1 21 23 20.1 23 19V5C23 3.9 22.1 3 21 3ZM21 19H3V5H21V19ZM6 8H18V10H6V8ZM6 11H18V13H6V11ZM6 14H14V16H6V14Z" fill="rgba(255, 255, 255, 0.8)"/>
            </svg>
          </div>
          <div class="subtitle-option-label no-translate">字幕显示</div>
          <div class="subtitle-option-value no-translate">
            <select id="subtitle-display-select" class="subtitle-select no-translate">
              <option value="双语字幕" selected class="no-translate">双语字幕</option>
              <option value="仅原文" class="no-translate">仅原文</option>
              <option value="仅译文" class="no-translate">仅译文</option>
            </select>
          </div>
        </div>
        <div class="subtitle-option-item no-translate">
          <div class="subtitle-option-icon no-translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.5 4V7H21.5V4H2.5ZM2.5 19H6.5V10H2.5V19ZM9.5 19H15.5V10H9.5V19ZM18.5 19H21.5V10H18.5V19Z" fill="rgba(255, 255, 255, 0.8)"/>
            </svg>
          </div>
          <div class="subtitle-option-label no-translate">字幕样式</div>
          <div class="subtitle-option-value no-translate">
            <select id="subtitle-style-select" class="subtitle-select no-translate">
              <option value="默认" selected class="no-translate">默认</option>
              <option value="半透明" class="no-translate">半透明</option>
              <option value="浅色模式" class="no-translate">浅色模式</option>
              <option value="无背景" class="no-translate">无背景</option>
              <option value="醒目" class="no-translate">醒目</option>
            </select>
          </div>
        </div>
        <div class="subtitle-option-item no-translate">
          <div class="subtitle-option-icon no-translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4H4C2.89 4 2 4.89 2 6V18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 10H4V6H20V10Z" fill="rgba(255, 255, 255, 0.8)"/>
            </svg>
          </div>
          <div class="subtitle-option-label no-translate">Transor 字幕</div>
          <div class="subtitle-option-toggle no-translate">
            <label class="subtitle-switch no-translate">
              <input type="checkbox" id="transor-subtitle-toggle" checked>
              <span class="subtitle-slider no-translate"></span>
            </label>
          </div>
        </div>
        <div class="subtitle-option-item enter-mode-item no-translate" id="enter-cinema-mode-btn">
          <div class="subtitle-option-icon no-translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 3H3C1.9 3 1 3.9 1 5V17C1 18.1 1.9 19 3 19H8V21H16V19H21C22.1 19 23 18.1 23 17V5C23 3.9 22.1 3 21 3ZM21 17H3V5H21V17ZM16 11L9 15V7L16 11Z" fill="rgba(255, 255, 255, 0.8)"/>
            </svg>
          </div>
          <div class="subtitle-option-label no-translate">进入专注模式</div>
          <div class="subtitle-option-arrow no-translate">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="rgba(255, 255, 255, 0.8)"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 添加到页面
  document.body.appendChild(popupContainer);
  
  // 获取弹窗内容元素
  const popupContent = popupContainer.querySelector('.subtitle-options-content');
  
  // 定位函数 - 提取为单独函数以便后续调用
  function positionPopup() {
    if (!popupContent) return;
    
    // 获取最新的按钮位置（可能已变化）
    const updatedButtonRect = cinemaButton.getBoundingClientRect();
    
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // 获取播放器元素的边界，用于限制弹窗不超出视频区域
    const player = document.querySelector('#movie_player');
    const playerRect = player ? player.getBoundingClientRect() : null;
    
    // 计算弹窗位置 - 如果按钮在页面下半部分，则弹窗显示在按钮上方，否则显示在按钮下方
    const isButtonInBottomHalf = updatedButtonRect.top > viewportHeight / 2;
    
    // 设置弹窗的基本样式
    popupContent.style.position = 'absolute';
    
    // 弹窗尺寸 (320px宽)
    const popupWidth = 320;
    const popupHeight = popupContent.offsetHeight || 230; // 如果还没渲染，估计高度
    
    // 默认位置 - 水平居中对齐按钮
    let left = updatedButtonRect.left + updatedButtonRect.width/2 - popupWidth/2;
    
    // 垂直位置根据按钮在上半部分还是下半部分决定
    let top, bottom;
    if (isButtonInBottomHalf) {
      // 按钮在下半部分，弹窗显示在上方
      bottom = viewportHeight - updatedButtonRect.top + 10;
      popupContent.style.bottom = bottom + 'px';
      // 移除可能存在的top值
      popupContent.style.top = '';
    } else {
      // 按钮在上半部分，弹窗显示在下方
      top = updatedButtonRect.bottom + 10;
      popupContent.style.top = top + 'px';
      // 移除可能存在的bottom值
      popupContent.style.bottom = '';
    }
    
    // 水平边界检查 - 确保弹窗不超出视口左右边界
    left = Math.max(10, left); // 不超出左边界
    left = Math.min(viewportWidth - popupWidth - 10, left); // 不超出右边界
    
    // 如果有播放器元素，进一步限制在播放器内
    if (playerRect) {
      // 限制水平位置在播放器范围内
      left = Math.max(playerRect.left + 10, left);
      left = Math.min(playerRect.right - popupWidth - 10, left);
      
      // 垂直位置也限制在播放器范围内
      if (isButtonInBottomHalf) {
        // 如果弹窗在按钮上方且按钮在下半部分
        const newBottom = viewportHeight - updatedButtonRect.top + 10;
        // 确保弹窗顶部不超出播放器顶部
        const maxBottom = viewportHeight - playerRect.top - 10;
        popupContent.style.bottom = Math.min(newBottom, maxBottom) + 'px';
      } else {
        // 如果弹窗在按钮下方且按钮在上半部分
        const newTop = updatedButtonRect.bottom + 10;
        // 确保弹窗底部不超出播放器底部
        const maxTop = playerRect.bottom - popupHeight - 10;
        popupContent.style.top = Math.min(newTop, maxTop) + 'px';
      }
    }
    
    // 应用最终的水平位置
    popupContent.style.left = left + 'px';
  }
  
  // 首次定位弹窗
  positionPopup();
  
  // 监听播放器尺寸变化，更新弹窗位置
  const resizeObserver = new ResizeObserver(() => {
    if (document.getElementById('subtitle-options-popup')) {
      positionPopup();
    } else {
      // 如果弹窗已关闭，停止观察
      resizeObserver.disconnect();
    }
  });
  
  // 观察播放器元素尺寸变化
  const player = document.querySelector('#movie_player');
  if (player) {
    resizeObserver.observe(player);
  }
  
  // 监听窗口尺寸变化，更新弹窗位置
  const resizeHandler = () => {
    if (document.getElementById('subtitle-options-popup')) {
      positionPopup();
    } else {
      // 如果弹窗已关闭，移除监听器
      window.removeEventListener('resize', resizeHandler);
    }
  };
  window.addEventListener('resize', resizeHandler);
  
  // 添加事件监听器 - 关闭按钮
  const closeBtn = popupContainer.querySelector('.subtitle-options-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closePopup();
    });
  }
  
  // 关闭弹窗的函数
  function closePopup() {
    // 添加淡出动画
    popupContainer.classList.add('subtitle-popup-fadeout');
    
    // 动画结束后移除元素
    setTimeout(() => {
      if (document.body.contains(popupContainer)) {
        document.body.removeChild(popupContainer);
      }
      // 停止观察
      resizeObserver.disconnect();
      // 移除窗口尺寸变化监听器
      window.removeEventListener('resize', resizeHandler);
    }, 200); // 与CSS动画时长匹配
  }
  
  // 添加事件监听器 - 点击外部关闭
  popupContainer.addEventListener('click', (event) => {
    if (event.target === popupContainer) {
      closePopup();
    }
  });
  
  // 添加事件监听器 - Transor字幕开关
  const transorToggle = document.getElementById('transor-subtitle-toggle');
  if (transorToggle) {
    // 设置初始状态 - 使用全局变量状态
    transorToggle.checked = isTransorSubtitleEnabled;
    
    transorToggle.addEventListener('change', (event) => {
      const enabled = event.target.checked;
      // 直接更新全局变量
      isTransorSubtitleEnabled = enabled;
      console.log('Transor字幕设置已更新:', enabled);
      
      // 保存用户偏好设置到本地存储
      try {
        localStorage.setItem('transor-subtitle-enabled', enabled);
        console.log('已保存字幕开关设置:', enabled);
      } catch (e) {
        console.error('保存字幕开关设置失败:', e);
      }
      
      // 立即应用更改
      if (enabled) {
        // 如果启用字幕，重新加载并显示
        if (videoSubtitleContainer) {
          // 如果容器存在但是可能已被隐藏，先显示
          videoSubtitleContainer.style.display = 'block';
          
          // 如果已经有字幕数据，则直接显示
          if (videoSubtitles.length > 0 && currentVideoSubtitleIndex >= 0) {
            displayVideoSubtitle(currentVideoSubtitleIndex);
            
            // 重新开始跟踪
            startVideoSubtitleTracking();
          } else {
            // 如果没有字幕数据，重新加载
            loadVideoSubtitles();
          }
        } else {
          // 如果容器不存在，完整启用流程
          enableVideoSubtitles();
        }
      } else {
        // 如果需要禁用，停止所有字幕功能
        console.log('正在禁用所有字幕功能...');
        
        // 清理视频的字幕事件和定时器
        const video = document.querySelector('video');
        if (video && video._cleanupSubtitleTracking) {
          video._cleanupSubtitleTracking();
        }
        
        // 停止字幕跟踪
        if (videoSubtitleUpdateInterval) {
          clearInterval(videoSubtitleUpdateInterval);
          videoSubtitleUpdateInterval = null;
        }
        
        // 清空字幕显示
        clearVideoSubtitleDisplay();
        
        // 隐藏字幕容器
        if (videoSubtitleContainer) {
          videoSubtitleContainer.style.display = 'none';
          // 清空内容
          videoSubtitleContainer.innerHTML = '';
        }
        
        // 重置字幕索引
        currentVideoSubtitleIndex = -1;
      }
    });
  }
  
  // 添加事件监听器 - 字幕显示模式选择
  const displayModeSelect = document.getElementById('subtitle-display-select');
  if (displayModeSelect) {
    // 设置初始值
    displayModeSelect.value = subtitleDisplayMode;
    
    displayModeSelect.addEventListener('change', (event) => {
      const mode = event.target.value;
      // 直接更新全局变量
      subtitleDisplayMode = mode;
      console.log('字幕显示模式已更新:', mode);
      
      // 立即更新显示
      updateVideoSubtitleDisplay();
      
      // 保存用户偏好设置
      try {
        localStorage.setItem('transor-subtitle-display-mode', mode);
        console.log('已保存字幕显示模式设置:', mode);
      } catch (e) {
        console.error('保存设置失败:', e);
      }
    });
    
    // 尝试从本地存储加载用户之前的设置
    try {
      const savedMode = localStorage.getItem('transor-subtitle-display-mode');
      if (savedMode) {
        displayModeSelect.value = savedMode;
        subtitleDisplayMode = savedMode;
        console.log('从存储加载字幕显示模式:', savedMode);
        // 立即应用加载的设置
        updateVideoSubtitleDisplay();
      }
    } catch (e) {
      console.error('加载字幕显示设置失败:', e);
    }
  }
  
  // 添加事件监听器 - 字幕样式选择
  const styleSelect = document.getElementById('subtitle-style-select');
  if (styleSelect) {
    // 设置初始值
    styleSelect.value = subtitleStyle;
    
    styleSelect.addEventListener('change', (event) => {
      const style = event.target.value;
      // 直接更新全局变量
      subtitleStyle = style;
      console.log('字幕样式已更新:', style);
      
      // 立即更新显示
      updateSubtitleStyle();
      
      // 保存用户偏好设置
      try {
        localStorage.setItem('transor-subtitle-style', style);
        console.log('已保存字幕样式设置:', style);
      } catch (e) {
        console.error('保存设置失败:', e);
      }
    });
    
    // 尝试从本地存储加载用户之前的设置
    try {
      const savedStyle = localStorage.getItem('transor-subtitle-style');
      if (savedStyle) {
        styleSelect.value = savedStyle;
        subtitleStyle = savedStyle;
        console.log('从存储加载字幕样式:', savedStyle);
        // 立即应用加载的设置
        updateSubtitleStyle();
      }
    } catch (e) {
      console.error('加载字幕样式设置失败:', e);
    }
  }
  
  // 添加事件监听器 - 确认按钮进入影院模式
  const confirmBtn = document.getElementById('enter-cinema-mode-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      // 关闭弹窗
      document.body.removeChild(popupContainer);
      // 进入影院模式
      enterCinemaMode();
    });
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
  
  // 如果启用了视频字幕，确保字幕被正确禁用后重新启用
  if (isTransorSubtitleEnabled) {
    disableVideoSubtitles();
    setTimeout(() => {
      loadVideoSubtitles();
    }, 1000);
  }
  
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
  
  console.log('找到YouTube右侧控制栏，准备添加影院模式按钮');
  
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
    
    // 使用logo图片作为按钮图标，如果加载失败则使用备选图标
    cinemaButton.innerHTML = `
      <img src="${logoUrl}" alt="影院模式" style="width: 24px; height: 24px;" onerror="this.style.display='none';">
    `;
    
    // 添加点击事件
    cinemaButton.addEventListener('click', toggleCinemaMode);
    
    // 查找transor-youtube-button以便在其前面插入我们的按钮
    const transorButton = rightControlsContainer.querySelector('.transor-youtube-button');
    
    if (transorButton) {
      // 在transor按钮前插入我们的按钮
      rightControlsContainer.insertBefore(cinemaButton, transorButton);
      console.log('成功在transor按钮前插入影院模式按钮');
    } else {
      // 如果找不到transor按钮，则插入到右侧控制栏的最后
      rightControlsContainer.appendChild(cinemaButton);
      console.log('未找到transor按钮，将影院模式按钮添加到最后');
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
  
  if (cinemaButton) {
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
      // width: 26px !important;
      // height: 40px !important;
      background: transparent !important;
      border: none !important;
      cursor: pointer !important;
    }
    
    .transor-cinema-btn img {
      display: block;
      margin: auto;
      width: 24px !important;
      height: 24px !important;
      filter: brightness(1.8);
    }
    
    /* 字幕选项弹窗样式 */
    .subtitle-options-popup {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.4);
      z-index: 99999;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .subtitle-options-content {
      width: 320px;
      background-color: #212121;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      animation: popupFadeIn 0.3s ease-out;
      max-height: calc(100vh - 80px); /* 限制最大高度 */
      display: flex;
      flex-direction: column;
    }
    
    @keyframes popupFadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes popupFadeOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(10px);
      }
    }
    
    .subtitle-popup-fadeout {
      animation: popupFadeOut 0.2s ease-out forwards;
    }
    
    .subtitle-options-body {
      padding: 16px;
      overflow-y: auto; /* 添加垂直滚动条 */
      max-height: calc(100vh - 120px); /* 设置最大高度，确保可以滚动 */
      scrollbar-width: thin; /* Firefox的滚动条样式 */
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent; /* Firefox的滚动条颜色 */
    }
    
    /* Chrome和Safari的滚动条样式 */
    .subtitle-options-body::-webkit-scrollbar {
      width: 6px;
    }
    
    .subtitle-options-body::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .subtitle-options-body::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }
    
    .subtitle-option-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 4px;
      transition: background-color 0.2s;
    }
    
    .subtitle-option-item:last-child {
      margin-bottom: 0;
    }
    
    .subtitle-option-item:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    
    .subtitle-option-icon {
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .subtitle-option-label {
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      font-weight: 500;
      flex-grow: 1;
    }
    
    .subtitle-option-value {
      min-width: 130px;
    }
    
    .subtitle-option-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .enter-mode-item {
      cursor: pointer;
      background-color: rgba(255, 85, 136, 0.1);
    }
    
    .enter-mode-item:hover {
      background-color: rgba(255, 85, 136, 0.2);
    }
    
    .subtitle-select {
      width: 100%;
      background-color: #303030;
      color: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      appearance: none;
      cursor: pointer;
      transition: border-color 0.2s;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6"><path fill="%23ffffff" d="M0 0l6 6 6-6z"/></svg>');
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 30px;
    }
    
    .subtitle-select:focus {
      outline: none;
      border-color: #ff5588;
    }
    
    .subtitle-select option {
      background-color: #212121;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .subtitle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 22px;
    }
    
    .subtitle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .subtitle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.15);
      transition: .3s;
      border-radius: 22px;
    }
    
    .subtitle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    
    input:checked + .subtitle-slider {
      background-color: #ff5588;
    }
    
    input:focus + .subtitle-slider {
      box-shadow: 0 0 1px #ff5588;
    }
    
    input:checked + .subtitle-slider:before {
      transform: translateX(22px);
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
      max-width: 90vw;
      max-height: 25%;
      color: white;
      background-color: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
      font-size: 18px;
      line-height: 1.5;
      overflow-y: auto;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .cinema-original-subtitle {
      margin-bottom: 8px;
      color: #fff;
      text-align: center;
      word-wrap: break-word;
      word-break: break-word;
      white-space: pre-wrap;
      max-width: 100%;
      line-height: 1.5;
    }
    
    .cinema-translated-subtitle {
      color: #ff5588;
      font-weight: 500;
      text-align: center;
      word-wrap: break-word;
      word-break: break-word;
      white-space: pre-wrap;
      max-width: 100%;
      line-height: 1.5;
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
        const maxRetries = 10; // 增加重试次数
        
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
              console.log(`尝试查找控制栏 (${retryCount}/${maxRetries})...`);
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
      
      // 检查是否是视频页面 - 使用增强版判断
      if (isEnhancedYouTubeVideoPage()) {
        // 添加影院模式按钮 - 使用多次尝试策略确保按钮加载
        const maxAttempts = 5;
        let attempts = 0;
        
        const tryAddButton = () => {
          if (document.getElementById('cinema-mode-btn')) {
            console.log('影院模式按钮已存在，无需重新添加');
            return; // 按钮已存在，无需再添加
          }
          
          if (attempts >= maxAttempts) {
            console.warn('多次尝试添加按钮失败');
            // 尝试启动按钮轮询器作为最后手段
            startButtonPoller();
            return;
          }
          
          attempts++;
          console.log(`尝试添加影院模式按钮 (${attempts}/${maxAttempts})...`);
          
          const rightControls = document.querySelector('.ytp-right-controls');
          if (rightControls) {
            addCinemaButton();
          } else {
            // 如果找不到控制栏，延迟重试
            setTimeout(tryAddButton, 1000);
          }
        };
        
        // 开始尝试添加按钮
        setTimeout(tryAddButton, 1000);
        
        // 延迟启动按钮轮询器，以防上述方法都失败
        setTimeout(() => {
          if (!document.getElementById('cinema-mode-btn')) {
            console.log('URL变化后按钮仍未加载，启动轮询器');
            startButtonPoller();
          }
        }, 5000);
        
        // 清空字幕状态并重新加载
        videoSubtitles = [];
        videoTranslatedSubtitles = [];
        lastVideoId = '';
        
        // 如果已启用视频字幕，重新加载字幕
        if (isTransorSubtitleEnabled) {
          setTimeout(() => {
            console.log('URL变化后重新加载字幕');
            loadVideoSubtitles();
          }, 2000);
        }
      }
    }
  }, 1000);
  
  // 监听视频元素变化
  const observer = new MutationObserver(() => {
    if (isEnhancedYouTubeVideoPage()) {
      const currentVideoId = getYouTubeVideoId();
      const video = document.querySelector('video');
      
      if (video && currentVideoId && currentVideoId !== lastVideoId) {
        console.log('检测到视频元素变化，视频ID:', currentVideoId);
        
        // 延迟添加按钮，确保右侧控制栏已加载
        if (!document.getElementById('cinema-mode-btn')) {
          // 使用多次尝试策略确保按钮加载
          let buttonAttempts = 0;
          const maxButtonAttempts = 5;
          
          const attemptAddButton = () => {
            if (document.getElementById('cinema-mode-btn')) {
              console.log('影院模式按钮已存在，不需要重新添加');
              return;
            }
            
            if (buttonAttempts >= maxButtonAttempts) {
              console.warn('多次尝试添加按钮失败，将不再重试');
              return;
            }
            
            buttonAttempts++;
            console.log(`尝试添加影院模式按钮 (${buttonAttempts}/${maxButtonAttempts})...`);
            
            const rightControls = document.querySelector('.ytp-right-controls');
            if (rightControls) {
              addCinemaButton();
            } else {
              // 控制栏未加载，继续重试
              setTimeout(attemptAddButton, 800);
            }
          };
          
          // 开始尝试添加按钮
          setTimeout(attemptAddButton, 500);
        }
        
        // 如果启用了字幕翻译，重新加载字幕
        if (isTransorSubtitleEnabled) {
          // 清空字幕状态
          videoSubtitles = [];
          videoTranslatedSubtitles = [];
          lastVideoId = currentVideoId;
          
          // 如果字幕容器被隐藏，重新显示
          if (videoSubtitleContainer) {
            videoSubtitleContainer.style.display = 'block';
          }
          
          // 重新加载字幕
          setTimeout(() => {
            console.log('视频元素变化后重新加载字幕');
            loadVideoSubtitles();
          }, 1500);
        }
      }
    }
  });
  
  // 使用更全面的观察配置
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true, // 增加属性变化监听
    attributeFilter: ['src', 'data-video-id'] // 关注视频相关属性变化
  });
  
  // 监听页面可见性变化，当从后台切回时检查字幕状态
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isYouTubeVideoPage() && isTransorSubtitleEnabled) {
      const currentVideoId = getYouTubeVideoId();
      
      // 如果当前没有字幕但有视频ID，尝试重新加载字幕
      if (videoSubtitles.length === 0 && currentVideoId) {
        console.log('页面可见性变化，尝试加载字幕');
        setTimeout(() => {
          loadVideoSubtitles();
        }, 1000);
      }
    }
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
      <div class="loading-bar no-translate">
        <div class="loading-progress no-translate" style="width: 0%"></div>
      </div>
      <div class="loading-text no-translate">正在准备字幕...</div>
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
    
    // 检测是否有进度条操作正在进行
    const video = document.querySelector('video');
    const isUserSeeking = video && video._userSeeking;
    const progressBar = document.querySelector('.ytp-progress-bar');
    const isProgressBarActive = progressBar && progressBar.classList.contains('ytp-progress-bar-hover');
    
    // 根据是否有用户操作决定是否强制刷新CC
    const shouldForceRefresh = !isUserSeeking && !isProgressBarActive;
    
    // 首先尝试开启CC字幕，根据情况决定是否强制刷新
    console.log('尝试开启CC字幕' + (shouldForceRefresh ? '并强制刷新' : ''));
    await enableCCSubtitles(shouldForceRefresh);
    
    // 等待一段时间让字幕加载
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 发送消息到background获取捕获的字幕URL
    console.log(`正在获取视频ID为 ${currentVideoId} 的字幕...`);
    
    // 向background请求字幕URL
    const subtitleUrlResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { 
          action: 'getYouTubeSubtitleUrl',
          videoId: currentVideoId 
        },
        (response) => {
          resolve(response);
        }
      );
    });
    
    console.log('获取到的字幕URL响应:', subtitleUrlResponse);
    
    if (!subtitleUrlResponse || !subtitleUrlResponse.success || !subtitleUrlResponse.url) {
      throw new Error('未能获取字幕URL');
    }
    
    // 使用获取到的URL请求字幕
    const response = await fetchYouTubeSubtitles(subtitleUrlResponse.url);
    
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
    updateLoadingProgress(100, '加载失败');
    showSubtitleError(error.message || '加载字幕失败');
  }
}

// 自动开启CC字幕
async function enableCCSubtitles(forceRefresh = false) {
  try {
    console.log('尝试自动开启CC字幕...');
    
    // 方法1: 尝试点击字幕按钮
    const captionButton = document.querySelector('button.ytp-subtitles-button');
    if (captionButton) {
      const isEnabled = captionButton.getAttribute('aria-pressed') === 'true';
      
      if (forceRefresh && isEnabled) {
        // 如果需要强制刷新且字幕已开启，先关闭再开启
        console.log('强制刷新字幕 - 先关闭CC字幕');
        captionButton.click();
        
        // 等待短暂时间后再次点击开启
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('强制刷新字幕 - 重新开启CC字幕');
        captionButton.click();
        return true;
      } else if (!isEnabled) {
        console.log('找到字幕按钮，点击开启字幕');
        captionButton.click();
        return true;
      } else {
        console.log('字幕已经开启');
        return true;
      }
    }
    
    // 方法2: 使用键盘快捷键 'c' 来开启字幕
    const videoElement = document.querySelector('video.html5-main-video');
    if (videoElement) {
      if (forceRefresh) {
        // 如果需要强制刷新，发送两次键盘事件（关闭再开启）
        const keyEventOff = new KeyboardEvent('keydown', {
          key: 'c',
          code: 'KeyC',
          keyCode: 67,
          which: 67,
          bubbles: true,
          cancelable: true
        });
        
        document.body.dispatchEvent(keyEventOff);
        console.log('已发送关闭字幕的键盘快捷键');
        
        // 等待短暂时间后再发送开启事件
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // 发送开启事件
      const keyEventOn = new KeyboardEvent('keydown', {
        key: 'c',
        code: 'KeyC',
        keyCode: 67,
        which: 67,
        bubbles: true,
        cancelable: true
      });
      
      document.body.dispatchEvent(keyEventOn);
      console.log('已发送开启字幕的键盘快捷键');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('自动开启字幕出错:', error);
    return false;
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

        console.log(responseText, "responseText")
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

// 处理并合并字幕片段为完整句子（智能断句算法）
function processSubtitlesWithSentenceMerging(jsonData) {
  try {
    // 提取所有带有文本的事件
    const textEvents = jsonData.events.filter(event => 
      event.segs && event.segs.some(seg => seg.utf8 && seg.utf8.trim() !== '\n')
    );
    
    // 收集所有文本片段和时间信息
    let allSegments = [];
    
    textEvents.forEach(event => {
      event.segs.forEach(seg => {
        if (seg.utf8 && seg.utf8.trim() !== '\n') {
          const startTime = event.tStartMs + (seg.tOffsetMs || 0);
          allSegments.push({
            text: seg.utf8,
            startTime: startTime,
            originalEvent: event
          });
        }
      });
    });
    
    // 按时间排序
    allSegments.sort((a, b) => a.startTime - b.startTime);
    
    // 检查是否有标点符号
    const hasChinesePunctuation = allSegments.some(seg => /[。！？，、；：]/.test(seg.text));
    const hasEnglishPunctuation = allSegments.some(seg => /[.!?,:;]/.test(seg.text));
    const hasPunctuation = hasChinesePunctuation || hasEnglishPunctuation;
    
    console.log(`检测到标点符号: ${hasPunctuation ? '是' : '否'}`);
    console.log(`使用处理方式: ${hasPunctuation ? '标点符号断句' : '时间间隔断句'}`);
    
    const sentences = [];
    let currentSentence = {
      text: '',
      startTime: null,
      endTime: null,
      segments: []
    };
    
    // 完成当前句子的辅助函数
    const finalizeSentence = () => {
      if (currentSentence.segments.length > 0) {
        const lastSegment = currentSentence.segments[currentSentence.segments.length - 1];
        const lastEvent = lastSegment.originalEvent;
        currentSentence.endTime = lastEvent.tStartMs + lastEvent.dDurationMs;
        
        // 清理文本，规范化空格
        let cleanText = currentSentence.text.trim();
        cleanText = cleanText.replace(/\s+/g, ' ');
        
        if (cleanText) {
          sentences.push({
            start: currentSentence.startTime / 1000,
            end: currentSentence.endTime / 1000,
            text: cleanText,
            rawStartMs: currentSentence.startTime,
            rawDurationMs: currentSentence.endTime - currentSentence.startTime
          });
        }
        
        // 重置当前句子
        currentSentence = {
          text: '',
          startTime: null,
          endTime: null,
          segments: []
        };
      }
    };
    
    if (hasPunctuation) {
      // 基于标点符号的智能断句算法（带长度限制）
      console.log('使用基于标点符号的智能断句算法（带长度限制）');
      
      const sentenceEndPunctuation = /[.!?。！？]/;
      const commaOrPause = /[,，;；:：]/;
      
      // 长度控制参数
      const maxCharacters = 100;
      const maxWords = 18;
      const forceBreakCharacters = 130;
      const forceBreakWords = 22;
      const minCharacters = 25;
      const minWords = 4;
      const idealCharacters = 75;
      const idealWords = 14;
      
      allSegments.forEach((segment, index) => {
        if (currentSentence.startTime === null) {
          currentSentence.startTime = segment.startTime;
        }
        
        // 处理文本，确保片段间有适当的空格
        const segmentText = segment.text.replace(/\n/g, ' ').trim();
        if (currentSentence.text && segmentText && 
            !currentSentence.text.endsWith(' ') && !segmentText.startsWith(' ')) {
          currentSentence.text += ' ';
        }
        currentSentence.text += segmentText;
        currentSentence.segments.push(segment);
        
        // 计算当前句子统计信息
        const currentText = currentSentence.text.trim();
        const currentCharCount = currentText.length;
        const currentWordCount = currentText.split(/\s+/).filter(word => word.length > 0).length;
        
        const hasEndPunctuation = sentenceEndPunctuation.test(segment.text);
        const hasCommaPause = commaOrPause.test(segment.text);
        
        let shouldFinalize = false;
        let finalizeReason = '';
        
        // 1. 遇到句号等结束标点符号
        if (hasEndPunctuation) {
          if (currentCharCount >= minCharacters && currentWordCount >= minWords) {
            shouldFinalize = true;
            finalizeReason = '遇到结束标点符号';
          } else if (index < allSegments.length - 1) {
            const nextSegment = allSegments[index + 1];
            const currentSegment = segment;
            const currentEndTime = currentSegment.originalEvent.tStartMs + currentSegment.originalEvent.dDurationMs;
            const pause = nextSegment.startTime - currentEndTime;
            
            if (pause >= 800) {
              shouldFinalize = true;
              finalizeReason = `结束标点符号 + 长停顿 ${pause}ms`;
            }
          }
        }
        // 2. 强制断句限制
        else if (currentCharCount >= forceBreakCharacters || currentWordCount >= forceBreakWords) {
          shouldFinalize = true;
          finalizeReason = '超过强制断句限制';
        }
        // 3. 超过最大长度限制，寻找合适的断句点
        else if (currentCharCount >= maxCharacters || currentWordCount >= maxWords) {
          if (hasCommaPause) {
            shouldFinalize = true;
            finalizeReason = '超过最大长度 + 逗号停顿';
          } else if (index < allSegments.length - 1) {
            const nextSegment = allSegments[index + 1];
            const currentSegment = segment;
            const currentEndTime = currentSegment.originalEvent.tStartMs + currentSegment.originalEvent.dDurationMs;
            const pause = nextSegment.startTime - currentEndTime;
            
            if (pause >= 300) {
              shouldFinalize = true;
              finalizeReason = `超过最大长度 + 停顿 ${pause}ms`;
            }
          } else if (currentCharCount >= forceBreakCharacters * 0.8 || currentWordCount >= forceBreakWords * 0.8) {
            shouldFinalize = true;
            finalizeReason = '接近强制断句限制，强制断句';
          }
        }
        // 4. 达到理想长度且遇到逗号或停顿
        else if ((currentCharCount >= idealCharacters || currentWordCount >= idealWords) && hasCommaPause) {
          if (index < allSegments.length - 1) {
            const nextSegment = allSegments[index + 1];
            const currentSegment = segment;
            const currentEndTime = currentSegment.originalEvent.tStartMs + currentSegment.originalEvent.dDurationMs;
            const pause = nextSegment.startTime - currentEndTime;
            
            if (pause >= 400) {
              shouldFinalize = true;
              finalizeReason = `达到理想长度 + 逗号 + 停顿 ${pause}ms`;
            }
          }
        }
        
        // 5. 最后一个片段
        if (index === allSegments.length - 1) {
          shouldFinalize = true;
          finalizeReason = '最后一个片段';
        }
        
        if (shouldFinalize) {
          console.log(`断句: ${finalizeReason} (${currentCharCount}字符, ${currentWordCount}单词)`);
          finalizeSentence();
        }
      });
    } else {
      // 基于单词间停顿的智能断句算法（针对无标点符号的字幕）
      console.log('使用基于单词间停顿的智能断句算法');
      
      let wordSegments = [];
      
      allSegments.forEach((segment, index) => {
        if (segment.text.trim()) {
          wordSegments.push({
            text: segment.text,
            time: segment.startTime,
            originalSegment: segment,
            index: index
          });
        }
      });
      
      // 分析单词间的停顿并找出句子边界
      let sentenceBoundaries = [0];
      
      // 参数设置
      const significantPause = 800;
      const minorPause = 500;
      const minWordsPerSentence = 10;
      const maxWordsPerSentence = 25;
      const idealWordsPerSentence = 15;
      
      let currentWordCount = 0;
      
      for (let i = 1; i < wordSegments.length; i++) {
        const prevSegment = wordSegments[i - 1];
        const currSegment = wordSegments[i];
        const pause = currSegment.time - prevSegment.time;
        
        currentWordCount++;
        
        let shouldBreak = false;
        let breakReason = '';
        
        // 1. 显著停顿
        if (pause >= significantPause && currentWordCount >= minWordsPerSentence) {
          shouldBreak = true;
          breakReason = `显著停顿 ${pause}ms`;
        }
        // 2. 次要停顿 + 达到理想长度
        else if (pause >= minorPause && currentWordCount >= idealWordsPerSentence) {
          shouldBreak = true;
          breakReason = `自然停顿 ${pause}ms`;
        }
        // 3. 超过最大长度限制
        else if (currentWordCount >= maxWordsPerSentence) {
          if (pause >= 300) {
            shouldBreak = true;
            breakReason = '达到最大长度';
          }
        }
        
        // 4. 检查语义线索
        if (!shouldBreak && currentWordCount >= minWordsPerSentence) {
          const currText = currSegment.text.trim().toLowerCase();
          const prevText = prevSegment.text.trim().toLowerCase();
          
          const sentenceEndWords = ['too', 'right', 'okay', 'yes', 'no', 'thanks', 'please'];
          if (sentenceEndWords.some(word => prevText.endsWith(word))) {
            shouldBreak = true;
            breakReason = '句尾标志词';
          }
          
          const sentenceStartWords = ['so', 'but', 'and', 'now', 'well', 'okay', 'however', 'therefore'];
          if (sentenceStartWords.some(word => currText.startsWith(word)) && pause >= 300) {
            shouldBreak = true;
            breakReason = '句首标志词';
          }
        }
        
        if (shouldBreak) {
          sentenceBoundaries.push(i);
          currentWordCount = 0;
          console.log(`在位置 ${i} 断句，原因: ${breakReason}`);
        }
      }
      
      // 确保最后一个边界
      if (sentenceBoundaries[sentenceBoundaries.length - 1] !== wordSegments.length) {
        sentenceBoundaries.push(wordSegments.length);
      }
      
      // 根据边界创建句子
      for (let i = 0; i < sentenceBoundaries.length - 1; i++) {
        const startIdx = sentenceBoundaries[i];
        const endIdx = sentenceBoundaries[i + 1];
        
        const sentenceSegments = wordSegments.slice(startIdx, endIdx);
        if (sentenceSegments.length > 0) {
          const text = sentenceSegments.map(seg => seg.text).join('').replace(/\n/g, ' ').trim();
          const firstSegment = sentenceSegments[0];
          const lastSegment = sentenceSegments[sentenceSegments.length - 1];
          
          if (text) {
            const startTime = firstSegment.originalSegment.startTime;
            const endTime = lastSegment.originalSegment.originalEvent.tStartMs + 
                          lastSegment.originalSegment.originalEvent.dDurationMs;
            
            sentences.push({
              start: startTime / 1000,
              end: endTime / 1000,
              text: text,
              rawStartMs: startTime,
              rawDurationMs: endTime - startTime
            });
            
            console.log(`句子 ${sentences.length}: "${text.substring(0, 50)}..." (${sentenceSegments.length}个片段)`);
          }
        }
      }
    }
    
    console.log(`字幕合并完成：原始片段数量 ${allSegments.length}，合并后句子数量 ${sentences.length}`);
    return sentences;
    
  } catch (error) {
    console.error('字幕合并处理失败:', error);
    return [];
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
        console.log('解析JSON3格式字幕');
        
        // 使用新的句子合并处理逻辑
        const mergedSubtitles = processSubtitlesWithSentenceMerging(jsonData);
        if (mergedSubtitles && mergedSubtitles.length > 0) {
          console.log('使用句子合并处理，字幕数量:', mergedSubtitles.length);
          return mergedSubtitles;
        }
        
        // 如果合并失败，回退到原始处理方式
        console.log('句子合并失败，使用原始处理方式');
        return jsonData.events
          .filter(event => event.segs && Array.isArray(event.segs))
          .map(event => {
            // 合并多段文本，保留原始格式
            const text = event.segs.map(seg => seg.utf8 || '').join('').trim();

            if (!text) return null;

            // 更精确的时间处理，保留更多小数位
            // 将YouTube毫秒时间戳转换为秒，保留原始精度
            const start = event.tStartMs / 1000;
            const duration = event.dDurationMs / 1000;
            
            // 确保结束时间略微提前，避免显示时间过长
            const end = start + duration - 0.05; // 减少50毫秒避免字幕显示时间过长

            return {
              start: start,
              end: end,
              text: text,
              rawStartMs: event.tStartMs, // 保留原始毫秒时间戳用于调试
              rawDurationMs: event.dDurationMs
            };
          })
          .filter(item => item !== null);
      }
    } catch (jsonError) {
      console.warn('JSON解析失败，尝试XML格式:', jsonError);
      
      // 不是JSON格式，检查是否是XML
      if (responseText.includes('<?xml') || responseText.includes('<transcript>') || responseText.includes('<text')) {
        console.log('解析XML格式字幕');
        
        // 创建XML解析器
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(responseText, "text/xml");
        const textElements = xmlDoc.getElementsByTagName('text');

        if (!textElements || textElements.length === 0) {
          console.warn('XML中未找到text元素');
          return [];
        }

        const subtitles = [];

        for (let i = 0; i < textElements.length; i++) {
          const element = textElements[i];
          // 提高时间精度，直接使用原始值
          const start = parseFloat(element.getAttribute('start') || '0');
          const dur = parseFloat(element.getAttribute('dur') || '0');
          let text = element.textContent || '';

          if (text) {
            // 改进文本清理，保留更多原始格式
            text = text.replace(/\n/g, ' ').trim();

            // 调整结束时间，略微提前
            const end = start + dur - 0.05; // 减少50毫秒
            
            subtitles.push({
              start: start,
              end: end,
              text: text,
              rawStart: element.getAttribute('start'), // 保留原始属性用于调试
              rawDur: element.getAttribute('dur')
            });
          }
        }

        // 按开始时间排序确保顺序正确
        return subtitles.sort((a, b) => a.start - b.start);
      }
    }

    // 格式不支持
    console.warn('不支持的字幕格式');
    return [];
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
  iframe._userSeeking = false; // 添加用户拖动标记

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
  const PREVIEW_TIME = 0.3; // 提前350毫秒显示字幕
  
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
      <div class="subtitle-error-icon no-translate">⚠️</div>
      <div class="subtitle-error-message no-translate">${errorMessage || '未知错误'}</div>
      <button id="btn-retry-subtitle" class="subtitle-retry-button no-translate">重试</button>
      <button id="btn-use-mock" class="subtitle-retry-button no-translate" style="margin-left: 10px; background-color: #555;">使用模拟数据</button>
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
          <p class="no-translate">无法加载字幕: ${error.message}</p>
          <p class="no-translate">请尝试刷新页面或退出影院模式后重试</p>
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
  console.log('YouTube 页面加载完成，准备初始化影院模式...');
  
  // 立即检查页面类型
  if (isEnhancedYouTubeVideoPage()) {
    console.log('检测到视频页面，立即尝试初始化影院模式...');
    
    // 优先初始化必要的UI元素
    setTimeout(() => {
      // 尝试预先添加按钮
      const rightControls = document.querySelector('.ytp-right-controls');
      if (rightControls && !document.getElementById('cinema-mode-btn')) {
        console.log('找到控制栏，尝试预先添加按钮');
        addCinemaButton();
      }
    }, 500);
    
    // 启动按钮轮询器，确保按钮加载
    startButtonPoller();
  }
  
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

  // 监听页面可见性变化，当从后台切回时检查字幕状态
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isYouTubeVideoPage() && isTransorSubtitleEnabled) {
      const currentVideoId = getYouTubeVideoId();
      
      // 如果当前没有字幕但有视频ID，尝试重新加载字幕
      if (videoSubtitles.length === 0 && currentVideoId) {
        console.log('页面可见性变化，尝试加载字幕');
        setTimeout(() => {
          loadVideoSubtitles();
        }, 1000);
      } else if (videoSubtitles.length > 0 && currentVideoId) {
        // 如果已有字幕，尝试刷新CC状态
        console.log('页面可见性变化，尝试刷新CC字幕状态');
        setTimeout(() => {
          enableCCSubtitles(true);
        }, 1000);
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
      
      // 处理启用CC字幕的消息
      if (message.type === 'ENABLE_CAPTIONS') {
        console.log('收到启用CC字幕的消息');
        enableCCSubtitles(message.forceRefresh || false).then(success => {
          sendResponse({ success });
        });
        return true; // 保持消息通道开放
      }
      
      // 处理刷新字幕的消息
      if (message.type === 'REFRESH_SUBTITLES') {
        console.log('收到刷新字幕的消息');
        
        // 先刷新CC字幕状态
        enableCCSubtitles(true).then(success => {
          if (success) {
            // 如果已有字幕数据，尝试重新加载
            setTimeout(() => {
              loadVideoSubtitles();
            }, 500);
          }
          sendResponse({ success });
        });
        
        return true; // 保持消息通道开放
      }
      
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
  const MAX_SENTENCE_LENGTH = 120; // 最大句子长度（字符）- 适中长度，保持完整性
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

// 初始化视频字幕翻译功能
function initVideoSubtitleTranslation() {
  console.log('初始化视频字幕翻译功能');
  
  // 使用保存的字幕状态初始化，而不是始终启用
  // isTransorSubtitleEnabled = true; -- 删除这行，使用全局变量的值
  
  // 记录初始视频ID
  lastVideoId = getYouTubeVideoId();
  console.log('初始化视频ID:', lastVideoId);
  
  // 仅在字幕功能启用时才启用字幕
  if (isTransorSubtitleEnabled) {
    enableVideoSubtitles();
  }
  
  // 添加视频状态跟踪变量
  let lastVideoStatus = {
    id: lastVideoId,
    time: 0,
    hasSubtitles: false,
    loadAttempts: 0,
    lastLoadTime: Date.now(),
    subtitleFailures: 0,
    lastCCRefreshTime: Date.now() // 新增：上次CC刷新时间
  };
  
  // 监听视频变化，以确保在视频变化时重新加载字幕
  setInterval(() => {
    const currentVideoId = getYouTubeVideoId();
    const video = document.querySelector('video');
    const currentTime = video ? video.currentTime : 0;
    
    // 视频ID改变或明显的时间跳转/重置
    const isNewVideo = currentVideoId && (
      currentVideoId !== lastVideoId || 
      (lastVideoStatus.time > 10 && currentTime < 3)
    );
    
    // 检测视频播放但没有字幕的情况
    const needsSubtitleRetry = currentVideoId && 
      isTransorSubtitleEnabled &&  // 只有在字幕启用时才重试
      videoSubtitles.length === 0 && 
      currentTime > 5 && 
      Date.now() - lastVideoStatus.lastLoadTime > 5000 && // 距上次加载超过5秒
      lastVideoStatus.loadAttempts < 3; // 尝试次数小于3次
    
    // 字幕加载后长时间消失的情况
    const subtitlesDisappeared = currentVideoId && 
      isTransorSubtitleEnabled &&  // 只有在字幕启用时才恢复
      lastVideoStatus.hasSubtitles && 
      videoSubtitles.length > 0 && 
      !videoSubtitleContainer?.style.display || 
      videoSubtitleContainer?.style.display === 'none';
    
    // 新增：定期刷新CC字幕状态（每60秒刷新一次）
    const needsCCRefresh = currentVideoId && 
      isTransorSubtitleEnabled && 
      Date.now() - lastVideoStatus.lastCCRefreshTime > 60000 && // 60秒刷新一次
      currentTime > 10; // 确保视频已经播放一段时间
    
    if (isNewVideo) {
      console.log('检测到视频变化，重新加载字幕:', {
        oldId: lastVideoId,
        newId: currentVideoId,
        oldTime: lastVideoStatus.time,
        newTime: currentTime
      });
      
      // 重置状态
      lastVideoStatus = {
        id: currentVideoId,
        time: currentTime,
        hasSubtitles: false,
        loadAttempts: 0,
        lastLoadTime: Date.now(),
        subtitleFailures: 0,
        lastCCRefreshTime: Date.now()
      };
      
      // 更新视频ID
      lastVideoId = currentVideoId;
      
      // 先禁用当前字幕显示
      disableVideoSubtitles();
      
      // 清空旧字幕
      videoSubtitles = [];
      videoTranslatedSubtitles = [];
      
      // 重新加载字幕
      if (isTransorSubtitleEnabled) {
        // 确保容器存在
        createVideoSubtitleContainer();
        // 延迟加载新视频的字幕，等待视频完全加载
        setTimeout(() => {
          loadVideoSubtitles();
          lastVideoStatus.loadAttempts++;
          lastVideoStatus.lastLoadTime = Date.now();
        }, 1500);
      }
    } 
    // 处理需要重试加载字幕的情况
    else if (needsSubtitleRetry) {
      console.log('视频已播放但没有字幕，尝试重新加载:', {
        videoId: currentVideoId,
        currentTime,
        attempts: lastVideoStatus.loadAttempts
      });
      
      // 更新尝试计数
      lastVideoStatus.loadAttempts++;
      lastVideoStatus.lastLoadTime = Date.now();
      
      // 尝试重新加载字幕
      if (isTransorSubtitleEnabled) {
        loadVideoSubtitles();
      }
    }
    // 处理字幕消失的情况
    else if (subtitlesDisappeared) {
      console.log('字幕容器已消失，尝试恢复显示');
      
      // 确保字幕容器可见
      if (videoSubtitleContainer) {
        videoSubtitleContainer.style.display = 'block';
      } else {
        // 如果容器不存在，重新创建并加载
        createVideoSubtitleContainer();
        loadVideoSubtitles();
        lastVideoStatus.loadAttempts++;
        lastVideoStatus.lastLoadTime = Date.now();
      }
      
      // 重新启动字幕跟踪
      startVideoSubtitleTracking();
    }
    // 新增：定期刷新CC字幕状态
    else if (needsCCRefresh) {
      // 获取视频元素并检查是否正在进行用户拖动操作
      const video = document.querySelector('video');
      const isUserSeeking = video && video._userSeeking;
      
      // 检查是否有进度条操作正在进行
      const progressBar = document.querySelector('.ytp-progress-bar');
      const isProgressBarActive = progressBar && progressBar.classList.contains('ytp-progress-bar-hover');
      
      // 只有在没有用户拖动和进度条操作时才刷新CC
      if (!isUserSeeking && !isProgressBarActive) {
        console.log('定期刷新CC字幕状态');
        
        // 更新最后刷新时间
        lastVideoStatus.lastCCRefreshTime = Date.now();
        
        // 刷新CC字幕（关闭再开启）
        enableCCSubtitles(true).then(success => {
          if (success) {
            console.log('CC字幕状态刷新成功');
            
            // 如果当前没有字幕数据，尝试重新加载
            if (videoSubtitles.length === 0) {
              setTimeout(() => {
                loadVideoSubtitles();
              }, 1000);
            }
          } else {
            console.log('CC字幕状态刷新失败');
          }
        });
      } else {
        console.log('检测到用户进度条操作，暂停CC字幕刷新');
        // 不更新最后刷新时间，下次检查时仍会尝试刷新
      }
    }
    
    // 更新状态跟踪
    if (video && currentVideoId) {
      // 更新播放时间
      lastVideoStatus.time = currentTime;
      
      // 检测是否有有效字幕
      if (videoSubtitles.length > 0) {
        lastVideoStatus.hasSubtitles = true;
      }
    }
  }, 2000); // 每2秒检查一次
  
  // 当播放器完全加载时，尝试再次加载字幕（增强可靠性）
  document.addEventListener('loadeddata', function(event) {
    // 确保事件来自视频元素
    if (event.target && event.target.tagName === 'VIDEO') {
      console.log('视频加载完成，尝试刷新字幕状态');
      
      if (isTransorSubtitleEnabled) {
        // 更新最后加载时间
        lastVideoStatus.lastLoadTime = Date.now();
        
        // 如果没有字幕数据，尝试完整加载流程
        if (videoSubtitles.length === 0) {
          console.log('视频加载完成但没有字幕，尝试加载字幕');
          setTimeout(() => {
            loadVideoSubtitles();
          }, 1000);
        } else {
          // 如果已有字幕数据，只刷新CC状态
          console.log('视频加载完成且已有字幕，尝试刷新CC状态');
          setTimeout(() => {
            enableCCSubtitles(true);
          }, 1000);
        }
      }
    }
  }, true);
  
  // 监听视频播放状态变化
  document.addEventListener('play', function(event) {
    // 确保事件来自视频元素
    if (event.target && event.target.tagName === 'VIDEO') {
      console.log('视频开始播放，检查字幕状态');
      
      if (isTransorSubtitleEnabled) {
        // 如果没有字幕数据且视频已经播放，尝试加载字幕
        if (videoSubtitles.length === 0 && event.target.currentTime > 3) {
          console.log('视频播放中但没有字幕，尝试加载字幕');
          setTimeout(() => {
            loadVideoSubtitles();
          }, 500);
        }
      }
    }
  }, true);
  
  // 监听视频暂停状态变化
  document.addEventListener('pause', function(event) {
    // 确保事件来自视频元素
    if (event.target && event.target.tagName === 'VIDEO' && isTransorSubtitleEnabled) {
      // 视频暂停时不做特殊处理，保持当前字幕状态
      console.log('视频暂停');
    }
  }, true);
  
  // 监听视频跳转事件
  document.addEventListener('seeking', function(event) {
    // 确保事件来自视频元素
    if (event.target && event.target.tagName === 'VIDEO' && isTransorSubtitleEnabled) {
      console.log('视频跳转中，准备更新字幕');
      
      // 标记为用户主动进度条操作，不触发CC刷新
      event.target._userSeeking = true;
    }
  }, true);
  
  document.addEventListener('seeked', function(event) {
    // 确保事件来自视频元素
    if (event.target && event.target.tagName === 'VIDEO' && isTransorSubtitleEnabled) {
      console.log('视频跳转完成，更新字幕');
      
      // 大幅度跳转时（超过30秒），考虑刷新CC状态，但仅当不是由进度条操作引起时
      const video = event.target;
      
      // 如果是用户主动进度条操作，不刷新CC状态
      if (video._userSeeking) {
        console.log('检测到用户进度条操作，不刷新CC状态');
        video._userSeeking = false; // 重置标记
      }
      // 如果不是进度条操作，可能是其他原因导致的跳转，考虑刷新CC
      else if (video._lastPosition && Math.abs(video.currentTime - video._lastPosition) > 30) {
        console.log('检测到大幅度自动跳转，尝试刷新CC状态');
        setTimeout(() => {
          enableCCSubtitles(true);
        }, 500);
      }
      
      // 记录当前位置
      video._lastPosition = video.currentTime;
    }
  }, true);
  
  // 监听进度条点击事件
  const addProgressBarListeners = () => {
    // 查找YouTube进度条元素
    const progressBar = document.querySelector('.ytp-progress-bar');
    if (progressBar) {
      // 避免重复添加
      if (!progressBar._hasTransorListener) {
        progressBar.addEventListener('mousedown', () => {
          console.log('检测到进度条点击，标记为用户操作');
          const video = document.querySelector('video');
          if (video) {
            video._userSeeking = true;
          }
        });
        progressBar._hasTransorListener = true;
      }
    } else {
      // 如果还没找到进度条，延迟重试
      setTimeout(addProgressBarListeners, 1000);
    }
  };
  
  // 启动进度条监听
  addProgressBarListeners();
  
  // 监听YouTube播放器的样式变化，防止字幕被隐藏
  const observePlayerStyles = () => {
    const player = document.querySelector('#movie_player');
    if (!player) return;
    
    const observer = new MutationObserver(() => {
      // 检查播放器是否切换了全屏模式或其他可能影响字幕显示的变化
      if (videoSubtitleContainer && isTransorSubtitleEnabled) {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        const isPlayerHidden = getComputedStyle(player).display === 'none';
        
        if (isPlayerHidden) {
          // 播放器被隐藏，暂时隐藏字幕
          videoSubtitleContainer.style.display = 'none';
        } else if (videoSubtitles.length > 0) {
          // 确保字幕容器可见
          videoSubtitleContainer.style.display = 'block';
          
          // 在全屏模式切换后，更新字幕位置
          if (isFullscreen) {
            videoSubtitleContainer.classList.add('ytp-fullscreen');
          } else {
            videoSubtitleContainer.classList.remove('ytp-fullscreen');
          }
        }
      }
    });
    
    observer.observe(player, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  };
  
  // 启动播放器样式监听
  setTimeout(observePlayerStyles, 2000);
}

// 启用视频字幕
function enableVideoSubtitles() {
  console.log('启用视频字幕翻译');
  
  // 创建字幕容器
  createVideoSubtitleContainer();
  
  // 获取当前视频ID
  const videoId = getYouTubeVideoId();
  if (videoId && videoId !== currentVideoId) {
    currentVideoId = videoId;
    loadVideoSubtitles();
  }
  
  // 开始字幕跟踪
  startVideoSubtitleTracking();
  
  // 应用当前的字幕显示模式
  console.log('应用字幕显示模式:', subtitleDisplayMode);
  updateVideoSubtitleDisplay();
  
  // 应用当前的字幕样式
  console.log('应用字幕样式:', subtitleStyle);
  updateSubtitleStyle();
}

// 禁用视频字幕
function disableVideoSubtitles() {
  console.log('暂时隐藏视频字幕翻译');
  
  // 停止字幕跟踪
  if (videoSubtitleUpdateInterval) {
    clearInterval(videoSubtitleUpdateInterval);
    videoSubtitleUpdateInterval = null;
  }
  
  // 隐藏字幕容器但不移除
  if (videoSubtitleContainer) {
    videoSubtitleContainer.style.display = 'none';
  }
  
  // 清空显示的字幕
  currentVideoSubtitleIndex = -1;
}

// 创建视频字幕容器
function createVideoSubtitleContainer() {
  // 检查字幕功能是否启用
  if (!isTransorSubtitleEnabled) {
    console.log('字幕功能已禁用，不创建字幕容器');
    return;
  }
  
  // 检查容器是否已存在
  if (videoSubtitleContainer) {
    return;
  }
  
  // 查找YouTube播放器
  const player = document.querySelector('#movie_player');
  if (!player) {
    console.error('未找到YouTube播放器');
    return;
  }
  
  // 创建字幕容器
  videoSubtitleContainer = document.createElement('div');
  videoSubtitleContainer.id = 'transor-video-subtitle-container';
  videoSubtitleContainer.className = 'transor-video-subtitle-container no-translate';
  
  // 添加到播放器中
  player.appendChild(videoSubtitleContainer);
  
  // 添加样式
  addVideoSubtitleStyles();
  
  // 添加拖拽功能
  makeDraggable(videoSubtitleContainer);
}

// 添加视频字幕样式
function addVideoSubtitleStyles() {
  // 检查样式是否已存在
  if (document.getElementById('transor-video-subtitle-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'transor-video-subtitle-styles';
  style.textContent = `
    .transor-video-subtitle-container {
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      text-align: center;
      cursor: move;
      user-select: none;
      max-width: 80%;
      width: auto;
      height: auto;
    }
    
    .transor-video-subtitle-wrapper {
      background-color: rgba(0, 0, 0, 0.8);
      padding: 12px 16px;
      border-radius: 8px;
      display: inline-block;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      margin-bottom: 4px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      width: auto;
      min-width: 200px;
      max-width: 90vw;
      height: auto;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .transor-video-subtitle-original {
      color: #fff;
      font-size: 18px;
      line-height: 1.5;
      margin-bottom: 4px;
      white-space: pre-wrap;
      word-wrap: break-word;
      word-break: break-word;
      text-align: center;
      max-width: 100%;
    }
    
    .transor-video-subtitle-translated {
      color: #ff5588;
      font-weight: 500;
      font-size: 16px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
      word-break: break-word;
      text-align: center;
      max-width: 100%;
    }
    
    /* 字幕显示模式样式 */
    .mode-original-only .transor-video-subtitle-translated {
      display: none;
    }
    
    .mode-translation-only .transor-video-subtitle-original {
      display: none;
    }
    
    .mode-translation-only .transor-video-subtitle-translated {
      font-size: 18px;
      margin-bottom: 0;
    }
    
    /* 调整字幕位置，避免与YouTube原生字幕重叠 */
    .ytp-caption-window-container ~ .transor-video-subtitle-container {
      bottom: 120px;
    }
    
    /* 全屏模式下的调整 */
    .ytp-fullscreen .transor-video-subtitle-container {
      bottom: 80px;
    }
    
    .ytp-fullscreen .transor-video-subtitle-original {
      font-size: 22px;
    }
    
    .ytp-fullscreen .transor-video-subtitle-translated {
      font-size: 20px;
    }
    
    /* 拖动时的样式 */
    .transor-dragging {
      opacity: 0.9;
      pointer-events: none;
    }
    
    /* 拖动手柄 */
    .transor-drag-handle {
      width: 30px;
      height: 6px;
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
      margin: 0 auto 8px;
      cursor: move;
    }
    
    /* 字幕样式 */
    /* 默认样式已在上面定义 */
    
    /* 半透明样式 */
    .subtitle-style-translucent .transor-video-subtitle-wrapper {
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
    }
    
    /* 浅色模式 */
    .subtitle-style-light .transor-video-subtitle-wrapper {
      background-color: rgba(255, 255, 255, 0.85);
    }
    
    .subtitle-style-light .transor-video-subtitle-original {
      color: #222;
    }
    
    .subtitle-style-light .transor-video-subtitle-translated {
      color: #e53935;
    }
    
    /* 无背景 */
    .subtitle-style-nobg .transor-video-subtitle-wrapper {
      background-color: transparent;
      box-shadow: none;
      padding: 0;
    }
    
    .subtitle-style-nobg .transor-video-subtitle-original {
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    }
    
    .subtitle-style-nobg .transor-video-subtitle-translated {
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    }
    
    /* 醒目样式 */
    .subtitle-style-bold .transor-video-subtitle-wrapper {
      background-color: rgba(0, 0, 0, 0.9);
      border: 2px solid #ff5588;
    }
    
    .subtitle-style-bold .transor-video-subtitle-original {
      font-size: 20px;
      font-weight: 700;
    }
    
    .subtitle-style-bold .transor-video-subtitle-translated {
      font-size: 18px;
      font-weight: 700;
      color: #ff3d71;
    }
  `;
  
  document.head.appendChild(style);
}

// 加载视频字幕
async function loadVideoSubtitles() {
  const currentVideoId = getYouTubeVideoId();
  console.log('加载视频字幕...', currentVideoId);
  
  // 检查字幕功能是否启用
  if (!isTransorSubtitleEnabled) {
    console.log('字幕功能已禁用，跳过加载字幕');
    return;
  }
  
  if (!currentVideoId) {
    console.error('未找到视频ID，无法加载字幕');
    return;
  }
  
  // 更新当前视频ID
  lastVideoId = currentVideoId;
  
  // 重置状态变量，确保全新加载
  currentVideoSubtitleIndex = -1;
  subtitleTimeMap.clear();
  
  try {
    // 如果字幕容器不存在，先创建容器
    if (!videoSubtitleContainer) {
      createVideoSubtitleContainer();
    } else {
      // 确保字幕容器可见
      videoSubtitleContainer.style.display = 'block';
    }
    
    // 显示加载状态
    if (videoSubtitleContainer) {
      videoSubtitleContainer.innerHTML = '<div class="transor-video-subtitle-wrapper no-translate"><div class="transor-video-subtitle-translated no-translate">正在加载字幕...</div></div>';
    }
    
    // 检测是否有进度条操作正在进行
    const video = document.querySelector('video');
    const isUserSeeking = video && video._userSeeking;
    const progressBar = document.querySelector('.ytp-progress-bar');
    const isProgressBarActive = progressBar && progressBar.classList.contains('ytp-progress-bar-hover');
    
    // 根据是否有用户操作决定是否强制刷新CC
    const shouldForceRefresh = !isUserSeeking && !isProgressBarActive;
    
    // 首先尝试开启CC字幕，根据情况决定是否强制刷新
    console.log('尝试开启CC字幕' + (shouldForceRefresh ? '并强制刷新' : ''));
    await enableCCSubtitles(shouldForceRefresh);
    
    // 等待一段时间让字幕加载
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 向background请求字幕URL
    const subtitleUrlResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { 
          action: 'getYouTubeSubtitleUrl',
          videoId: currentVideoId 
        },
        (response) => {
          resolve(response);
        }
      );
    });
    
    console.log('获取到的字幕URL响应:', subtitleUrlResponse);
    
    if (!subtitleUrlResponse || !subtitleUrlResponse.success || !subtitleUrlResponse.url) {
      throw new Error('未能获取字幕URL');
    }
    
    // 使用获取到的URL请求字幕
    const response = await fetchYouTubeSubtitles(subtitleUrlResponse.url);
    
    if (response && response.length > 0) {
      // 处理字幕
      const processedSubtitles = processSubtitlesSmartMerging(response);
      videoSubtitles = processedSubtitles;
      
      console.log(`成功加载${processedSubtitles.length}条字幕`);
      
      // 如果字幕加载成功，清除错误提示
      if (videoSubtitleContainer && videoSubtitleContainer.querySelector('.transor-video-subtitle-translated')) {
        videoSubtitleContainer.innerHTML = '';
      }
      
      // 翻译字幕
      await translateVideoSubtitles(processedSubtitles);
      
      // 如果已启用跟踪，重新启动
      if (videoSubtitleUpdateInterval) {
        clearInterval(videoSubtitleUpdateInterval);
        startVideoSubtitleTracking();
      } else {
        // 开始字幕跟踪
        startVideoSubtitleTracking();
      }
    } else {
      console.error('未能获取字幕数据');
      // 显示错误信息
      if (videoSubtitleContainer) {
        videoSubtitleContainer.innerHTML = '<div class="transor-video-subtitle-wrapper no-translate"><div class="transor-video-subtitle-translated no-translate">字幕加载失败</div></div>';
      }
    }
  } catch (error) {
    console.error('加载视频字幕失败:', error);
    // 显示错误信息
    if (videoSubtitleContainer) {
      videoSubtitleContainer.innerHTML = '<div class="transor-video-subtitle-wrapper no-translate"><div class="transor-video-subtitle-translated no-translate">字幕加载出错</div></div>';
    }
  }
}

// 构建字幕时间映射 - 不再使用，保留API兼容性
function buildSubtitleTimeMap() {
  // 函数保留，但实际不进行映射构建
  // console.log('不再使用字幕时间映射，使用直接匹配');
}

// 翻译视频字幕
async function translateVideoSubtitles(subtitlesToTranslate) {
  console.log('开始翻译视频字幕...');
  
  // 确保输入是有效的字幕数组
  if (!Array.isArray(subtitlesToTranslate) || subtitlesToTranslate.length === 0) {
    console.warn('没有字幕需要翻译');
    return Promise.resolve([]);
  }
  
  // 准备字幕文本数组
  const textsToTranslate = subtitlesToTranslate.map(subtitle => {
    return cleanTextThoroughly(subtitle.text || '');
  });
  
  console.log(`准备翻译${textsToTranslate.length}条字幕...`);
  
  // 使用Promise封装chrome.runtime.sendMessage
  return new Promise((resolve) => {
    try {
      // 发送翻译请求
      chrome.runtime.sendMessage(
        {
          action: 'translateTexts',
          texts: textsToTranslate,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome运行时错误:', chrome.runtime.lastError);
            // 使用模拟翻译作为备选
            const fallbackSubtitles = createFallbackTranslations(subtitlesToTranslate);
            videoTranslatedSubtitles = fallbackSubtitles;
            resolve(fallbackSubtitles);
            return;
          }
          
          if (response && response.success && Array.isArray(response.translations)) {
            // 合并翻译结果
            const translatedSubs = subtitlesToTranslate.map((subtitle, index) => {
              const translation = cleanTextThoroughly(response.translations[index] || subtitle.text || '');
              return {
                ...subtitle,
                translatedText: translation
              };
            });
            
            // 更新全局变量
            videoTranslatedSubtitles = translatedSubs;
            
            console.log('视频字幕翻译完成，共翻译', translatedSubs.length, '条字幕');
            
            // 如果当前有显示的字幕，立即更新显示
            if (currentVideoSubtitleIndex >= 0 && currentVideoSubtitleIndex < translatedSubs.length) {
              displayVideoSubtitle(currentVideoSubtitleIndex);
            }
            
            resolve(translatedSubs);
          } else {
            console.error('翻译请求失败或返回数据无效:', response);
            // 使用模拟翻译作为备选
            const fallbackSubtitles = createFallbackTranslations(subtitlesToTranslate);
            videoTranslatedSubtitles = fallbackSubtitles;
            resolve(fallbackSubtitles);
          }
        }
      );
    } catch (error) {
      console.error('翻译视频字幕失败:', error);
      // 使用模拟翻译作为备选
      const fallbackSubtitles = createFallbackTranslations(subtitlesToTranslate);
      videoTranslatedSubtitles = fallbackSubtitles;
      resolve(fallbackSubtitles);
    }
  });
}

// 创建备用翻译字幕（在翻译失败时使用）
function createFallbackTranslations(subtitles) {
  console.log('使用备用翻译机制');
  return subtitles.map((subtitle) => {
    // 为不同的语言类型文本创建简单的翻译
    let translatedText = '';
    const text = subtitle.text || '';
    
    // 创建一个简单的备用翻译
    if (text.length > 0) {
      translatedText = `[中文] ${text}`;
    }
    
    return {
      ...subtitle,
      translatedText: translatedText
    };
  });
}

// 开始视频字幕跟踪
function startVideoSubtitleTracking() {
  console.log('启动视频字幕跟踪');
  
  // 如果字幕功能被禁用，不启动跟踪
  if (!isTransorSubtitleEnabled) {
    console.log('字幕功能已禁用，不启动跟踪');
    return;
  }
  
  // 获取视频元素
  const video = document.querySelector('video');
  if (!video) {
    console.error('找不到视频元素，无法启动字幕跟踪');
    return;
  }
  
  // 清除现有的定时器
  if (videoSubtitleUpdateInterval) {
    clearInterval(videoSubtitleUpdateInterval);
    videoSubtitleUpdateInterval = null;
  }
  
  // 初始化视频元素的字幕事件监听器集合
  if (!video._subtitleEventListeners) {
    video._subtitleEventListeners = {};
    video._directTimer = null;
    video._rafId = null;
  } else {
    // 如果已有监听器，先移除
    if (video._subtitleEventListeners.timeupdate) {
      video.removeEventListener('timeupdate', video._subtitleEventListeners.timeupdate);
    }
    if (video._subtitleEventListeners.seeking) {
      video.removeEventListener('seeking', video._subtitleEventListeners.seeking);
    }
    if (video._subtitleEventListeners.seeked) {
      video.removeEventListener('seeked', video._subtitleEventListeners.seeked);
    }
    if (video._subtitleEventListeners.play) {
      video.removeEventListener('play', video._subtitleEventListeners.play);
    }
    if (video._subtitleEventListeners.pause) {
      video.removeEventListener('pause', video._subtitleEventListeners.pause);
    }
    
    // 清除定时器
    if (video._directTimer) {
      clearInterval(video._directTimer);
      video._directTimer = null;
    }
    
    // 取消动画帧
    if (video._rafId) {
      cancelAnimationFrame(video._rafId);
      video._rafId = null;
    }
  }
  
  // 使用RequestAnimationFrame作为主要更新机制
  const updateByRaf = () => {
    if (video && videoSubtitles.length > 0 && isTransorSubtitleEnabled) {
      updateVideoSubtitleByTime(video.currentTime);
      
      // 继续请求动画帧，但仅当字幕功能启用时
      if (isTransorSubtitleEnabled) {
        video._rafId = requestAnimationFrame(updateByRaf);
      }
    } else {
      // 如果条件不满足，停止RAF循环
      video._rafId = null;
    }
  };
  
  // 启动RAF
  if (videoSubtitles.length > 0 && isTransorSubtitleEnabled) {
    video._rafId = requestAnimationFrame(updateByRaf);
  }
  
  // 直接计时器作为第二种更新机制
  video._directTimer = setInterval(() => {
    if (video && videoSubtitles.length > 0 && isTransorSubtitleEnabled) {
      updateVideoSubtitleByTime(video.currentTime);
    }
  }, 50); // 每50毫秒更新一次，提供更高更新频率
  
  // 常规timeupdate事件作为第三种备份机制
  video._subtitleEventListeners.timeupdate = () => {
    if (videoSubtitles.length > 0 && isTransorSubtitleEnabled) {
      updateVideoSubtitleByTime(video.currentTime);
    }
  };
  
  // 跳转中事件 - 用户拖动进度条时清除字幕
  video._subtitleEventListeners.seeking = () => {
    clearVideoSubtitleDisplay();
  };
  
  // 跳转完成事件 - 跳转完成后立即更新字幕
  video._subtitleEventListeners.seeked = () => {
    if (videoSubtitles.length > 0 && isTransorSubtitleEnabled) {
      // 先清除当前字幕状态，强制重新计算
      currentVideoSubtitleIndex = -1;
      clearVideoSubtitleDisplay();
      
      // 立即更新一次，不延迟
      updateVideoSubtitleByTime(video.currentTime);
      
      // 额外触发一次更新，确保跳转后立即显示正确字幕
      setTimeout(() => {
        if (isTransorSubtitleEnabled) {
          updateVideoSubtitleByTime(video.currentTime);
        }
      }, 100);
    }
  };
  
  // 播放事件 - 恢复显示字幕
  video._subtitleEventListeners.play = () => {
    if (videoSubtitleContainer && isTransorSubtitleEnabled) {
      videoSubtitleContainer.style.display = 'block';
      updateVideoSubtitleByTime(video.currentTime);
      
      // 确保RAF正在运行
      if (!video._rafId && isTransorSubtitleEnabled) {
        video._rafId = requestAnimationFrame(updateByRaf);
      }
      
      // 确保直接定时器在运行
      if (!video._directTimer && isTransorSubtitleEnabled) {
        video._directTimer = setInterval(() => {
          if (isTransorSubtitleEnabled) {
            updateVideoSubtitleByTime(video.currentTime);
          }
        }, 50); // 每50毫秒更新一次
      }
    }
  };
  
  // 暂停事件 - 确保字幕正确显示但停止高频更新
  video._subtitleEventListeners.pause = () => {
    if (isTransorSubtitleEnabled) {
      updateVideoSubtitleByTime(video.currentTime);
      
      // 暂停时可以停止RAF以节省资源
      if (video._rafId) {
        cancelAnimationFrame(video._rafId);
        video._rafId = null;
      }
      
      // 同时停止直接定时器
      if (video._directTimer) {
        clearInterval(video._directTimer);
        video._directTimer = null;
      }
    }
  };
  
  // 添加事件监听
  video.addEventListener('timeupdate', video._subtitleEventListeners.timeupdate);
  video.addEventListener('seeking', video._subtitleEventListeners.seeking);
  video.addEventListener('seeked', video._subtitleEventListeners.seeked);
  video.addEventListener('play', video._subtitleEventListeners.play);
  video.addEventListener('pause', video._subtitleEventListeners.pause);
  
  // 设置定时器作为备用更新机制，确保字幕更新不会丢失
  // 降低频率到100毫秒，与RAF结合提供更稳定的更新
  videoSubtitleUpdateInterval = setInterval(() => {
    // 检查字幕功能是否启用
    if (!isTransorSubtitleEnabled) {
      // 如果已禁用，则停止计时器
      clearInterval(videoSubtitleUpdateInterval);
      videoSubtitleUpdateInterval = null;
      return;
    }
    
    if (video && videoSubtitles.length > 0 && isTransorSubtitleEnabled) {
      updateVideoSubtitleByTime(video.currentTime);
    }
  }, 100);
  
  // 初始显示字幕
  if (videoSubtitles.length > 0 && isTransorSubtitleEnabled) {
    updateVideoSubtitleByTime(video.currentTime);
  } else if (lastVideoId && isTransorSubtitleEnabled) {
    // 如果没有字幕数据但有视频ID，尝试加载字幕
    console.log('字幕数据为空，尝试加载字幕...');
    loadVideoSubtitles();
  }
  
  // 在开发者控制台提供调试指令
  console.log('视频字幕跟踪已启动，使用RAF+事件监听+定时器三重机制');
  console.log('提示: 设置 videoSubtitleContainer._debugEnabled = true 开启字幕调试模式');
  
  // 清理函数 - 用于在视频卸载时清理资源
  video._cleanupSubtitleTracking = () => {
    console.log('清理字幕跟踪资源');
    
    // 移除事件监听
    video.removeEventListener('timeupdate', video._subtitleEventListeners.timeupdate);
    video.removeEventListener('seeking', video._subtitleEventListeners.seeking);
    video.removeEventListener('seeked', video._subtitleEventListeners.seeked);
    video.removeEventListener('play', video._subtitleEventListeners.play);
    video.removeEventListener('pause', video._subtitleEventListeners.pause);
    
    // 清除定时器
    if (video._directTimer) {
      clearInterval(video._directTimer);
      video._directTimer = null;
    }
    
    // 取消动画帧
    if (video._rafId) {
      cancelAnimationFrame(video._rafId);
      video._rafId = null;
    }
    
    // 清空监听器集合
    video._subtitleEventListeners = {};
  };
  
  return video._cleanupSubtitleTracking;
}

// 根据时间更新视频字幕 - 使用影院模式逻辑重写
function updateVideoSubtitleByTime(currentTime) {
  // 检查必要条件
  if (!videoSubtitles || videoSubtitles.length === 0 || !isTransorSubtitleEnabled) {
    return;
  }
  
  try {
    // 在字幕更新前，确保时间映射是最新的
    buildSubtitleTimeMap();
    
    // 在每次更新前校准偏移量，提高精度
    calibrateSubtitleTiming();
    
    // 检测大幅度时间变化（视频跳转）
    const video = document.querySelector('video');
    if (video && video._lastCheckedTime !== undefined) {
      const timeDiff = Math.abs(currentTime - video._lastCheckedTime);
      // 如果时间差超过1秒，可能是用户手动跳转
      if (timeDiff > 1.0) {
        // 重置字幕状态
        currentVideoSubtitleIndex = -1;
        console.log(`检测到视频时间跳转: ${video._lastCheckedTime.toFixed(2)}s -> ${currentTime.toFixed(2)}s`);
      }
    }
    
    // 更新最后检查的时间
    if (video) {
      video._lastCheckedTime = currentTime;
    }
    
    // 时间戳处理和防抖
    const now = Date.now();
    
    // 调试信息 - 减少日志输出频率
    if (videoSubtitleContainer && videoSubtitleContainer._debugEnabled) {
      if (!video._lastLogTime || now - video._lastLogTime > 1000) {
        console.log(`当前时间: ${currentTime.toFixed(2)}秒, 查找匹配字幕...`);
        video._lastLogTime = now;
      }
    }
    
    // 字幕提前显示时间 - 小幅提前显示字幕，提高精准度
    const PREVIEW_TIME = 0.3; // 提前300毫秒显示字幕
    
    // 字幕切换防抖时间
    const DEBOUNCE_TIME = 0.05; // 50毫秒
    
    let foundIndex = -1;
    let closestStartTime = Infinity;
    let foundSubtitle = null;
    
    // 预排序字幕数组，如果尚未排序
    if (!video._subtitlesSorted) {
      // 按开始时间排序
      videoSubtitles.sort((a, b) => (a.start || 0) - (b.start || 0));
      video._subtitlesSorted = true;
      console.log('字幕已按时间排序，优化查找效率');
    }
    
    // 优先查找在时间范围内的字幕
    for (let i = 0; i < videoSubtitles.length; i++) {
      const subtitle = videoSubtitles[i];
      if (!subtitle || subtitle.start === undefined || subtitle.end === undefined) {
        continue;
      }
      
      // 判断当前时间是否落入字幕的时间范围内（包含提前量）
      if (currentTime >= subtitle.start - PREVIEW_TIME && currentTime <= subtitle.end) {
        // 如果当前时间在多个字幕的范围内，优先选择开始时间更接近的
        if (foundIndex === -1 || Math.abs(subtitle.start - currentTime) < Math.abs(videoSubtitles[foundIndex].start - currentTime)) {
          foundIndex = i;
          foundSubtitle = subtitle;
        }
      }
      
      // 记录最接近的即将到来的字幕
      if (subtitle.start > currentTime && subtitle.start < closestStartTime) {
        closestStartTime = subtitle.start;
      }
    }
    
    // 如果没有找到当前范围内的字幕，但找到了即将显示的字幕
    if (foundIndex === -1 && closestStartTime !== Infinity) {
      // 找到最接近的即将显示的字幕
      for (let i = 0; i < videoSubtitles.length; i++) {
        const subtitle = videoSubtitles[i];
        if (subtitle && subtitle.start === closestStartTime) {
          const timeToNext = subtitle.start - currentTime;
          
          // 如果非常接近下一个字幕，提前显示
          if (timeToNext > 0 && timeToNext < PREVIEW_TIME) {
            foundIndex = i;
            foundSubtitle = subtitle;
            if (videoSubtitleContainer && videoSubtitleContainer._debugEnabled) {
              console.log(`提前${timeToNext.toFixed(2)}秒显示字幕 #${foundIndex + 1}`);
            }
            break;
          }
        }
      }
    }
    
    // 检查是否找到了匹配的字幕
    if (foundIndex !== -1 && foundSubtitle) {
      // 检查是否需要更新显示
      if (foundIndex !== currentVideoSubtitleIndex) {
        // 防抖：检查上次切换时间，避免频繁切换
        const lastSwitchTime = video._lastSubtitleSwitchTime || 0;
        if (now - lastSwitchTime > DEBOUNCE_TIME * 1000) {
          // 计算字幕延迟时间
          const delay = currentTime - foundSubtitle.start;
          const delayStatus = delay >= 0 ? `延迟=${delay.toFixed(2)}s` : `提前=${(-delay).toFixed(2)}s`;
          
          if (videoSubtitleContainer && videoSubtitleContainer._debugEnabled) {
            console.log(`显示字幕 #${foundIndex + 1}/${videoSubtitles.length}: 起始=${foundSubtitle.start.toFixed(2)}s, 结束=${foundSubtitle.end.toFixed(2)}s, ${delayStatus}, 当前=${currentTime.toFixed(2)}s`);
          }
          
          // 更新显示字幕
          displayVideoSubtitle(foundIndex);
          currentVideoSubtitleIndex = foundIndex;
          
          // 更新最后切换时间
          video._lastSubtitleSwitchTime = now;
          video._lastSubtitleIndex = foundIndex;
        }
      }
    }
    // 如果当前有字幕显示，但当前时间超出了该字幕的结束时间，清除显示
    else if (currentVideoSubtitleIndex !== -1) {
      const currentSub = videoSubtitles[currentVideoSubtitleIndex];
      
      // 当前时间超出结束时间，清除字幕
      if (currentSub && currentSub.end !== undefined && currentTime > currentSub.end) {
        if (videoSubtitleContainer && videoSubtitleContainer._debugEnabled) {
          console.log(`清除字幕 #${currentVideoSubtitleIndex + 1}/${videoSubtitles.length}: 当前时间=${currentTime.toFixed(2)}s, 结束时间=${currentSub.end.toFixed(2)}s`);
        }
        
        clearVideoSubtitleDisplay();
        currentVideoSubtitleIndex = -1;
        
        // 记录下一个字幕的信息
        if (closestStartTime !== Infinity) {
          const timeToNext = closestStartTime - currentTime;
          if (videoSubtitleContainer && videoSubtitleContainer._debugEnabled) {
            console.log(`下一字幕在 ${timeToNext.toFixed(2)}秒后显示`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('更新字幕时出错:', error);
    // 出错时不改变字幕状态
  }
}

// 显示视频字幕
function displayVideoSubtitle(index) {
  // 检查字幕功能是否启用
  if (!isTransorSubtitleEnabled) {
    console.log('字幕功能已禁用，不显示字幕');
    return;
  }
  
  if (!videoSubtitleContainer || !videoSubtitles[index]) {
    return;
  }
  
  const subtitle = videoSubtitles[index];
  const translatedSubtitle = videoTranslatedSubtitles[index];
  
  let html = '<div class="transor-video-subtitle-wrapper no-translate">';
  html += '<div class="transor-drag-handle no-translate"></div>';
  
  // 处理字幕文本
  let originalText = cleanTextThoroughly(subtitle.text);
  
  // 处理翻译字幕文本
  let translatedText = '';
  if (translatedSubtitle && translatedSubtitle.translatedText) {
    translatedText = cleanTextThoroughly(translatedSubtitle.translatedText);
  }
  
  // 根据显示模式构建HTML
  if (subtitleDisplayMode === '双语字幕') {
    // 显示原文
    html += `<div class="transor-video-subtitle-original no-translate">${originalText}</div>`;
    
    // 显示翻译
    if (translatedSubtitle && translatedSubtitle.translatedText) {
      html += `<div class="transor-video-subtitle-translated no-translate">${translatedText}</div>`;
    } else {
      html += `<div class="transor-video-subtitle-translated no-translate">加载翻译中...</div>`;
    }
  } else if (subtitleDisplayMode === '仅原文') {
    html += `<div class="transor-video-subtitle-original no-translate">${originalText}</div>`;
  } else if (subtitleDisplayMode === '仅译文') {
    if (translatedSubtitle && translatedSubtitle.translatedText) {
      html += `<div class="transor-video-subtitle-translated no-translate">${translatedText}</div>`;
    } else {
      // 如果译文不存在，显示加载中提示，而不是完全不显示
      html += `<div class="transor-video-subtitle-translated no-translate">加载翻译中...</div>`;
    }
  }
  
  html += '</div>';
  videoSubtitleContainer.innerHTML = html;
}

// 清空视频字幕显示
function clearVideoSubtitleDisplay() {
  if (videoSubtitleContainer) {
    videoSubtitleContainer.innerHTML = '';
  }
}

// 更新视频字幕显示
function updateVideoSubtitleDisplay() {
  // 检查字幕功能是否启用
  if (!isTransorSubtitleEnabled) {
    console.log('字幕功能已禁用，不更新显示');
    return;
  }
  
  // 如果当前有字幕显示，重新显示
  if (currentVideoSubtitleIndex !== -1) {
    displayVideoSubtitle(currentVideoSubtitleIndex);
  }
  
  // 更新所有字幕的显示样式
  if (videoSubtitleContainer) {
    // 根据显示模式添加对应的CSS类
    const oldClasses = ['mode-bilingual', 'mode-original-only', 'mode-translation-only'];
    oldClasses.forEach(cls => videoSubtitleContainer.classList.remove(cls));
    
    if (subtitleDisplayMode === '双语字幕') {
      videoSubtitleContainer.classList.add('mode-bilingual');
    } else if (subtitleDisplayMode === '仅原文') {
      videoSubtitleContainer.classList.add('mode-original-only');
    } else if (subtitleDisplayMode === '仅译文') {
      videoSubtitleContainer.classList.add('mode-translation-only');
    }
    
    // 调试输出当前模式
    console.log('当前字幕显示模式:', subtitleDisplayMode);
  }
}

// 添加拖拽功能
function makeDraggable(element) {
  // 初始化变量
  let offset = { x: 0, y: 0 };
  
  // 尝试恢复保存的位置
  try {
    const savedPosition = localStorage.getItem('transor-subtitle-position');
    if (savedPosition) {
      offset = JSON.parse(savedPosition);
    }
  } catch (e) {
    console.error('恢复位置失败:', e);
  }
  
  // 应用初始位置
  applyPosition();
  
  // 定义拖拽所需函数
  function mouseDown(e) {
    // 检查是否点击在手柄或容器上
    const target = e.target;
    const isHandle = target.classList.contains('transor-drag-handle');
    const isWrapper = target.classList.contains('transor-video-subtitle-wrapper') || 
                      target.closest('.transor-video-subtitle-wrapper');
    
    if (!isHandle && !isWrapper) {
      return;
    }
    
    // 阻止默认行为和事件冒泡
    e.preventDefault();
    e.stopPropagation();
    
    // 记录初始鼠标位置
    const startX = e.clientX;
    const startY = e.clientY;
    
    // 记录初始偏移量
    const startOffset = { ...offset };
    
    // 添加移动和结束事件
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
    
    // 鼠标移动函数
    function mouseMove(e) {
      // 添加拖拽中样式
      element.classList.add('transor-dragging');
      
      // 计算鼠标移动距离
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // 更新偏移量（直接基于初始偏移量加上鼠标移动距离）
      offset.x = startOffset.x + dx;
      offset.y = startOffset.y + dy;
      
      // 应用边界限制
      const player = document.querySelector('#movie_player');
      if (player) {
        const playerRect = player.getBoundingClientRect();
        
        // 计算边界
        const maxX = playerRect.width / 2;
        const maxY = playerRect.height / 2;
        
        // 应用边界限制
        offset.x = Math.min(Math.max(offset.x, -maxX), maxX);
        offset.y = Math.min(Math.max(offset.y, -maxY), maxY);
      }
      
      // 应用位置
      applyPosition();
    }
    
    // 鼠标释放函数
    function mouseUp() {
      // 移除拖拽中样式
      element.classList.remove('transor-dragging');
      
      // 保存位置
      try {
        localStorage.setItem('transor-subtitle-position', JSON.stringify(offset));
      } catch (e) {
        console.error('保存位置失败:', e);
      }
      
      // 移除事件监听
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
    }
  }
  
  // 触摸开始事件
  function touchStart(e) {
    // 检查是否点击在手柄或容器上
    const target = e.target;
    const isHandle = target.classList.contains('transor-drag-handle');
    const isWrapper = target.classList.contains('transor-video-subtitle-wrapper') || 
                      target.closest('.transor-video-subtitle-wrapper');
    
    if (!isHandle && !isWrapper) {
      return;
    }
    
    if (e.touches.length !== 1) return;
    
    // 阻止默认行为和事件冒泡
    e.preventDefault();
    e.stopPropagation();
    
    // 记录初始触摸位置
    const startX = e.touches[0].clientX;
    const startY = e.touches[0].clientY;
    
    // 记录初始偏移量
    const startOffset = { ...offset };
    
    // 添加移动和结束事件
    document.addEventListener('touchmove', touchMove, { passive: false });
    document.addEventListener('touchend', touchEnd);
    
    // 触摸移动函数
    function touchMove(e) {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      
      // 添加拖拽中样式
      element.classList.add('transor-dragging');
      
      // 计算触摸移动距离
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      
      // 更新偏移量（直接基于初始偏移量加上触摸移动距离）
      offset.x = startOffset.x + dx;
      offset.y = startOffset.y + dy;
      
      // 应用边界限制
      const player = document.querySelector('#movie_player');
      if (player) {
        const playerRect = player.getBoundingClientRect();
        
        // 计算边界
        const maxX = playerRect.width / 2;
        const maxY = playerRect.height / 2;
        
        // 应用边界限制
        offset.x = Math.min(Math.max(offset.x, -maxX), maxX);
        offset.y = Math.min(Math.max(offset.y, -maxY), maxY);
      }
      
      // 应用位置
      applyPosition();
    }
    
    // 触摸结束函数
    function touchEnd() {
      // 移除拖拽中样式
      element.classList.remove('transor-dragging');
      
      // 保存位置
      try {
        localStorage.setItem('transor-subtitle-position', JSON.stringify(offset));
      } catch (e) {
        console.error('保存位置失败:', e);
      }
      
      // 移除事件监听
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', touchEnd);
    }
  }
  
  // 应用位置的函数
  function applyPosition() {
    element.style.position = 'absolute';
    element.style.left = '50%';
    element.style.bottom = '60px';
    element.style.transform = `translateX(-50%) translate(${offset.x}px, ${offset.y}px)`;
  }
  
  // 移除之前的事件监听器
  element.removeEventListener('mousedown', element._mouseDownHandler);
  element.removeEventListener('touchstart', element._touchStartHandler);
  
  // 保存新的监听器引用
  element._mouseDownHandler = mouseDown;
  element._touchStartHandler = touchStart;
  
  // 添加事件监听器
  element.addEventListener('mousedown', mouseDown);
  element.addEventListener('touchstart', touchStart, { passive: false });
  
  // 确保拖拽手柄存在
  ensureDragHandle();
  
  // 确保拖拽手柄存在的函数
  function ensureDragHandle() {
    // 为子元素添加事件委托
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          const wrapper = element.querySelector('.transor-video-subtitle-wrapper');
          if (wrapper) {
            wrapper.style.cursor = 'move';
            
            // 确保有拖拽手柄
            if (!wrapper.querySelector('.transor-drag-handle')) {
              const dragHandle = document.createElement('div');
              dragHandle.className = 'transor-drag-handle';
              if (wrapper.firstChild) {
                wrapper.insertBefore(dragHandle, wrapper.firstChild);
              } else {
                wrapper.appendChild(dragHandle);
              }
            }
          }
        }
      });
    });
    
    // 立即检查一次
    const wrapper = element.querySelector('.transor-video-subtitle-wrapper');
    if (wrapper) {
      wrapper.style.cursor = 'move';
      if (!wrapper.querySelector('.transor-drag-handle')) {
        const dragHandle = document.createElement('div');
        dragHandle.className = 'transor-drag-handle';
        if (wrapper.firstChild) {
          wrapper.insertBefore(dragHandle, wrapper.firstChild);
        } else {
          wrapper.appendChild(dragHandle);
        }
      }
    }
    
    // 开始观察子元素变化
    observer.observe(element, { childList: true, subtree: true });
  }
}

// 校准字幕时间偏移 - 不再使用，保留API兼容性
function calibrateSubtitleTiming() {
  // 函数保留，但实际不进行偏移计算
  // console.log('不再使用时间偏移校准，使用直接匹配');
}

// 更新字幕样式
function updateSubtitleStyle() {
  // 如果当前有字幕显示，更新样式
  if (videoSubtitleContainer) {
    // 先移除所有样式类
    const styleClasses = [
      'subtitle-style-default',
      'subtitle-style-translucent',
      'subtitle-style-light',
      'subtitle-style-nobg',
      'subtitle-style-bold'
    ];
    
    styleClasses.forEach(cls => videoSubtitleContainer.classList.remove(cls));
    
    // 根据当前样式添加对应的类
    let classToAdd;
    switch (subtitleStyle) {
      case '半透明':
        classToAdd = 'subtitle-style-translucent';
        break;
      case '浅色模式':
        classToAdd = 'subtitle-style-light';
        break;
      case '无背景':
        classToAdd = 'subtitle-style-nobg';
        break;
      case '醒目':
        classToAdd = 'subtitle-style-bold';
        break;
      default:
        classToAdd = 'subtitle-style-default';
        break;
    }
    
    videoSubtitleContainer.classList.add(classToAdd);
    console.log('应用字幕样式:', classToAdd);
    
    // 如果当前有字幕显示，刷新显示
    if (currentVideoSubtitleIndex !== -1) {
      displayVideoSubtitle(currentVideoSubtitleIndex);
    }
  }
}

// 添加新函数: 启动按钮轮询器
function startButtonPoller() {
  console.log('启动按钮轮询器，确保按钮加载');
  
  // 轮询配置
  const pollerConfig = {
    intervalTime: 2000,    // 轮询间隔时间(毫秒)
    maxAttempts: 10,       // 最大尝试次数
    currentAttempt: 0,     // 当前尝试次数
    pollerId: null,        // 轮询器ID
    isRunning: false       // 是否正在运行
  };
  
  // 轮询函数
  const pollForButton = () => {
    // 已达最大尝试次数，停止轮询
    if (pollerConfig.currentAttempt >= pollerConfig.maxAttempts) {
      console.log('已达最大轮询次数，停止按钮轮询');
      stopPoller();
      return;
    }
    
    // 检查是否是视频页面
    if (!isEnhancedYouTubeVideoPage()) {
      console.log('不是视频页面，停止按钮轮询');
      stopPoller();
      return;
    }
    
    // 检查按钮是否已存在
    if (document.getElementById('cinema-mode-btn')) {
      console.log('影院模式按钮已存在，停止轮询');
      stopPoller();
      return;
    }
    
    // 增加尝试次数
    pollerConfig.currentAttempt++;
    console.log(`轮询检测按钮 (${pollerConfig.currentAttempt}/${pollerConfig.maxAttempts})...`);
    
    // 尝试添加按钮
    const rightControls = document.querySelector('.ytp-right-controls');
    if (rightControls) {
      console.log('找到控制栏，添加影院模式按钮');
      addCinemaButton();
      
      // 按钮已添加，等待验证
      setTimeout(() => {
        if (document.getElementById('cinema-mode-btn')) {
          console.log('验证按钮已成功添加，停止轮询');
          stopPoller();
        } else {
          console.log('按钮添加失败，继续轮询');
        }
      }, 500);
    }
  };
  
  // 停止轮询函数
  const stopPoller = () => {
    if (pollerConfig.pollerId) {
      clearInterval(pollerConfig.pollerId);
      pollerConfig.pollerId = null;
      pollerConfig.isRunning = false;
      console.log('按钮轮询器已停止');
    }
  };
  
  // 防止重复启动
  if (pollerConfig.isRunning) {
    console.log('按钮轮询器已在运行中');
    return;
  }
  
  // 立即执行一次
  pollForButton();
  
  // 启动定期轮询
  pollerConfig.pollerId = setInterval(pollForButton, pollerConfig.intervalTime);
  pollerConfig.isRunning = true;
  console.log('按钮轮询器已启动');
}