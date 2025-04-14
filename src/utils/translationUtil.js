/**
 * 翻译工具类 - 提供网页翻译核心功能
 */
import { translateTexts, detectLanguage } from '../api/translationService';

// 缓存翻译结果
const translationCache = {};

/**
 * 清除翻译缓存
 */
export function clearTranslationCache() {
  Object.keys(translationCache).forEach(key => {
    delete translationCache[key];
  });
}

/**
 * 翻译整个页面内容
 * 
 * @param {Object} settings - 翻译设置
 * @returns {Promise<void>}
 */
export async function translatePage(settings) {
  console.log('开始翻译页面', settings);
  
  const { targetLanguage, sourceLanguage, translationEngine, translationStyle, excludedTags, excludedClasses } = settings;
  
  // 如果禁用了翻译或目标语言与网页语言相同，则不进行翻译
  if (!settings.isEnabled) {
    console.log('翻译已禁用');
    return;
  }
  
  // 创建CSS样式
  _createTranslationStyles(settings.customCss, translationStyle);
  
  // 获取页面可翻译文本节点
  const textNodes = _getTranslatableTextNodes(excludedTags, excludedClasses);
  if (textNodes.length === 0) {
    console.log('没有找到可翻译的文本节点');
    return;
  }
  
  console.log(`找到 ${textNodes.length} 个可翻译文本节点`);
  
  // 提取文本内容
  const textContents = textNodes.map(node => node.textContent.trim())
    .filter(text => text && text.length > 1); // 过滤掉空文本和单字符
  
  // 如果没有有效文本，直接返回
  if (textContents.length === 0) {
    console.log('没有找到有效的文本内容');
    return;
  }
  
  try {
    // 检查缓存，只翻译未缓存的文本
    const textsToTranslate = [];
    const textsToTranslateIndexes = [];
    
    textContents.forEach((text, index) => {
      const cacheKey = `${sourceLanguage}:${targetLanguage}:${translationEngine}:${text}`;
      if (translationCache[cacheKey] === undefined) {
        textsToTranslate.push(text);
        textsToTranslateIndexes.push(index);
      }
    });
    
    // 如果有未缓存的文本需要翻译
    if (textsToTranslate.length > 0) {
      // 调用翻译API
      const translations = await translateTexts(
        textsToTranslate, 
        targetLanguage, 
        sourceLanguage, 
        translationEngine
      );
      
      // 更新缓存
      textsToTranslate.forEach((text, idx) => {
        const cacheKey = `${sourceLanguage}:${targetLanguage}:${translationEngine}:${text}`;
        translationCache[cacheKey] = translations[idx] || text;
      });
    }
    
    // 应用翻译结果到DOM
    textNodes.forEach((node, index) => {
      const text = textContents[index];
      if (!text) return;
      
      const cacheKey = `${sourceLanguage}:${targetLanguage}:${translationEngine}:${text}`;
      const translation = translationCache[cacheKey] || text;
      
      if (translation && translation !== text) {
        _applyTranslation(node, text, translation, translationStyle);
      }
    });
    
    console.log('页面翻译完成');
  } catch (error) {
    console.error('翻译过程中出错:', error);
  }
}

/**
 * 创建翻译样式
 * @param {string} customCss - 自定义CSS
 * @param {string} translationStyle - 翻译样式
 */
function _createTranslationStyles(customCss, translationStyle) {
  // 移除旧样式
  const oldStyle = document.getElementById('transor-translation-styles');
  if (oldStyle) {
    oldStyle.remove();
  }
  
  // 创建新样式
  const style = document.createElement('style');
  style.id = 'transor-translation-styles';
  
  let css = `
    .transor-translation {
      font-size: inherit;
      line-height: inherit;
    }
    
    .transor-inline {
      border-bottom: 1px dashed #42b983;
      padding: 0 2px;
      margin: 0 2px;
      color: #42b983;
    }
    
    .transor-bilingual {
      display: block;
      color: #42b983;
      margin-top: 3px;
      padding-left: 10px;
      border-left: 2px solid #42b983;
    }
    
    .transor-hover {
      position: relative;
      text-decoration: underline;
      text-decoration-style: dotted;
      text-decoration-color: #42b983;
    }
    
    .transor-hover-content {
      display: none;
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-radius: 3px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 8px;
      z-index: 9999;
      color: #333;
      top: 100%;
      left: 0;
      min-width: 200px;
      max-width: 300px;
    }
    
    .transor-hover:hover .transor-hover-content {
      display: block;
    }
  `;
  
  // 添加自定义CSS
  if (customCss) {
    css += '\n' + customCss;
  }
  
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * 获取页面可翻译文本节点
 * @param {Array<string>} excludedTags - 排除的标签
 * @param {Array<string>} excludedClasses - 排除的类名
 * @returns {Array<Node>} - 文本节点数组
 */
function _getTranslatableTextNodes(excludedTags = [], excludedClasses = []) {
  const excludedTagsSet = new Set(excludedTags);
  const excludedClassesSet = new Set(excludedClasses);
  const results = [];
  
  // 递归遍历DOM树
  function walkTextNodes(node) {
    // 文本节点
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text && text.length > 1) {
        let parent = node.parentElement;
        
        // 检查是否在排除的标签中
        if (parent && !excludedTagsSet.has(parent.tagName.toLowerCase())) {
          // 检查是否有排除的类名
          let shouldExclude = false;
          if (parent.classList && parent.classList.length > 0 && excludedClassesSet.size > 0) {
            for (const cls of parent.classList) {
              if (excludedClassesSet.has(cls)) {
                shouldExclude = true;
                break;
              }
            }
          }
          
          // 检查是否已经翻译过
          const isAlreadyTranslated = parent.classList.contains('transor-translation') || 
                                    parent.closest('.transor-translation');
          
          if (!shouldExclude && !isAlreadyTranslated) {
            results.push(node);
          }
        }
      }
      return;
    }
    
    // 元素节点
    if (node.nodeType === Node.ELEMENT_NODE) {
      // 跳过排除的标签
      if (excludedTagsSet.has(node.tagName.toLowerCase())) {
        return;
      }
      
      // 跳过排除的类
      if (node.classList && node.classList.length > 0 && excludedClassesSet.size > 0) {
        for (const cls of node.classList) {
          if (excludedClassesSet.has(cls)) {
            return;
          }
        }
      }
      
      // 遍历子节点
      for (let i = 0; i < node.childNodes.length; i++) {
        walkTextNodes(node.childNodes[i]);
      }
    }
  }
  
  // 从body开始遍历
  walkTextNodes(document.body);
  
  return results;
}

