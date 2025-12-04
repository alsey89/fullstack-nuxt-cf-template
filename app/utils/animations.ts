// ~/utils/animations.ts

import gsap from "gsap";

interface PrimaryAnimationOptions {
  identifier: string;
  stagger?: number | null;
}

/**
 * Run the primary animation for elements using GSAP
 *
 * @param identifier - CSS selector for the element(s) to animate
 * @param stagger - The stagger time in seconds, or null for no stagger
 *
 * @example
 * primaryAnimation({ identifier: '.card', stagger: 0.1 })
 */
export function primaryAnimation({
  identifier,
  stagger = null,
}: PrimaryAnimationOptions): void {
  gsap.fromTo(
    identifier,
    { opacity: 0, y: 50 },
    {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "power2.out",
      stagger: stagger,
    }
  );
}
