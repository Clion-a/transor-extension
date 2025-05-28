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
    translationStyle: 'universal'
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
      'uiLanguageUpdated': '界面语言已更新',
      'confirmRestore': '确定要清除所有设置并恢复默认值吗？'
    },
    'en': {
      'settingsSaved': 'Settings Saved',
      'uiLanguageUpdated': 'UI Language Updated',
      'confirmRestore': 'Are you sure you want to clear all settings and restore defaults?'
    }
  };
  
  try {
    return fallbackMap[lang || 'zh-CN'][key] || key;
  } catch (e) {
    return key;
  }
}

// 保存修改到 chrome.storage.sync
function saveSettings(changes) {
  if (!changes || typeof changes !== 'object') return;
  chrome.storage.sync.set(changes, () => {
    if (chrome.runtime.lastError) {
      console.error('保存设置出错:', chrome.runtime.lastError.message);
    } else {
      console.log('已保存设置:', changes);
      showSaveNotification(getI18n('settingsSaved', userInterfaceLanguage));
    }
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

window.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const uiLangSel = document.getElementById('ui-language');
  const targetLangSel = document.getElementById('target-language');
  const engineSel = document.getElementById('translation-engine');
  const engine2Sel = document.getElementById('translation-engine-2'); // 翻译服务页面中的引擎选择器
  const styleSel = document.getElementById('translation-style');
  const enableTranslationChk = document.getElementById('enable-translation');
  const enableHighlightChk = document.getElementById('enable-highlight');
  const enableYouTubeCinemaChk = document.getElementById('enable-youtube-cinema');
  const apiKeyInput = document.getElementById('api-key-input');
  const openaiApiKeyInput = document.getElementById('openai-api-key');
  const deepseekApiKeyInput = document.getElementById('deepseek-api-key');
  const saveSettingsBtn = document.getElementById('save-settings');
  const restoreDefaultsBtn = document.getElementById('restore-defaults');

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

  // 加载现有设置
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
    enableTranslationChk.checked = settings.isEnabled !== false;
    enableHighlightChk.checked = settings.highlightFavoritesEnabled !== false;
    enableYouTubeCinemaChk.checked = settings.youtubeCinemaEnabled !== false;

    // API key
    if (settings.apiKeys) {
      apiKeyInput.value = settings.apiKeys[engineSel.value] || '';
      
      // 同步单独的API密钥输入框
      if (openaiApiKeyInput) {
        openaiApiKeyInput.value = settings.apiKeys.openai || '';
      }
      if (deepseekApiKeyInput) {
        deepseekApiKeyInput.value = settings.apiKeys.deepseek || '';
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
    
    saveSettings({ translationEngine: engineSel.value });
    
    // 同步两个页面的翻译引擎选择器
    if (engine2Sel) {
      engine2Sel.value = engineSel.value;
    }

    // 同步显示对应 key
    chrome.storage.sync.get('apiKeys', (res) => {
      const key = res.apiKeys ? res.apiKeys[engineSel.value] : '';
      apiKeyInput.value = key || '';
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
      saveSettings({ translationEngine: engine2Sel.value });
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
      saveSettings({ apiKeys });
    });
  });

  // 单独的API密钥输入框事件
  if (openaiApiKeyInput) {
    openaiApiKeyInput.addEventListener('change', () => {
      chrome.storage.sync.get(['apiKeys'], (res) => {
        const apiKeys = res.apiKeys || {};
        apiKeys.openai = openaiApiKeyInput.value;
        saveSettings({ apiKeys });
      });
    });
  }

  if (deepseekApiKeyInput) {
    deepseekApiKeyInput.addEventListener('change', () => {
      chrome.storage.sync.get(['apiKeys'], (res) => {
        const apiKeys = res.apiKeys || {};
        apiKeys.deepseek = deepseekApiKeyInput.value;
        saveSettings({ apiKeys });
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