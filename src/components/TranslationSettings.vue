<template>
  <div class="translation-settings">
    <div class="settings-group">
      <div class="language-selector">
        <div class="source-lang">
          <el-select v-model="sourceLang" size="large" class="dark-select">
            <el-option :label="$t('auto_detect')" value="auto"></el-option>
            <el-option :label="$t('chinese')" value="zh-CN"></el-option>
            <el-option :label="$t('english')" value="en"></el-option>
            <el-option :label="$t('japanese')" value="ja"></el-option>
            <el-option :label="$t('korean')" value="ko"></el-option>
            <el-option :label="$t('french')" value="fr"></el-option>
            <el-option :label="$t('german')" value="de"></el-option>
            <el-option :label="$t('spanish')" value="es"></el-option>
            <el-option :label="$t('russian')" value="ru"></el-option>
          </el-select>
          <div class="label">{{ $t('source_language') }}</div>
        </div>
        <div class="direction-arrow">→</div>
        <div class="target-lang">
          <el-select v-model="targetLang" size="large" class="dark-select">
            <el-option :label="$t('chinese')" value="zh-CN"></el-option>
            <el-option :label="$t('english')" value="en"></el-option>
            <el-option :label="$t('japanese')" value="ja"></el-option>
            <el-option :label="$t('korean')" value="ko"></el-option>
            <el-option :label="$t('french')" value="fr"></el-option>
            <el-option :label="$t('german')" value="de"></el-option>
            <el-option :label="$t('spanish')" value="es"></el-option>
            <el-option :label="$t('russian')" value="ru"></el-option>
          </el-select>
          <div class="label">{{ $t('target_language') }}</div>
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="ui-language-selector">
        <div class="setting-label">{{ $t('ui_language') }}</div>
        <el-select v-model="uiLanguage" size="large" class="dark-select" @change="changeUiLanguage">
          <el-option label="简体中文" value="zh-CN">
            <div class="option-with-icon">
              <span>简体中文</span>
            </div>
          </el-option>
          <el-option label="English" value="en">
            <div class="option-with-icon">
              <span>English</span>
            </div>
          </el-option>
          <el-option label="日本語" value="ja">
            <div class="option-with-icon">
              <span>日本語</span>
            </div>
          </el-option>
          <el-option label="한국어" value="ko">
            <div class="option-with-icon">
              <span>한국어</span>
            </div>
          </el-option>
        </el-select>
      </div>
    </div>

    <div class="settings-group">
      <div class="service-selector">
        <div class="setting-label">{{ $t('translation_service') }}</div>
        <el-select v-model="transEngine" size="large" class="dark-select">
          <el-option label="Microsoft API" value="microsoftapi">
            <div class="option-with-icon">
              <span>Microsoft API</span>
            </div>
          </el-option>
          <el-option label="Microsoft Edge" value="microsoft">
            <div class="option-with-icon">
              <span>Microsoft Edge</span>
            </div>
          </el-option>
          <el-option label="Google" value="google">
            <div class="option-with-icon">
              <span>Google</span>
            </div>
          </el-option>
          <el-option label="DeepSeek (Pro)" value="deepseek">
            <div class="option-with-icon">
              <span>DeepSeek</span>
            </div>
          </el-option>
        </el-select>
      </div>
    </div>

    <div class="settings-group">
      <div class="ai-mode">
        <div class="setting-label">{{ $t('display_type') }}</div>
        <el-select v-model="transStyle" size="large" class="dark-select">
          <el-option :label="$t('inline')" value="inline"></el-option>
          <el-option :label="$t('general')" value="tip"></el-option>
          <el-option :label="$t('replace')" value="replace"></el-option>
          <el-option :label="$t('bilingual_above')" value="bilingual"></el-option>
          <el-option :label="$t('bilingual_below')" value="below"></el-option>
          <el-option :label="$t('hover')" value="hover"></el-option>
        </el-select>
      </div>
    </div>

    <div class="translate-button">
      <button @click="toggleTranslation">{{ $t('toggle_translation') }} <span class="shortcut-hint">⌥A</span></button>
    </div>

    <div class="settings-group" style="margin-bottom: 0">
      <div class="toggle-container">
        <span>{{ $t('translation_toggle') }}</span>
        <el-switch v-model="isTranslationEnabled" active-color="#13ce66" inactive-color="#ff4949"
          @change="toggleTranslation"></el-switch>
      </div>
    </div>

    <!-- <div class="settings-group" style="margin: 0;">
      <el-collapse v-model="activeCollapse">
        <el-collapse-item :title="$t('advanced_settings')" name="advanced">
          <div class="advanced-settings">
            <el-form label-position="top" size="small">
              <el-form-item :label="$t('excluded_tags')">
                <el-select v-model="excludedTags" multiple :placeholder="$t('excluded_tags_placeholder')"
                  @change="saveExcludedTags">
                  <el-option :label="$t('tag_code')" value="code"></el-option>
                  <el-option :label="$t('tag_pre')" value="pre"></el-option>
                  <el-option :label="$t('tag_script')" value="script"></el-option>
                  <el-option :label="$t('tag_style')" value="style"></el-option>
                  <el-option :label="$t('tag_headings')" value="h1,h2,h3,h4,h5,h6"></el-option>
                  <el-option :label="$t('tag_links')" value="a"></el-option>
                </el-select>
              </el-form-item>

              <el-form-item :label="$t('excluded_classes')">
                <el-input v-model="excludedClassesStr" :placeholder="$t('excluded_classes_placeholder')"
                  @change="saveExcludedClasses"></el-input>
              </el-form-item>

              <el-form-item :label="$t('custom_css')">
                <el-input type="textarea" v-model="customCss" :placeholder="$t('custom_css_placeholder')" rows="3"
                  @change="saveCustomCss"></el-input>
              </el-form-item>
            </el-form>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div> -->


  </div>
