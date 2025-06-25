// 多语言支持 - 为favorites.html提供国际化功能
// 初始化i18n
document.addEventListener('DOMContentLoaded', function() {
  console.log("收藏夹页面加载完成，开始初始化多语言...");
  
  // 从localStorage获取临时语言设置
  let currentLanguage = localStorage.getItem('transor-ui-language') || 'zh-CN';
  console.log("从localStorage获取的语言设置:", currentLanguage);
  
  // 尝试从Chrome存储获取语言设置（优先级高于localStorage）
  try {
    console.log("正在从chrome.storage获取语言设置...");
    
    chrome.storage.local.get(['transor-ui-language'], function(result) {
      console.log("chrome.storage获取结果:", result);
      
      if (result && result['transor-ui-language']) {
        currentLanguage = result['transor-ui-language'];
        console.log("使用chrome.storage中的语言设置:", currentLanguage);
        applyLanguage(currentLanguage);
        
        // 同步到localStorage以保持一致性
        localStorage.setItem('transor-ui-language', currentLanguage);
      } else {
        console.log("chrome.storage中无语言设置，使用localStorage值:", currentLanguage);
        applyLanguage(currentLanguage);
      }
    });
    
    // 监听来自background的消息，接收语言变更通知
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      if (message && message.action === 'language-changed') {
        console.log('收到后台语言变更消息:', message.language);
        
        // 安全地应用语言
        try {
          applyLanguage(message.language);
          sendResponse({ success: true });
        } catch (e) {
          console.error('应用语言设置时出错:', e);
          sendResponse({ success: false, error: e.message });
        }
        
        return true; // 保持消息通道开放以便异步响应
      }
    });
    
    // 直接从Storage API监听变化
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace === 'local' && changes['transor-ui-language']) {
        const newLanguage = changes['transor-ui-language'].newValue;
        console.log('检测到界面语言变化:', newLanguage, '旧值:', changes['transor-ui-language'].oldValue);
        
        // 使用错误处理应用新语言设置
        try {
          // 设置短延迟确保设置已完全保存
          setTimeout(() => {
            console.log('应用新的语言设置:', newLanguage);
            applyLanguage(newLanguage);
          }, 150);
        } catch (e) {
          console.error('应用语言变更时出错:', e.message);
        }
      }
    });
    
    // 添加定期检查语言设置函数
    const checkLanguageSetting = () => {
      chrome.storage.local.get(['transor-ui-language'], (result) => {
        const storedLanguage = result['transor-ui-language'];
        const currentSetLanguage = window.i18n?.currentLanguage || localStorage.getItem('transor-ui-language') || 'zh-CN';
        
        // 如果存储中的语言与当前语言不同，更新当前语言
        if (storedLanguage && storedLanguage !== currentSetLanguage) {
          console.log('检测到语言设置不一致:', storedLanguage, '!=', currentSetLanguage);
          applyLanguage(storedLanguage);
        }
      });
    };
    
    // 定期检查语言设置，确保保持同步
    setTimeout(checkLanguageSetting, 2000);
    setInterval(checkLanguageSetting, 10000);
  } catch (e) {
    // 如果不在扩展环境中，直接使用localStorage的值
    console.error("获取chrome.storage失败，使用localStorage:", e);
    applyLanguage(currentLanguage);
  }
});

