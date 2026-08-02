export function splitTextToInputWidth(value: string, input: HTMLInputElement): [string, string] {
  if (typeof window === "undefined" || !value) return [value, ""];

  const styles = window.getComputedStyle(input);
  const availableWidth = Math.max(
    0,
    input.clientWidth
      - Number.parseFloat(styles.paddingLeft || "0")
      - Number.parseFloat(styles.paddingRight || "0"),
  );
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context || availableWidth <= 0) return [value, ""];

  context.font = styles.font;
  if (context.measureText(value).width <= availableWidth) return [value, ""];

  let low = 0;
  let high = value.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (context.measureText(value.slice(0, middle)).width <= availableWidth) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  let splitAt = Math.max(1, low);
  // Prefer moving a complete word to the continuation line. Only split inside a
  // word when that single word is wider than the whole input.
  const lastWhitespace = value.slice(0, splitAt + 1).search(/\s+\S*$/);
  if (lastWhitespace > 0) splitAt = lastWhitespace;
  return [value.slice(0, splitAt).trimEnd(), value.slice(splitAt).trimStart()];
}
