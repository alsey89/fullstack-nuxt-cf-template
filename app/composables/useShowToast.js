import { toast } from "vue-sonner";

/**
 ** A composable to show a toast notification with optional action.
 ** Default action is a button with the label "Got it!" that does nothing.
 ** Pass in an empty object to action to disable the action button.
 * @param {string} title - The title of the toast notification
 * @param {string} description - The description of the toast notification
 * @param {Object} [action] - Optional action for the toast notification
 * @param {string} [action.label] - The label for the action button
 * @param {Function} [action.onClick] - The function to call when the action button is clicked
 **/
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
  }) => {
    toast(title, {
      description: description,
      action: action,
    });
  };
}
