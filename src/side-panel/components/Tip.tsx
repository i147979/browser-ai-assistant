import { useEffect } from "react";

const EDGE_THRESHOLD_PX = 72;
const EDGE_START_CLASS = "tip-edge-start";
const EDGE_END_CLASS = "tip-edge-end";

/**
 * data-tip 元素的伪元素 tooltip 默认水平居中显示，靠近面板左右边缘时
 * 会被裁切；此 hook 在悬停时按按钮中心与 app-shell 边缘的距离改为
 * 左对齐 / 右对齐弹出。类只在下次悬停其他提示元素时重算，淡出期间保持原位。
 */
export function useTipEdgeClamp() {
  useEffect(() => {
    const handleOver = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-tip]") : null;
      if (!target) {
        return;
      }

      const shell = target.closest<HTMLElement>(".app-shell");
      if (!shell) {
        return;
      }

      const shellRect = shell.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      target.classList.toggle(EDGE_START_CLASS, center - shellRect.left < EDGE_THRESHOLD_PX);
      target.classList.toggle(EDGE_END_CLASS, shellRect.right - center < EDGE_THRESHOLD_PX);
    };

    document.addEventListener("mouseover", handleOver);
    return () => document.removeEventListener("mouseover", handleOver);
  }, []);
}
