// ~/composables/useIsMobile.js

/**
 ** A composable to determine if the client is a mobile device.
 ** Checks if the viewport width is less than or equal to 667px.
 ** Returns a ***reactive*** boolean value
 **/
export function useIsMobile() {
  const isMobile = ref(false);

  //skip the server side check
  if (import.meta.server) {
    return;
  }

  onMounted(() => {
    const mq = window.matchMedia("(max-width: 667px)");
    // set initial
    isMobile.value = mq.matches;
    // update on resize
    mq.addEventListener("change", (e) => {
      isMobile.value = e.matches;
    });
  });

  onUnmounted(() => {
    const mq = window.matchMedia("(max-width: 667px)");
    // remove event listener
    mq.removeEventListener("change", (e) => {
      isMobile.value = e.matches;
    });
  });

  return computed(() => isMobile.value);
}
