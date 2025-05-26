/**
 * Transor - 收藏内容高亮功能
 * 实现收藏的单词和句子在页面中的高亮显示
 */

class FavoritesHighlighter {
  constructor() {
    this.favorites = [];
    this.highlightedElements = new Set();
    this.observer = null;
    this.isEnabled = true;
    this.highlightClass = 'transor-favorite-highlight';
    this.debounceTimer = null;
    
    // 初始化
    this.init();
  }

  async init() {
    console.log('初始化收藏高亮功能...');
    
    // 注入样式
    this.injectStyles();
    
    // 加载收藏数据
    await this.loadFavorites();
    
    // 监听收藏数据变化
    this.setupStorageListener();
    
    // 监听DOM变化
    this.setupMutationObserver();
    
    // 初始高亮
    this.highlightPage();
    
    console.log('收藏高亮功能初始化完成');
  }

  // 注入高亮样式
  injectStyles() {
    if (document.getElementById('transor-highlight-styles')) {
      return; // 样式已存在
    }

    const style = document.createElement('style');
    style.id = 'transor-highlight-styles';
    style.textContent = `
      .${this.highlightClass} {
        color: #ff6a00 !important;
      }
      
      /* 防止高亮影响布局 */
      .${this.highlightClass} * {
        color: #ff6a00 !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  // 加载收藏数据
  async loadFavorites() {
    try {
      if (window.TransorStorageManager) {
        // 使用新的存储管理器
        this.favorites = await window.TransorStorageManager.loadFavorites();
        console.log(`✅ 通过存储管理器加载了 ${this.favorites.length} 条收藏数据`);
      } else {
        // 降级到原有方式
        console.warn('存储管理器不可用，使用原有方式加载');
        this.favorites = await this.loadFavoritesLegacy();
      }
    } catch (error) {
      console.error('加载收藏数据失败:', error);
      this.favorites = [];
    }
  }

  // 原有的加载方式（作为降级方案）
  async loadFavoritesLegacy() {
    return new Promise((resolve) => {
      chrome.storage.sync.get('transorFavorites', (result) => {
        const favorites = result.transorFavorites || [];
        console.log(`通过原有方式加载了 ${favorites.length} 条收藏数据`);
        resolve(favorites);
      });
    });
  }

  // 监听存储变化
  setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.transorFavorites) {
        console.log('检测到收藏数据变化，重新加载高亮');
        this.favorites = changes.transorFavorites.newValue || [];
        
        // 清除现有高亮
        this.clearAllHighlights();
        
        // 重新高亮
        this.highlightPage();
      }
    });
  }

  // 设置DOM变化监听器
  setupMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        // 检查是否有新的文本节点或元素添加
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE || 
                (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains(this.highlightClass))) {
              shouldUpdate = true;
            }
          });
        }
        
        // 检查文本内容变化
        if (mutation.type === 'characterData') {
          shouldUpdate = true;
        }
      });

      if (shouldUpdate) {
        // 使用防抖避免频繁更新
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.highlightPage();
        }, 300);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // 高亮整个页面
  highlightPage() {
    if (!this.isEnabled || this.favorites.length === 0) {
      return;
    }

    console.log('开始高亮页面内容...');
    
    try {
      // 获取所有文本节点
      const textNodes = this.getTextNodes(document.body);
      
      if (!textNodes || textNodes.length === 0) {
        console.log('未找到可高亮的文本节点');
        return;
      }
      
      // 为每个收藏项进行高亮
      this.favorites.forEach(favorite => {
        try {
          if (favorite && favorite.original) {
            this.highlightText(favorite.original, textNodes);
          }
        } catch (error) {
          console.warn(`高亮收藏项 "${favorite?.original}" 时发生错误:`, error);
        }
      });
      
      console.log(`页面高亮完成，共高亮 ${this.highlightedElements.size} 个元素`);
    } catch (error) {
      console.error('高亮页面时发生错误:', error);
    }
  }

  // 获取所有文本节点
  getTextNodes(element) {
    const textNodes = [];
    
    // 检查元素是否有效
    if (!element || !element.nodeType) {
      return textNodes;
    }
    
    try {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            try {
              // 检查节点是否仍然有效
              if (!node || !node.parentElement || !node.textContent) {
                return NodeFilter.FILTER_REJECT;
              }
              
              // 跳过已高亮的元素
              if (node.parentElement.classList.contains(this.highlightClass)) {
                return NodeFilter.FILTER_REJECT;
              }
              
              // 跳过脚本、样式等元素
              const tagName = node.parentElement.tagName?.toLowerCase();
              if (['script', 'style', 'noscript', 'textarea', 'input'].includes(tagName)) {
                return NodeFilter.FILTER_REJECT;
              }
              
              // 跳过不可见元素
              const computedStyle = window.getComputedStyle(node.parentElement);
              if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                return NodeFilter.FILTER_REJECT;
              }
              
              // 只处理有实际文本内容的节点
              if (node.textContent.trim().length > 0) {
                return NodeFilter.FILTER_ACCEPT;
              }
              
              return NodeFilter.FILTER_REJECT;
            } catch (error) {
              console.warn('检查文本节点时发生错误:', error);
              return NodeFilter.FILTER_REJECT;
            }
          }
        }
      );

      let node;
      while ((node = walker.nextNode()) !== null) {
        // 再次检查节点是否有效
        if (node && node.parentNode && node.textContent) {
          textNodes.push(node);
        }
      }
    } catch (error) {
      console.error('获取文本节点时发生错误:', error);
    }

    return textNodes;
  }

  // 高亮指定文本
  highlightText(searchText, textNodes = null) {
    if (!searchText || searchText.trim().length === 0) {
      return;
    }

    const cleanSearchText = searchText.trim();
    
    // 如果没有提供文本节点，获取所有文本节点
    if (!textNodes) {
      textNodes = this.getTextNodes(document.body);
    }

    // 确保textNodes是数组
    if (!Array.isArray(textNodes)) {
      console.warn('textNodes 不是数组，跳过高亮');
      return;
    }

    textNodes.forEach(textNode => {
      try {
        // 再次检查文本节点是否有效
        if (!textNode || !textNode.parentNode || !textNode.textContent) {
          return;
        }
        
        const text = textNode.textContent;
        
        // 使用单词边界检查是否包含完整的单词
        if (this.containsWholeWord(text, cleanSearchText)) {
          this.highlightInTextNode(textNode, cleanSearchText);
        }
      } catch (error) {
        console.warn('处理文本节点时发生错误:', error);
      }
    });
  }

  // 检查文本中是否包含完整的单词
  containsWholeWord(text, searchWord) {
    // 转换为小写进行比较
    const lowerText = text.toLowerCase();
    const lowerSearchWord = searchWord.toLowerCase();
    
    // 创建单词边界正则表达式
    // \b 表示单词边界，确保匹配的是完整单词
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegExp(lowerSearchWord)}\\b`, 'i');
    
