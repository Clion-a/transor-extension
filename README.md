# Transor - 沉浸式网页翻译扩展

一个基于Vue 2.0和Element UI的Chrome扩展，提供强大的沉浸式网页翻译功能。

## 主要功能

- **多种翻译样式**：支持内联、替换、双语、悬浮等多种翻译样式
- **多种翻译引擎**：支持Google、DeepL、百度等多种翻译引擎
- **智能过滤**：自动识别并跳过代码、脚本等不需要翻译的内容
- **自定义设置**：可排除特定标签和类名，支持自定义CSS样式
- **高性能**：优化的翻译算法，支持大型网页快速翻译
- **离线缓存**：翻译结果本地缓存，减少重复请求

## 技术栈

- Vue 2.0
- Element UI
- Chrome Extension API
- ES6+

## 项目结构

```
transor-extension/
├── public/                 # 静态资源和Chrome扩展文件
│   ├── manifest.json       # 扩展清单文件
│   ├── background.js       # 背景脚本
│   ├── content-script.js   # 内容脚本
│   ├── popup.html          # 弹出窗口HTML
│   └── icons/              # 扩展图标
├── src/                    # Vue项目源代码
│   ├── components/         # Vue组件
│   ├── api/                # API服务
│   ├── utils/              # 工具函数
│   ├── store/              # Vuex存储
│   ├── App.vue             # 主应用组件
│   └── main.js             # 入口文件
└── package.json            # 项目依赖
```

## 安装和使用

### 开发环境

1. 克隆项目
```bash
git clone https://github.com/yourusername/transor-extension.git
cd transor-extension
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run serve
```

4. 构建扩展
```bash
npm run build
```

5. 加载扩展
   - 打开Chrome浏览器，进入扩展管理页面（chrome://extensions/）
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目中的`dist`目录

### 使用指南

1. 点击Chrome工具栏上的Transor图标打开设置面板
2. 选择目标语言、源语言、翻译引擎和翻译样式
3. 开启翻译开关，当前页面将自动进行翻译
4. 根据需要进行高级设置，如排除特定标签或类名

## 注意事项

- 本扩展使用非官方的Google翻译API进行演示，实际使用中可能需要替换为官方API
- 对于DeepL和百度翻译，需要注册获取API密钥才能正常使用

## 许可证

MIT

## 贡献

欢迎通过Issues或Pull Requests贡献代码和意见。

---

Transor - 让全球网页无障碍阅读 