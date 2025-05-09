/**
 * Transor - 沉浸式翻译 内容脚本
 * 在网页中执行，处理实际的翻译逻辑
 */

// 翻译状态变量
let translationSettings = {
  isEnabled: false,
  targetLanguage: 'zh-CN',
  sourceLanguage: 'auto',
  translationEngine: 'google',
  translationStyle: 'tip',
  excludedTags: ['code', 'pre', 'script', 'style'],
  excludedClasses: ['no-translate'],
  customCss: '',
  enableSelectionTranslator: true
};

// 翻译缓存
const translationCache = {};

// 存储已处理的节点，避免重复处理
let processedNodes = new WeakSet();

// 用于观察元素可见性的Intersection Observer
let visibilityObserver = null;


// 翻译队列系统
const translationQueue = {
  pendingTexts: new Map(), // 待翻译的文本映射: 文本 -> 回调数组
  isProcessing: false,     // 是否正在处理队列
  batchSize: 100,           // 批处理大小
  debounceTime: 300,       // 防抖时间(毫秒)
  debounceTimer: null,     // 防抖定时器

  // 添加文本到翻译队列
  add(text, callback) {
    if (!text || text.length <= 1) return;
    
    // 检查缓存
    const cacheKey = `${translationSettings.targetLanguage}:${translationSettings.translationEngine}:${text}`;
    if (translationCache[cacheKey] !== undefined) {
      // 缓存命中，直接回调
      callback(translationCache[cacheKey]);
      return;
    }
    
    // 添加到队列
    if (!this.pendingTexts.has(text)) {
      this.pendingTexts.set(text, []);
    }
    this.pendingTexts.get(text).push(callback);
    
    // 设置防抖处理，避免频繁请求
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.process();
    }, this.debounceTime);
  },
  
  // 处理翻译队列
  async process() {
    if (this.isProcessing || this.pendingTexts.size === 0) return;
    
    this.isProcessing = true;
    
    try {
      // 从队列中提取待翻译文本
      const textsToTranslate = Array.from(this.pendingTexts.keys());
      console.log(`处理翻译队列: ${textsToTranslate.length} 条唯一文本`);
      
      // 过滤掉看起来像代码的文本
      const filteredTexts = [];
      const codeTexts = [];
      
      textsToTranslate.forEach(text => {
        if (looksLikeCode(text)) {
          console.log('跳过代码翻译:', text);
          codeTexts.push(text);
        } else {
          filteredTexts.push(text);
        }
      });
      
      // 处理源语言检测
      let sourceLanguage = translationSettings.sourceLanguage;
      
      // 分批处理翻译请求
      for (let i = 0; i < filteredTexts.length; i += this.batchSize) {
        const batch = filteredTexts.slice(i, i + this.batchSize);
        
        console.log(batch, "batch")
        // 发送批量翻译请求
        try {
          const translations = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: 'translateTexts',
              texts: batch,
              sourceLanguage: sourceLanguage,
              targetLanguage: translationSettings.targetLanguage,
              engine: translationSettings.translationEngine || 'google'
            }, response => {
              if (response && response.success && response.translations) {

                console.log(response, "responseresponse")
                resolve(response.translations);
              } else {
                console.warn('批量翻译失败:', response?.error);
                resolve(batch); // 失败时返回原文
              }
            });
          });
          
          // 更新缓存并执行回调
          batch.forEach((text, index) => {
            const translation = translations[index] || text;
            const cacheKey = `${sourceLanguage}:${translationSettings.targetLanguage}:${translationSettings.translationEngine}:${text}`;
            
            // 输出日志以便调试
            console.log(`翻译结果 - 原文: [${text}], 译文: [${translation}]`);
            
            // 更新缓存
            translationCache[cacheKey] = translation;
            
            // 执行所有关联的回调
            const callbacks = this.pendingTexts.get(text) || [];
            callbacks.forEach(callback => callback(translation));
            
            // 从队列中移除已处理文本
            this.pendingTexts.delete(text);
          });
          
          // 控制请求速率
          if (i + this.batchSize < filteredTexts.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error('批次翻译出错:', error);
          
          // 出错时用原文作为翻译结果
          batch.forEach(text => {
            const callbacks = this.pendingTexts.get(text) || [];
            callbacks.forEach(callback => callback(text));
            this.pendingTexts.delete(text);
          });
        }
      }
      
      // 处理代码文本
      codeTexts.forEach(text => {
        const callbacks = this.pendingTexts.get(text) || [];
        callbacks.forEach(callback => callback(text)); // 代码返回原文作为结果
        this.pendingTexts.delete(text);
      });
    } finally {
      this.isProcessing = false;
      
      // 检查队列是否仍有文本待处理
      if (this.pendingTexts.size > 0) {
        console.log(`队列中还有 ${this.pendingTexts.size} 条文本待处理，继续处理...`);
        setTimeout(() => this.process(), 100);
      }
    }
  }
};

// 初始化
async function init() {
  console.log('Transor 内容脚本已加载');
  
  // 初始化全局tip系统
  setupGlobalTipSystem();
  
  // 加载设置
  await loadSettings();
  
  // 注入样式
  injectStyles();
  
  // 初始化Intersection Observer
  initIntersectionObserver();
  
  // 初始化滑词翻译功能
  initSelectionTranslator();
  
  // 添加消息监听器处理快捷键
  setupMessageListeners();
  
  // 添加对全局切换事件的监听
  setupGlobalEventListeners();
  
  // 自动翻译（如果启用）
  if (translationSettings.isEnabled) {
    setTimeout(() => {
      translateVisibleContent();
    }, 1000); // 延迟1秒，等待页面完全加载
  }
}

// 初始化Intersection Observer
function initIntersectionObserver() {
  visibilityObserver = new IntersectionObserver((entries) => {
    if (!translationSettings.isEnabled) return;
    
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 元素进入视口，翻译该元素内的文本
        translateElement(entry.target);
        // 已处理的元素不再需要观察
        visibilityObserver.unobserve(entry.target);
      }
    });
  }, {
    root: null, // 相对于视口
    rootMargin: '100px', // 提前100px开始处理，使滚动更平滑
    threshold: 0.1 // 当元素10%可见时触发
  });
}

// 加载设置
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (result) => {
      if (result.isEnabled !== undefined) translationSettings.isEnabled = result.isEnabled;
      if (result.targetLanguage) translationSettings.targetLanguage = result.targetLanguage;
      if (result.sourceLanguage) translationSettings.sourceLanguage = result.sourceLanguage;
      if (result.translationEngine) translationSettings.translationEngine = result.translationEngine;
      if (result.translationStyle) translationSettings.translationStyle = result.translationStyle;
      if (result.excludedTags) translationSettings.excludedTags = result.excludedTags;
      if (result.excludedClasses) translationSettings.excludedClasses = result.excludedClasses;
      if (result.customCss) translationSettings.customCss = result.customCss;
      
      console.log('已加载翻译设置:', translationSettings);
      resolve();
    });
  });
}

// 注入样式
function injectStyles() {
  // 创建CSS样式
  const style = document.createElement('style');
  style.id = 'transor-styles';
  
  let css = `
    .transor-translation {
      font-size: inherit;
      line-height: inherit;
    }
    
    .transor-inline {
      border-bottom: 1px dashed #42b983;
      padding: 0 2px;
      margin: 0 2px;
      color: #42b983;
    }
    
    .transor-bilingual {
      display: block;
      color: #42b983;
      margin-top: 3px;
      padding-left: 10px;
      border-left: 2px solid #42b983;
    }
    
    .transor-below {
      display: block;
      color: #42b983;
      margin-top: 5px;
      padding-left: 10px;
      border-left: 2px solid #42b983;
    }
    
    .transor-hover {
      position: relative;
      text-decoration: underline;
      text-decoration-style: dotted;
      text-decoration-color: #42b983;
    }
    
    .transor-hover-content {
      display: none;
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-radius: 3px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 8px;
      z-index: 9999;
      color: #333;
      top: 100%;
      left: 0;
      min-width: 200px;
      max-width: 300px;
    }
    
    .transor-hover:hover .transor-hover-content {
      display: block;
    }
    
    /* 导航和小空间元素的翻译提示样式 - 基本样式，详细样式由全局系统提供 */
    .transor-tip {
      position: relative;
      display: inline-block;
      cursor: pointer;
      border-bottom: 1px dotted #42b983;
    }
  `;
  
  // 添加自定义CSS
  if (translationSettings.customCss) {
    css += '\n' + translationSettings.customCss;
  }
  
  style.textContent = css;
  
  // 删除之前存在的样式
  const oldStyle = document.getElementById('transor-styles');
  if (oldStyle) {
    oldStyle.remove();
    // 添加一个短暂的延迟，确保浏览器完成DOM更新
    setTimeout(() => {
      document.head.appendChild(style);
    }, 50);
  } else {
    document.head.appendChild(style);
  }
}

// 翻译当前可见的内容
function translateVisibleContent() {
  if (!translationSettings.isEnabled) {
    console.log('翻译已禁用');
    return;
  }
  
  console.log('开始翻译可见内容');
  
  // 获取所有主要容器元素（段落、标题、div等）
  const containers = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span, li, td, th');
  
  // 观察所有容器元素
  containers.forEach(container => {
    // 过滤掉已经处理过或者不需要翻译的元素
    if (!shouldTranslateElement(container)) return;
    
    // 标记为已处理
    processedNodes.add(container);
    
    // 添加到观察列表
    visibilityObserver.observe(container);
    
    // 如果元素已经在视口中，立即翻译
    if (isElementInViewport(container)) {
      translateElement(container);
      visibilityObserver.unobserve(container);
    }
  });
}

