// options.js - 管理 Transor 设置页面

// 全局变量，使用另一个名称以避免与i18n.js中的冲突
let userInterfaceLanguage = 'zh-CN';

// 获取默认配置
function getDefaultConfig() {
  if (window.i18n && window.i18n.defaultConfig) {
    return window.i18n.defaultConfig;
  }
  return {
    uiLanguage: 'zh-CN',
    targetLanguage: 'zh-CN',
    translationEngine: 'microsoft',
    translationStyle: 'universal_style'
  };
}

// i18n函数定义，如果i18n.js中已定义则使用，否则使用此备用函数
function getI18n(key, lang) {
  // 如果window.i18n存在，使用它
  if (typeof window.i18n === 'object' && typeof window.i18n.t === 'function') {
    return window.i18n.t(key, lang);
  }
  
  // 否则使用简单的备用方案
  const fallbackMap = {
    'zh-CN': {
      'settingsSaved': '设置已保存',
      'apiKeySaved': 'API Key 已保存',
      'uiLanguageUpdated': '界面语言已更新',
      'confirmRestore': '确定要清除所有设置并恢复默认值吗？'
    },
    'en': {
      'settingsSaved': 'Settings Saved',
      'apiKeySaved': 'API Key saved',
      'uiLanguageUpdated': 'UI Language Updated',
      'confirmRestore': 'Are you sure you want to clear all settings and restore defaults?'
    },
    'ja': {
      'settingsSaved': '設定が保存されました',
      'apiKeySaved': 'API キーが保存されました',
      'uiLanguageUpdated': 'UI言語が更新されました',
      'confirmRestore': 'デフォルト設定に戻しますか？すべてのカスタマイズがクリアされます。'
    },
    'ko': {
      'settingsSaved': '설정이 저장되었습니다',
      'apiKeySaved': 'API 키가 저장되었습니다',
      'uiLanguageUpdated': 'UI 언어가 업데이트되었습니다',
      'confirmRestore': '기본 설정으로 복원하시겠습니까? 모든 사용자 정의 설정이 지워집니다.'
    }
  };
  
  try {
    return fallbackMap[lang || 'zh-CN'][key] || key;
  } catch (e) {
    return key;
  }
}

// 保存修改到 chrome.storage.sync
function saveSettings(config = {}) {
  // 获取基本设置
  const uiLanguage = document.getElementById('ui-language').value;
  const targetLanguage = document.getElementById('target-language').value;
  const translationEngine = document.getElementById('translation-engine').value;
  const translationStyle = document.getElementById('translation-style').value;
  const apiKey = document.getElementById('api-key-input').value;
  
  // 获取显示样式设置
  const fontColor = document.getElementById('font-color').value;

  // 获取OpenAI配置
  const openaiModel = document.getElementById('openai-model').value;
  const openaiCustomModelEnabled = document.getElementById('openai-custom-model-enabled').checked;
  const openaiCustomModel = document.getElementById('openai-custom-model').value;
  const openaiMaxRequests = parseInt(document.getElementById('openai-max-requests').value) || 10;
  const openaiAiContext = document.getElementById('openai-ai-context').checked;
  const openaiExpertStrategy = document.getElementById('openai-expert-strategy').value;
  const openaiApiKey = document.getElementById('openai-api-key').value;
  const openaiApiEndpoint = document.getElementById('openai-api-endpoint').value;

  // 获取DeepSeek配置
  const deepseekModel = document.getElementById('deepseek-model').value;
  const deepseekCustomModelEnabled = document.getElementById('deepseek-custom-model-enabled').checked;
  const deepseekCustomModel = document.getElementById('deepseek-custom-model').value;
  const deepseekMaxRequests = parseInt(document.getElementById('deepseek-max-requests').value) || 10;
  const deepseekAiContext = document.getElementById('deepseek-ai-context').checked;
  const deepseekExpertStrategy = document.getElementById('deepseek-expert-strategy').value;
  const deepseekApiKey = document.getElementById('deepseek-api-key').value;
  const deepseekApiEndpoint = document.getElementById('deepseek-api-endpoint').value;

  // 先获取现有的API Keys，然后再构建saveData
  chrome.storage.sync.get(['apiKeys'], (res) => {
    // 获取现有的API Keys
    const existingApiKeys = res.apiKeys || {};
    
    // 更新当前引擎的API Key（如果API Key输入框可见）
    if (document.getElementById('api-key-container').style.display !== 'none') {
      existingApiKeys[translationEngine] = apiKey;
    }
    
    // 更新单独的API密钥
    if (openaiApiKey) {
      existingApiKeys.openai = openaiApiKey;
    }
    
    if (deepseekApiKey) {
      existingApiKeys.deepseek = deepseekApiKey;
    }
    
    // 准备保存数据
    const saveData = {
      'transor-ui-language': uiLanguage,
      targetLanguage: targetLanguage,
      translationEngine: translationEngine,
      translationStyle: translationStyle,
      fontColor: fontColor,
      openaiConfig: {
        model: openaiModel,
        customModelEnabled: openaiCustomModelEnabled,
        customModel: openaiCustomModel,
        maxRequests: openaiMaxRequests,
        aiContext: openaiAiContext,
        expertStrategy: openaiExpertStrategy,
        apiEndpoint: openaiApiEndpoint
      },
      deepseekConfig: {
        model: deepseekModel,
        customModelEnabled: deepseekCustomModelEnabled,
        customModel: deepseekCustomModel,
        maxRequests: deepseekMaxRequests,
        aiContext: deepseekAiContext,
        expertStrategy: deepseekExpertStrategy,
        apiEndpoint: deepseekApiEndpoint
      },
      apiKeys: existingApiKeys
    };

    // 合并可能从函数参数传入的配置
    const finalConfig = Object.assign({}, saveData, config);
    
    // 确保apiKeys被正确合并
    if (config.apiKeys) {
      finalConfig.apiKeys = Object.assign({}, existingApiKeys, config.apiKeys);
    }

    console.log('保存设置:', finalConfig);

    // 保存设置到Chrome存储
    chrome.storage.sync.set(finalConfig, function() {
      showSaveNotification(getI18n('settingsSaved', userInterfaceLanguage));
    });

    // 将界面语言保存到localStorage
    localStorage.setItem('transor-ui-language', uiLanguage);
  });
}

