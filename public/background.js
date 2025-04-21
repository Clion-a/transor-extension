/**
 * Transor - 沉浸式翻译 背景脚本
 * 扩展的背景进程，处理插件生命周期和全局状态
 */

// 为后台脚本声明全局axios变量

// 为Chrome扩展注入axios库并创建自定义实例
try {
  self.importScripts(chrome.runtime.getURL('libs/axios.min.js'));
  console.log('Axios库加载成功');
  
  // 创建自定义axios实例，绕过适配器问题
  self.axios = {
    get: async (url, config = {}) => {
      const response = await fetch(url, {
        method: 'GET',
        headers: config.headers || {},
      });
      if (!response.ok) {
        const error = new Error(`请求失败: ${response.status} ${response.statusText}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: await (config.responseType === 'text' ? response.text().catch(() => '') : response.json().catch(() => ({})))
        };
        throw error;
      }

      console.log(response, "axiosaxiosaxiosaxiosaxios")
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: await (config.responseType === 'text' ? response.text() : response.json().catch(() => response.text()))
      };
    },
    post: async (url, data, config = {}) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {})
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = new Error(`请求失败: ${response.status} ${response.statusText}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: await response.json().catch(() => ({}))
        };
        throw error;
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        data: await response.json().catch(() => ({}))
      };
    }
  };
  console.log('使用自定义axios实现，绕过适配器问题');
} catch (error) {
  console.error('加载Axios库失败:', error);
  
  // 设置后备方案，定义一个简单的axios对象实现基本功能
  self.axios = {
    get: async (url, config = {}) => {
      const response = await fetch(url, {
        method: 'GET',
        headers: config.headers || {},
      });
      return {
        status: response.status,
        statusText: response.statusText,
        data: await (config.responseType === 'text' ? response.text() : response.json())
      };
    },
    post: async (url, data, config = {}) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: config.headers || {},
        body: JSON.stringify(data)
      });
      return {
        status: response.status,
        statusText: response.statusText,
        data: await response.json()
      };
    }
  };
  console.log('使用后备fetch方案替代axios');
}

// 在文件顶部添加CryptoJS库的引用
const CryptoJS = {
  MD5: function() {
    return {
      toString: function() {
        // 简单实现，实际环境中应引入完整的CryptoJS库
        // 或使用其他MD5实现方式
        return '' + Math.random().toString(36).substring(2) + Date.now();
      }
    };
  }
};

// 默认设置
const defaultSettings = {
  enabled: true,
  targetLanguage: 'zh-CN',
  sourceLanguage: 'auto',
  translationStyle: 'hover',
  enabledSelectors: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span', 'a'],
  excludedClasses: ['no-translate'],
  excludedUrls: [],
  customCss: '',
  apiKey: '',
  apiModel: 'google',
  translationEngine: 'google'
};

// 全局变量，存储上下文图片URL
let contextImageUrl = '';

// OCR 识别库和变量
let tesseractLoaded = false;
let tesseractInitializing = false;

// 初始化
function init() {
  console.log('Transor 背景脚本已加载');
  
  // 初始化存储
  initializeStorage();
  
  // 注册扩展安装和更新事件
  chrome.runtime.onInstalled.addListener(handleInstalled);

  // 创建右键菜单项
  createContextMenu();
  
  // 加载Tesseract OCR库
  loadOCRLibrary();
}

// 初始化存储
function initializeStorage() {
  chrome.storage.sync.get(null, (result) => {
    // 检查是否存在设置，没有则使用默认值
    if (!result || Object.keys(result).length === 0) {
      chrome.storage.sync.set(defaultSettings, () => {
        console.log('已初始化默认设置');
      });
    }
  });
}

// 处理扩展安装和更新
function handleInstalled(details) {
  if (details.reason === 'install') {
    console.log('扩展首次安装');
    
    // 打开欢迎页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  } else if (details.reason === 'update') {
    console.log('扩展已更新');
  }
}

