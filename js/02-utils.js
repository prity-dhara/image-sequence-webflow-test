window.ExperienceUtils = (() => {
  const clamp01 = value => Math.max(0, Math.min(1, value));

  const rangeProgress = (value, start, end) =>
    clamp01((value - start) / Math.max(0.0001, end - start));

  function waitForImageElement(image) {
    if (image.complete && image.naturalWidth) return Promise.resolve(image);

    return new Promise((resolve, reject) => {
      image.addEventListener("load", () => resolve(image), { once: true });
      image.addEventListener(
        "error",
        () => reject(new Error("The Section 2 image failed to load.")),
        { once: true }
      );
    });
  }

  async function loadImageFromHtmlElement(imageElement) {
    await waitForImageElement(imageElement);

    const source =
      imageElement.currentSrc ||
      imageElement.getAttribute("src") ||
      imageElement.src;

    if (!source) throw new Error("The Section 2 HTML image has no URL.");

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";

      image.onload = async () => {
        if (typeof image.decode === "function") {
          await image.decode().catch(() => {});
        }
        resolve(image);
      };

      image.onerror = () => reject(
        new Error(`Unable to load the HTML Section 2 image for WebGL: ${source}`)
      );

      image.src = source;
    });
  }

  return { clamp01, rangeProgress, waitForImageElement, loadImageFromHtmlElement };
})();
