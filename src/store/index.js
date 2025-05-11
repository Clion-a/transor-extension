import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    isEnabled: false,
    targetLanguage: 'zh-CN',
    sourceLanguage: 'auto',
    translationEngine: 'google',
    translationStyle: 'inline',
    excludedTags: ['code', 'pre', 'script', 'style'],
    excludedClasses: ['no-translate'],
    excludedUrls: [],
    customCss: '',
    apiKeys: {
      microsoftapi: '',
      microsoft: '',
      deepseek: ''
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
    setApiKey(state, { type, key }) {
      if (!state.apiKeys) {
        state.apiKeys = {}
      }
      state.apiKeys[type] = key
    },
    setApiKeys(state, apiKeys) {
      state.apiKeys = apiKeys
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
          if (result.apiKeys) commit('setApiKeys', result.apiKeys)
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
        apiKeys: state.apiKeys
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