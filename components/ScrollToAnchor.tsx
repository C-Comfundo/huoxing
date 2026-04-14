'use client';

import { useEffect } from 'react';

export default function ScrollToAnchor() {
  useEffect(() => {
    const handleScrollToAnchor = () => {
      let elementId = '';
      
      // 首先检查 hash
      const hash = window.location.hash;
      if (hash) {
        elementId = hash.substring(1);
      } 
      // 如果没有 hash，检查 articleId 查询参数
      else {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('articleId');
        if (articleId) {
          elementId = articleId;
        }
      }
      
      if (elementId) {
        // 延迟执行以确保页面完全加载
        setTimeout(() => {
          const element = document.getElementById(elementId);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 300);
      }
    };

    // 初始加载时执行
    handleScrollToAnchor();

    // 监听 hash 变化
    window.addEventListener('hashchange', handleScrollToAnchor);
    
    // 监听 popstate 变化（处理浏览器前进/后退）
    window.addEventListener('popstate', handleScrollToAnchor);

    return () => {
      window.removeEventListener('hashchange', handleScrollToAnchor);
      window.removeEventListener('popstate', handleScrollToAnchor);
    };
  }, []);

  return null;
}