    return wordBoundaryRegex.test(lowerText);
  }

  // 转义正则表达式特殊字符
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 在文本节点中高亮指定文本
  highlightInTextNode(textNode, searchText) {
    // 检查文本节点是否仍然有效
    if (!textNode || !textNode.parentNode || !textNode.textContent) {
      return;
    }
    
    const parent = textNode.parentNode;
    const text = textNode.textContent;
    
    // 创建单词边界正则表达式，全局匹配
    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegExp(searchText)}\\b`, 'gi');
    
    // 查找所有匹配的位置
    const matches = [];
    let match;
    while ((match = wordBoundaryRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0]
      });
    }
    
    // 如果没有匹配，直接返回
    if (matches.length === 0) {
      return;
    }
    
    // 从后往前处理匹配项，避免索引偏移问题
    const fragments = [];
    let lastIndex = 0;
    
    matches.forEach(matchInfo => {
      // 添加匹配前的文本
      if (matchInfo.index > lastIndex) {
        fragments.push(document.createTextNode(text.substring(lastIndex, matchInfo.index)));
      }
      
      // 创建高亮元素
      const highlightSpan = document.createElement('span');
      highlightSpan.className = this.highlightClass;
      highlightSpan.textContent = matchInfo.text;
      
      fragments.push(highlightSpan);
      this.highlightedElements.add(highlightSpan);
      
      lastIndex = matchInfo.index + matchInfo.length;
    });
    
    // 添加最后剩余的文本
    if (lastIndex < text.length) {
      fragments.push(document.createTextNode(text.substring(lastIndex)));
    }
    
    // 如果有高亮内容，替换原文本节点
    if (fragments.length > 1) {
      // 再次检查父节点是否仍然存在
      if (!parent || !parent.contains(textNode)) {
        console.warn('父节点不存在或文本节点已被移除，跳过高亮');
        return;
      }
      
      try {
        // 使用文档片段来批量插入，提高性能
        const fragment = document.createDocumentFragment();
        fragments.forEach(frag => {
          fragment.appendChild(frag);
        });
        
        // 替换原文本节点
        parent.insertBefore(fragment, textNode);
        parent.removeChild(textNode);
      } catch (error) {
        console.error('高亮文本时发生错误:', error);
        // 如果出错，清理已创建的高亮元素
        fragments.forEach(frag => {
          if (frag.nodeType === Node.ELEMENT_NODE && frag.classList.contains(this.highlightClass)) {
            this.highlightedElements.delete(frag);
          }
        });
      }
    }
  }

  // 添加高亮元素点击事件
  addHighlightClickHandler(/* element, originalText */) {
    // 不添加任何点击事件处理
  }

  // 显示翻译提示
  showTranslationTooltip(/* element, favorite */) {
    // 不显示任何提示
  }

  // 清除所有高亮
  clearAllHighlights() {
    const elementsToRemove = Array.from(this.highlightedElements);
    
    elementsToRemove.forEach(element => {
      try {
        if (element && element.parentNode) {
          // 用文本节点替换高亮元素
          const textNode = document.createTextNode(element.textContent);
          element.parentNode.replaceChild(textNode, element);
        }
      } catch (error) {
        console.warn('清除高亮元素时发生错误:', error);
      }
    });
    
    this.highlightedElements.clear();
    
    // 合并相邻的文本节点
    try {
      this.normalizeTextNodes(document.body);
    } catch (error) {
      console.warn('标准化文本节点时发生错误:', error);
    }
  }

  // 标准化文本节点（合并相邻的文本节点）
  normalizeTextNodes(element) {
    if (!element || !element.nodeType) {
      return;
    }
    
    try {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const textNodes = [];
      let node;
      while ((node = walker.nextNode()) !== null) {
        if (node && node.parentNode) {
          textNodes.push(node);
        }
      }

      textNodes.forEach(textNode => {
        try {
          if (!textNode || !textNode.parentNode) {
            return;
          }
          
          let nextSibling = textNode.nextSibling;
          while (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
            textNode.textContent += nextSibling.textContent;
            const nodeToRemove = nextSibling;
            nextSibling = nextSibling.nextSibling;
            
            if (nodeToRemove.parentNode) {
              nodeToRemove.parentNode.removeChild(nodeToRemove);
            }
          }
        } catch (error) {
          console.warn('合并文本节点时发生错误:', error);
        }
      });
    } catch (error) {
      console.error('标准化文本节点时发生错误:', error);
    }
  }

  // 立即高亮新收藏的内容
  highlightNewFavorite(originalText) {
    console.log(`立即高亮新收藏: ${originalText}`);
    
    // 获取当前页面的文本节点
    const textNodes = this.getTextNodes(document.body);
    
    // 高亮新收藏的文本
    this.highlightText(originalText, textNodes);
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 启用/禁用高亮功能
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.highlightPage();
    } else {
      this.clearAllHighlights();
    }
  }

  // 销毁实例
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.clearAllHighlights();
    
    // 移除样式
    const styleElement = document.getElementById('transor-highlight-styles');
    if (styleElement) {
      styleElement.remove();
    }
    
    // 清除定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

// 全局实例
let favoritesHighlighter = null;

// 初始化高亮功能
function initFavoritesHighlighter() {
  if (!favoritesHighlighter) {
    favoritesHighlighter = new FavoritesHighlighter();
  }
}

// 立即高亮新收藏的内容
function highlightNewFavorite(originalText) {
  if (favoritesHighlighter) {
    favoritesHighlighter.highlightNewFavorite(originalText);
  }
}

// 启用/禁用高亮功能
function setHighlightEnabled(enabled) {
  if (favoritesHighlighter) {
    favoritesHighlighter.setEnabled(enabled);
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFavoritesHighlighter);
} else {
  initFavoritesHighlighter();
}

// 导出给其他脚本使用
window.TransorHighlighter = {
  init: initFavoritesHighlighter,
  highlightNew: highlightNewFavorite,
  setEnabled: setHighlightEnabled,
  getInstance: () => favoritesHighlighter
}; 