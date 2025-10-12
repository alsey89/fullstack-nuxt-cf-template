/* 
convertToInitials converts a string to its initials
@param {string} str - The input string
@return {string} - The initials of the string
*/
export function convertToInitials(str) {
  if (!str) return "";
  const words = str.split(" ");
  const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");
  return initials;
}
