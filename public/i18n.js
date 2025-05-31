// 多语言资源文件
const i18n = {
  'zh-CN': {
    // 导航栏
    'app_title': 'Transor',
    'login_status': {
      'logged_out': '未登录',
      'logged_in': '已登录',
      'profile': '个人信息'
    },
    
    // 主要功能
    'favorites_label': '生词本',
    'open_favorites': '打开英语学习收藏夹',
    'settings_title': '设置',
    'settings_description': '调整翻译引擎、语言等',
    
    // 翻译设置
    'source_language': '翻译语言',
    'target_language': '目标语言',
    'translation_service': '翻译服务：',
    'display_type': '显示类型：',
    'ui_language': '界面语言：',
    'translation_toggle': '翻译开关',
    'toggle_translation': '开启/关闭翻译',
    'advanced_settings': '高级设置',
    'openai_api_key': 'OpenAI API密钥',
    'enter_openai_api_key': '请输入你的OpenAI API密钥',
    'openai_model': 'OpenAI模型',
    'deepseek_api_key': 'DeepSeek API密钥',
    'enter_deepseek_api_key': '请输入你的DeepSeek API密钥',
    'input_triple_space_tip': '小技巧：在任意输入框中输入文本后，连续敲击三个空格可以立即翻译文本。按ESC键可取消翻译。',
    'input_space_translation_toggle': '输入框空格翻译',
    'microsoftApiInfo': '系统内置密钥，无需配置',
    'customApiEndpoint': '自定义 API 接口地址：',
    
    // 语言选项
    'auto_detect': '自动检测',
    'chinese': '简体中文',
    'english': '英语',
    'japanese': '日语',
    'korean': '韩语',
    'french': '法语',
    'german': '德语',
    'spanish': '西班牙语',
    'russian': '俄语',
    
    // 翻译样式
    'general': '通用',
    'universal_style': '通用(智能选择显示样式)',
    'replace': '替换(直接替换原文)',
    'bilingual_above': '双语(原文上方显示译文)',
    'bilingual_below': '双语(原文下方显示译文)',
    'inline': '双语(原文后方显示译文)',
    'hover': '悬浮(鼠标悬停显示译文)',
    'tip': '导航提示(适合菜单和小元素)',
    
    // 高级设置
    'excluded_tags': '不翻译的HTML标签',
    'excluded_classes': '不翻译的CSS类名',
    'custom_css': '自定义CSS样式',
    'excluded_tags_placeholder': '选择不翻译的HTML标签',
    'excluded_classes_placeholder': '输入不翻译的CSS类名，多个用逗号分隔',
    'custom_css_placeholder': '输入自定义CSS样式',
    
    // 标签选项
    'tag_code': '代码块(code)',
    'tag_pre': '预格式化文本(pre)',
    'tag_script': '脚本(script)',
    'tag_style': '样式(style)',
    'tag_headings': '标题(h1-h6)',
    'tag_links': '链接(a)',

    // 设置页面
    "settings": "设置",
    "generalSettings": "常规设置",
    "generalSettingsDescription": "配置 Transor 的基本设置和翻译首选项",
    "translationServices": "翻译服务",
    "translationServicesDescription": "管理和配置不同的翻译服务",
    "featureManagement": "功能管理",
    "featureManagementDescription": "启用或禁用 Transor 的各项功能",
    "about": "关于",
    "aboutDescription": "了解更多关于 Transor 的信息",
    "languageSettings": "语言设置",
    "uiLanguage": "界面语言",
    "targetLanguage": "目标翻译语言",
    "translationOptions": "翻译选项",
    "defaultEngine": "默认翻译引擎",
    "translationStyle": "翻译样式",
    "inlineDisplay": "行内显示",
    "bubbleDisplay": "气泡显示",
    "replaceOriginal": "替换原文",
    "saveSettings": "保存设置",
    "restoreDefaults": "恢复默认",
    "apiKeys": "API 密钥",
    "apiKeysDescription": "为各翻译服务配置 API 密钥",
    "currentEngine": "当前使用的翻译引擎",
    "functionSwitches": "功能开关",
    "appInfo": "应用信息",
    "appDescription": "Transor 是一款功能强大的浏览器翻译扩展，为用户提供网页翻译、收藏夹高亮、YouTube 字幕翻译等功能。",
    "version": "版本",
    "supportUs": "支持我们",
    "supportDescription": "如果您喜欢 Transor，请考虑给我们一个好评或分享给您的朋友。",
    "supportMotivation": "您的支持是我们不断改进的动力！",
    "enableWebTranslation": "启用网页翻译",
    "enableWebTranslationDesc": "允许 Transor 翻译网页内容",
    "highlightFavorites": "高亮收藏夹",
    "highlightFavoritesDesc": "在网页上高亮显示收藏的单词和短语",
    "youtubeCinemaMode": "YouTube 影院模式",
    "youtubeCinemaModeDesc": "在 YouTube 上启用字幕翻译功能",
    "settingsSaved": "设置已保存",
    "uiLanguageUpdated": "界面语言已更新",
    "confirmRestore": "确定要清除所有设置并恢复默认值吗？",
    
    // AI模块配置
    "model": "模型",
    "inputCustomModel": "输入自定义模型名称",
    "maxRequestsPerSecond": "每秒最大请求数",
    "requestLimitWarning": "请求数超过该限制时会进入排队状态，直到下一秒钟开始。由于AI服务的各种限制，请点击这里查看最新建议的数值",
    "enableAiContext": "启用 AI 智能上下文",
    "aiContextDesc": "启用后，系统将先理解全文内容与专业术语，让翻译更专业准确。支持文章网页（博客、新闻）、电子书、PDF和双语等。AI专家同伴支持智能上下文。目前为实验功能，仅Pro会员可用。",
    "aiExpertStrategy": "AI专家",
    "translationMaster": "意译大师",
    "literalExpert": "直译专家",
    "contextAnalyzer": "语境分析师",
    "culturalAdapter": "文化适配师",
    "universal": "通用",
    "smartChoice": "智能选择",
    "paragraphExpert": "段落总结专家",
    "englishSimplifier": "英文简化大师",
    "twitterEnhancer": "Twitter 翻译增强器",
    "techTranslator": "科技类翻译大师",
    "redditEnhancer": "Reddit 翻译增强器",
    "academicTranslator": "学术论文翻译师",
    "newsTranslator": "新闻媒体译者",
    "musicExpert": "音乐专家",
    "medicalTranslator": "医学翻译大师",
    "legalTranslator": "法律行业译者",
    "githubEnhancer": "GitHub 翻译增强器",
    "gamingTranslator": "游戏译者",
    "ecommerceTranslator": "电商翻译大师",
    "financeTranslator": "金融翻译顾问",
    "novelTranslator": "小说译者",
    "ao3Translator": "AO3 译者",
    "ebookTranslator": "电子书译者",
    "designer": "设计师",
    "cnEnPolisher": "中英夹杂",
    "web3Translator": "Web3 翻译大师",
    "moreModels": "设置更多模型",
    'displayStyle': '显示样式',
    'fontColor': '字体颜色',
    'fontColorDesc': '设置译文的字体颜色，默认为粉色(#ff5588)',
    'fontSize': '字体大小',
    'fontSizeSmall': '小',
    'fontSizeMedium': '中',
    'fontSizeLarge': '大',
    'showOriginalText': '显示原文',
    'showOriginalTextDesc': '在替换模式下是否仍然保留原文'
  },
  
  'en': {
    // Navigation bar
    'app_title': 'Transor',
    'login_status': {
      'logged_out': 'Not Logged In',
      'logged_in': 'Logged In',
      'profile': 'Profile'
    },
    
    // Main functions
    'favorites_label': 'Vocabulary',
    'open_favorites': 'Open English Learning Favorites',
    'settings_title': 'Settings',
    'settings_description': 'Adjust translation engine, language, etc.',
    
    // Translation settings
    'source_language': 'Source Language',
    'target_language': 'Target Language',
    'translation_service': 'Translation Service:',
    'display_type': 'Display Type:',
    'ui_language': 'Interface Language:',
    'translation_toggle': 'Translation Toggle',
    'toggle_translation': 'Enable/Disable Translation',
    'advanced_settings': 'Advanced Settings',
    'openai_api_key': 'OpenAI API Key',
    'enter_openai_api_key': 'Enter your OpenAI API Key',
    'openai_model': 'OpenAI Model',
    'deepseek_api_key': 'DeepSeek API Key',
    'enter_deepseek_api_key': 'Enter your DeepSeek API Key',
    'input_triple_space_tip': 'Tip: In any input field, after typing text, press space three times in a row to instantly translate the text. Press ESC to cancel translation.',
    'input_space_translation_toggle': 'Input Space Translation',
    'microsoftApiInfo': 'System built-in key, no configuration needed',
    'customApiEndpoint': 'Custom API Endpoint:',
    
    // Language options
    'auto_detect': 'Auto Detect',
    'chinese': 'Simplified Chinese',
    'english': 'English',
    'japanese': 'Japanese',
    'korean': 'Korean',
    'french': 'French',
    'german': 'German',
    'spanish': 'Spanish',
    'russian': 'Russian',
    
    // Translation styles
    'general': 'General',
    'universal_style': 'Universal (Smart Style Selection)',
    'replace': 'Replace (Direct Replacement)',
    'bilingual_above': 'Bilingual (Translation Above)',
    'bilingual_below': 'Bilingual (Translation Below)',
    'inline': 'Bilingual (Translation after Original)',
    'hover': 'Hover (Show on Mouse Over)',
    'tip': 'Navigation Tip (For Menus)',
    
    // Advanced settings
    'excluded_tags': 'Excluded HTML Tags',
    'excluded_classes': 'Excluded CSS Classes',
    'custom_css': 'Custom CSS Styles',
    'excluded_tags_placeholder': 'Select HTML tags to exclude',
    'excluded_classes_placeholder': 'Enter CSS classes to exclude, separate with commas',
    'custom_css_placeholder': 'Enter custom CSS styles',
    
    // Tag options
    'tag_code': 'Code Block (code)',
    'tag_pre': 'Preformatted Text (pre)',
    'tag_script': 'Script (script)',
    'tag_style': 'Style (style)',
    'tag_headings': 'Headings (h1-h6)',
    'tag_links': 'Links (a)',

    // 设置页面
    "settings": "Settings",
    "generalSettings": "General Settings",
    "generalSettingsDescription": "Configure basic settings and translation preferences for Transor",
    "translationServices": "Translation Services",
    "translationServicesDescription": "Manage and configure different translation services",
    "featureManagement": "Feature Management",
    "featureManagementDescription": "Enable or disable various features of Transor",
    "about": "About",
    "aboutDescription": "Learn more about Transor",
    "languageSettings": "Language Settings",
    "uiLanguage": "UI Language",
    "targetLanguage": "Target Language",
    "translationOptions": "Translation Options",
    "defaultEngine": "Default Translation Engine",
    "translationStyle": "Translation Style",
    "inlineDisplay": "Inline Display",
    "bubbleDisplay": "Bubble Display",
    "replaceOriginal": "Replace Original",
    "saveSettings": "Save Settings",
    "restoreDefaults": "Restore Defaults",
    "apiKeys": "API Keys",
    "apiKeysDescription": "Configure API keys for different translation services",
    "currentEngine": "Current Translation Engine",
    "functionSwitches": "Feature Switches",
    "appInfo": "App Information",
    "appDescription": "Transor is a powerful browser translation extension that provides web page translation, favorites highlighting, YouTube subtitle translation and more.",
    "version": "Version",
    "supportUs": "Support Us",
    "supportDescription": "If you like Transor, please consider giving us a good rating or sharing it with your friends.",
    "supportMotivation": "Your support motivates us to keep improving!",
    "enableWebTranslation": "Enable Web Translation",
    "enableWebTranslationDesc": "Allow Transor to translate web content",
    "highlightFavorites": "Highlight Favorites",
    "highlightFavoritesDesc": "Highlight saved words and phrases on web pages",
    "youtubeCinemaMode": "YouTube Cinema Mode",
    "youtubeCinemaModeDesc": "Enable subtitle translation feature on YouTube",
    "settingsSaved": "Settings Saved",
    "uiLanguageUpdated": "UI Language Updated",
    "confirmRestore": "Are you sure you want to clear all settings and restore defaults?",
    
    // AI模块配置
    "model": "Model",
    "inputCustomModel": "Input custom model name",
    "maxRequestsPerSecond": "Max requests per second",
    "requestLimitWarning": "Requests exceeding this limit will be queued until the next second begins. Due to various limitations of AI services, please click here to see the latest recommended values",
    "enableAiContext": "Enable AI Smart Context",
    "aiContextDesc": "When enabled, the system will first understand the full text content and professional terminology to make translations more professional and accurate. Supports article web pages (blogs, news), e-books, PDFs and bilingual content. AI expert companion supports smart context. Currently an experimental feature, available only to Pro members.",
    "aiExpertStrategy": "AI Expert",
    "translationMaster": "Translation Master",
    "literalExpert": "Literal Expert",
    "contextAnalyzer": "Context Analyzer",
    "culturalAdapter": "Cultural Adapter",
    "universal": "Universal",
    "smartChoice": "Smart Choice",
    "paragraphExpert": "Paragraph Summary Expert",
    "englishSimplifier": "English Simplifier",
    "twitterEnhancer": "Twitter Translation Enhancer",
    "techTranslator": "Tech Translation Master",
    "redditEnhancer": "Reddit Translation Enhancer",
    "academicTranslator": "Academic Paper Translator",
    "newsTranslator": "News Media Translator",
    "musicExpert": "Music Expert",
    "medicalTranslator": "Medical Translation Master",
    "legalTranslator": "Legal Industry Translator",
    "githubEnhancer": "GitHub Translation Enhancer",
    "gamingTranslator": "Gaming Translator",
    "ecommerceTranslator": "E-commerce Translation Master",
    "financeTranslator": "Financial Translation Consultant",
    "novelTranslator": "Novel Translator",
    "ao3Translator": "AO3 Translator",
    "ebookTranslator": "E-book Translator",
    "designer": "Designer",
    "cnEnPolisher": "Chinese-English Polisher",
    "web3Translator": "Web3 Translation Master",
    "moreModels": "Configure more models",
    'displayStyle': 'Display Style',
    'fontColor': 'Font Color',
    'fontColorDesc': 'Set the font color for translations, default is pink(#ff5588)',
    'fontSize': 'Font Size',
    'fontSizeSmall': 'Small',
    'fontSizeMedium': 'Medium',
    'fontSizeLarge': 'Large',
    'showOriginalText': 'Show Original Text',
    'showOriginalTextDesc': 'Whether to keep the original text in replacement mode'
  },
  
  'ja': {
    // ナビゲーションバー
    'app_title': 'Transor',
    'login_status': {
      'logged_out': 'ログインしていません',
      'logged_in': 'ログイン済み',
      'profile': 'プロフィール'
    },
    
    // 主な機能
    'favorites_label': '単語帳',
    'open_favorites': '英語学習のお気に入りを開く',
    'settings_title': '設定',
    'settings_description': '翻訳エンジン、言語などを調整',
    
    // 翻訳設定
    'source_language': '翻訳元言語',
    'target_language': '翻訳先言語',
    'translation_service': '翻訳サービス：',
    'display_type': '表示タイプ：',
    'ui_language': 'インターフェース言語：',
    'translation_toggle': '翻訳切り替え',
    'toggle_translation': '翻訳のオン/オフ（⌥A）',
    'advanced_settings': '詳細設定',
    'openai_api_key': 'OpenAI APIキー',
    'enter_openai_api_key': 'OpenAI APIキーを入力してください',
    'openai_model': 'OpenAIモデル',
    'deepseek_api_key': 'DeepSeek APIキー',
    'enter_deepseek_api_key': 'DeepSeek APIキーを入力してください',
    'input_triple_space_tip': 'ヒント：任意の入力フィールドでテキストを入力した後、スペースを3回連続で押すと即座にテキストが翻訳されます。ESCキーを押すとキャンセルできます。',
    'input_space_translation_toggle': '入力スペース翻訳',
    'microsoftApiInfo': 'システム組み込みキー、設定不要',
    'customApiEndpoint': 'カスタム API エンドポイント：',
    
    // 言語オプション
    'auto_detect': '自動検出',
    'chinese': '簡体字中国語',
    'english': '英語',
    'japanese': '日本語',
    'korean': '韓国語',
    'french': 'フランス語',
    'german': 'ドイツ語',
    'spanish': 'スペイン語',
    'russian': 'ロシア語',
    
    // 翻訳スタイル
    'general': '一般',
    'universal_style': 'ユニバーサル（スマートスタイル選択）',
    'replace': '置換（直接置換）',
    'bilingual_above': '二言語（翻訳を上に表示）',
    'bilingual_below': '二言語（翻訳を下に表示）',
    'inline': '二言語（原文の後に翻訳を表示）',
    'hover': 'ホバー（マウスオーバーで表示）',
    'tip': 'ナビゲーションヒント（メニュー用）',
    
    // 詳細設定
    'excluded_tags': '除外するHTMLタグ',
    'excluded_classes': '除外するCSSクラス',
    'custom_css': 'カスタムCSSスタイル',
    'excluded_tags_placeholder': '除外するHTMLタグを選択',
    'excluded_classes_placeholder': '除外するCSSクラスをカンマで区切って入力',
    'custom_css_placeholder': 'カスタムCSSスタイルを入力',
    
    // タグオプション
    'tag_code': 'コードブロック(code)',
    'tag_pre': '整形済みテキスト(pre)',
    'tag_script': 'スクリプト(script)',
    'tag_style': 'スタイル(style)',
    'tag_headings': '見出し(h1-h6)',
    'tag_links': 'リンク(a)',

    // 設定ページ
    "settings": "設定",
    "generalSettings": "一般設定",
    "generalSettingsDescription": "Transorの基本設定と翻訳設定を構成する",
    "translationServices": "翻訳サービス",
    "translationServicesDescription": "さまざまな翻訳サービスを管理および設定する",
    "featureManagement": "機能管理",
    "featureManagementDescription": "Transorのさまざまな機能を有効または無効にする",
    "about": "について",
    "aboutDescription": "Transorについての詳細を知る",
    "languageSettings": "言語設定",
    "uiLanguage": "インターフェース言語",
    "targetLanguage": "翻訳先言語",
    "translationOptions": "翻訳オプション",
    "defaultEngine": "デフォルト翻訳エンジン",
    "translationStyle": "翻訳スタイル",
    "inlineDisplay": "インライン表示",
    "bubbleDisplay": "バブル表示",
    "replaceOriginal": "原文を置き換える",
    "saveSettings": "設定を保存",
    "restoreDefaults": "デフォルトに戻す",
    "apiKeys": "APIキー",
    "apiKeysDescription": "各翻訳サービスのAPIキーを設定する",
    "currentEngine": "現在使用中の翻訳エンジン",
    "functionSwitches": "機能スイッチ",
    "appInfo": "アプリ情報",
    "appDescription": "Transorは、ウェブページ翻訳、お気に入りのハイライト、YouTubeの字幕翻訳などの機能を提供する強力なブラウザ翻訳拡張機能です。",
    "version": "バージョン",
    "supportUs": "サポートする",
    "supportDescription": "Transorが気に入ったら、良い評価を付けるか友達と共有することを検討してください。",
    "supportMotivation": "あなたのサポートが私たちの改善への動機付けになります！",
    "enableWebTranslation": "ウェブ翻訳を有効にする",
    "enableWebTranslationDesc": "Transorがウェブコンテンツを翻訳できるようにする",
    "highlightFavorites": "お気に入りをハイライト",
    "highlightFavoritesDesc": "ウェブページ上で保存した単語やフレーズをハイライト表示する",
    "youtubeCinemaMode": "YouTube シネマモード",
    "youtubeCinemaModeDesc": "YouTubeで字幕翻訳機能を有効にする",
    "settingsSaved": "設定が保存されました",
    "uiLanguageUpdated": "インターフェース言語が更新されました",
    "confirmRestore": "すべての設定をクリアしてデフォルトに戻しますか？",
    
    // AIモジュール設定
    "model": "モデル",
    "inputCustomModel": "カスタムモデル名を入力",
    "maxRequestsPerSecond": "1秒あたりの最大リクエスト数",
    "requestLimitWarning": "このリミットを超えるリクエストは次の秒まで待機状態になります。AIサービスの様々な制限により、最新の推奨値については<span style=\"color: var(--danger-color);\">こちら</span>をクリックしてください",
    "enableAiContext": "AIスマートコンテキストを有効にする",
    "aiContextDesc": "有効にすると、システムはまず全文の内容と専門用語を理解し、より専門的で正確な翻訳を提供します。記事ウェブページ（ブログ、ニュース）、電子書籍、PDF、バイリンガルコンテンツをサポートします。AIエキスパートコンパニオンはスマートコンテキストをサポートします。現在は実験的な機能で、Proメンバーのみが利用できます。",
    "aiExpertStrategy": "AI専門家",
    "translationMaster": "意訳マスター",
    "literalExpert": "直訳エキスパート",
    "contextAnalyzer": "コンテキスト分析者",
    "culturalAdapter": "文化適応者",
    "universal": "ユニバーサル",
    "smartChoice": "スマート選択",
    "paragraphExpert": "段落要約エキスパート",
    "englishSimplifier": "英語シンプル化マスター",
    "twitterEnhancer": "Twitter翻訳エンハンサー",
    "techTranslator": "技術翻訳マスター",
    "redditEnhancer": "Reddit翻訳エンハンサー",
    "academicTranslator": "学術論文翻訳者",
    "newsTranslator": "ニュースメディア翻訳者",
    "musicExpert": "音楽専門家",
    "medicalTranslator": "医学翻訳マスター",
    "legalTranslator": "法律業界翻訳者",
    "githubEnhancer": "GitHub翻訳エンハンサー",
    "gamingTranslator": "ゲーム翻訳者",
    "ecommerceTranslator": "Eコマース翻訳マスター",
    "financeTranslator": "金融翻訳コンサルタント",
    "novelTranslator": "小説翻訳者",
    "ao3Translator": "AO3翻訳者",
    "ebookTranslator": "電子書籍翻訳者",
    "designer": "デザイナー",
    "cnEnPolisher": "中英混合",
    "web3Translator": "Web3翻訳マスター",
    "moreModels": "その他のモデルを設定",
    'displayStyle': '表示スタイル',
    'fontColor': 'フォントカラー',
    'fontColorDesc': '翻訳のフォント色を設定します。デフォルトはピンク色(#ff5588)です',
    'fontSize': 'フォントサイズ',
    'fontSizeSmall': '小',
    'fontSizeMedium': '中',
    'fontSizeLarge': '大',
    'showOriginalText': '原文を表示',
    'showOriginalTextDesc': '置換モードにて原文を保持するかどうか'
  },
  
  'ko': {
    // 내비게이션 바
    'app_title': 'Transor',
    'login_status': {
      'logged_out': '로그인하지 않음',
      'logged_in': '로그인됨',
      'profile': '프로필'
    },
    
    // 주요 기능
    'favorites_label': '단어장',
    'open_favorites': '영어 학습 즐겨찾기 열기',
    'settings_title': '설정',
    'settings_description': '번역 엔진, 언어 등 조정',
    
    // 번역 설정
    'source_language': '원본 언어',
    'target_language': '대상 언어',
    'translation_service': '번역 서비스:',
    'display_type': '표시 유형:',
    'ui_language': '인터페이스 언어:',
    'translation_toggle': '번역 토글',
    'toggle_translation': '번역 켜기/끄기',
    'advanced_settings': '고급 설정',
    'openai_api_key': 'OpenAI API 키',
    'enter_openai_api_key': 'OpenAI API 키를 입력하세요',
    'openai_model': 'OpenAI 모델',
    'deepseek_api_key': 'DeepSeek API 키',
    'enter_deepseek_api_key': 'DeepSeek API 키를 입력하세요',
    'input_triple_space_tip': '팁: 텍스트 입력 후 스페이스 키를 연속 세 번 누르면 즉시 번역됩니다. ESC 키를 누르면 번역이 취소됩니다.',
    'input_space_translation_toggle': '입력 공간 번역',
    'microsoftApiInfo': '시스템 내장 키, 설정 필요 없음',
    'customApiEndpoint': '사용자 정의 API 엔드포인트:',
    
    // 언어 옵션
    'auto_detect': '자동 감지',
    'chinese': '중국어 간체',
    'english': '영어',
    'japanese': '일본어',
    'korean': '한국어',
    'french': '프랑스어',
    'german': '독일어',
    'spanish': '스페인어',
    'russian': '러시아어',
    
    // 번역 스타일
    'general': '일반',
    'universal_style': '범용(스마트 스타일 선택)',
    'replace': '대체 (직접 대체)',
    'bilingual_above': '이중 언어 (번역문 위)',
    'bilingual_below': '이중 언어 (번역문 아래)',
    'inline': '이중 언어 (원문 뒤에 번역문)',
    'hover': '호버 (마우스 오버시 표시)',
    'tip': '내비게이션 팁 (메뉴용)',
    
    // 고급 설정
    'excluded_tags': '제외할 HTML 태그',
    'excluded_classes': '제외할 CSS 클래스',
    'custom_css': '사용자 정의 CSS 스타일',
    'excluded_tags_placeholder': '제외할 HTML 태그 선택',
    'excluded_classes_placeholder': '제외할 CSS 클래스를 쉼표로 구분하여 입력',
    'custom_css_placeholder': '사용자 정의 CSS 스타일 입력',
    
    // 태그 옵션
    'tag_code': '코드 블록(code)',
    'tag_pre': '서식이 지정된 텍스트(pre)',
    'tag_script': '스크립트(script)',
    'tag_style': '스타일(style)',
    'tag_headings': '제목(h1-h6)',
    'tag_links': '링크(a)',

    // 설정 페이지
    "settings": "설정",
    "generalSettings": "일반 설정",
    "generalSettingsDescription": "Transor의 기본 설정 및 번역 환경설정 구성",
    "translationServices": "번역 서비스",
    "translationServicesDescription": "다양한 번역 서비스 관리 및 구성",
    "featureManagement": "기능 관리",
    "featureManagementDescription": "Transor의 다양한 기능 활성화 또는 비활성화",
    "about": "정보",
    "aboutDescription": "Transor에 대해 자세히 알아보기",
    "languageSettings": "언어 설정",
    "uiLanguage": "인터페이스 언어",
    "targetLanguage": "번역 대상 언어",
    "translationOptions": "번역 옵션",
    "defaultEngine": "기본 번역 엔진",
    "translationStyle": "번역 스타일",
    "inlineDisplay": "인라인 표시",
    "bubbleDisplay": "버블 표시",
    "replaceOriginal": "원문 대체",
    "saveSettings": "설정 저장",
    "restoreDefaults": "기본값 복원",
    "apiKeys": "API 키",
    "apiKeysDescription": "다양한 번역 서비스를 위한 API 키 구성",
    "currentEngine": "현재 번역 엔진",
    "functionSwitches": "기능 스위치",
    "appInfo": "앱 정보",
    "appDescription": "Transor는 웹 페이지 번역, 즐겨찾기 강조 표시, YouTube 자막 번역 등을 제공하는 강력한 브라우저 번역 확장 프로그램입니다.",
    "version": "버전",
    "supportUs": "지원하기",
    "supportDescription": "Transor가 마음에 드신다면 좋은 평가를 주시거나 친구들과 공유해 주세요.",
    "supportMotivation": "여러분의 지원이 저희가 계속 개선할 수 있는 동기가 됩니다!",
    "enableWebTranslation": "웹 번역 활성화",
    "enableWebTranslationDesc": "Transor가 웹 콘텐츠를 번역할 수 있도록 허용",
    "highlightFavorites": "즐겨찾기 강조",
    "highlightFavoritesDesc": "웹 페이지에서 저장된 단어와 구문 강조 표시",
    "youtubeCinemaMode": "YouTube 시네마 모드",
    "youtubeCinemaModeDesc": "YouTube에서 자막 번역 기능 활성화",
    "settingsSaved": "설정이 저장됨",
    "uiLanguageUpdated": "인터페이스 언어가 업데이트됨",
    "confirmRestore": "모든 설정을 지우고 기본값을 복원하시겠습니까?",
    
    // AI모듈 설정
    "model": "모델",
    "inputCustomModel": "사용자 정의 모델 이름 입력",
    "maxRequestsPerSecond": "초당 최대 요청 수",
    "requestLimitWarning": "이 제한을 초과하는 요청은 다음 초까지 대기열에 들어갑니다. AI 서비스의 다양한 제한으로 인해 최신 권장 값을 보려면 <span style=\"color: var(--danger-color);\">여기</span>를 클릭하세요",
    "enableAiContext": "AI 스마트 컨텍스트 활성화",
    "aiContextDesc": "활성화하면 시스템이 먼저 전체 텍스트 내용과 전문 용어를 이해하여 번역을 더 전문적이고 정확하게 만듭니다. 기사 웹 페이지(블로그, 뉴스), 전자책, PDF, 이중 언어 콘텐츠를 지원합니다. AI 전문가 동반자는 스마트 컨텍스트를 지원합니다. 현재 실험적 기능으로, Pro 회원만 사용할 수 있습니다.",
    "aiExpertStrategy": "AI 전문가",
    "translationMaster": "Translation Master",
    "literalExpert": "直译专家",
    "contextAnalyzer": "语境分析师",
    "culturalAdapter": "文化适配师",
    "universal": "通用",
    "smartChoice": "智能选择",
    "paragraphExpert": "段落总结专家",
    "englishSimplifier": "英文简化大师",
    "twitterEnhancer": "Twitter 翻译增强器",
    "techTranslator": "科技类翻译大师",
    "redditEnhancer": "Reddit 翻译增强器",
    "academicTranslator": "学术论文翻译师",
    "newsTranslator": "新闻媒体译者",
    "musicExpert": "音乐专家",
    "medicalTranslator": "医学翻译大师",
    "legalTranslator": "法律行业译者",
    "githubEnhancer": "GitHub 翻译增强器",
    "gamingTranslator": "游戏译者",
    "ecommerceTranslator": "电商翻译大师",
    "financeTranslator": "金融翻译顾问",
    "novelTranslator": "小说译者",
    "ao3Translator": "AO3 译者",
    "ebookTranslator": "电子书译者",
    "designer": "设计师",
    "cnEnPolisher": "中英夹杂",
    "web3Translator": "Web3 翻译大师",
    "moreModels": "设置更多模型",
    'displayStyle': '显示样式',
    'fontColor': '字体颜色',
    'fontColorDesc': '设置译文的字体颜色，默认为粉色(#ff5588)',
    'fontSize': '字体大小',
    'fontSizeSmall': '小',
    'fontSizeMedium': '中',
    'fontSizeLarge': '大',
    'showOriginalText': '显示原文',
    'showOriginalTextDesc': '在替换模式下是否仍然保留原文'
  }
};

