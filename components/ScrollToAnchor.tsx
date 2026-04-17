'use client';

import { useEffect } from 'react';

// 确保 ScrollToAnchor 组件能够处理 URL 中的锚点
export default function ScrollToAnchor() {
  useEffect(() => {
    // 检查 URL 是否包含锚点
    const hash = window.location.hash;
    if (hash) {
      // 移除 # 符号
      const id = hash.substring(1);
      // 查找对应的元素
      const element = document.getElementById(id);
      if (element) {
        // 滚动到元素位置
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, []);

  return null;
}