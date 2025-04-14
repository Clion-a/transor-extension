<template>
  <div id="app">
    <div class="transor-container">
      <div class="header">
        <h1>Transor 沉浸式翻译</h1>
      </div>
      <div class="content">
        <TranslationSettings />
        <el-divider></el-divider>
        <TranslationControl />
      </div>
    </div>
  </div>
</template>

<script>
import TranslationSettings from './components/TranslationSettings.vue'
import TranslationControl from './components/TranslationControl.vue'

export default {
  name: 'App',
  components: {
    TranslationSettings,
    TranslationControl
  }
}
</script>

<style>
#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  width: 350px;
  min-height: 450px;
}

.transor-container {
  padding: 16px;
}

.header {
  text-align: center;
  margin-bottom: 16px;
}

.header h1 {
  margin: 0;
  font-size: 20px;
  color: #409EFF;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style> 