<template>
  <div class="translation-settings">
    <div class="settings-group">
      <div class="language-selector">
        <div class="source-lang">
          <el-select v-model="sourceLang" size="large" class="dark-select">
            <el-option label="自动检测" value="auto"></el-option>
            <el-option label="简体中文" value="zh-CN"></el-option>
            <el-option label="英语" value="en"></el-option>
            <el-option label="日语" value="ja"></el-option>
            <el-option label="韩语" value="ko"></el-option>
            <el-option label="法语" value="fr"></el-option>
            <el-option label="德语" value="de"></el-option>
            <el-option label="西班牙语" value="es"></el-option>
            <el-option label="俄语" value="ru"></el-option>
          </el-select>
          <div class="label">翻译语言</div>
        </div>
        <div class="direction-arrow">→</div>
        <div class="target-lang">
          <el-select v-model="targetLang" size="large" class="dark-select">
            <el-option label="简体中文" value="zh-CN"></el-option>
            <el-option label="英语" value="en"></el-option>
            <el-option label="日语" value="ja"></el-option>
            <el-option label="韩语" value="ko"></el-option>
            <el-option label="法语" value="fr"></el-option>
            <el-option label="德语" value="de"></el-option>
            <el-option label="西班牙语" value="es"></el-option>
            <el-option label="俄语" value="ru"></el-option>
          </el-select>
          <div class="label">目标语言</div>
        </div>
      </div>
    </div>
    
    <div class="settings-group">
      <div class="service-selector">
        <div class="setting-label">翻译服务：</div>
        <el-select v-model="transEngine" size="large" class="dark-select">
          <el-option label="DeepSeek (Pro)" value="deepseek">
            <div class="option-with-icon">
              <div class="icon-circle">D</div>
              <span>DeepSeek</span>
              <span class="pro-tag">Pro</span>
            </div>
          </el-option>
          <el-option label="Google" value="google">
            <div class="option-with-icon">
              <div class="icon-circle">G</div>
              <span>Google</span>
            </div>
          </el-option>
          <el-option label="百度" value="baidu">
            <div class="option-with-icon">
              <div class="icon-circle">百</div>
              <span>百度翻译</span>
            </div>
          </el-option>
        </el-select>
      </div>
    </div>
    
    <div class="settings-group">
      <div class="ai-mode">
        <div class="setting-label">显示类型：</div>
        <el-select v-model="transStyle" size="large" class="dark-select">
          <el-option label="通用" value="general"></el-option>
          <el-option label="替换(直接替换原文)" value="replace"></el-option>
          <el-option label="双语(原文上方显示译文)" value="bilingual"></el-option>
          <el-option label="双语(原文下方显示译文)" value="below"></el-option>
          <el-option label="悬浮(鼠标悬停显示译文)" value="hover"></el-option>
          <el-option label="导航提示(适合菜单和小元素)" value="tip"></el-option>
        </el-select>
      </div>
    </div>
    
    <div class="translate-button">
      <button @click="toggleTranslation">开启/关闭翻译（⌥A）</button>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions, mapMutations } from 'vuex'

export default {
  name: 'TranslationSettings',
  computed: {
    ...mapState([
      'isEnabled'
    ]),
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
    ...mapMutations([])
  },
  created() {
    this.$store.dispatch('loadSettings')
  }
}
</script>

<style scoped>
.translation-settings {
  color: #333;
  margin: 0 auto;
}

.settings-group {
  margin-bottom: 18px;
}

.language-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.source-lang, .target-lang {
  flex: 1;
  position: relative;
}

.direction-arrow {
  color: #aaa;
  font-size: 16px;
  margin: 0 2px;
}

.service-selector, .ai-mode {
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
}

.translate-button button {
  width: 100%;
  padding: 10px 0;
  background-color: #ff5588;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.translate-button button:hover {
  background-color: #ff3377;
}

.translate-button button:active {
  transform: scale(0.98);
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
  border: 1px solid #eee !important;
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
</style> 