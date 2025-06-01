/**
 * Transor - 沉浸式翻译 内容脚本
 * 在网页中执行，处理实际的翻译逻辑
 */

// 翻译状态变量
let translationSettings = {
  isEnabled: false,
  targetLanguage: 'zh-CN',
  sourceLanguage: 'auto',
  translationEngine: 'microsoft',
  translationStyle: 'universal_style',
  excludedTags: ['code', 'pre', 'script', 'style'],
  excludedClasses: ['no-translate'],
  customCss: '',
  enableSelectionTranslator: true,
  enableInputSpaceTranslation: true,
  fontColor: '#ff5588' // 添加字体颜色设置
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
    console.log('[翻译队列] 添加文本到队列:', text.length > 30 ? text.substring(0, 30) + '...' : text);
    
    if (!text || text.length <= 1) {
      console.log('[翻译队列] 文本太短，忽略');
      return;
    }
    
    // 检查缓存
    const cacheKey = `${translationSettings.targetLanguage}:${translationSettings.translationEngine}:${text}`;
    if (translationCache[cacheKey] !== undefined) {
      // 缓存命中，直接回调
      console.log('[翻译队列] 缓存命中，直接返回结果');
      callback(translationCache[cacheKey]);
      return;
    }
    
    // 添加到队列
    if (!this.pendingTexts.has(text)) {
      this.pendingTexts.set(text, []);
    }
    this.pendingTexts.get(text).push(callback);
    
    console.log('[翻译队列] 当前队列大小:', this.pendingTexts.size);
    
    // 设置防抖处理，避免频繁请求
    console.log('[翻译队列] 设置处理延迟:', this.debounceTime, 'ms');
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.process();
    }, this.debounceTime);
  },
  
  // 处理翻译队列
  async process() {
    console.log('[翻译队列] 开始处理队列');
    
    if (this.isProcessing || this.pendingTexts.size === 0) {
      console.log('[翻译队列] 队列为空或正在处理中，跳过');
      return;
    }
    
    this.isProcessing = true;
    console.log('[翻译队列] 标记为正在处理');
    
    try {
      // 从队列中提取待翻译文本
      const textsToTranslate = Array.from(this.pendingTexts.keys());
      console.log(`[翻译队列] 处理翻译队列: ${textsToTranslate.length} 条唯一文本`);
      
      // 过滤掉看起来像代码的文本
      const filteredTexts = [];
      const codeTexts = [];
      
      textsToTranslate.forEach(text => {
        if (looksLikeCode(text)) {
          console.log('[翻译队列] 跳过代码翻译:', text.substring(0, 30) + '...');
          codeTexts.push(text);
        } else {
          filteredTexts.push(text);
        }
      });
      
      console.log(`[翻译队列] 过滤后待翻译文本: ${filteredTexts.length} 条`);
      
      // 处理源语言检测
      let sourceLanguage = translationSettings.sourceLanguage;
      
      // 分批处理翻译请求
      for (let i = 0; i < filteredTexts.length; i += this.batchSize) {
        const batch = filteredTexts.slice(i, i + this.batchSize);
        
        console.log(`[翻译队列] 处理批次 ${i/this.batchSize + 1}, 批次大小: ${batch.length}`);
        // 发送批量翻译请求
        try {
          console.log('[翻译队列] 发送翻译请求到后台脚本:', {
            engine: translationSettings.translationEngine || 'google',
            sourceLanguage,
            targetLanguage: translationSettings.targetLanguage,
            textsLength: batch.length
          });
          
          const translations = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: 'translateTexts',
              texts: batch,
              sourceLanguage: sourceLanguage,
              targetLanguage: translationSettings.targetLanguage,
              engine: translationSettings.translationEngine || 'google'
            }, response => {
              console.log('[翻译队列] 收到后台响应:', response ? '成功' : '失败');
              
              if (response && response.success && response.translations) {
                console.log('[翻译队列] 成功获取翻译结果，数量:', response.translations.length);
                resolve(response.translations);
              } else {
                console.warn('[翻译队列] 批量翻译失败:', response?.error);
                resolve(batch); // 失败时返回原文
              }
            });
          });
          
          console.log('[翻译队列] 翻译响应完成，开始处理结果');
          
          // 更新缓存并执行回调
          batch.forEach((text, index) => {
            const translation = translations[index] || text;
            const cacheKey = `${translationSettings.targetLanguage}:${translationSettings.translationEngine}:${text}`;
            
            // 输出日志以便调试
            console.log(`[翻译队列] 翻译结果 - 原文: [${text.length > 30 ? text.substring(0, 30) + '...' : text}], 译文: [${translation.length > 30 ? translation.substring(0, 30) + '...' : translation}]`);
            
            // 更新缓存
            translationCache[cacheKey] = translation;
            
            // 执行所有关联的回调
            const callbacks = this.pendingTexts.get(text) || [];
            console.log(`[翻译队列] 执行回调，数量: ${callbacks.length}`);
            callbacks.forEach(callback => {
              try {
                callback(translation);
              } catch (callbackError) {
                console.error('[翻译队列] 执行回调时出错:', callbackError);
              }
            });
            
            // 从队列中移除已处理文本
            this.pendingTexts.delete(text);
          });
          
          // 控制请求速率
          if (i + this.batchSize < filteredTexts.length) {
            console.log('[翻译队列] 等待下一批处理');
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error('[翻译队列] 批次翻译出错:', error);
          
          // 出错时用原文作为翻译结果
          batch.forEach(text => {
            console.log('[翻译队列] 翻译出错，使用原文:', text.substring(0, 30) + '...');
            const callbacks = this.pendingTexts.get(text) || [];
            callbacks.forEach(callback => {
              try {
                callback(text);
              } catch (callbackError) {
                console.error('[翻译队列] 执行错误回调时出错:', callbackError);
              }
            });
            this.pendingTexts.delete(text);
          });
        }
      }
      
      // 处理代码文本
      if (codeTexts.length > 0) {
        console.log(`[翻译队列] 处理 ${codeTexts.length} 条代码文本`);
        codeTexts.forEach(text => {
          const callbacks = this.pendingTexts.get(text) || [];
          callbacks.forEach(callback => {
            try {
              callback(text);
            } catch (callbackError) {
              console.error('[翻译队列] 执行代码文本回调时出错:', callbackError);
            }
          }); // 代码返回原文作为结果
          this.pendingTexts.delete(text);
        });
      }
      
      console.log('[翻译队列] 队列处理完成');
    } catch (error) {
      console.error('[翻译队列] 处理队列主流程出错:', error);
    } finally {
      this.isProcessing = false;
      console.log('[翻译队列] 重置处理状态');
      
      // 检查队列是否仍有文本待处理
      if (this.pendingTexts.size > 0) {
        console.log(`[翻译队列] 队列中还有 ${this.pendingTexts.size} 条文本待处理，继续处理...`);
        setTimeout(() => this.process(), 100);
      }
    }
  }
};

// 初始化功能诊断，用于排查问题
function diagnoseFunctionality() {
  console.log('========== 功能诊断开始 ==========');
  
  try {
    // 检查存储API是否可用
    console.log('1. 检查存储API:');
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      console.log('   ✅ 存储API可用');
      
      // 尝试读取设置
      chrome.storage.sync.get(['enableInputSpaceTranslation'], (result) => {
        console.log('   直接读取设置结果:', result);
      });
    } else {
      console.error('   ❌ 存储API不可用');
    }
    
    // 检查设置状态
    console.log('2. 检查当前设置状态:');
    console.log('   - enableInputSpaceTranslation:', translationSettings.enableInputSpaceTranslation, typeof translationSettings.enableInputSpaceTranslation);
    
    // 检查DOM事件监听
    console.log('3. 检查DOM事件监听:');
    const testInput = document.createElement('input');
    testInput.type = 'text';
    testInput.value = 'test';
    console.log('   测试输入元素创建成功');
    console.log('   输入元素有效性检查:', testInput.tagName === 'INPUT' || testInput.tagName === 'TEXTAREA' || testInput.getAttribute('contenteditable') === 'true');
    
    // 检查事件传播
    console.log('4. 检查事件传播:');
    console.log('   已创建测试键盘事件');
    
    // 检查功能是否启用的条件
    console.log('5. 功能启用条件评估:');
    const isFeatureEnabled = translationSettings.enableInputSpaceTranslation;
    console.log('   空格翻译功能状态:', isFeatureEnabled);
    console.log('   条件分析:');
    if (!translationSettings.enableInputSpaceTranslation) console.log('   - 空格翻译功能未启用');
    if (isFeatureEnabled) console.log('   - 功能已启用，应当正常工作');
  } catch (error) {
    console.error('诊断过程中出错:', error);
  }
  
  console.log('========== 功能诊断结束 ==========');
}

// 初始化
async function init() {
  console.log('Transor 内容脚本已加载');
  
  try {
    // 初始化全局tip系统
    console.log('初始化全局提示系统');
    setupGlobalTipSystem();
    
    // 加载设置
    console.log('加载设置');
    await loadSettings();
    
    // 运行功能诊断
    diagnoseFunctionality();
    
    // 添加调试面板 - 开发环境或手动启用时
    if (window.location.hostname.includes('localhost') || 
        window.location.hostname.includes('127.0.0.1') ||
        window.location.search.includes('transorDebug=true')) {
      console.log('开发环境或调试模式，添加调试面板');
      addDebugControls();
    }
    
    // 注入样式
    console.log('注入样式');
    injectStyles();
    
    // 初始化Intersection Observer
    console.log('初始化视图观察器');
    initIntersectionObserver();
    
    // 初始化滑词翻译功能
    console.log('初始化滑词翻译');
    initSelectionTranslator();
    
    // 初始化收藏高亮功能
    console.log('初始化收藏高亮功能');
    try {
      if (typeof window.TransorHighlighter !== 'undefined') {
        window.TransorHighlighter.init();
        console.log('收藏高亮功能初始化成功');
      } else {
        console.warn('TransorHighlighter 未找到，跳过高亮功能初始化');
      }
    } catch (highlightError) {
      console.error('初始化收藏高亮功能失败:', highlightError);
    }
    
    // 添加消息监听器处理快捷键
    console.log('设置消息监听器');
    setupMessageListeners();
    
    // 添加对全局切换事件的监听
    console.log('设置全局事件监听器');
    setupGlobalEventListeners();
    
    // 初始化输入框内容翻译功能 - 新增
    console.log('初始化输入框空格翻译功能');
    try {
      initInputTranslation();
      console.log('输入框空格翻译功能初始化成功');
    } catch (inputTransError) {
      console.error('初始化输入框空格翻译功能失败:', inputTransError);
    }
    
    // 自动翻译（如果启用）
    if (translationSettings.isEnabled) {
      console.log('翻译功能已启用，将在延迟后开始翻译');
      setTimeout(() => {
        translateVisibleContent();
      }, 1000); // 延迟1秒，等待页面完全加载
    }
    
    console.log('Transor 内容脚本初始化完成');
  } catch (error) {
    console.error('Transor 内容脚本初始化失败:', error);
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
  console.log('开始从存储中加载设置...');
  
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (result) => {
      console.log('从存储中获取的原始设置:', result);
      
      // 记录设置更新前的状态
      const prevSettings = { ...translationSettings };
      
      if (result.isEnabled !== undefined) translationSettings.isEnabled = result.isEnabled;
      if (result.targetLanguage) translationSettings.targetLanguage = result.targetLanguage;
      if (result.sourceLanguage) translationSettings.sourceLanguage = result.sourceLanguage;
      if (result.translationEngine) translationSettings.translationEngine = result.translationEngine;
      if (result.translationStyle) translationSettings.translationStyle = result.translationStyle;
      if (result.excludedTags) translationSettings.excludedTags = result.excludedTags;
      if (result.excludedClasses) translationSettings.excludedClasses = result.excludedClasses;
      if (result.customCss) translationSettings.customCss = result.customCss;
      
      // 添加字体颜色设置
      if (result.fontColor) translationSettings.fontColor = result.fontColor;
      
      // 特别注意这个设置
      if (result.enableInputSpaceTranslation !== undefined) {
        console.log('发现空格翻译功能设置:', result.enableInputSpaceTranslation);
        translationSettings.enableInputSpaceTranslation = result.enableInputSpaceTranslation;
      } else {
        console.log('未找到空格翻译功能设置，使用默认值:', translationSettings.enableInputSpaceTranslation);
      }
      
      // 记录设置变化
      console.log('设置已更新，关键设置变化:');
      console.log('- 翻译开关(isEnabled):', prevSettings.isEnabled, '->', translationSettings.isEnabled);
      console.log('- 空格翻译(enableInputSpaceTranslation):', prevSettings.enableInputSpaceTranslation, 
                  '->', translationSettings.enableInputSpaceTranslation);
      console.log('- 字体颜色(fontColor):', prevSettings.fontColor, '->', translationSettings.fontColor);
      
      console.log('所有设置已加载完成:', translationSettings);
      resolve();
    });
  });
}

