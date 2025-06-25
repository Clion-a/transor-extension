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
        <el-select class="trans-engine-select dark-select" v-model="transEngine" size="large" @change="handleEngineChange">
          <!-- 高级模型分组 -->
          <el-option-group label="高级模型">
            <el-option 
              label="ChatGPT-4o" 
              value="chatgpt-4o" 
              :disabled="!isPremiumUser"
              @click.native="handlePremiumOptionClick('chatgpt-4o')">
              <div class="option-with-icon">
                <span>ChatGPT-4o</span>
                <span class="pro-tag">Pro</span>
              </div>
            </el-option>
            <el-option 
              label="ChatGPT-4o-mini" 
              value="chatgpt-4o-mini" 
              :disabled="!isPremiumUser"
              @click.native="handlePremiumOptionClick('chatgpt-4o-mini')">
              <div class="option-with-icon">
                <span>ChatGPT-4o-mini</span>
                <span class="pro-tag">Pro</span>
              </div>
            </el-option>
            <el-option 
              label="DeepSeek-V3" 
              value="deepseek-v3" 
              :disabled="!isPremiumUser"
              @click.native="handlePremiumOptionClick('deepseek-v3')">
              <div class="option-with-icon">
                <span>DeepSeek-V3</span>
                <span class="pro-tag">Pro</span>
              </div>
            </el-option>
            <el-option 
              label="Gemini-2.0-flash" 
              value="gemini-2-flash" 
              :disabled="!isPremiumUser"
              @click.native="handlePremiumOptionClick('gemini-2-flash')">
              <div class="option-with-icon">
                <span>Gemini-2.0-flash</span>
                <span class="pro-tag">Pro</span>
              </div>
            </el-option>
            <el-option 
              label="DeepL" 
              value="deepl" 
              :disabled="!isPremiumUser"
              @click.native="handlePremiumOptionClick('deepl')">
              <div class="option-with-icon">
                <span>DeepL</span>
                <span class="pro-tag">Pro</span>
              </div>
            </el-option>
          </el-option-group>

          <!-- 普通模型分组 -->
          <el-option-group label="普通模型">
            <el-option v-if="serviceStates.microsoft" label="Microsoft Edge" value="microsoft">
              <div class="option-with-icon">
                <span>Microsoft Edge</span>
              </div>
            </el-option>
            <el-option v-if="serviceStates.microsoftapi" label="Microsoft API" value="microsoftapi">
              <div class="option-with-icon">
                <span>Microsoft API</span>
              </div>
            </el-option>
            <el-option v-if="serviceStates.google" label="Google" value="google">
              <div class="option-with-icon">
                <span>Google</span>
              </div>
            </el-option>
          </el-option-group>

          <!-- 其他/自定义分组 -->
          <el-option-group label="其他/自定义">
            <el-option v-if="serviceStates.openai" label="OpenAI" value="openai">
              <div class="option-with-icon">
                <span>OpenAI</span>
              </div>
            </el-option>
            <el-option v-if="serviceStates.deepseek" label="DeepSeek" value="deepseek">
              <div class="option-with-icon">
                <span>DeepSeek</span>
              </div>
            </el-option>
          </el-option-group>
        </el-select>
      </div>

      <!-- 提示设置API Key的消息和链接 -->
      <div class="api-key-notice" v-if="showApiKeyNotice">
        <div class="api-key-notice-message">
          <i class="el-icon-warning-outline"></i>
          {{ isHighPriorityEngine(transEngine) ? $t('premiumLoginRequired') : $t('apiKeyRequired') }} 
          <a href="#" @click="isHighPriorityEngine(transEngine) ? openProfilePage() : openOptionsPage()">
            {{ isHighPriorityEngine(transEngine) ? $t('goToProfile') : $t('goToSettings') }}
          </a>
        </div>
      </div>
    </div>

    <!-- 只保留AI专家策略设置，移除DeepSeek和OpenAI的API密钥和模型相关部分 -->
    <div class="settings-group" v-if="transEngine === 'deepseek' && showAiExpertStrategy">
      <!-- 添加高级DeepSeek设置 -->
      <div class="api-key-input">
        <div class="setting-label">{{ $t('aiExpertStrategy') }}:</div>
        <el-select v-model="deepseekExpertStrategy" size="large" class="dark-select" @change="saveDeepseekConfig">
          <el-option v-if="isExpertVisible('universal')" :label="$t('universal')" value="universal"></el-option>
          <el-option v-if="isExpertVisible('smart-choice')" :label="$t('smartChoice')" value="smart-choice"></el-option>
          <el-option v-if="isExpertVisible('translation-master')" :label="$t('translationMaster')" value="translation-master"></el-option>
          <el-option v-if="isExpertVisible('paragraph-expert')" :label="$t('paragraphExpert')" value="paragraph-expert"></el-option>
          <el-option v-if="isExpertVisible('english-simplifier')" :label="$t('englishSimplifier')" value="english-simplifier"></el-option>
          <el-option v-if="isExpertVisible('twitter-enhancer')" :label="$t('twitterEnhancer')" value="twitter-enhancer"></el-option>
          <el-option v-if="isExpertVisible('tech-translator')" :label="$t('techTranslator')" value="tech-translator"></el-option>
          <el-option v-if="isExpertVisible('reddit-enhancer')" :label="$t('redditEnhancer')" value="reddit-enhancer"></el-option>
          <el-option v-if="isExpertVisible('academic-translator')" :label="$t('academicTranslator')" value="academic-translator"></el-option>
          <el-option v-if="isExpertVisible('news-translator')" :label="$t('newsTranslator')" value="news-translator"></el-option>
          <el-option v-if="isExpertVisible('music-expert')" :label="$t('musicExpert')" value="music-expert"></el-option>
          <el-option v-if="isExpertVisible('medical-translator')" :label="$t('medicalTranslator')" value="medical-translator"></el-option>
          <el-option v-if="isExpertVisible('legal-translator')" :label="$t('legalTranslator')" value="legal-translator"></el-option>
          <el-option v-if="isExpertVisible('github-enhancer')" :label="$t('githubEnhancer')" value="github-enhancer"></el-option>
          <el-option v-if="isExpertVisible('gaming-translator')" :label="$t('gamingTranslator')" value="gaming-translator"></el-option>
          <el-option v-if="isExpertVisible('ecommerce-translator')" :label="$t('ecommerceTranslator')" value="ecommerce-translator"></el-option>
          <el-option v-if="isExpertVisible('finance-translator')" :label="$t('financeTranslator')" value="finance-translator"></el-option>
          <el-option v-if="isExpertVisible('novel-translator')" :label="$t('novelTranslator')" value="novel-translator"></el-option>
          <el-option v-if="isExpertVisible('ao3-translator')" :label="$t('ao3Translator')" value="ao3-translator"></el-option>
          <el-option v-if="isExpertVisible('ebook-translator')" :label="$t('ebookTranslator')" value="ebook-translator"></el-option>
          <el-option v-if="isExpertVisible('designer')" :label="$t('designer')" value="designer"></el-option>
          <el-option v-if="isExpertVisible('cn-en-polisher')" :label="$t('cnEnPolisher')" value="cn-en-polisher"></el-option>
          <el-option v-if="isExpertVisible('web3-translator')" :label="$t('web3Translator')" value="web3-translator"></el-option>
          <el-option v-if="isExpertVisible('literal-expert')" :label="$t('literalExpert')" value="literal-expert"></el-option>
          <el-option v-if="isExpertVisible('context-analyzer')" :label="$t('contextAnalyzer')" value="context-analyzer"></el-option>
          <el-option v-if="isExpertVisible('cultural-adapter')" :label="$t('culturalAdapter')" value="cultural-adapter"></el-option>
        </el-select>
      </div>
    </div>

    <!-- 只保留AI专家策略设置，移除OpenAI的API密钥和模型相关部分 -->
    <div class="settings-group" v-if="transEngine === 'openai' && showAiExpertStrategy">
      <!-- 添加高级OpenAI设置 -->
      <div class="api-key-input">
        <div class="setting-label">{{ $t('aiExpertStrategy') }}:</div>
        <el-select v-model="openaiExpertStrategy" size="large" class="dark-select" @change="saveOpenaiConfig">
          <el-option v-if="isExpertVisible('universal')" :label="$t('universal')" value="universal"></el-option>
          <el-option v-if="isExpertVisible('smart-choice')" :label="$t('smartChoice')" value="smart-choice"></el-option>
          <el-option v-if="isExpertVisible('translation-master')" :label="$t('translationMaster')" value="translation-master"></el-option>
          <el-option v-if="isExpertVisible('paragraph-expert')" :label="$t('paragraphExpert')" value="paragraph-expert"></el-option>
          <el-option v-if="isExpertVisible('english-simplifier')" :label="$t('englishSimplifier')" value="english-simplifier"></el-option>
          <el-option v-if="isExpertVisible('twitter-enhancer')" :label="$t('twitterEnhancer')" value="twitter-enhancer"></el-option>
          <el-option v-if="isExpertVisible('tech-translator')" :label="$t('techTranslator')" value="tech-translator"></el-option>
          <el-option v-if="isExpertVisible('reddit-enhancer')" :label="$t('redditEnhancer')" value="reddit-enhancer"></el-option>
          <el-option v-if="isExpertVisible('academic-translator')" :label="$t('academicTranslator')" value="academic-translator"></el-option>
          <el-option v-if="isExpertVisible('news-translator')" :label="$t('newsTranslator')" value="news-translator"></el-option>
          <el-option v-if="isExpertVisible('music-expert')" :label="$t('musicExpert')" value="music-expert"></el-option>
          <el-option v-if="isExpertVisible('medical-translator')" :label="$t('medicalTranslator')" value="medical-translator"></el-option>
          <el-option v-if="isExpertVisible('legal-translator')" :label="$t('legalTranslator')" value="legal-translator"></el-option>
          <el-option v-if="isExpertVisible('github-enhancer')" :label="$t('githubEnhancer')" value="github-enhancer"></el-option>
          <el-option v-if="isExpertVisible('gaming-translator')" :label="$t('gamingTranslator')" value="gaming-translator"></el-option>
          <el-option v-if="isExpertVisible('ecommerce-translator')" :label="$t('ecommerceTranslator')" value="ecommerce-translator"></el-option>
          <el-option v-if="isExpertVisible('finance-translator')" :label="$t('financeTranslator')" value="finance-translator"></el-option>
          <el-option v-if="isExpertVisible('novel-translator')" :label="$t('novelTranslator')" value="novel-translator"></el-option>
          <el-option v-if="isExpertVisible('ao3-translator')" :label="$t('ao3Translator')" value="ao3-translator"></el-option>
          <el-option v-if="isExpertVisible('ebook-translator')" :label="$t('ebookTranslator')" value="ebook-translator"></el-option>
          <el-option v-if="isExpertVisible('designer')" :label="$t('designer')" value="designer"></el-option>
          <el-option v-if="isExpertVisible('cn-en-polisher')" :label="$t('cnEnPolisher')" value="cn-en-polisher"></el-option>
          <el-option v-if="isExpertVisible('web3-translator')" :label="$t('web3Translator')" value="web3-translator"></el-option>
          <el-option v-if="isExpertVisible('literal-expert')" :label="$t('literalExpert')" value="literal-expert"></el-option>
          <el-option v-if="isExpertVisible('context-analyzer')" :label="$t('contextAnalyzer')" value="context-analyzer"></el-option>
          <el-option v-if="isExpertVisible('cultural-adapter')" :label="$t('culturalAdapter')" value="cultural-adapter"></el-option>
        </el-select>
      </div>
    </div>

    <div class="settings-group">
      <div class="ai-mode">
        <div class="setting-label">{{ $t('display_type') }}</div>
        <el-select v-model="transStyle" size="large" class="dark-select">
          <el-option :label="$t('universal_style')" value="universal_style"></el-option>
          <el-option :label="$t('replace')" value="replace"></el-option>
          <el-option :label="$t('inline')" value="inline"></el-option>
          <el-option :label="$t('bilingual_below')" value="bilingual"></el-option>
        </el-select>
      </div>
    </div>

    <div class="translate-button">
      <button @click="toggleTranslation">{{ $t('toggle_translation') }} <span class="shortcut-hint">⌥A</span></button>
    </div>

    <!-- <div class="translate-tips">
      <div class="tip-item">
        <div class="tip-icon">💡</div>
        <div class="tip-text">{{ $t('input_triple_space_tip') }}</div>
      </div>
    </div> -->

    <div class="settings-group" style="margin-bottom: 0">
      <div class="toggle-container">
        <span>{{ $t('translation_toggle') }}</span>
        <el-switch v-model="isTranslationEnabled" active-color="#13ce66" inactive-color="#ff4949"
          @change="toggleTranslation"></el-switch>
      </div>
      <!-- <div class="toggle-container">
        <span>{{ $t('input_space_translation_toggle') }}</span>
        <el-switch v-model="enableInputSpaceTranslation" active-color="#13ce66" inactive-color="#ff4949"
          @change="toggleInputSpaceTranslation"></el-switch>
      </div> -->
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
      i18n: null, // 保存i18n实例
      showApiKeyNotice: false, // 是否显示API Key提示
      serviceStates: {
        microsoftapi: true,
        microsoft: true,
        google: true,
        openai: true,
        deepseek: true
      }, // 各服务的启用状态
      storageListener: null, // storage 变化监听器
      aiExpertVisibility: {}, // AI专家显示状态
      userInfo: null, // 添加用户信息
      isPremiumUser: false, // 是否为会员用户
    }
  },
  computed: {
    ...mapState([
      'isEnabled',
      'excludedTags',
      'excludedClasses',
      'customCss',
      'openaiConfig',
      'deepseekConfig',
      'apiKeys'
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
    },
    enableInputSpaceTranslation: {
      get() {
        return this.$store.state.enableInputSpaceTranslation;
      },
      set(value) {
        this.$store.commit('setEnableInputSpaceTranslation', value);
        this.saveSettings();
      }
    },
    openaiModel: {
      get() {
        // 如果有openaiConfig，从中获取
        if (this.$store.state.openaiConfig) {
          return this.$store.state.openaiConfig.model;
        }
        // 否则使用旧的字段
        return this.$store.state.openaiModel;
      },
      set(value) {
        // 保持旧字段兼容
        this.$store.commit('setOpenaiModel', value);
        
        // 同时更新新的配置结构
        if (this.$store.state.openaiConfig) {
          this.$store.commit('updateOpenaiConfig', { key: 'model', value });
        }
      }
    },
    openaiExpertStrategy: {
      get() {
        return this.$store.state.openaiConfig && this.$store.state.openaiConfig.expertStrategy 
          ? this.$store.state.openaiConfig.expertStrategy 
          : 'translation-master';
      },
      set(value) {
        this.$store.commit('updateOpenaiConfig', { key: 'expertStrategy', value });
      }
    },
    openaiAiContext: {
      get() {
        return this.$store.state.openaiConfig && this.$store.state.openaiConfig.aiContext 
          ? this.$store.state.openaiConfig.aiContext 
          : false;
      },
      set(value) {
        this.$store.commit('updateOpenaiConfig', { key: 'aiContext', value });
      }
    },
    deepseekModel: {
      get() {
        return this.$store.state.deepseekConfig && this.$store.state.deepseekConfig.model
          ? this.$store.state.deepseekConfig.model
          : 'deepseek-chat';
      },
      set(value) {
        this.$store.commit('updateDeepseekConfig', { key: 'model', value });
      }
    },
    deepseekExpertStrategy: {
      get() {
        return this.$store.state.deepseekConfig && this.$store.state.deepseekConfig.expertStrategy
          ? this.$store.state.deepseekConfig.expertStrategy
          : 'translation-master';
      },
      set(value) {
        this.$store.commit('updateDeepseekConfig', { key: 'expertStrategy', value });
      }
    },
    deepseekAiContext: {
      get() {
        return this.$store.state.deepseekConfig && this.$store.state.deepseekConfig.aiContext
          ? this.$store.state.deepseekConfig.aiContext
          : false;
      },
      set(value) {
        this.$store.commit('updateDeepseekConfig', { key: 'aiContext', value });
      }
    },
    // 检查是否应该显示AI专家策略选择器
    showAiExpertStrategy() {
      const engine = this.transEngine;
      
      // 检查是否有对应的API Key
      if (engine === 'openai') {
        return this.apiKeys && this.apiKeys.openai && this.apiKeys.openai.trim() !== '';
      } else if (engine === 'deepseek') {
        return this.apiKeys && this.apiKeys.deepseek && this.apiKeys.deepseek.trim() !== '';
      }
      
      return false;
    },
    // 获取当前选择的AI引擎的专家策略
    currentAiExpertStrategy() {
      if (this.transEngine === 'openai' && this.openaiConfig) {
        return this.openaiConfig.expertStrategy || 'translation-master';
      } else if (this.transEngine === 'deepseek' && this.deepseekConfig) {
        return this.deepseekConfig.expertStrategy || 'translation-master';
      }
      return 'translation-master';
    },
  },
  methods: {
    ...mapActions([
      'saveSettings',
      'toggleTranslation'
    ]),
    ...mapMutations([
      'setExcludedTags',
      'setExcludedClasses',
      'setCustomCss',
      'setApiKey',
      'updateOpenaiConfig',
      'updateDeepseekConfig'
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
          'inline': '双语(原文后方显示译文)',
          'general': '导航提示(适合菜单和小元素)',
          'replace': '替换(仅显示译文)',
          'bilingual_below': '双语(原文下方显示译文)',
          'hover': '悬浮(鼠标悬停显示译文)',
          'deepseek_api_key': 'DeepSeek API密钥',
          'enter_deepseek_api_key': '请输入你的DeepSeek API密钥',
          'openai_api_key': 'OpenAI API密钥',
          'enter_openai_api_key': '请输入你的OpenAI API密钥',
          'openai_model': 'OpenAI模型',
          'input_triple_space_tip': '小技巧：在任意输入框中输入文本后，连续敲击三个空格可以立即翻译文本。按ESC键可取消翻译。',
          'input_space_translation_toggle': '输入框空格翻译',
          'apiKeyRequired': '需要设置API密钥才能使用此服务',
          'premiumLoginRequired': '高级模型需要登录才能使用',
          'goToSettings': '前往设置页面',
          'goToProfile': '前往个人资料页面',
          'aiExpertStrategy': 'AI专家策略',
          'translationMaster': '意译大师',
          'literalExpert': '直译专家',
          'contextAnalyzer': '语境分析师',
          'culturalAdapter': '文化适配师',
          'enableAiContext': '启用AI智能上下文',
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
          'inline': 'Bilingual (Translation after Original)',
          'general': 'Smart Tooltips (For Menus & Small Elements)',
          'replace': 'Replace (Translation Only)',
          'bilingual_below': 'Bilingual (Translation Below)',
          'hover': 'Hover (Show on Mouse Over)',
          'deepseek_api_key': 'DeepSeek API Key',
          'enter_deepseek_api_key': 'Enter your DeepSeek API Key',
          'openai_api_key': 'OpenAI API Key',
          'enter_openai_api_key': 'Enter your OpenAI API Key',
          'openai_model': 'OpenAI Model',
          'input_triple_space_tip': 'Tip: In any input field, after typing text, press space three times in a row to instantly translate the text. Press ESC to cancel translation.',
          'input_space_translation_toggle': 'Input Space Translation',
          'apiKeyRequired': 'API Key is required to use this service',
          'premiumLoginRequired': 'Premium models require login to use',
          'goToSettings': 'Go to Settings',
          'goToProfile': 'Go to Profile Page',
          'aiExpertStrategy': 'AI Expert Strategy',
          'translationMaster': 'Translation Master',
          'literalExpert': 'Literal Expert',
          'contextAnalyzer': 'Context Analyzer',
          'culturalAdapter': 'Cultural Adapter',
          'enableAiContext': 'Enable AI Context',
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
    },
    // 处理专家策略变化
    handleExpertStrategyChange(strategy) {
      const engine = this.transEngine;
      
      if (engine === 'openai') {
        this.updateOpenaiConfig({ key: 'expertStrategy', value: strategy });
      } else if (engine === 'deepseek') {
        this.updateDeepseekConfig({ key: 'expertStrategy', value: strategy });
      }
      
      this.saveSettings();
    },
    // 处理高级模型选项点击
    handlePremiumOptionClick(option) {
      // 允许用户选择高级模型，即使他们不是会员
      // 这样他们可以看到自己的选择，并在需要时升级
      console.log(`用户选择了高级模型: ${option}`);
      
      // 如果用户不是会员，可以在实际使用时提示
      if (!this.userInfo || !this.isPremiumUser) {
        console.log('用户不是会员，但允许选择高级模型');
      }
    },
    // 调整handleEngineChange方法
    handleEngineChange() {
      const engine = this.transEngine;
      
      // 重置API Key提示状态
      this.showApiKeyNotice = false;
      
      // 检查是否为高级模型
      const premiumEngines = ['chatgpt-4o', 'chatgpt-4o-mini', 'deepseek-v3', 'gemini-2-flash', 'deepl'];
      
      if (premiumEngines.includes(engine)) {
        // 对于高级模型，检查用户登录状态
        chrome.storage.local.get(['authToken'], (result) => {
          if (!result.authToken) {
            console.log('高级模型需要登录，显示登录提示');
            this.showApiKeyNotice = true;
          } else if (!this.userInfo || !this.isPremiumUser) {
            console.log('高级模型需要会员，显示升级提示');
            this.showApiKeyNotice = true;
          }
        });
      } else if (engine === 'openai' || engine === 'deepseek') {
        // 检查传统AI引擎是否需要API Key
        const apiKey = this.apiKeys && this.apiKeys[engine];
        
        if (!apiKey || apiKey.trim() === '') {
          // 没有API Key，显示提示
          this.showApiKeyNotice = true;
        }
      }
      
      // 保存设置（即使是高级模型也保存，让用户可以看到他们的选择）
      this.saveSettings();
    },
    // 打开设置页面
    openOptionsPage() {
      if (chrome && chrome.runtime) {
        chrome.runtime.openOptionsPage();
      } else {
        // 后备方案：尝试直接打开options.html
        window.open(chrome.runtime.getURL('options.html'), '_blank');
      }
    },
    // 打开个人资料页面
    openProfilePage() {
      window.open('http://localhost:8080/profile', '_blank');
    },
    // 检查是否为高级模型
    isHighPriorityEngine(engine) {
      const premiumEngines = ['chatgpt-4o', 'chatgpt-4o-mini', 'deepseek-v3', 'gemini-2-flash', 'deepl'];
      return premiumEngines.includes(engine);
    },
    // 保存OpenAI配置
    saveOpenaiConfig() {
      this.saveSettings();
    },
    // 保存DeepSeek配置
    saveDeepseekConfig() {
      this.saveSettings();
    },
    // 切换输入框空格翻译
    toggleInputSpaceTranslation() {
      this.saveSettings();
    },
    // 加载服务启用状态
    loadServiceStates() {
      chrome.storage.sync.get(null, (data) => {
        // 更新各服务的启用状态
        this.serviceStates.microsoftapi = data.microsoftapiEnabled !== false;
        this.serviceStates.microsoft = data.microsoftEnabled !== false;
        this.serviceStates.google = data.googleEnabled !== false;
        this.serviceStates.openai = data.openaiEnabled !== false;
        this.serviceStates.deepseek = data.deepseekEnabled !== false;
        
        // 高级模型列表（这些模型始终可用，不受serviceStates控制）
        const premiumEngines = ['chatgpt-4o', 'chatgpt-4o-mini', 'deepseek-v3', 'gemini-2-flash', 'deepl'];
        
        // 检查当前选中的翻译引擎是否被禁用
        // 高级模型不受serviceStates限制，始终可用
        if (this.transEngine && !premiumEngines.includes(this.transEngine) && !this.serviceStates[this.transEngine]) {
          // 如果当前引擎被禁用，切换到第一个可用的引擎
          const availableEngines = Object.keys(this.serviceStates).filter(key => this.serviceStates[key]);
          if (availableEngines.length > 0) {
            this.transEngine = availableEngines[0];
            this.saveSettings();
          }
        }
      });
    },
    // 加载AI专家显示状态
    loadAiExpertVisibility() {
      chrome.storage.sync.get(['aiExpertVisibility'], (result) => {
        this.aiExpertVisibility = result.aiExpertVisibility || {};
      });
    },
    // 检查AI专家是否应该显示
    isExpertVisible(expertValue) {
      // 如果没有设置，默认显示
      if (this.aiExpertVisibility[expertValue] === undefined) {
        return true;
      }
      return this.aiExpertVisibility[expertValue];
    },
    // 获取用户信息并检查会员状态
    async getUserInfo() {
      try {
        return new Promise((resolve) => {
          chrome.storage.local.get(['authToken', 'userInfo'], (result) => {
            if (chrome.runtime.lastError) {
              console.warn('获取用户信息失败:', chrome.runtime.lastError);
              resolve(null);
              return;
            }
            
            console.log('获取到的用户信息:', result);
            
            if (result.authToken && result.userInfo) {
              this.userInfo = result.userInfo;
              
              // 检查用户plan状态，如果不是'free'则为会员用户
              if (this.userInfo.plan && this.userInfo.plan !== 'free') {
                this.isPremiumUser = true;
                console.log('检测到会员用户, plan:', this.userInfo.plan);
              } else {
                this.isPremiumUser = false;
                console.log('检测到免费用户');
              }
            } else {
              this.userInfo = null;
              this.isPremiumUser = false;
              console.log('用户未登录');
            }
            
            resolve(this.userInfo);
          });
        });
      } catch (error) {
        console.error('获取用户信息时出错:', error);
        this.userInfo = null;
        this.isPremiumUser = false;
        return null;
      }
    },
  },
  watch: {
    excludedClasses: {
      handler(newVal) {
        this.excludedClassesStr = newVal.join(', ')
      },
      immediate: true
    },
    // 监听apiKeys变化
    apiKeys: {
      handler(newKeys) {
        // 如果当前是AI引擎，检查是否有对应的API Key
        const engine = this.transEngine;
        if ((engine === 'openai' || engine === 'deepseek') && newKeys) {
          const apiKey = newKeys[engine];
          this.showApiKeyNotice = !apiKey || apiKey.trim() === '';
        }
      },
      deep: true
    }
  },
  created() {
    this.$store.dispatch('loadSettings').then(() => {
      // 检查当前引擎是否需要API Key提示
      const engine = this.transEngine;
      if ((engine === 'openai' || engine === 'deepseek') && this.$store.state.apiKeys) {
        if (!this.$store.state.apiKeys[engine] || this.$store.state.apiKeys[engine].trim() === '') {
          this.showApiKeyNotice = true;
        }
      }
    });

    // 获取用户信息并检查会员状态
    this.getUserInfo();

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
    
    // 加载服务启用状态
    this.loadServiceStates();
    
    // 加载AI专家显示状态
    this.loadAiExpertVisibility();
    
    // 监听 storage 变化
    this.storageListener = (changes, namespace) => {
      if (namespace === 'sync') {
        // 检查是否有翻译引擎变化
        if (changes.translationEngine) {
          console.log('TranslationSettings.vue - 检测到翻译引擎变化:', {
            oldValue: changes.translationEngine.oldValue,
            newValue: changes.translationEngine.newValue,
            currentStoreValue: this.$store.state.translationEngine
          });
          this.$store.commit('setTranslationEngine', changes.translationEngine.newValue);
          
          // 重新检查API Key提示状态
          const engine = changes.translationEngine.newValue;
          const premiumEngines = ['chatgpt-4o', 'chatgpt-4o-mini', 'deepseek-v3', 'gemini-2-flash', 'deepl'];
          
          if (premiumEngines.includes(engine)) {
            // 高级模型检查登录状态
            chrome.storage.local.get(['authToken'], (result) => {
              if (!result.authToken) {
                this.showApiKeyNotice = true;
              } else {
                this.showApiKeyNotice = false;
              }
            });
          } else if ((engine === 'openai' || engine === 'deepseek') && this.$store.state.apiKeys) {
            // 传统AI引擎检查API Key
            if (!this.$store.state.apiKeys[engine] || this.$store.state.apiKeys[engine].trim() === '') {
              this.showApiKeyNotice = true;
            } else {
              this.showApiKeyNotice = false;
            }
          } else {
            this.showApiKeyNotice = false;
          }
        }
        
        // 检查是否有服务状态的变化
        const serviceKeys = ['microsoftapiEnabled', 'microsoftEnabled', 'googleEnabled', 'openaiEnabled', 'deepseekEnabled'];
        const hasServiceChange = Object.keys(changes).some(key => serviceKeys.includes(key));
        
        if (hasServiceChange) {
          // 重新加载服务状态
          this.loadServiceStates();
        }
        
        // 检查是否有AI专家显示状态的变化
        if (changes.aiExpertVisibility) {
          this.loadAiExpertVisibility();
        }
      }
      
      // 监听local存储中的用户信息变化
      if (namespace === 'local') {
        if (changes.authToken || changes.userInfo) {
          console.log('检测到用户登录状态变化，重新获取用户信息');
          this.getUserInfo();
        }
      }
    };
    chrome.storage.onChanged.addListener(this.storageListener);
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
    
    // 移除 storage 变化监听器
    if (this.storageListener) {
      chrome.storage.onChanged.removeListener(this.storageListener);
    }
  }
}
</script>

<style scoped>
.translation-settings {
  color: #333;
  margin: 0 auto;
}

.settings-group {
  margin-bottom: 28px;
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
  width: 62px;
  text-align: center;
  color: #aaa;
  font-size: 16px;
  margin: -20px 2px 0 2px;
}

.service-selector,
.ai-mode {
  display: flex;
  align-items: center;
  gap: 32px;
}

.setting-label {
  color: #222222;
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
  justify-content: space-between;
  width: 100%;
  gap: 16px;
  min-height: 20px;
}

.option-with-icon > span:first-child {
  flex: 1;
  font-weight: 500;
}

.icon-circle {
  width: 20px;
  height: 20px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #64748b;
  border: 1px solid rgba(226, 232, 240, 0.5);
  flex-shrink: 0;
}

.pro-tag {
  font-size: 10px;
  font-weight: 500;
  background: #ff5588;
  color: #ffffff;
  border-radius: 4px;
  padding: 2px 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: none;
  box-shadow: none;
  position: relative;
  overflow: hidden;
}

.pro-tag::before {
  display: none;
}

@keyframes shine {
  0% { left: -100%; }
  100% { left: 100%; }
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
  background: #ffffff !important;
  border: 1px solid #e1e5e9 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02) !important;
  border-radius: 12px !important;
  transition: all 0.3s ease !important;
  padding: 0 16px !important;
}

:deep(.el-input__wrapper:hover) {
  border-color: #94a3b8 !important;
  box-shadow: 0 4px 12px rgba(148, 163, 184, 0.08) !important;
  transform: translateY(-1px) !important;
  background: #f8fafc !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #64748b !important;
  box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.1), 0 4px 12px rgba(100, 116, 139, 0.15) !important;
  background: #ffffff !important;
  transform: translateY(-1px) !important;
}