</template>

<script>
import { mapState, mapActions, mapMutations } from 'vuex'

export default {
  name: 'TranslationSettings',
  data() {
    return {
      activeCollapse: [],
      excludedClassesStr: '',
      uiLanguage: localStorage.getItem('transor-ui-language') || 'zh-CN', // 默认使用简体中文
      i18n: null // 保存i18n实例
    }
  },
  computed: {
    ...mapState([
      'isEnabled',
      'excludedTags',
      'excludedClasses',
      'customCss'
    ]),
    isTranslationEnabled: {
      get() {
        return this.isEnabled
      },
      set() {
        // 通过toggleTranslation操作来修改
      }
    },
    targetLang: {
      get() {
        return this.$store.state.targetLanguage;
      },
      set(value) {
        this.$store.commit('setTargetLanguage', value);
        this.saveSettings();
      }
    },
    sourceLang: {
      get() {
        return this.$store.state.sourceLanguage;
      },
      set(value) {
        this.$store.commit('setSourceLanguage', value);
        this.saveSettings();
      }
    },
    transEngine: {
      get() {
        return this.$store.state.translationEngine;
      },
      set(value) {
        this.$store.commit('setTranslationEngine', value);
        this.saveSettings();
      }
    },
    transStyle: {
      get() {
        return this.$store.state.translationStyle;
      },
      set(value) {
        this.$store.commit('setTranslationStyle', value);
        this.saveSettings();
      }
    }
  },
  methods: {
    ...mapActions([
      'saveSettings',
      'toggleTranslation'
    ]),
    ...mapMutations([
      'setExcludedTags',
      'setExcludedClasses',
      'setCustomCss'
    ]),
    // 处理键盘快捷键
    handleKeyboardShortcut(event) {
      // 记录按键信息以便调试
      console.log('键盘事件:', {
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
        altKey: event.altKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey
      });

      // Mac系统上Option+A可能会被解释为特殊字符，所以检查多种可能的情况
      const isAltAPressed =
        // 标准检测方式
        (event.altKey && (event.key === 'a' || event.key === 'A')) ||
        // Mac上Option+A可能生成的特殊字符
        (event.key === 'å' || event.key === 'Å') ||
        // 使用keyCode检测 (65是字母A的keyCode)
        (event.altKey && event.keyCode === 65);

      if (isAltAPressed) {
        console.log('检测到快捷键 ⌥A (Option+A)');
        // 阻止默认行为，以防止特殊字符输入
        event.preventDefault();

        this.toggleTranslation();

        // 给翻译按钮添加视觉反馈
        const translateButton = document.querySelector('.translate-button button');
        if (translateButton) {
          translateButton.classList.add('active');
          setTimeout(() => {
            translateButton.classList.remove('active');
          }, 150);
        }
      }
    },
    // 翻译辅助函数
    $t(key) {
      // 如果 Vue 的 i18n 实例存在，使用它
      if (this.$i18n && this.$i18n.t) {
        return this.$i18n.t(key);
      }

      // 否则尝试使用全局 i18n 对象
      if (window.i18n && window.i18n.t) {
        return window.i18n.t(key);
      }

      // 如果都没有，尝试从本地数据获取
      if (this.i18n && typeof this.i18n.t === 'function') {
        return this.i18n.t(key);
      }

      // 最后回退到当前组件上下文中的直接键值查找
      // 这里作为最后的回退策略，可以在组件中定义简单的本地翻译对象
      const translations = {
        'zh-CN': {
          'source_language': '翻译语言',
          'target_language': '目标语言',
          'translation_service': '翻译服务：',
          'display_type': '显示类型：',
          'ui_language': '界面语言：',
          'translation_toggle': '翻译开关',
          'toggle_translation': '开启/关闭翻译',
          'advanced_settings': '高级设置',
          'inline': '双语(原文后方显示译文)',
          'general': '导航提示(适合菜单和小元素)',
          'replace': '替换(仅显示译文)',
          'bilingual_above': '双语(原文上方显示译文)',
          'bilingual_below': '双语(原文下方显示译文)',
          'hover': '悬浮(鼠标悬停显示译文)',
          // 其他基本翻译...
        },
        'en': {
          'source_language': 'Source Language',
          'target_language': 'Target Language',
          'translation_service': 'Translation Service:',
          'display_type': 'Display Type:',
          'ui_language': 'Interface Language:',
          'translation_toggle': 'Translation Toggle',
          'toggle_translation': 'Enable/Disable Translation',
          'advanced_settings': 'Advanced Settings',
          'inline': 'Bilingual (Translation after Original)',
          'general': 'Smart Tooltips (For Menus & Small Elements)',
          'replace': 'Replace (Translation Only)',
          'bilingual_above': 'Bilingual (Translation Above)',
          'bilingual_below': 'Bilingual (Translation Below)',
          'hover': 'Hover (Show on Mouse Over)',
          // 其他基本翻译...
        }
      };

      // 获取当前语言的翻译
      const lang = this.uiLanguage || 'zh-CN';
      return translations[lang] && translations[lang][key] ? translations[lang][key] : key;
    },
    translateCurrentPage() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'translate' })
      })
    },
    saveExcludedTags() {
      this.saveSettings()
    },
    saveExcludedClasses() {
      this.setExcludedClasses(this.excludedClassesStr.split(',').map(cls => cls.trim()).filter(cls => cls))
      this.saveSettings()
    },
    saveCustomCss() {
      this.setCustomCss(this.customCss)
      this.saveSettings()
    },
    // 新增界面语言切换方法
    changeUiLanguage(language) {
      console.log(`切换界面语言为: ${language}`);
      // 保存用户的界面语言首选项到本地存储
      localStorage.setItem('transor-ui-language', language);

      // 使用更安全的方式保存语言设置
      const saveLanguageSetting = () => {
        // 首先直接尝试通过storage API设置
        try {
          console.log(`直接保存界面语言到storage: ${language}`);
          chrome.storage.local.set({ 'transor-ui-language': language }, () => {
            if (chrome.runtime.lastError) {
              console.warn('直接设置语言失败:', chrome.runtime.lastError);
            } else {
              console.log('界面语言已直接保存到storage');
            }
          });
        } catch (e) {
          console.error('直接设置语言异常:', e.message);
        }
        
        // 然后也尝试通过background脚本设置
        try {
          console.log(`通过background设置界面语言: ${language}`);
          chrome.runtime.sendMessage({ 
            action: 'set-language', 
            language: language 
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
      };
      
      // 尝试保存设置
      saveLanguageSetting();
      
      // 立即应用本地语言设置
      this.uiLanguage = language;
      this.loadLanguageResources(language);
      
      // 触发事件通知应用语言已更改
      this.$emit('language-changed', language);
    },
    loadLanguageResources(language) {
      console.log(`正在加载${language}语言资源...`);

      // 如果在Vue应用中，尝试使用Vue的i18n系统
      if (this.$i18n && typeof this.$i18n.locale === 'string') {
        this.$i18n.locale = language;
      }

      // 如果有全局i18n对象，使用它来设置语言
      if (window.i18n && typeof window.i18n.setLanguage === 'function') {
        window.i18n.setLanguage(language);
      }

      // 强制组件重新渲染
      this.$forceUpdate();
    }
  },
  watch: {
    excludedClasses: {
      handler(newVal) {
        this.excludedClassesStr = newVal.join(', ')
      },
      immediate: true
    }
  },
  created() {
    this.$store.dispatch('loadSettings');

    // 从localStorage中获取已保存的界面语言设置
    const savedLanguage = localStorage.getItem('transor-ui-language');
    if (savedLanguage) {
      this.uiLanguage = savedLanguage;
      this.loadLanguageResources(savedLanguage);
    }

    // 检查全局i18n是否已可用
    if (window.i18n) {
      this.i18n = window.i18n;
    } else {
      // 尝试加载浏览器扩展的i18n
      try {
        if (chrome && chrome.i18n) {
          // 创建简单的包装器匹配我们的i18n接口
          this.i18n = {
            t: (key) => chrome.i18n.getMessage(key) || key
          };
        }
      } catch (e) {
        console.warn('无法加载chrome.i18n:', e);
      }
    }
  },
  mounted() {
    // 添加全局快捷键监听
    document.addEventListener('keydown', this.handleKeyboardShortcut);

    // 发送消息给后台脚本，通知它设置全局快捷键
    try {
      chrome.runtime.sendMessage({
        action: "registerShortcut",
        shortcut: "altA"
      }, (response) => {
        console.log('注册全局快捷键响应:', response);
      });
    } catch (error) {
      console.error('注册全局快捷键失败:', error);
    }

    // 监听来自后台的快捷键消息
    try {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'shortcutTriggered' && message.shortcut === 'altA') {
          console.log('接收到后台快捷键触发消息');
          this.toggleTranslation();
        }
        return true;
      });
    } catch (error) {
      console.error('设置快捷键消息监听失败:', error);
    }
  },
  beforeDestroy() {
    // 移除全局快捷键监听
    document.removeEventListener('keydown', this.handleKeyboardShortcut);
  }
}
</script>

