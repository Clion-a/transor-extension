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
        from: 'public/icons',
        to: 'icons'
      })
      return args
    })
  }
} 