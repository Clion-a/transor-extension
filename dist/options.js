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
  // 安全获取元素值的辅助函数
  const getElementValue = (id, defaultValue = '') => {
    const element = document.getElementById(id);
    return element ? element.value : defaultValue;
  };
  
  const getElementChecked = (id, defaultValue = false) => {
    const element = document.getElementById(id);
    return element ? element.checked : defaultValue;
  };

  // 获取基本设置
  const uiLanguage = getElementValue('ui-language', 'zh-CN');
  const targetLanguage = getElementValue('target-language', 'zh-CN');
  const translationEngine = getElementValue('translation-engine', 'microsoft');
  const translationStyle = getElementValue('translation-style', 'universal_style');
  const apiKey = getElementValue('api-key-input');
  
  // 获取显示样式设置
  const fontColor = getElementValue('font-color', '#ff5588');
  
  // 获取功能开关设置
  const showFloatingBall = getElementChecked('show-floating-ball', true);
  const enableInputSpaceTranslation = getElementChecked('enable-input-space-translation', true);
  const showTipDots = getElementChecked('show-tip-dots', false);
  const enableSelectionTranslation = getElementChecked('enable-selection-translation', true);
  const selectionTriggerMode = getElementValue('selection-trigger-mode', 'direct');

  // 获取OpenAI配置
  const openaiModel = getElementValue('openai-model', 'gpt-4.1-mini');
  const openaiCustomModelEnabled = getElementChecked('openai-custom-model-enabled', false);
  const openaiCustomModel = getElementValue('openai-custom-model');
  const openaiMaxRequests = parseInt(getElementValue('openai-max-requests', '10')) || 10;
  const openaiAiContext = getElementChecked('openai-ai-context', false);
  const openaiExpertStrategy = getElementValue('openai-expert-strategy', 'translation-master');
  const openaiApiKey = getElementValue('openai-api-key');
  const openaiApiEndpoint = getElementValue('openai-api-endpoint', 'https://api.openai.com/v1/chat/completions');

  // 获取DeepSeek配置
  const deepseekModel = getElementValue('deepseek-model', 'deepseek-chat');
  const deepseekCustomModelEnabled = getElementChecked('deepseek-custom-model-enabled', false);
  const deepseekCustomModel = getElementValue('deepseek-custom-model');
  const deepseekMaxRequests = parseInt(getElementValue('deepseek-max-requests', '10')) || 10;
  const deepseekAiContext = getElementChecked('deepseek-ai-context', false);
  const deepseekExpertStrategy = getElementValue('deepseek-expert-strategy', 'translation-master');
  const deepseekApiKey = getElementValue('deepseek-api-key');
  const deepseekApiEndpoint = getElementValue('deepseek-api-endpoint', 'https://api.deepseek.com/chat/completions');

  // 先获取现有的API Keys，然后再构建saveData
  chrome.storage.sync.get(['apiKeys'], (res) => {
    // 获取现有的API Keys
    const existingApiKeys = res.apiKeys || {};
    
    // 更新当前引擎的API Key（如果API Key输入框可见）
    const apiKeyContainer = document.getElementById('api-key-container');
    if (apiKeyContainer && apiKeyContainer.style.display !== 'none') {
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
      showFloatingBall: showFloatingBall,
      enableInputSpaceTranslation: enableInputSpaceTranslation,
      showTipDots: showTipDots,
      enableSelectionTranslation: enableSelectionTranslation,
      selectionTriggerMode: selectionTriggerMode,
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

// 更新AI专家卡片状态
function updateAiExpertCardStatus(selectedExpert) {
  document.querySelectorAll('.service-card[data-expert]').forEach(card => {
    const badge = card.querySelector('.badge');
    const expertValue = card.getAttribute('data-expert');
    
    if (badge) {
      if (expertValue === selectedExpert) {
        badge.textContent = '当前默认';
        badge.className = 'badge bg-success';
        card.classList.add('active');
      } else {
        badge.textContent = '可选择';
        badge.className = 'badge bg-secondary';
        card.classList.remove('active');
      }
    }
  });
}

// 获取并显示用户设置的快捷键
function loadAndDisplayShortcuts() {
  console.log('开始加载快捷键显示...');
  
  // 只为"翻译当前页面"显示默认快捷键，其他功能显示问号
  updateShortcutDisplay('translateToEnglish', 'Alt+A');
  updateShortcutDisplay('translateInputContent', null); // 显示问号
  updateShortcutDisplay('switchDisplayType', null); // 显示问号
  updateShortcutDisplay('switchFontColor', null); // 显示问号
  updateShortcutDisplay('tempUseGoogle', null); // 显示问号
  updateShortcutDisplay('tempUseMicrosoft', null); // 显示问号
  updateShortcutDisplay('tempUseOpenAI', null); // 显示问号
  updateShortcutDisplay('tempUseDeepSeek', null); // 显示问号
  
  // 检查是否在扩展环境中，如果是则尝试获取实际设置的快捷键
  if (typeof chrome !== 'undefined' && chrome.commands) {
    console.log('在扩展环境中，尝试获取实际快捷键...');
    try {
      chrome.commands.getAll((commands) => {
        console.log('获取到的命令列表:', commands);
        
        commands.forEach((command) => {
          console.log('处理命令:', command.name, command.shortcut);
          if (command.name === 'toggle_translation') {
            // 对于翻译当前页面，如果用户设置了快捷键就显示用户设置的，否则显示默认的Alt+A
            const shortcut = command.shortcut || 'Alt+A';
            console.log('找到toggle_translation命令，快捷键:', shortcut);
            updateShortcutDisplay('translateToEnglish', shortcut);
          } else if (command.name === 'translate_input_content') {
            // 对于其他功能，只有用户设置了快捷键才显示，否则显示问号
            console.log('找到translate_input_content命令，快捷键:', command.shortcut);
            updateShortcutDisplay('translateInputContent', command.shortcut);
          } else if (command.name === 'switch_display_type') {
            // 对于其他功能，只有用户设置了快捷键才显示，否则显示问号
            console.log('找到switch_display_type命令，快捷键:', command.shortcut);
            updateShortcutDisplay('switchDisplayType', command.shortcut);
          } else if (command.name === 'switch_font_color') {
            // 对于其他功能，只有用户设置了快捷键才显示，否则显示问号
            console.log('找到switch_font_color命令，快捷键:', command.shortcut);
            updateShortcutDisplay('switchFontColor', command.shortcut);
          } else if (command.name === 'temp_use_google') {
            console.log('找到temp_use_google命令，快捷键:', command.shortcut);
            updateShortcutDisplay('tempUseGoogle', command.shortcut);
          } else if (command.name === 'temp_use_microsoft') {
            console.log('找到temp_use_microsoft命令，快捷键:', command.shortcut);
            updateShortcutDisplay('tempUseMicrosoft', command.shortcut);
          } else if (command.name === 'temp_use_openai') {
            console.log('找到temp_use_openai命令，快捷键:', command.shortcut);
            updateShortcutDisplay('tempUseOpenAI', command.shortcut);
          } else if (command.name === 'temp_use_deepseek') {
            console.log('找到temp_use_deepseek命令，快捷键:', command.shortcut);
            updateShortcutDisplay('tempUseDeepSeek', command.shortcut);
          }
        });
      });
    } catch (error) {
      console.error('获取快捷键时出错:', error);
      // 保持当前显示状态
    }
  } else {
    console.log('不在扩展环境中，保持当前显示状态');
  }
}

// 更新快捷键显示
function updateShortcutDisplay(functionName, shortcut) {
  console.log(`更新快捷键显示: ${functionName} -> ${shortcut}`);
  
  // 特殊处理translateToEnglish，直接通过ID更新
  if (functionName === 'translateToEnglish') {
    const shortcutDisplay = document.getElementById('translate-current-page-shortcut');
    if (shortcutDisplay) {
      if (shortcut) {
        const formattedShortcut = formatShortcutDisplay(shortcut);
        shortcutDisplay.innerHTML = `<kbd class="bg-secondary text-light px-2 py-1 rounded">${formattedShortcut}</kbd>`;
        console.log('已更新翻译当前页面的快捷键显示');
      } else {
        shortcutDisplay.innerHTML = `<span class="text-light-emphasis me-2">未设置</span>`;
      }
      return;
    }
  }
  
  // 特殊处理translateInputContent，直接通过ID更新
  if (functionName === 'translateInputContent') {
    const shortcutDisplay = document.getElementById('translate-input-content-shortcut');
    if (shortcutDisplay) {
      if (shortcut) {
        const formattedShortcut = formatShortcutDisplay(shortcut);
        shortcutDisplay.innerHTML = `<kbd class="bg-secondary text-light px-2 py-1 rounded">${formattedShortcut}</kbd>`;
        console.log('已更新翻译当前输入框内容的快捷键显示');
      } else {
        shortcutDisplay.innerHTML = `<span class="text-light-emphasis me-2" style="font-size: 18px; color: #888;">?</span>`;
      }
      return;
    }
  }
  
  // 特殊处理switchDisplayType，直接通过ID更新
  if (functionName === 'switchDisplayType') {
    const shortcutDisplay = document.getElementById('switch-display-type-shortcut');
    if (shortcutDisplay) {
      if (shortcut) {
        const formattedShortcut = formatShortcutDisplay(shortcut);
        shortcutDisplay.innerHTML = `<kbd class="bg-secondary text-light px-2 py-1 rounded">${formattedShortcut}</kbd>`;
        console.log('已更新切换显示类型的快捷键显示');
      } else {
        shortcutDisplay.innerHTML = `<span class="text-light-emphasis me-2" style="font-size: 18px; color: #888;">?</span>`;
      }
      return;
    }
  }
  
  // 特殊处理switchFontColor，直接通过ID更新
  if (functionName === 'switchFontColor') {
    const shortcutDisplay = document.getElementById('switch-font-color-shortcut');
    if (shortcutDisplay) {
      if (shortcut) {
        const formattedShortcut = formatShortcutDisplay(shortcut);
        shortcutDisplay.innerHTML = `<kbd class="bg-secondary text-light px-2 py-1 rounded">${formattedShortcut}</kbd>`;
        console.log('已更新切换字体颜色的快捷键显示');
      } else {
        shortcutDisplay.innerHTML = `<span class="text-light-emphasis me-2" style="font-size: 18px; color: #888;">?</span>`;
      }
      return;
    }
  }
  
  // 特殊处理临时使用翻译服务的快捷键
  const tempServiceMap = {
    'tempUseGoogle': 'temp-use-google-shortcut',
    'tempUseMicrosoft': 'temp-use-microsoft-shortcut',
    'tempUseOpenAI': 'temp-use-openai-shortcut',
    'tempUseDeepSeek': 'temp-use-deepseek-shortcut'
  };
  
  if (tempServiceMap[functionName]) {
    const shortcutDisplay = document.getElementById(tempServiceMap[functionName]);
    if (shortcutDisplay) {
      if (shortcut) {
        const formattedShortcut = formatShortcutDisplay(shortcut);
        shortcutDisplay.innerHTML = `<kbd class="bg-secondary text-light px-2 py-1 rounded">${formattedShortcut}</kbd>`;
        console.log(`已更新${functionName}的快捷键显示`);
      } else {
        shortcutDisplay.innerHTML = `<span class="text-light-emphasis me-2" style="font-size: 18px; color: #888;">?</span>`;
      }
      return;
    }
  }
  
  // 通用方法：查找对应的快捷键显示元素
  const shortcutElements = document.querySelectorAll('[data-i18n="' + functionName + '"]');
  
  shortcutElements.forEach((element) => {
    const container = element.closest('.col-md-6');
    if (container) {
      // 查找快捷键显示区域 - 更精确的选择器
      const outerDiv = container.querySelector('.d-flex.align-items-center.justify-content-between');
      if (outerDiv) {
        const shortcutDisplay = outerDiv.querySelector('.d-flex.align-items-center:last-child');
        
        if (shortcutDisplay) {
          if (shortcut) {
            // 格式化快捷键显示
            const formattedShortcut = formatShortcutDisplay(shortcut);
            shortcutDisplay.innerHTML = `<kbd class="bg-secondary text-light px-2 py-1 rounded">${formattedShortcut}</kbd>`;
          } else {
            // 如果没有设置快捷键，显示问号
            shortcutDisplay.innerHTML = `<span class="text-light-emphasis me-2" style="font-size: 18px; color: #888;">?</span>`;
          }
        }
      }
    }
  });
}

// 格式化快捷键显示
function formatShortcutDisplay(shortcut) {
  if (!shortcut) return '';
  
  // 将快捷键转换为更友好的显示格式
  let formatted = shortcut
    .replace(/Alt/g, '⌥')
    .replace(/Ctrl/g, '⌃')
    .replace(/Shift/g, '⇧')
    .replace(/Cmd/g, '⌘')
    .replace(/Command/g, '⌘')
    .replace(/Meta/g, '⌘');
  
  // 处理加号，保留键之间的连接
  formatted = formatted.replace(/\+/g, '');
  
  return formatted;
}

// 保存AI专家选择
function saveAiExpertSelection(expertValue) {
  chrome.storage.sync.set({ 'selectedAiExpert': expertValue }, function() {
    console.log('AI专家选择已保存:', expertValue);
    showSaveNotification('AI专家选择已保存');
    
    // 更新所有专家卡片的状态
    updateAiExpertCardStatus(expertValue);
    
    // 同步更新 OpenAI 和 DeepSeek 的专家策略选择器
    const openaiExpertSelect = document.getElementById('openai-expert-strategy');
    const deepseekExpertSelect = document.getElementById('deepseek-expert-strategy');
    
    if (openaiExpertSelect) {
      openaiExpertSelect.value = expertValue;
      // 触发保存 OpenAI 配置
      saveAiConfig('openai');
    }
    
    if (deepseekExpertSelect) {
      deepseekExpertSelect.value = expertValue;
      // 触发保存 DeepSeek 配置
      saveAiConfig('deepseek');
    }
  });
}

// 保存AI专家显示状态
function saveAiExpertVisibility(expertValue, isVisible) {
  chrome.storage.sync.get(['aiExpertVisibility'], (result) => {
    const visibility = result.aiExpertVisibility || {};
    visibility[expertValue] = isVisible;
    
    chrome.storage.sync.set({ 'aiExpertVisibility': visibility }, function() {
      console.log(`AI专家 ${expertValue} 显示状态已保存:`, isVisible);
      showSaveNotification('专家显示设置已保存');
    });
  });
}

// 初始化AI专家选择
function initializeAiExpertSelection() {
  chrome.storage.sync.get(['selectedAiExpert', 'aiExpertVisibility'], (result) => {
    const selectedExpert = result.selectedAiExpert || 'universal';
    const visibility = result.aiExpertVisibility || {};
    
    // 更新所有专家卡片的状态
    updateAiExpertCardStatus(selectedExpert);
    
    // 初始化所有专家的显示状态
    document.querySelectorAll('input[id$="-expert-enabled"]').forEach(checkbox => {
      const expertId = checkbox.id.replace('-expert-enabled', '');
      const expertValue = expertId.replace('-expert', '');
      
      // 如果存储中有保存的状态，使用保存的状态；否则默认为true
      checkbox.checked = visibility[expertValue] !== false;
      
      // 为每个复选框添加事件监听器
      checkbox.addEventListener('change', function() {
        saveAiExpertVisibility(expertValue, this.checked);
      });
    });
    
    // 为AI专家卡片添加点击事件
    document.querySelectorAll('.service-card[data-expert]').forEach(card => {
      card.addEventListener('click', function(e) {
        // 如果点击的是复选框或标签，不处理
        if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') return;
        
        const expertValue = this.getAttribute('data-expert');
        
        // 保存选择的专家
        saveAiExpertSelection(expertValue);
      });
    });
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

// 切换内容区域的功能现在通过hash和handleHashChange处理

// 从URL hash或localStorage恢复页面状态
function restorePageState() {
  let targetSection = 'general'; // 默认页面
  
  // 首先检查URL hash
  if (window.location.hash) {
    const hashSection = window.location.hash.substring(1);
    // 验证section是否存在
    if (document.getElementById(`${hashSection}-section`)) {
      targetSection = hashSection;
    }
  } else {
    // 如果没有hash，检查localStorage
    const savedSection = localStorage.getItem('transor-current-section');
    if (savedSection && document.getElementById(`${savedSection}-section`)) {
      targetSection = savedSection;
      // 设置hash以保持一致性
      window.location.hash = targetSection;
    } else {
      // 如果都没有，设置默认hash
      window.location.hash = targetSection;
    }
  }
  
  // 直接更新UI状态
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  
  document.querySelectorAll('.nav-link').forEach(item => {
    item.classList.remove('active');
  });
  
  const targetSectionElement = document.getElementById(`${targetSection}-section`);
  if (targetSectionElement) {
    targetSectionElement.classList.add('active');
  }
  
  const navItem = document.querySelector(`.nav-link[data-section="${targetSection}"]`);
  if (navItem) {
    navItem.classList.add('active');
  }
  
  localStorage.setItem('transor-current-section', targetSection);
  
  if (targetSection === 'shortcuts') {
    setTimeout(() => {
      loadAndDisplayShortcuts();
    }, 100);
  }
}

// 监听浏览器前进后退按钮
function handleHashChange() {
  if (window.location.hash) {
    const sectionId = window.location.hash.substring(1);
    if (document.getElementById(`${sectionId}-section`)) {
             // 直接更新UI状态，避免重复设置hash
      document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
      });
      
      document.querySelectorAll('.nav-link').forEach(item => {
        item.classList.remove('active');
      });
      
      const targetSection = document.getElementById(`${sectionId}-section`);
      if (targetSection) {
        targetSection.classList.add('active');
      }
      
      const navItem = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
      if (navItem) {
        navItem.classList.add('active');
      }
      
      localStorage.setItem('transor-current-section', sectionId);
      
      if (sectionId === 'shortcuts') {
        loadAndDisplayShortcuts();
      }
    }
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
      
      // 对于简单的文本元素（如h6, small, span, p等），直接设置textContent
      const simpleTextTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'SMALL', 'STRONG', 'EM', 'LABEL', 'A', 'BUTTON', 'LI', 'TD', 'TH'];
      
      if (simpleTextTags.includes(el.tagName) && !el.querySelector('[data-i18n]')) {
        // 如果是简单文本标签且内部没有其他需要翻译的元素，直接设置textContent
        el.textContent = translatedText;
      } else if (el.children.length > 0) {
        // 对于复杂元素，查找并更新第一个文本节点
        const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (textNode) {
          textNode.textContent = translatedText;
        } else {
          // 如果没有文本节点，创建一个
          const newTextNode = document.createTextNode(translatedText);
          el.insertBefore(newTextNode, el.firstChild);
        }
      } else {
        // 如果没有子元素，直接设置textContent
        el.textContent = translatedText;
      }
    } else {
      // 如果i18n.js尚未加载，保留原有文本
      console.warn('i18n对象未正确加载，无法翻译:', key);
    }
  });
  
  // 更新翻译服务和AI专家的多语言内容
  updateTranslationServicesI18n();
}

// 动态更新翻译服务和AI专家的多语言内容
function updateTranslationServicesI18n() {
  // 更新翻译服务卡片的多语言内容
  const serviceCards = document.querySelectorAll('.service-card[data-service]');
  serviceCards.forEach(card => {
    const serviceId = card.getAttribute('data-service');
    const titleElement = card.querySelector('.card-title');
    const descElement = card.querySelector('.text-light-emphasis');
    const statusBadge = card.querySelector('.badge');
    const configBtn = card.querySelector('.config-btn span');
    
    if (titleElement && window.i18n && typeof window.i18n.t === 'function') {
      const titleKey = `${serviceId}Translation`;
      const descKey = `${serviceId}TranslationDesc`;
      
      titleElement.textContent = window.i18n.t(titleKey, userInterfaceLanguage);
      if (descElement) {
        descElement.textContent = window.i18n.t(descKey, userInterfaceLanguage);
      }
    }
    
    if (statusBadge) {
      const badgeText = statusBadge.getAttribute('data-i18n');
      if (badgeText && window.i18n && typeof window.i18n.t === 'function') {
        statusBadge.textContent = window.i18n.t(badgeText, userInterfaceLanguage);
      }
    }
    
    if (configBtn) {
      const btnText = configBtn.getAttribute('data-i18n');
      if (btnText && window.i18n && typeof window.i18n.t === 'function') {
        configBtn.textContent = window.i18n.t(btnText, userInterfaceLanguage);
      }
    }
  });
  
  // 更新AI专家卡片的多语言内容
  const expertCards = document.querySelectorAll('.service-card[data-expert]');
  expertCards.forEach(card => {
    const expertId = card.getAttribute('data-expert');
    const titleElement = card.querySelector('.card-title');
    const descElement = card.querySelector('.text-light-emphasis');
    const statusBadge = card.querySelector('.badge');
    const showOptionLabel = card.querySelector('.form-check-label[data-i18n="showThisOption"]');
    
    if (titleElement && window.i18n && typeof window.i18n.t === 'function') {
      // 将expert ID转换为对应的标题键
      const titleKey = expertId.split('-').map((word, index) => {
        if (index === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join('') + 'ExpertTitle';
      
      const descKey = expertId.split('-').map((word, index) => {
        if (index === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join('') + 'ExpertDesc';
      
      titleElement.textContent = window.i18n.t(titleKey, userInterfaceLanguage);
      if (descElement) {
        descElement.textContent = window.i18n.t(descKey, userInterfaceLanguage);
      }
    }
    
    if (statusBadge) {
      const badgeText = statusBadge.getAttribute('data-i18n');
      if (badgeText && window.i18n && typeof window.i18n.t === 'function') {
        statusBadge.textContent = window.i18n.t(badgeText, userInterfaceLanguage);
      } else {
        // 为没有data-i18n属性的badge添加翻译
        const badgeTextContent = statusBadge.textContent.trim();
        if (badgeTextContent === '可选择') {
          statusBadge.textContent = window.i18n.t('available', userInterfaceLanguage);
        } else if (badgeTextContent === '当前默认') {
          statusBadge.textContent = window.i18n.t('currentDefault', userInterfaceLanguage);
        }
      }
    }
    
    if (showOptionLabel) {
      showOptionLabel.textContent = window.i18n.t('showThisOption', userInterfaceLanguage);
    }
  });
  
  // 更新所有"显示此选项"标签
  const allShowOptionLabels = document.querySelectorAll('.form-check-label');
  allShowOptionLabels.forEach(label => {
    if (label.textContent.trim() === '显示此选项' || label.textContent.trim() === 'Show this option') {
      label.textContent = window.i18n.t('showThisOption', userInterfaceLanguage);
    }
  });
  
  // 更新所有状态标签
  const allBadges = document.querySelectorAll('.badge');
  allBadges.forEach(badge => {
    const badgeText = badge.textContent.trim();
    if (badgeText === '可选择' || badgeText === 'Available') {
      badge.textContent = window.i18n.t('available', userInterfaceLanguage);
    } else if (badgeText === '当前默认' || badgeText === 'Current Default') {
      badge.textContent = window.i18n.t('currentDefault', userInterfaceLanguage);
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

// 文档加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM加载完成，初始化设置页面...');
  
  // 加载界面语言设置
  userInterfaceLanguage = localStorage.getItem('transor-ui-language') || 'zh-CN';
  console.log('当前界面语言:', userInterfaceLanguage);
  
  // 如果i18n.js已加载，更新页面文本
  if (window.i18n) {
      updateI18n();
    } else {
    console.warn('i18n.js尚未加载，将使用默认文本');
  }
  
  // 从存储中加载设置
  chrome.storage.sync.get(null, function(result) {
    console.log('从存储中获取的设置:', result);
    
    // 设置UI语言
    const uiLang = result['transor-ui-language'] || userInterfaceLanguage;
    const uiLanguageSelect = document.getElementById('ui-language');
    if (uiLanguageSelect) {
      uiLanguageSelect.value = uiLang;
    }
    
    // 设置目标语言
    const targetLang = result.targetLanguage || 'zh-CN';
    const targetLanguageSelect = document.getElementById('target-language');
    if (targetLanguageSelect) {
      targetLanguageSelect.value = targetLang;
    }
    
    // 设置翻译引擎
    const engine = result.translationEngine || 'microsoft';
    const engineSelect = document.getElementById('translation-engine');
    if (engineSelect) {
      engineSelect.value = engine;
      updateApiKeyVisibility(engine);
    }
    
    // 设置翻译样式
    const style = result.translationStyle || 'universal_style';
    const styleSelect = document.getElementById('translation-style');
    if (styleSelect) {
      styleSelect.value = style;
    }
    
    // 设置字体颜色
    const fontColor = result.fontColor || '#ff5588';
    const fontColorInput = document.getElementById('font-color');
    const fontColorPicker = document.getElementById('font-color-picker');
    if (fontColorInput) fontColorInput.value = fontColor;
    if (fontColorPicker) fontColorPicker.value = fontColor;
    
    // 设置功能开关
    if (document.getElementById('show-floating-ball')) {
      document.getElementById('show-floating-ball').checked = result.showFloatingBall !== false;
    }
    
    if (document.getElementById('enable-input-space-translation')) {
      document.getElementById('enable-input-space-translation').checked = result.enableInputSpaceTranslation !== false;
    }
    
    if (document.getElementById('show-tip-dots')) {
      document.getElementById('show-tip-dots').checked = result.showTipDots === true;
    }
    
    if (document.getElementById('enable-selection-translation')) {
      document.getElementById('enable-selection-translation').checked = result.enableSelectionTranslation !== false;
      
      // 添加事件监听器，当划词翻译开关状态变化时更新触发方式选择器的显示/隐藏
      document.getElementById('enable-selection-translation').addEventListener('change', updateSelectionTriggerVisibility);
    }
    
    // 设置滑词翻译触发方式
    const selectionTriggerMode = result.selectionTriggerMode || 'direct';
    if (document.getElementById('selection-trigger-mode')) {
      document.getElementById('selection-trigger-mode').value = selectionTriggerMode;
    }
    
    // 更新滑词翻译触发方式选择器的显示/隐藏
    updateSelectionTriggerVisibility();
    
    // 设置API Key
    if (result.apiKeys && result.apiKeys[engine]) {
      const apiKeyInput = document.getElementById('api-key-input');
      if (apiKeyInput) {
        apiKeyInput.value = result.apiKeys[engine];
      }
    }
    
    // 设置OpenAI配置
    if (result.openaiConfig) {
      const config = result.openaiConfig;
      
      // 设置模型
      if (document.getElementById('openai-model')) {
        document.getElementById('openai-model').value = config.model || 'gpt-4.1-mini';
      }
      
      // 设置自定义模型
      if (document.getElementById('openai-custom-model-enabled')) {
        document.getElementById('openai-custom-model-enabled').checked = config.customModelEnabled === true;
        toggleCustomModelInput('openai');
      }
      
      if (document.getElementById('openai-custom-model')) {
        document.getElementById('openai-custom-model').value = config.customModel || '';
      }
      
      // 设置最大请求数
      if (document.getElementById('openai-max-requests')) {
        document.getElementById('openai-max-requests').value = config.maxRequests || 10;
      }
      
      // 设置AI上下文
      if (document.getElementById('openai-ai-context')) {
        document.getElementById('openai-ai-context').checked = config.aiContext === true;
      }
      
      // 设置专家策略
      if (document.getElementById('openai-expert-strategy')) {
        document.getElementById('openai-expert-strategy').value = config.expertStrategy || 'translation-master';
      }
      
      // 设置API端点
      if (document.getElementById('openai-api-endpoint')) {
        document.getElementById('openai-api-endpoint').value = config.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
      }
    }
    
    // 设置DeepSeek配置
    if (result.deepseekConfig) {
      const config = result.deepseekConfig;
      
      // 设置模型
      if (document.getElementById('deepseek-model')) {
        document.getElementById('deepseek-model').value = config.model || 'deepseek-chat';
      }
      
      // 设置自定义模型
      if (document.getElementById('deepseek-custom-model-enabled')) {
        document.getElementById('deepseek-custom-model-enabled').checked = config.customModelEnabled === true;
        toggleCustomModelInput('deepseek');
      }
      
      if (document.getElementById('deepseek-custom-model')) {
        document.getElementById('deepseek-custom-model').value = config.customModel || '';
      }
      
      // 设置最大请求数
      if (document.getElementById('deepseek-max-requests')) {
        document.getElementById('deepseek-max-requests').value = config.maxRequests || 10;
      }
      
      // 设置AI上下文
      if (document.getElementById('deepseek-ai-context')) {
        document.getElementById('deepseek-ai-context').checked = config.aiContext === true;
      }
      
      // 设置专家策略
      if (document.getElementById('deepseek-expert-strategy')) {
        document.getElementById('deepseek-expert-strategy').value = config.expertStrategy || 'translation-master';
      }
      
      // 设置API端点
      if (document.getElementById('deepseek-api-endpoint')) {
        document.getElementById('deepseek-api-endpoint').value = config.apiEndpoint || 'https://api.deepseek.com/chat/completions';
      }
    }
  });
  
  // 添加保存设置按钮的事件处理程序
  const saveSettingsBtn = document.getElementById('save-settings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', function() {
      saveSettings();
      showSaveNotification('设置已保存');
    });
  }
  
  // 添加恢复默认设置按钮的事件处理程序
  const restoreDefaultsBtn = document.getElementById('restore-defaults');
  if (restoreDefaultsBtn) {
    restoreDefaultsBtn.addEventListener('click', function() {
      if (confirm(getI18n('confirmRestore', userInterfaceLanguage))) {
        chrome.storage.sync.clear(() => {
          location.reload();
        });
      }
    });
  }
  
  // 添加滑词翻译触发方式选择器的事件处理程序
  const selectionTriggerModeSelect = document.getElementById('selection-trigger-mode');
  if (selectionTriggerModeSelect) {
    selectionTriggerModeSelect.addEventListener('change', function() {
      saveSettings({ selectionTriggerMode: selectionTriggerModeSelect.value });
    });
  }
  
  // 初始化页面状态
  restorePageState();
  
  // 添加hashchange事件监听器
  window.addEventListener('hashchange', handleHashChange);
  
  // 初始化翻译服务和AI专家
  generateTranslationServicesList();
  initializeTranslationServices();
  initializeAiExpertSelection();
});

// 初始化翻译服务页面
function initializeTranslationServices() {
  // 获取所有翻译服务卡片（只包含有 data-service 属性的卡片）
  const serviceCards = document.querySelectorAll('.service-card[data-service]');
  const serviceToggles = document.querySelectorAll('#translation-services-list .form-check-input');
  
  // 为每个服务开关添加事件监听器
  serviceToggles.forEach(toggle => {
    toggle.addEventListener('change', function() {
      const serviceId = this.id.replace('-enabled', '');
      const serviceCard = document.querySelector(`[data-service="${serviceId}"]`);
      const statusBadge = serviceCard ? serviceCard.querySelector('.badge') : null;
      
      if (this.checked) {
        // 启用服务
        if (serviceCard) {
          serviceCard.classList.add('active');
        }
        
        // 如果是当前默认引擎，保持"当前默认"状态
        if (statusBadge) {
          chrome.storage.sync.get(['translationEngine'], (res) => {
            const currentEngine = res.translationEngine || 'microsoft';
            if (serviceId === currentEngine) {
              statusBadge.textContent = '当前默认';
              statusBadge.className = 'badge bg-success';
            } else {
              // 移除"去修改"状态，只显示空白或隐藏徽章
              statusBadge.textContent = '';
              statusBadge.className = 'badge d-none';
            }
          });
        }
      } else {
        // 禁用服务
        if (serviceCard) {
          serviceCard.classList.remove('active');
        }
        if (statusBadge) {
          statusBadge.textContent = '已禁用';
          statusBadge.className = 'badge bg-danger';
        }
      }
      
              // 保存服务状态
        const serviceStates = {};
        serviceStates[`${serviceId}Enabled`] = this.checked;
        
        // 如果是 Microsoft Edge 服务，同时更新 microsoftapi 的状态
        if (serviceId === 'microsoft') {
          serviceStates['microsoftapiEnabled'] = this.checked;
        }
        
        // 如果禁用了当前默认引擎，需要切换到其他可用引擎
        if (!this.checked) {
          chrome.storage.sync.get(['translationEngine'], (res) => {
            const currentEngine = res.translationEngine || 'microsoft';
            
            // 如果禁用的是当前引擎，或者是 microsoft/microsoftapi 的特殊情况
            if (currentEngine === serviceId || 
                (serviceId === 'microsoft' && currentEngine === 'microsoftapi')) {
              // 找到第一个启用的服务
              const allToggles = document.querySelectorAll('#translation-services-list .form-check-input');
              let newEngine = null;
              
              allToggles.forEach(toggle => {
                if (toggle.checked && toggle.id !== `${serviceId}-enabled`) {
                  const newServiceId = toggle.id.replace('-enabled', '');
                  if (!newEngine) {
                    newEngine = newServiceId;
                  }
                }
              });
              
              if (newEngine) {
                setDefaultTranslationEngine(newEngine);
              }
            }
          });
        }
        
        // 只保存服务状态，不尝试读取所有设置
        chrome.storage.sync.set(serviceStates, function() {
          if (chrome.runtime.lastError) {
            console.error('保存服务状态失败:', chrome.runtime.lastError);
          } else {
            console.log('服务状态已保存:', serviceStates);
          }
        });
    });
  });
  
  // 为服务卡片添加点击事件（切换为默认引擎）
  serviceCards.forEach(card => {
    card.addEventListener('click', function(e) {
      // 如果点击的是开关，不处理
      if (e.target.type === 'checkbox') return;
      
      const serviceId = this.getAttribute('data-service');
      if (!serviceId) return; // 确保有 data-service 属性
      
      const toggle = document.getElementById(`${serviceId}-enabled`);
      if (!toggle) return; // 确保找到对应的开关
      
      // 如果服务未启用，先启用它
      if (!toggle.checked) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
      }
      
      // 设置为默认引擎
      setDefaultTranslationEngine(serviceId);
    });
  });
  
  // 为配置按钮添加点击事件
  document.querySelectorAll('.config-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation(); // 阻止事件冒泡到卡片点击事件
      
      const serviceId = this.getAttribute('data-service');
      
      // 跳转到常规设置页面
      window.location.hash = 'general';
      
      // 设置翻译引擎为对应服务
      const engineSelect = document.getElementById('translation-engine');
      if (engineSelect) {
        engineSelect.value = serviceId;
        engineSelect.dispatchEvent(new Event('change'));
      }
      
      // 滚动到翻译引擎选择器
      setTimeout(() => {
        const engineContainer = document.getElementById('translation-engine').closest('.card');
        if (engineContainer) {
          engineContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    });
  });

  // 加载当前服务状态
  loadTranslationServicesStatus();
}

// 设置默认翻译引擎
function setDefaultTranslationEngine(engineId) {
  // 更新所有翻译服务状态徽章（只处理有 data-service 属性的卡片）
  document.querySelectorAll('.service-card[data-service]').forEach(card => {
    const badge = card.querySelector('.badge');
    const cardServiceId = card.getAttribute('data-service');
    const toggle = document.getElementById(`${cardServiceId}-enabled`);
    
    if (badge && cardServiceId === engineId) {
      badge.textContent = '当前默认';
      badge.className = 'badge bg-success';
      card.classList.add('active');
    } else if (badge && toggle && toggle.checked) {
      // 移除"去修改"状态，只显示空白或隐藏徽章
      badge.textContent = '';
      badge.className = 'badge d-none';
    }
  });
  
  // 保存翻译引擎设置
  const saveEngineSettings = (engineToSave) => {
    chrome.storage.sync.set({ translationEngine: engineToSave }, function() {
      if (chrome.runtime.lastError) {
        console.error('保存翻译引擎失败:', chrome.runtime.lastError);
      } else {
        console.log('翻译引擎已保存:', engineToSave);
      }
    });
  };
  
  // 如果选择了 microsoft，检查是否需要使用 microsoftapi
  if (engineId === 'microsoft') {
    chrome.storage.sync.get(['translationEngine'], (res) => {
      const actualEngineId = (res.translationEngine === 'microsoftapi') ? 'microsoftapi' : engineId;
      saveEngineSettings(actualEngineId);
    });
  } else {
    saveEngineSettings(engineId);
  }
  
  // 同步更新常规设置页面的选择器
  const engineSelect = document.getElementById('translation-engine');
  if (engineSelect) {
    engineSelect.value = engineId;
    updateApiKeyVisibility(engineId);
  }
  
  showSaveNotification('已设置为默认翻译引擎');
}

// 加载翻译服务状态
function loadTranslationServicesStatus() {
  chrome.storage.sync.get(null, (settings) => {
    const currentEngine = settings.translationEngine || 'microsoft';
    
    // 更新每个翻译服务的状态（只处理有 data-service 属性的卡片）
    document.querySelectorAll('.service-card[data-service]').forEach(card => {
      const serviceId = card.getAttribute('data-service');
      const toggle = document.getElementById(`${serviceId}-enabled`);
      const badge = card.querySelector('.badge');
      
      // 检查服务是否启用（默认都启用）
      let isEnabled = settings[`${serviceId}Enabled`] !== false;
      
      // 特殊处理：如果是 microsoft 服务，也检查 microsoftapiEnabled
      if (serviceId === 'microsoft' && settings['microsoftEnabled'] === undefined) {
        // 如果没有明确设置 microsoftEnabled，则使用 microsoftapiEnabled 的值
        isEnabled = settings['microsoftapiEnabled'] !== false;
      }
      
      if (toggle) {
        toggle.checked = isEnabled;
      }
      
      if (badge) {
        if (isEnabled) {
          card.classList.add('active');
          if (serviceId === currentEngine) {
            badge.textContent = '当前默认';
            badge.className = 'badge bg-success';
          } else {
            // 移除"去修改"状态，只显示空白或隐藏徽章
            badge.textContent = '';
            badge.className = 'badge d-none';
          }
        } else {
          card.classList.remove('active');
          badge.textContent = '已禁用';
          badge.className = 'badge bg-danger';
        }
      }
    });
  });
}

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
  
  // 直接保存配置到存储，不调用完整的 saveSettings
  chrome.storage.sync.set(config, function() {
    if (chrome.runtime.lastError) {
      console.error('保存AI配置失败:', chrome.runtime.lastError);
    } else {
      console.log('AI配置已保存:', config);
      showSaveNotification('AI配置已保存');
    }
  });
} 

// 根据划词翻译开关状态显示/隐藏触发方式选择器
function updateSelectionTriggerVisibility() {
  const selectionTranslationEnabled = document.getElementById('enable-selection-translation').checked;
  const selectionTriggerContainer = document.getElementById('selection-trigger-container');
  
  if (selectionTriggerContainer) {
    selectionTriggerContainer.style.display = selectionTranslationEnabled ? 'block' : 'none';
  }
} 