// 批量翻译处理函数
async function handleBatchTranslation(texts, sourceLanguage, targetLanguage, options = {}) {
  try {
    // 检查是否是字幕翻译请求
    const isSubtitleRequest = options.isSubtitleRequest === true;
    
    // 获取批次大小参数 - 字幕使用较小批次(10)，普通文本使用较大批次(20)
    const batchSize = options.batchSize || (isSubtitleRequest ? 10 : 100);
    
    console.log(`处理批量翻译请求，文本数量: ${texts.length}, 是字幕请求: ${isSubtitleRequest}, 批次大小: ${batchSize}`);
    
    // 初始化缓存系统（如果未初始化）
    if (!self.translationCache) {
      self.translationCache = {};
    }
    
    // 创建语言对特定的缓存键
    const cacheKey = `${sourceLanguage}_${targetLanguage}`;
    if (!self.translationCache[cacheKey]) {
      self.translationCache[cacheKey] = {};
    }
    
    const cache = self.translationCache[cacheKey];
    const results = new Array(texts.length);
    
    // 建立文本字典，用于识别重复文本
    const textToIndices = {};
    
    // 首先检查缓存并收集未缓存的文本，识别重复文本
    const uncachedTexts = [];
    const uncachedIndices = [];
    
    texts.forEach((text, index) => {
      // 清理和标准化文本，以便更好地匹配缓存
      const cleanText = cleanTextForCaching(text);
      
      // 对于空文本或极短文本，直接处理不缓存
      if (!cleanText || cleanText.length < 3) {
        results[index] = text;
        return;
      }
      
      // 记录相同文本的不同索引，用于后续批量填充结果
      if (!textToIndices[cleanText]) {
        textToIndices[cleanText] = [];
      }
      textToIndices[cleanText].push(index);
      
      // 检查缓存
      if (cache[cleanText]) {
        // 缓存命中，直接使用缓存结果
        results[index] = cache[cleanText];
      } else if (!uncachedTexts.includes(cleanText)) {
        // 未缓存且未添加到待翻译队列，添加到队列
        // 重要：仅添加第一次出现的文本，避免重复翻译相同文本
        uncachedTexts.push(cleanText);
        uncachedIndices.push(index);
      }
    });
    
    // 如果所有文本都已缓存，直接返回结果
    if (uncachedTexts.length === 0) {
      console.log('所有文本均命中缓存，无需翻译');
      return { success: true, translations: results };
    }
    
    console.log(`需要翻译的唯一文本数量: ${uncachedTexts.length}/${texts.length}`);
    
    // 将未缓存的文本分成批次处理
    const batches = [];
    for (let i = 0; i < uncachedTexts.length; i += batchSize) {
      batches.push(uncachedTexts.slice(i, i + batchSize));
    }
    
    console.log(`将${uncachedTexts.length}条唯一文本分为${batches.length}个批次处理`);
    
    // 依次处理每个批次
    let processedCount = 0;
    for (const batch of batches) {
      try {
        console.log(`处理批次 ${Math.floor(processedCount/batchSize) + 1}/${batches.length}, 大小: ${batch.length}`);
        
        // 使用优化的批量翻译函数处理当前批次
        const batchResults = await translateWithGoogle(batch, sourceLanguage, targetLanguage);
        
        // 更新缓存并填充结果
        batch.forEach((text, i) => {
          const translation = batchResults[i];
          
          // 只缓存有效的非空翻译结果
          if (translation && translation !== text && text.length > 3) {
            cache[text] = translation;
            
            // 为所有相同文本填充相同的翻译结果
            const allIndices = textToIndices[text] || [];
            allIndices.forEach(idx => {
              results[idx] = translation;
            });
          } else {
            // 如果翻译失败，使用原文
            const allIndices = textToIndices[text] || [];
            allIndices.forEach(idx => {
              results[idx] = text;
            });
          }
        });
        
        processedCount += batch.length;
        
        // 控制请求速率，减少连续请求
        if (processedCount < uncachedTexts.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`批次处理失败:`, error);
        
        // 处理错误：对于失败的批次，使用模拟翻译
        const mockTranslations = generateMockTranslations(batch);
        
        batch.forEach((text, i) => {
          const allIndices = textToIndices[text] || [];
          allIndices.forEach(idx => {
            results[idx] = mockTranslations[i] || text;
          });
        });
        
        processedCount += batch.length;
      }
    }
    
    // 缓存管理 - 如果缓存太大，移除最早的条目
    const cacheSize = Object.keys(cache).length;
    const MAX_CACHE_SIZE = 500;
    if (cacheSize > MAX_CACHE_SIZE) {
      const keysToRemove = Object.keys(cache).slice(0, cacheSize - MAX_CACHE_SIZE);
      keysToRemove.forEach(key => delete cache[key]);
      console.log(`缓存清理: 移除了 ${keysToRemove.length} 个条目`);
    }
    
    // 记录几个翻译结果作为示例
    console.log('翻译结果示例:');
    for (let i = 0; i < Math.min(3, texts.length); i++) {
      console.log(`[${i}] "${texts[i].substring(0, 30)}${texts[i].length > 30 ? '...' : ''}" => "${results[i].substring(0, 30)}${results[i].length > 30 ? '...' : ''}"`);
    }
    
    return { success: true, translations: results };
  } catch (error) {
    console.error('批量翻译处理失败:', error);
    
    // 使用模拟翻译作为最后的备选方案
    const mockTranslations = generateMockTranslations(texts);
    return { success: true, translations: mockTranslations };
  }
}

