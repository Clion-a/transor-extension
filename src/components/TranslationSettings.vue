<template>
  <div class="translation-settings">
    <h3>翻译设置</h3>
    
    <el-form label-position="top" size="small">
      <el-form-item label="目标语言">
        <el-select v-model="targetLang" placeholder="选择目标语言">
          <el-option label="简体中文" value="zh-CN"></el-option>
          <el-option label="英语" value="en"></el-option>
          <el-option label="日语" value="ja"></el-option>
          <el-option label="韩语" value="ko"></el-option>
          <el-option label="法语" value="fr"></el-option>
          <el-option label="德语" value="de"></el-option>
          <el-option label="西班牙语" value="es"></el-option>
          <el-option label="俄语" value="ru"></el-option>
        </el-select>
      </el-form-item>
      
      <el-form-item label="源语言">
        <el-select v-model="sourceLang" placeholder="选择源语言">
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
      </el-form-item>
      
      <el-form-item label="翻译引擎">
        <el-select v-model="transEngine" placeholder="选择翻译引擎">
          <el-option label="Google" value="google"></el-option>
          <el-option label="DeepL" value="deepl"></el-option>
          <el-option label="百度" value="baidu"></el-option>
        </el-select>
      </el-form-item>
      
      <el-form-item label="翻译样式">
        <el-select v-model="transStyle" placeholder="选择翻译样式">
          <el-option label="内联(原文后显示译文)" value="inline"></el-option>
          <el-option label="替换(直接替换原文)" value="replace"></el-option>
          <el-option label="双语(原文上方显示译文)" value="bilingual"></el-option>
          <el-option label="双语(原文下方显示译文)" value="below"></el-option>
          <el-option label="悬浮(鼠标悬停显示译文)" value="hover"></el-option>
          <el-option label="导航提示(适合菜单和小元素)" value="tip"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { mapState, mapActions, mapMutations } from 'vuex'

export default {
  name: 'TranslationSettings',
  computed: {
    ...mapState([]),
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
      'saveSettings'
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
  margin-bottom: 10px;
}

h3 {
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 12px;
}
</style> 