:deep(.el-input__inner) {
  color: #1f2937 !important;
  height: 24px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
}

:deep(.el-select .el-input .el-select__caret) {
  color: #64748b !important;
  font-size: 14px !important;
  transition: all 0.3s ease !important;
  line-height: 24px !important;
}

:deep(.el-select .el-input.is-focus .el-select__caret) {
  color: #475569 !important;
  transform: rotate(180deg) !important;
}

:deep(.el-select-dropdown) {
  background: #2a2a2a !important;
  border: 1px solid #3a3a3a !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
  overflow: hidden !important;
  padding: 4px !important;
  max-height: 100% !important;
  min-width: 200px !important;
}

:deep(.el-select-dropdown__item) {
  padding: 10px 16px !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  line-height: 1.4 !important;
  transition: all 0.15s ease !important;
  border-radius: 6px !important;
  margin: 2px !important;
  cursor: pointer !important;
  border: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

:deep(.el-select-dropdown__item:last-child) {
  margin-bottom: 2px !important;
}

:deep(.el-select-group__title) {
  color: #888888 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  padding: 6px 16px 6px 16px !important;
  background: transparent !important;
  border-bottom: none !important;
  margin-bottom: 0 !important;
  line-height: 20px !important;
}

:deep(.el-select-group__title::before) {
  display: none !important;
}

:deep(.el-select-group__title::after) {
  display: none !important;
}

:deep(.el-select-group__wrap) {
  border-bottom: none !important;
  margin-bottom: 8px !important;
}

:deep(.el-select-group__wrap:last-of-type) {
  margin-bottom: 4px !important;
}

:deep(.el-select-group .el-select-dropdown__item) {
  margin: 2px !important;
}

:deep(.el-select-dropdown__item.selected) {
  color: #ff5588 !important;
}

::v-deep .el-select-dropdown__item.selected{
  color: #ff5588 !important;
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
  gap: 32px;
}

.api-key-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.api-key-input .setting-label {
  color: #666;
  font-size: 14px;
  white-space: nowrap;
  min-width: 120px;
}

.translate-tips {
  margin: 15px 0;
  padding: 10px;
  background-color: rgba(66, 185, 131, 0.1);
  border-radius: 8px;
  font-size: 13px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tip-icon {
  font-size: 18px;
}

.tip-text {
  flex: 1;
  line-height: 1.4;
  color: #555;
}

.api-key-notice {
  margin-top: 10px;
  padding: 10px;
  background-color: rgba(255, 215, 0, 0.1);
  border-radius: 8px;
  font-size: 13px;
}

.api-key-notice-message {
  display: flex;
  align-items: center;
  gap: 8px;
}

.api-key-notice-message i {
  color: #ffd700;
  font-size: 18px;
}

.api-key-notice-message a {
  color: #ff5588;
  text-decoration: none;
}

.api-key-notice-message a:hover {
  text-decoration: underline;
}
</style>