// 检查元素是否为代码或脚本相关元素
function isCodeElement(element) {
  if (!element) return false;
  
  // 处理文本节点
  if (element.nodeType === Node.TEXT_NODE) {
    if (!element.parentNode) return false;
    element = element.parentNode;
  }

  try {
    // 检查标签名
    const codeTags = ['code', 'pre', 'script', 'style', 'svg', 'math', 'canvas'];
    if (element.tagName && codeTags.includes(element.tagName.toLowerCase())) {
      return true;
    }
    
    // 检查类名是否包含代码相关关键词
    const codeKeywords = ['code', 'script', 'syntax', 'highlight', 'editor', 'terminal', 'console'];
    if (element.className && typeof element.className === 'string') {
      for (const keyword of codeKeywords) {
        if (element.className.toLowerCase().includes(keyword)) {
          return true;
        }
      }
    }

    // 检查ID
    if (element.id && typeof element.id === 'string') {
      for (const keyword of codeKeywords) {
        if (element.id.toLowerCase().includes(keyword)) {
          return true;
        }
      }
    }
    
    // 如果内容看起来像代码（包含特定符号和格式）
    const text = element.textContent || '';
    if (text) {
      // 检查是否包含代码特征
      const codePatterns = [
        // /function\s+\w+\s*\(/i,              // 函数声明
        // /const|let|var\s+\w+\s*=/i,          // 变量声明
        // /if\s*\(.+\)\s*{/i,                  // if语句
        // /for\s*\(.+\)\s*{/i,                 // for循环
        // /while\s*\(.+\)\s*{/i,               // while循环
        // /class\s+\w+/i,                      // 类声明
        // /import\s+.*\s+from/i,               // import语句
        // /export\s+/i,                        // export语句
        // /<\/?[a-z][\s\S]*>/i,                // HTML标签
        // /\$\(.+\)\./i,                       // jQuery代码
        // /console\.log/i,                     // 控制台输出
        // /\w+\s*\.\s*\w+\s*\(/i,              // 方法调用
        // /return\s+.+;/i                      // return语句
      ];
      
      for (const pattern of codePatterns) {
        if (pattern.test(text)) {
          return true;
        }
      }
    }
    
    // 检查父元素是否是代码元素
    let parent = element.parentElement;
    if (parent) {
      if (codeTags.includes(parent.tagName.toLowerCase())) {
        return true;
      }
      
      // 向上检查两层
      parent = parent.parentElement;
      if (parent && codeTags.includes(parent.tagName.toLowerCase())) {
        return true;
      }
    }
  } catch (error) {
    return false;
  }
  
  return false;
}

// 检查元素是否应该被翻译
function shouldTranslateElement(element) {
  // 已处理过的元素不再处理
  if (processedNodes.has(element)) return false;
  
  // 检查元素是否在排除的标签中
  const excludedTagsSet = new Set(translationSettings.excludedTags);
  if (excludedTagsSet.has(element.tagName.toLowerCase())) return false;
  
  // 检查元素是否有排除的类名
  const excludedClassesSet = new Set(translationSettings.excludedClasses);
  if (element.classList && element.classList.length > 0) {
    for (const cls of element.classList) {
      if (excludedClassesSet.has(cls)) return false;
      // 特别排除no-translate类
      if (cls === 'no-translate') return false;
    }
  }
  
  // 检查是否是tip弹出框
  if (element.classList && element.classList.contains('transor-tip-popup')) {
    return false;
  }
  
  // 检查是否在tip弹出框内部
  if (element.closest && element.closest('.transor-tip-popup')) {
    return false;
  }
  
  // 检查是否已经翻译过
  if (element.classList.contains('transor-translation') || element.closest('.transor-translation')) {
    return false;
  }
  
  // 检查元素是否有文本内容
  const textContent = element.textContent.trim();
  if (!textContent || textContent.length <= 1) return false;
  
  // 检查是否是代码元素
  if (isCodeElement(element)) return false;
  
  return true;
}

// 检查元素是否在视口中
function isElementInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) + 100 &&
    rect.bottom >= -100 &&
    rect.left <= (window.innerWidth || document.documentElement.clientWidth) + 100 &&
    rect.right >= -100
  );
}