// 注入样式
function injectStyles() {
  // 创建CSS样式
  const style = document.createElement('style');
  style.id = 'transor-styles';
  
  // 使用配置的字体颜色或默认值
  const fontColor = translationSettings.fontColor || '#ff5588';
  
  let css = `
    .transor-translation {
      font-size: inherit;
      line-height: inherit;
    }
    
    .transor-inline {
      /* 移除原文样式修改 */
      padding: 0;
      margin: 0;
    }
    
    /* 内联翻译文本 */
    .transor-inline-text {
      color: ${fontColor};
      margin-left: 0.25em;
    }
    
    /* 双语翻译容器 */
    .transor-bilingual {
      display: block;
    }
    
    /* 原文容器 */
    .transor-original-text {
      /* 保持原文样式不变 */
    }
    
    /* 双语模式的翻译文本 */
    .transor-bilingual-text {
      color: ${fontColor};
      margin-top: 5px;
      display: block;
    }
    
    .transor-replace {
      display: inline;
      color: inherit; /* 使用继承的颜色 */
    }
    
    /* 导航和小空间元素的翻译提示样式 - 基本样式，详细样式由全局系统提供 */
    .transor-tip {
      position: relative;
      display: inline-block;
      cursor: pointer;
    }
    
    .transor-tip-indicator {
      display: inline-block;
      width: 6px;
      height: 6px;
      background-color: ${fontColor};
      border-radius: 50%;
      margin-left: 3px;
      vertical-align: super;
      font-size: 8px;
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
  
  // 检查是否是滑词翻译弹窗或在滑词翻译弹窗内部
  if (element.classList && element.classList.contains('transor-selection-translator')) {
    return false;
  }
  
  // 检查是否在滑词翻译弹窗内部
  if (element.closest && element.closest('.transor-selection-translator')) {
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
  
  // 检查文本是否已经是目标语言
  const targetLang = translationSettings.targetLanguage;
  if (targetLang && isTextInLanguage(textContent, targetLang)) {
    console.log(`跳过翻译: 文本已经是目标语言 ${targetLang}`, textContent.substring(0, 30) + (textContent.length > 30 ? '...' : ''));
    return false;
  }
  
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
        if (element.classList.contains('transor-tip')) {
          // 导航提示样式：原文保存在元素的textContent中（不包括提示框和指示器）
          // 移除指示器的文本内容
          const indicator = element.querySelector('.transor-tip-indicator');
          originalText = element.textContent;
          if (indicator) {
            originalText = originalText.replace(indicator.textContent, '');
          }
          
          // 移除可能的popup内容
          const popup = element.querySelector('.transor-tip-popup');
          if (popup && originalText.includes(popup.textContent)) {
            originalText = originalText.replace(popup.textContent, '');
          }
        } else if (element.querySelector('.transor-inline')) {
          // 内联样式：原文是第一部分，不包括翻译部分
          const translationPart = element.querySelector('.transor-inline-text');
          originalText = element.textContent;
          if (translationPart) {
            originalText = originalText.replace(translationPart.textContent, '');
          }
        } else if (element.querySelector('.transor-bilingual')) {
          // 双语样式：原文在原文容器中
          const originalElement = element.querySelector('.transor-original-text');
          if (originalElement) {
            originalText = originalElement.textContent || '';
          }
        } else if (element.classList.contains('transor-replace')) {
          // 替换样式：使用保存的数据属性
          originalText = element.getAttribute('data-original-text') || '';
        } else {
          // 其他样式：使用保存的数据属性或者使用父元素的内容
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
  
  // 代码特征匹配计数
  let codePatternMatchCount = 0;
  
  // 统计匹配到的代码特征数量
  for (const pattern of codePatterns) {
    if (pattern.test(text)) {
      codePatternMatchCount++;
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
  
  // 计算符号密度
  const symbolRatio = symbolCount / text.length;
  
  // 文本行数
  const lineCount = text.split('\n').length;
  
  // 行平均长度
  const avgLineLength = text.length / lineCount;
  
  // 检查是否包含自然语言特征
  const naturalLanguagePatterns = [
    /[。，？！；：""''「」]/,   // 中文标点
    /[\u4e00-\u9fa5]{5,}/,      // 连续5个以上汉字
    /\b(the|and|that|this|but|for|you|what|where|when|why|how|who|with|about)\b/i, // 英文常用虚词
    /\b[A-Z][a-z]+\b \b[A-Z][a-z]+\b/  // 连续的首字母大写单词(可能是人名)
  ];
  
  // 检查自然语言特征
  let naturalLanguageFeatures = 0;
  for (const pattern of naturalLanguagePatterns) {
    if (pattern.test(text)) {
      naturalLanguageFeatures++;
    }
  }
  
  // 综合判断是否是完整的代码:
  // 1. 有足够多的代码特征匹配
  // 2. 代码符号密度达到阈值
  // 3. 没有明显的自然语言特征
  // 4. 考虑文本的行特征(代码通常有特定的行长度特征)
  
  const isCode = (
    // 至少匹配到3个以上的代码特征
    (codePatternMatchCount >= 3 || 
     // 或者符号密度非常高
     symbolRatio > 0.18) && 
    // 且没有明显的自然语言特征
    naturalLanguageFeatures === 0 &&
    // 行长度特征：代码行通常不会太长也不会太短
    (avgLineLength > 10 && avgLineLength < 120)
  );
  
  return isCode;
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
      // 使用 tips Map 而不是 tipElements
      if (!window.transorTipSystem.tips) return;
      
      // 遍历 tips Map
      window.transorTipSystem.tips.forEach((info, element) => {
        if (element && document.body.contains(element)) {
          // 重新绑定事件函数
          const onMouseEnter = function() {
            // 检查两种可能的ID属性
            const popupId = element.getAttribute('data-tip-id') || element.getAttribute('data-popup-id');
            if (!popupId) return;
            
            const popup = document.getElementById(popupId);
            if (!popup) return;
            
            // 标记为激活
            element.setAttribute('data-active', 'true');
            
            // 显示提示框
            popup.classList.add('active');
            
            // 更新位置
            const rect = element.getBoundingClientRect();
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
            const popupId = element.getAttribute('data-tip-id') || element.getAttribute('data-popup-id');
            if (!popupId) return;
            
            const popup = document.getElementById(popupId);
            if (!popup) return;
            
            // 标记为非激活
            element.setAttribute('data-active', 'false');
            
            // 隐藏提示框
            popup.classList.remove('active');
          };
          
          const onTipClick = function() {
            if (element.getAttribute('data-active') === 'true') {
              onMouseLeave.call(element);
            } else {
              // 这里也要修改，使用 tips 而不是 tipElements
              window.transorTipSystem.tips.forEach((info, tip) => {
                if (tip !== element) {
                  // 检查两种可能的ID属性
                  const popupId = tip.getAttribute('data-tip-id') || tip.getAttribute('data-popup-id');
                  if (popupId) {
                    const popup = document.getElementById(popupId);
                    if (popup) {
                      tip.setAttribute('data-active', 'false');
                      popup.classList.remove('active');
                    }
                  }
                }
              });
              onMouseEnter.call(element);
            }
          };
          
          // 移除旧的事件监听器
          element.removeEventListener('mouseenter', onMouseEnter);
          element.removeEventListener('mouseleave', onMouseLeave);
          element.removeEventListener('click', onTipClick);
          
          // 添加新的事件监听器
          element.addEventListener('mouseenter', onMouseEnter);
          element.addEventListener('mouseleave', onMouseLeave);
          element.addEventListener('click', onTipClick);
          
          // 对于触摸设备
          element.removeEventListener('touchstart', onTipClick);
          element.addEventListener('touchstart', onTipClick, {passive: false});
        } else {
          // 如果元素已不在DOM中，从集合移除
          window.transorTipSystem.unregisterTip(element);
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
    if (window.transorTipSystem && window.transorTipSystem.tips) {
      window.transorTipSystem.tips.forEach((info, item) => {
        // 检查元素是否激活
        if (item.getAttribute('data-active') === 'true') {
          // 检查两种可能的ID属性
          const popupId = item.getAttribute('data-tip-id') || item.getAttribute('data-popup-id');
          if (popupId) {
            const popup = document.getElementById(popupId);
            if (popup && popup.classList.contains('active')) {
              // 更新位置
              const rect = item.getBoundingClientRect();
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
              // 检查是否已经注册 - 使用 tips 而不是 tipElements
              let isRegistered = false;
              if (window.transorTipSystem.tips) {
                window.transorTipSystem.tips.forEach((info, element) => {
                  if (element === tipElement) {
                    isRegistered = true;
                  }
                });
              }
              
              // 如果未注册，则添加到系统中
              if (!isRegistered) {
                window.transorTipSystem.registerTip(tipElement, popup);
              }
            }
          }
        });
      }
    }, 1500);
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
  
  // 创建标题栏
  const header = document.createElement('div');
  header.className = 'transor-selection-header no-translate';
  
  // 创建logo
  const logo = document.createElement('div');
  logo.className = 'transor-selection-logo no-translate';
  // 使用图片替代文字T
  const logoImg = document.createElement('img');
  logoImg.src = chrome.runtime.getURL('logos/logo16.png');
  logoImg.alt = 'Transor Logo';
  logoImg.width = 16;
  logoImg.height = 16;
  logo.appendChild(logoImg);
  
  // 创建操作按钮容器
  const actions = document.createElement('div');
  actions.className = 'transor-selection-actions no-translate';
  
  // 添加操作按钮：播放、复制、收藏、关闭
  const playBtn = document.createElement('button');
  playBtn.className = 'transor-selection-action-btn transor-play-btn no-translate';
  playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"></path></svg>';
  playBtn.title = '朗读原文';
  playBtn.style.display = 'none'; // 初始时隐藏
  
  const copyBtn = document.createElement('button');
  copyBtn.className = 'transor-selection-action-btn transor-copy-btn no-translate';
  copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>';
  copyBtn.title = '复制翻译结果';
  copyBtn.style.display = 'none'; // 初始时隐藏
  
  const favoriteBtn = document.createElement('button');
  favoriteBtn.className = 'transor-selection-action-btn transor-favorite-btn no-translate';
  favoriteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
  favoriteBtn.title = '收藏到词典';
  favoriteBtn.style.display = 'none'; // 初始时隐藏
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'transor-selection-action-btn transor-close-btn no-translate';
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>';
  closeBtn.title = '关闭';
  
  // 添加按钮到操作容器
  actions.appendChild(playBtn);
  actions.appendChild(copyBtn);
  actions.appendChild(favoriteBtn);
  actions.appendChild(closeBtn);
  
  // 组装标题栏
  header.appendChild(logo);
  header.appendChild(actions);
  
  // 创建内容容器
  const content = document.createElement('div');
  content.className = 'transor-selection-content no-translate'; // 添加no-translate类
  
  // 将所有元素添加到弹窗
  popup.appendChild(header);
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
      border-radius: 12px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
      z-index: 99999;
      width: 320px;
      pointer-events: auto;
      user-select: text;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
      overflow: hidden;
      transition: opacity 0.2s, transform 0.2s;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 0, 0, 0.05);
    }
    
    /* 确保滑词翻译弹窗中的所有元素不被翻译 */
    .transor-selection-translator * {
      translate: none !important;
    }
    
    .transor-selection-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      background: rgba(250, 250, 250, 0.8);
    }
    
    .transor-selection-logo {
      font-weight: bold;
      color: #ff5588;
      font-size: 16px;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .transor-selection-logo img {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
    
    .transor-selection-actions {
      display: flex;
      gap: 8px;
    }
    
    .transor-selection-action-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #666;
      border-radius: 4px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.2s;
    }
    
    .transor-selection-action-btn:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: #ff5588;
    }
    
    .transor-favorite-btn.active {
      color: #ff9500;
    }
    
    .transor-selection-content {
      padding: 12px 16px;
      max-height: 400px;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    
    .transor-selection-content::-webkit-scrollbar {
      width: 4px;
    }
    
    .transor-selection-content::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }
    
    .transor-selection-word {
      margin-bottom: 5px;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    
    .transor-selection-phonetic {
      color: #ff6b6b;
      margin-bottom: 12px;
      font-size: 14px;
    }
    
    .transor-selection-word-details {
      margin-bottom: 15px;
    }
    
    .transor-selection-pos {
      color: #6c5ce7;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 6px;
      display: inline-block;
      background-color: rgba(108, 92, 231, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
    }
    
    .transor-selection-pos-block {
      margin-bottom: 16px;
    }
    
    .transor-selection-pos-block .transor-selection-pos {
      margin-bottom: 6px;
      display: block;
      margin-right: 0;
    }
    
    .transor-selection-meanings {
      line-height: 1.6;
      font-size: 14px;
      color: #333;
      margin-left: 0;
    }
    
    .transor-selection-pos-meaning {
      margin-bottom: 12px;
      line-height: 1.6;
      font-size: 14px;
      color: #333;
    }
    
    .transor-selection-pos-meaning .transor-selection-pos {
      margin-bottom: 0;
      margin-right: 8px;
    }
    
    .transor-selection-definition {
      margin-bottom: 16px;
    }
    
    .transor-selection-definition-item {
      margin-bottom: 6px;
      display: flex;
      line-height: 1.5;
    }
    
    .transor-selection-definition-item:before {
      content: "•";
      margin-right: 8px;
      color: #ff5588;
      font-weight: bold;
    }
    
    .transor-selection-sentence {
      border-left: 2px solid #ff5588;
      padding-left: 10px;
      margin: 10px 0;
      font-style: italic;
      color: #666;
    }
    
    .transor-selection-original {
      color: #666;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
      display: block;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .transor-selection-translation {
      color: #333;
      font-weight: 500;
      display: block;
      font-size: 15px;
      line-height: 1.6;
    }
    
    .transor-loading-dots {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 16px;
    }
    
    .transor-loading-dots span {
      width: 4px;
      height: 4px;
      background-color: #ff5588;
      border-radius: 50%;
      display: inline-block;
      animation: transorDotPulse 1.4s infinite ease-in-out both;
    }
    
    .transor-loading-dots span:nth-child(1) {
      animation-delay: -0.32s;
    }
    
    .transor-loading-dots span:nth-child(2) {
      animation-delay: -0.16s;
    }
    
    .transor-section-title {
      font-weight: 600;
      margin: 15px 0 8px;
      color: #333;
      font-size: 15px;
      display: flex;
      align-items: center;
    }
    
    .transor-section-title:before {
      content: "";
      display: inline-block;
      width: 3px;
      height: 14px;
      background-color: #ff5588;
      margin-right: 6px;
      border-radius: 2px;
    }
    
    .transor-tabs {
      display: flex;
      margin-top: 15px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      margin-bottom: 12px;
    }
    
    .transor-tab {
      padding: 6px 12px;
      cursor: pointer;
      color: #666;
      border-bottom: 2px solid transparent;
      margin-right: 8px;
      font-size: 13px;
      font-weight: 500;
    }
    
    .transor-tab.active {
      color: #ff5588;
      border-bottom: 2px solid #ff5588;
    }
    
    .transor-panel {
      display: none;
      padding-top: 10px;
    }
    
    .transor-panel.active {
      display: block;
    }
    
    @keyframes transorDotPulse {
      0%, 80%, 100% { 
        transform: scale(0);
      } 40% { 
        transform: scale(1);
      }
    }
    
    /* 暗色主题支持 */
    @media (prefers-color-scheme: dark) {
      .transor-selection-translator {
        background: #282c34;
        border-color: rgba(255, 255, 255, 0.1);
        color: #eee;
      }
      
      .transor-selection-header {
        background: rgba(40, 44, 52, 0.8);
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .transor-selection-original {
        color: #bbb;
        border-color: rgba(255, 255, 255, 0.1);
    }
    
      .transor-selection-word {
        color: #eee;
      }
      
      .transor-selection-translation {
        color: #eee;
      }
      
      .transor-selection-action-btn {
        color: #aaa;
      }
      
      .transor-selection-action-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      .transor-section-title {
        color: #eee;
      }
      
      .transor-selection-sentence {
        color: #aaa;
      }
      
      .transor-selection-definition-item {
        color: #ddd;
      }
      
      .transor-tab {
        color: #aaa;
      }
      
      .transor-tabs {
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .transor-selection-pos {
        background-color: rgba(108, 92, 231, 0.2);
      }
      
      .transor-selection-pos-meaning {
        color: #eee;
      }
      
      .transor-selection-meanings {
        color: #eee;
      }
    }
    
    /* 平滑进场动画 */
    @keyframes transorFadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .transor-fade-in {
      animation: transorFadeIn 0.2s ease-out forwards;
    }
  `;
  
  document.head.appendChild(style);
  
  // 事件处理
  
  // 关闭按钮
  closeBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    popup.style.display = 'none';
  });
  
  // 复制按钮
  copyBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const translation = popup.querySelector('.transor-selection-translation');
    if (translation) {
      const text = translation.textContent;
      navigator.clipboard.writeText(text).then(() => {
        // 显示复制成功提示
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>';
        copyBtn.style.color = '#ff5588';
        
        setTimeout(() => {
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>';
          copyBtn.style.color = '';
        }, 1500);
      });
    }
  });
  
  // 朗读按钮
  playBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const original = popup.querySelector('.transor-selection-original');
    if (original && original.textContent) {
      // 使用浏览器内置的语音合成API
      const utterance = new SpeechSynthesisUtterance(original.textContent);
      
      // 根据源语言设置语音
      const sourceLang = translationSettings.sourceLanguage;
      if (sourceLang && sourceLang !== 'auto') {
        utterance.lang = sourceLang;
      }
      
      // 播放语音
      window.speechSynthesis.speak(utterance);
      
      // 更新按钮状态
      playBtn.classList.add('active');
      playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>';
      
      // 监听语音结束
      utterance.onend = function() {
        playBtn.classList.remove('active');
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"></path></svg>';
      };
    }
  });
  
  // 处理标签页切换
  popup.addEventListener('click', function(e) {
    if (e.target.classList.contains('transor-tab')) {
      const tabs = popup.querySelectorAll('.transor-tab');
      const panels = popup.querySelectorAll('.transor-panel');
      const targetId = e.target.getAttribute('data-target');
      
      // 更新标签和面板的活动状态
      tabs.forEach(tab => tab.classList.remove('active'));
      e.target.classList.add('active');
      
      panels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === targetId) {
          panel.classList.add('active');
        }
      });
    }
  });
  
  // 在文档中创建一个全局引用，以便可以从其他地方访问
  window.transorSelectionPopup = popup;
  
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
  let currentPopupWord = ''; // 词典弹窗当前对应的单词
  let lastMouseUpText = '';  // 最近一次 mouseup 事件的原始文本
  let selectionTimer = null;
  let lastDictRequestTime = 0; // 记录上一次词典请求的时间
  let lastMousePosition = { x: 0, y: 0 }; // 确保 lastMousePosition 已定义
  
  // 监听鼠标按下事件，记录位置
  document.addEventListener('mousedown', function(e) {
    lastMousePosition = { x: e.clientX, y: e.clientY };
  }, { passive: true });
  
  // 监听鼠标移动，更新最后位置
  document.addEventListener('mousemove', function(e) {
    lastMousePosition = { x: e.clientX, y: e.clientY };
  }, { passive: true });
  
  // 监听选中事件
  document.addEventListener('mouseup', async function(e) {
    // 获取选中文本
    const selection = window.getSelection();
    const rawSelectedText = selection.toString().trim();
    
    // 如果没有选中文本或选中的是翻译器内容，则不处理
    if (!rawSelectedText || e.target.closest('.transor-selection-translator')) {
      return;
    }
    
    // 存储最近一次的原始选择文本，供setTimeout使用
    lastMouseUpText = rawSelectedText;
    
    // 防抖处理，避免频繁翻译
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(async () => {
      const textToProcess = lastMouseUpText; // 使用最近一次mouseup的文本

      // 判断对于弹窗来说，这是否是一个新的单词
      const isNewWordForPopup = textToProcess !== currentPopupWord;
      
      try {
        // 检查文本长度，如果太长，可能是段落，先确认是否需要翻译
        if (textToProcess.length > 300) {
          // 使用动画显示翻译窗口
          popup.classList.add('transor-fade-in');
          popup.style.display = 'block';
          
          // 定位翻译窗口
          positionPopup();
          
          // 询问是否需要翻译
          popupContent.innerHTML = `
            <div class="transor-selection-original no-translate">${escapeHtml(textToProcess.substring(0, 100) + '...')}</div>
            <div class="transor-selection-translation no-translate">
              <p>所选文本较长 (${textToProcess.length} 字符)，是否翻译？</p>
              <div style="display: flex; gap: 10px; margin-top: 12px;">
                <button class="transor-confirm-btn" style="background: #ff5588; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">翻译</button>
                <button class="transor-cancel-btn" style="background: #f5f5f5; color: #666; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">取消</button>
              </div>
            </div>
          `;
          
          // 添加按钮事件
          const confirmBtn = popupContent.querySelector('.transor-confirm-btn');
          const cancelBtn = popupContent.querySelector('.transor-cancel-btn');
          
          // 确保移除旧的事件监听器
          if (confirmBtn._clickHandler) {
            confirmBtn.removeEventListener('click', confirmBtn._clickHandler);
          }
          if (cancelBtn._clickHandler) {
            cancelBtn.removeEventListener('click', cancelBtn._clickHandler);
          }
          
          // 添加新的事件监听器并保存引用
          confirmBtn._clickHandler = function() {
            currentPopupWord = textToProcess; // 确认后，更新弹窗对应的单词
            translateSelectedText(textToProcess, true); // 长文本确认翻译时，强制刷新
          };
          cancelBtn._clickHandler = function() {
            popup.style.display = 'none';
          };
          
          confirmBtn.addEventListener('click', confirmBtn._clickHandler);
          cancelBtn.addEventListener('click', cancelBtn._clickHandler);
          
          return;
        }
        
        // 短文本直接翻译
        // isNewWordForPopup 会传递给 translateSelectedText
        translateSelectedText(textToProcess, isNewWordForPopup);

      } catch (error) {
        console.error('Selection translation error:', error);
        popupContent.innerHTML = `
          <div class="transor-selection-original no-translate">${escapeHtml(textToProcess)}</div>
          <div class="transor-selection-translation no-translate">翻译失败: ${error.message}</div>
        `;
      }
    }, 200);
  });
  
  // 翻译选中的文本
  async function translateSelectedText(text, isNewWordForPopupContext = false) {
    // 更新当前弹窗正在处理的单词
    currentPopupWord = text;

    // 使用动画显示翻译窗口
    popup.classList.add('transor-fade-in');
    popup.style.display = 'block';
    
    // 隐藏功能按钮，只保留关闭按钮
    const playBtn = popup.querySelector('.transor-play-btn');
    const copyBtn = popup.querySelector('.transor-copy-btn');
    const favoriteBtn = popup.querySelector('.transor-favorite-btn');
    const closeBtn = popup.querySelector('.transor-close-btn');
    
    if (playBtn) playBtn.style.display = 'none';
    if (copyBtn) copyBtn.style.display = 'none';
    if (favoriteBtn) favoriteBtn.style.display = 'none';
    if (closeBtn) closeBtn.style.display = ''; // 关闭按钮始终显示
    
    // 定位翻译窗口 - 使用最后的鼠标位置
    positionPopup();
    
    // 检查是否是代码
    if (looksLikeCode(text)) {
      // 如果是代码，不进行翻译
      popupContent.innerHTML = `
        <div class="transor-selection-original no-translate">${escapeHtml(text)}</div>
        <div class="transor-selection-translation no-translate">代码内容无需翻译</div>
      `;
      
      // 保持按钮隐藏状态，代码不需要功能按钮
    } else {
      // 显示加载中
      popupContent.innerHTML = `
        <div class="transor-selection-original no-translate">${escapeHtml(text)}</div>
        <div class="transor-selection-translation no-translate">
          <div class="transor-loading-dots no-translate"><span></span><span></span><span></span></div>
        </div>
      `;
      
      // 使用后台脚本进行翻译
      let translation = text;
      let dictResult = null;
      
      // 检查是否是单个单词 - 只对纯英文单词使用词典
      const isJustOneWord = /^[a-zA-Z]+$/.test(text.trim());
      const isEnglish = /^[a-zA-Z\s\-',.!?]+$/.test(text.trim());

      try {
        const currentTime = Date.now();
        // 词典API是否强制刷新：如果是弹窗的新单词，或者距离上次词典请求超过10秒
        const forceRefreshDictApi = isNewWordForPopupContext || (currentTime - lastDictRequestTime > 10000);
        if (forceRefreshDictApi) {
          lastDictRequestTime = currentTime; // 更新最近一次词典请求时间
        }
        
        const [translationResult, dictResponse] = await Promise.all([
          new Promise((resolve) => {
            translationQueue.add(text, result => {
              resolve(result);
            });
          }),
          // 只有单个单词时才请求词典数据
          isJustOneWord ? fetchDictionaryData(text, forceRefreshDictApi) : Promise.resolve(null)
        ]);
        
        translation = translationResult;
        dictResult = dictResponse;
        
        // 增强日志记录
        console.log(`[Transor] Selected text: "${text}"`);
        if (dictResult) {
          console.log(`[Transor] Dict API response success: ${dictResult.success}`);
          if (dictResult.success && dictResult.data) {
            console.log(`[Transor] Dict API queried for (from background): "${dictResult.queriedWord}", API returned word: "${dictResult.data.word}", RequestID: ${dictResult.requestId}`);
            console.log('[Transor] Dict full data:', JSON.parse(JSON.stringify(dictResult.data)));
          } else if (!dictResult.success) {
            console.log(`[Transor] Dict API call failed for "${text}". Queried for (from background): "${dictResult.queriedWord}". Error: ${dictResult.error}, RequestID: ${dictResult.requestId}`);
          }
        } else {
          console.log(`[Transor] No dictionary result for "${text}" (not a single word or forced sentence translation).`);
        }

      } catch (translationError) {
        console.error('翻译过程出错:', translationError);
        translation = `[翻译失败] ${text}`;
      }
      
      const cleanTranslation = typeof translation === 'string' ? 
                             translation.replace(/,\s*(en|zh-CN|zh|auto)$/i, '') : 
                             translation;
      
      let contentHTML = '';
      let useDictionaryLayout = false;
      
      if (isJustOneWord && dictResult && dictResult.success && dictResult.data) {
        // 数据一致性校验
        const dictDataWord = dictResult.data.word;
        const queriedWordByBg = dictResult.queriedWord;

        if (queriedWordByBg && queriedWordByBg.toLowerCase() === text.toLowerCase() &&
            dictDataWord && dictDataWord.toLowerCase() === text.toLowerCase()) {
          useDictionaryLayout = true;
        } else {
          console.warn(`[Transor] Mismatched dictionary data. Selected: "${text}", Queried by BG: "${queriedWordByBg}", API returned word: "${dictDataWord}". Falling back to simple translation display.`);
        }
      }

      if (useDictionaryLayout) {
        const dict = dictResult.data;
        contentHTML += `<div class="transor-selection-word no-translate">${escapeHtml(dict.word || text)}</div>`;
        if (dict.phonetic) {
          contentHTML += `<div class="transor-selection-phonetic no-translate">/${escapeHtml(dict.phonetic)}/</div>`;
        }
        contentHTML += `
          <div class="transor-tabs no-translate">
            <div class="transor-tab active no-translate" data-target="transor-dict-panel">词典</div>
            <div class="transor-tab no-translate" data-target="transor-trans-panel">翻译</div>
          </div>
          <div id="transor-dict-panel" class="transor-panel active no-translate">
            <div class="transor-selection-word-details no-translate">
        `;
        if (dict.definitions && dict.definitions.length > 0) {
          dict.definitions.forEach(def => {
            if (def.pos && (def.meanings || def.meaning)) {
              // 每个词性单独一行，释义在下一行
              let meanings = [];
              if (def.meanings && def.meanings.length > 0) {
                meanings = def.meanings;
              } else if (def.meaning) {
                meanings = [def.meaning];
              }
              
              // 将多个意思用分号连接
              const combinedMeanings = meanings.join('；');
              contentHTML += `<div class="transor-selection-pos-block no-translate">
                <div class="transor-selection-pos no-translate">${escapeHtml(def.pos)}</div>
                <div class="transor-selection-meanings no-translate">${escapeHtml(combinedMeanings)}</div>
              </div>`;
            }
          });
        } else {
          contentHTML += `
            <div class="transor-selection-pos-block no-translate">
              <div class="transor-selection-pos no-translate">${isEnglish ? 'n.' : '词义'}</div>
              <div class="transor-selection-meanings no-translate">${escapeHtml(cleanTranslation)}</div>
            </div>
          `;
        }
        contentHTML += `</div>`; // word-details
        // 移除例句部分，不再显示
        contentHTML += `</div>`; // dict-panel
        contentHTML += `
          <div id="transor-trans-panel" class="transor-panel no-translate">
            <div class="transor-selection-translation no-translate">${escapeHtml(cleanTranslation)}</div>
          </div>
        `;
      } else {
        // 使用简单翻译显示
        contentHTML = `
            <div class="transor-selection-original no-translate">${escapeHtml(text)}</div>
            <div class="transor-selection-translation no-translate">${escapeHtml(cleanTranslation)}</div>
        `;
      }
      
      popupContent.innerHTML = contentHTML;
      
      // 确保所有动态创建的元素都有no-translate类
      popupContent.querySelectorAll('*').forEach(el => {
        if (!el.classList.contains('no-translate')) {
          el.classList.add('no-translate');
        }
      });
      
      // 显示功能按钮
      if (playBtn) playBtn.style.display = '';
      if (copyBtn) copyBtn.style.display = '';
      if (favoriteBtn) favoriteBtn.style.display = '';
      
      // 设置功能按钮事件
      const favoriteButtonEl = popup.querySelector('.transor-favorite-btn');
      if (favoriteButtonEl) {
        const oldClone = favoriteButtonEl.cloneNode(true);
        favoriteButtonEl.parentNode.replaceChild(oldClone, favoriteButtonEl);
        oldClone.addEventListener('click', function() {
          this.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" /></path></svg>';
          this.title = '正在收藏...';
          saveFavorite(text, cleanTranslation).then(success => {
            if (success) {
              this.classList.add('active');
              this.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
              this.title = '已收藏';
            } else {
              this.classList.remove('active');
              this.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>';
              this.title = '收藏到词典';
            }
          });
        });
      }
      
      // 添加播放按钮功能
      const playButtonEl = popup.querySelector('.transor-play-btn');
      if (playButtonEl) {
        const oldPlayBtn = playButtonEl.cloneNode(true);
        playButtonEl.parentNode.replaceChild(oldPlayBtn, playButtonEl);
        oldPlayBtn.addEventListener('click', function() {
          const contentToRead = text;
          if (contentToRead) {
            const utterance = new SpeechSynthesisUtterance(contentToRead);
            if (isEnglish) {
              utterance.lang = 'en-US';
            } else {
              const sourceLang = translationSettings.sourceLanguage;
              if (sourceLang && sourceLang !== 'auto') {
                utterance.lang = sourceLang;
              }
            }
            window.speechSynthesis.speak(utterance);
            this.classList.add('active');
            this.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>';
            utterance.onend = () => {
              this.classList.remove('active');
              this.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"></path></svg>';
            };
            utterance.onerror = () => {
              this.classList.remove('active');
              this.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"></path></svg>';
              console.error('语音合成出错');
            };
          }
        });
      }
      
      // 添加复制按钮功能
      const copyButtonEl = popup.querySelector('.transor-copy-btn');
      if (copyButtonEl) {
        const oldCopyBtn = copyButtonEl.cloneNode(true);
        copyButtonEl.parentNode.replaceChild(oldCopyBtn, copyButtonEl);
        oldCopyBtn.addEventListener('click', function() {
          const translationEl = popup.querySelector('.transor-selection-translation');
          if (translationEl) {
            const text = translationEl.textContent;
            navigator.clipboard.writeText(text).then(() => {
              // 显示复制成功提示
              this.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>';
              this.style.color = '#ff5588';
              
              setTimeout(() => {
                this.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"></path></svg>';
                this.style.color = '';
              }, 1500);
            });
          }
        });
      }
    }
      
    setTimeout(() => popup.classList.remove('transor-fade-in'), 300);
  }
  
  // 定位弹窗函数
  function positionPopup() {
    // 获取当前选中范围
    const selection = window.getSelection();
    
    // 优先使用选中文本的位置
    if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
      // 使用智能定位算法
      smartPositionPopup(rect);
    } else {
      // 使用鼠标位置作为备选
      const mouseRect = {
        left: lastMousePosition.x,
        right: lastMousePosition.x,
        top: lastMousePosition.y,
        bottom: lastMousePosition.y,
        width: 0,
        height: 0
      };
      
      smartPositionPopup(mouseRect);
    }
  }
  
  // 智能定位弹窗
  function smartPositionPopup(rect) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // 获取弹窗尺寸
    const popupWidth = 320; // 弹窗固定宽度
    const popupHeight = Math.min(popup.offsetHeight || 300, 400); // 弹窗高度，设置最大值
    
    // 默认弹窗位置（居中）
    let left = rect.left + (rect.width / 2) - (popupWidth / 2) + scrollX;
    let top = rect.bottom + 10 + scrollY;
    
    // 检查右侧空间
    if (left + popupWidth > viewportWidth + scrollX) {
      left = viewportWidth + scrollX - popupWidth - 10;
    }
    
    // 检查左侧空间
    if (left < scrollX) {
      left = scrollX + 10;
    }
    
    // 检查底部空间 - 如果底部空间不足，则显示在上方
    if (rect.bottom + popupHeight + 10 > viewportHeight + scrollY) {
      // 判断顶部空间是否足够
      if (rect.top - popupHeight - 10 > scrollY) {
        // 在上方显示
        top = rect.top - popupHeight - 10 + scrollY;
      } else {
        // 空间都不足，则选择较大的空间显示
        const topSpace = rect.top - scrollY;
        const bottomSpace = viewportHeight - rect.bottom;
        
        if (topSpace > bottomSpace) {
          // 在上方显示，但可能会被截断
          top = rect.top - popupHeight - 10 + scrollY;
        } else {
          // 在下方显示，但可能会被截断
          top = rect.bottom + 10 + scrollY;
        }
      }
    }
    
    // 应用最终位置
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }
  
  // 点击其他区域隐藏翻译窗口
  document.addEventListener('mousedown', function(e) {
    // 如果点击的不是弹窗内容，且弹窗正在显示
    if (popup.style.display === 'block' && !popup.contains(e.target)) {
      // 添加淡出动画
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(10px)';
      
      // 延迟后隐藏
      setTimeout(() => {
        popup.style.display = 'none';
        popup.style.opacity = '1';
        popup.style.transform = 'translateY(0)';
      }, 200);
    }
  });
  
  // 监听鼠标滚动，智能更新翻译窗口位置
  document.addEventListener('scroll', function() {
    // 如果翻译窗口已显示
    if (popup.style.display === 'block') {
      // 获取当前选中范围
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          
          // 只有选中区域还在视口内才更新位置
          if (rect.top > -50 && 
              rect.bottom < window.innerHeight + 50 && 
              rect.left > -50 && 
              rect.right < window.innerWidth + 50) {
            
            // 使用智能定位更新位置
            const rect = range.getBoundingClientRect();
            
            // 使用智能定位算法
            smartPositionPopup(rect);
            
            return; // 已更新位置，不隐藏
          }
        }
      }
      
      // 如果选中范围无效或不可见，则淡出并隐藏翻译窗口
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(10px)';
      
      setTimeout(() => {
        popup.style.display = 'none';
        popup.style.opacity = '1';
        popup.style.transform = 'translateY(0)';
      }, 200);
    }
  }, { passive: true });
  
  // 添加窗口大小变化事件监听
  window.addEventListener('resize', function() {
    // 如果翻译窗口已显示，使用相同的逻辑更新位置
    if (popup.style.display === 'block') {
      const scrollEvent = new Event('scroll');
      document.dispatchEvent(scrollEvent);
    }
  }, { passive: true });
  
  // 添加键盘事件 - ESC关闭窗口
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && popup.style.display === 'block') {
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(10px)';
      
      setTimeout(() => {
        popup.style.display = 'none';
        popup.style.opacity = '1';
        popup.style.transform = 'translateY(0)';
      }, 200);
    }
  });
  
  // 使Promise化的saveFavorite函数
  async function saveFavorite(originalText, translatedText) {
    return new Promise((resolve) => {
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
    
    // 使用新的存储管理器保存收藏
    if (window.TransorStorageManager) {
      window.TransorStorageManager.addFavorite(favorite)
        .then(result => {
          if (result.success) {
            console.log(`✅ 成功保存收藏到${result.storageType}存储，总数: ${result.totalCount}`);
            
            // 触发新收藏项的高亮
            if (window.TransorHighlighter && typeof window.TransorHighlighter.highlightNew === 'function') {
              try {
                window.TransorHighlighter.highlightNew(originalText);
                console.log('已触发新收藏项高亮:', originalText);
              } catch (highlightError) {
                console.error('触发新收藏项高亮失败:', highlightError);
              }
            }
              
              resolve(true);
          } else {
            if (result.reason === 'already_exists') {
              console.log('该内容已被收藏，跳过');
                resolve(true); // 已存在也算成功
            } else if (result.isQuotaError) {
              console.error('❌ 存储配额不足:', result.error);
              // 尝试清理旧收藏
              window.TransorStorageManager.cleanupOldFavorites(50)
                .then(cleanupResult => {
                  if (cleanupResult.success) {
                    console.log(`已清理 ${cleanupResult.cleaned} 条旧收藏，请重试`);
                    // 递归重试一次
                    return window.TransorStorageManager.addFavorite(favorite);
                  }
                })
                .then(retryResult => {
                  if (retryResult && retryResult.success) {
                    console.log('✅ 清理后重试保存成功');
                    // 触发高亮
                    if (window.TransorHighlighter && typeof window.TransorHighlighter.highlightNew === 'function') {
                      window.TransorHighlighter.highlightNew(originalText);
                    }
                      resolve(true);
                  } else {
                    console.error('❌ 清理后重试仍然失败');
                      resolve(false);
                  }
                })
                .catch(error => {
                  console.error('❌ 清理旧收藏失败:', error);
                    resolve(false);
                });
            } else {
              console.error('❌ 保存收藏失败:', result.error);
                resolve(false);
            }
          }
        })
        .catch(error => {
          console.error('❌ 保存收藏异常:', error);
            resolve(false);
        });
    } else {
      // 降级到原有的存储方式
      console.warn('存储管理器不可用，使用原有方式');
      
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
                resolve(false);
            } else {
              console.log('成功保存收藏，总数:', favorites.length);
              
              // 触发新收藏项的高亮
              if (window.TransorHighlighter && typeof window.TransorHighlighter.highlightNew === 'function') {
                try {
                  window.TransorHighlighter.highlightNew(originalText);
                  console.log('已触发新收藏项高亮:', originalText);
                } catch (highlightError) {
                  console.error('触发新收藏项高亮失败:', highlightError);
                }
              }
                
                resolve(true);
            }
          });
        } else {
          console.log('该内容已被收藏，跳过');
            resolve(true); // 已存在也算成功
        }
      });
    }
    });
    }
  
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
  
  // 获取词典数据
  async function fetchDictionaryData(word, forceRefresh = false) { // forceRefresh parameter is used here
    return new Promise((resolve) => {
      // 根据forceRefresh决定是否使用新的时间戳
      const timestamp = forceRefresh ? new Date().getTime() : null; 
      console.log('[Transor FetchDict] Word:', word, 'ForceRefresh:', forceRefresh, 'Timestamp:', timestamp);
      
      chrome.runtime.sendMessage({
        action: 'fetchDictionary',
        word: word,
        sourceLang: translationSettings.sourceLanguage,
        targetLang: translationSettings.targetLanguage,
        timestamp: timestamp // Pass the potentially null timestamp
      }, response => {
        console.log('[Transor FetchDict] Response Rcvd - Success:', response?.success, 'For Word:', response?.queriedWord, 'API Word:', response?.data?.word, 'ReqID:', response?.requestId);
        resolve(response || null);
      });
    });
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
  // 如果已存在，不重复创建
  if (window.transorTipSystem) {
    return window.transorTipSystem;
  }
  
  // 创建tooltip样式
  const style = document.createElement('style');
  style.id = 'transor-tip-styles';
  
  // 使用配置的字体颜色
  const fontColor = translationSettings.fontColor || '#ff5588';
  
  style.textContent = `
    .transor-tip-popup {
      position: absolute;
      display: none;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 14px;
      line-height: 1.5;
      box-shadow: 0 3px 10px rgba(0,0,0,0.1);
      z-index: 99999;
      max-width: 300px;
      overflow-wrap: break-word;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      color: #333;
      /* 设置与文字颜色相关的边框 */
      border-left: 3px solid ${fontColor};
    }
    
    .transor-tip-popup.shown {
      display: block;
      opacity: 1;
    }
    
    /* 暗色主题支持 */
    @media (prefers-color-scheme: dark) {
      .transor-tip-popup {
        background: #2c2c2c;
        border-color: #444;
        color: #eee;
        border-left: 3px solid ${fontColor};
      }
    }
  `;
  
  document.head.appendChild(style);
  
  // 保留现有tipSystem对象的代码
  window.transorTipSystem = {
    initialized: false,
    tips: new Map(),
    activeEl: null,
    
    init() {
      if (this.initialized) return;
      this.initialized = true;
      
      // 添加全局事件监听
      document.addEventListener('mouseover', this.handleGlobalMouseOver.bind(this));
      document.addEventListener('mouseout', this.handleGlobalMouseOut.bind(this));
      document.addEventListener('click', this.handleGlobalClick.bind(this));
      window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
      window.addEventListener('resize', this.handleResize.bind(this), { passive: true });
      
      console.log('Transor tip系统已初始化');
    },
    
    registerTip(element, popup) {
      if (!element) return;
      
      // 如果传入的是文本而不是DOM元素，创建一个popup元素
      if (typeof popup === 'string') {
        const popupEl = document.createElement('div');
        popupEl.className = 'transor-tip-popup';
        popupEl.textContent = popup;
        popup = popupEl;
        document.body.appendChild(popupEl);
      }
      
      // 生成唯一ID以关联元素和popup
      const id = 'tip-' + Math.random().toString(36).substr(2, 9);
      element.setAttribute('data-tip-id', id);
      popup.setAttribute('data-tip-id', id);
      
      // 存储关联信息
      this.tips.set(element, { popup, id });
      
      // 确保系统已初始化
      if (!this.initialized) {
        this.init();
      }
    },
    
    unregisterTip(element) {
      if (!element) return;
      
      const tipInfo = this.tips.get(element);
      if (tipInfo) {
        const { popup } = tipInfo;
        if (popup && popup.parentNode) {
          popup.parentNode.removeChild(popup);
        }
        this.tips.delete(element);
      }
    },
    
    showTip(element) {
      if (!element) return;
      
      const tipInfo = this.tips.get(element);
      if (!tipInfo) return;
      
      const { popup } = tipInfo;
      if (!popup) return;
      
      // 隐藏当前激活的提示
      this.hideAllTips();
      
      // 设置当前激活的元素
      this.activeEl = element;
      
      // 显示提示
      popup.classList.add('shown');
      this.updateTipPosition({ element, popup });
    },
    
    hideTip(element) {
      if (!element) return;
      
      const tipInfo = this.tips.get(element);
      if (!tipInfo) return;
      
      const { popup } = tipInfo;
      if (!popup) return;
      
      // 隐藏提示
      popup.classList.remove('shown');
      
      // 清除当前激活的元素
      if (this.activeEl === element) {
        this.activeEl = null;
      }
    },
    
    hideAllTips() {
      // 隐藏所有提示
      document.querySelectorAll('.transor-tip-popup.shown').forEach(popup => {
        popup.classList.remove('shown');
      });
      this.activeEl = null;
    },
    
    updateTipPosition(item) {
      const { element, popup } = item;
      
      // 检查元素是否仍在DOM中
      if (!document.body.contains(element) || !document.body.contains(popup)) {
        popup.classList.remove('shown');
        if (this.activeEl === element) {
          this.activeEl = null;
        }
        return;
      }
      
      // 获取元素位置
      const rect = element.getBoundingClientRect();
      
      // 检查元素是否在视口内
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        popup.classList.remove('shown');
        return;
      }
      
      // 获取滚动偏移量
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      // 计算提示位置
      const top = rect.bottom + scrollTop + 5; // 元素下方5px
      let left = rect.left + scrollLeft + (rect.width / 2);
      
      // 确保提示不超出视口
      const viewportWidth = window.innerWidth;
      const popupWidth = popup.offsetWidth;
      
      if (left + (popupWidth / 2) > viewportWidth) {
        left = viewportWidth - (popupWidth / 2) - 10;
      }
      
      if (left - (popupWidth / 2) < 0) {
        left = popupWidth / 2 + 10;
      }
      
      // 应用位置
      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
      popup.style.transform = 'translateX(-50%)';
    },
    
    handleGlobalMouseOver(e) {
      const tipElement = e.target.closest('.transor-tip');
      if (tipElement) this.showTip(tipElement);
    },
    
    handleGlobalMouseOut(e) {
      const tipElement = e.target.closest('.transor-tip');
      if (tipElement && !tipElement.contains(e.relatedTarget)) {
        this.hideTip(tipElement);
      }
    },
    
    handleGlobalClick(e) {
      const tipElement = e.target.closest('.transor-tip');
      if (!tipElement) this.hideAllTips();
    },
    
    handleScroll() {
      if (this.activeEl) {
        const tipInfo = this.tips.get(this.activeEl);
        if (tipInfo) {
          this.updateTipPosition({ element: this.activeEl, popup: tipInfo.popup });
        }
      }
    },
    
    handleResize() {
      if (this.activeEl) {
        const tipInfo = this.tips.get(this.activeEl);
        if (tipInfo) {
          this.updateTipPosition({ element: this.activeEl, popup: tipInfo.popup });
        }
      }
    },
    
    cleanup() {
      // 移除所有事件监听
      document.removeEventListener('mouseover', this.handleGlobalMouseOver);
      document.removeEventListener('mouseout', this.handleGlobalMouseOut);
      document.removeEventListener('click', this.handleGlobalClick);
      window.removeEventListener('scroll', this.handleScroll);
      window.removeEventListener('resize', this.handleResize);
      
      // 清除所有提示
      this.tips.forEach((tipInfo, element) => {
        this.unregisterTip(element);
      });
      
      this.initialized = false;
    }
  };
  
  // 初始化提示系统
  window.transorTipSystem.init();
  
  return window.transorTipSystem;
}

