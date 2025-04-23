<template>
  <div class="translation-control">
    <div class="control-panel">
      <div class="toggle-container">
        <span>翻译开关</span>
        <el-switch
          v-model="isTranslationEnabled"
          active-color="#13ce66"
          inactive-color="#ff4949"
          @change="toggleTranslation"
        ></el-switch>
      </div>
      <el-collapse v-model="activeCollapse">
        <el-collapse-item title="高级设置" name="advanced">
          <div class="advanced-settings">
            <el-form label-position="top" size="small">
              <el-form-item label="不翻译的HTML标签">
                <el-select
                  v-model="excludedTags"
                  multiple
                  placeholder="选择不翻译的HTML标签"
                  @change="saveExcludedTags"
                >
                  <el-option label="代码块(code)" value="code"></el-option>
                  <el-option label="预格式化文本(pre)" value="pre"></el-option>
                  <el-option label="脚本(script)" value="script"></el-option>
                  <el-option label="样式(style)" value="style"></el-option>
                  <el-option label="标题(h1-h6)" value="h1,h2,h3,h4,h5,h6"></el-option>
                  <el-option label="链接(a)" value="a"></el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item label="不翻译的CSS类名">
                <el-input
                  v-model="excludedClassesStr"
                  placeholder="输入不翻译的CSS类名，多个用逗号分隔"
                  @change="saveExcludedClasses"
                ></el-input>
              </el-form-item>
              
              <el-form-item label="自定义CSS样式">
                <el-input
                  type="textarea"
                  v-model="customCss"
                  placeholder="输入自定义CSS样式"
                  rows="3"
                  @change="saveCustomCss"
                ></el-input>
              </el-form-item>
            </el-form>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions, mapMutations } from 'vuex'

export default {
  name: 'TranslationControl',
  data() {
    return {
      activeCollapse: [],
      excludedClassesStr: ''
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
    }
  },
  methods: {
    ...mapActions([
      'toggleTranslation',
      'saveSettings'
    ]),
    ...mapMutations([
      'setExcludedTags',
      'setExcludedClasses',
      'setCustomCss'
    ]),
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
    this.$store.dispatch('loadSettings')
  }
}
</script>

<style scoped>
.translation-control {
  margin-bottom: 10px;
}

h3 {
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 12px;
}

.control-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toggle-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.advanced-settings {
  margin-top: 10px;
}
</style> 