// 判断元素是否需要使用悬浮提示样式（内容放不下的小元素或导航菜单）
function needsTipStyle(element, text, translation) {
  // 确保我们有元素和文本
  if (!element || !text || !translation) return false;
  
  try {
    // 如果元素是文本节点，使用父节点
    if (element.nodeType === Node.TEXT_NODE) {
      if (!element.parentNode) return false;
      element = element.parentNode;
    }
    
    // ===== 0. 检查相同行的其他元素 =====
    // 如果已经有使用tip样式的相邻元素，则当前元素也应该使用tip
    const parentElement = element.parentElement;
    if (parentElement) {
      // 获取直接兄弟节点
      const siblings = Array.from(parentElement.childNodes);
      
      // 检查是否有兄弟节点已使用tip样式
      for (const sibling of siblings) {
        if (sibling !== element && 
            sibling.nodeType === Node.ELEMENT_NODE && 
            (sibling.classList && sibling.classList.contains('transor-tip'))) {
          return true; // 同行有元素使用tip样式，当前元素也用tip
        }
      }
      
      // 更广泛的检查 - 检查同一行的所有相关元素
      if (typeof element.getBoundingClientRect === 'function') {
        const rect = element.getBoundingClientRect();
        const elementY = rect.top;
        const yThreshold = 5; // 判断是否同一行的高度阈值（像素）
        
        // 查找页面中所有已翻译的元素
        const allTranslatedElements = document.querySelectorAll('.transor-translation');
        for (const translatedElem of allTranslatedElements) {
          if (translatedElem !== element && translatedElem.classList.contains('transor-tip')) {
            const otherRect = translatedElem.getBoundingClientRect();
            // 如果Y坐标接近，认为是同一行
            if (Math.abs(otherRect.top - elementY) < yThreshold) {
              return true; // 同一行有使用tip样式的元素
            }
          }
        }
      }
    }
    
    // ===== 1. 元素尺寸检查 =====
    let elementWidth = 0;
    let elementHeight = 0;
    let isVerySmall = false;
    
    if (typeof element.getBoundingClientRect === 'function') {
      try {
        const rect = element.getBoundingClientRect();
        elementWidth = rect.width;
        elementHeight = rect.height;
        
        // 小元素检测: 宽度小于120px
        if (elementWidth < 120) {
          isVerySmall = true;
        }
      } catch (e) {
        // 忽略获取尺寸的错误
      }
    }
    
    // ===== 2. 翻译内容空间评估 =====
    let contentTooLarge = false;
    if (typeof element.getBoundingClientRect === 'function' && typeof document.createElement === 'function') {
      try {
        // 创建测试元素估算翻译文本所需空间
        const tempElement = document.createElement('div');
        tempElement.style.position = 'absolute';
        tempElement.style.visibility = 'hidden';
        tempElement.style.left = '-9999px';
        tempElement.style.width = 'auto';
        tempElement.style.whiteSpace = 'normal'; // 允许换行
        tempElement.style.fontSize = window.getComputedStyle(element).fontSize;
        tempElement.style.fontFamily = window.getComputedStyle(element).fontFamily;
        tempElement.style.lineHeight = window.getComputedStyle(element).lineHeight;
        tempElement.style.maxWidth = elementWidth + 'px'; // 设置最大宽度等于元素宽度
        tempElement.textContent = translation;
        
        // 添加到DOM中进行测量
        document.body.appendChild(tempElement);
        const translationRect = tempElement.getBoundingClientRect();
        
        // 如果翻译后文本高度明显超过原始元素高度
        if (translationRect.height > elementHeight * 1.8) {
          contentTooLarge = true;
        }
        
        // 如果翻译后文本宽度接近或超过原始元素宽度
        if (translationRect.width > elementWidth * 0.9 && elementWidth < 350) {
          contentTooLarge = true;
        }
        
        document.body.removeChild(tempElement);
      } catch (e) {
        console.error('测量翻译空间时出错:', e);
      }
    }
    
    // ===== 3. 导航元素识别（导航栏、菜单、页脚等）=====
    
    // 为导航和页脚识别准备更广泛的标识符列表
    const navIdentifiers = [
      'nav', 'navigation', 'menu', 'header', 'toolbar', 'topbar', 'navbar', 
      'sidebar', 'side-nav', 'sidenav', 'tabs', 'tab-nav',
      'footer', 'foot', 'bottom', 'copyright', 'site-info',
      'breadcrumb', 'pagination', 'pager'
    ];
    
    // 为侧边导航识别准备标识符
    const sideNavIdentifiers = [
      'sidebar', 'side-nav', 'sidenav', 'left-nav', 'right-nav',
      'drawer', 'toc', 'table-of-content', 'tree-nav', 'vertical-nav'
    ];
    
    let isInNav = false;          // 导航
    let isInFooter = false;       // 页脚
    let isInSideNav = false;      // 侧边导航
    let isInCompactLayout = false; // 紧凑布局
    
    // 向上遍历DOM树，最多检查4层
    let currentElement = element;
    for (let i = 0; i < 4 && currentElement; i++) {
      if (!currentElement.tagName) {
        currentElement = currentElement.parentElement;
        continue;
      }
      
      // 标签检查
      const tag = currentElement.tagName.toLowerCase();
      
      // 导航类标签直接识别
      if (['nav', 'header', 'menu', 'ul', 'ol', 'footer'].includes(tag)) {
        isInNav = true;
        
        // 特殊标签单独识别
        if (tag === 'footer') {
          isInFooter = true;
        }
      }
      
      // 检查当前元素是否为垂直导航列表项
      if (tag === 'li' && currentElement.parentElement) {
        const parentTag = currentElement.parentElement.tagName.toLowerCase();
        if (parentTag === 'ul' || parentTag === 'ol') {
          // 检查列表的样式和定位，确定是否是侧边导航
          const listStyles = window.getComputedStyle(currentElement.parentElement);
          const isVertical = listStyles.display === 'block' || 
                             listStyles.flexDirection === 'column' ||
                             listStyles.display === 'flex' && listStyles.flexDirection === 'column';
          
          if (isVertical) {
            isInSideNav = true;
            isInCompactLayout = true;
          }
        }
      }
      
      // 获取类名和ID供检查
      const className = currentElement.className || '';
      const id = currentElement.id || '';
      
      // 横向排版检测：使用flex或grid的横向布局
      try {
        const styles = window.getComputedStyle(currentElement);
        if (styles.display === 'flex' && styles.flexDirection === 'row') {
          isInCompactLayout = true;
        }
        
        if (styles.display === 'grid') {
          const gridColumns = styles.gridTemplateColumns;
          // 如果有多列，认为是横向排版
          if (gridColumns && gridColumns.split(' ').length > 1) {
            isInCompactLayout = true;
          }
        }
      } catch (e) {
        // 忽略样式获取错误
      }
      
      // 通过ID和类名检查导航相关元素
      for (const identifier of navIdentifiers) {
        if ((typeof className === 'string' && className.toLowerCase().includes(identifier)) ||
            (typeof id === 'string' && id.toLowerCase().includes(identifier))) {
          isInNav = true;
          
          // 页脚特殊检测
          if (identifier === 'footer' || identifier === 'foot' || identifier === 'copyright' || 
              identifier === 'site-info' || identifier === 'bottom') {
            isInFooter = true;  
          }
          
          // 侧边导航特殊检测
          if (sideNavIdentifiers.includes(identifier)) {
            isInSideNav = true;
          }
          
          break;
        }
      }
      
      // 检查位置：页脚通常在页面底部
      if (currentElement.getBoundingClientRect) {
        const rect = currentElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        // 如果元素底部接近视口底部，可能是页脚
        if (rect.bottom > viewportHeight * 0.8) {
          // 进一步检查是否包含典型页脚文本
          const text = currentElement.textContent.toLowerCase();
          if (text.includes('copyright') || text.includes('©') || 
              text.includes('rights reserved') || text.includes('隐私') || 
              text.includes('条款') || text.includes('联系') || 
              text.includes('备案')) {
            isInFooter = true;
          }
        }
      }
      
      // 检查子元素数量，判断是否为紧凑布局
      if (currentElement.children && currentElement.children.length > 4) {
        // 如果有多个子元素且排列紧凑，可能是导航或菜单
        isInCompactLayout = true;
      }
      
      // 移至父元素
      currentElement = currentElement.parentElement;
    }
    
    // ===== 4. 决策逻辑 =====
    
    // 1. 非常小的元素总是使用提示样式
    if (isVerySmall) {
      return true;
    }
    
    // 2. 页脚元素总是使用提示样式
    if (isInFooter) {
      return true;
    }
    
    // 3. 侧边导航使用提示样式
    if (isInSideNav) {
      return true;
    }
    
    // 4. 导航元素，如果内容较多则使用提示样式
    if (isInNav && (contentTooLarge || elementWidth < 150)) {
      return true;
    }
    
    // 5. 水平紧凑布局中的元素，如果内容较多则使用提示样式
    if (isInCompactLayout && contentTooLarge) {
      return true;
    }
    
    // 6. 特定的导航元素标签
    if (element.tagName) {
      const tag = element.tagName.toLowerCase();
      // 链接或按钮，如果内容较多且宽度有限，则使用提示样式
      if ((tag === 'a' || tag === 'button') && (contentTooLarge || elementWidth < 180)) {
        return true;
      }
      
      // 列表项在紧凑布局中使用提示样式
      if (tag === 'li' && isInCompactLayout) {
        return true;
      }
      
      // 标记为导航角色的元素
      if (element.getAttribute('role') === 'navigation' || 
          element.getAttribute('role') === 'menu' ||
          element.getAttribute('role') === 'menuitem') {
        return true;
      }
    }
    
    // 默认尽量使用below样式
    return false;
  } catch (error) {
    console.error('检查元素是否需要提示样式时出错:', error);
    return false;
  }
}

// 翻译单个元素
async function translateElement(element) {
  // 获取元素中所有文本节点
  const textNodes = getTextNodesIn(element);
  if (textNodes.length === 0) return;
  
  // 提取文本内容
  const textContents = textNodes.map(node => node.textContent.trim())
    .filter(text => text && text.length > 1);
  
  if (textContents.length === 0) return;

  console.log(textContents, "textContents")

  
  // 当前选择的翻译样式
  const currentStyle = translationSettings.translationStyle;
  
  // 是否为提示模式（tip）
  const isTipMode = currentStyle === 'tip';
  // 是否为悬浮模式（hover）
  const isHoverMode = currentStyle === 'hover';
  
  try {
    // 使用Promise.all同时处理所有文本翻译
    const translationPromises = textContents.map((text, index) => {
      return new Promise(resolve => {
        // 添加到翻译队列
        translationQueue.add(text, translation => {
          resolve({ index, translation });
        });
      });
    });
    
    // 等待所有翻译完成
    const results = await Promise.all(translationPromises);
    
    // 应用翻译结果
    results.forEach(({ index, translation }) => {
      const node = textNodes[index];
      const text = textContents[index];
      console.log(node, translation, "translation")
      if (node && translation) {
        console.log(`应用翻译 - 节点: ${node.textContent}, 译文: ${translation}`);
        console.log(isTipMode, "isTipMode")
        console.log(translation, "translation")
        // 如果是提示模式，根据元素情况智能应用样式
        if (isTipMode) {
          // 检查是否需要提示样式
          if (needsTipStyle(node, text, translation)) {
            // 使用tip样式
            applyTranslation(node, text, translation, 'tip');
          } else {
            // 使用below样式（双语下方样式）
            applyTranslation(node, text, translation, 'below');
          }
        } else if (isHoverMode) {
          // 悬浮模式直接使用hover样式
          applyTranslation(node, text, translation, 'hover');
        } else {
          // 其他模式使用用户选择的样式
          applyTranslation(node, text, translation);
        }
      }
    });
  } catch (error) {
    console.error('翻译元素时出错:', error);
  }
}

// 获取元素中的所有文本节点
function getTextNodesIn(element) {
  const textNodes = [];
  const excludedTagsSet = new Set(translationSettings.excludedTags);
  
  // 递归遍历DOM树
  function walkTextNodes(node) {
    // 文本节点
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text && text.length > 1) {
        let parent = node.parentElement;
        
        // 检查是否在排除的标签中
        if (parent && !excludedTagsSet.has(parent.tagName.toLowerCase())) {
          // 检查是否有排除的类名
          let shouldExclude = false;
          const excludedClassesSet = new Set(translationSettings.excludedClasses);
          if (parent.classList && parent.classList.length > 0 && excludedClassesSet.size > 0) {
            for (const cls of parent.classList) {
              if (excludedClassesSet.has(cls)) {
                shouldExclude = true;
                break;
              }
            }
          }
          
          // 检查是否已经翻译过
          const isAlreadyTranslated = parent.classList.contains('transor-translation') || 
                                   parent.closest('.transor-translation');
          
          // 检查是否是代码元素
          const isCode = isCodeElement(parent) || isCodeElement(node);
          
          if (!shouldExclude && !isAlreadyTranslated && !isCode) {
            textNodes.push(node);
          }
        }
      }
      return;
    }
    
    // 元素节点
    if (node.nodeType === Node.ELEMENT_NODE) {
      // 跳过排除的标签
      if (excludedTagsSet.has(node.tagName.toLowerCase())) {
        return;
      }
      
      // 跳过排除的类
      const excludedClassesSet = new Set(translationSettings.excludedClasses);
      if (node.classList && node.classList.length > 0 && excludedClassesSet.size > 0) {
        for (const cls of node.classList) {
          if (excludedClassesSet.has(cls)) {
            return;
          }
        }
      }
      
      // 跳过代码元素
      if (isCodeElement(node)) {
        return;
      }
      
      // 遍历子节点
      for (let i = 0; i < node.childNodes.length; i++) {
        walkTextNodes(node.childNodes[i]);
      }
    }
  }
  
  walkTextNodes(element);
  return textNodes;
}

