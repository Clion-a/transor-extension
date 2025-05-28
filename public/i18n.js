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
    'universal': '通用(智能选择显示样式)',
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
    'tag_links': '链接(a)'
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
    'universal': 'Universal (Smart Style Selection)',
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
    'tag_links': 'Links (a)'
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
    'tag_links': 'リンク(a)'
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
    'tag_links': '링크(a)'
  }
};

// 默认语言
let currentLanguage = localStorage.getItem('transor-ui-language') || 'zh-CN';

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

// 导出多语言功能
window.i18n = {
  t,
  setLanguage,
  getCurrentLanguage,
  getSupportedLanguages
}; 