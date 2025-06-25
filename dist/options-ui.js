// options-ui.js - Transor设置页面UI交互

/**
 * 切换API密钥的可见性
 * @param {HTMLElement} button - 被点击的按钮元素
 * @param {HTMLInputElement} input - 输入框元素
 */
function toggleApiKeyVisibility(button, input) {
  const icon = button.querySelector('i');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

/**
 * 处理图片加载错误，显示备用图片
 * @param {HTMLImageElement} img - 图片元素
 */
function handleImageError(img) {
  if (img && img.dataset && img.dataset.fallback) {
    img.src = img.dataset.fallback;
  }
}

/**
 * 打开浏览器的快捷键设置页面
 */
function openShortcutSettings() {
  // 检查是否在Chrome扩展环境中
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    // 打开Chrome扩展管理页面的快捷键设置
    chrome.tabs.create({
      url: 'chrome://extensions/shortcuts'
    });
  } else {
    // 如果不在扩展环境中，提供备用方案
    const userAgent = navigator.userAgent.toLowerCase();
    let url = '';
    
    if (userAgent.includes('chrome')) {
      url = 'chrome://extensions/shortcuts';
    } else if (userAgent.includes('firefox')) {
      url = 'about:addons';
    } else if (userAgent.includes('edge')) {
      url = 'edge://extensions/shortcuts';
    } else {
      // 通用备用方案
      url = 'chrome://extensions/shortcuts';
    }
    
    // 尝试在新标签页中打开
    try {
      window.open(url, '_blank');
    } catch (error) {
      // 如果无法打开，显示提示信息
      const currentLang = localStorage.getItem('transor-ui-language') || 'zh-CN';
      const messages = {
        'zh-CN': '请手动在地址栏输入：chrome://extensions/shortcuts',
        'en': 'Please manually enter in the address bar: chrome://extensions/shortcuts',
        'ja': 'アドレスバーに手動で入力してください：chrome://extensions/shortcuts',
        'ko': '주소 표시줄에 수동으로 입력하세요: chrome://extensions/shortcuts'
      };
      alert(messages[currentLang] || messages['zh-CN']);
    }
  }
}

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
  // 设置主题色为 #ff5588
  const root = document.documentElement;
  root.style.setProperty('--accent-color', '#ff5588');
  
  // 更新相关的颜色
  root.style.setProperty('--accent-light', '#ff80a0');
  root.style.setProperty('--accent-dark', '#e63d72');
  
  // 获取所有API密钥切换按钮
  const apiKeyToggle = document.getElementById('toggle-api-key');
  const microsoftKeyToggle = document.getElementById('toggle-microsoft-key');
  const openaiKeyToggle = document.getElementById('toggle-openai-key');
  const deepseekKeyToggle = document.getElementById('toggle-deepseek-key');
  
  // 为各个按钮添加点击事件监听器
  if (apiKeyToggle) {
    apiKeyToggle.addEventListener('click', function() {
      const input = document.getElementById('api-key-input');
      toggleApiKeyVisibility(this, input);
    });
  }
  
  if (microsoftKeyToggle) {
    microsoftKeyToggle.addEventListener('click', function() {
      const input = document.getElementById('microsoft-api-key');
      toggleApiKeyVisibility(this, input);
    });
  }
  
  if (openaiKeyToggle) {
    openaiKeyToggle.addEventListener('click', function() {
      const input = document.getElementById('openai-api-key');
      toggleApiKeyVisibility(this, input);
    });
  }
  
  if (deepseekKeyToggle) {
    deepseekKeyToggle.addEventListener('click', function() {
      const input = document.getElementById('deepseek-api-key');
      toggleApiKeyVisibility(this, input);
    });
  }

  // 处理DeepSeek图标加载错误
  const deepseekIcon = document.getElementById('deepseek-icon');
  if (deepseekIcon) {
    deepseekIcon.addEventListener('error', function() {
      handleImageError(this);
    });
  }

  // 处理快捷键设置链接点击事件
  const shortcutSettingsLink = document.getElementById('shortcut-settings-link');
  if (shortcutSettingsLink) {
    shortcutSettingsLink.addEventListener('click', function(e) {
      e.preventDefault();
      openShortcutSettings();
    });
  }
}); 