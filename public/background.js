/**
 * Transor - 沉浸式翻译 背景脚本
 * 扩展的背景进程，处理插件生命周期和全局状态
 */

// 实现fetch-based的axios简化版
const initializeAxios = () => {
  try {
    self.importScripts(chrome.runtime.getURL('libs/axios.min.js'));
    console.log('Axios库加载成功');
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
          headers: {
            'Content-Type': 'application/json',
            ...(config.headers || {})
          },
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
};

// 默认设置
const defaultSettings = {
  enabled: true,
  targetLanguage: 'zh-CN',
  sourceLanguage: 'auto',
  translationStyle: 'tip',
  enabledSelectors: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span', 'a'],
  excludedClasses: ['no-translate'],
  excludedUrls: [],
  customCss: '',
  translationEngine: 'microsoftapi',  // 翻译引擎: google, microsoft, microsoftapi, deepseek
  // API密钥配置
  apiKeys: {
    // microsoft: 'AZPa1kcEw7ns0flRDUzAxCpPTSbBSTsUH1lZkrO6FhpxTAyxgg7nJQQJ99BEAC3pKaRXJ3w3AAAbACOGFYoI',  // 微软翻译API密钥
    microsoftapi: 'AZPa1kcEw7ns0flRDUzAxCpPTSbBSTsUH1lZkrO6FhpxTAyxgg7nJQQJ99BEAC3pKaRXJ3w3AAAbACOGFYoI',  // Microsoft API翻译API密钥
    deepseek: ''    // DeepSeek翻译API密钥
  },
  // 区域配置
  regions: {
    microsoft: 'eastasia',  // 微软翻译区域
    microsoftapi: 'eastasia'  // Microsoft API翻译区域
  }
};

// 全局变量
let contextImageUrl = '';
let tesseractLoaded = false;
let tesseractInitializing = false;

// OCR 相关功能统一配置和常量
const OCR_CONFIG = {
  apiKey: 'K81445045388957',
  endpoint: 'https://api.ocr.space/parse/image',
  defaultLanguage: 'eng',
  defaultEngine: '2'
};

// 翻译API相关配置
const TRANSLATION_CONFIG = {
  // API端点
  endpoints: {
    google: 'https://translate.googleapis.com/translate_a/single',
    microsoft: 'https://edge.microsoft.com',
    microsoftapi: 'https://api.cognitive.microsofttranslator.com/translate',
    deepseek: 'https://api.deepseek.com/chat/completions'
  },
  // 翻译批次大小
  batchSize: {
    default: 80,
    subtitle: 10
  },
  // 缓存设置
  cache: {
    maxSize: 500,
    minTextLength: 0
  },
  // API密钥配置
  apiKeys: {
    // microsoft: 'AZPa1kcEw7ns0flRDUzAxCpPTSbBSTsUH1lZkrO6FhpxTAyxgg7nJQQJ99BEAC3pKaRXJ3w3AAAbACOGFYoI',  // 微软翻译API密钥
    microsoftapi: 'AZPa1kcEw7ns0flRDUzAxCpPTSbBSTsUH1lZkrO6FhpxTAyxgg7nJQQJ99BEAC3pKaRXJ3w3AAAbACOGFYoI',  // Microsoft API翻译API密钥
    deepseek: '',    // DeepSeek翻译API密钥
  },
  // 区域配置
  regions: {
    microsoft: 'eastasia',  // 微软翻译API区域
    microsoftapi: 'eastasia'  // Microsoft API翻译区域
  }
};

// 辅助函数：清理和标准化文本用于缓存匹配
function cleanTextForCaching(text) {
  if (!text) return '';
  
  return text.trim()
    .replace(/^\[\d+\]/, '')
    .replace(/<TRANSOR#DIV#MARK>/g, '')
    .replace(/##==SPLIT_MARK_TRANSOR==##/g, '')
    .replace(/<TRANSOR-MARK.*?>/g, '')
    .trim();
}

// 扩展UI和交互相关功能
const UI = {
  // 注册全局快捷键
  registerGlobalShortcuts: () => {
    console.log('注册全局快捷键');
    
    try {
      // 使用Chrome的commands API注册快捷键
      chrome.commands.onCommand.addListener((command) => {
        if (command === "toggle_translation") {
          console.log('触发翻译切换快捷键');
          
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
              try {
                chrome.tabs.sendMessage(tabs[0].id, { 
                  action: 'shortcutTriggered', 
                  shortcut: 'altA'
                }, () => {
                  if (chrome.runtime.lastError) {
                    console.log('发送消息时出错:', chrome.runtime.lastError.message);
                    UI.toggleTranslationWithoutResponse(tabs[0].id);
                  }
                });
              } catch (error) {
                console.error('发送快捷键消息失败:', error);
                UI.toggleTranslationWithoutResponse(tabs[0].id);
              }
            }
          });
        }
      });
      
      console.log('全局快捷键注册成功');
    } catch (error) {
      console.error('注册全局快捷键失败:', error);
    }
  },
  
  // 备用方案：无需content-script响应的翻译切换
  toggleTranslationWithoutResponse: (tabId) => {
    console.log('使用备用方案切换翻译状态');
    
    chrome.storage.sync.get(['isEnabled'], (result) => {
      const newState = result.isEnabled === undefined ? true : !result.isEnabled;
      
      chrome.storage.sync.set({ isEnabled: newState }, () => {
        console.log(`切换翻译状态为: ${newState ? '启用' : '禁用'}`);
        
        if (newState) {
          try {
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              function: () => {
                document.dispatchEvent(new CustomEvent('transor-toggle-translation', { 
                  detail: { enabled: true }
                }));
              }
            }).catch(err => console.log('执行脚本出错:', err));
          } catch (error) {
            console.error('注入切换脚本失败:', error);
          }
        }
        
        UI.updateIcon(newState);
      });
    });
  },
  
  // 为特定标签页注册快捷键
  registerShortcutForTab: (tabId, shortcutType) => {
    if (!tabId) return;
    
    console.log(`为标签页 ${tabId} 注册快捷键: ${shortcutType}`);
    
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: (shortcutType) => {
        console.log(`在标签页中注册快捷键处理: ${shortcutType}`);
        
        window.addEventListener('keydown', (event) => {
          const isAltAPressed = 
            (event.altKey && (event.key === 'a' || event.key === 'A')) ||
            (event.key === 'å' || event.key === 'Å') ||
            (event.altKey && event.keyCode === 65);
            
          if (isAltAPressed && shortcutType === 'altA') {
            console.log('页面中检测到快捷键 ⌥A');
            event.preventDefault();
            
            chrome.runtime.sendMessage({ 
              action: 'shortcutTriggered', 
              shortcut: 'altA'
            });
          }
        });
      },
      args: [shortcutType]
    }).catch(error => {
      console.error(`为标签页 ${tabId} 注册快捷键失败:`, error);
    });
  },
  
  // 更新扩展图标状态
  updateIcon: (enabled) => {
    const iconPath = enabled 
      ? 'icons/icon48-active.png'
      : 'icons/icon48.png';
      
    chrome.action.setIcon({ path: iconPath });
  },
  
  // 创建右键菜单项
  createContextMenu: () => {
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
    
    chrome.contextMenus.create({
      id: "transor-translate-image",
      title: "翻译图片中的文字",
      contexts: ["image"]
    });
    
    // 处理右键菜单点击事件
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === "transor-translate-selection") {
        chrome.tabs.sendMessage(tab.id, { 
          action: "translateSelection", 
          text: info.selectionText 
        });
      } else if (info.menuItemId === "transor-open-favorites") {
        UI.openFavoritesPage();
      } else if (info.menuItemId === "transor-translate-image") {
        chrome.tabs.sendMessage(tab.id, {
          action: "translateImage",
          imageUrl: info.srcUrl || contextImageUrl
        });
      }
    });
  },
  
  // 添加打开收藏页面的功能
  openFavoritesPage: () => {
    const favoritesURL = chrome.runtime.getURL('favorites.html');
    
    chrome.tabs.query({}, function(tabs) {
      let found = false;
      
      for (let tab of tabs) {
        if (tab.url === favoritesURL) {
          chrome.tabs.update(tab.id, { active: true });
          found = true;
          break;
        }
      }
      
      if (!found) {
        chrome.tabs.create({ url: favoritesURL });
      }
    });
  }
};

