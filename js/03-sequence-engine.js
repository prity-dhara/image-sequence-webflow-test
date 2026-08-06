window.SequenceEngine = (() => {
  const CONFIG = window.EXPERIENCE_CONFIG;

  class SequenceSource {
    constructor(config) {
      this.config = config;
      this.cache = new Map();
      this.loading = new Map();
      this.queue = [];
      this.activeLoads = 0;
      this.currentFrame = 0;
    }

    clamp(index) {
      return Math.max(0, Math.min(this.config.frameCount - 1, Math.round(index)));
    }

    frameName(index) {
      return `${this.config.prefix}${String(index + 1).padStart(this.config.padding, "0")}.${this.config.extension}`;
    }

    url(index, fallback = false) {
      return `${fallback ? this.config.fallbackFolder : this.config.folder}${this.frameName(index)}`;
    }

    request(index, priority = 0) {
      const frame = this.clamp(index);
      if (this.cache.has(frame)) return Promise.resolve(this.cache.get(frame));
      if (this.loading.has(frame)) return this.loading.get(frame);

      let resolveTask;
      const promise = new Promise(resolve => { resolveTask = resolve; });
      this.loading.set(frame, promise);
      this.queue.push({ frame, priority, resolve: resolveTask });
      this.queue.sort((a, b) => b.priority - a.priority);
      this.process();
      return promise;
    }

    process() {
      while (
        this.activeLoads < CONFIG.performance.maxConcurrent &&
        this.queue.length
      ) {
        const task = this.queue.shift();
        this.activeLoads += 1;

        this.loadImage(task.frame)
          .then(image => {
            if (image) this.cache.set(task.frame, image);
            task.resolve(image);
          })
          .catch(error => {
            console.warn(`[sequence] Frame ${task.frame + 1} failed:`, error);
            task.resolve(null);
          })
          .finally(() => {
            this.loading.delete(task.frame);
            this.activeLoads -= 1;
            this.process();
          });
      }
    }

    loadImage(frame) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.decoding = "async";
        let triedFallback = false;

        image.onload = async () => {
          if (typeof image.decode === "function") {
            await image.decode().catch(() => {});
          }
          resolve(image);
        };

        image.onerror = () => {
          if (!triedFallback) {
            triedFallback = true;
            image.src = this.url(frame, true);
            return;
          }
          reject(new Error(`Unable to load ${this.frameName(frame)}`));
        };

        image.src = this.url(frame);
      });
    }

    prioritize(index) {
      const center = this.clamp(index);
      this.currentFrame = center;

      for (let offset = 0; offset <= CONFIG.performance.preloadRadius; offset += 1) {
        const before = center - offset;
        const after = center + offset;
        const priority = 100000 - offset * 1000;
        if (before >= 0) this.request(before, priority);
        if (after < this.config.frameCount && after !== before) {
          this.request(after, priority);
        }
      }
    }

    get(index) {
      const frame = this.clamp(index);
      if (this.cache.has(frame)) return this.cache.get(frame);

      for (let offset = 1; offset < this.config.frameCount; offset += 1) {
        const before = frame - offset;
        const after = frame + offset;
        if (before >= 0 && this.cache.has(before)) return this.cache.get(before);
        if (after < this.config.frameCount && this.cache.has(after)) return this.cache.get(after);
      }
      return null;
    }

    async initialize() {
      const first = await this.request(0, 2000000);
      if (!first) throw new Error("Hero first frame failed.");

      const count = Math.min(CONFIG.performance.initialPreload, this.config.frameCount);
      for (let index = 1; index < count; index += 1) {
        this.request(index, 1500000 - index);
      }
      this.request(this.config.frameCount - 1, 1900000);
      return first;
    }
  }

  class CanvasRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.context = canvas.getContext("2d", { alpha: false, desynchronized: true });
      this.currentImage = null;
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const mobile = matchMedia("(max-width: 767px)").matches;
      const dpr = mobile
        ? CONFIG.performance.mobileDPR
        : Math.min(devicePixelRatio || 1, CONFIG.performance.desktopDPR);

      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.currentImage) this.draw(this.currentImage);
      }
    }

    draw(image) {
      if (!image) return;
      this.currentImage = image;

      const cw = this.canvas.width;
      const ch = this.canvas.height;
      const iw = image.naturalWidth || image.width;
      const ih = image.naturalHeight || image.height;
      if (!cw || !ch || !iw || !ih) return;

      const imageRatio = iw / ih;
      const canvasRatio = cw / ch;
      let width, height, x, y;

      if (imageRatio > canvasRatio) {
        height = ch;
        width = height * imageRatio;
        x = (cw - width) / 2;
        y = 0;
      } else {
        width = cw;
        height = width / imageRatio;
        x = 0;
        y = (ch - height) / 2;
      }

      this.context.clearRect(0, 0, cw, ch);
      this.context.drawImage(image, x, y, width, height);
    }
  }

  return { SequenceSource, CanvasRenderer };
})();
