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
  translationStyle: 'universal',
  enabledSelectors: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span', 'a'],
  excludedClasses: ['no-translate'],
  excludedUrls: [],
  customCss: '',
  translationEngine: 'microsoft',  // 翻译引擎: google, microsoft, microsoftapi, deepseek, openai
  openaiModel: 'gpt-3.5-turbo', // OpenAI模型选择
  // API密钥配置
  apiKeys: {
    // microsoft: 'AZPa1kcEw7ns0flRDUzAxCpPTSbBSTsUH1lZkrO6FhpxTAyxgg7nJQQJ99BEAC3pKaRXJ3w3AAAbACOGFYoI',  // 微软翻译API密钥
    microsoftapi: 'AZPa1kcEw7ns0flRDUzAxCpPTSbBSTsUH1lZkrO6FhpxTAyxgg7nJQQJ99BEAC3pKaRXJ3w3AAAbACOGFYoI',  // Microsoft API翻译API密钥
    deepseek: '',    // DeepSeek翻译API密钥
    openai: ''       // OpenAI翻译API密钥
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
    deepseek: 'https://api.deepseek.com/chat/completions',
    openai: 'https://api.openai.com/v1/chat/completions'
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
    openai: '',      // OpenAI翻译API密钥
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
async function collectWord() {
  // 暂未实现，未来版本将添加此功能
  console.log('收藏单词功能尚未实现');
  return { success: false, message: '功能尚未实现' };
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
    
    // 获取词典数据
    fetchDictionary: () => {
      const word = message.word;
      const sourceLang = message.sourceLang || 'auto';
      const targetLang = message.targetLang || 'zh-CN';
      const timestamp = message.timestamp || Date.now(); // 获取时间戳，用于避免缓存
      
      console.log(`获取词典数据: ${word}, 源语言: ${sourceLang}, 目标语言: ${targetLang}, 时间戳: ${timestamp}`);
      
      // 将时间戳传递给fetchDictionaryData
      fetchDictionaryData(word, sourceLang, targetLang, timestamp)
        .then(result => {
          // 确保扩展上下文有效再发送响应
          if (chrome.runtime.id) {
            // 添加时间戳和单词到响应中，便于调试
            result.timestamp = timestamp;
            result.queriedWord = word;
            sendResponse(result);
          }
        })
        .catch(error => {
          console.error('获取词典数据失败:', error);
          // 确保扩展上下文有效再发送响应
          if (chrome.runtime.id) {
            sendResponse({ 
              success: false, 
              error: error.message || '获取词典数据失败',
              timestamp: timestamp,
              queriedWord: word
            });
          }
        });
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
    
    // 更新AI配置
    updateAiConfig: () => {
      if (message.engine && message.config) {
        console.log(`接收到${message.engine}配置更新:`, message.config);
        
        // 更新本地配置
        if (message.engine === 'openai') {
          chrome.storage.sync.get(['openaiConfig'], (result) => {
            const updatedConfig = { ...result.openaiConfig || {}, ...message.config };
            
            chrome.storage.sync.set({ openaiConfig: updatedConfig }, () => {
              console.log('已更新OpenAI配置', updatedConfig);
              sendResponse({ success: true });
            });
          });
        } else if (message.engine === 'deepseek') {
          chrome.storage.sync.get(['deepseekConfig'], (result) => {
            const updatedConfig = { ...result.deepseekConfig || {}, ...message.config };
            
            chrome.storage.sync.set({ deepseekConfig: updatedConfig }, () => {
              console.log('已更新DeepSeek配置', updatedConfig);
              sendResponse({ success: true });
            });
          });
        } else {
          sendResponse({ success: false, error: '不支持的AI引擎类型' });
        }
        return true;
      }
      sendResponse({ success: false, error: '无效的AI配置数据' });
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
        // 检查是否有DeepSeek配置
        if (settings.deepseekConfig) {
          console.log(`使用DeepSeek翻译，模型: ${settings.deepseekConfig.model}, 专家策略: ${settings.deepseekConfig.expertStrategy}`);
        }
        translateFunction = translateWithDeepSeek;
        break;
      case 'openai':
        // 检查是否有OpenAI配置
        if (settings.openaiConfig) {
          console.log(`使用OpenAI翻译，模型: ${settings.openaiConfig.model}, 专家策略: ${settings.openaiConfig.expertStrategy}`);
        }
        translateFunction = translateWithOpenAI;
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
    
    // 使用完整的deepseekConfig配置
    const deepseekConfig = settings.deepseekConfig || {
      model: 'deepseek-chat',
      expertStrategy: 'translation-master',
      aiContext: false,
      maxRequests: 10
    };
    
    // 检查模型，如果是deepseek-coder则改为deepseek-reasoner
    if (deepseekConfig.model === 'deepseek-coder') {
      deepseekConfig.model = 'deepseek-reasoner';
      // 尝试更新存储的配置
      try {
        chrome.storage.sync.get(['deepseekConfig'], (result) => {
          if (result.deepseekConfig) {
            const updatedConfig = { ...result.deepseekConfig, model: 'deepseek-reasoner' };
            chrome.storage.sync.set({ deepseekConfig: updatedConfig }, () => {
              console.log('已将DeepSeek模型从deepseek-coder更新为deepseek-reasoner');
            });
          }
        });
      } catch (e) {
        console.warn('更新存储的DeepSeek模型时出错:', e);
      }
    }
    
    // 获取模型名称（优先使用配置中的模型，如果配置中启用了自定义模型则使用自定义模型）
    const modelName = deepseekConfig.customModelEnabled && deepseekConfig.customModel 
      ? deepseekConfig.customModel 
      : deepseekConfig.model || 'deepseek-chat';
    
    console.log(`DeepSeek翻译使用模型: ${modelName}, 策略: ${deepseekConfig.expertStrategy}, 上下文: ${deepseekConfig.aiContext}`);
    
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
          
          // 构建提示
          let userPrompt = `请将以下${sourceLanguage === 'auto' ? '文本' : sourceLanguage + '文本'}翻译成${targetLanguage}，注意：1. 分隔符处理：
- 严格保留所有"##===@@TRANSOR__INTERNAL__DELIMITER@@===##"分隔符
- 分隔符不翻译、不修改、不增减
- 仅翻译分隔符之间的内容
   输出格式要求：
- 保持原文段落结构
- 技术术语首次出现时可添加括号注释（如"分叉(Fork)")
- 统一术语表（后续相同术语保持译法一致）
`;

          // 根据专家策略添加额外指导
          switch(deepseekConfig.expertStrategy) {
            case 'universal':
              userPrompt += `\n\n作为一个通用翻译助手，你可以处理各种类型的文本。你的翻译既准确又符合${targetLanguage}的表达习惯。`;
              break;
            case 'smart-choice':
              userPrompt += `\n\n作为一个智能翻译助手，请根据文本内容自动选择最合适的翻译策略。分析文本类型和语境，灵活运用不同的翻译技巧。`;
              break;
            case 'translation-master':
              userPrompt += `\n\n作为一位精通多语言的翻译大师，请提供意译。你的翻译应既准确又流畅自然，确保译文符合${targetLanguage}的表达习惯。`;
              break;
            case 'paragraph-expert':
              userPrompt += `\n\n作为一位段落总结专家，请将复杂段落精简为清晰且保留核心含义的译文。抓住段落的主要观点，同时保持翻译的准确性。`;
              break;
            case 'english-simplifier':
              userPrompt += `\n\n作为一位英文简化大师，请将复杂英文翻译成简洁易懂的${targetLanguage}。降低语言复杂度，使译文更加通俗易懂。`;
              break;
            case 'twitter-enhancer':
              userPrompt += `\n\n作为Twitter翻译增强器，专门处理社交媒体简短文本的翻译。了解网络用语、话题标签和Twitter特有表达方式，保留原文风格同时确保翻译准确。`;
              break;
            case 'tech-translator':
              userPrompt += `\n\n作为科技类翻译大师，专精于技术文档、科技新闻和专业内容的翻译。请使用准确的专业术语，准确传达技术概念。`;
              break;
            case 'reddit-enhancer':
              userPrompt += `\n\n作为Reddit翻译增强器，专门处理论坛讨论内容。了解Reddit特有的表达方式、梗和社区文化，保留原文风格和幽默感。`;
              break;
            case 'academic-translator':
              userPrompt += `\n\n作为学术论文翻译师，专注于学术文献、研究论文的翻译。保持学术严谨性，准确使用学术术语，维持论文的逻辑结构。`;
              break;
            case 'news-translator':
              userPrompt += `\n\n作为新闻媒体译者，专门翻译新闻报道和时事内容。保持客观中立的语调，准确传达事实信息，符合新闻写作风格。`;
              break;
            case 'music-expert':
              userPrompt += `\n\n作为音乐专家，擅长翻译歌词、音乐评论和相关内容。注重保留原文的韵律和情感表达，了解音乐术语和表达方式。`;
              break;
            case 'medical-translator':
              userPrompt += `\n\n作为医学翻译大师，专精于医学文献、健康信息的翻译。熟悉医学术语，准确传达专业医学概念，保持医学内容的精确性。`;
              break;
            case 'legal-translator':
              userPrompt += `\n\n作为法律行业译者，专注于法律文件、合同和法规的翻译。理解法律术语和表达，保持法律文本的准确性和专业性。`;
              break;
            case 'github-enhancer':
              userPrompt += `\n\n作为GitHub翻译增强器，专门处理代码、技术文档和开发讨论的翻译。了解编程术语，保留代码块的完整性，准确翻译技术概念。`;
              break;
            case 'gaming-translator':
              userPrompt += `\n\n作为游戏译者，专注于游戏内容、游戏评论和相关讨论的翻译。熟悉游戏术语和表达，保留游戏文化特色。`;
              break;
            case 'ecommerce-translator':
              userPrompt += `\n\n作为电商翻译大师，专门翻译产品描述、评价和电商内容。使用吸引人的语言，准确传达产品信息和特点。`;
              break;
            case 'finance-translator':
              userPrompt += `\n\n作为金融翻译顾问，专注于金融新闻、报告和分析的翻译。熟悉金融术语和表达，准确传达金融概念和数据。`;
              break;
            case 'novel-translator':
              userPrompt += `\n\n作为小说译者，专精于文学作品和小说的翻译。注重保留原作的风格、情感和文学性，同时使译文流畅自然。`;
              break;
            case 'ao3-translator':
              userPrompt += `\n\n作为AO3译者，专门翻译同人文学作品。理解粉丝文化和特定术语，保留原作的风格和情感表达。`;
              break;
            case 'ebook-translator':
              userPrompt += `\n\n作为电子书译者，专注于各类电子书的翻译。善于处理长篇内容，保持章节结构，使译文读起来流畅自然。`;
              break;
            case 'designer':
              userPrompt += `\n\n作为设计师专业翻译助手，专注于设计相关内容的翻译。熟悉设计术语和概念，准确传达设计理念和技术细节。`;
              break;
            case 'cn-en-polisher':
              userPrompt += `\n\n作为中英夹杂内容的翻译专家，擅长处理混合了中英文的内容。识别并适当保留原文中的英文术语，使译文既专业又易于理解。`;
              break;
            case 'web3-translator':
              userPrompt += `\n\n作为Web3翻译大师，专注于区块链、加密货币和Web3相关内容的翻译。熟悉这一领域的专业术语和概念，准确传达技术信息。`;
              break;
            case 'literal-expert':
              userPrompt += `\n\n作为一位精确翻译专家，请提供直译。你应严格保持原文的结构和表达方式，确保忠实于原文。`;
              break;
            case 'context-analyzer':
              userPrompt += `\n\n作为一位语境分析翻译专家，请深入理解文本的上下文和潜在含义，在翻译时保留原文的语境和意图。`;
              break;
            case 'cultural-adapter':
              userPrompt += `\n\n作为一位文化适配翻译专家，请将文本适应${targetLanguage}的文化背景，使用恰当的文化参照和习语表达。`;
              break;
            default:
              userPrompt += `\n\n请提供准确、流畅的翻译，确保译文符合${targetLanguage}的表达习惯。`;
          }
          
          // 如果启用了AI上下文，添加相关指导
          if (deepseekConfig.aiContext) {
            userPrompt += `\n\n请首先理解整体内容和专业术语，确保翻译的连贯性和术语一致性。你应该考虑整个文本的上下文，而不是孤立地翻译每个部分。`;
          }

          userPrompt += `\n\n原文:\n${combinedText}`;
          
          // 翻译合并文本
          const requestBody = {
            model: modelName,
            messages: [
              {
                role: "user",
                content: userPrompt,
              },
            ],
            temperature: deepseekConfig.aiContext ? 0.4 : 0.7, // 根据上下文需求调整温度
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

// 添加使用OpenAI进行翻译的函数
// 使用OpenAI API进行翻译
async function translateWithOpenAI(texts, sourceLanguage, targetLanguage) {
  try {
    // 获取配置
    const settings = await getSettings();
    const apiKey = settings.apiKeys?.openai || TRANSLATION_CONFIG.apiKeys.openai;
    
    // 使用完整的openaiConfig配置
    const openaiConfig = settings.openaiConfig || {
      model: settings.openaiModel || 'gpt-4.1-mini',
      expertStrategy: 'translation-master',
      aiContext: false,
      maxRequests: 10
    };
    
    // 获取模型名称（优先使用配置中的模型，如果配置中启用了自定义模型则使用自定义模型）
    const modelName = openaiConfig.customModelEnabled && openaiConfig.customModel 
      ? openaiConfig.customModel 
      : openaiConfig.model || 'gpt-4.1-mini';
    
    console.log(`OpenAI翻译使用模型: ${modelName}, 策略: ${openaiConfig.expertStrategy}, 上下文: ${openaiConfig.aiContext}`);
    
    if (!apiKey) {
      console.error('未配置OpenAI翻译API密钥');
      throw new Error('未配置OpenAI翻译API密钥');
    }
    
    // 输入验证和规范化
    const isArray = Array.isArray(texts);
    const textArray = isArray ? texts : [texts];
    
    if (textArray.length === 0) {
      return isArray ? [] : '';
    }
    
    // 批量优化处理
    console.log(`OpenAI翻译开始处理${textArray.length}条文本，使用模型: ${modelName}`);
    
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
          
          // 构建系统提示，根据翻译策略定制
          let systemPrompt = "你是一个专业的翻译助手，请将提供的文本准确翻译，保留原始分隔符。不要添加任何解释或评论。";
          
          // 根据专家策略调整系统提示
          switch(openaiConfig.expertStrategy) {
            case 'universal':
              systemPrompt = "你是一个通用翻译助手，能够处理各种类型的文本。你的翻译既准确又符合目标语言习惯。保留所有分隔符。";
              break;
            case 'smart-choice':
              systemPrompt = "你是一个智能翻译助手，能够根据文本内容自动选择最合适的翻译策略。你会分析文本类型和语境，灵活运用不同的翻译技巧。保留所有分隔符。";
              break;
            case 'translation-master':
              systemPrompt = "你是一位精通多语言的翻译大师，专注于意译。你的翻译既准确又流畅自然，确保译文符合目标语言的表达习惯。保留所有分隔符。";
              break;
            case 'paragraph-expert':
              systemPrompt = "你是一位段落总结专家，擅长将复杂段落精简为清晰且保留核心含义的译文。你会抓住段落的主要观点，同时保持翻译的准确性。保留所有分隔符。";
              break;
            case 'english-simplifier':
              systemPrompt = "你是一位英文简化大师，专注于将复杂英文翻译成简洁易懂的目标语言。你擅长降低语言复杂度，使译文更加通俗易懂。保留所有分隔符。";
              break;
            case 'twitter-enhancer':
              systemPrompt = "你是Twitter翻译增强器，专门处理社交媒体简短文本的翻译。你了解网络用语、话题标签和Twitter特有表达方式，能保留原文风格同时确保翻译准确。保留所有分隔符。";
              break;
            case 'tech-translator':
              systemPrompt = "你是科技类翻译大师，专精于技术文档、科技新闻和专业内容的翻译。你熟悉各领域专业术语，能准确传达技术概念。保留所有分隔符。";
              break;
            case 'reddit-enhancer':
              systemPrompt = "你是Reddit翻译增强器，专门处理论坛讨论内容。你了解Reddit特有的表达方式、梗和社区文化，能保留原文风格和幽默感。保留所有分隔符。";
              break;
            case 'academic-translator':
              systemPrompt = "你是学术论文翻译师，专注于学术文献、研究论文的翻译。你保持学术严谨性，准确使用学术术语，维持论文的逻辑结构。保留所有分隔符。";
              break;
            case 'news-translator':
              systemPrompt = "你是新闻媒体译者，专门翻译新闻报道和时事内容。你保持客观中立的语调，准确传达事实信息，符合新闻写作风格。保留所有分隔符。";
              break;
            case 'music-expert':
              systemPrompt = "你是音乐专家，擅长翻译歌词、音乐评论和相关内容。你注重保留原文的韵律和情感表达，了解音乐术语和表达方式。保留所有分隔符。";
              break;
            case 'medical-translator':
              systemPrompt = "你是医学翻译大师，专精于医学文献、健康信息的翻译。你熟悉医学术语，能准确传达专业医学概念，保持医学内容的精确性。保留所有分隔符。";
              break;
            case 'legal-translator':
              systemPrompt = "你是法律行业译者，专注于法律文件、合同和法规的翻译。你理解法律术语和表达，保持法律文本的准确性和专业性。保留所有分隔符。";
              break;
            case 'github-enhancer':
              systemPrompt = "你是GitHub翻译增强器，专门处理代码、技术文档和开发讨论的翻译。你了解编程术语，保留代码块的完整性，准确翻译技术概念。保留所有分隔符。";
              break;
            case 'gaming-translator':
              systemPrompt = "你是游戏译者，专注于游戏内容、游戏评论和相关讨论的翻译。你熟悉游戏术语和表达，能保留游戏文化特色。保留所有分隔符。";
              break;
            case 'ecommerce-translator':
              systemPrompt = "你是电商翻译大师，专门翻译产品描述、评价和电商内容。你擅长使用吸引人的语言，准确传达产品信息和特点。保留所有分隔符。";
              break;
            case 'finance-translator':
              systemPrompt = "你是金融翻译顾问，专注于金融新闻、报告和分析的翻译。你熟悉金融术语和表达，能准确传达金融概念和数据。保留所有分隔符。";
              break;
            case 'novel-translator':
              systemPrompt = "你是小说译者，专精于文学作品和小说的翻译。你注重保留原作的风格、情感和文学性，同时使译文流畅自然。保留所有分隔符。";
              break;
            case 'ao3-translator':
              systemPrompt = "你是AO3译者，专门翻译同人文学作品。你理解粉丝文化和特定术语，能保留原作的风格和情感表达。保留所有分隔符。";
              break;
            case 'ebook-translator':
              systemPrompt = "你是电子书译者，专注于各类电子书的翻译。你善于处理长篇内容，保持章节结构，使译文读起来流畅自然。保留所有分隔符。";
              break;
            case 'designer':
              systemPrompt = "你是设计师专业翻译助手，专注于设计相关内容的翻译。你熟悉设计术语和概念，能准确传达设计理念和技术细节。保留所有分隔符。";
              break;
            case 'cn-en-polisher':
              systemPrompt = "你是中英夹杂内容的翻译专家，擅长处理混合了中英文的内容。你能识别并适当保留原文中的英文术语，使译文既专业又易于理解。保留所有分隔符。";
              break;
            case 'web3-translator':
              systemPrompt = "你是Web3翻译大师，专注于区块链、加密货币和Web3相关内容的翻译。你熟悉这一领域的专业术语和概念，能准确传达技术信息。保留所有分隔符。";
              break;
            case 'literal-expert':
              systemPrompt = "你是一位精确翻译专家，专注于直译。你会严格保持原文的结构和表达方式，确保忠实于原文。保留所有分隔符。";
              break;
            case 'context-analyzer':
              systemPrompt = "你是一位语境分析翻译专家。你会深入理解文本的上下文和潜在含义，在翻译时保留原文的语境和意图。保留所有分隔符。";
              break;
            case 'cultural-adapter':
              systemPrompt = "你是一位文化适配翻译专家。你会将文本适应目标语言的文化背景，使用恰当的文化参照和习语表达。保留所有分隔符。";
              break;
            default:
              // 默认使用通用提示
              systemPrompt = "你是一个专业的翻译助手，请将提供的文本准确翻译，保留原始分隔符。不要添加任何解释或评论。";
          }
          
          // 构建用户提示，根据是否启用AI上下文调整
          let userPrompt = `请将以下${sourceLanguage === 'auto' ? '文本' : sourceLanguage + '文本'}翻译成${targetLanguage}。
请注意：文本之间用分隔符"##===@@TRANSOR__INTERNAL__DELIMITER@@===##"隔开，这不是文本内容的一部分，请在翻译时保留这些分隔符，但不要翻译分隔符本身。
这样我可以根据分隔符将翻译结果分割回多段。`;

          // 如果启用了AI上下文，添加相关指导
          if (openaiConfig.aiContext) {
            userPrompt += `\n\n请首先理解整体内容和专业术语，确保翻译的连贯性和术语一致性。你应该考虑整个文本的上下文，而不是孤立地翻译每个部分。`;
          }

          userPrompt += `\n\n原文:\n${combinedText}`;
          
          // 翻译合并文本
          const requestBody = {
            model: modelName,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userPrompt
              },
            ],
            temperature: openaiConfig.aiContext ? 0.4 : 0.3, // 根据上下文需求调整温度
          };
          
          const response = await fetch(TRANSLATION_CONFIG.endpoints.openai, {
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
            throw new Error('OpenAI翻译返回数据格式异常');
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
    console.error('OpenAI翻译出错:', error);
    // 全局错误回退：使用Google翻译
    try {
      return await translateWithGoogle(texts, sourceLanguage, targetLanguage);
    } catch (err) {
      // 如果Google翻译也失败，返回原文
      return Array.isArray(texts) ? texts : texts;
    }
  }
}

// 初始化扩展
init();

// 监听来自content-script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 支持简易的翻译请求格式
  if (message.action === 'translate') {
    console.log('收到简易翻译请求:', message);
    
    const text = message.text;
    const sourceLanguage = message.from || 'auto';
    const targetLanguage = message.to || 'zh-CN';
    
    // 获取存储的设置
    chrome.storage.sync.get(null, (settings) => {
      const engine = settings.translationEngine || 'google';
      console.log('使用翻译引擎:', engine);
      
      // 根据引擎选择翻译方法
      let translateFunction;
      switch (engine.toLowerCase()) {
        case 'microsoft':
          translateFunction = translateWithMicrosoft;
          break;
        case 'microsoftapi':
          translateFunction = translateWithMicrosoftAPI;
          break;
        case 'deepseek':
          translateFunction = translateWithDeepSeek;
          break;
        case 'openai':
          translateFunction = translateWithOpenAI;
          break;
        case 'google':
        default:
          translateFunction = translateWithGoogle;
          break;
      }
      
      // 调用选定的翻译方法
      translateFunction(text, sourceLanguage, targetLanguage)
        .then(translation => {
          console.log('翻译成功:', translation);
          sendResponse({
            success: true,
            translation: translation,
            originalText: text,
            source: engine
          });
        })
        .catch(error => {
          console.error('翻译失败:', error);
          sendResponse({
            success: false,
            error: error.message || '翻译失败',
            originalText: text
          });
        });
      
      // 返回true表示sendResponse将被异步调用
      return true;
    });
    
    // 返回true以保持消息通道开放，允许异步响应
    return true;
  } else if (message.action === 'translateTexts') {
    // 处理现有的批量翻译请求
    // (已有的代码会处理这种情况)
    return handleMessage(message, sender, sendResponse);
  } else {
    // 其他消息类型
    return handleMessage(message, sender, sendResponse);
  }
}); 

// 字典API配置
const DICTIONARY_CONFIG = {
  // 免费词典API配置
  endpoints: {
    freeDictionary: 'https://api.dictionaryapi.dev/api/v2/entries',
    ultimateDictionary: 'http://116.202.96.240:8080/translation',
    lexicala: 'https://lexicala-api.p.rapidapi.com/search'
  },
  // 语言映射 - 将常见语言代码映射到API所需格式
  languageMap: {
    'zh': 'zh',     // 中文
    'zh-CN': 'zh',  // 简体中文
    'zh-TW': 'zh',  // 繁体中文
    'en': 'en',     // 英语
    'ja': 'ja',     // 日语
    'ko': 'ko',     // 韩语
    'fr': 'fr',     // 法语
    'de': 'de',     // 德语
    'es': 'es',     // 西班牙语
    'it': 'it',     // 意大利语
    'ru': 'ru',     // 俄语
    'pt': 'pt',     // 葡萄牙语
    'vi': 'vi',     // 越南语
    'auto': 'auto'  // 自动检测
  },
  // 备用MOCK数据
  mockData: {
    enabled: true
  },
  // RapidAPI密钥 (如果使用)
  rapidApiKey: '',
  // 请求超时时间(毫秒)
  timeout: 5000,
  // 缓存时间(毫秒) - 默认1小时
  cacheTime: 3600000
};

// 词典缓存
const dictionaryCache = {};

// 获取词典数据
async function fetchDictionaryData(word, sourceLang = 'auto', targetLang = 'zh-CN', timestamp = null) {
  try {
    console.log(`获取词典数据: ${word}, 源语言: ${sourceLang}, 目标语言: ${targetLang}, 时间戳: ${timestamp || 'none'}`);
    
    // 使用时间戳作为请求ID，确保不使用缓存的结果
    const requestId = timestamp || Date.now();
    
    // 清理输入
    const cleanWord = word.trim();
    if (!cleanWord) {
      return { 
        success: false, 
        error: '词语不能为空', 
        requestId: requestId,
        queriedWord: word
      };
    }
    
    // 检测语言类型
    let detectedSourceLang = sourceLang;
    
    // 如果源语言是auto，尝试自动检测
    if (sourceLang === 'auto') {
      detectedSourceLang = detectLanguage(cleanWord);
      console.log(`自动检测语言: ${detectedSourceLang} (原词: ${cleanWord})`);
    }
    
    // 映射语言代码到API所需格式
    const mappedSourceLang = DICTIONARY_CONFIG.languageMap[detectedSourceLang] || detectedSourceLang;
    const mappedTargetLang = DICTIONARY_CONFIG.languageMap[targetLang] || targetLang;
    
    // 生成缓存键
    const cacheKey = `${cleanWord}:${mappedSourceLang}:${mappedTargetLang}`;
    
    // 检查缓存 - 仅在没有提供时间戳时使用缓存
    if (!timestamp && dictionaryCache[cacheKey] && 
        Date.now() - dictionaryCache[cacheKey].timestamp < DICTIONARY_CONFIG.cacheTime) {
      console.log(`使用缓存的词典数据: ${cacheKey}`);
      const cachedResult = dictionaryCache[cacheKey].data;
      cachedResult.requestId = requestId;
      cachedResult.queriedWord = word;
      cachedResult.fromCache = true;
      return cachedResult;
    }
    
    // 尝试获取词典数据
    let result = null;
    
    // 英语查询使用Free Dictionary API
    if (mappedSourceLang === 'en') {
      try {
        result = await fetchFromFreeDictionary(cleanWord, requestId, mappedTargetLang);
      } catch (error) {
        console.error('Free Dictionary API failed:', error);
        // 失败时尝试Ultimate Dictionary API
        try {
          result = await fetchFromUltimateDictionary(cleanWord, mappedSourceLang, mappedTargetLang, requestId);
        } catch (ultimateError) {
          console.error('Ultimate Dictionary API failed:', ultimateError);
          // 两个API都失败，使用Mock数据
          if (DICTIONARY_CONFIG.mockData.enabled) {
            result = { 
              success: true, 
              data: generateMockDictionaryData(word), 
              requestId: requestId,
              queriedWord: word,
              fromMock: true
            };
          } else {
            throw new Error('所有词典API请求失败');
          }
        }
      }
    } else {
      // 非英语查询使用Ultimate Dictionary API
      try {
        result = await fetchFromUltimateDictionary(cleanWord, mappedSourceLang, mappedTargetLang, requestId);
      } catch (error) {
        console.error('Ultimate Dictionary API failed:', error);
        // 失败时使用Mock数据
        if (DICTIONARY_CONFIG.mockData.enabled) {
          result = { 
            success: true, 
            data: generateMockDictionaryData(word), 
            requestId: requestId,
            queriedWord: word,
            fromMock: true
          };
        } else {
          throw new Error('所有词典API请求失败');
        }
      }
    }
    
    // 添加请求信息
    result.requestId = requestId;
    result.queriedWord = word;
    
    // 缓存结果
    if (result.success) {
      dictionaryCache[cacheKey] = {
        timestamp: Date.now(),
        data: result
      };
    }
    
    return result;
  } catch (error) {
    console.error('获取词典数据失败:', error);
    return { 
      success: false, 
      error: error.message || '获取词典数据失败', 
      requestId: timestamp || Date.now(),
      queriedWord: word
    };
  }
}

// 检测语言
function detectLanguage(text) {
  // 简单的语言检测逻辑
  // 英文检测
  if (/^[a-zA-Z\s\-',.!?]+$/.test(text)) {
    return 'en';
  }
  
  // 中文检测
  if (/[\u4e00-\u9fa5]/.test(text)) {
    return 'zh';
  }
  
  // 日文检测 (包括平假名、片假名)
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/.test(text)) {
    return 'ja';
  }
  
  // 韩文检测
  if (/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff]/.test(text)) {
    return 'ko';
  }
  
  // 俄文检测
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'ru';
  }
  
  // 默认返回英文
  return 'en';
}

// 简洁词典数据映射
const CONCISE_DICTIONARY = {
  'time': {
    phonetic: 'taɪm',
    definitions: [
      { pos: 'n.', meanings: ['时间', '时候', '次', '倍'] },
      { pos: 'v.', meanings: ['计时', '为…安排时间', '选择…的时机'] },
      { pos: 'web.', meanings: ['时代周刊(Time magazine)', '时代杂志', '时光'] }
    ]
  },
  'love': {
    phonetic: 'lʌv',
    definitions: [
      { pos: 'n.', meanings: ['爱', '爱情', '喜爱'] },
      { pos: 'v.', meanings: ['爱', '喜欢', '热爱'] }
    ]
  },
  'book': {
    phonetic: 'bʊk',
    definitions: [
      { pos: 'n.', meanings: ['书', '书籍', '著作'] },
      { pos: 'v.', meanings: ['预订', '预约', '登记'] }
    ]
  },
  'work': {
    phonetic: 'wɜːk',
    definitions: [
      { pos: 'n.', meanings: ['工作', '职业', '作品'] },
      { pos: 'v.', meanings: ['工作', '运转', '起作用'] }
    ]
  },
  'good': {
    phonetic: 'ɡʊd',
    definitions: [
      { pos: 'adj.', meanings: ['好的', '优秀的', '善良的'] },
      { pos: 'n.', meanings: ['好处', '利益', '善行'] }
    ]
  },
  'make': {
    phonetic: 'meɪk',
    definitions: [
      { pos: 'v.', meanings: ['制作', '使得', '产生'] },
      { pos: 'n.', meanings: ['制造', '品牌', '款式'] }
    ]
  },
  'get': {
    phonetic: 'ɡet',
    definitions: [
      { pos: 'v.', meanings: ['得到', '获得', '变得'] }
    ]
  },
  'go': {
    phonetic: 'ɡoʊ',
    definitions: [
      { pos: 'v.', meanings: ['去', '走', '离开'] },
      { pos: 'n.', meanings: ['尝试', '轮到', '活力'] }
    ]
  },
  'take': {
    phonetic: 'teɪk',
    definitions: [
      { pos: 'v.', meanings: ['拿', '取', '带走'] },
      { pos: 'n.', meanings: ['镜头', '收入', '理解'] }
    ]
  },
  'come': {
    phonetic: 'kʌm',
    definitions: [
      { pos: 'v.', meanings: ['来', '来到', '到达'] }
    ]
  }
};

// 从Free Dictionary API获取数据
async function fetchFromFreeDictionary(word, requestId, targetLang = 'zh-CN') {
  // 首先检查是否有简洁词典数据
  const cleanWord = word.trim().toLowerCase();
  if (CONCISE_DICTIONARY[cleanWord] && targetLang !== 'en') {
    console.log(`使用简洁词典数据: ${cleanWord}`);
    return { 
      success: true, 
      data: {
        word: word,
        phonetic: CONCISE_DICTIONARY[cleanWord].phonetic,
        definitions: CONCISE_DICTIONARY[cleanWord].definitions,
        examples: []
      }
    };
  }
  
  const url = `${DICTIONARY_CONFIG.endpoints.freeDictionary}/en/${encodeURIComponent(word)}?_=${requestId}`;
  
  // 使用AbortController控制超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DICTIONARY_CONFIG.timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API返回错误: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('API返回的数据格式无效');
    }
    
    // 处理API返回数据
    const entry = data[0];
    const result = {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '',
      definitions: [],
      examples: []
    };
    
    // 处理不同词性和释义
    if (entry.meanings && Array.isArray(entry.meanings)) {
      for (const meaning of entry.meanings) {
        const def = {
          pos: meaning.partOfSpeech || '',
          meanings: []
        };
        
        // 收集英文释义
        const englishMeanings = [];
        if (meaning.definitions && Array.isArray(meaning.definitions)) {
          meaning.definitions.forEach(definition => {
            englishMeanings.push(definition.definition);
            
            // 添加例句
            if (definition.example) {
              result.examples.push(definition.example);
            }
          });
        }
        
        // 对于中文目标语言，尝试提供简洁释义
        if (targetLang !== 'en' && englishMeanings.length > 0) {
          // 生成简洁的中文释义而非详细翻译
          def.meanings = generateConciseMeanings(cleanWord, def.pos);
          
          // 如果没有简洁释义，则回退到翻译
          if (def.meanings.length === 0) {
            try {
              const translatedMeanings = await bulkTranslateTexts(
                englishMeanings.slice(0, 3), // 只翻译前3个释义
                'en', 
                targetLang
              );
              
              if (translatedMeanings && translatedMeanings.length > 0) {
                def.meanings = translatedMeanings;
              } else {
                def.meanings = englishMeanings.slice(0, 3);
              }
            } catch (error) {
              console.warn('词典释义翻译失败，使用原英文释义:', error);
              def.meanings = englishMeanings.slice(0, 3);
            }
          }
        } else {
          // 目标语言是英语，直接使用英文释义
          def.meanings = englishMeanings.slice(0, 3);
        }
        
        if (def.meanings.length > 0) {
          result.definitions.push(def);
        }
      }
    }
    
    return { success: true, data: result };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Free Dictionary API请求失败: ${error.message}`);
    throw error;
  }
}

// 生成简洁的中文释义
function generateConciseMeanings(word, pos) {
  // 如果有简洁词典数据，使用它
  if (CONCISE_DICTIONARY[word]) {
    const matchingDef = CONCISE_DICTIONARY[word].definitions.find(def => 
      def.pos.toLowerCase().includes(pos.toLowerCase()) || 
      pos.toLowerCase().includes(def.pos.toLowerCase().replace('.', ''))
    );
    if (matchingDef) {
      return matchingDef.meanings;
    }
  }
  
  // 返回空数组，让系统回退到翻译
  return [];
}

// 从Ultimate Dictionary API获取数据
async function fetchFromUltimateDictionary(word, sourceLang, targetLang, requestId) {
  const url = `${DICTIONARY_CONFIG.endpoints.ultimateDictionary}/${sourceLang}/${targetLang}/${encodeURIComponent(word)}?_=${requestId}`;
  
  // 使用AbortController控制超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DICTIONARY_CONFIG.timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API返回错误: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 转换Ultimate Dictionary格式到我们的标准格式
    const result = {
      word: word,
      phonetic: '',
      definitions: [],
      examples: []
    };
    
    // 处理词条数据
    if (data.entries && data.entries.length > 0) {
      // 获取音标
      if (data.entries[0].ipas && data.entries[0].ipas.length > 0) {
        result.phonetic = data.entries[0].ipas[0];
      }
      
      // 处理释义
      data.entries.forEach(entry => {
        if (entry.pos && entry.senses) {
          const def = {
            pos: entry.pos,
            meanings: []
          };
          
          // 添加释义
          entry.senses.forEach(sense => {
            if (sense.glosses && sense.glosses.length > 0) {
              def.meanings = def.meanings.concat(sense.glosses);
            }
            
            // 添加例句
            if (sense.examples && sense.examples.length > 0) {
              result.examples = result.examples.concat(sense.examples);
            }
          });
          
          if (def.meanings.length > 0) {
            result.definitions.push(def);
          }
        }
      });
    }
    
    // 处理翻译数据
    if (data.translations && data.translations.length > 0) {
      // 如果没有定义数据，创建一个
      if (result.definitions.length === 0) {
        result.definitions.push({
          pos: '翻译',
          meanings: data.translations
        });
      }
    }
    
    return { success: true, data: result };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Ultimate Dictionary API请求失败: ${error.message}`);
    throw error;
  }
}

// 生成Mock词典数据
function generateMockDictionaryData(word) {
  console.log(`生成Mock词典数据: ${word}`);
  
  // 检测是否是英语查询
  const isEnglishQuery = /^[a-zA-Z\s\-',.!?]+$/.test(word.trim());
  
  if (isEnglishQuery) {
    // 英语词 -> 中文
    return {
      word: word,
      phonetic: 'kəˈmɪt',
      definitions: [
        {
          pos: 'v.',
          meanings: ['--']
        },
        {
          pos: 'web.',
          meanings: ['--']
        }
      ],
      examples: [
        
      ]
    };
  } else {
    // 中文词 -> 英语
    return {
      word: word,
      phonetic: '',
      definitions: [
        {
          pos: '--',
          meanings: []
        },
        {
          pos: '--',
          meanings: []
        }
      ],
      examples: [
        '--',
        '--'
      ]
    };
  }
} 