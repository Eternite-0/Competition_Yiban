import type { Transition, Variants } from 'framer-motion';

export const smoothEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** 浮层弹出：轻微过冲，接近 iOS 的弹性但不夸张 */
export const softSpring: Transition = {
  type: 'spring',
  stiffness: 480,
  damping: 32,
  mass: 0.7,
};

export const pageTransition: Transition = {
  duration: 0.28,
  ease: smoothEase,
};

export const panelTransition: Transition = softSpring;

/* 页面转场以透明度为主，位移收到 6px、去掉缩放 —— 苹果的转场比 Web 惯例克制得多 */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const panelVariants: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.14, ease: smoothEase } },
};

export const listContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.035, delayChildren: 0.02 },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: pageTransition },
};
