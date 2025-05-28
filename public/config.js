// config.js - Transor 共享配置文件

// 默认配置
const transorDefaultConfig = {
  // 基本配置
  uiLanguage: 'zh-CN',
  targetLanguage: 'zh-CN',
  translationEngine: 'microsoft',
  translationStyle: 'universal',
  
  // OpenAI 配置
  openaiConfig: {
    model: 'gpt-4.1-mini',
    customModelEnabled: false,
    customModel: '',
    maxRequests: 10,
    aiContext: false,
    expertStrategy: 'translation-master'  // 默认使用 "意译大师"
  },
  
  // DeepSeek 配置
  deepseekConfig: {
    model: 'deepseek-chat',
    customModelEnabled: false,
    customModel: '',
    maxRequests: 10,
    aiContext: false,
    expertStrategy: 'translation-master'  // 默认使用 "意译大师"
  }
};

// 获取配置
function getDefaultConfig() {
  // 优先使用i18n中的配置
  if (window.i18n && window.i18n.defaultConfig) {
    const config = window.i18n.defaultConfig;
    
    // 检查DeepSeek模型，如果是deepseek-coder则改为deepseek-reasoner
    if (config.deepseekConfig && config.deepseekConfig.model === 'deepseek-coder') {
      config.deepseekConfig.model = 'deepseek-reasoner';
    }
    
    return config;
  }
  
  // 否则使用本地定义的配置
  return transorDefaultConfig;
}

// 将配置暴露给全局
window.transorConfig = {
  getDefaultConfig,
  defaultConfig: transorDefaultConfig
};

// 触发配置加载完成事件
window.dispatchEvent(new Event('transor-config-loaded')); 