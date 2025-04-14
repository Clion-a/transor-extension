/**
 * Transor - 沉浸式翻译 背景脚本
 * 扩展的背景进程，处理插件生命周期和全局状态
 */

// 默认设置
const defaultSettings = {
  isEnabled: false,
  targetLanguage: 'zh-CN',
  sourceLanguage: 'auto',
  translationEngine: 'google',
  translationStyle: 'inline',
  excludedTags: ['code', 'pre', 'script', 'style'],
  excludedClasses: ['no-translate'],
  excludedUrls: [],
  customCss: ''
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
    chrome.storage.sync.get(null, (result) => {
      sendResponse(result || defaultSettings);
    });
    return true; // 保持消息通道开放以进行异步响应
  } else if (message.action === 'saveSettings') {
    // 保存设置
    chrome.storage.sync.set(message.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  } else if (message.action === 'translateTab') {
    // 发送翻译命令到当前活动标签
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'translate' }, (response) => {
          sendResponse(response);
        });
      } else {
        sendResponse({ success: false, error: '无法获取当前标签页' });
      }
    });
    return true;
  } else if (message.action === "openFavorites") {
    openFavoritesPage();
    sendResponse({ success: true });
  }
});

// 添加浏览器图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 如果用户点击浏览器图标（而不是通过弹出窗口），切换当前页面的翻译状态
  chrome.storage.sync.get(['isEnabled'], (result) => {
    const isEnabled = !result.isEnabled;
    
    chrome.storage.sync.set({ isEnabled }, () => {
      // 通知内容脚本切换翻译状态
      chrome.tabs.sendMessage(tab.id, { 
        action: 'toggleTranslation', 
        isEnabled 
      });
      
      // 更新图标状态
      updateIcon(isEnabled);
    });
  });
});

// 更新扩展图标状态
function updateIcon(isEnabled) {
  const iconPath = isEnabled 
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

// 初始化扩展
init(); 