// 默认语言
let currentLanguage = localStorage.getItem('transor-ui-language') || 'zh-CN';

// 应用默认配置
const defaultConfig = {
  uiLanguage: 'zh-CN',
  targetLanguage: 'zh-CN',
  translationEngine: 'microsoft',
  translationStyle: 'universal'
};

// 获取翻译文本
function t(key, lang = currentLanguage) {
  // 支持嵌套键，如 'login_status.logged_out'
  const keys = key.split('.');
  let value = i18n[lang];
  
  for (const k of keys) {
    if (value && value[k] !== undefined) {
      value = value[k];
    } else {
      // 如果找不到翻译，返回键名
      return key;
    }
  }
  
  return value;
}

// 设置当前语言
function setLanguage(lang) {
  if (i18n[lang]) {
    currentLanguage = lang;
    localStorage.setItem('transor-ui-language', lang);
    
    // 触发语言变更事件
    const event = new CustomEvent('language-changed', { detail: { language: lang } });
    window.dispatchEvent(event);
    
    return true;
  }
  return false;
}

// 获取当前语言
function getCurrentLanguage() {
  return currentLanguage;
}

// 获取所有支持的语言
function getSupportedLanguages() {
  return Object.keys(i18n);
}

// 获取默认配置
function getDefaultConfig() {
  return defaultConfig;
}

// 创建i18n辅助对象
const i18nHelper = {
  t,
  setLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
  getDefaultConfig,
  defaultConfig
};

// 暴露i18n函数和对象给全局使用
window.i18n = i18nHelper;

// 触发i18n加载完成事件，用于其他脚本的协调
window.dispatchEvent(new Event('i18n-loaded')); 