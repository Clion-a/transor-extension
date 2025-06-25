module.exports = {
  outputDir: 'dist',
  publicPath: './',
  filenameHashing: false,
  productionSourceMap: false,
  
  // 配置扩展的popup入口
  pages: {
    popup: {
      entry: 'src/main.js',
      template: 'public/popup.html',
      filename: 'popup.html'
    }
  },
  
  configureWebpack: {
    output: {
      filename: 'js/[name].js',
      chunkFilename: 'js/[name].js'
    },
    performance: {
      hints: false
    }
  },
  
  css: {
    extract: {
      filename: 'css/[name].css'
    }
  },
  
  // 在构建后复制文件到dist目录
  chainWebpack: config => {
    // 移除预加载插件
    config.plugins.delete('preload-popup')
    config.plugins.delete('prefetch-popup')
    
    // 复制manifest.json和其他静态资源
    config.plugin('copy').tap(args => {
      args[0].push({
        from: 'public/manifest.json',
        to: 'manifest.json'
      })
      args[0].push({
        from: 'public/background.js',
        to: 'background.js'
      })
      args[0].push({
        from: 'public/content-script.js',
        to: 'content-script.js'
      })
      args[0].push({
        from: 'public/content-style.css',
        to: 'content-style.css'
      })
      args[0].push({
        from: 'public/welcome.html',
        to: 'welcome.html'
      })
      args[0].push({
        from: 'public/options.html',
        to: 'options.html'
      })
      args[0].push({
        from: 'public/options.js',
        to: 'options.js'
      })
      args[0].push({
        from: 'public/options-ui.js',
        to: 'options-ui.js'
      })
      args[0].push({
        from: 'public/i18n.js',
        to: 'i18n.js'
      })
      args[0].push({
        from: 'public/config.js',
        to: 'config.js'
      })
      args[0].push({
        from: 'public/storage-manager.js',
        to: 'storage-manager.js'
      })
      args[0].push({
        from: 'public/favorites.html',
        to: 'favorites.html'
      })
      args[0].push({
        from: 'public/favorites.js',
        to: 'favorites.js'
      })
      args[0].push({
        from: 'public/i18n-favorites.js',
        to: 'i18n-favorites.js'
      })
      args[0].push({
        from: 'public/highlight-favorites.js',
        to: 'highlight-favorites.js'
      })
      args[0].push({
        from: 'public/image-translator.js',
        to: 'image-translator.js'
      })
      args[0].push({
        from: 'public/screenshot.html',
        to: 'screenshot.html'
      })
      args[0].push({
        from: 'public/screenshot.js',
        to: 'screenshot.js'
      })
      args[0].push({
        from: 'public/login-bridge.js',
        to: 'login-bridge.js'
      })
      args[0].push({
        from: 'public/transor-bridge-injection.js',
        to: 'transor-bridge-injection.js'
      })
      args[0].push({
        from: 'public/youtube-cinema.js',
        to: 'youtube-cinema.js'
      })
      args[0].push({
        from: 'public/netflix-cinema.js',
        to: 'netflix-cinema.js'
      })
      args[0].push({
        from: 'public/libs',
        to: 'libs'
      })
      args[0].push({
        from: 'public/icons',
        to: 'icons'
      })
      return args
    })
  }
} 