/**
 * 应用翻译结果到DOM
 * @param {Node} node - 文本节点
 * @param {string} originalText - 原文
 * @param {string} translatedText - 译文
 * @param {string} style - 翻译样式
 */
function _applyTranslation(node, originalText, translatedText, style) {
  const parentNode = node.parentNode;
  
  if (!parentNode) return;
  
  switch (style) {
    case 'inline':
      // 内联样式：原文后加译文
      const inlineWrapper = document.createElement('span');
      inlineWrapper.classList.add('transor-translation');
      inlineWrapper.textContent = node.textContent;
      
      const translationInline = document.createElement('span');
      translationInline.classList.add('transor-inline');
      translationInline.textContent = ` (${translatedText})`;
      
      inlineWrapper.appendChild(translationInline);
      parentNode.replaceChild(inlineWrapper, node);
      break;
      
    case 'replace':
      // 替换样式：直接替换原文
      const replaceWrapper = document.createElement('span');
      replaceWrapper.classList.add('transor-translation');
      replaceWrapper.textContent = translatedText;
      parentNode.replaceChild(replaceWrapper, node);
      break;
      
    case 'bilingual':
      // 双语样式：原文上方显示译文
      const bilingualWrapper = document.createElement('div');
      bilingualWrapper.classList.add('transor-translation');
      
      const original = document.createElement('span');
      original.textContent = node.textContent;
      
      const translation = document.createElement('div');
      translation.classList.add('transor-bilingual');
      translation.textContent = translatedText;
      
      bilingualWrapper.appendChild(original);
      bilingualWrapper.appendChild(translation);
      parentNode.replaceChild(bilingualWrapper, node);
      break;
      
    case 'hover':
      // 悬浮样式：鼠标悬停显示译文
      const hoverWrapper = document.createElement('span');
      hoverWrapper.classList.add('transor-translation', 'transor-hover');
      hoverWrapper.textContent = node.textContent;
      
      const hoverContent = document.createElement('span');
      hoverContent.classList.add('transor-hover-content');
      hoverContent.textContent = translatedText;
      
      hoverWrapper.appendChild(hoverContent);
      parentNode.replaceChild(hoverWrapper, node);
      break;
      
    default:
      // 默认使用内联样式
      const defaultWrapper = document.createElement('span');
      defaultWrapper.classList.add('transor-translation');
      defaultWrapper.textContent = node.textContent;
      
      const translationDefault = document.createElement('span');
      translationDefault.classList.add('transor-inline');
      translationDefault.textContent = ` (${translatedText})`;
      
      defaultWrapper.appendChild(translationDefault);
      parentNode.replaceChild(defaultWrapper, node);
  }
}

/**
 * 移除页面的所有翻译
 */
export function removeAllTranslations() {
  const translatedElements = document.querySelectorAll('.transor-translation');
  
  translatedElements.forEach(element => {
    // 如果元素是替换了文本节点的元素，需要恢复原文
    const originalText = element.firstChild?.nodeType === Node.TEXT_NODE 
      ? element.firstChild.textContent 
      : element.textContent.split(' (')[0]; // 简单的提取原文，可能需要更复杂的逻辑
      
    const textNode = document.createTextNode(originalText);
    element.parentNode.replaceChild(textNode, element);
  });
  
  // 移除样式
  const styles = document.getElementById('transor-translation-styles');
  if (styles) {
    styles.remove();
  }
  
  console.log('已移除所有翻译');
} 