// 输入框内容翻译功能 - 用于检测三个连续空格并触发翻译
function initInputTranslation() {
  console.log('初始化输入框翻译功能');
  console.log('空格翻译功能状态: ', translationSettings.enableInputSpaceTranslation ? '已启用' : '未启用');
  
  let consecutiveSpaces = 0;
  let currentInputElement = null;
  let originalContent = '';
  let isTranslating = false;
  let preventInput = false; // 用于阻止input事件导致的内容重置
  
  // 检查当前功能是否启用 - 移除isEnabled依赖
  const isFeatureEnabled = () => {
    return translationSettings.enableInputSpaceTranslation;
  };
  
  // 检查输入元素是否有效
  const isValidInput = (element) => {
    if (!element) return false;
    return (
      (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) || 
      element.tagName === 'TEXTAREA' || 
      element.getAttribute('contenteditable') === 'true'
    );
  };
  
  // 获取输入元素的内容
  const getInputContent = (element) => {
    if (!element) return '';
    
    try {
      if (element.getAttribute('contenteditable') === 'true') {
        return element.innerText || element.textContent || '';
      }
      
      // 对于常规输入框和文本区域
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        return element.value || '';
      }
      
      // 最后尝试读取内容
      return element.value || element.innerText || element.textContent || '';
    } catch (error) {
      console.error('获取输入内容时出错:', error);
      return '';
    }
  };
  
  // 设置输入元素的内容
  const setInputContent = (element, content) => {
    if (!element) return;
    try {
      preventInput = true; // 设置标记，阻止input事件处理
      
      if (element.getAttribute('contenteditable') === 'true') {
        element.innerText = content;
      } else {
        element.value = content;
      }
      
      // 触发input事件，确保其他可能的监听器能感知变化
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
      
      // 立即恢复标记
      setTimeout(() => {
        preventInput = false;
      }, 100);
    } catch (error) {
      console.error('设置输入内容时出错:', error);
      preventInput = false;
    }
  };
  
  // 重置状态
  const resetState = () => {
    console.log('重置空格计数状态');
    consecutiveSpaces = 0;
    currentInputElement = null;
    originalContent = '';
    isTranslating = false;
    preventInput = false;
  };

  // 处理输入事件，防止内容被意外重置
  document.addEventListener('input', (event) => {
    if (preventInput) {
      // 如果是我们自己触发的事件，忽略处理
      console.log('检测到设置内容后的input事件，忽略');
      return;
    }
    
    // 如果正在翻译中，并且事件目标是当前输入元素
    if (isTranslating && event.target === currentInputElement) {
      console.log('翻译过程中检测到输入，可能会导致内容重置');
      // 不重置状态，允许继续翻译
    }
  }, true);
  
  // 使用键盘事件监听空格键，而不是依赖input事件
  document.addEventListener('keydown', (event) => {
    // 检查功能是否启用
    if (!isFeatureEnabled()) {
      if (consecutiveSpaces > 0) {
        console.log('功能已禁用，重置空格计数');
        resetState();
      }
      return;
    }
  
    // 只处理空格键
    if (event.key === ' ' || event.code === 'Space') {
      // 获取当前焦点元素
      const activeElement = document.activeElement;
      
      // 检查是否是有效的输入元素
      if (isValidInput(activeElement)) {
        // 记录元素和内容
        if (currentInputElement !== activeElement) {
          currentInputElement = activeElement;
          originalContent = getInputContent(activeElement);
          consecutiveSpaces = 0;
        }
        
        // 递增空格计数
        consecutiveSpaces++;
        console.log('键盘空格计数:', consecutiveSpaces, '当前元素:', activeElement.tagName);
        
        // 如果检测到三个连续空格，触发翻译
        if (consecutiveSpaces === 3) {
          console.log('检测到三个连续空格，准备翻译输入内容');
          // 获取内容（去掉空格）
          let content = getInputContent(activeElement).trim();
          
          if (content) {
            // 去掉末尾的空格（可能有1-2个空格）
            content = content.replace(/\s+$/, '');
            console.log('将翻译内容:', content);
            isTranslating = true;
            
            // 设置一个加载状态
            setInputContent(currentInputElement, content + ' (翻译中...)');
            
            // 翻译文本
            chrome.runtime.sendMessage(
              {
                action: 'translate',
                text: content,
                from: translationSettings.sourceLanguage,
                to: translationSettings.targetLanguage
              },
              (response) => {
                if (response && response.success) {
                  console.log('翻译成功:', response.translation);
                  // 替换输入框内容为翻译结果
                  setInputContent(currentInputElement, response.translation);
                  // 保持翻译状态一段时间，防止输入事件覆盖结果
                  setTimeout(() => {
                    isTranslating = false;
                  }, 1000);
                } else {
                  console.error('翻译失败:', response?.error || '未知错误');
                  // 恢复原始内容
                  setInputContent(currentInputElement, originalContent);
                  isTranslating = false;
                }
              }
            );
          } else {
            console.log('无内容可翻译');
          }
          
          // 重置空格计数
          consecutiveSpaces = 0;
        }
      } else {
        // 不是有效的输入元素，重置状态
        if (consecutiveSpaces > 0) {
          console.log('不是有效的输入元素，重置空格计数');
          resetState();
        }
      }
    } else if (event.key !== ' ' && event.code !== 'Space') {
      // 如果不是空格键，重置计数
      if (consecutiveSpaces > 0) {
        console.log('检测到非空格键，重置空格计数');
        consecutiveSpaces = 0;
      }
    }
  });
  
  // ESC键监听 - 取消翻译
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isTranslating && currentInputElement) {
      console.log('ESC键被按下，取消翻译');
      try {
        // 恢复原始内容
        setInputContent(currentInputElement, originalContent);
        console.log('已恢复原始内容');
      } catch (error) {
        console.error('恢复原始内容时出错:', error);
      }
      resetState();
    }
  });
  
  // 使用MutationObserver监听新添加的元素
  const observer = new MutationObserver((mutations) => {
    if (!isFeatureEnabled()) return;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 检查新添加的元素是否是输入元素
            if (isValidInput(node)) {
              console.log('检测到新的输入元素:', node);
            }
          }
        }
      }
    }
  });
  
  // 开始观察文档变化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('输入框翻译功能初始化完成');
}