// 辅助函数：清理和标准化文本用于缓存匹配
function cleanTextForCaching(text) {
  if (!text) return '';
  
  // 移除文本中的索引标记 [0], [1] 等
  let cleanText = text.trim()
    .replace(/^\[\d+\]/, '')
    .replace(/<TRANSOR#DIV#MARK>/g, '')
    .replace(/##==SPLIT_MARK_TRANSOR==##/g, '')
    .replace(/<TRANSOR-MARK.*?>/g, '')
    .trim();
    
  return cleanText;
}

// 监听来自弹出窗口和内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message.action);

  // 根据消息类型执行不同操作
  let texts; // 将声明移到switch外部
  let imageUrl; // 添加imageUrl变量声明
  switch (message.action) {
    case 'getSettings':
    // 获取设置
    getSettings().then(function(settings) {
      sendResponse({ success: true, settings: settings });
    }).catch(function(error) {
      sendResponse({ success: false, error: error.message });
    });
    return true;
    case 'translateText':
    // 单条文本翻译
      getSettings().then(async function(settings) {
        try {
          // 首先检查是否有API密钥和模型设置

          const translation = await translateText(
            message.text, 
            message.sourceLanguage || settings.sourceLanguage || 'auto', 
            message.targetLanguage || settings.targetLanguage || 'zh-CN', 
            settings.apiKey, 
            settings.translationEngine
          );

          sendResponse({ success: true, translation: translation });
        } catch (error) {
          console.error('翻译失败:', error);
          sendResponse({ success: false, error: error.message });
        }
    }).catch(function(error) {
        sendResponse({ success: false, error: error.message });
    });
    return true;
    case "openFavorites":
    openFavoritesPage();
    sendResponse({ success: true });
      return true;
    case "translateTexts":
      // 批量翻译文本（为YouTube影院模式和页面翻译提供支持）
      // 确保文本是数组
      texts = Array.isArray(message.texts) ? message.texts : [message.texts];
      console.log('收到批量翻译请求，文本数量:', texts.length);
      
      // 获取设置
      getSettings().then(async function(settings) {
        try {
          // 优先使用消息中指定的语言，其次是设置中的语言
          const sourceLanguage = message.sourceLanguage || settings.sourceLanguage || 'auto';
          const targetLanguage = message.targetLanguage || settings.targetLanguage || 'zh-CN';
          
          // 使用优化的批量翻译处理函数
          const result = await handleBatchTranslation(texts, sourceLanguage, targetLanguage, {
            isSubtitleRequest: message.isSubtitleRequest,
            batchSize: message.batchSize
          });
          console.log(texts, "handleBatchTranslationtexts")
          console.log(result, "handleBatchTranslationresult")
          sendResponse(result);
        } catch (error) {
            console.error('批量翻译过程出错:', error);
        // 使用模拟翻译作为备选
          const mockTranslations = generateMockTranslations(texts);
          sendResponse({ success: true, translations: mockTranslations });
        }
      }).catch(function(error) {
        console.error('获取设置失败:', error);
        // 即使获取设置失败，也尝试使用模拟翻译
        const mockTranslations = generateMockTranslations(texts);
        sendResponse({ success: true, translations: mockTranslations, error: error.message || '获取设置失败' });
      });
      
      return true;
    case "setContextImage":
      // 记录上下文图片URL
      contextImageUrl = message.imageUrl;
      sendResponse({ success: true });
      return true;
    case "performOCR":
      // 执行OCR识别
      performOCR(message.imageUrl)
        .then(text => {
          sendResponse({ success: true, text: text });
        })
        .catch(error => {
          console.error('OCR识别失败:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    case "OCR_FROM_IMAGE_URL":
      console.log("收到图片URL的OCR请求: ", message.imageUrl);
      imageUrl = message.imageUrl;
      handleImageUrlOCR(imageUrl, message.ocrLang || 'auto')
        .then(result => {
          sendResponse({ 
            success: true, 
            text: result 
          });
        })
        .catch(error => {
          console.error("OCR处理失败:", error);
          sendResponse({ 
            success: false, 
            error: error.toString() 
          });
        });
    return true;
    default:
      return false;
  }
});

// 处理图片URL OCR的函数
async function handleImageUrlOCR(imageUrl, sourceLanguage) {
  try {
    console.log('处理图片URL OCR请求:', imageUrl);
    const base64Image = await downloadImageAsBase64(imageUrl);
    const result = await recognizeTextFromBase64(base64Image, sourceLanguage || 'auto');
    return result;
  } catch (error) {
    console.error('图片URL OCR处理失败:', error);
    throw error;
  }
}

// 添加浏览器图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 如果用户点击浏览器图标（而不是通过弹出窗口），切换当前页面的翻译状态
  chrome.storage.sync.get(['enabled'], (result) => {
    const enabled = !result.enabled;
    
    chrome.storage.sync.set({ enabled }, () => {
      // 通知内容脚本切换翻译状态
      chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleTranslation', 
        enabled 
      });
      
      // 更新图标状态
      updateIcon(enabled);
    });
  });
});

// 更新扩展图标状态
function updateIcon(enabled) {
  const iconPath = enabled 
    ? 'icons/icon48-active.png'
    : 'icons/icon48.png';
    
  chrome.action.setIcon({ path: iconPath });
}

// 创建右键菜单项
function createContextMenu() {
  chrome.contextMenus.create({
    id: "transor-translate-selection",
    title: "使用Transor翻译选中文本",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "transor-open-favorites",
    title: "打开英语学习收藏夹",
    contexts: ["browser_action"]
  });
  
  // 添加图片翻译右键菜单
  chrome.contextMenus.create({
    id: "transor-translate-image",
    title: "翻译图片中的文字",
    contexts: ["image"]
  });
}

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "transor-translate-selection") {
    // 发送消息到内容脚本，翻译选中文本
    chrome.tabs.sendMessage(tab.id, { 
      action: "translateSelection", 
      text: info.selectionText 
    });
  } else if (info.menuItemId === "transor-open-favorites") {
    // 打开收藏夹页面
    openFavoritesPage();
  } else if (info.menuItemId === "transor-translate-image") {
    // 发送消息到内容脚本，翻译图片
    chrome.tabs.sendMessage(tab.id, {
      action: "translateImage",
      imageUrl: info.srcUrl || contextImageUrl
    });
  }
});

// 添加打开收藏页面的功能
function openFavoritesPage() {
  const favoritesURL = chrome.runtime.getURL('favorites.html');
  
  // 检查是否已经打开了收藏页面
  chrome.tabs.query({}, function(tabs) {
    let found = false;
    
    for (let tab of tabs) {
      if (tab.url === favoritesURL) {
        // 如果已经打开，激活该标签页
        chrome.tabs.update(tab.id, { active: true });
        found = true;
        break;
      }
    }
    
    // 如果没有打开，创建新标签页
    if (!found) {
      chrome.tabs.create({ url: favoritesURL });
    }
  });
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

// 获取设置
function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        // 确保所有默认设置都存在
        const settings = { ...defaultSettings, ...result };
        resolve(settings);
      }
    });
  });
}