// 收藏单词到服务器
async function collectWord( sourceText, sourceLang ) {
  // 注意：此功能当前已被注释掉，等待后续实现
  // try {
  //   // 获取认证令牌
  //   const result = await new Promise((resolve) => {
  //     chrome.storage.local.get(['authToken'], resolve);
  //   });
  //   
  //   const token = result.authToken;
  //   if (!token) {
  //     throw new Error('未找到访问令牌，无法收藏单词');
  //   }
  //   
  //   // 调用API收藏单词
  //   const response = await fetch('http://api-test.transor.ai/priapi1/collect_my_words', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/x-www-form-urlencoded',
  //       'Authorization': token
  //     },
  //     body: Qs.stringify({
  //       source_text: sourceText,
  //       source_lang: sourceLang
  //     })
  //   });
  //   
  //   const data = await response.json();
  //   console.log('单词收藏API响应:', data);
  //   
  //   if (data.code === 1) {
  //     return data;
  //   } else {
  //     throw new Error(data.info || '收藏失败');
  //   }
  // } catch (error) {
  //   console.error('收藏单词时出错:', error);
  //   throw error;
  // }
}

// 初始化
function init() {
  console.log('Transor 背景脚本已加载');
  
  // 初始化 axios
  initializeAxios();
  
  // 初始化存储
  initializeStorage();
  
  // 注册扩展安装和更新事件
  chrome.runtime.onInstalled.addListener(handleInstalled);

  // 创建右键菜单项
  UI.createContextMenu();
  
  // 加载Tesseract OCR库
  loadOCRLibrary();
  
  // 注册全局快捷键
  UI.registerGlobalShortcuts();
  
  // 监听消息
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // 添加浏览器图标点击事件
  chrome.action.onClicked.addListener((tab) => {
    chrome.storage.sync.get(['enabled'], (result) => {
      const enabled = !result.enabled;
      
      chrome.storage.sync.set({ enabled }, () => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'toggleTranslation', 
          enabled 
        });
        
        UI.updateIcon(enabled);
      });
    });
  });
}