<style scoped>
.translation-settings {
  color: #333;
  margin: 0 auto;
}

.settings-group {
  margin-bottom: 30px;
}

.language-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.source-lang,
.target-lang {
  flex: 1;
  position: relative;
}

.direction-arrow {
  color: #aaa;
  font-size: 16px;
  margin: -20px 2px 0 2px;
}

.service-selector,
.ai-mode {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-label {
  color: #666;
  font-size: 14px;
  white-space: nowrap;
}

.label {
  font-size: 12px;
  color: #999;
  margin-top: 3px;
}

.translate-button {
  margin-top: 16px;
  margin-bottom: 16px;
  perspective: 1000px;
  border-radius: 8px;
  overflow: hidden;
}

.translate-button button {
  width: 100%;
  padding: 12px 0;
  background: linear-gradient(45deg, #ff5588, #ff3377, #ff6699);
  background-size: 200% 200%;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 83, 136, 0.2);
  position: relative;
  overflow: hidden;
  letter-spacing: 0.5px;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.1);
  animation: gradientShift 5s ease infinite;
}

.translate-button button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 15px rgba(255, 83, 136, 0.4);
}

.translate-button button:active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(255, 83, 136, 0.3);
  background-size: 100% 100%;
  background-position: 0% 0%;
  opacity: 0.9;
}

