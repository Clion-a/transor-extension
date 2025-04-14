/**
 * Transor - 沉浸式翻译 内容脚本
 * 在网页中执行，处理实际的翻译逻辑
 */

// 存储翻译设置
let translationSettings = {
  isEnabled: false,
  targetLanguage: 'zh-CN',
  sourceLanguage: 'auto',
  translationEngine: 'google',
  translationStyle: 'inline',
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

// 初始化
async function init() {
  console.log('Transor 内容脚本已加载');
  
  // 加载设置
  await loadSettings();
  
  // 注入样式
  injectStyles();
  
  // 初始化Intersection Observer
  initIntersectionObserver();
  
  // 初始化滑词翻译功能
  initSelectionTranslator();
  
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
    
    /* 导航和小空间元素的翻译提示样式 */
    .transor-tip {
      position: relative;
      display: inline-block;
      cursor: pointer;
      border-bottom: 1px dotted #42b983;
    }
    
    .transor-tip-popup {
      visibility: hidden;
      position: fixed; /* 改为fixed定位以防被其他元素遮挡 */
      background-color: rgba(255, 255, 255, 0.98);
      color: #333;
      text-align: left;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.4;
      z-index: 10000; /* 提高层级确保在最上层 */
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      width: max-content;
      max-width: 300px;
      white-space: normal;
      word-break: break-word;
      transition: opacity 0.2s;
      opacity: 0;
      pointer-events: none; /* 防止鼠标事件影响其他元素 */
    }
    
    /* 使用JS控制位置，不再使用CSS定位 */
    
    /* 悬停显示效果 - 使用mouseenter/mouseleave事件来控制，不再使用CSS :hover */
    .transor-tip-popup.active {
      visibility: visible;
      opacity: 1;
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
        /console\.log/i,                     // 控制台输出
        /\w+\s*\.\s*\w+\s*\(/i,              // 方法调用
        /return\s+.+;/i                      // return语句
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
    }
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
    
    // 获取父元素，检查元素上下文
    const parent = element.parentElement;
    
    // 检查元素尺寸
    let elementWidth = 0;
    let elementHeight = 0;
    let isVerySmall = false;
    
    if (typeof element.getBoundingClientRect === 'function') {
      try {
        const rect = element.getBoundingClientRect();
        elementWidth = rect.width;
        elementHeight = rect.height;
        
        // 非常小的元素（宽度小于100px）几乎肯定放不下翻译
        if (elementWidth < 100) {
          isVerySmall = true;
        }
      } catch (e) {
        // 忽略获取尺寸的错误
      }
    }
    
    // 创建测试元素，估算翻译所需空间
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
        
        // 如果翻译后文本高度超过原始元素高度的2倍，认为内容太多
        if (translationRect.height > elementHeight * 2) {
          contentTooLarge = true;
        }
        
        // 如果翻译后文本宽度接近或超过原始元素宽度，同时元素宽度有限
        if (translationRect.width > elementWidth * 0.9 && elementWidth < 300) {
          contentTooLarge = true;
        }
        
        document.body.removeChild(tempElement);
      } catch (e) {
        console.error('测量翻译空间时出错:', e);
      }
    }
    
    // 检查是否在导航栏或菜单中
    let isInNavOrMenu = false;
    let currentElement = element;
    
    // 向上查找3层，检查是否在导航/菜单中
    for (let i = 0; i < 3 && currentElement; i++) {
      // 检查标签
      if (currentElement.tagName) {
        const tag = currentElement.tagName.toLowerCase();
        if (['nav', 'header', 'menu', 'ul', 'ol'].includes(tag)) {
          isInNavOrMenu = true;
          break;
        }
      }
      
      // 检查ID和类名
      const navIdentifiers = ['nav', 'menu', 'header', 'toolbar', 'topbar', 'navbar'];
      
      if (currentElement.id && typeof currentElement.id === 'string') {
        for (const id of navIdentifiers) {
          if (currentElement.id.toLowerCase().includes(id)) {
            isInNavOrMenu = true;
            break;
          }
        }
      }
      
      if (currentElement.className && typeof currentElement.className === 'string') {
        for (const cls of navIdentifiers) {
          if (currentElement.className.toLowerCase().includes(cls)) {
            isInNavOrMenu = true;
            break;
          }
        }
      }
      
      // 移至父元素
      currentElement = currentElement.parentElement;
    }
    
    // 检查是否紧凑布局的元素（周围有很多同级元素）
    let isCompactLayout = false;
    if (parent) {
      // 如果父元素包含多个子元素，可能是紧凑布局
      const siblingCount = parent.children.length;
      if (siblingCount > 4) {
        isCompactLayout = true;
      }
      
      // 检查是否为列表项
      if (element.tagName && element.tagName.toLowerCase() === 'li') {
        const parentTag = parent.tagName.toLowerCase();
        if (parentTag === 'ul' || parentTag === 'ol') {
          isCompactLayout = true;
        }
      }
    }
    
    // 1. 非常小的元素总是需要提示样式
    if (isVerySmall) {
      return true;
    }
    
    // 2. 检测到导航/菜单元素且翻译内容较多时使用提示
    if (isInNavOrMenu && contentTooLarge) {
      return true;
    }
    
    // 3. 紧凑布局中内容较多的元素使用提示
    if (isCompactLayout && contentTooLarge) {
      return true;
    }
    
    // 4. 特定的导航元素标签
    if (element.tagName) {
      const tag = element.tagName.toLowerCase();
      if ((tag === 'a' || tag === 'button') && contentTooLarge && elementWidth < 200) {
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
  
  // 当前选择的翻译样式
  const currentStyle = translationSettings.translationStyle;
  
  // 是否为提示模式（tip）
  const isTipMode = currentStyle === 'tip';
  // 是否为悬浮模式（hover）
  const isHoverMode = currentStyle === 'hover';
  
  try {
    // 检查缓存，只翻译未缓存的文本
    const textsToTranslate = [];
    const textsToTranslateIndexes = [];
    
    textContents.forEach((text, index) => {
      const cacheKey = `${translationSettings.sourceLanguage}:${translationSettings.targetLanguage}:${translationSettings.translationEngine}:${text}`;
      if (translationCache[cacheKey] === undefined) {
        textsToTranslate.push(text);
        textsToTranslateIndexes.push(index);
      }
    });
    
    // 如果有未缓存的文本需要翻译
    if (textsToTranslate.length > 0) {
      // 调用翻译API
      const translations = await translateTexts(textsToTranslate);
      
      // 更新缓存
      textsToTranslate.forEach((text, idx) => {
        const cacheKey = `${translationSettings.sourceLanguage}:${translationSettings.targetLanguage}:${translationSettings.translationEngine}:${text}`;
        translationCache[cacheKey] = translations[idx] || text;
      });
      
      // 应用翻译结果
      textsToTranslateIndexes.forEach((originalIndex, idx) => {
        const node = textNodes[originalIndex];
        const text = textContents[originalIndex];
        const translation = translations[idx];
        
        if (node && translation && translation !== text) {
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
    }
    
    // 应用已缓存的翻译
    textNodes.forEach((node, index) => {
      const text = textContents[index];
      if (!text) return;
      
      const cacheKey = `${translationSettings.sourceLanguage}:${translationSettings.targetLanguage}:${translationSettings.translationEngine}:${text}`;
      const cachedTranslation = translationCache[cacheKey];
      
      if (cachedTranslation && cachedTranslation !== text) {
        // 如果是提示模式，根据元素情况智能应用样式
        if (isTipMode) {
          // 检查是否需要提示样式
          if (needsTipStyle(node, text, cachedTranslation)) {
            // 使用tip样式
            applyTranslation(node, text, cachedTranslation, 'tip');
          } else {
            // 使用below样式（双语下方样式）
            applyTranslation(node, text, cachedTranslation, 'below');
          }
        } else if (isHoverMode) {
          // 悬浮模式直接使用hover样式
          applyTranslation(node, text, cachedTranslation, 'hover');
        } else {
          // 其他模式使用用户选择的样式
          applyTranslation(node, text, cachedTranslation);
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
      hoverContent.classList.add('transor-hover-content');
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
      
      // 创建提示气泡元素，但不立即添加到DOM
      const tipPopup = document.createElement('span');
      tipPopup.classList.add('transor-tip-popup');
      tipPopup.textContent = cleanTranslation;
      tipPopup.id = 'transor-tip-' + Math.random().toString(36).substr(2, 9);
      
      // 将气泡添加到document.body，而不是tipWrapper
      // 这样可以避免它被其他元素遮挡
      document.body.appendChild(tipPopup);
      
      // 存储关联的提示框ID
      tipWrapper.setAttribute('data-tip-id', tipPopup.id);
      
      // 鼠标进入事件：显示提示并定位
      tipWrapper.addEventListener('mouseenter', function(event) {
        // 防止事件冒泡
        event.stopPropagation();
        
        // 获取关联的提示框
        const popupId = this.getAttribute('data-tip-id');
        const popup = document.getElementById(popupId);
        if (!popup) return;
        
        // 获取触发元素的位置和尺寸
        const rect = this.getBoundingClientRect();
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // 显示提示框
        popup.classList.add('active');
        
        // 首先将提示框放在元素下方
        const offsetY = 10; // 垂直偏移量
        let top = rect.bottom + scrollTop + offsetY;
        let left = rect.left + scrollLeft + (rect.width / 2);
        
        // 应用定位
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
        popup.style.transform = 'translateX(-50%)'; // 水平居中
        
        // 检查是否超出视口
        const popupRect = popup.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        
        // 如果提示框超出视口底部，改为显示在元素上方
        if (popupRect.bottom > viewportHeight) {
          top = rect.top + scrollTop - popupRect.height - offsetY;
          popup.style.top = top + 'px';
        }
        
        // 如果提示框超出视口右侧，向左调整
        if (popupRect.right > viewportWidth) {
          left = left - (popupRect.right - viewportWidth) - 10;
          popup.style.left = left + 'px';
        }
        
        // 如果提示框超出视口左侧，向右调整
        if (popupRect.left < 0) {
          left = left - popupRect.left + 10;
          popup.style.left = left + 'px';
        }
      });
      
      // 鼠标离开事件：隐藏提示
      tipWrapper.addEventListener('mouseleave', function() {
        const popupId = this.getAttribute('data-tip-id');
        const popup = document.getElementById(popupId);
        if (popup) {
          popup.classList.remove('active');
        }
      });
      
      // 元素移除时清理提示框
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
            for (const node of mutation.removedNodes) {
              if (node === tipWrapper || node.contains(tipWrapper)) {
                const popupId = tipWrapper.getAttribute('data-tip-id');
                const popup = document.getElementById(popupId);
                if (popup) {
                  popup.remove();
                }
                observer.disconnect();
              }
            }
          }
        });
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      
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
  
  // 存储原始文本内容，用于恢复
  const originalTexts = new Map();
  
  // 找到所有翻译元素
  const translatedElements = document.querySelectorAll('.transor-translation');
  
  // 收集所有需要移除的tip提示框ID
  const tipPopupIds = [];
  
  translatedElements.forEach(element => {
    try {
      // 收集tip样式的提示框ID
      const tipId = element.getAttribute('data-tip-id');
      if (tipId) {
        tipPopupIds.push(tipId);
      }
      
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
  
  // 移除所有独立的tip提示框
  tipPopupIds.forEach(id => {
    const popup = document.getElementById(id);
    if (popup) {
      popup.remove();
    }
  });
  
  // 以防万一，移除所有.transor-tip-popup元素
  document.querySelectorAll('.transor-tip-popup').forEach(popup => {
    popup.remove();
  });
  
  // 移除可能添加的翻译样式
  const styleElement = document.getElementById('transor-styles');
  if (styleElement) {
    styleElement.remove();
  }
  
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

// 翻译文本
async function translateTexts(texts) {
  try {
    const results = [];
    
    for (const text of texts) {
      // 跳过看起来像代码的文本
      if (looksLikeCode(text)) {
        console.log('跳过代码翻译:', text);
        results.push(text); // 返回原文
        continue;
      }
      
      // 使用Google翻译API（非官方）
      const url = 'https://translate.googleapis.com/translate_a/t';
      
      // 使用fetch API请求翻译
      try {
        const response = await fetch(`${url}?client=gtx&sl=${translationSettings.sourceLanguage}&tl=${translationSettings.targetLanguage}&dt=t&q=${encodeURIComponent(text)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data)) {
            results.push(data[0]);
          } else {
            results.push(text); // 如果翻译失败，返回原文
          }
        } else {
          results.push(text); // 如果请求失败，返回原文
        }
      } catch (apiError) {
        console.error('翻译API请求出错:', apiError);
        results.push(text);
      }
    }
    
    return results;
  } catch (error) {
    console.error('翻译过程中出错:', error);
    return texts; // 翻译失败时返回原文
  }
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
  
  window.addEventListener('scroll', () => {
    if (!translationSettings.isEnabled) return;
    
    // 防抖动处理
    if (scrollTimer) clearTimeout(scrollTimer);
    
    scrollTimer = setTimeout(() => {
      translateVisibleContent();
    }, 200);
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
          
          // 获取翻译
          const translations = await translateTexts([text]);
          const translationResult = translations[0] || text;
          
          // 确保translation是字符串
          const translation = typeof translationResult === 'string' ? translationResult : 
                             (translationResult ? String(translationResult) : text);
          
          // 清理翻译结果，移除可能的语言标记
          const cleanTranslation = translation.replace(/,\s*(en|zh-CN|zh|auto)$/i, '');
          
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
              saveFavorite(text, cleanTranslation);
              this.classList.add('active');
              this.textContent = '★';
              this.title = '已收藏';
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
  
  // 监听鼠标滚动，隐藏翻译窗口
  document.addEventListener('scroll', function() {
    popup.style.display = 'none';
  }, true);
  
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

// 初始化
init();

// 设置DOM变化观察
setTimeout(() => {
  observeDOMChanges();
  setupScrollListener();
}, 1500); 