// 保存 UI 语言到 chrome.storage.local（与后台脚本保持一致）
function saveUiLanguage(value) {
  // 保存到本地存储，确保跨页面共享
  localStorage.setItem('transor-ui-language', value);
  
  chrome.storage.local.set({ 'transor-ui-language': value }, () => {
    if (chrome.runtime.lastError) {
      console.error('保存界面语言失败:', chrome.runtime.lastError.message);
    } else {
      console.log('已保存界面语言:', value);
      showSaveNotification(getI18n('uiLanguageUpdated', userInterfaceLanguage));
      
      // 立即更新语言设置
      userInterfaceLanguage = value;
      
      // 尝试通过background脚本设置
      try {
        console.log(`通过background设置界面语言: ${value}`);
        chrome.runtime.sendMessage({ 
          action: 'set-language', 
          language: value 
        }, response => {
          if (chrome.runtime.lastError) {
            console.warn('通过background设置语言失败:', chrome.runtime.lastError);
          } else if (response && response.success) {
            console.log('通过background成功设置语言');
          }
        });
      } catch (e) {
        console.error('发送语言设置消息异常:', e.message);
      }
      
      // 重新加载i18n资源
      if (window.i18n && typeof window.i18n.setLanguage === 'function') {
        window.i18n.setLanguage(value);
      }
      
      // 刷新页面上所有文本
      updateI18n();
      
      // 如果需要，也可以触发自定义事件通知其他组件
      const event = new CustomEvent('language-changed', { detail: { language: value } });
      document.dispatchEvent(event);
    }
  });
}