.translate-button button.active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(255, 83, 136, 0.3);
  background-size: 100% 100%;
  background-position: 0% 0%;
  opacity: 0.9;
}

.translate-button button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shine 1.5s infinite;
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

@keyframes shine {
  0% {
    left: -100%;
  }

  100% {
    left: 100%;
  }
}

.option-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #555;
}

.pro-tag {
  font-size: 10px;
  background-color: #facc15;
  color: #000;
  border-radius: 3px;
  padding: 0 3px;
  margin-left: 5px;
}

.toggle-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.shortcut-hint {
  font-size: 12px;
  opacity: 0.8;
  font-weight: normal;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  display: inline-block;
  vertical-align: middle;
}

.advanced-settings {
  margin-top: 10px;
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.dark-select) {
  width: 100%;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-input__wrapper) {
  background-color: #ffffff !important;
  border: 1px solid #ddd !important;
  box-shadow: none !important;
  border-radius: 6px;
}

:deep(.el-input__wrapper:hover) {
  border-color: #ff5588 !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #ff5588 !important;
  box-shadow: 0 0 0 1px rgba(255, 85, 136, 0.2) !important;
}

:deep(.el-input__inner) {
  color: #333 !important;
  height: 36px;
}

:deep(.el-select-dropdown) {
  background-color: #fff !important;
  /* border: 1px solid #eee !important; */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1) !important;
}

:deep(.el-select-dropdown__item) {
  color: #666 !important;
}

:deep(.el-select-dropdown__item.hover),
:deep(.el-select-dropdown__item:hover) {
  background-color: #fff5f8 !important;
}

:deep(.el-select-dropdown__item.selected) {
  color: #ff5588 !important;
  font-weight: 600;
  background-color: #fff0f5 !important;
}

:deep(.el-icon) {
  color: #999 !important;
}

:deep(.el-icon:hover) {
  color: #ff5588 !important;
}

:deep(.el-collapse) {
  border-bottom: none;
}

:deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

:deep(.el-collapse-item__header) {
  border-bottom: none;
}

:deep(.el-collapse-item__content) {
  padding-bottom: 0;
}

.ui-language-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>