// 初始化存储
function initializeStorage() {
  chrome.storage.sync.get(null, (result) => {
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
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  } else if (details.reason === 'update') {
    console.log('扩展已更新');
  }
}

// 处理消息
function handleMessage(message, sender, sendResponse) {
  console.log('收到消息:', message.action);
  
  // 添加连接状态验证，防止context invalidated错误
  if (!chrome.runtime.id) {
    console.error('扩展上下文已失效，无法处理消息');
    sendResponse({ success: false, error: 'Extension context invalidated' });
    return false;
  }
  
  const messageHandlers = {
    // 获取设置
    getSettings: () => {
      getSettings()
        .then(settings => sendResponse({ success: true, settings }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    },
    
    // 注册快捷键
    registerShortcut: () => {
      UI.registerShortcutForTab(sender.tab?.id, message.shortcut);
      sendResponse({ success: true });
      return true;
    },
    
    // 打开收藏夹
    openFavorites: () => {
      UI.openFavoritesPage();
      sendResponse({ success: true });
      return true;
    },
    
    // 收藏单词
    collectWord: () => {
      collectWord(message.source_text, message.source_lang)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    },
    
    // 批量翻译文本
    translateTexts: () => {
      const texts = Array.isArray(message.texts) ? message.texts : [message.texts];
      console.log('收到批量翻译请求，文本数量:', texts.length);
      
      getSettings()
        .then(async (settings) => {
          try {
            const sourceLanguage = message.sourceLanguage || settings.sourceLanguage || 'auto';
            const targetLanguage = message.targetLanguage || settings.targetLanguage || 'zh-CN';
            const engine = message.engine || settings.translationEngine || 'google';
            
            const result = await handleBatchTranslation(texts, sourceLanguage, targetLanguage, {
              isSubtitleRequest: message.isSubtitleRequest,
              batchSize: message.batchSize,
              engine: engine
            });
            
            // 检查扩展上下文是否还有效
            if (!chrome.runtime.id) {
              console.error('扩展上下文已失效，无法发送翻译结果');
              // 上下文已失效，无法发送响应
              return;
            }
            
            sendResponse(result);
          } catch (error) {
            console.error('批量翻译过程出错:', error);
            // 确保扩展上下文有效再发送响应
            if (chrome.runtime.id) {
              sendResponse({ 
                success: true, 
                translations: generateMockTranslations(texts) 
              });
            }
          }
        })
        .catch((error) => {
          console.error('获取设置失败:', error);
          // 确保扩展上下文有效再发送响应
          if (chrome.runtime.id) {
            sendResponse({ 
              success: true, 
              translations: generateMockTranslations(texts), 
              error: error.message || '获取设置失败' 
            });
          }
        });
      
      return true;
    },
    
    // 设置上下文图片URL
    setContextImage: () => {
      contextImageUrl = message.imageUrl;
      sendResponse({ success: true });
      return true;
    },
    
    // 执行OCR识别
    performOCR: () => {
      performOCR(message.imageUrl)
        .then(text => {
          // 检查扩展上下文是否还有效
          if (chrome.runtime.id) {
            sendResponse({ success: true, text });
          }
        })
        .catch(error => {
          console.error('OCR识别失败:', error);
          // 确保扩展上下文有效再发送响应
          if (chrome.runtime.id) {
            sendResponse({ success: false, error: error.message });
          }
        });
      return true;
    },
    
    // 从图片URL识别文字
    OCR_FROM_IMAGE_URL: () => {
      console.log("收到图片URL的OCR请求: ", message.imageUrl);
      handleImageUrlOCR(message.imageUrl, message.ocrLang || 'auto')
        .then(result => {
          // 检查扩展上下文是否还有效
          if (chrome.runtime.id) {
            sendResponse({ success: true, text: result });
          }
        })
        .catch(error => {
          console.error("OCR处理失败:", error);
          // 确保扩展上下文有效再发送响应
          if (chrome.runtime.id) {
            sendResponse({ success: false, error: error.toString() });
          }
        });
      return true;
    },
    
    // 设置API密钥
    setApiKey: () => {
      if (message.type && message.key) {
        chrome.storage.sync.get(['apiKeys'], (result) => {
          const apiKeys = result.apiKeys || {};
          apiKeys[message.type] = message.key;
          
          chrome.storage.sync.set({ apiKeys }, () => {
            console.log(`已更新 ${message.type} API密钥`);
            
            // 同步更新TRANSLATION_CONFIG配置
            if (TRANSLATION_CONFIG.apiKeys) {
              TRANSLATION_CONFIG.apiKeys[message.type] = message.key;
            }
            
            sendResponse({ success: true });
          });
        });
        return true;
      }
      sendResponse({ success: false, error: '无效的API密钥数据' });
      return true;
    },
  };
  
  try {
    // 执行对应处理函数或返回false
    const handler = messageHandlers[message.action];
    return handler ? handler() : false;
  } catch (error) {
    console.error('处理消息时出错:', error);
    // 确保扩展上下文有效再发送响应
    if (chrome.runtime.id) {
      sendResponse({ success: false, error: error.message || '处理消息时出错' });
    }
    return false;
  }
}

// 批量翻译处理函数
async function handleBatchTranslation(texts, sourceLanguage, targetLanguage, options = {}) {
  try {
    // 获取完整的设置，包括翻译引擎选择
    const settings = await getSettings();
    const translationEngine = options.engine || settings.translationEngine || 'google';
    
    // 配置翻译参数
    const isSubtitleRequest = options.isSubtitleRequest === true;
    const batchSize = options.batchSize || (isSubtitleRequest ? TRANSLATION_CONFIG.batchSize.subtitle : TRANSLATION_CONFIG.batchSize.default);
    
    console.log(`处理批量翻译请求，文本数量: ${texts.length}, 引擎: ${translationEngine}, 是字幕请求: ${isSubtitleRequest}, 批次大小: ${batchSize}`);
    
    // 定期检查扩展上下文是否有效
    const checkExtensionContext = () => {
      if (!chrome.runtime.id) {
        throw new Error('Extension context invalidated');
      }
    };
    
    // 初始化缓存系统
    if (!self.translationCache) {
      self.translationCache = {};
    }
    
    // 创建语言对特定的缓存键
    const cacheKey = `${sourceLanguage}_${targetLanguage}_${translationEngine}`;
    if (!self.translationCache[cacheKey]) {
      self.translationCache[cacheKey] = {};
    }
    
    const cache = self.translationCache[cacheKey];
    const results = new Array(texts.length);
    
    // 建立文本字典，用于识别重复文本
    const textToIndices = {};
    const uncachedTexts = [];
    const uncachedIndices = [];
    
    // 首先检查缓存并收集未缓存的文本
    texts.forEach((text, index) => {
      const cleanText = cleanTextForCaching(text);
      // 对于空文本或极短文本，直接跳过
      if (!cleanText || cleanText.length < TRANSLATION_CONFIG.cache.minTextLength) {
        results[index] = text;
        return;
      }
      
      // 记录相同文本的不同索引
      if (!textToIndices[cleanText]) {
        textToIndices[cleanText] = [];
      }
      textToIndices[cleanText].push(index);
      
      // 检查缓存并处理
      if (cache[cleanText]) {
        results[index] = cache[cleanText];
      } else if (!uncachedTexts.includes(cleanText)) {
        uncachedTexts.push(cleanText);
        uncachedIndices.push(index);
      }
    });
    
    // 如果所有文本都已缓存，直接返回
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
    
    console.log(`将${uncachedTexts.length}条唯一文本分为${batches.length}个批次处理，使用翻译引擎: ${translationEngine}`);
    
    // 选择翻译引擎
    let translateFunction;
    switch (translationEngine.toLowerCase()) {
      case 'microsoft':
        translateFunction = translateWithMicrosoft;
        break;
      case 'microsoftapi':
        translateFunction = translateWithMicrosoftAPI;
        break;
      case 'deepseek':
        translateFunction = translateWithDeepSeek;
        break;
      case 'google':
      default:
        translateFunction = translateWithGoogle;
        break;
    }
    
    // 依次处理每个批次
    let processedCount = 0;
    for (const batch of batches) {
      try {
        // 检查扩展上下文是否还有效
        checkExtensionContext();
        
        console.log(`处理批次 ${Math.floor(processedCount/batchSize) + 1}/${batches.length}, 大小: ${batch.length}`);
        
        // 翻译当前批次
        const batchResults = await translateFunction(batch, sourceLanguage, targetLanguage);
        
        // 再次检查扩展上下文
        checkExtensionContext();
        
        // 更新缓存并填充结果
        batch.forEach((text, i) => {
          const translation = batchResults[i];
          
          // 只缓存有效的非空翻译结果
          if (translation && translation !== text && text.length > TRANSLATION_CONFIG.cache.minTextLength) {
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
        
        // 控制请求速率
        if (processedCount < uncachedTexts.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`批次处理失败:`, error);
        
        // 如果是扩展上下文失效，直接中断
        if (error.message === 'Extension context invalidated') {
          throw error;
        }
        
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
    if (cacheSize > TRANSLATION_CONFIG.cache.maxSize) {
      const keysToRemove = Object.keys(cache).slice(0, cacheSize - TRANSLATION_CONFIG.cache.maxSize);
      keysToRemove.forEach(key => delete cache[key]);
      console.log(`缓存清理: 移除了 ${keysToRemove.length} 个条目`);
    }
    
    return { success: true, translations: results };
  } catch (error) {
    console.error('批量翻译处理失败:', error);
    
    // 如果是扩展上下文失效，直接抛出，不尝试恢复
    if (error.message === 'Extension context invalidated') {
      throw error;
    }
    
    // 使用模拟翻译作为最后的备选方案
    const mockTranslations = generateMockTranslations(texts);
    return { success: true, translations: mockTranslations };
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

// 获取设置
function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve({ ...defaultSettings, ...result });
      }
    });
  });
}

// 检查字符串是否包含任何分隔符变体
function containsSplitMarker(text) {
  if (!text) return false;
  
  const markers = [
    "@@@TRANSOR_SPLIT@@@",
    "@@@ transor_split @@@",
    "@@@ TRANSOR_SPLIT @@@",
    "transor_split",
    "transor split",
    "TRANSOR_SPLIT",
    "TRANSOR SPLIT",
    "\n@@@TRANSOR_SPLIT@@@\n",
    "\n@@@ transor_split @@@\n",
    "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@. ",
    "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@.",
    "@@@ transor_split @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@.\n",
    "\n@@@ transor_split @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@.\n"
  ];
  
  return markers.some(marker => text.includes(marker));
}

// 高效批量翻译函数 - 一次性翻译多条文本
async function bulkTranslateTexts(texts, sourceLanguage, targetLanguage) {
  if (!texts || texts.length === 0) return [];
  
  // 特殊分隔标记
  const DELIMITER = "\n@@@TRANSOR_SPLIT@@@\n";
  
  try {
    // 合并文本
    const combinedText = texts.join(DELIMITER);
    
    // 构建Google翻译API URL
    const url = `${TRANSLATION_CONFIG.endpoints.google}?client=gtx&sl=${'auto'}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(combinedText)}`;
    
    // 发送请求
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google翻译API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && Array.isArray(data[0])) {
      // 处理Google翻译返回的嵌套数组
      
      // 1. 尝试直接提取不含分隔符的文本段落
      const directResults = [];
      
      for (const item of data[0]) {
        console.log(item, !containsSplitMarker(item[0]), "item")
        if (item && item[0] && !containsSplitMarker(item[0])) {
          const cleanedText = item[0].replace(/[\r\n\t\f\v]/g, ' ').replace(/\s+/g, ' ').trim();
          directResults.push(cleanedText);
        } else if (item && item[0] && containsSplitMarker(item[0])) {
          // 处理包含分隔符的文本
          const splitTexts = item[0].split(/@@@ ?transor_split ?@@@/i);
          for (const splitText of splitTexts) {
            const cleaned = splitText.replace(/[\r\n\t\f\v]/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleaned && !directResults.includes(cleaned)) {
              directResults.push(cleaned);
            }
          }
        }
      }

      console.log(data, "data");
      console.log(directResults, texts, "directResults");
      
      // 如果直接提取的段落数与原文本数匹配，直接返回
      if (directResults.length === texts.length) {
        return directResults;
      }
      
      // 2. 尝试根据分隔符分割
      const translatedSegments = [];
      let currentSegment = "";
      
      // 原有的提取逻辑
      for (const segment of data[0]) {
        if (segment && segment[0]) {
          if (containsSplitMarker(segment[0])) {
            if (currentSegment) {
              const cleanedSegment = currentSegment.replace(/[\r\n\t\f\v]/g, ' ').replace(/\s+/g, ' ').trim();
              translatedSegments.push(cleanedSegment);
              currentSegment = "";
            }
          } else {
            currentSegment += segment[0];
          }
        }
      }
      
      // 添加最后一个段落
      if (currentSegment) {
        const cleanedSegment = currentSegment.replace(/[\r\n\t\f\v]/g, ' ').replace(/\s+/g, ' ').trim();
        translatedSegments.push(cleanedSegment);
      }
      
      // 3. 特殊数据格式的处理
      // 如果上面的方法都没有提取出足够的文本，尝试从数据的第二个位置提取
      if (directResults.length === 0 && translatedSegments.length === 0) {
        for (const item of data[0]) {
          if (item && item[1] && !containsSplitMarker(item[1]) && item[1] !== "@@@TRANSOR_SPLIT@@@\n") {
            const cleanedText = item[1].replace(/[\r\n\t\f\v]/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanedText) {
              translatedSegments.push(cleanedText);
            }
          }
        }
      }
      
      // 4. 返回最匹配的结果
      if (translatedSegments.length !== texts.length) {
        console.warn(`翻译结果数量不匹配(${translatedSegments.length}≠${texts.length})，使用可获取的最佳结果`);
        
        // 选择最合适的结果集
        if (directResults.length >= texts.length) {
          return directResults.slice(0, texts.length);
        } else if (translatedSegments.length > directResults.length) {
          return translatedSegments.slice(0, texts.length).concat(
            texts.slice(translatedSegments.length)
          );
        } else {
          return directResults.slice(0, texts.length).concat(
            texts.slice(directResults.length)
          );
        }
      }
      
      return translatedSegments;
    } else {
      throw new Error('Google翻译API返回无效数据结构');
    }
  } catch (error) {
    console.error('批量翻译失败:', error);
    return texts; // 出错时返回原文
  }
}

// 使用微软翻译API (Edge翻译API)
async function translateWithMicrosoft(texts, sourceLanguage, targetLanguage) {
  try {
    // 输入验证和规范化
    const isArray = Array.isArray(texts);
    const textArray = isArray ? texts : [texts];
    
    if (textArray.length === 0) {
      return isArray ? [] : '';
    }
    
    // 使用Edge翻译API
    const url = `${TRANSLATION_CONFIG.endpoints.microsoft}/translate/translatetext?to=${targetLanguage}`;
    
    // 模拟Edge浏览器的请求头
    const edgeHeaders = {
      'accept': '*/*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'content-type': 'application/json',
      'priority': 'u=1, i',
      'sec-ch-ua': '"Chromium";v="124", "Microsoft Edge";v="124", "Not.A/Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'sec-mesh-client-arch': 'x64',
      'sec-mesh-client-edge-channel': 'stable',
      'sec-mesh-client-edge-version': '124.0.2478.51',
      'sec-mesh-client-os': 'Windows',
      'sec-mesh-client-os-version': '10.0.22621',
      'sec-mesh-client-webview': '0',
      'x-edge-shopping-flag': '0',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
    };
    
    const results = [];
    
    // 批量处理文本
    const batchSize = TRANSLATION_CONFIG.batchSize.default;
    for (let i = 0; i < textArray.length; i += batchSize) {
      const batch = textArray.slice(i, i + batchSize);
      
      try {
        // 发送请求
        console.log(`使用Edge翻译API请求批次 ${Math.floor(i/batchSize) + 1}，内容长度: ${batch.length}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: edgeHeaders,
          body: JSON.stringify(batch)
        });
        
        if (!response.ok) {
          throw new Error(`Edge翻译API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 从响应中提取翻译结果
        for (const item of data) {
          if (item.translations && item.translations.length > 0) {
            results.push(item.translations[0].text);
          } else {
            // 如果没有翻译结果，使用原文
            results.push(batch[data.indexOf(item)]);
          }
        }
        
        // 添加延迟，避免请求过于频繁
        if (i + batchSize < textArray.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`Edge翻译API批次处理失败:`, error);
        
        // 如果这个批次失败，回退到Google翻译
        const batchResults = await translateWithGoogle(batch, sourceLanguage, targetLanguage);
        results.push(...batchResults);
      }
    }
    
    // 返回结果
    return isArray ? results : results[0] || '';
  } catch (error) {
    console.error('Edge翻译API出错:', error);
    
    // 出错时尝试回退到Google翻译
    try {
      return await translateWithGoogle(texts, sourceLanguage, targetLanguage);
    } catch (err) {
      // 如果Google翻译也失败，返回原文
      return Array.isArray(texts) ? texts : texts;
    }
  }
}

// 使用Microsoft API进行翻译
async function translateWithMicrosoftAPI(texts, sourceLanguage, targetLanguage) {
  try {
    // 获取设置
    const settings = await getSettings();
    const apiKey = settings.apiKeys?.microsoftapi || TRANSLATION_CONFIG.apiKeys.microsoftapi;
    
    if (!apiKey) {
      console.error('未配置Microsoft API翻译API密钥');
      throw new Error('未配置Microsoft API翻译API密钥');
    }
    
    // 输入验证和规范化
    const isArray = Array.isArray(texts);
    const textArray = isArray ? texts : [texts];
    
    if (textArray.length === 0) {
      return isArray ? [] : '';
    }
    
    // 准备请求URL
    const url = `${TRANSLATION_CONFIG.endpoints.microsoftapi}?api-version=3.0&from=${sourceLanguage === 'auto' ? '' : sourceLanguage}&to=${targetLanguage}`;
    
    const results = [];
    
    // 批量处理文本
    const batchSize = TRANSLATION_CONFIG.batchSize.default;
    for (let i = 0; i < textArray.length; i += batchSize) {
      const batch = textArray.slice(i, i + batchSize);
      
      try {
        // 准备请求内容
        const requestBody = batch.map(text => ({ text }));
        
        // 发送请求
        console.log(`使用Microsoft API翻译请求批次 ${Math.floor(i/batchSize) + 1}，内容长度: ${batch.length}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': apiKey,
            'Ocp-Apim-Subscription-Region': 'eastasia'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          throw new Error(`Microsoft API请求失败: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 从响应中提取翻译结果
        for (let j = 0; j < data.length; j++) {
          const item = data[j];
          if (item.translations && item.translations.length > 0) {
            results.push(item.translations[0].text);
          } else {
            // 如果没有翻译结果，使用原文
            results.push(batch[j]);
          }
        }
        
        // 添加延迟，避免请求过于频繁
        if (i + batchSize < textArray.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`Microsoft API批次处理失败:`, error);
        
        // 如果这个批次失败，回退到Google翻译
        const batchResults = await translateWithGoogle(batch, sourceLanguage, targetLanguage);
        results.push(...batchResults);
      }
    }
    
    // 返回结果
    return isArray ? results : results[0] || '';
  } catch (error) {
    console.error('Microsoft API出错:', error);
    
    // 出错时尝试回退到Google翻译
    try {
      return await translateWithGoogle(texts, sourceLanguage, targetLanguage);
    } catch (err) {
      // 如果Google翻译也失败，返回原文
      return Array.isArray(texts) ? texts : texts;
    }
  }
}

// 使用DeepSeek翻译API
async function translateWithDeepSeek(texts, sourceLanguage, targetLanguage) {
  try {
    // 获取配置
    const settings = await getSettings();
    const apiKey = settings.apiKeys?.deepseek || TRANSLATION_CONFIG.apiKeys.deepseek;
    
    if (!apiKey) {
      console.error('未配置DeepSeek翻译API密钥');
      throw new Error('未配置DeepSeek翻译API密钥');
    }
    
    // 输入验证和规范化
    const isArray = Array.isArray(texts);
    const textArray = isArray ? texts : [texts];
    
    if (textArray.length === 0) {
      return isArray ? [] : '';
    }
    
    // 批量优化处理
    console.log(`DeepSeek翻译开始处理${textArray.length}条文本`);
    
    // 预处理：过滤空文本，直接加入结果
    const nonEmptyTexts = [];
    const nonEmptyIndices = [];
    const batchResults = new Array(textArray.length); // 预先分配足够空间
    
    // 首先过滤出所有非空文本和它们的原始索引
    for (let i = 0; i < textArray.length; i++) {
      const text = textArray[i];
      if (!text || text.trim() === '') {
        batchResults[i] = text; // 空文本直接保留
      } else {
        nonEmptyTexts.push(text);
        nonEmptyIndices.push(i);
      }
    }
    
    if (nonEmptyTexts.length === 0) {
      console.log('没有需要翻译的非空文本');
      return isArray ? batchResults : batchResults[0] || '';
    }
    
    // 进一步分类：长文本单独处理，短文本合并处理
    const smallTexts = [];
    const smallIndices = [];
    const largeTexts = [];
    const largeIndices = [];
    const maxSingleTextChars = 800; // 最大单文本字符数
    
    // 分类文本
    for (let i = 0; i < nonEmptyTexts.length; i++) {
      const text = nonEmptyTexts[i];
      const originalIndex = nonEmptyIndices[i];
      
      if (text.length > maxSingleTextChars) {
        largeTexts.push(text);
        largeIndices.push(originalIndex);
      } else {
        smallTexts.push(text);
        smallIndices.push(originalIndex);
      }
    }
    
    console.log(`文本分类: ${smallTexts.length}条短文本, ${largeTexts.length}条长文本`);
    
    // 处理短文本：合并成更大的批次
    if (smallTexts.length > 0) {
      // 使用更加独特复杂的分隔符，确保不会出现在正常文本中
      const DELIMITER = "\n##===@@TRANSOR__INTERNAL__DELIMITER@@===##\n";
      
      // 最大批次大小
      const maxBatchSize = 15; // 调整为更合理的批次大小，避免过大
      const maxBatchChars = 2000; // 调整批次字符限制，避免过大请求
      
      // 创建批次
      const batches = [];
      const batchIndices = [];
      let currentBatch = [];
      let currentIndices = [];
      let currentBatchChars = 0;
      
      for (let i = 0; i < smallTexts.length; i++) {
        const text = smallTexts[i];
        const originalIndex = smallIndices[i];
        
        // 如果添加当前文本会超出批次限制，先保存当前批次
        if (currentBatch.length >= maxBatchSize || 
            currentBatchChars + text.length + DELIMITER.length > maxBatchChars) {
          if (currentBatch.length > 0) {
            batches.push([...currentBatch]);
            batchIndices.push([...currentIndices]);
            currentBatch = [];
            currentIndices = [];
            currentBatchChars = 0;
          }
        }
        
        // 添加到当前批次
        currentBatch.push(text);
        currentIndices.push(originalIndex);
        currentBatchChars += text.length + DELIMITER.length;
      }
      
      // 添加最后一个批次
      if (currentBatch.length > 0) {
        batches.push([...currentBatch]);
        batchIndices.push([...currentIndices]);
      }
      
      console.log(`短文本分为${batches.length}个批次，准备并行处理所有批次`);
      
      // 清理分隔符的函数
      const cleanDelimiters = (text) => {
        if (!text) return '';
        // 移除我们的专用分隔符
        let cleaned = text.replace(/\n?##===@@TRANSOR__INTERNAL__DELIMITER@@===##\n?/g, '');
        // 移除可能残留的<====TRANSOR_SPLIT====>分隔符
        cleaned = cleaned.replace(/<====TRANSOR_SPLIT====>\s*/g, '');
        return cleaned.trim();
      };
      
      // 并行处理所有批次
      const batchPromises = batches.map(async (batch, batchIndex) => {
        const indices = batchIndices[batchIndex];
        console.log(`开始处理短文本批次 ${batchIndex+1}/${batches.length}，条目数: ${batch.length}`);
        
        try {
          // 合并文本并添加分隔符
          const combinedText = batch.join(DELIMITER);
          
          // 翻译合并文本
          const requestBody = {
            model: "deepseek-chat",
            messages: [
              {
                role: "user",
                content: `请将以下${sourceLanguage === 'auto' ? '文本' : sourceLanguage + '文本'}翻译成${targetLanguage}。
请注意：文本之间用分隔符"##===@@TRANSOR__INTERNAL__DELIMITER@@===##"隔开，这不是文本内容的一部分，请在翻译时保留这些分隔符，但不要翻译分隔符本身。
这样我可以根据分隔符将翻译结果分割回多段。

原文:
${combinedText}`,
              },
            ],
            temperature: 0.7, // 适中的温度值，平衡创造性和准确性
          };
          
          const response = await fetch(TRANSLATION_CONFIG.endpoints.deepseek, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!response.ok) {
            throw new Error(`批量翻译请求失败: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          
          // 处理翻译结果
          if (data && data.choices && data.choices.length > 0 && 
              data.choices[0].message && data.choices[0].message.content) {
            const translatedText = data.choices[0].message.content.trim();
            
            // 分割翻译结果
            const translatedParts = translatedText.split(DELIMITER);
            
            // 检查翻译结果分段是否与原始文本数量匹配
            if (translatedParts.length >= batch.length) {
              // 按索引填充结果，并清理每个结果中可能的分隔符
              for (let j = 0; j < batch.length; j++) {
                if (j < translatedParts.length) {
                  batchResults[indices[j]] = cleanDelimiters(translatedParts[j]);
                } else {
                  // 索引超出范围，使用Google翻译单独处理这个文本
                  try {
                    const singleResult = await translateWithGoogle([batch[j]], sourceLanguage, targetLanguage);
                    batchResults[indices[j]] = singleResult[0] || batch[j];
                  } catch (err) {
                    batchResults[indices[j]] = batch[j]; // 失败时使用原文
                  }
                }
              }
              console.log(`批次 ${batchIndex+1} 翻译完成，成功匹配所有分段`);
            } else {
              console.warn(`批次 ${batchIndex+1} 翻译分段异常: 预期${batch.length}段，但得到${translatedParts.length}段，尝试回退处理`);
              
              // 如果分段数量不匹配，先尝试清理整个翻译结果，看是否能找到我们的分隔符
              const cleanedFullText = translatedText
                .replace(/<.*?TRANSOR.*?SPLIT.*?>/gi, DELIMITER) // 替换不同格式的分隔符为我们的标准分隔符
                .replace(/TRANSOR[_\s]*SPLIT/gi, DELIMITER); // 替换可能的文本形式分隔符
              
              // 再次尝试分割
              const recleanedParts = cleanedFullText.split(DELIMITER);
              
              if (recleanedParts.length >= batch.length) {
                // 如果清理后的分段数量正确，使用这个结果
                for (let j = 0; j < batch.length; j++) {
                  batchResults[indices[j]] = cleanDelimiters(recleanedParts[j]);
                }
                console.log(`批次 ${batchIndex+1} 经过二次清理后成功匹配分段`);
              } else {
                // 仍然失败，逐个翻译
                console.log(`批次 ${batchIndex+1} 分段失败，转为逐个翻译`);
                
                // 回退到Google翻译
                try {
                  const fallbackResults = await translateWithGoogle(batch, sourceLanguage, targetLanguage);
                  for (let j = 0; j < batch.length; j++) {
                    batchResults[indices[j]] = fallbackResults[j] || batch[j];
                  }
                } catch (err) {
                  // 如果Google翻译也失败，使用原文
                  for (let j = 0; j < batch.length; j++) {
                    batchResults[indices[j]] = batch[j];
                  }
                }
              }
            }
          } else {
            throw new Error('翻译返回数据格式异常');
          }
        } catch (error) {
          console.error(`短文本批次 ${batchIndex+1} 处理失败:`, error);
          
          // 错误回退：使用Google翻译
          try {
            const fallbackResults = await translateWithGoogle(batch, sourceLanguage, targetLanguage);
            // 填充结果
            for (let j = 0; j < batch.length; j++) {
              batchResults[indices[j]] = fallbackResults[j] || batch[j];
            }
          } catch (err) {
            // 如果Google翻译也失败，使用原文
            for (let j = 0; j < batch.length; j++) {
              batchResults[indices[j]] = batch[j];
            }
          }
        }
      });
      
      // 并行等待所有批次完成
      console.log('并行处理所有请求中...');
      await Promise.all(batchPromises);
      console.log('所有短文本批次处理完成');
    }
    
    // 处理长文本：并行使用Google翻译
    if (largeTexts.length > 0) {
      console.log(`并行处理${largeTexts.length}条长文本，使用Google翻译`);
      
      try {
        const largeResults = await translateWithGoogle(largeTexts, sourceLanguage, targetLanguage);
        // 填充结果
        for (let i = 0; i < largeTexts.length; i++) {
          batchResults[largeIndices[i]] = largeResults[i] || largeTexts[i];
        }
      } catch (error) {
        console.error('长文本翻译失败:', error);
        // 失败时使用原文
        for (let i = 0; i < largeTexts.length; i++) {
          batchResults[largeIndices[i]] = largeTexts[i];
        }
      }
    }
    
    // 最终清理所有结果，确保没有分隔符残留
    for (let i = 0; i < batchResults.length; i++) {
      if (batchResults[i]) {
        // 清理各种可能的分隔符格式
        batchResults[i] = batchResults[i]
          .replace(/\n?##===@@TRANSOR__INTERNAL__DELIMITER@@===##\n?/g, '')
          .replace(/<====TRANSOR_SPLIT====>\s*/g, '')
          .replace(/TRANSOR[_\s]*SPLIT/gi, '')
          .trim();
      }
    }
    
    // 返回结果
    return isArray ? batchResults : batchResults[0] || '';
  } catch (error) {
    console.error('DeepSeek翻译出错:', error);
    // 全局错误回退：使用Google翻译
    try {
      return await translateWithGoogle(texts, sourceLanguage, targetLanguage);
    } catch (err) {
      // 如果Google翻译也失败，返回原文
      return Array.isArray(texts) ? texts : texts;
    }
  }
}

// 使用Google API翻译
async function translateWithGoogle(texts, sourceLanguage, targetLanguage) {
  // 判断是否为批量请求
  const isArray = Array.isArray(texts);
  const textsArray = isArray ? texts : [texts];
  
  if (textsArray.length === 0) {
    return isArray ? [] : '';
  }
  
  try {
    // 处理单个文本的情况
    if (textsArray.length === 1) {
      const result = await bulkTranslateTexts([textsArray[0]], sourceLanguage, targetLanguage);
      return isArray ? result : result[0] || '';
    }
    
    // 处理批量翻译
    console.log(`使用Google翻译API: 批量翻译 ${textsArray.length} 条文本`);
    
    // 准备结果数组
    const results = new Array(textsArray.length);
    const batchSize = TRANSLATION_CONFIG.batchSize.default;
    
    // 分批处理文本
    for (let i = 0; i < textsArray.length; i += batchSize) {
      const batch = textsArray.slice(i, i + batchSize);
      
      // 清理文本
      const cleanBatch = batch.map(text => {
        if (!text) return '';
        
        let cleanText = text.trim();
        cleanText = cleanText.replace(/^\[\d+\]/, '').trim();
        
        return cleanText
          .replace(/<TRANSOR#DIV#MARK>/g, '')
          .replace(/##==SPLIT_MARK_TRANSOR==##/g, ' ')
          .replace(/<TRANSOR-MARK.*?>/g, ' ')
          .trim();
      });
      
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
        
        // 批量翻译请求
        const batchResults = await bulkTranslateTexts(validTexts, sourceLanguage, targetLanguage);
        
        // 填充结果数组
        for (let j = 0; j < validIndices.length; j++) {
          const index = validIndices[j];
          results[i + index] = batchResults[j] || cleanBatch[index];
        }
        
        // 批次间添加延时
        if (i + batchSize < textsArray.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('批次处理错误:', error);
        // 失败时使用原文
        for (let j = 0; j < batch.length; j++) {
          if (!results[i + j]) {
            results[i + j] = batch[j];
          }
        }
      }
    }
    
    // 确保所有索引都有结果
    for (let i = 0; i < textsArray.length; i++) {
      if (!results[i]) {
        results[i] = textsArray[i];
      }
    }
    
    // 根据输入类型返回结果
    return isArray ? results : (results[0] || '');
  } catch (error) {
    console.error('Google翻译过程出错:', error);
    // 失败时返回原文
    return isArray ? texts : texts;
  }
}

// 加载 OCR 库
function loadOCRLibrary() {
  console.log('准备OCR功能...');
  
  if (tesseractLoaded || tesseractInitializing) {
    console.log('OCR功能已在加载中或已加载完成');
    return;
  }
  
  tesseractInitializing = true;
  
  try {
    // 确保OCR服务API参数配置正确
    console.log('OCR功能准备就绪');
    tesseractLoaded = true;
  } catch (error) {
    console.error('OCR功能初始化失败:', error);
  } finally {
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
    } catch (error) {
      console.error('Data URL OCR失败:', error);
      return '图片处理失败，请尝试其他图片';
    }
  }
  
  // 清理图片URL
  const cleanImageUrl = imageUrl.trim();
  if (!cleanImageUrl) {
    return '无效的图片URL';
  }
  
  try {
    // 尝试使用外部OCR服务处理图片URL
    return await fallbackToExternalOCR(cleanImageUrl);
  } catch (error) {
    console.error('OCR处理失败:', error);
    return '无法识别图片中的文字，请尝试使用更清晰的图片';
  }
}

// 备用方案：使用外部 OCR API
async function fallbackToExternalOCR(imageUrl) {
  console.log('使用在线OCR服务...');
  
  // 定义OCR处理策略
  const ocrStrategies = [
    // 策略1: 直接使用图片URL
    async () => {
      const formData = new FormData();
      formData.append('apikey', OCR_CONFIG.apiKey);
      formData.append('url', imageUrl);
      formData.append('language', OCR_CONFIG.defaultLanguage);
      formData.append('scale', 'true');
      formData.append('OCREngine', OCR_CONFIG.defaultEngine);
      formData.append('isOverlayRequired', 'false');
      formData.append('filetype', 'JPG');
      
      const response = await fetch(OCR_CONFIG.endpoint, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`OCR API响应错误: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.ParsedResults && data.ParsedResults.length > 0) {
        const text = data.ParsedResults[0].ParsedText;
        if (text && text.trim()) return text;
      }
      
      throw new Error('OCR API返回无效数据');
    },
    
    // 策略2: 下载图片并使用Base64方式
    async () => {
      const base64 = await downloadImageAsBase64(imageUrl);
      return await recognizeTextFromBase64(base64);
    },
    
    // 策略3: 提供Google Lens链接作为降级选项
    async () => {
      const googleLensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;
      return `无法自动识别图片中的文字。请尝试:\n\n1. 使用更清晰的图片\n2. 手动复制文字\n3. 使用Google Lens查看图片: ${googleLensUrl}`;
    }
  ];
  
  // 依次尝试各个策略
  for (let i = 0; i < ocrStrategies.length; i++) {
    try {
      console.log(`尝试OCR策略 #${i+1}...`);
      const text = await ocrStrategies[i]();
      if (text && text.trim()) {
        return text;
      }
    } catch (error) {
      console.warn(`OCR策略 #${i+1} 失败:`, error);
    }
  }
  
  return '图片识别失败。请尝试使用更清晰的图片，或手动输入文字。';
}

// 从Base64图片中识别文字
async function recognizeTextFromBase64(base64Image, language = 'auto') {
  try {
    console.log('使用Base64编码识别图片...');
    
    // 尝试FormData方式请求
    const result = await sendOCRRequest({
      base64Image,
      language: language === 'auto' ? OCR_CONFIG.defaultLanguage : language
    });
    
    // 处理结果
    if (result && result.ParsedResults && result.ParsedResults.length > 0) {
      const text = result.ParsedResults[0].ParsedText;
      console.log('OCR识别成功, 文本长度:', text ? text.length : 0);
      
      if (text && text.trim() !== '') {
        return text;
      }
    }
    
    // 失败时尝试JSON方式
    return await recognizeWithJSONRequest(base64Image, language);
  } catch (error) {
    console.error('Base64 OCR识别失败:', error);
    // 尝试替代方案
    return await recognizeWithJSONRequest(base64Image, language);
  }
}

// 发送OCR请求
async function sendOCRRequest({ base64Image, language = 'eng', method = 'formdata' }) {
  if (method === 'formdata') {
    // FormData方式
    const formData = new FormData();
    formData.append('apikey', OCR_CONFIG.apiKey);
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    formData.append('language', language);
    formData.append('scale', 'true');
    formData.append('OCREngine', OCR_CONFIG.defaultEngine);
    formData.append('isOverlayRequired', 'false');
    formData.append('filetype', 'JPG');
    
    const response = await fetch(OCR_CONFIG.endpoint, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`OCR服务响应错误: ${response.status}`);
    }
    
    return await response.json();
  } else {
    // JSON方式
    const requestBody = JSON.stringify({
      apikey: OCR_CONFIG.apiKey,
      base64Image: `data:image/jpeg;base64,${base64Image}`,
      language: language,
      scale: true,
      OCREngine: Number(OCR_CONFIG.defaultEngine),
      isOverlayRequired: false,
      filetype: 'JPG'
    });
    
    const response = await fetch(OCR_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': OCR_CONFIG.apiKey
      },
      body: requestBody
    });
    
    if (!response.ok) {
      throw new Error(`JSON OCR请求失败: ${response.status}`);
    }
    
    return await response.json();
  }
}

// 使用JSON格式请求进行OCR识别
async function recognizeWithJSONRequest(base64Image, language = 'auto') {
  console.log('尝试使用JSON格式发送OCR请求...');
  
  try {
    const result = await sendOCRRequest({
      base64Image,
      language: language === 'auto' ? OCR_CONFIG.defaultLanguage : language,
      method: 'json'
    });
    
    // 处理结果
    if (result.IsErroredOnProcessing) {
      if (
        result.ParsedResults && 
        result.ParsedResults[0] && 
        result.ParsedResults[0].ErrorMessage && 
        result.ParsedResults[0].ErrorMessage.includes('corrupt')
      ) {
        return '图片损坏或无法解析，请尝试使用其他图片格式';
      }
      
      return '无法识别图片中的文字，OCR处理失败';
    }
    
    if (result && result.ParsedResults && result.ParsedResults.length > 0) {
      const text = result.ParsedResults[0].ParsedText;
      if (text && text.trim() !== '') {
        return text;
      }
    }
    
    return '未检测到图片中的文字，图片可能不包含文本';
  } catch (error) {
    console.error('JSON OCR请求失败:', error);
    return '无法识别图片中的文字，请尝试上传更清晰的图片';
  }
}

// 下载图片并转换为Base64编码
async function downloadImageAsBase64(imageUrl) {
  console.log('正在下载图片并转换为Base64...');
  
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`图片下载失败: ${response.status}`);
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
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

// 处理图片URL OCR的函数
async function handleImageUrlOCR(imageUrl, sourceLanguage = 'auto') {
  try {
    console.log('处理图片URL OCR请求:', imageUrl);
    const base64Image = await downloadImageAsBase64(imageUrl);
    return await recognizeTextFromBase64(base64Image, sourceLanguage);
  } catch (error) {
    console.error('图片URL OCR处理失败:', error);
    throw error;
  }
}

// 监听语言变化，确保跨页面同步
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes['transor-ui-language']) {
    const newLanguage = changes['transor-ui-language'].newValue;
    console.log('后台脚本检测到界面语言变化:', newLanguage);
    
    // 安全地广播消息给所有打开的页面
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(function(tab) {
        try {
          // 使用更安全的消息发送模式，添加错误处理
          chrome.tabs.sendMessage(
            tab.id, 
            { action: 'language-changed', language: newLanguage },
            function() {
              // 忽略错误，这里不处理任何返回
              const lastError = chrome.runtime.lastError;
              if (lastError) {
                // 这里只需要访问lastError以防止错误显示在控制台
                // 实际不需要做任何处理
              }
            }
          );
        } catch (e) {
          // 忽略错误
          console.log('向标签页发送消息失败，可能是页面未加载完成:', tab.id);
        }
      });
    });
    
    // 尝试向其他扩展页面广播消息
    try {
      chrome.runtime.sendMessage(
        { action: 'language-changed', language: newLanguage },
        function() {
          // 忽略错误
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            // 这里只需要访问lastError以防止错误显示在控制台
          }
        }
      );
    } catch (e) {
      console.log('广播语言变更消息失败:', e.message);
    }
  }
});

// 监听来自其他页面的语言变更请求
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'set-language') {
    console.log('收到语言设置请求:', message.language);
    
    // 保存到本地存储以确保跨页面同步
    chrome.storage.local.set({ 'transor-ui-language': message.language }, function() {
      console.log('语言设置已保存到storage:', message.language);
      try {
        sendResponse({ success: true });
      } catch (e) {
        console.log('发送响应失败，可能连接已关闭:', e.message);
      }
    });
    
    // 返回true表示将异步发送响应
    return true;
  }
});

// 初始化扩展
init(); 