// 显示保存成功的通知
function showSaveNotification(message) {
  // 检查是否已存在通知元素
  let notification = document.querySelector('.save-notification');
  
  if (!notification) {
    // 创建通知元素
    notification = document.createElement('div');
    notification.className = 'save-notification';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = 'var(--accent-color)';
    notification.style.color = 'white';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.style.zIndex = '1000';
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    document.body.appendChild(notification);
  }
  
  // 设置通知内容
  notification.textContent = message;
  
  // 显示通知
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // 3秒后隐藏通知
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // 完全隐藏后移除元素
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// 根据当前翻译引擎显示/隐藏 API Key 输入框和AI配置模块
function updateApiKeyVisibility(engine) {
  const container = document.getElementById('api-key-container');
  const label = document.getElementById('api-key-label');
  const openaiConfig = document.getElementById('openai-config');
  const deepseekConfig = document.getElementById('deepseek-config');
  
  // 首先隐藏所有配置
  if (container) container.style.display = 'none';
  if (openaiConfig) openaiConfig.style.display = 'none';
  if (deepseekConfig) deepseekConfig.style.display = 'none';
  
  if (['openai', 'deepseek'].includes(engine)) {
    // 显示API Key输入框
    if (container) {
      container.style.display = 'block';
      if (label) label.textContent = `${engine} API Key`;
    }
    
    // 显示对应的AI配置模块
    if (engine === 'openai' && openaiConfig) {
      openaiConfig.style.display = 'block';
    } else if (engine === 'deepseek' && deepseekConfig) {
      deepseekConfig.style.display = 'block';
    }
  }
}

// 切换自定义模型输入框的显示/隐藏
function toggleCustomModelInput(prefix) {
  const checkbox = document.getElementById(`${prefix}-custom-model-enabled`);
  const inputGroup = document.getElementById(`${prefix}-custom-model-group`);
  
  if (checkbox && inputGroup) {
    inputGroup.style.display = checkbox.checked ? 'block' : 'none';
  }
}

// 切换内容区域
function switchContentSection(sectionId) {
  // 隐藏所有内容区域
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // 移除所有导航项的活动状态
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // 显示选定的内容区域
  const targetSection = document.getElementById(`${sectionId}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  // 激活对应的导航项
  const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (navItem) {
    navItem.classList.add('active');
  }
}

// 更新页面所有的 i18n 文本
function updateI18n() {
  console.log('正在更新页面文本，当前语言:', userInterfaceLanguage);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (window.i18n && typeof window.i18n.t === 'function') {
      const translatedText = window.i18n.t(key, userInterfaceLanguage);
      console.log(`翻译 "${key}" -> "${translatedText}"`);
      el.textContent = translatedText;
    } else {
      // 如果i18n.js尚未加载，保留原有文本
      console.warn('i18n对象未正确加载，无法翻译:', key);
    }
  });
}

// 动态生成翻译服务列表
function generateTranslationServicesList() {
  const container = document.getElementById('api-services-container');
  if (!container) return;
  
  // 清空容器
  container.innerHTML = '';
  
  // 获取配置的翻译服务
  const config = window.transorConfig || getDefaultConfig();
  
  // 定义服务图标映射
  const serviceIcons = {
    microsoftapi: 'https://www.microsoft.com/favicon.ico',
    microsoft: 'https://www.microsoft.com/favicon.ico',
    google: 'https://www.google.com/favicon.ico',
    openai: 'https://openai.com/favicon.ico',
    deepseek: 'https://www.deepseek.com/favicon.ico'
  };
  
  // 定义翻译服务配置
  const services = [
    {
      id: 'microsoftapi',
      name: 'Microsoft Translator API',
      icon: serviceIcons.microsoftapi,
      needsKey: false,
      infoKey: 'microsoftApiInfo'
    },
    {
      id: 'microsoft',
      name: 'Microsoft Edge',
      icon: serviceIcons.microsoft,
      needsKey: false,
      infoKey: 'microsoftApiInfo'
    },
    {
      id: 'google',
      name: 'Google Translate',
      icon: serviceIcons.google,
      needsKey: false
    },
    {
      id: 'openai',
      name: 'OpenAI API',
      icon: serviceIcons.openai,
      needsKey: true,
      inputId: 'openai-api-key',
      toggleId: 'toggle-openai-key'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek API',
      icon: serviceIcons.deepseek,
      needsKey: true,
      inputId: 'deepseek-api-key',
      toggleId: 'toggle-deepseek-key',
      iconFallback: 'https://placehold.co/20x20?text=DS'
    }
  ];
  
  // 从配置中获取当前引擎
  const currentEngine = config.translationEngine || 'microsoft';
  
  // 生成服务列表HTML
  services.forEach(service => {
    const serviceElement = document.createElement('div');
    serviceElement.className = 'form-group';
    serviceElement.classList.add('translation-service-item');
    
    // 如果是当前使用的服务，添加活跃类
    if (service.id === currentEngine) {
      serviceElement.classList.add('active-service');
    }
    
    // 创建服务标题
    const titleDiv = document.createElement('div');
    titleDiv.className = 'api-service-title';
    
    // 添加图标
    const icon = document.createElement('img');
    icon.src = service.icon;
    icon.alt = service.name;
    if (service.iconFallback) {
      icon.id = `${service.id}-icon`;
      icon.setAttribute('data-fallback', service.iconFallback);
      // 添加图片加载失败处理
      icon.onerror = function() {
        this.src = this.getAttribute('data-fallback');
      };
    }
    titleDiv.appendChild(icon);
    
    // 添加标签
    const label = document.createElement('label');
    if (service.inputId) {
      label.setAttribute('for', service.inputId);
    }
    label.textContent = service.name;
    titleDiv.appendChild(label);
    
    serviceElement.appendChild(titleDiv);
    
    // 添加API Key输入框或信息文本
    if (service.needsKey) {
      const keyWrapper = document.createElement('div');
      keyWrapper.className = 'api-key-wrapper';
      
      const input = document.createElement('input');
      input.type = 'password';
      input.id = service.inputId;
      input.placeholder = `${service.name} Key`;
      keyWrapper.appendChild(input);
      
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'api-key-toggle';
      toggleBtn.id = service.toggleId;
      toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
      keyWrapper.appendChild(toggleBtn);
      
      serviceElement.appendChild(keyWrapper);
    } else if (service.infoKey) {
      const infoText = document.createElement('p');
      infoText.style.fontSize = '12px';
      infoText.style.color = 'var(--text-color)';
      infoText.style.opacity = '0.8';
      infoText.style.marginTop = '5px';
      infoText.setAttribute('data-i18n', service.infoKey);
      infoText.textContent = getI18n(service.infoKey, userInterfaceLanguage);
      serviceElement.appendChild(infoText);
    }
    
    container.appendChild(serviceElement);
  });
  
  // 为新生成的切换按钮添加事件处理
  setupPasswordToggleButtons();
}

// 设置密码显示/隐藏切换按钮的事件处理
function setupPasswordToggleButtons() {
  const toggleButtons = document.querySelectorAll('.api-key-toggle');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const inputId = this.id.replace('toggle-', '');
      const input = document.getElementById(inputId);
      
      if (input.type === 'password') {
        input.type = 'text';
        this.innerHTML = '<i class="fas fa-eye-slash"></i>';
      } else {
        input.type = 'password';
        this.innerHTML = '<i class="fas fa-eye"></i>';
      }
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const uiLangSel = document.getElementById('ui-language');
  const targetLangSel = document.getElementById('target-language');
  const engineSel = document.getElementById('translation-engine');
  const engine2Sel = document.getElementById('translation-engine-2');
  const apiKeyInput = document.getElementById('api-key-input');
  const apiKeyLabel = document.getElementById('api-key-label');
  const toggleApiKeyBtn = document.getElementById('toggle-api-key');
  const styleSel = document.getElementById('translation-style');
  const enableTranslationChk = document.getElementById('enable-translation');
  const enableHighlightChk = document.getElementById('enable-highlight');
  const enableYouTubeCinemaChk = document.getElementById('enable-youtube-cinema');
  const saveSettingsBtn = document.getElementById('save-settings');
  const restoreDefaultsBtn = document.getElementById('restore-defaults');
  const fontColorPicker = document.getElementById('font-color-picker');
  const fontColorInput = document.getElementById('font-color');
  
  // OpenAI配置元素
  const openaiConfig = document.getElementById('openai-config');
  const openaiModel = document.getElementById('openai-model');
  const openaiCustomModelEnabled = document.getElementById('openai-custom-model-enabled');
  const openaiCustomModel = document.getElementById('openai-custom-model');
  const openaiCustomModelGroup = document.getElementById('openai-custom-model-group');
  const openaiMaxRequests = document.getElementById('openai-max-requests');
  const openaiAiContext = document.getElementById('openai-ai-context');
  const openaiExpertStrategy = document.getElementById('openai-expert-strategy');
  const openaiApiKey = document.getElementById('openai-api-key');
  const openaiApiEndpoint = document.getElementById('openai-api-endpoint');
  
  // DeepSeek配置元素
  const deepseekConfig = document.getElementById('deepseek-config');
  const deepseekModel = document.getElementById('deepseek-model');
  const deepseekCustomModelEnabled = document.getElementById('deepseek-custom-model-enabled');
  const deepseekCustomModel = document.getElementById('deepseek-custom-model');
  const deepseekCustomModelGroup = document.getElementById('deepseek-custom-model-group');
  const deepseekMaxRequests = document.getElementById('deepseek-max-requests');
  const deepseekAiContext = document.getElementById('deepseek-ai-context');
  const deepseekExpertStrategy = document.getElementById('deepseek-expert-strategy');
  const deepseekApiKey = document.getElementById('deepseek-api-key');
  const deepseekApiEndpoint = document.getElementById('deepseek-api-endpoint');
  
  // 动态生成翻译服务列表
  generateTranslationServicesList();
  
  // 首先加载UI语言
  chrome.storage.local.get('transor-ui-language', (res) => {
    const defaultConfig = getDefaultConfig();
    userInterfaceLanguage = res['transor-ui-language'] || defaultConfig.uiLanguage;
    uiLangSel.value = userInterfaceLanguage;
    
    // 更新界面文本
    // 确保i18n.js已加载
    if (typeof window.i18n === 'object' && typeof window.i18n.t === 'function') {
      updateI18n();
    } else {
      // 等待i18n.js加载完成
      window.addEventListener('i18n-loaded', updateI18n);
      // 或者使用超时作为备用
      setTimeout(updateI18n, 500);
    }
  });

  // 监听语言变更事件
  window.addEventListener('language-changed', (event) => {
    console.log('语言变更事件被触发:', event.detail);
    if (event.detail && event.detail.language) {
      userInterfaceLanguage = event.detail.language;
      uiLangSel.value = userInterfaceLanguage;
      updateI18n();
    }
  });

  // 添加左侧导航事件
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.getAttribute('data-section');
      if (section) {
        switchContentSection(section);
      }
    });
  });

  // 字体颜色输入和选择器相关事件
  if (fontColorInput && fontColorPicker) {
    // 当颜色选择器变化时，更新输入框
    fontColorPicker.addEventListener('input', () => {
      fontColorInput.value = fontColorPicker.value;
    });
    
    // 当颜色选择器变化完成时，保存设置
    fontColorPicker.addEventListener('change', () => {
      fontColorInput.value = fontColorPicker.value;
      saveSettings({ fontColor: fontColorPicker.value });
    });
    
    // 当输入框变化时，更新颜色选择器并保存设置
    fontColorInput.addEventListener('input', () => {
      // 验证是否为有效的颜色格式
      if (/^#[0-9A-F]{6}$/i.test(fontColorInput.value)) {
        fontColorPicker.value = fontColorInput.value;
      }
    });
    
    // 当输入框失去焦点时，保存设置
    fontColorInput.addEventListener('blur', () => {
      // 验证是否为有效的颜色格式
      if (/^#[0-9A-F]{6}$/i.test(fontColorInput.value)) {
        saveSettings({ fontColor: fontColorInput.value });
      } else {
        // 恢复为颜色选择器的值
        fontColorInput.value = fontColorPicker.value;
      }
    });
  }

  // 加载存储中的数据
  chrome.storage.sync.get(null, (settings) => {
    const defaultConfig = getDefaultConfig();
    // 基本设置
    targetLangSel.value = settings.targetLanguage || defaultConfig.targetLanguage;
    engineSel.value = settings.translationEngine || defaultConfig.translationEngine;
    
    // 同步两个页面的翻译引擎选择器
    if (engine2Sel) {
      engine2Sel.value = settings.translationEngine || defaultConfig.translationEngine;
    }
    
    styleSel.value = settings.translationStyle || defaultConfig.translationStyle;
    
    // 显示样式设置
    if (fontColorInput && fontColorPicker) {
      const savedColor = settings.fontColor || '#ff5588';
      fontColorInput.value = savedColor;
      fontColorPicker.value = savedColor;
    }
    
    enableTranslationChk.checked = settings.isEnabled !== false;
    enableHighlightChk.checked = settings.highlightFavoritesEnabled !== false;
    enableYouTubeCinemaChk.checked = settings.youtubeCinemaEnabled !== false;

    // API key
    if (settings.apiKeys) {
      apiKeyInput.value = settings.apiKeys[engineSel.value] || '';
      
      // 同步单独的API密钥输入框
      if (openaiApiKey) {
        openaiApiKey.value = settings.apiKeys.openai || '';
      }
      if (deepseekApiKey) {
        deepseekApiKey.value = settings.apiKeys.deepseek || '';
      }
    }

    // 初始化UI显示状态
    updateApiKeyVisibility(engineSel.value);
    
    // 加载AI配置
    if (settings.openaiConfig) {
      const openaiConfig = settings.openaiConfig;
      const openaiModelSelect = document.getElementById('openai-model');
      const openaiCustomModelEnabledChk = document.getElementById('openai-custom-model-enabled');
      const openaiCustomModelInput = document.getElementById('openai-custom-model');
      const openaiMaxRequestsInput = document.getElementById('openai-max-requests');
      const openaiAiContextChk = document.getElementById('openai-ai-context');
      const openaiExpertStrategySelect = document.getElementById('openai-expert-strategy');
      
      if (openaiModelSelect) openaiModelSelect.value = openaiConfig.model || 'gpt-4.1-mini';
      if (openaiCustomModelEnabledChk) openaiCustomModelEnabledChk.checked = openaiConfig.customModelEnabled || false;
      if (openaiCustomModelInput) {
        // 尝试从localStorage读取上次保存的自定义模型名称
        openaiCustomModelInput.value = openaiConfig.customModel || localStorage.getItem('openai-custom-model') || '';
      }
      if (openaiMaxRequestsInput) openaiMaxRequestsInput.value = openaiConfig.maxRequests || 10;
      if (openaiAiContextChk) openaiAiContextChk.checked = openaiConfig.aiContext || false;
      if (openaiExpertStrategySelect) openaiExpertStrategySelect.value = openaiConfig.expertStrategy || 'translation-master';
      
      // 更新自定义模型输入框显示
      if (openaiCustomModelEnabledChk) {
        toggleCustomModelInput('openai');
      }
    } 
    // 兼容老版本，如果没有openaiConfig但有openaiModel
    else if (settings.openaiModel) {
      const openaiModelSelect = document.getElementById('openai-model');
      if (openaiModelSelect) {
        // 尝试在预设模型中查找
        const modelExists = Array.from(openaiModelSelect.options).some(option => option.value === settings.openaiModel);
        if (modelExists) {
          openaiModelSelect.value = settings.openaiModel;
        } else if (settings.openaiModel && settings.openaiModel !== 'gpt-3.5-turbo' && 
                  settings.openaiModel !== 'gpt-4' && settings.openaiModel !== 'gpt-4-turbo') {
          // 如果是自定义模型
          const openaiCustomModelEnabledChk = document.getElementById('openai-custom-model-enabled');
          const openaiCustomModelInput = document.getElementById('openai-custom-model');
          
          if (openaiCustomModelEnabledChk) openaiCustomModelEnabledChk.checked = true;
          if (openaiCustomModelInput) openaiCustomModelInput.value = settings.openaiModel;
          toggleCustomModelInput('openai');
        }
      }
    }
    
    if (settings.deepseekConfig) {
      const deepseekConfig = settings.deepseekConfig;
      const deepseekModelSelect = document.getElementById('deepseek-model');
      const deepseekCustomModelEnabledChk = document.getElementById('deepseek-custom-model-enabled');
      const deepseekCustomModelInput = document.getElementById('deepseek-custom-model');
      const deepseekMaxRequestsInput = document.getElementById('deepseek-max-requests');
      const deepseekAiContextChk = document.getElementById('deepseek-ai-context');
      const deepseekExpertStrategySelect = document.getElementById('deepseek-expert-strategy');
      
      if (deepseekModelSelect) {
        // 确保模型值有效
        const modelValue = deepseekConfig.model || 'deepseek-chat';
        if (modelValue === 'deepseek-coder') {
          deepseekModelSelect.value = 'deepseek-reasoner';
        } else {
          deepseekModelSelect.value = modelValue;
        }
      }
      if (deepseekCustomModelEnabledChk) deepseekCustomModelEnabledChk.checked = deepseekConfig.customModelEnabled || false;
      if (deepseekCustomModelInput) deepseekCustomModelInput.value = deepseekConfig.customModel || '';
      if (deepseekMaxRequestsInput) deepseekMaxRequestsInput.value = deepseekConfig.maxRequests || 10;
      if (deepseekAiContextChk) deepseekAiContextChk.checked = deepseekConfig.aiContext || false;
      if (deepseekExpertStrategySelect) deepseekExpertStrategySelect.value = deepseekConfig.expertStrategy || 'translation-master';
      
      // 更新自定义模型输入框显示
      if (deepseekCustomModelEnabledChk) {
        toggleCustomModelInput('deepseek');
      }
    }
  });

  // 保存按钮事件
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      // 收集所有设置
      const settings = {
        targetLanguage: targetLangSel.value,
        translationEngine: engineSel.value,
        translationStyle: styleSel.value,
        isEnabled: enableTranslationChk.checked,
        highlightFavoritesEnabled: enableHighlightChk.checked,
        youtubeCinemaEnabled: enableYouTubeCinemaChk.checked
      };
      
      // 保存设置
      saveSettings(settings);
    });
  }

  // 恢复默认设置
  if (restoreDefaultsBtn) {
    restoreDefaultsBtn.addEventListener('click', () => {
      if (confirm(getI18n('confirmRestore', userInterfaceLanguage))) {
        chrome.storage.sync.clear(() => {
          location.reload();
        });
      }
    });
  }

  // 事件监听保存 - 界面语言
  uiLangSel.addEventListener('change', () => {
    saveUiLanguage(uiLangSel.value);
  });

  // 事件监听保存 - 目标语言
  targetLangSel.addEventListener('change', () => {
    saveSettings({ targetLanguage: targetLangSel.value });
  });

  // 事件监听保存 - 翻译引擎
  engineSel.addEventListener('change', () => {
    // 保存当前选择的引擎，用于记录上一次选择
    if (engineSel.value === 'openai') {
      localStorage.setItem('last-openai-model', document.getElementById('openai-model')?.value || 'gpt-4.1-mini');
    }
    
    // 立即更新API Key和配置模块的显示
    updateApiKeyVisibility(engineSel.value);
    
    // 同步两个页面的翻译引擎选择器
    if (engine2Sel) {
      engine2Sel.value = engineSel.value;
    }

    // 获取现有的API Keys，确保在切换引擎时不会丢失之前保存的密钥
    chrome.storage.sync.get(['apiKeys', 'translationEngine'], (res) => {
      const apiKeys = res.apiKeys || {};
      const oldEngine = res.translationEngine;
      const newEngine = engineSel.value;
      
      // 如果有对应的API Key，显示在输入框中
      apiKeyInput.value = apiKeys[newEngine] || '';
      
      // 保存新的翻译引擎设置，但保留所有API Keys
      saveSettings({ 
        translationEngine: newEngine,
        apiKeys: apiKeys
      });
      
      console.log(`已切换翻译引擎从 ${oldEngine} 到 ${newEngine}，保留所有API Keys`);
    });
  });

  // 翻译服务页面中的引擎选择器联动
  if (engine2Sel) {
    engine2Sel.addEventListener('change', () => {
      // 更新配置模块显示
      updateApiKeyVisibility(engine2Sel.value);
      
      if (engineSel) {
        engineSel.value = engine2Sel.value;
      }
      
      // 获取现有的API Keys，确保在切换引擎时不会丢失之前保存的密钥
      chrome.storage.sync.get(['apiKeys', 'translationEngine'], (res) => {
        const apiKeys = res.apiKeys || {};
        const oldEngine = res.translationEngine;
        const newEngine = engine2Sel.value;
        
        // 如果有对应的API Key，显示在输入框中
        apiKeyInput.value = apiKeys[newEngine] || '';
        
        // 保存新的翻译引擎设置，但保留所有API Keys
        saveSettings({ 
          translationEngine: newEngine,
          apiKeys: apiKeys
        });
        
        console.log(`已切换翻译引擎从 ${oldEngine} 到 ${newEngine}，保留所有API Keys`);
      });
    });
  }

  // 事件监听保存 - 翻译样式
  styleSel.addEventListener('change', () => {
    saveSettings({ translationStyle: styleSel.value });
  });

  // 事件监听保存 - 功能开关
  enableTranslationChk.addEventListener('change', () => {
    saveSettings({ isEnabled: enableTranslationChk.checked });
  });

  enableHighlightChk.addEventListener('change', () => {
    saveSettings({ highlightFavoritesEnabled: enableHighlightChk.checked });
  });

  enableYouTubeCinemaChk.addEventListener('change', () => {
    saveSettings({ youtubeCinemaEnabled: enableYouTubeCinemaChk.checked });
  });

  // 事件监听保存 - API密钥
  apiKeyInput.addEventListener('change', () => {
    const type = engineSel.value;
    chrome.storage.sync.get(['apiKeys'], (res) => {
      const apiKeys = res.apiKeys || {};
      apiKeys[type] = apiKeyInput.value;
      
      // 只传入apiKeys，避免覆盖其他设置
      chrome.storage.sync.set({ apiKeys }, function() {
        showSaveNotification(getI18n('apiKeySaved', userInterfaceLanguage));
        console.log(`已保存${type} API Key`);
      });
    });
  });

  // 单独的API密钥输入框事件
  if (openaiApiKey) {
    openaiApiKey.addEventListener('change', () => {
      chrome.storage.sync.get(['apiKeys'], (res) => {
        const apiKeys = res.apiKeys || {};
        apiKeys.openai = openaiApiKey.value;
        
        // 只传入apiKeys，避免覆盖其他设置
        chrome.storage.sync.set({ apiKeys }, function() {
          showSaveNotification(getI18n('apiKeySaved', userInterfaceLanguage));
          console.log('已保存OpenAI API Key');
        });
      });
    });
  }

  if (deepseekApiKey) {
    deepseekApiKey.addEventListener('change', () => {
      chrome.storage.sync.get(['apiKeys'], (res) => {
        const apiKeys = res.apiKeys || {};
        apiKeys.deepseek = deepseekApiKey.value;
        
        // 只传入apiKeys，避免覆盖其他设置
        chrome.storage.sync.set({ apiKeys }, function() {
          showSaveNotification(getI18n('apiKeySaved', userInterfaceLanguage));
          console.log('已保存DeepSeek API Key');
        });
      });
    });
  }

  // AI配置相关事件监听器
  
  // OpenAI配置
  const openaiModelSelect = document.getElementById('openai-model');
  const openaiCustomModelEnabledChk = document.getElementById('openai-custom-model-enabled');
  const openaiCustomModelInput = document.getElementById('openai-custom-model');
  const openaiMaxRequestsInput = document.getElementById('openai-max-requests');
  const openaiAiContextChk = document.getElementById('openai-ai-context');
  const openaiExpertStrategySelect = document.getElementById('openai-expert-strategy');
  
  if (openaiCustomModelEnabledChk) {
    openaiCustomModelEnabledChk.addEventListener('change', () => {
      toggleCustomModelInput('openai');
      
      // 如果取消自定义模型，且当前选择为"more-models"，则恢复上次选择的模型
      if (!openaiCustomModelEnabledChk.checked) {
        const openaiModelSelect = document.getElementById('openai-model');
        if (openaiModelSelect && openaiModelSelect.value === 'more-models') {
          // 恢复上次选择的模型，如果没有则默认为gpt-4.1-mini
          const lastModel = localStorage.getItem('last-openai-model') || 'gpt-4.1-mini';
          openaiModelSelect.value = lastModel;
        }
      }
      
      saveAiConfig('openai');
    });
  }
  
  if (openaiModelSelect) {
    openaiModelSelect.addEventListener('change', () => {
      // 如果选择"设置更多模型"，自动开启自定义模型输入
      if (openaiModelSelect.value === 'more-models') {
        const customModelEnabledChk = document.getElementById('openai-custom-model-enabled');
        const customModelInput = document.getElementById('openai-custom-model');
        
        if (customModelEnabledChk && !customModelEnabledChk.checked) {
          customModelEnabledChk.checked = true;
          toggleCustomModelInput('openai');
          
          // 聚焦到自定义模型输入框
          if (customModelInput) {
            setTimeout(() => customModelInput.focus(), 100);
          }
        }
      }
      
      saveAiConfig('openai');
    });
  }
  
  if (openaiCustomModelInput) {
    openaiCustomModelInput.addEventListener('change', () => {
      // 保存自定义模型名称
      if (openaiCustomModelInput.value) {
        localStorage.setItem('openai-custom-model', openaiCustomModelInput.value);
      }
      
      saveAiConfig('openai');
    });
  }
  
  if (openaiMaxRequestsInput) {
    openaiMaxRequestsInput.addEventListener('change', () => saveAiConfig('openai'));
  }
  
  if (openaiAiContextChk) {
    openaiAiContextChk.addEventListener('change', () => saveAiConfig('openai'));
  }
  
  if (openaiExpertStrategySelect) {
    openaiExpertStrategySelect.addEventListener('change', () => saveAiConfig('openai'));
  }
  
  // DeepSeek配置
  const deepseekModelSelect = document.getElementById('deepseek-model');
  const deepseekCustomModelEnabledChk = document.getElementById('deepseek-custom-model-enabled');
  const deepseekCustomModelInput = document.getElementById('deepseek-custom-model');
  const deepseekMaxRequestsInput = document.getElementById('deepseek-max-requests');
  const deepseekAiContextChk = document.getElementById('deepseek-ai-context');
  const deepseekExpertStrategySelect = document.getElementById('deepseek-expert-strategy');
  
  if (deepseekCustomModelEnabledChk) {
    deepseekCustomModelEnabledChk.addEventListener('change', () => {
      toggleCustomModelInput('deepseek');
      saveAiConfig('deepseek');
    });
  }
  
  if (deepseekModelSelect) {
    deepseekModelSelect.addEventListener('change', () => saveAiConfig('deepseek'));
  }
  
  if (deepseekCustomModelInput) {
    deepseekCustomModelInput.addEventListener('change', () => saveAiConfig('deepseek'));
  }
  
  if (deepseekMaxRequestsInput) {
    deepseekMaxRequestsInput.addEventListener('change', () => saveAiConfig('deepseek'));
  }
  
  if (deepseekAiContextChk) {
    deepseekAiContextChk.addEventListener('change', () => saveAiConfig('deepseek'));
  }
  
  if (deepseekExpertStrategySelect) {
    deepseekExpertStrategySelect.addEventListener('change', () => saveAiConfig('deepseek'));
  }
});

// 保存AI配置
function saveAiConfig(engine) {
  const config = {};
  
  if (engine === 'openai') {
    const modelSelect = document.getElementById('openai-model');
    const customModelEnabledChk = document.getElementById('openai-custom-model-enabled');
    const customModelInput = document.getElementById('openai-custom-model');
    const maxRequestsInput = document.getElementById('openai-max-requests');
    const aiContextChk = document.getElementById('openai-ai-context');
    const expertStrategySelect = document.getElementById('openai-expert-strategy');
    
    // 使用与store中相同的结构
    config.openaiConfig = {
      model: modelSelect ? modelSelect.value : 'gpt-4.1-mini',
      customModelEnabled: customModelEnabledChk ? customModelEnabledChk.checked : false,
      customModel: customModelInput ? customModelInput.value : '',
      maxRequests: maxRequestsInput ? parseInt(maxRequestsInput.value) : 10,
      aiContext: aiContextChk ? aiContextChk.checked : false,
      expertStrategy: expertStrategySelect ? expertStrategySelect.value : 'translation-master'
    };
    
    // 同时更新旧的openaiModel字段，保持兼容性
    config.openaiModel = config.openaiConfig.customModelEnabled && config.openaiConfig.customModel ? 
      config.openaiConfig.customModel : config.openaiConfig.model;
    
    // 发送配置到background.js
    try {
      chrome.runtime.sendMessage({
        action: 'updateAiConfig',
        engine: 'openai',
        config: config.openaiConfig
      }, response => {
        if (chrome.runtime.lastError) {
          console.warn('向background发送OpenAI配置失败:', chrome.runtime.lastError);
        } else if (response && response.success) {
          console.log('成功更新background中的OpenAI配置');
        }
      });
    } catch(e) {
      console.error('发送OpenAI配置消息异常:', e.message);
    }
  } else if (engine === 'deepseek') {
    const modelSelect = document.getElementById('deepseek-model');
    const customModelEnabledChk = document.getElementById('deepseek-custom-model-enabled');
    const customModelInput = document.getElementById('deepseek-custom-model');
    const maxRequestsInput = document.getElementById('deepseek-max-requests');
    const aiContextChk = document.getElementById('deepseek-ai-context');
    const expertStrategySelect = document.getElementById('deepseek-expert-strategy');
    
    // 使用与store中相同的结构
    config.deepseekConfig = {
      model: modelSelect ? modelSelect.value : 'deepseek-chat',
      customModelEnabled: customModelEnabledChk ? customModelEnabledChk.checked : false,
      customModel: customModelInput ? customModelInput.value : '',
      maxRequests: maxRequestsInput ? parseInt(maxRequestsInput.value) : 10,
      aiContext: aiContextChk ? aiContextChk.checked : false,
      expertStrategy: expertStrategySelect ? expertStrategySelect.value : 'translation-master'
    };
    
    // 发送配置到background.js
    try {
      chrome.runtime.sendMessage({
        action: 'updateAiConfig',
        engine: 'deepseek',
        config: config.deepseekConfig
      }, response => {
        if (chrome.runtime.lastError) {
          console.warn('向background发送DeepSeek配置失败:', chrome.runtime.lastError);
        } else if (response && response.success) {
          console.log('成功更新background中的DeepSeek配置');
        }
      });
    } catch(e) {
      console.error('发送DeepSeek配置消息异常:', e.message);
    }
  }
  
  saveSettings(config);
} 