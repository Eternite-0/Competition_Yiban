import type { Transition, Variants } from 'framer-motion';

export const smoothEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const softSpring: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.75,
};

export const pageTransition: Transition = {
  duration: 0.3,
  ease: smoothEase,
};

export const panelTransition: Transition = {
  duration: 0.22,
  ease: smoothEase,
};

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.998 },
};

export const panelVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
};

export const listContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: pageTransition },
};
