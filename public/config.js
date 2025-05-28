// config.js - 统一的配置文件，确保所有组件使用相同的默认设置

// 默认配置
const transorDefaultConfig = {
  uiLanguage: 'zh-CN',
  targetLanguage: 'zh-CN',
  translationEngine: 'microsoft', 
  translationStyle: 'universal',
  isEnabled: true,
  highlightFavoritesEnabled: true,
  youtubeCinemaEnabled: true,
  enableInputSpaceTranslation: true
};

// 使用这个函数获取默认配置
function getDefaultConfig() {
  // 首先尝试从i18n.js中获取配置
  if (window.i18n && window.i18n.defaultConfig) {
    return window.i18n.defaultConfig;
  }
  return transorDefaultConfig;
}

// 暴露配置给全局使用
window.transorConfig = {
  getDefaultConfig,
  defaults: transorDefaultConfig
};

// 触发配置加载完成事件
window.dispatchEvent(new Event('transor-config-loaded')); 