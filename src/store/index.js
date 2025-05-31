import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    isEnabled: false,
    targetLanguage: 'zh-CN',
    sourceLanguage: 'auto',
    translationEngine: 'microsoft',
    translationStyle: 'universal_style',
    excludedTags: ['code', 'pre', 'script', 'style'],
    excludedClasses: ['no-translate'],
    excludedUrls: [],
    customCss: '',
    openaiModel: 'gpt-4.1-mini',
    enableInputSpaceTranslation: true,
    apiKeys: {
      microsoftapi: '',
      microsoft: '',
      deepseek: '',
      openai: ''
    },
    openaiConfig: {
      model: 'gpt-4.1-mini',
      customModelEnabled: false,
      customModel: '',
      maxRequests: 10,
      aiContext: false,
      expertStrategy: 'translation-master'
    },
    deepseekConfig: {
      model: 'deepseek-chat',
      customModelEnabled: false,
      customModel: '',
      maxRequests: 10,
      aiContext: false,
      expertStrategy: 'translation-master'
    }
  },
  mutations: {
    setEnabled(state, enabled) {
      state.isEnabled = enabled
    },
    setTargetLanguage(state, language) {
      state.targetLanguage = language
    },
    setSourceLanguage(state, language) {
      state.sourceLanguage = language
    },
    setTranslationEngine(state, engine) {
      state.translationEngine = engine
    },
    setTranslationStyle(state, style) {
      state.translationStyle = style
    },
    setExcludedTags(state, tags) {
      state.excludedTags = tags
    },
    setExcludedClasses(state, classes) {
      state.excludedClasses = classes
    },
    setExcludedUrls(state, urls) {
      state.excludedUrls = urls
    },
    setCustomCss(state, css) {
      state.customCss = css
    },
    setOpenaiModel(state, model) {
      state.openaiModel = model
    },
    setEnableInputSpaceTranslation(state, enabled) {
      state.enableInputSpaceTranslation = enabled
    },
    setApiKey(state, { type, key }) {
      if (!state.apiKeys) {
        state.apiKeys = {}
      }
      state.apiKeys[type] = key
    },
    setApiKeys(state, apiKeys) {
      state.apiKeys = apiKeys
    },
    setOpenaiConfig(state, config) {
      state.openaiConfig = config
    },
    setDeepseekConfig(state, config) {
      state.deepseekConfig = config
    },
    updateOpenaiConfig(state, { key, value }) {
      if (state.openaiConfig) {
        state.openaiConfig[key] = value
      }
    },
    updateDeepseekConfig(state, { key, value }) {
      if (state.deepseekConfig) {
        state.deepseekConfig[key] = value
      }
    }
  },
  actions: {
    loadSettings({ commit }) {
      return new Promise((resolve) => {
        chrome.storage.sync.get(null, (result) => {
          if (result.isEnabled !== undefined) commit('setEnabled', result.isEnabled)
          if (result.targetLanguage) commit('setTargetLanguage', result.targetLanguage)
          if (result.sourceLanguage) commit('setSourceLanguage', result.sourceLanguage)
          if (result.translationEngine) commit('setTranslationEngine', result.translationEngine)
          if (result.translationStyle) commit('setTranslationStyle', result.translationStyle)
          if (result.excludedTags) commit('setExcludedTags', result.excludedTags)
          if (result.excludedClasses) commit('setExcludedClasses', result.excludedClasses)
          if (result.excludedUrls) commit('setExcludedUrls', result.excludedUrls)
          if (result.customCss) commit('setCustomCss', result.customCss)
          if (result.openaiModel) commit('setOpenaiModel', result.openaiModel)
          if (result.enableInputSpaceTranslation !== undefined) commit('setEnableInputSpaceTranslation', result.enableInputSpaceTranslation)
          if (result.apiKeys) commit('setApiKeys', result.apiKeys)
          
          // 加载AI配置项
          if (result.openaiConfig) commit('setOpenaiConfig', result.openaiConfig)
          if (result.deepseekConfig) commit('setDeepseekConfig', result.deepseekConfig)
          
          // 如果没有新的配置但有老的model，兼容处理
          if (!result.openaiConfig && result.openaiModel) {
            commit('updateOpenaiConfig', { key: 'model', value: result.openaiModel })
          }
          
          resolve()
        })
      })
    },
    saveSettings({ state }) {
      chrome.storage.sync.set({
        isEnabled: state.isEnabled,
        targetLanguage: state.targetLanguage,
        sourceLanguage: state.sourceLanguage,
        translationEngine: state.translationEngine,
        translationStyle: state.translationStyle,
        excludedTags: state.excludedTags,
        excludedClasses: state.excludedClasses,
        excludedUrls: state.excludedUrls,
        customCss: state.customCss,
        openaiModel: state.openaiModel,
        enableInputSpaceTranslation: state.enableInputSpaceTranslation,
        apiKeys: state.apiKeys,
        // 保存AI配置项
        openaiConfig: state.openaiConfig,
        deepseekConfig: state.deepseekConfig
      })
      
      // 向当前活动标签发送更新设置的消息
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSettings',
            settings: state
          })
        }
      })
      
      // 向background.js发送API密钥更新消息，确保API密钥也在后台脚本中更新
      if (state.apiKeys && state.apiKeys.deepseek) {
        chrome.runtime.sendMessage({
          action: 'setApiKey',
          type: 'deepseek',
          key: state.apiKeys.deepseek
        })
      }
      
      // 向background.js发送OpenAI API密钥更新消息
      if (state.apiKeys && state.apiKeys.openai) {
        chrome.runtime.sendMessage({
          action: 'setApiKey',
          type: 'openai',
          key: state.apiKeys.openai
        })
      }
    },
    toggleTranslation({ commit, state, dispatch }) {
      commit('setEnabled', !state.isEnabled)
      dispatch('saveSettings')
      
      // 通知当前页面切换翻译状态
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'toggleTranslation', 
          isEnabled: state.isEnabled 
        })
      })
    }
  }
}) 