// 应用翻译
function applyTranslation(node, originalText, translatedText, overrideStyle = null) {
  const parentNode = node.parentNode;
  
  if (!parentNode) return;
  
  // 清理翻译结果，移除可能的语言标记
  const cleanTranslation = typeof translatedText === 'string' ? 
                           translatedText.replace(/,\s*(en|zh-CN|zh|auto)$/i, '') : 
                           translatedText;
  
  // 添加调试日志
  console.log(`应用翻译样式 - 原文: [${node.textContent}], 译文: [${cleanTranslation}]`);
  
  // 使用传入的样式覆盖或使用设置中的样式
  const style = overrideStyle || translationSettings.translationStyle;
  
  switch (style) {
    case 'inline': {
      // 内联样式：原文后加译文
      const inlineWrapper = document.createElement('span');
      inlineWrapper.classList.add('transor-translation');
      inlineWrapper.textContent = node.textContent;
      // 保存原始文本
      inlineWrapper.setAttribute('data-original-text', node.textContent);
      
      const translationInline = document.createElement('span');
      translationInline.classList.add('transor-inline');
      translationInline.textContent = ` (${cleanTranslation})`;
      
      inlineWrapper.appendChild(translationInline);
      parentNode.replaceChild(inlineWrapper, node);
      break;
    }
      
    case 'replace': {
      // 替换样式：直接替换原文
      const replaceWrapper = document.createElement('span');
      replaceWrapper.classList.add('transor-translation');
      replaceWrapper.textContent = cleanTranslation;
      // 保存原始文本
      replaceWrapper.setAttribute('data-original-text', node.textContent);
      parentNode.replaceChild(replaceWrapper, node);
      break;
    }
      
    case 'bilingual': {
      // 双语样式：原文上方显示译文
      const bilingualWrapper = document.createElement('div');
      bilingualWrapper.classList.add('transor-translation');
      
      const original = document.createElement('span');
      original.textContent = node.textContent;
      // 保存原始文本
      bilingualWrapper.setAttribute('data-original-text', node.textContent);
      
      const translation = document.createElement('div');
      translation.classList.add('transor-bilingual');
      translation.textContent = cleanTranslation;
      
      bilingualWrapper.appendChild(original);
      bilingualWrapper.appendChild(translation);
      parentNode.replaceChild(bilingualWrapper, node);
      break;
    }
    
    case 'below': {
      // 下方样式：原文下方显示译文
      const belowWrapper = document.createElement('div');
      belowWrapper.classList.add('transor-translation');
      // 保存原始文本
      belowWrapper.setAttribute('data-original-text', node.textContent);
      
      const original = document.createElement('div');
      original.textContent = node.textContent;
      
      const translation = document.createElement('div');
      translation.classList.add('transor-below');
      translation.textContent = cleanTranslation;
      
      belowWrapper.appendChild(original);
      belowWrapper.appendChild(translation);
      parentNode.replaceChild(belowWrapper, node);
      break;
    }
      
    case 'hover': {
      // 悬浮样式：鼠标悬停显示译文
      const hoverWrapper = document.createElement('span');
      hoverWrapper.classList.add('transor-translation', 'transor-hover');
      hoverWrapper.textContent = node.textContent;
      // 保存原始文本
      hoverWrapper.setAttribute('data-original-text', node.textContent);
      
      const hoverContent = document.createElement('span');
      hoverContent.classList.add('transor-hover-content', 'no-translate');
      hoverContent.textContent = cleanTranslation;
      
      hoverWrapper.appendChild(hoverContent);
      parentNode.replaceChild(hoverWrapper, node);
      break;
    }
    
    case 'tip': {
      // 导航提示样式：适合导航和小型元素
      const tipWrapper = document.createElement('span');
      tipWrapper.classList.add('transor-translation', 'transor-tip');
      tipWrapper.textContent = node.textContent;
      
      // 保存原始文本
      tipWrapper.setAttribute('data-original-text', node.textContent);
      
      // 创建提示气泡元素
      const tipPopup = document.createElement('span');
      tipPopup.classList.add('transor-tip-popup', 'no-translate');
      tipPopup.textContent = cleanTranslation;
      
      // 使用随机ID
      const popupId = 'transor-tip-' + Math.random().toString(36).substr(2, 9);
      tipPopup.id = popupId;
      
      // 关联元素和popup - 保持两种属性一致，保证兼容性
      tipWrapper.setAttribute('data-popup-id', popupId);
      tipWrapper.setAttribute('data-tip-id', popupId);
      
      // 将popup添加到body
      document.body.appendChild(tipPopup);
      
      // 将新创建的tip元素注册到全局tip系统
      if (window.transorTipSystem && window.transorTipSystem.initialized) {
        window.transorTipSystem.registerTip(tipWrapper, tipPopup);
      }
      
      // 元素移除时清理关联的popup
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.removedNodes.length) {
            for (let i = 0; i < mutation.removedNodes.length; i++) {
              const node = mutation.removedNodes[i];
              if (node === tipWrapper || node.contains(tipWrapper)) {
                // 移除关联的popup
                const popup = document.getElementById(popupId);
                if (popup) {
                  popup.remove();
                }
                // 从全局tip系统中移除
                if (window.transorTipSystem && window.transorTipSystem.initialized) {
                  window.transorTipSystem.unregisterTip(tipWrapper);
                }
                observer.disconnect();
                break;
              }
            }
          }
        });
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      
      // 替换原始节点
      parentNode.replaceChild(tipWrapper, node);
      break;
    }
      
    default: {
      // 默认使用内联样式
      const defaultWrapper = document.createElement('span');
      defaultWrapper.classList.add('transor-translation');
      defaultWrapper.textContent = node.textContent;
      // 保存原始文本
      defaultWrapper.setAttribute('data-original-text', node.textContent);
      
      const translationDefault = document.createElement('span');
      translationDefault.classList.add('transor-inline');
      translationDefault.textContent = ` (${cleanTranslation})`;
      
      defaultWrapper.appendChild(translationDefault);
      parentNode.replaceChild(defaultWrapper, node);
    }
  }
}

// 移除所有翻译
function removeAllTranslations() {
  console.log('彻底清除所有翻译内容');
  
  // 移除所有弹出提示
  document.querySelectorAll('.transor-tip-popup').forEach(popup => {
    popup.remove();
  });
  
  // 存储原始文本内容，用于恢复
  const originalTexts = new Map();
  
  // 找到所有翻译元素
  const translatedElements = document.querySelectorAll('.transor-translation');
  
  translatedElements.forEach(element => {
    try {
      // 获取原始文本，优先使用保存的data-original-text属性
      let originalText = element.getAttribute('data-original-text');
      
      // 如果没有data-original-text属性，尝试其他方法获取原始文本
      if (!originalText) {
        // 处理不同类型的翻译样式
        if (element.classList.contains('transor-hover')) {
          // 悬浮样式：原文保存在元素的textContent中
          originalText = element.childNodes[0]?.nodeValue || element.textContent;
        } else if (element.classList.contains('transor-tip')) {
          // 导航提示样式：原文保存在元素的textContent中（不包括提示框）
          originalText = element.childNodes[0]?.nodeValue || element.textContent;
          // 移除可能的popup内容
          const popup = element.querySelector('.transor-tip-popup');
          if (popup && originalText.includes(popup.textContent)) {
            originalText = originalText.replace(popup.textContent, '');
          }
        } else if (element.querySelector('.transor-inline')) {
          // 内联样式：原文是父元素的第一个文本节点
          originalText = element.childNodes[0]?.nodeValue || '';
        } else if (element.querySelector('.transor-bilingual') || element.querySelector('.transor-below')) {
          // 双语样式：原文在第一个子元素中
          const originalElement = element.querySelector(':first-child');
          if (originalElement) {
            originalText = originalElement.textContent || '';
          }
        } else {
          // 替换样式：使用保存的数据属性或者使用父元素的内容
          originalText = element.textContent;
        }
      }
      
      // 清除可能包含的翻译标记
      originalText = originalText ? originalText.replace(/\s*\([^)]*\)\s*$/, '') : '';
      
      // 创建纯文本节点
      if (originalText) {
        const textNode = document.createTextNode(originalText);
        originalTexts.set(element, textNode);
      }
    } catch (e) {
      console.error('移除翻译元素时出错:', e);
    }
  });
  
  // 现在替换所有翻译元素
  originalTexts.forEach((textNode, element) => {
    try {
      if (element.parentNode) {
        element.parentNode.replaceChild(textNode, element);
      }
    } catch (e) {
      console.error('替换翻译元素时出错:', e);
    }
  });
  
  // 以防万一，移除所有.transor-tip-popup元素
  document.querySelectorAll('.transor-tip-popup').forEach(popup => {
    popup.remove();
  });
  
  // 重置已处理节点集合
  processedNodes = new WeakSet();
  
  console.log(`已移除 ${translatedElements.length} 个翻译元素`);
}

