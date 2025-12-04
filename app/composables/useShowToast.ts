// ~/composables/useShowToast.ts

import { toast } from "vue-sonner";

interface ToastAction {
  label: string;
  onClick: () => void | boolean;
}

interface ToastOptions {
  title: string;
  description: string;
  action?: ToastAction;
}

/**
 * A composable to show a toast notification with optional action.
 * Default action is a button with the label "Got it!" that does nothing.
 * Pass an empty object to action to disable the action button.
 *
 * @param title - The title of the toast notification
 * @param description - The description of the toast notification
 * @param action - Optional action for the toast notification
 *
 * @example
 * const showToast = useShowToast()
 * showToast({
 *   title: 'Success',
 *   description: 'Your changes have been saved',
 * })
 *
 * @example
 * // With custom action
 * showToast({
 *   title: 'New update available',
 *   description: 'Click to refresh',
 *   action: {
 *     label: 'Refresh',
 *     onClick: () => window.location.reload()
 *   }
 * })
 */
export function useShowToast() {
  return ({
    title,
    description,
    action = {
      label: "Got it!",
      onClick: () => {
        return true;
      },
    },
  }: ToastOptions) => {
    toast(title, {
      description: description,
      action: action,
    });
  };
}