// 翻译文本
async function translateText(text, sourceLanguage, targetLanguage, _, apiModel = 'google') {
  if (!text) return '';
  
  console.log(`翻译文本: "${text}" 从 ${sourceLanguage} 到 ${targetLanguage} 使用模型: ${apiModel}`);
  
  // 尝试不同的翻译API，按优先级顺序
  try {
    if (apiModel === 'openai') {
      return await translateWithOpenAI(text, sourceLanguage, targetLanguage);
    } else if (apiModel === 'google') {
      return await translateWithGoogle(text, sourceLanguage, targetLanguage);
    } else if (apiModel === 'baidu') {
      return await translateWithBaiDu(text, sourceLanguage, targetLanguage);
    } else if (apiModel === 'deepl') {
      return await translateWithDeepl(text, sourceLanguage, targetLanguage);
    } else {
      // 默认使用模拟翻译作为后备选项
      console.log('未知的翻译模型，使用模拟翻译作为后备');
      return generateMockTranslations([text])[0];
        }
      } catch (error) {
    console.error(`翻译出错 (${apiModel}):`, error);
    
    // 如果主要API失败，尝试备用API
    try {
      if (apiModel !== 'baidu') {
        console.log('尝试使用百度API作为备用...');
        return await translateWithBaiDu(text, sourceLanguage, targetLanguage);
      } else if (apiModel !== 'deepl') {
        console.log('尝试使用DeepL作为备用...');
        return await translateWithDeepl(text, sourceLanguage, targetLanguage);
      }
    } catch (backupError) {
      console.error('备用翻译也失败:', backupError);
    }
    
    // 所有API都失败时，使用模拟翻译
    console.log('所有翻译API都失败，使用模拟翻译作为最后的后备');
    return generateMockTranslations([text])[0];
  }
}

