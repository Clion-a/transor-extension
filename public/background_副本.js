/**
 * Transor - 沉浸式翻译 背景脚本
 * 扩展的背景进程，处理插件生命周期和全局状态
 */

// 为后台脚本声明全局axios变量
/* global axios */

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
  apiModel: ''
};

// 初始化
function init() {
  console.log('Transor 背景脚本已加载');
  
  // 初始化存储
  initializeStorage();
  
  // 注册扩展安装和更新事件
  chrome.runtime.onInstalled.addListener(handleInstalled);

  // 创建右键菜单项
  createContextMenu();
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

// 监听来自弹出窗口和内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    // 获取设置
    getSettings().then(function(settings) {
      sendResponse({ success: true, settings: settings });
    }).catch(function(error) {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  } else if (message.action === 'translateText') {
    // 单条文本翻译
    getSettings().then(function(settings) {
      if (!settings.apiKey || !settings.apiModel) {
        sendResponse({ 
          success: false, 
          error: '缺少API密钥或模型设置' 
        });
        return;
      }
      
      // 调用翻译API
      translateText(message.text, settings.sourceLanguage || 'auto', settings.targetLanguage || 'zh-CN', settings.apiKey, settings.apiModel)
        .then(function(translation) {
          sendResponse({ 
            success: true, 
            translation: translation 
          });
        })
        .catch(function(error) {
          sendResponse({ 
            success: false, 
            error: error.message 
          });
        });
    }).catch(function(error) {
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    });
    return true;
  } else if (message.action === "openFavorites") {
    openFavoritesPage();
    sendResponse({ success: true });
  } else if (message.action === "fetchYouTubeSubtitles") {
    // 获取YouTube字幕
    console.log('接收到YouTube字幕获取请求:', message);
    
    let videoIdOrUrl = message.videoId;
    
    if (!videoIdOrUrl) {
      sendResponse({ success: false, error: '未提供视频ID或URL' });
      return true;
    }
    
    // 支持直接传入完整URL
    if (typeof videoIdOrUrl === 'string' && videoIdOrUrl.startsWith('http')) {
      console.log('检测到URL格式请求');
    } else {
      console.log('使用视频ID:', videoIdOrUrl);
    }
    
    // 调用YouTube字幕获取函数
    fetchYouTubeSubtitles(videoIdOrUrl)
      .then(function(subtitles) {
        console.log('成功获取字幕，数量:', subtitles.length);
        sendResponse({ 
          success: true, 
          subtitles: subtitles 
        });
      })
      .catch(function(error) {
        console.error('获取字幕失败:', error);
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      });
    
    return true;
  } else if (message.action === "translateTexts") {
    // 批量翻译文本（为YouTube影院模式提供支持）
    // 确保文本是数组
    const texts = Array.isArray(message.texts) ? message.texts : [message.texts];
    
    // 获取设置并使用真实翻译API
    getSettings().then(function(settings) {
      if (!settings.apiKey || !settings.apiModel) {
        console.warn('缺少API密钥或模型设置，使用模拟翻译');
        // 使用模拟翻译作为备选
        const translations = generateMockTranslations(texts);
        sendResponse({ 
          success: true, 
          translations: translations 
        });
        return;
      }
      
      console.log('使用真实API翻译字幕，数量:', texts.length);
      
      // 创建翻译Promise数组
      const translationPromises = texts.map(text => 
        translateText(text, settings.sourceLanguage || 'auto', settings.targetLanguage || 'zh-CN', settings.apiKey, settings.apiModel)
          .catch(error => {
            console.error('翻译失败:', error);
            return `[翻译失败] ${text}`; 
          })
      );
      
      // 等待所有翻译完成
      Promise.all(translationPromises)
        .then(translations => {
          console.log('所有翻译完成');
          sendResponse({ 
            success: true, 
            translations: translations 
          });
        })
        .catch(error => {
          console.error('批量翻译过程出错:', error);
          sendResponse({ 
            success: false, 
            error: error.message || '翻译过程出错' 
          });
        });
    }).catch(function(error) {
      console.error('获取设置失败:', error);
      sendResponse({ 
        success: false, 
        error: error.message || '获取设置失败' 
      });
    });
    
    return true;
  }
});

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
async function translateText(text, sourceLanguage, targetLanguage, apiKey, apiModel) {
  console.log(`翻译文本: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
  console.log(`从 ${sourceLanguage} 翻译到 ${targetLanguage}, 使用模型: ${apiModel}`);
  
  if (!text || text.trim() === '') {
    return '';
  }
  
  if (apiModel === 'openai') {
    return translateWithOpenAI(text, sourceLanguage, targetLanguage, apiKey);
  } else if (apiModel === 'google') {
    return translateWithGoogle(text, sourceLanguage, targetLanguage, apiKey);
  } else {
    // 默认使用模拟翻译
    console.warn('未知的API模型，使用模拟翻译');
    return `[翻译] ${text}`;
  }
}

// 使用OpenAI API翻译
async function translateWithOpenAI(text, sourceLanguage, targetLanguage, apiKey) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', 
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `你是一个翻译助手。请将以下${sourceLanguage === 'auto' ? '' : sourceLanguage}文本翻译成${targetLanguage}，只返回翻译结果，不要包含其他内容。`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`OpenAI API错误: ${response.statusText}`);
    }
    
    const data = response.data;
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI翻译失败:', error);
    // 如果是axios错误，尝试提取更多细节
    if (error.response) {
      throw new Error(`OpenAI API错误: ${error.response.data?.error?.message || error.response.statusText}`);
    }
    throw error;
  }
}

// 使用Google API翻译
async function translateWithGoogle(text, sourceLanguage, targetLanguage, apiKey) {
  try {
    // 使用axios调用Google Translate API
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    
    const response = await axios.post(url, 
      {
        q: text,
        source: sourceLanguage === 'auto' ? '' : sourceLanguage,
        target: targetLanguage,
        format: 'text'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`Google API错误: ${response.statusText}`);
    }
    
    const data = response.data;
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Google翻译失败:', error);
    // 如果是axios错误，尝试提取更多细节
    if (error.response) {
      throw new Error(`Google API错误: ${error.response.data?.error?.message || error.response.statusText}`);
    }
    throw error;
  }
}

// 初始化扩展
init(); 