// 应用语言设置
function applyLanguage(lang) {
  console.log("开始应用语言:", lang);
  const translations = {
    'zh-CN': {
      'favorites_title': '英语学习收藏夹 - Transor',
      'favorites_heading': '英语学习收藏夹',
      'search_placeholder': '搜索收藏内容...',
      'search_button': '搜索',
      'filter_all': '全部',
      'filter_word': '单词',
      'filter_sentence': '句子',
      'filter_paragraph': '段落',
      'filter_today': '今天',
      'filter_week': '本周',
      'filter_month': '本月',
      'empty_favorites': '暂无收藏内容',
      'empty_description': '你还没有收藏任何内容，浏览网页时选中文本并点击收藏按钮来添加',
      'date_today': '今天',
      'date_yesterday': '昨天',
      'date_this_week': '本周',
      'date_this_month': '本月',
      'date_earlier': '更早',
      'copy_action': '复制',
      'delete_action': '删除',
      'copied_message': '已复制到剪贴板',
      'no_matching_content': '没有找到匹配的内容',
      'try_change_filter': '尝试更改筛选条件或搜索关键词',
      'unknown_source': '未知来源',
      'unknown_page': '未知页面',
      'confirm_delete': '确定要删除这条收藏吗？'
    },
    'en': {
      'favorites_title': 'English Learning Favorites - Transor',
      'favorites_heading': 'English Learning Favorites',
      'search_placeholder': 'Search favorites...',
      'search_button': 'Search',
      'filter_all': 'All',
      'filter_word': 'Words',
      'filter_sentence': 'Sentences',
      'filter_paragraph': 'Paragraphs',
      'filter_today': 'Today',
      'filter_week': 'This Week',
      'filter_month': 'This Month',
      'empty_favorites': 'No favorites yet',
      'empty_description': 'You haven\'t saved any favorites. Select text while browsing and click the favorite button to add.',
      'date_today': 'Today',
      'date_yesterday': 'Yesterday',
      'date_this_week': 'This Week',
      'date_this_month': 'This Month',
      'date_earlier': 'Earlier',
      'copy_action': 'Copy',
      'delete_action': 'Delete',
      'copied_message': 'Copied to clipboard',
      'no_matching_content': 'No matching content found',
      'try_change_filter': 'Try changing filter criteria or search terms',
      'unknown_source': 'Unknown source',
      'unknown_page': 'Unknown page',
      'confirm_delete': 'Are you sure you want to delete this item?'
    },
    'ja': {
      'favorites_title': '英語学習お気に入り - Transor',
      'favorites_heading': '英語学習お気に入り',
      'search_placeholder': 'お気に入りを検索...',
      'search_button': '検索',
      'filter_all': 'すべて',
      'filter_word': '単語',
      'filter_sentence': '文',
      'filter_paragraph': '段落',
      'filter_today': '今日',
      'filter_week': '今週',
      'filter_month': '今月',
      'empty_favorites': 'お気に入りはまだありません',
      'empty_description': 'まだお気に入りがありません。閲覧中にテキストを選択し、お気に入りボタンをクリックして追加してください。',
      'date_today': '今日',
      'date_yesterday': '昨日',
      'date_this_week': '今週',
      'date_this_month': '今月',
      'date_earlier': 'それ以前',
      'copy_action': 'コピー',
      'delete_action': '削除',
      'copied_message': 'クリップボードにコピーしました',
      'no_matching_content': '一致するコンテンツが見つかりません',
      'try_change_filter': 'フィルター条件または検索語を変更してみてください',
      'unknown_source': '不明なソース',
      'unknown_page': '不明なページ',
      'confirm_delete': 'このアイテムを削除してもよろしいですか？'
    },
    'ko': {
      'favorites_title': '영어 학습 즐겨찾기 - Transor',
      'favorites_heading': '영어 학습 즐겨찾기',
      'search_placeholder': '즐겨찾기 검색...',
      'search_button': '검색',
      'filter_all': '전체',
      'filter_word': '단어',
      'filter_sentence': '문장',
      'filter_paragraph': '단락',
      'filter_today': '오늘',
      'filter_week': '이번 주',
      'filter_month': '이번 달',
      'empty_favorites': '즐겨찾기가 없습니다',
      'empty_description': '아직 저장된 즐겨찾기가 없습니다. 웹 페이지를 탐색하는 동안 텍스트를 선택하고 즐겨찾기 버튼을 클릭하여 추가하세요.',
      'date_today': '오늘',
      'date_yesterday': '어제',
      'date_this_week': '이번 주',
      'date_this_month': '이번 달',
      'date_earlier': '이전',
      'copy_action': '복사',
      'delete_action': '삭제',
      'copied_message': '클립보드에 복사됨',
      'no_matching_content': '일치하는 내용을 찾을 수 없습니다',
      'try_change_filter': '필터 기준이나 검색어를 변경해보세요',
      'unknown_source': '알 수 없는 출처',
      'unknown_page': '알 수 없는 페이지',
      'confirm_delete': '이 항목을 삭제하시겠습니까?'
    }
  };
  
  // 根据语言设置应用翻译
  const i18n = translations[lang] || translations['zh-CN'];
  
  // 设置网页标题
  document.title = i18n['favorites_title'] || 'English Learning Favorites';
  console.log("设置页面标题:", document.title);
  
  // 应用文本翻译
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[key]) {
      el.textContent = i18n[key];
    }
  });
  
  // 应用placeholder翻译
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[key]) {
      el.placeholder = i18n[key];
    }
  });
  
  // 为JS代码提供全局翻译对象
  window.i18n = {
    t: function(key) {
      return i18n[key] || key;
    },
    setLanguage: function(newLang) {
      applyLanguage(newLang);
    },
    currentLanguage: lang
  };
  
  // 同步更新localStorage中的语言设置
  localStorage.setItem('transor-ui-language', lang);
  console.log("语言应用完成，当前语言:", lang);
  
  // 触发自定义事件通知其他组件语言已更改
  const event = new CustomEvent('language-changed', { detail: { language: lang } });
  document.dispatchEvent(event);
} 