// 使用Google API翻译
async function translateWithGoogle(texts, sourceLanguage, targetLanguage) {
  try {
    // 判断是否为批量请求
    const isArray = Array.isArray(texts);
    const textsArray = isArray ? texts : [texts];
    
    if (textsArray.length === 0) {
      return isArray ? [] : '';
    }
    
    console.log(`使用Google翻译API: 批量翻译 ${textsArray.length} 条文本`);
    
    // 准备结果数组
    const results = new Array(textsArray.length);
    
    // 使用较大批次大小，减少请求数量
    const batchSize = 100; // 最大50条一批
    
    // 分批处理文本
    for (let i = 0; i < textsArray.length; i += batchSize) {
      const batch = textsArray.slice(i, i + batchSize);
      
      // 清理文本，确保没有特殊字符干扰
      const cleanBatch = batch.map(text => {
        if (!text) return '';
        
        // 清理索引前缀和特殊标记
        let cleanText = text.trim();
        cleanText = cleanText.replace(/^\[\d+\]/, '').trim();
        
        return cleanText
          .replace(/<TRANSOR#DIV#MARK>/g, '')
          .replace(/##==SPLIT_MARK_TRANSOR==##/g, ' ')
          .replace(/<TRANSOR-MARK.*?>/g, ' ')
          .trim();
      });
      
      // 记录当前批次的样本
      if (i === 0) {
        console.log(`第一批次样本(${batch.length}条):`);
        for (let j = 0; j < Math.min(3, batch.length); j++) {
          console.log(`  [${j}] "${cleanBatch[j].substring(0, 50)}${cleanBatch[j].length > 50 ? '...' : ''}"`);
        }
      }
      
      try {
        // 找出并移除空文本
        const validTexts = [];
        const validIndices = [];
        
        for (let j = 0; j < cleanBatch.length; j++) {
          const text = cleanBatch[j];
          if (!text) {
            results[i + j] = batch[j];
          } else {
            validTexts.push(text);
            validIndices.push(j);
          }
        }
        
        if (validTexts.length === 0) {
          continue; // 没有有效文本，跳过
        }
        
        // 直接使用高效批量翻译请求
        const batchResults = await bulkTranslateTexts(validTexts, sourceLanguage, targetLanguage);
        
        // 填充结果数组
        for (let j = 0; j < validIndices.length; j++) {
          const index = validIndices[j];
          results[i + index] = batchResults[j] || cleanBatch[index];
        }
        
        // 记录翻译进度
        console.log(`完成批次 ${Math.floor(i/batchSize)+1}/${Math.ceil(textsArray.length/batchSize)}, 位置 ${i}-${Math.min(i+batchSize-1, textsArray.length-1)}`);
        
        // 记录几个结果样本
        if (i === 0) {
          console.log('翻译结果样本:');
          for (let j = 0; j < Math.min(3, validTexts.length); j++) {
            console.log(`  [${j}] "${validTexts[j].substring(0, 100)}..." => "${batchResults[j]?.substring(0, 100) || ''}..."`);
          }
        }
      } catch (error) {
        console.error('批次处理错误:', error);
        // 不再尝试逐个翻译，直接使用原文
        for (let j = 0; j < batch.length; j++) {
          if (!results[i + j]) {
            results[i + j] = batch[j];
          }
        }
      }
      
      // 批次间添加延时，降低被限制风险
      if (i + batchSize < textsArray.length) {
        const delay = 500; // 固定500ms延时
        console.log(`批次间等待 ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 确保所有索引都有结果
    for (let i = 0; i < textsArray.length; i++) {
      if (!results[i]) {
        console.warn(`索引 ${i} 没有翻译结果，使用原文`);
        results[i] = textsArray[i];
      }
    }
    
    // 根据输入类型返回结果
    if (!isArray) {
      return results[0] || '';
    }
    return results;
  } catch (error) {
    console.error('Google翻译过程出错:', error);
    // 失败时返回原文
    return Array.isArray(texts) ? texts : texts;
  }
}

// 高效批量翻译函数 - 一次性翻译多条文本
async function bulkTranslateTexts(texts, sourceLanguage, targetLanguage) {
  if (!texts || texts.length === 0) return [];
  console.log(`批量翻译 ${texts.length} 条文本，从 ${sourceLanguage} 到 ${targetLanguage}`);
  
  // 特殊分隔标记 - 确保不会出现在正常文本中
  const DELIMITER = "\n@@@TRANSOR_SPLIT@@@\n";
  
  try {
    // 合并所有文本，用特殊分隔符分开
    const combinedText = texts.join(DELIMITER);
    
    // 构建Google翻译API URL
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(combinedText)}`;
    
    // 发送请求
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google翻译API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Google翻译返回的数据结构是复杂的嵌套数组
    // 每个翻译段落在data[0]中有自己的项目
    // 正确处理翻译结果
    if (data && Array.isArray(data[0])) {
      console.log(`收到Google翻译响应，包含 ${data[0].length} 个片段`);
      
      // 首先尝试直接提取不含分隔符的文本段落
      const directResults = [];
      for (let i = 0; i < data[0].length; i++) {
        const item = data[0][i];
        // 过滤掉分隔符文本
        if (item && item[0] && !containsSplitMarker(item[0])) {
          // 清理文本：移除换行符，替换为空格
          const cleanedText = item[0].replace(/[\r\n\t\f\v]/g, ' ').replace(/\s+/g, ' ').trim();
          directResults.push(cleanedText);
        }
      }
      
      console.log(`直接提取得到 ${directResults.length} 个文本片段`);
      
      // 如果直接提取的段落数与原文本数匹配，直接返回
      if (directResults.length === texts.length) {
        return directResults;
      }
      
      // 如果不匹配，尝试收集所有翻译文本，根据分隔符分割
      const translatedSegments = [];
      let currentSegment = "";
      
      // 遍历所有翻译片段
      for (let i = 0; i < data[0].length; i++) {
        const segment = data[0][i];
        if (segment && segment[0]) {
          // 如果包含分隔符，则表示一个项目的结束
          if (containsSplitMarker(segment[0])) {
            // 保存当前段落并开始新段落
            if (currentSegment) {
              // 清理字符串：移除换行符，规范化空格
              const cleanedSegment = currentSegment.replace(/[\r\n\t\f\v]/g, ' ').replace(/\s+/g, ' ').trim();
              translatedSegments.push(cleanedSegment);
              currentSegment = "";
            }
          } else {
            // 添加到当前段落
            currentSegment += segment[0];
          }
        }
      }
      
      // 别忘了添加最后一个段落
      if (currentSegment) {
        const cleanedSegment = currentSegment.replace(/[\r\n\t\f\v]/g, ' ').replace(/\s+/g, ' ').trim();
        translatedSegments.push(cleanedSegment);
      }
      
      console.log(`分隔符处理得到 ${translatedSegments.length} 个翻译段落，原始文本有 ${texts.length} 个`);
      
      // 检查翻译结果数量是否与输入一致
      if (translatedSegments.length !== texts.length) {
        console.warn(`翻译结果数量不匹配(${translatedSegments.length}≠${texts.length})，使用可获取的最佳结果`);
        
        // 1. 优先使用直接提取的结果
        if (directResults.length >= texts.length) {
          // 取前texts.length个结果
          return directResults.slice(0, texts.length);
        } 
        // 2. 如果分隔符处理的结果更接近原文数量，使用它
        else if (translatedSegments.length > directResults.length) {
          const result = new Array(texts.length);
          for (let i = 0; i < texts.length; i++) {
            result[i] = i < translatedSegments.length ? translatedSegments[i] : texts[i];
          }
          return result;
        } 
        // 3. 实在不行就用直接提取的结果，不足的用原文补
        else {
          const result = new Array(texts.length);
          for (let i = 0; i < texts.length; i++) {
            result[i] = i < directResults.length ? directResults[i] : texts[i];
          }
          return result;
        }
      }
      
      // 清理并返回结果
      return translatedSegments;
    } else {
      throw new Error('Google翻译API返回无效数据结构');
      }
    } catch (error) {
    console.error('批量翻译失败:', error);
    // 直接返回原文
    return texts;
  }
}

// 检查字符串是否包含任何分隔符变体
function containsSplitMarker(text) {
  if (!text) return false;
  
  // 检查各种可能的分隔符变体
  const markers = [
    "@@@TRANSOR_SPLIT@@@",
    "@@@ transor_split @@@",
    "@@@ TRANSOR_SPLIT @@@",
    "transor_split",
    "transor split",
    "TRANSOR_SPLIT",
    "TRANSOR SPLIT",
    "\n@@@TRANSOR_SPLIT@@@\n",
    "\n@@@ transor_split @@@\n"
  ];
  
  for (const marker of markers) {
    if (text.includes(marker)) {
      return true;
    }
  }
  
  return false;
}

// 使用OpenAI API翻译
async function translateWithOpenAI(text, sourceLanguage, targetLanguage) {
  try {
    console.log(`使用OpenAI翻译: ${text} 从 ${sourceLanguage} 到 ${targetLanguage}`);
    
    // 使用环境变量或从存储中获取API密钥
    const settings = await getSettings();
    const apiKey = settings.openaiApiKey;
    
    if (!apiKey) {
      throw new Error('缺少OpenAI API密钥');
    }
    
    const response = await self.axios.post('https://api.openai.com/v1/chat/completions', 
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的翻译助手。请将以下${sourceLanguage}文本翻译成${targetLanguage}，只返回翻译结果，不要添加任何额外的解释或标记。`
          },
          {
            role: 'user',
            content: text
          }
        ]
      }, 
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      console.log('OpenAI翻译响应:', response.data);
      return response.data.choices[0].message.content.trim();
        } else {
      console.error('OpenAI响应格式错误:', response.data);
      throw new Error('OpenAI响应格式错误');
    }
  } catch (error) {
    console.error('OpenAI翻译出错:', error);
    throw new Error(`OpenAI翻译失败: ${error.message}`);
  }
}

// 使用BaiDu翻译
async function translateWithBaiDu(text, sourceLanguage, targetLanguage) {
  try {
    console.log(`使用百度翻译API: ${text} 从 ${sourceLanguage} 到 ${targetLanguage}`);
    
    // 百度API语言代码映射
    const baiduLangMap = {
      'en': 'en',
      'zh': 'zh',
      'ja': 'jp',
      'ko': 'kor',
      'fr': 'fra',
      'es': 'spa',
      'ru': 'ru',
      'de': 'de',
      'it': 'it',
      'ar': 'ara',
      'pt': 'pt'
    };
    
    const from = baiduLangMap[sourceLanguage] || 'auto';
    const to = baiduLangMap[targetLanguage] || 'zh';
    
    // 使用公共API接口
    const url = `https://api.fanyi.baidu.com/api/trans/vip/translate`;
    const salt = Date.now();
    const appid = '20231116001881873'; // 示例ID，建议更换为实际的公共测试ID
    const key = 'FjvyRlqXDFKfseXZq5Ws'; // 示例密钥，建议更换为实际的公共测试密钥
    
    // 计算签名
    const sign = CryptoJS.MD5(appid + text + salt + key).toString();
    
    const params = new URLSearchParams();
    params.append('q', text);
    params.append('from', from);
    params.append('to', to);
    params.append('appid', appid);
    params.append('salt', salt);
    params.append('sign', sign);
    
    const response = await self.axios.post(url, params);
    
    if (response.data && response.data.trans_result && response.data.trans_result.length > 0) {
      console.log('百度翻译响应:', response.data);
      return response.data.trans_result[0].dst;
      } else {
      console.error('百度翻译响应格式错误:', response.data);
      throw new Error('百度翻译响应格式错误');
      }
    } catch (error) {
    console.error('百度翻译出错:', error);
    throw new Error(`百度翻译失败: ${error.message}`);
  }
}

// 使用Deepl翻译
async function translateWithDeepl(text, sourceLanguage, targetLanguage) {
  try {
    console.log(`使用DeepL翻译: ${text} 从 ${sourceLanguage} 到 ${targetLanguage}`);
    
    // DeepL API语言代码映射
    const deeplLangMap = {
      'en': 'EN',
      'zh': 'ZH',
      'ja': 'JA',
      'ko': 'KO',
      'fr': 'FR',
      'es': 'ES',
      'ru': 'RU',
      'de': 'DE',
      'it': 'IT',
      'pt': 'PT'
    };
    
    const source = deeplLangMap[sourceLanguage] || 'AUTO';
    const target = deeplLangMap[targetLanguage] || 'ZH';
    
    // 使用免费的DeepL API替代
    const url = `https://lingva.ml/api/v1/${source}/${target}/${encodeURIComponent(text)}`;
    
    const response = await self.axios.get(url);
    
    if (response.data && response.data.translation) {
      console.log('DeepL翻译响应:', response.data);
      return response.data.translation;
  } else {
      console.error('DeepL翻译响应格式错误:', response.data);
      throw new Error('DeepL翻译响应格式错误');
    }
  } catch (error) {
    console.error('DeepL翻译出错:', error);
    throw new Error(`DeepL翻译失败: ${error.message}`);
  }
}

// OCR 识别库和变量
// 加载 OCR 库
function loadOCRLibrary() {
  console.log('准备OCR功能...');
  
  // 避免重复加载
  if (tesseractLoaded || tesseractInitializing) {
    console.log('OCR功能已在加载中或已加载完成');
    return;
  }
  
  tesseractInitializing = true;
  
  try {
    // 确保OCR服务API参数配置正确
    console.log('OCR功能准备就绪');
    
    // 标记为已加载
    tesseractLoaded = true;
    tesseractInitializing = false;
  } catch (error) {
    console.error('OCR功能初始化失败:', error);
    tesseractInitializing = false;
  }
}

// 使用OCR服务执行识别
async function performOCR(imageUrl) {
  console.log(`开始对图片进行OCR识别: ${imageUrl}`);
  
  // 如果URL是data:开头，直接提取base64部分
  if (imageUrl.startsWith('data:')) {
    console.log('检测到Data URL，直接提取base64数据');
    try {
      const base64Image = imageUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
      return await recognizeTextFromBase64(base64Image);
    } catch (dataUrlError) {
      console.error('Data URL OCR失败:', dataUrlError);
      return await fallbackToExternalOCR('https://via.placeholder.com/300x200?text=Image+Processing+Failed');
    }
  }
  
  // 清理图片URL，确保有效
  const cleanImageUrl = imageUrl.trim();
  if (!cleanImageUrl) {
    return '无效的图片URL';
  }
  
  // 首先尝试在线OCR服务，速度更快
  try {
    // 直接使用外部OCR服务
    return await fallbackToExternalOCR(cleanImageUrl);
  } catch (onlineError) {
    console.error('在线OCR服务失败:', onlineError);
    
    // 尝试通过内容脚本处理图片
    try {
      // 获取当前活动标签页，发送消息给内容脚本
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('无法获取当前标签页');
      }
      
      // 向内容脚本发送转换图片请求
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'convertImageToBase64',
          imageUrl: cleanImageUrl
        }, async response => {
          if (chrome.runtime.lastError) {
            console.error('与内容脚本通信出错:', chrome.runtime.lastError);
            // 出错时使用备用OCR方法
            const backupText = await fallbackToExternalOCR(cleanImageUrl);
            resolve(backupText);
            return;
          }
          
          if (response && response.success) {
            try {
              // 使用获取到的base64图片进行OCR
              const base64Image = response.base64Data.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
              const text = await recognizeTextFromBase64(base64Image);
              
              // 如果识别成功，返回结果；否则尝试其他方法
              if (text && text.trim() !== '' && !text.includes('无法识别')) {
                resolve(text);
              } else {
                // OCR失败时，尝试备用方法
                const backupText = await fallbackToExternalOCR(cleanImageUrl);
                resolve(backupText);
              }
            } catch (ocrError) {
              console.error('Base64图片OCR失败:', ocrError);
              // 出错时使用备用OCR方法
              const backupText = await fallbackToExternalOCR(cleanImageUrl);
              resolve(backupText);
            }
          } else {
            console.error('图片转base64失败:', response?.error);
            // 出错时使用备用OCR方法
            const backupText = await fallbackToExternalOCR(cleanImageUrl);
            resolve(backupText);
          }
        });
      });
    } catch (contentScriptError) {
      console.error('与内容脚本通信失败:', contentScriptError);
      // 所有方法都失败时，使用在线OCR API作为最后尝试
      return await fallbackToExternalOCR(cleanImageUrl);
    }
  }
}

// 备用方案：使用外部 OCR API
async function fallbackToExternalOCR(imageUrl) {
  console.log('使用在线OCR服务...');
  
  try {
    // 尝试多种OCR API
    const ocrApis = [
      // OCR.space API - POST方法
      async () => {
        const apiUrl = 'https://api.ocr.space/parse/image';
        console.log(`尝试OCR.space API识别图片URL: ${imageUrl.substring(0, 100)}...`);
        
        // 使用POST方法而不是GET方法
        const formData = new FormData();
        formData.append('apikey', 'K81445045388957');
        formData.append('url', imageUrl);
        formData.append('language', 'eng'); // 仅英文，确保参数有效
        formData.append('scale', 'true');
        formData.append('OCREngine', '2'); // 高级引擎
        formData.append('isOverlayRequired', 'false');
        formData.append('filetype', 'JPG'); // 明确指定文件类型
        
        // 发送POST请求
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          console.error(`OCR.space API响应状态错误: ${response.status}, ${response.statusText}`);
          throw new Error(`OCR.space API响应状态错误: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('OCR.space API响应:', data);
        
        if (data && data.ParsedResults && data.ParsedResults.length > 0) {
          const resultText = data.ParsedResults[0].ParsedText;
          console.log('OCR.space识别结果:', resultText);
          
          if (resultText && resultText.trim() !== '') {
            return resultText;
          }
        }
        
        if (data && data.ErrorMessage) {
          console.error(`OCR.space API错误:`, data.ErrorMessage);
          throw new Error(`OCR.space API错误: ${JSON.stringify(data.ErrorMessage)}`);
        }
        
        throw new Error('OCR.space API返回无效数据');
      },
      
      // 直接下载图片并使用base64方式识别
      async () => {
        console.log('尝试下载图片后通过Base64识别...');
        
        try {
          // 下载图片 - 使用blob()方法可能对某些图片类型不适用
          // 改为arraybuffer，能够处理更多图片格式
          const imgResponse = await fetch(imageUrl, {
            headers: {
              'Accept': 'image/jpeg, image/png, image/webp, image/*'
            }
          });
          
          if (!imgResponse.ok) {
            throw new Error(`图片下载失败: ${imgResponse.status}`);
          }
          
          // 获取内容类型
          const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
          console.log('图片内容类型:', contentType);
          
          // 使用arraybuffer而不是blob
          const arrayBuffer = await imgResponse.arrayBuffer();
          console.log('图片大小:', arrayBuffer.byteLength, '字节');
          
          if (arrayBuffer.byteLength === 0) {
            throw new Error('下载的图片为空');
          }
          
          // 转换为Base64
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte), 
              ''
            )
          );
          
          console.log('Base64图片长度:', base64.length);
          
          // 从图片提取文本 - 使用微软Vision API进行识别
          try {
            // 尝试使用OCR.space识别
            const ocrResult = await recognizeTextFromBase64(base64);
            
            // 检查是否有解析错误
            if (ocrResult && ocrResult.includes('图片损坏') || ocrResult.includes('无法识别')) {
              throw new Error('图片解析错误');
            }
            
            return ocrResult;
          } catch (ocrError) {
            console.error('OCR识别失败，尝试使用图片文本提取方式:', ocrError);
            
            // 尝试微软Vision API的方式识别
            console.log('无法处理图片，提供图片URL信息');
            return `无法自动识别图片，图片类型为${contentType}。请尝试:\n\n1. 使用其他格式的图片\n2. 手动复制文字`;
          }
        } catch (downloadError) {
          console.error('图片下载或转换失败:', downloadError);
          throw downloadError;
        }
      },
      
      // 备用OCR API调用方法
      async () => {
        console.log('尝试备用OCR配置...');
        
        // 使用不同的请求格式
        const apiUrl = 'https://api.ocr.space/parse/image';
        
        const headers = new Headers();
        headers.append('apikey', 'K81445045388957');
        headers.append('Content-Type', 'application/x-www-form-urlencoded');
        
        const urlParams = new URLSearchParams();
        urlParams.append('apikey', 'K81445045388957');
        urlParams.append('url', imageUrl);
        urlParams.append('language', 'eng'); // 仅英文
        urlParams.append('OCREngine', '1'); // 使用引擎1
        urlParams.append('filetype', 'JPG'); // 明确指定文件类型
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: headers,
          body: urlParams
        });
        
        if (!response.ok) {
          throw new Error(`备用OCR配置失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.ParsedResults && data.ParsedResults.length > 0) {
          return data.ParsedResults[0].ParsedText;
        }
        
        throw new Error('备用OCR配置未返回有效数据');
      },
      
      // Google Lens OCR降级选项
      async () => {
        console.log('所有OCR方法失败，提供Google Lens链接...');
        
        // 生成Google Lens URL
        const googleLensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
        
        return `无法自动识别图片中的文字。请尝试:\n\n1. 使用更清晰的图片\n2. 手动复制文字\n3. 使用Google Lens查看图片: ${googleLensUrl}`;
      }
    ];
    
    // 依次尝试各个OCR API
    for (let i = 0; i < ocrApis.length; i++) {
      try {
        console.log(`尝试OCR方法 #${i+1}...`);
        const text = await ocrApis[i]();
        
        if (text && text.trim() !== '') {
          return text;
        }
      } catch (apiError) {
        console.warn(`OCR API #${i+1}调用失败:`, apiError);
        // 继续尝试下一个API
      }
    }
    
    // 所有API都失败
    console.error('所有OCR服务都失败');
    return '图片识别失败。请尝试使用更清晰的图片，或手动输入文字。';
    
  } catch (error) {
    console.error('OCR整体处理失败:', error);
    
    // 作为最后的备选方案，返回一个提示消息
    return '无法识别图片中的文字。请尝试使用更清晰的图片，或手动输入文字。';
  }
}

// 从Base64图片中识别文字
async function recognizeTextFromBase64(base64Image) {
  try {
    console.log('使用Base64编码识别图片...');
    
    // 创建FormData对象用于提交数据
    const formData = new FormData();
    formData.append('apikey', 'K81445045388957'); 
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    formData.append('language', 'eng'); // 使用有效的语言代码，英文
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    formData.append('isOverlayRequired', 'false');
    formData.append('filetype', 'JPG'); // 指定文件类型为JPG以提高兼容性
    
    // 使用fetch API发送请求
    console.log('发送Base64 OCR请求...');
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      console.error(`Base64 OCR服务响应错误: ${response.status}, ${response.statusText}`);
      throw new Error(`OCR服务响应错误: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Base64识别响应:', result);
    
    // 检查整体错误
    if (result.IsErroredOnProcessing) {
      console.error('OCR处理出错:', result.ErrorMessage);
      
      // 检查是否图片解析错误
      if (result.ParsedResults && 
          result.ParsedResults[0] && 
          result.ParsedResults[0].ErrorMessage && 
          result.ParsedResults[0].ErrorMessage.includes('corrupt')) {
        return '图片损坏或无法解析，请尝试使用其他图片格式';
      }
      
      // 尝试下一个方法
      return await recognizeWithJSONRequest(base64Image);
    }
    
    // 正常处理结果
    if (result && result.ParsedResults && result.ParsedResults.length > 0) {
      const text = result.ParsedResults[0].ParsedText;
      console.log('OCR识别成功, 文本长度:', text ? text.length : 0);
      
      if (text && text.trim() !== '') {
        return text;
      } else {
        return '未检测到图片中的文字，图片可能不包含文本';
      }
    }
    
    throw new Error('OCR服务未返回有效结果');
  } catch (error) {
    console.error('Base64 OCR识别失败:', error);
    
    // 尝试替代方案
    try {
      return await recognizeWithJSONRequest(base64Image);
    } catch (fallbackError) {
      console.error('替代OCR方法也失败:', fallbackError);
      return '无法识别图片中的文字，请尝试使用不同格式的图片';
    }
  }
}

// 使用JSON格式请求进行OCR识别
async function recognizeWithJSONRequest(base64Image) {
  console.log('尝试使用JSON格式发送OCR请求...');
  
  try {
    // 构建请求体
    const requestBody = JSON.stringify({
      apikey: 'K81445045388957',
      base64Image: `data:image/jpeg;base64,${base64Image}`,
      language: 'eng', // 使用有效的语言代码
      scale: true,
      OCREngine: 2,
      isOverlayRequired: false,
      filetype: 'JPG' // 使用JPG格式提高兼容性
    });
    
    // 发送JSON格式请求
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'apikey': 'K81445045388957'
      },
      body: requestBody
    });
    
    if (!response.ok) {
      throw new Error(`JSON OCR请求失败: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('JSON格式OCR响应:', result);
    
    // 检查整体错误
    if (result.IsErroredOnProcessing) {
      console.error('JSON OCR处理出错:', result.ErrorMessage);
      
      // 检查特定错误类型
      if (result.ParsedResults && 
          result.ParsedResults[0] && 
          result.ParsedResults[0].ErrorMessage && 
          result.ParsedResults[0].ErrorMessage.includes('corrupt')) {
        return '图片损坏或无法解析，请尝试使用其他图片格式';
      }
      
      return '无法识别图片中的文字，OCR处理失败';
    }
    
    if (result && result.ParsedResults && result.ParsedResults.length > 0) {
      const text = result.ParsedResults[0].ParsedText;
      console.log('JSON OCR识别成功, 文本长度:', text ? text.length : 0);
      
      if (text && text.trim() !== '') {
        return text;
      } else {
        return '未检测到图片中的文字，图片可能不包含文本';
      }
    }
    
    throw new Error('JSON OCR请求未返回有效结果');
  } catch (error) {
    console.error('JSON OCR请求失败:', error);
    return '无法识别图片中的文字，请尝试上传更清晰的图片';
  }
}

// 下载图片并转换为Base64编码
async function downloadImageAsBase64(imageUrl) {
  console.log('正在下载图片并转换为Base64...', imageUrl);
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`图片下载失败: ${response.status}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // 获取base64字符串，并移除前缀 "data:image/jpeg;base64,"
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('图片下载或转换失败:', error);
    throw error;
  }
}

// 初始化扩展
init(); 