// 判断文本是否看起来像代码
function looksLikeCode(text) {
  if (!text) return false;
  
  // 代码片段的特征模式
  const codePatterns = [
    /function\s+\w+\s*\(/i,              // 函数声明
    /const|let|var\s+\w+\s*=/i,          // 变量声明
    /if\s*\(.+\)\s*{/i,                  // if语句
    /for\s*\(.+\)\s*{/i,                 // for循环
    /while\s*\(.+\)\s*{/i,               // while循环
    /class\s+\w+/i,                      // 类声明
    /import\s+.*\s+from/i,               // import语句
    /export\s+/i,                        // export语句
    /<\/?[a-z][\s\S]*>/i,                // HTML标签
    /\$\(.+\)\./i,                       // jQuery代码
    /{[\s\S]*:[\s\S]*}/i,                // JSON格式
    /\[[\s\S]*,[\s\S]*\]/i,              // 数组
    /(\/\/.*)|(\/\*[\s\S]*\*\/)/i,       // 注释
    /\w+\s*\.\s*\w+\s*\(/i,              // 方法调用
    /return\s+.+;/i                      // return语句
  ];
  
  for (const pattern of codePatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  // 检查代码符号的密度
  const codeSymbols = "{}[]()<>+-*/=&|!?:;.,'\"`~@#$%^&";
  let symbolCount = 0;
  
  for (const char of text) {
    if (codeSymbols.includes(char)) {
      symbolCount++;
    }
  }
  
  // 如果符号密度过高，可能是代码
  const symbolRatio = symbolCount / text.length;
  if (symbolRatio > 0.15) {
    return true;
  }
  
  return false;
}

// 监听DOM变化，处理动态加载的内容
function observeDOMChanges() {
  const observer = new MutationObserver((mutations) => {
    if (!translationSettings.isEnabled) return;
    
    let needsTranslation = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        needsTranslation = true;
      }
    });
    
    if (needsTranslation) {
      // 延迟一下处理，避免频繁触发
      setTimeout(() => {
        translateVisibleContent();
      }, 500);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 监听滚动事件，翻译新进入视口的内容
function setupScrollListener() {
  let scrollTimer = null;
  let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // 重新绑定所有tip元素的事件，确保功能正常
  const rebindAllTips = () => {
    if (window.transorTipSystem && window.transorTipSystem.initialized) {
      window.transorTipSystem.tipElements.forEach(item => {
        if (item.element && document.body.contains(item.element)) {
          // 重新绑定事件函数
          const onMouseEnter = function() {
            // 检查两种可能的ID属性
            const popupId = item.element.getAttribute('data-tip-id') || item.element.getAttribute('data-popup-id');
            if (!popupId) return;
            
            const popup = document.getElementById(popupId);
            if (!popup) return;
            
            // 标记为激活
            item.element.setAttribute('data-active', 'true');
            
            // 显示提示框
            popup.classList.add('active');
            
            // 更新位置
            const rect = item.element.getBoundingClientRect();
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            const offsetY = 10;
            let top = rect.bottom + scrollTop + offsetY;
            let left = rect.left + scrollLeft + (rect.width / 2);
            
            popup.style.left = left + 'px';
            popup.style.top = top + 'px';
            popup.style.transform = 'translateX(-50%)';
            
            // 调整位置确保在视口内
            const popupRect = popup.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            
            if (popupRect.bottom > viewportHeight) {
              top = rect.top + scrollTop - popupRect.height - offsetY;
              popup.style.top = top + 'px';
            }
            
            if (popupRect.right > viewportWidth) {
              left = left - (popupRect.right - viewportWidth) - 10;
              popup.style.left = left + 'px';
            }
            
            if (popupRect.left < 0) {
              left = left - popupRect.left + 10;
              popup.style.left = left + 'px';
            }
          };
          
          const onMouseLeave = function() {
            // 检查两种可能的ID属性
            const popupId = item.element.getAttribute('data-tip-id') || item.element.getAttribute('data-popup-id');
            if (!popupId) return;
            
            const popup = document.getElementById(popupId);
            if (!popup) return;
            
            // 标记为非激活
            item.element.setAttribute('data-active', 'false');
            
            // 隐藏提示框
            popup.classList.remove('active');
          };
          
          const onTipClick = function() {
            if (item.element.getAttribute('data-active') === 'true') {
              onMouseLeave.call(item.element);
            } else {
              window.transorTipSystem.tipElements.forEach(tip => {
                if (tip !== item.element) {
                  // 检查两种可能的ID属性
                  const popupId = tip.element.getAttribute('data-tip-id') || tip.element.getAttribute('data-popup-id');
                  if (popupId) {
                    const popup = document.getElementById(popupId);
                    if (popup) {
                      tip.element.setAttribute('data-active', 'false');
                      popup.classList.remove('active');
                    }
                  }
                }
              });
              onMouseEnter.call(item.element);
            }
          };
          
          // 移除旧的事件监听器
          item.element.removeEventListener('mouseenter', onMouseEnter);
          item.element.removeEventListener('mouseleave', onMouseLeave);
          item.element.removeEventListener('click', onTipClick);
          
          // 添加新的事件监听器
          item.element.addEventListener('mouseenter', onMouseEnter);
          item.element.addEventListener('mouseleave', onMouseLeave);
          item.element.addEventListener('click', onTipClick);
          
          // 对于触摸设备
          item.element.removeEventListener('touchstart', onTipClick);
          item.element.addEventListener('touchstart', onTipClick, {passive: false});
        } else {
          // 如果元素已不在DOM中，从集合移除
          window.transorTipSystem.unregisterTip(item.element);
        }
      });
    }
  };
  
  window.addEventListener('scroll', () => {
    if (!translationSettings.isEnabled) return;
    
    // 计算滚动方向和距离
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollDirection = currentScrollTop > lastScrollTop ? 'down' : 'up';
    const scrollDistance = Math.abs(currentScrollTop - lastScrollTop);
    lastScrollTop = currentScrollTop;
    
    // 在滚动过程中更新正在显示的提示位置
    if (window.transorTipSystem && window.transorTipSystem.tipElements) {
      window.transorTipSystem.tipElements.forEach(item => {
        if (item.active) {
          // 检查两种可能的ID属性
          const popupId = item.element.getAttribute('data-tip-id') || item.element.getAttribute('data-popup-id');
          if (popupId) {
            const popup = document.getElementById(popupId);
            if (popup && popup.classList.contains('active')) {
              // 更新位置
              const rect = item.element.getBoundingClientRect();
              const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
              const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
              
              const offsetY = 10;
              let top = rect.bottom + scrollTop + offsetY;
              let left = rect.left + scrollLeft + (rect.width / 2);
              
              popup.style.left = left + 'px';
              popup.style.top = top + 'px';
              
              // 检查是否超出视口
              const popupRect = popup.getBoundingClientRect();
              const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
              const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
              
              // 调整位置确保在视口内
              if (popupRect.bottom > viewportHeight) {
                top = rect.top + scrollTop - popupRect.height - offsetY;
                popup.style.top = top + 'px';
              }
              
              if (popupRect.right > viewportWidth) {
                left = left - (popupRect.right - viewportWidth) - 10;
                popup.style.left = left + 'px';
              }
              
              if (popupRect.left < 0) {
                left = left - popupRect.left + 10;
                popup.style.left = left + 'px';
              }
            }
          }
        }
      });
    }
    
    // 滚动速度快时(超过100px)或方向改变时，立即重新绑定事件
    if (scrollDistance > 100 || window.lastScrollDirection !== scrollDirection) {
      window.lastScrollDirection = scrollDirection;
      rebindAllTips();
    }
    
    // 防抖动处理，每次滚动后都重新绑定事件
    if (scrollTimer) clearTimeout(scrollTimer);
    
    scrollTimer = setTimeout(() => {
      // 滚动结束后立即重新绑定所有tip元素的事件
      rebindAllTips();
      
      // 加载新内容 - 确保新进入视口的内容被正确翻译
      translateVisibleContent();
      
      // 确保所有新创建的tip元素都正确注册
      if (translationSettings.translationStyle === 'tip') {
        // 查找所有未注册的tip元素
        const allTipElements = document.querySelectorAll('.transor-tip');
        allTipElements.forEach(tipElement => {
          const popupId = tipElement.getAttribute('data-popup-id') || tipElement.getAttribute('data-tip-id');
          if (popupId) {
            const popup = document.getElementById(popupId);
            if (popup && window.transorTipSystem && window.transorTipSystem.initialized) {
              // 检查是否已经注册
              let isRegistered = false;
              window.transorTipSystem.tipElements.forEach(item => {
                if (item.element === tipElement) {
                  isRegistered = true;
                }
              });
              
              // 如果未注册，则添加到系统中
              if (!isRegistered) {
                window.transorTipSystem.registerTip(tipElement, popup);
              }
            }
          }
        });
      }
    }, 150);
  }, { passive: true });
  
  // 窗口大小变化时重新绑定
  window.addEventListener('resize', () => {
    rebindAllTips();
  }, { passive: true });
  
  // 鼠标移动时检测悬停
  document.addEventListener('mousemove', (e) => {
    const tipElement = e.target.closest('.transor-tip');
    if (tipElement) {
      // 如果鼠标已经位于tip元素上但tip未激活，手动触发
      if (tipElement.getAttribute('data-active') !== 'true') {
        const mouseEnterEvent = new MouseEvent('mouseenter', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        tipElement.dispatchEvent(mouseEnterEvent);
      }
    }
  }, { passive: true });
}

// 监听来自弹出窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleTranslation') {
    translationSettings.isEnabled = message.isEnabled;
    if (translationSettings.isEnabled) {
      translateVisibleContent();
    } else {
      removeAllTranslations();
    }
    sendResponse({ success: true });
  } else if (message.action === 'updateSettings') {
    console.log('收到更新设置消息:', message.settings);
    const oldSettings = {...translationSettings};
    
    // 更新设置
    Object.assign(translationSettings, message.settings);
    
    // 如果翻译引擎、源语言、目标语言或翻译样式改变，需要清除缓存和重新翻译
    if (oldSettings.translationEngine !== translationSettings.translationEngine ||
        oldSettings.sourceLanguage !== translationSettings.sourceLanguage ||
        oldSettings.targetLanguage !== translationSettings.targetLanguage ||
        oldSettings.translationStyle !== translationSettings.translationStyle) {
      console.log('关键翻译设置已变更，清除缓存并重新翻译');
      
      // 清除翻译缓存
      Object.keys(translationCache).forEach(key => {
        delete translationCache[key];
      });
      
      // 如果翻译样式改变，需要先清除所有现有翻译
      if (oldSettings.translationStyle !== translationSettings.translationStyle) {
        console.log('翻译样式已变更，移除所有现有翻译');
        removeAllTranslations();
        // 重新注入样式
        injectStyles();
      }
      
      // 如果翻译已启用，则重新处理页面
      if (translationSettings.isEnabled) {
        // 重置处理过的节点集合
        processedNodes = new WeakSet();
        // 延迟更长时间以确保之前的清理操作完成
        setTimeout(() => {
          translateVisibleContent();
        }, 300);
      }
    }
    
    sendResponse({ success: true });
  } else if (message.action === 'convertImageToBase64') {
    convertImageToBase64(message.imageUrl)
      .then(base64Data => {
        sendResponse({ success: true, base64Data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // 异步响应
  }
  
  return true; // 保持消息通道开放以进行异步响应
});

// 创建滑词翻译器
function createSelectionTranslator() {
  // 如果已经存在翻译窗口，则不重复创建
  if (document.getElementById('transor-selection-popup')) return;
  
  // 创建翻译窗口
  const popup = document.createElement('div');
  popup.id = 'transor-selection-popup';
  popup.className = 'transor-selection-translator no-translate'; // 添加no-translate类
  popup.style.display = 'none';
  
  // 创建内容容器
  const content = document.createElement('div');
  content.className = 'transor-selection-content no-translate'; // 添加no-translate类
  popup.appendChild(content);
  
  // 添加到文档
  document.body.appendChild(popup);
  
  // 添加样式
  const style = document.createElement('style');
  style.id = 'transor-selection-styles';
  style.textContent = `
    .transor-selection-translator {
      position: absolute;
      background: #fff;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      padding: 10px 15px;
      z-index: 99999;
      max-width: 300px;
      pointer-events: auto;
      user-select: text;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }
    
    .transor-selection-content {
      width: 100%;
    }
    
    .transor-selection-original {
      color: #333;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
      display: block;
      font-size: 14px;
    }
    
    .transor-selection-translation {
      color: #42b983;
      font-weight: 500;
      display: block;
      margin-top: 8px;
      font-size: 15px;
    }
    
    /* 收藏按钮样式 */
    .transor-selection-favorite {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }
    
    .transor-selection-favorite-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #999;
      font-size: 18px;
      padding: 3px 8px;
      border-radius: 3px;
      transition: all 0.2s;
    }
    
    .transor-selection-favorite-btn:hover {
      background-color: #f5f5f5;
      color: #42b983;
    }
    
    .transor-selection-favorite-btn.active {
      color: #ff9500;
    }
    
    /* 防止选中翻译器内容引起新的翻译 */
    .transor-selection-translator * {
      pointer-events: auto;
      user-select: text;
    }
  `;
  
  document.head.appendChild(style);
  
  return popup;
}

// 初始化滑词翻译功能
function initSelectionTranslator() {
  // 如果滑词翻译功能被禁用，则不初始化
  if (!translationSettings.enableSelectionTranslator) return;
  
  // 创建滑词翻译器
  const popup = createSelectionTranslator();
  const popupContent = popup.querySelector('.transor-selection-content');
  
  // 定义变量存储选中文本信息
  let selectedText = '';
  let selectionTimer = null;
  
  // 监听选中事件
  document.addEventListener('mouseup', async function(e) {
    // 获取选中文本
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    // 如果没有选中文本或选中的是翻译器内容，则隐藏翻译器
    if (!text || e.target.closest('.transor-selection-translator')) {
      popup.style.display = 'none';
      return;
    }
    
    // 如果选中的文本不变，并且翻译器已显示，不进行重复翻译
    if (text === selectedText && popup.style.display !== 'none') {
      return;
    }
    
    // 更新选中文本
    selectedText = text;
    
    // 防抖处理，避免频繁翻译
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(async () => {
      try {
        // 检查是否是代码
        if (looksLikeCode(text)) {
          // 如果是代码，不进行翻译
          popupContent.innerHTML = `
            <div class="transor-selection-original no-translate">${escapeHtml(text)}</div>
            <div class="transor-selection-translation no-translate">代码不翻译</div>
            <div class="transor-selection-favorite no-translate">
              <button class="transor-selection-favorite-btn" title="收藏" disabled>★</button>
            </div>
          `;
        } else {
          // 显示加载中
          popupContent.innerHTML = `
            <div class="transor-selection-original no-translate">${escapeHtml(text)}</div>
            <div class="transor-selection-translation no-translate">翻译中...</div>
          `;
          
          // 使用后台脚本进行翻译
          let translation = text;
          try {
            translation = await new Promise((resolve) => {
              // 添加到翻译队列
              translationQueue.add(text, result => {
                resolve(result);
              });
            });
          } catch (translationError) {
            console.error('翻译过程出错:', translationError);
            translation = `[翻译失败] ${text}`;
          }
          
          // 清理翻译结果，移除可能的语言标记
          const cleanTranslation = typeof translation === 'string' ? 
                                  translation.replace(/,\s*(en|zh-CN|zh|auto)$/i, '') : 
                                  translation;
          
          // 显示翻译结果
          popupContent.innerHTML = `
            <div class="transor-selection-original no-translate">${escapeHtml(text)}</div>
            <div class="transor-selection-translation no-translate">${escapeHtml(cleanTranslation)}</div>
            <div class="transor-selection-favorite no-translate">
              <button class="transor-selection-favorite-btn" title="收藏到学习词典">★</button>
            </div>
          `;
          
          // 添加收藏按钮点击事件
          const favoriteBtn = popupContent.querySelector('.transor-selection-favorite-btn');
          if (favoriteBtn) {
            favoriteBtn.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              // 显示加载状态
              this.textContent = '⌛';
              this.title = '正在收藏...';
              this.disabled = true;
              
              // 保存收藏
              saveFavorite(text, cleanTranslation);
              
              // 显示已收藏状态
              setTimeout(() => {
                this.classList.add('active');
                this.textContent = '★';
                this.title = '已收藏';
                this.disabled = false;
              }, 500);
            });
          }
        }
        
        // 定位翻译窗口位置
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        popup.style.display = 'block';
        popup.style.left = `${Math.min(rect.left + window.scrollX, window.innerWidth + window.scrollX - popup.offsetWidth - 20)}px`;
        popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
        
        // 如果底部空间不足，则显示在选中文本上方
        if (rect.bottom + popup.offsetHeight + 30 > window.innerHeight) {
          popup.style.top = `${rect.top + window.scrollY - popup.offsetHeight - 10}px`;
        }
      } catch (error) {
        console.error('Selection translation error:', error);
        popupContent.innerHTML = `
          <div class="transor-selection-original no-translate">${escapeHtml(text)}</div>
          <div class="transor-selection-translation no-translate">翻译失败: ${error.message}</div>
        `;
      }
    }, 300);
  });
  
  // 保存收藏到Chrome存储
  function saveFavorite(originalText, translatedText) {
    // 创建收藏项
    const favorite = {
      original: originalText,
      translation: translatedText,
      timestamp: Date.now(),
      source: window.location.href,
      title: document.title
    };
    
    console.log('准备保存收藏:', favorite);
    
    // 通过消息传递，让后台脚本调用API收藏单词
    chrome.runtime.sendMessage({
      action: 'collectWord',
      source_text: originalText,
      source_lang: translationSettings.sourceLanguage
    }, response => {
      if (response && response.success) {
        console.log('单词收藏成功:', response);
      } else {
        console.warn('单词收藏失败:', response?.error);
      }
    });
    
    // 读取现有收藏
    chrome.storage.sync.get('transorFavorites', function(result) {
      const favorites = result.transorFavorites || [];
      console.log('已有收藏数量:', favorites.length);
      
      // 检查是否已经收藏
      const exists = favorites.some(item => 
        item.original === originalText && item.translation === translatedText
      );
      
      if (!exists) {
        // 添加到收藏列表
        favorites.push(favorite);
        
        // 保存回存储
        chrome.storage.sync.set({
          transorFavorites: favorites
        }, function() {
          if (chrome.runtime.lastError) {
            console.error('保存收藏失败:', chrome.runtime.lastError);
          } else {
            console.log('成功保存收藏，总数:', favorites.length);
          }
        });
      } else {
        console.log('该内容已被收藏，跳过');
      }
    });
  }
  
  // 点击其他区域隐藏翻译窗口
  document.addEventListener('mousedown', function(e) {
    if (!popup.contains(e.target) && e.target !== popup) {
      popup.style.display = 'none';
    }
  });
  
  // 监听鼠标滚动，更新翻译窗口位置而不是隐藏
  document.addEventListener('scroll', function() {
    // 如果翻译窗口已显示并有内容，则更新位置而不是隐藏
    if (popup.style.display === 'block' && selectedText) {
      // 获取当前选中范围
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          
          // 只有选中区域还在视口内才更新位置
          if (rect.top > 0 && 
              rect.bottom < window.innerHeight && 
              rect.left > 0 && 
              rect.right < window.innerWidth) {
            
            popup.style.left = `${Math.min(rect.left + window.scrollX, window.innerWidth + window.scrollX - popup.offsetWidth - 20)}px`;
            popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
            
            // 如果底部空间不足，则显示在选中文本上方
            if (rect.bottom + popup.offsetHeight + 30 > window.innerHeight) {
              popup.style.top = `${rect.top + window.scrollY - popup.offsetHeight - 10}px`;
            }
            
            // 如果左侧空间不足，改为从左侧显示
            if (rect.left + popup.offsetWidth > window.innerWidth) {
              popup.style.left = `${window.innerWidth + window.scrollX - popup.offsetWidth - 20}px`;
            }
            
            return; // 已更新位置，不隐藏
          }
        }
      }
    }
    
    // 如果选中范围无效或不可见，则隐藏翻译窗口
    popup.style.display = 'none';
  }, { passive: true });
  
  // 添加窗口大小变化事件监听，更新翻译窗口位置
  window.addEventListener('resize', function() {
    // 触发一次滚动事件处理函数，使用相同的逻辑更新位置
    if (popup.style.display === 'block') {
      const scrollEvent = new Event('scroll');
      document.dispatchEvent(scrollEvent);
    }
  }, { passive: true });
  
  // 转义HTML特殊字符，防止XSS
  function escapeHtml(text) {
    // 确保text是字符串
    if (text === null || text === undefined) {
      return '';
    }
    
    // 将非字符串值转换为字符串
    text = String(text);
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// 处理图片转base64的函数（支持图片OCR功能）
function convertImageToBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    // 创建img元素
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 尝试解决跨域问题
    
    // 处理图片加载完成事件
    img.onload = function() {
      try {
        // 创建canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 绘制图片到canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // 获取base64数据
        const base64Data = canvas.toDataURL('image/png');
        resolve(base64Data);
      } catch (error) {
        console.error('图片转base64失败:', error);
        reject(error);
      }
    };
    
    // 处理加载失败
    img.onerror = function(error) {
      console.error('图片加载失败:', error);
      reject(new Error('图片加载失败'));
    };
    
    // 设置图片源
    img.src = imageUrl;
  });
}

// 设置消息监听器
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log('内容脚本收到消息:', message);
    
    // 处理快捷键触发
    if (message.action === 'shortcutTriggered' && message.shortcut === 'altA') {
      console.log('收到快捷键触发消息，执行翻译开关');
      toggleTranslation();
      sendResponse({ success: true });
      return true;
    }
    
    // 处理直接翻译请求
    if (message.action === 'translate') {
      console.log('收到直接翻译请求');
      if (!translationSettings.isEnabled) {
        translationSettings.isEnabled = true;
        translateVisibleContent();
      }
      sendResponse({ success: true });
      return true;
    }
    
    return false;
  });
}

// 切换翻译开关
function toggleTranslation() {
  console.log('切换翻译状态');
  // 切换翻译状态
  translationSettings.isEnabled = !translationSettings.isEnabled;
  
  // 保存新状态到存储
  chrome.storage.sync.set({ isEnabled: translationSettings.isEnabled }, function() {
    console.log('已保存翻译开关状态:', translationSettings.isEnabled);
  });
  
  // 根据新状态执行相应操作
  if (translationSettings.isEnabled) {
    console.log('启用翻译，开始翻译可见内容');
    translateVisibleContent();
  } else {
    console.log('禁用翻译，移除所有翻译');
    removeAllTranslations();
  }
  
  // 通知UI更新状态
  updateStatusIndicator();
}

// 更新状态指示器
function updateStatusIndicator() {
  try {
    // 发送消息给popup或其他UI组件更新状态
    chrome.runtime.sendMessage({ 
      action: 'updateStatus', 
      isEnabled: translationSettings.isEnabled 
    });
  } catch (error) {
    console.error('更新状态指示器失败:', error);
  }
}

// 设置全局事件监听器
function setupGlobalEventListeners() {
  // 监听来自后台脚本的自定义事件
  document.addEventListener('transor-toggle-translation', (event) => {
    console.log('收到翻译切换自定义事件:', event.detail);
    toggleTranslation();
  });
  
  // 也可以直接在content-script中监听键盘事件
  document.addEventListener('keydown', (event) => {
    // 检测Alt+A (Option+A) 快捷键
    const isAltAPressed = 
      // 标准检测方式
      (event.altKey && (event.key === 'a' || event.key === 'A')) ||
      // Mac上Option+A可能生成的特殊字符
      (event.key === 'å' || event.key === 'Å') ||
      // 使用keyCode检测 (65是字母A的keyCode)
      (event.altKey && event.keyCode === 65);
      
    if (isAltAPressed) {
      console.log('内容脚本直接检测到快捷键 ⌥A');
      event.preventDefault(); // 阻止默认行为，避免可能的按键冲突
      toggleTranslation();
    }
  });
}

// 在文件开头添加这个全局函数
// 添加tip功能的全局处理函数 - 使用最简单直接的方法
function setupGlobalTipSystem() {
  // 如果已经设置过，则不重复设置
  if (window.tipSystemInitialized) return;
  
  // 标记为已初始化
  window.tipSystemInitialized = true;
  
  // 当前激活的提示元素
  let activeElement = null;
  let activePopup = null;
  
  // 全局鼠标移动监听
  document.addEventListener('mouseover', function(e) {
    const tipElement = e.target.closest('.transor-tip');
    
    // 如果鼠标移到了tip元素上
    if (tipElement) {
      // 查找关联的popup
      const popupId = tipElement.getAttribute('data-popup-id');
      if (!popupId) return;
      
      const popup = document.getElementById(popupId);
      if (!popup) return;
      
      // 更新当前激活的元素
      activeElement = tipElement;
      activePopup = popup;
      
      // 显示提示
      popup.classList.add('active');
      
      // 更新位置
      updateTipPosition(tipElement, popup);
    }
  }, true);
  
  // 全局鼠标移出监听
  document.addEventListener('mouseout', function(e) {
    const tipElement = e.target.closest('.transor-tip');
    
    // 只处理从tip元素移出，且不是移到其子元素的情况
    if (tipElement && !tipElement.contains(e.relatedTarget)) {
      const popupId = tipElement.getAttribute('data-popup-id');
      if (!popupId) return;
      
      const popup = document.getElementById(popupId);
      if (!popup) return;
      
      // 隐藏提示
      popup.classList.remove('active');
      
      // 清除当前激活的元素
      if (activeElement === tipElement) {
        activeElement = null;
        activePopup = null;
      }
    }
  }, true);
  
  // 全局滚动监听
  window.addEventListener('scroll', function() {
    // 如果有激活的提示，更新位置
    if (activeElement && activePopup) {
      updateTipPosition(activeElement, activePopup);
    }
  }, { passive: true });
  
  // 全局窗口大小变化监听
  window.addEventListener('resize', function() {
    // 如果有激活的提示，更新位置
    if (activeElement && activePopup) {
      updateTipPosition(activeElement, activePopup);
    }
  }, { passive: true });
  
  // 更新提示位置的函数
  function updateTipPosition(element, popup) {
    // 检查元素是否仍在DOM中
    if (!document.body.contains(element) || !document.body.contains(popup)) {
      // 如果不在，隐藏提示并清除激活状态
      popup.classList.remove('active');
      if (activeElement === element) {
        activeElement = null;
        activePopup = null;
      }
      return;
    }
    
    // 获取元素位置
    const rect = element.getBoundingClientRect();
    
    // 检查元素是否在视口内
    if (rect.right < 0 || rect.left > window.innerWidth || rect.bottom < 0 || rect.top > window.innerHeight) {
      // 如果不在视口内，隐藏提示
      popup.classList.remove('active');
      return;
    }
    
    // 计算提示框位置 - 使用相对于视口的坐标，而不是页面坐标
    // 默认显示在元素下方
    const offsetY = 10;
    let top = rect.bottom + offsetY;
    let left = rect.left + (rect.width / 2);
    
    // 检查提示框的尺寸
    const popupWidth = popup.offsetWidth || 200; // 默认宽度
    const popupHeight = popup.offsetHeight || 100; // 默认高度
    
    // 确保提示框在视口内
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // 如果提示框超出视口底部，显示在元素上方
    if (top + popupHeight > viewportHeight) {
      top = rect.top - popupHeight - offsetY;
    }
    
    // 如果提示框超出视口右侧，向左调整
    if (left + (popupWidth / 2) > viewportWidth) {
      left = viewportWidth - popupWidth - 10;
    }
    
    // 如果提示框超出视口左侧，向右调整
    if (left - (popupWidth / 2) < 0) {
      left = popupWidth / 2 + 10;
    }
    
    // 使用固定定位，相对于视口而不是文档
    popup.style.position = 'fixed';
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.transform = 'translateX(-50%)';
  }
  
  // 更新CSS样式
  const styleElement = document.createElement('style');
  styleElement.id = 'transor-tip-system-styles';
  styleElement.textContent = `
    .transor-tip-popup {
      visibility: hidden;
      position: fixed; /* 使用固定定位，相对于视口 */
      background-color: rgba(255, 255, 255, 0.95);
      color: #333;
      text-align: left;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.5;
      z-index: 10000; /* 提高层级确保在最上层 */
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      width: max-content;
      max-width: 350px;
      white-space: normal;
      word-break: break-word;
      transition: opacity 0.3s, transform 0.3s;
      opacity: 0;
      transform: translateY(10px) translateX(-50%);
      pointer-events: none; /* 防止鼠标事件影响其他元素 */
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(66, 185, 131, 0.15);
    }
    
    .transor-tip-popup.active {
      visibility: visible;
      opacity: 1;
      transform: translateY(0) translateX(-50%);
    }
    
    /* 针对不同浏览器的样式优化 */
    @supports not (backdrop-filter: blur(10px)) {
      .transor-tip-popup {
        background-color: rgba(255, 255, 255, 0.98);
      }
    }
    
    /* 暗色主题支持 */
    @media (prefers-color-scheme: dark) {
      .transor-tip-popup {
        background-color: rgba(40, 44, 52, 0.9);
        color: #e4e4e4;
        border-color: rgba(66, 185, 131, 0.2);
      }
    }
    
    /* 禁止翻译tip弹出框内容 */
    .transor-tip-popup span,
    .transor-tip-popup div,
    .transor-tip-popup p,
    .transor-tip-popup * {
      border-bottom: none !important;
      text-decoration: none !important;
    }
  `;
  
  // 插入样式
  document.head.appendChild(styleElement);
  
  // 修改滚动监听的频率，使其更平滑
  let scrollFrameRequested = false;
  
  window.addEventListener('scroll', function() {
    // 使用requestAnimationFrame限制更新频率
    if (!scrollFrameRequested && activeElement && activePopup) {
      scrollFrameRequested = true;
      requestAnimationFrame(function() {
        updateTipPosition(activeElement, activePopup);
        scrollFrameRequested = false;
      });
    }
  }, { passive: true });
}

// 初始化
init();

// 设置DOM变化观察
setTimeout(() => {
  observeDOMChanges();
  setupScrollListener();
}, 1500); 

// 全局事件管理系统，用于处理tip功能
if (!window.transorTipSystem) {
  window.transorTipSystem = {
    initialized: false,
    tipElements: new Set(),
    
    // 初始化tip系统
    init() {
      if (this.initialized) return;
      
      // 添加全局事件监听
      document.addEventListener('mouseover', this.handleGlobalMouseOver.bind(this), true);
      document.addEventListener('mouseout', this.handleGlobalMouseOut.bind(this), true);
      document.addEventListener('click', this.handleGlobalClick.bind(this), true);
      window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
      window.addEventListener('resize', this.handleResize.bind(this), { passive: true });
      
      this.initialized = true;
      console.log('Transor tip系统已初始化');
    },
    
    // 注册tip元素
    registerTip(element, popup) {
      // 确保元素和popup都存在
      if (!element || !popup) return;
      
      // 检查元素是否已经注册
      for (const item of this.tipElements) {
        if (item.element === element) {
          // 已经注册过，更新popup引用
          item.popup = popup;
          return;
        }
      }
      
      // 添加新的tip元素
      this.tipElements.add({
        element,
        popup,
        active: false
      });
      
      // 确保ID属性一致性
      const popupId = element.getAttribute('data-popup-id') || element.getAttribute('data-tip-id');
      if (popupId) {
        element.setAttribute('data-popup-id', popupId);
        element.setAttribute('data-tip-id', popupId);
      }
      
      // 确保系统初始化
      this.init();
      
      // 绑定事件
      const onMouseEnter = () => {
        this.showTip(element);
      };
      
      const onMouseLeave = () => {
        this.hideTip(element);
      };
      
      const onTipClick = () => {
        if (element.getAttribute('data-active') === 'true') {
          this.hideTip(element);
        } else {
          // 先隐藏所有其他tip
          this.hideAllTips();
          // 显示当前tip
          this.showTip(element);
        }
      };
      
      // 移除已有事件（避免重复绑定）
      element.removeEventListener('mouseenter', onMouseEnter);
      element.removeEventListener('mouseleave', onMouseLeave);
      element.removeEventListener('click', onTipClick);
      
      // 添加事件
      element.addEventListener('mouseenter', onMouseEnter);
      element.addEventListener('mouseleave', onMouseLeave);
      element.addEventListener('click', onTipClick);
      
      // 存储事件处理函数引用
      element._tipHandlers = {
        mouseEnter: onMouseEnter,
        mouseLeave: onMouseLeave,
        click: onTipClick
      };
    },
    
    // 注销tip元素
    unregisterTip(element) {
      for (const item of this.tipElements) {
        if (item.element === element) {
          if (item.popup && document.body.contains(item.popup)) {
            item.popup.remove();
          }
          this.tipElements.delete(item);
          break;
        }
      }
    },
    
    // 显示tip
    showTip(element) {
      for (const item of this.tipElements) {
        if (item.element === element) {
          // 获取popup ID（兼容两种属性）
          const popupId = element.getAttribute('data-popup-id') || element.getAttribute('data-tip-id');
          if (!popupId) return;

          const popup = document.getElementById(popupId);
          if (!popup) return;
          
          // 标记为激活
          element.setAttribute('data-active', 'true');
          item.active = true;
          
          // 显示提示框
          popup.classList.add('active');
          
          // 更新位置
          this.updateTipPosition(item);
          break;
        }
      }
    },
    
    // 隐藏tip
    hideTip(element) {
      for (const item of this.tipElements) {
        if (item.element === element) {
          // 获取popup ID（兼容两种属性）
          const popupId = element.getAttribute('data-popup-id') || element.getAttribute('data-tip-id');
          if (!popupId) return;

          const popup = document.getElementById(popupId);
          if (!popup) return;
          
          // 标记为非激活
          element.setAttribute('data-active', 'false');
          item.active = false;
          
          // 隐藏提示框
          popup.classList.remove('active');
          break;
        }
      }
    },
    
    // 隐藏所有tip
    hideAllTips() {
      for (const item of this.tipElements) {
        if (item.popup) {
          item.popup.classList.remove('active');
          item.active = false;
        }
      }
    },
    
    // 更新tip位置
    updateTipPosition(item) {
      if (!item || !item.element || !item.popup) return;
      
      // 获取元素位置
      const rect = item.element.getBoundingClientRect();
      
      // 检查元素是否在视口中，如果不在则不显示
      if (rect.bottom < 0 || rect.top > window.innerHeight || 
          rect.right < 0 || rect.left > window.innerWidth) {
        item.popup.classList.remove('active');
        return;
      }
      
      // 计算位置
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      const offsetY = 10;
      let top = rect.bottom + scrollTop + offsetY;
      let left = rect.left + scrollLeft + (rect.width / 2);
      
      // 应用定位
      item.popup.style.left = left + 'px';
      item.popup.style.top = top + 'px';
      item.popup.style.transform = 'translateX(-50%)';
      
      // 调整位置确保在视口内
      const popupRect = item.popup.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      
      if (popupRect.bottom > viewportHeight) {
        top = rect.top + scrollTop - popupRect.height - offsetY;
        item.popup.style.top = top + 'px';
      }
      
      if (popupRect.right > viewportWidth) {
        left = left - (popupRect.right - viewportWidth) - 10;
        item.popup.style.left = left + 'px';
      }
      
      if (popupRect.left < 0) {
        left = left - popupRect.left + 10;
        item.popup.style.left = left + 'px';
      }
    },
    
    // 全局鼠标移入事件
    handleGlobalMouseOver(e) {
      const tipElement = e.target.closest('.transor-tip');
      if (tipElement) {
        this.showTip(tipElement);
      }
    },
    
    // 全局鼠标移出事件
    handleGlobalMouseOut(e) {
      const tipElement = e.target.closest('.transor-tip');
      if (tipElement && !tipElement.contains(e.relatedTarget)) {
        this.hideTip(tipElement);
      }
    },
    
    // 全局点击事件
    handleGlobalClick(e) {
      const tipElement = e.target.closest('.transor-tip');
      if (!tipElement) {
        this.hideAllTips();
      }
    },
    
    // 滚动事件处理
    handleScroll() {
      // 更新所有活跃的提示位置
      this.tipElements.forEach(item => {
        if (item.active) {
          this.updateTipPosition(item);
        }
      });
    },
    
    // 窗口大小变化事件处理
    handleResize() {
      // 更新所有活跃的提示位置
      this.tipElements.forEach(item => {
        if (item.active) {
          this.updateTipPosition(item);
        }
      });
    },
    
    // 清理所有资源
    cleanup() {
      document.removeEventListener('mouseover', this.handleGlobalMouseOver);
      document.removeEventListener('mouseout', this.handleGlobalMouseOut);
      document.removeEventListener('click', this.handleGlobalClick);
      window.removeEventListener('scroll', this.handleScroll);
      window.removeEventListener('resize', this.handleResize);
      
      // 移除所有提示框
      this.tipElements.forEach(item => {
        if (item.popup && document.body.contains(item.popup)) {
          item.popup.remove();
        }
      });
      
      this.tipElements.clear();
      this.initialized = false;
    }
  };
}