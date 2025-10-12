// ~/composables/usePrimaryAnimation.js
import gsap from "gsap";

/**
 ** A composable to run the primary animation for elements
 * @param {string} identifier - CSS selector for the element(s) to animate
 * @param {number|null} stagger - The stagger time in seconds, or null for no stagger
 **/
export function usePrimaryAnimation({ identifier, stagger = null }) {
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