// 添加调试按钮，方便切换功能
function addDebugControls() {
  // 检查是否已经存在调试控制面板
  const existingPanel = document.getElementById('transor-debug-panel');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  // 创建一个位于页面右下角的浮动面板
  const panel = document.createElement('div');
  panel.id = 'transor-debug-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 9999999;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;
  
  // 添加标题
  const title = document.createElement('div');
  title.textContent = 'Transor 调试面板';
  title.style.cssText = `
    font-weight: bold;
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    padding-bottom: 5px;
    margin-bottom: 5px;
  `;
  panel.appendChild(title);
  
  // 创建开关按钮
  function createToggle(label, initialState, onChange) {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    `;
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    
    const toggle = document.createElement('button');
    toggle.style.cssText = `
      background-color: ${initialState ? '#4CAF50' : '#F44336'};
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      min-width: 60px;
    `;
    toggle.textContent = initialState ? '开启' : '关闭';
    
    toggle.addEventListener('click', () => {
      const newState = toggle.textContent === '关闭';
      toggle.textContent = newState ? '开启' : '关闭';
      toggle.style.backgroundColor = newState ? '#4CAF50' : '#F44336';
      if (onChange) onChange(newState);
    });
    
    container.appendChild(labelEl);
    container.appendChild(toggle);
    
    return container;
  }
  
  // 只添加空格翻译功能开关
  const spaceToggle = createToggle(
    '空格翻译功能', 
    translationSettings.enableInputSpaceTranslation,
    (state) => {
      translationSettings.enableInputSpaceTranslation = state;
      chrome.storage.sync.set({ enableInputSpaceTranslation: state }, () => {
        console.log('空格翻译功能已设置为:', state);
      });
      diagnoseFunctionality();
    }
  );
  panel.appendChild(spaceToggle);
  
  // 添加按钮：运行诊断
  const diagButton = document.createElement('button');
  diagButton.textContent = '运行诊断';
  diagButton.style.cssText = `
    background-color: #2196F3;
    color: white;
    border: none;
    padding: 6px;
    border-radius: 4px;
    margin-top: 5px;
    cursor: pointer;
  `;
  diagButton.addEventListener('click', () => {
    console.log('手动运行诊断程序');
    diagnoseFunctionality();
  });
  panel.appendChild(diagButton);
  
  // 添加按钮：测试翻译
  const testButton = document.createElement('button');
  testButton.textContent = '测试输入框翻译';
  testButton.style.cssText = `
    background-color: #FF9800;
    color: white;
    border: none;
    padding: 6px;
    border-radius: 4px;
    cursor: pointer;
  `;
  testButton.addEventListener('click', () => {
    // 创建一个临时输入框进行测试
    const testInput = document.createElement('textarea');
    testInput.value = '这是一个测试文本，将被翻译成英文。';
    testInput.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      padding: 10px;
      width: 300px;
      height: 100px;
      border: 2px solid #2196F3;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      font-size: 14px;
    `;
    
    document.body.appendChild(testInput);
    testInput.focus();
    
    // 添加一个关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭测试';
    closeButton.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, 80px);
      z-index: 10000;
      padding: 5px 10px;
      background-color: #F44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    closeButton.addEventListener('click', () => {
      testInput.remove();
      closeButton.remove();
      closeInfo.remove();
    });
    
    // 添加提示信息
    const closeInfo = document.createElement('div');
    closeInfo.textContent = '在文本框中输入三个连续空格测试翻译功能';
    closeInfo.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100px);
      z-index: 10000;
      padding: 5px 10px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 12px;
    `;
    
    document.body.appendChild(closeButton);
    document.body.appendChild(closeInfo);
  });
  panel.appendChild(testButton);
  
  // 添加按钮：显示设置
  const settingsButton = document.createElement('button');
  settingsButton.textContent = '显示当前设置';
  settingsButton.style.cssText = `
    background-color: #607D8B;
    color: white;
    border: none;
    padding: 6px;
    border-radius: 4px;
    cursor: pointer;
  `;
  settingsButton.addEventListener('click', () => {
    chrome.storage.sync.get(null, (settings) => {
      console.log('当前所有设置:', settings);
      alert('当前设置已在控制台输出');
    });
  });
  panel.appendChild(settingsButton);
  
  // 添加到页面
  document.body.appendChild(panel);
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
      
      // 获取滚动偏移量
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // 计算位置，包含滚动偏移量
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

// 新增函数：将分散在不同元素中的文本组合起来进行翻译
function combineTextNodes(element) {
  // 首先检查元素是否已经被翻译过
  if (element.closest('.transor-translation') || 
      element.classList.contains('transor-translation') ||
      element.querySelector('.transor-translation')) {
    console.log('跳过已翻译的元素:', element);
    return [];
  }
  
  // 如果不是元素节点，直接返回
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return [];
  
  console.log('处理元素内的断句:', element.tagName);
  
  // 获取元素内所有子节点
  const allNodes = Array.from(element.childNodes);
  
  // 存储组合后的文本片段和对应的节点
  const combinedTexts = [];
  let currentText = '';
  let currentNodes = [];
  let isCollecting = false;
  
  // 用于检查元素是否应该被忽略（不参与组合）
  const shouldIgnoreElement = (node) => {
    // 检查节点本身或其任何祖先是否已被翻译
    if (node.closest && node.closest('.transor-translation')) {
      return true;
    }
    
    // 检查节点是否是翻译相关的元素
    if (node.classList && 
        (node.classList.contains('transor-translation') || 
         node.classList.contains('transor-tip-popup') ||
         node.classList.contains('transor-selection-translator') ||
         node.classList.contains('transor-inline') ||
         node.classList.contains('transor-tip') ||
         node.classList.contains('transor-bilingual') ||
         node.classList.contains('transor-replace') ||
         node.classList.contains('transor-inline-text') ||
         node.classList.contains('transor-bilingual-text'))) {
      return true;
    }
    
    // 对于文本节点，检查其父元素
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && (parent.closest('.transor-translation') || 
                     parent.classList.contains('transor-translation') ||
                     parent.classList.contains('transor-inline'))) {
        return true;
      }
    }
    
    // 如果不是元素节点，直接返回 false（文本节点）
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    
    // 特殊处理 inline code，不忽略
    if (node.tagName && node.tagName.toLowerCase() === 'code') {
      return false; // 将 <code> 视为普通内联元素
    }
    
    // 特殊处理 transor-favorite-highlight，不忽略
    if (node.classList && node.classList.contains('transor-favorite-highlight')) {
      return false; // 将高亮词汇视为普通内联元素
    }
    
    // 忽略已经处理过的元素
    if (processedNodes.has(node)) return true;
    
    // 忽略排除的标签
    const excludedTagsSet = new Set(translationSettings.excludedTags);
    if (node.tagName && excludedTagsSet.has(node.tagName.toLowerCase())) return true;
    
    // 忽略带有排除类的元素
    const excludedClassesSet = new Set(translationSettings.excludedClasses);
    if (node.classList && node.classList.length > 0) {
      for (const cls of node.classList) {
        if (excludedClassesSet.has(cls) || cls === 'no-translate') return true;
      }
    }
    
    // 对于非 inline code 的其它代码元素仍然忽略
    if (isCodeElement(node)) return true;
    
    return false;
  };
  
  // 递归处理节点和其子节点
  const processNode = (node, depth = 0) => {
    // 对于文本节点
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        // 将文本添加到当前收集的组合中
        currentText += (currentText ? ' ' : '') + text;
        currentNodes.push(node);
        isCollecting = true;
      }
      return;
    }
    
    // 对于元素节点
    if (node.nodeType === Node.ELEMENT_NODE) {
      // 如果是需要忽略的元素，则完成当前的文本收集
      if (shouldIgnoreElement(node)) {
        if (isCollecting && currentText) {
          combinedTexts.push({
            text: currentText,
            nodes: [...currentNodes]
          });
          currentText = '';
          currentNodes = [];
          isCollecting = false;
        }
        return;
      }
      
      // 对于内联元素，继续收集文本
      const isInlineElement = getComputedStyle(node).display === 'inline' || 
                             ['SPAN', 'A', 'EM', 'STRONG', 'I', 'B', 'CODE', 'MARK', 'SMALL', 'DEL', 'INS'].includes(node.tagName);
      
      if (isInlineElement) {
        // 对于内联元素，递归处理其子节点
        for (const childNode of node.childNodes) {
          processNode(childNode, depth + 1);
        }
      } else {
        // 对于块级元素，完成当前的文本收集，然后递归处理其子节点
        if (isCollecting && currentText) {
          combinedTexts.push({
            text: currentText,
            nodes: [...currentNodes]
          });
          currentText = '';
          currentNodes = [];
          isCollecting = false;
        }
        
        // 递归处理块级元素的子节点
        for (const childNode of node.childNodes) {
          processNode(childNode, depth + 1);
        }
      }
    }
  };
  
  // 处理所有子节点
  for (const node of allNodes) {
    processNode(node);
  }
  
  // 确保最后收集的文本也被添加
  if (isCollecting && currentText) {
    combinedTexts.push({
      text: currentText,
      nodes: [...currentNodes]
    });
  }
  
  // 过滤掉太短的文本
  const filteredTexts = combinedTexts.filter(item => item.text.length > 1);
  
  console.log(`组合后的文本片段数量: ${filteredTexts.length}`);
  return filteredTexts;
}

// 修改翻译单个元素的函数，支持断句处理并保持原始样式
async function translateElement(element) {
  // 安全检查：确保元素没有被翻译过
  if (element.classList.contains('transor-translation') ||
      element.closest('.transor-translation') ||
      element.querySelector('.transor-translation')) {
    console.log('跳过已翻译的元素:', element);
    return;
  }
  
  // 使用新的断句处理方法
  const textGroups = combineTextNodes(element);
  if (textGroups.length === 0) return;
  
  // 提取文本内容
  const textContents = textGroups.map(group => group.text.trim())
    .filter(text => text && text.length > 1);
  
  if (textContents.length === 0) return;

  console.log(textContents, "组合后的文本内容");
  
  // 获取目标语言
  const targetLang = translationSettings.targetLanguage;
  
  try {
    // 使用Promise.all同时处理所有文本翻译
    const translationPromises = textContents.map((text, index) => {
      // 检查文本是否已经是目标语言
      if (targetLang && isTextInLanguage(text, targetLang)) {
        console.log(`跳过翻译片段: 文本已经是目标语言 ${targetLang}`, text.substring(0, 30) + (text.length > 30 ? '...' : ''));
        // 对于已经是目标语言的文本，直接返回原文
        return Promise.resolve({ index, translation: text, skipped: true });
      }
      
      return new Promise(resolve => {
        // 添加到翻译队列
        translationQueue.add(text, translation => {
          resolve({ index, translation, skipped: false });
        });
      });
    });
    
    // 等待所有翻译完成
    const results = await Promise.all(translationPromises);
    
    // 应用翻译结果
    results.forEach(({ index, translation, skipped }) => {
      const group = textGroups[index];
      const text = textContents[index];
      const nodes = group.nodes;
      
      // 对于组合文本，保持原始样式结构进行翻译
      if (nodes.length > 0 && translation) {
        if (skipped) {
          console.log(`保留原文(目标语言) - 原文: [${text}]`);
          // 对于已经是目标语言的文本，我们不进行样式修改，保留原样
          nodes.forEach(node => {
            processedNodes.add(node); // 标记为已处理
          });
        } else {
          console.log(`应用组合翻译 - 原文: [${text}], 译文: [${translation}]`);
          // 保持原始样式结构的翻译应用
          applyStylePreservingTranslation(nodes, text, translation);
        }
      }
    });
  } catch (error) {
    console.error('翻译元素时出错:', error);
  }
}

// 新增函数：保持原始样式的翻译应用 - 支持多种样式
function applyStylePreservingTranslation(nodes, originalText, translatedText) {
  if (nodes.length === 0) return;
  
  // 找到这些节点的共同父元素
  const commonParent = findCommonParent(nodes);
  if (!commonParent) return;
  
  // 额外安全检查：如果共同父元素已经被翻译过，则跳过
  if (commonParent.classList.contains('transor-translation') ||
      commonParent.closest('.transor-translation') ||
      commonParent.querySelector('.transor-translation')) {
    console.log('跳过已翻译的共同父元素:', commonParent);
    return;
  }
  
  // 标记所有节点为已处理，但不移除它们
  nodes.forEach(node => {
    processedNodes.add(node);
  });
  
  // 获取用户设置的翻译样式
  const userSetTranslationStyle = translationSettings.translationStyle || 'inline';
  
  // 如果用户设置的是"通用"样式，根据规则动态选择显示样式
  if (userSetTranslationStyle === 'universal_style') {
    // 计算单词数
    const wordCount = countWords(originalText);
    console.log(`文本 "${originalText.substring(0, 30)}..." 的单词数: ${wordCount}`);
    
    // 检查元素是否在导航或footer中
    const isInNavOrFooter = isElementInNavOrFooter(commonParent);
    console.log(`元素是否在导航或页脚中: ${isInNavOrFooter}`);
    
    // 根据规则选择样式
    if (wordCount <= 3 || isInNavOrFooter) {
      // 少于等于3个单词或在导航/footer中，使用tip样式
      console.log('应用tip样式: 短文本或导航/页脚元素');
      applyTipStyleTranslation(commonParent, originalText, translatedText);
    } else {
      // 其他情况使用双语样式
      console.log('应用双语样式: 一般内容');
      applyBilingualStyleTranslation(commonParent, originalText, translatedText);
    }
  } else {
    // 使用用户指定的样式
    if (userSetTranslationStyle === 'tip') {
      // 创建tip样式翻译
      applyTipStyleTranslation(commonParent, originalText, translatedText);
    } else if (userSetTranslationStyle === 'bilingual') {
      // 创建双语样式翻译
      applyBilingualStyleTranslation(commonParent, originalText, translatedText);
    } else if (userSetTranslationStyle === 'replace') {
      // 创建替换样式翻译（仅显示译文）
      applyReplaceStyleTranslation(commonParent, originalText, translatedText);
    } else {
      // 默认使用inline样式翻译
      applyInlineStyleTranslation(commonParent, originalText, translatedText);
    }
  }
}

// 提示样式翻译应用 - 用于导航栏、小元素等
function applyTipStyleTranslation(commonParent, originalText, translatedText) {
  // 使用全局的颜色设置
  const fontColor = translationSettings.fontColor || '#ff5588';
  
  // 创建翻译容器
  const translationWrapper = document.createElement('span');
  translationWrapper.classList.add('transor-translation', 'transor-tip');
  translationWrapper.setAttribute('data-original-text', originalText);
  translationWrapper.setAttribute('data-translated-text', translatedText);
  
  // 将原始内容移动到翻译容器中
  while (commonParent.firstChild) {
    translationWrapper.appendChild(commonParent.firstChild);
  }
  
  // 添加小圆点指示器
  const indicator = document.createElement('span');
  indicator.classList.add('transor-tip-indicator');
  indicator.style.backgroundColor = fontColor;
  translationWrapper.appendChild(indicator);
  
  // 添加到父元素
  commonParent.appendChild(translationWrapper);
  
  // 使用全局的Tip系统添加提示泡泡
  if (window.transorTipSystem) {
    window.transorTipSystem.registerTip(translationWrapper, translatedText);
  }
}

// 双语样式翻译应用
function applyBilingualStyleTranslation(commonParent, originalText, translatedText) {
  // 使用全局的颜色设置
  const fontColor = translationSettings.fontColor || '#ff5588';
  
  const translationWrapper = document.createElement('div');
  translationWrapper.classList.add('transor-translation', 'transor-bilingual');
  translationWrapper.setAttribute('data-original-text', originalText);
  
  // 创建原文容器，保持原文样式不变
  const originalContainer = document.createElement('div');
  originalContainer.classList.add('transor-original-text');
  
  // 将原始内容移动到原文容器中，保持原样
  while (commonParent.firstChild) {
    originalContainer.appendChild(commonParent.firstChild);
  }
  
  // 添加译文容器
  const translationSpan = document.createElement('div');
  translationSpan.classList.add('transor-bilingual-text');
  translationSpan.textContent = translatedText;
  translationSpan.style.color = fontColor;
  
  // 先添加原文，再添加翻译文本（在下方显示）
  translationWrapper.appendChild(originalContainer);
  translationWrapper.appendChild(translationSpan);
  
  commonParent.appendChild(translationWrapper);
}

// 内联样式翻译应用（默认）
function applyInlineStyleTranslation(commonParent, originalText, translatedText) {
  // 使用全局的颜色设置
  const fontColor = translationSettings.fontColor || '#ff5588';
  
  // 创建翻译容器
  const translationWrapper = document.createElement('span');
  translationWrapper.classList.add('transor-translation', 'transor-inline');
  translationWrapper.setAttribute('data-original-text', originalText);
  
  // 将原始内容移动到翻译容器中，保持原样
  while (commonParent.firstChild) {
    translationWrapper.appendChild(commonParent.firstChild);
  }
  
  // 添加翻译文本，仅对翻译部分应用样式
  const translationSpan = document.createElement('span');
  translationSpan.classList.add('transor-inline-text');
  translationSpan.textContent = ` (${translatedText})`;
  translationSpan.style.color = fontColor;
  
  translationWrapper.appendChild(translationSpan);
  commonParent.appendChild(translationWrapper);
}

// 替换样式翻译应用
function applyReplaceStyleTranslation(commonParent, originalText, translatedText) {
  // 创建翻译容器
  const translationWrapper = document.createElement('span');
  translationWrapper.classList.add('transor-translation', 'transor-replace');
  translationWrapper.setAttribute('data-original-text', originalText);
  
  // 记录原始元素的样式
  const computedStyle = window.getComputedStyle(commonParent);
  const originalStyles = {
    color: computedStyle.color,
    fontSize: computedStyle.fontSize,
    fontFamily: computedStyle.fontFamily,
    fontWeight: computedStyle.fontWeight,
    textDecoration: computedStyle.textDecoration,
    lineHeight: computedStyle.lineHeight
  };
  
  // 清空原有内容
  while (commonParent.firstChild) {
    commonParent.removeChild(commonParent.firstChild);
  }
  
  // 直接设置为翻译文本
  translationWrapper.textContent = translatedText;
  
  // 应用原有样式
  Object.keys(originalStyles).forEach(styleKey => {
    translationWrapper.style[styleKey] = originalStyles[styleKey];
  });
  
  // 添加到父元素
  commonParent.appendChild(translationWrapper);
}

// 新增函数：找到节点的共同父元素
function findCommonParent(nodes) {
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0].parentNode;
  
  // 获取第一个节点的所有祖先
  const ancestors = [];
  let current = nodes[0];
  while (current && current.parentNode) {
    ancestors.push(current.parentNode);
    current = current.parentNode;
  }
  
  // 找到所有节点的共同祖先
  for (const ancestor of ancestors) {
    if (nodes.every(node => ancestor.contains(node))) {
      return ancestor;
    }
  }
  
  return null;
}

// 新增函数：计算单词数
function countWords(text) {
  if (!text) return 0;
  
  // 尝试检测文本是否主要是中文
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const totalLength = text.length;
  const chineseRatio = chineseCharCount / totalLength;
  
  if (chineseRatio > 0.5) {
    // 如果主要是中文文本，以字符数计算（每个汉字算一个单词）
    return chineseCharCount;
  } else {
    // 如果主要是英文或其他语言，按空格分割计算单词数
    return text.trim().split(/\s+/).length;
  }
}

// 新增函数：检查元素是否在导航或页脚区域
function isElementInNavOrFooter(element) {
  if (!element) return false;
  
  // 向上查找父元素，检查是否有导航或页脚相关的标签或类名
  let current = element;
  const maxDepth = 5; // 限制向上查找的层级，避免过度递归
  let depth = 0;
  
  while (current && depth < maxDepth) {
    // 检查标签名
    const tagName = current.tagName ? current.tagName.toLowerCase() : '';
    if (tagName === 'nav' || tagName === 'footer' || tagName === 'header') {
      return true;
    }
    
    // 检查类名和ID
    const className = current.className ? current.className.toLowerCase() : '';
    const id = current.id ? current.id.toLowerCase() : '';
    
    // 常见的导航和页脚类名/ID模式
    const navPatterns = ['nav', 'navigation', 'menu', 'header', 'top-bar', 'navbar', 'site-header'];
    const footerPatterns = ['footer', 'bottom', 'site-footer', 'page-footer', 'copyright'];
    
    for (const pattern of [...navPatterns, ...footerPatterns]) {
      if (className.includes(pattern) || id.includes(pattern)) {
        return true;
      }
    }
    
    // 向上查找父元素
    current = current.parentElement;
    depth++;
  }
  
  return false;
}

// 检测文本是否全部是指定语言的函数
function isTextInLanguage(text, languageCode) {
  if (!text || text.trim().length < 2) {
    return false;
  }

  // 常用语言特征模式
  const languagePatterns = {
    'zh-CN': {
      // 中文特征 - 汉字范围
      regex: /[\u4e00-\u9fff]/,
      // 检测文本中汉字的比例，如果超过50%则认为是中文
      threshold: 0.5
    },
    'en': {
      // 英文特征 - 拉丁字母和英文标点
      regex: /[a-zA-Z]/,
      threshold: 0.6
    },
    'ja': {
      // 日语特征 - 日文假名等
      regex: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/,
      threshold: 0.5
    },
    'ko': {
      // 韩语特征 - 韩文音节
      regex: /[\uac00-\ud7a3]/,
      threshold: 0.5
    },
    'fr': {
      // 法语特征 - 法语重音字符等
      regex: /[éèêëàâäôöùûüÿçœæ]/i,
      threshold: 0.1
    },
    'de': {
      // 德语特征 - 德语特殊字符
      regex: /[äöüßÄÖÜ]/i,
      threshold: 0.1
    },
    'es': {
      // 西班牙语特征
      regex: /[áéíóúüñ¿¡]/i,
      threshold: 0.1
    },
    'ru': {
      // 俄语特征 - 西里尔字母
      regex: /[\u0400-\u04FF]/,
      threshold: 0.5
    }
  };

  // 处理语言代码简化，例如 'zh-CN' -> 'zh'
  const simplifiedCode = languageCode.split('-')[0];
  
  // 获取语言检测模式
  const pattern = languagePatterns[languageCode] || languagePatterns[simplifiedCode];
  
  if (!pattern) {
    console.log(`未找到语言 ${languageCode} 的检测模式，无法判断语言`);
    return false;
  }
  
  // 计算特征字符的数量
  const chars = text.split('');
  let matchCount = 0;
  
  for (const char of chars) {
    if (pattern.regex.test(char)) {
      matchCount++;
    }
  }
  
  // 计算特征字符的比例
  const ratio = matchCount / chars.length;
  
  console.log(`语言检测 [${languageCode}]: 文本长度=${chars.length}, 匹配字符=${matchCount}, 比例=${ratio.toFixed(2)}`);
  
  // 判断是否达到阈值
  return ratio >= pattern.threshold;
}