import { useReducedMotion, useScroll, useTransform, useSpring, easeInOut } from 'framer-motion';
import { useState } from 'react';

export const easing = {
  entrance: [0.17, 0.67, 0.3, 0.99],
  exit: [0.65, 0, 0.35, 1],
  state: [0.25, 0.1, 0.25, 1],
  hover: [0.4, 0, 0.2, 1],
} as const;

export const durations = {
  entrance: 0.38,
  exit: 0.24,
  state: 0.32,
  hover: 0.18,
} as const;

export const useSafeAnimation = () => {
  const reducedMotion = useReducedMotion();
  return {
    enabled: !reducedMotion,
    duration: reducedMotion ? 0 : durations.entrance,
    spring: reducedMotion ? { type: false } : { type: "spring", stiffness: 300, damping: 30 },
  };
};

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
  transition: {
    duration: durations.entrance,
    ease: easing.entrance,
  },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: durations.entrance, ease: easing.entrance },
};

export const slideUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 30 },
  transition: { duration: durations.entrance, ease: easing.entrance },
};

export const slideLeft = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: durations.entrance, ease: easing.entrance },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: durations.entrance, ease: easing.entrance },
};

export const textReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.entrance, ease: easing.entrance },
  },
};

export const itemHover = {
  scale: 1.02,
  transition: { duration: durations.hover, ease: easing.hover },
};

export const itemTap = {
  scale: 0.98,
  transition: { duration: durations.hover, ease: easing.hover },
};

export const useParallax = (speed = 0.2) => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, 100 * speed]);
  return useSpring(y, { stiffness: 100, damping: 30, bounce: 0 });
};

export const useScrollReveal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const reducedMotion = useReducedMotion();
  
  return {
    ref: (element: HTMLDivElement | null) => {
      if (!element || reducedMotion) {
        setIsVisible(true);
        return;
      }
      
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
      );
      
      observer.observe(element);
      return () => observer.disconnect();
    },
    initial: { opacity: 0, y: 30 },
    animate: isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 },
    transition: { duration: durations.entrance, ease: easing.entrance },
  };
};

export const getTextCharacters = (text: string) => {
  return text.split('').map((char, i) => ({
    id: i,
    char,
    transition: { delay: i * 0.02 },
  }));
};

export const floatingAnimation = {
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: easeInOut,
    },
  },
};
