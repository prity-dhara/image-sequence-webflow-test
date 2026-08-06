/**
 * UNIFIED DOTTED IMAGE REVEAL V11
 *
 * Reusable target-image reveal used for:
 *   Section 3 → Section 4
 *
 * Visual language:
 * - Organic moving boundary
 * - Blue-noise / dotted breakup
 * - Sand-colored edge highlight
 * - Film grain
 * - UV distortion around the transition front
 *
 * Default direction:
 * - Top to bottom while scrolling down
 *
 * Required DOM:
 *   <canvas class="section-3-noise-ditter-trans"></canvas>
 *   <div class="section_4">
 *     <img class="section-4_img" ...>
 *   </div>
 *
 * The old section remains visible below the transparent parts of this canvas.
 * When reveal reaches 100%, the real Section 4 element becomes visible and
 * the WebGL transition canvas is hidden.
 */

(() => {
  "use strict";

  const clamp = (value, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));

  const rangeProgress = (value, start, end) =>
    clamp(
      (value - start) /
      Math.max(0.0001, end - start)
    );

  function hexToRgb01(hexValue) {
    const hex = String(hexValue || "#e8dec7")
      .replace("#", "")
      .padEnd(6, "0")
      .slice(0, 6);

    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255
    ];
  }

  class UnifiedDottedImageReveal {
    constructor({
      canvas,
      targetImage,
      targetSection,
      sourceElements,
      settings
    }) {
      this.canvas = canvas;
      this.targetImage = targetImage;
      this.targetSection = targetSection;
      this.sourceElements = sourceElements.filter(Boolean);
      this.settings = settings;
      this.progress = 0;
      this.ready = false;

      this.gl =
        canvas.getContext("webgl2", {
          alpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: false,
          powerPreference: "high-performance"
        }) ||
        canvas.getContext("webgl", {
          alpha: true,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: false,
          powerPreference: "high-performance"
        });

      if (!this.gl) {
        throw new Error(
          "[dotted-reveal] WebGL is unavailable."
        );
      }

      Object.assign(this.canvas.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: "0",
        visibility: "hidden"
      });

      this.setup();
      this.resize();
      this.loadTargetImage();
    }

    createShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }

      return shader;
    }

    setup() {
      const gl = this.gl;

      const vertexShader = `
        attribute vec2 aPosition;
        attribute vec2 aUv;

        varying vec2 vUv;

        void main() {
          vUv = aUv;
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `;

      const fragmentShader = `
        precision highp float;

        uniform sampler2D uImage;
        uniform vec2 uResolution;
        uniform vec2 uImageSize;

        uniform float uProgress;
        uniform float uEdgeSoftness;
        uniform float uShapeScale;
        uniform float uIrregularity;
        uniform float uDotScale;
        uniform float uDustBand;
        uniform float uDistortion;
        uniform float uGrain;
        uniform float uEdgeOpacity;
        uniform vec3 uEdgeColor;
        uniform float uDirection;

        varying vec2 vUv;

        float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        float valueNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float a = hash12(i);
          float b = hash12(i + vec2(1.0, 0.0));
          float c = hash12(i + vec2(0.0, 1.0));
          float d = hash12(i + vec2(1.0, 1.0));

          return mix(
            mix(a, b, f.x),
            mix(c, d, f.x),
            f.y
          );
        }

        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;

          for (int i = 0; i < 5; i++) {
            value += valueNoise(p) * amplitude;
            p = p * 2.03 + vec2(11.7, 7.3);
            amplitude *= 0.5;
          }

          return value;
        }

        vec2 coverUv(
          vec2 uv,
          vec2 imageSize,
          vec2 canvasSize
        ) {
          float imageRatio = imageSize.x / imageSize.y;
          float canvasRatio = canvasSize.x / canvasSize.y;

          vec2 scale = vec2(1.0);
          vec2 offset = vec2(0.0);

          if (imageRatio > canvasRatio) {
            scale.x = canvasRatio / imageRatio;
            offset.x = (1.0 - scale.x) * 0.5;
          } else {
            scale.y = imageRatio / canvasRatio;
            offset.y = (1.0 - scale.y) * 0.5;
          }

          return uv * scale + offset;
        }

        void main() {
          vec2 uv = vUv;
          vec2 pixel = gl_FragCoord.xy;

          float broadShape =
            fbm(
              vec2(
                uv.x * uShapeScale,
                uv.y * 0.75 + 8.0
              )
            );

          float detailShape =
            fbm(
              vec2(
                uv.x * uShapeScale * 2.4 + 13.0,
                uv.y * 2.1 + 3.7
              )
            );

          float shape =
            (broadShape - 0.5) * uIrregularity +
            (detailShape - 0.5) * uIrregularity * 0.28;

          /*
           * WebGL UV y=0 is the bottom.
           *
           * Top to bottom:
           * front begins above the viewport (1.16) and moves down (-0.16).
           *
           * Bottom to top:
           * front begins below the viewport (-0.16) and moves up (1.16).
           */
          float front =
            uDirection < 0.5
              ? mix(1.16, -0.16, uProgress)
              : mix(-0.16, 1.16, uProgress);

          float signedDistance =
            uv.y + shape - front;

          float band =
            max(
              0.003,
              uEdgeSoftness + uDustBand
            );

          /*
           * Top-to-bottom reveals the region above the moving front.
           * Bottom-to-top reveals the region below the moving front.
           */
          float coverage =
            uDirection < 0.5
              ? 1.0 - smoothstep(-band, band, signedDistance)
              : smoothstep(-band, band, signedDistance);

          float dotsA =
            hash12(
              floor(
                pixel /
                max(0.5, uDotScale)
              )
            );

          float dotsB =
            hash12(
              floor(
                pixel /
                max(0.5, uDotScale * 1.72)
              ) +
              vec2(37.0, 71.0)
            );

          float dots =
            mix(dotsA, dotsB, 0.2);

          float alpha =
            step(dots, coverage);

          float cleanReveal =
            uDirection < 0.5
              ? 1.0 -
                smoothstep(
                  band * 0.35,
                  band * 1.7,
                  signedDistance
                )
              : smoothstep(
                  band * 0.35,
                  band * 1.7,
                  signedDistance
                );

          alpha = max(alpha, cleanReveal);

          vec2 targetUv =
            coverUv(
              uv,
              uImageSize,
              uResolution
            );

          float edgeMask =
            1.0 -
            smoothstep(
              uDustBand * 0.22,
              uDustBand * 1.35,
              abs(signedDistance)
            );

          vec2 distortion =
            vec2(
              dotsA - 0.5,
              broadShape - 0.5
            ) *
            uDistortion *
            edgeMask;

          vec4 imageColor =
            texture2D(
              uImage,
              targetUv + distortion
            );

          float brightDust =
            step(0.87, dotsB) *
            edgeMask;

          imageColor.rgb =
            mix(
              imageColor.rgb,
              uEdgeColor,
              brightDust * uEdgeOpacity
            );

          float grain =
            hash12(
              pixel +
              vec2(19.0, 53.0)
            ) - 0.5;

          imageColor.rgb +=
            vec3(grain) *
            uGrain;

          gl_FragColor =
            vec4(
              imageColor.rgb,
              imageColor.a * alpha
            );
        }
      `;

      this.program = gl.createProgram();

      gl.attachShader(
        this.program,
        this.createShader(
          gl.VERTEX_SHADER,
          vertexShader
        )
      );

      gl.attachShader(
        this.program,
        this.createShader(
          gl.FRAGMENT_SHADER,
          fragmentShader
        )
      );

      gl.linkProgram(this.program);

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(this.program));
      }

      const uniform = name =>
        gl.getUniformLocation(this.program, name);

      this.locations = {
        position: gl.getAttribLocation(this.program, "aPosition"),
        uv: gl.getAttribLocation(this.program, "aUv"),

        image: uniform("uImage"),
        resolution: uniform("uResolution"),
        imageSize: uniform("uImageSize"),
        progress: uniform("uProgress"),
        edgeSoftness: uniform("uEdgeSoftness"),
        shapeScale: uniform("uShapeScale"),
        irregularity: uniform("uIrregularity"),
        dotScale: uniform("uDotScale"),
        dustBand: uniform("uDustBand"),
        distortion: uniform("uDistortion"),
        grain: uniform("uGrain"),
        edgeOpacity: uniform("uEdgeOpacity"),
        edgeColor: uniform("uEdgeColor"),
        direction: uniform("uDirection")
      };

      this.buffer = gl.createBuffer();

      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1, -1, 0, 1,
           1, -1, 1, 1,
          -1,  1, 0, 0,

          -1,  1, 0, 0,
           1, -1, 1, 1,
           1,  1, 1, 0
        ]),
        gl.STATIC_DRAW
      );
    }

    loadTargetImage() {
      const image = new Image();
      image.crossOrigin = "anonymous";

      image.onload = () => {
        const gl = this.gl;

        this.texture = gl.createTexture();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_WRAP_S,
          gl.CLAMP_TO_EDGE
        );

        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_WRAP_T,
          gl.CLAMP_TO_EDGE
        );

        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR
        );

        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MAG_FILTER,
          gl.LINEAR
        );

        gl.pixelStorei(
          gl.UNPACK_FLIP_Y_WEBGL,
          false
        );

        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image
        );

        this.loadedImage = image;
        this.ready = true;
        this.render();
      };

      image.onerror = () => {
        console.warn(
          "[dotted-reveal] Section 4 image failed to load."
        );
      };

      image.src =
        this.targetImage.currentSrc ||
        this.targetImage.src;
    }

    resize() {
      const rect =
        this.canvas.getBoundingClientRect();

      const dpr =
        Math.min(
          window.devicePixelRatio || 1,
          this.settings.maxDPR || 1.5
        );

      this.canvas.width =
        Math.max(
          1,
          Math.round(rect.width * dpr)
        );

      this.canvas.height =
        Math.max(
          1,
          Math.round(rect.height * dpr)
        );

      this.render();
    }

    syncUniforms() {
      if (!this.ready) {
        return;
      }

      const gl = this.gl;
      const L = this.locations;
      const s = this.settings;
      const [r, g, b] =
        hexToRgb01(s.edgeColor);

      gl.uniform1f(L.edgeSoftness, s.edgeSoftness);
      gl.uniform1f(L.shapeScale, s.shapeScale);
      gl.uniform1f(L.irregularity, s.irregularity);
      gl.uniform1f(L.dotScale, s.dotScale);
      gl.uniform1f(L.dustBand, s.dustBand);
      gl.uniform1f(L.distortion, s.distortion);
      gl.uniform1f(L.grain, s.grain);
      gl.uniform1f(L.edgeOpacity, s.edgeOpacity);
      gl.uniform3f(L.edgeColor, r, g, b);

      gl.uniform1f(
        L.direction,
        s.direction === "Top to bottom"
          ? 0
          : 1
      );
    }

    render() {
      if (!this.ready) {
        return;
      }

      const gl = this.gl;
      const L = this.locations;

      gl.viewport(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.program);

      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        this.buffer
      );

      gl.enableVertexAttribArray(L.position);
      gl.vertexAttribPointer(
        L.position,
        2,
        gl.FLOAT,
        false,
        16,
        0
      );

      gl.enableVertexAttribArray(L.uv);
      gl.vertexAttribPointer(
        L.uv,
        2,
        gl.FLOAT,
        false,
        16,
        8
      );

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(
        gl.TEXTURE_2D,
        this.texture
      );

      gl.uniform1i(L.image, 0);

      gl.uniform2f(
        L.resolution,
        this.canvas.width,
        this.canvas.height
      );

      gl.uniform2f(
        L.imageSize,
        this.loadedImage.naturalWidth,
        this.loadedImage.naturalHeight
      );

      gl.uniform1f(
        L.progress,
        this.progress
      );

      this.syncUniforms();

      gl.drawArrays(
        gl.TRIANGLES,
        0,
        6
      );
    }

    setElementState(progress) {
      if (progress <= 0.001) {
        this.canvas.style.opacity = "0";
        this.canvas.style.visibility = "hidden";

        this.targetSection.style.opacity = "0";
        this.targetSection.style.visibility = "hidden";

        this.sourceElements.forEach(element => {
          element.style.opacity = "1";
          element.style.visibility = "visible";
        });

        return;
      }

      if (progress < 0.999) {
        this.canvas.style.opacity = "1";
        this.canvas.style.visibility = "visible";

        this.targetSection.style.opacity = "0";
        this.targetSection.style.visibility = "hidden";

        this.sourceElements.forEach(element => {
          element.style.opacity = "1";
          element.style.visibility = "visible";
        });

        return;
      }

      this.canvas.style.opacity = "0";
      this.canvas.style.visibility = "hidden";

      this.targetSection.style.opacity = "1";
      this.targetSection.style.visibility = "visible";

      this.sourceElements.forEach(element => {
        element.style.opacity = "0";
        element.style.visibility = "hidden";
      });
    }

    update(rawProgress) {
      this.progress =
        rangeProgress(
          rawProgress,
          this.settings.revealStart,
          this.settings.revealEnd
        );

      this.setElementState(this.progress);
      this.render();
    }

    addGUI(gui) {
      if (!gui) {
        return;
      }

      const s = this.settings;

      const folder =
        gui.addFolder(
          "Section 3 → 4 Dotted Reveal"
        );

      folder
        .add(s, "revealStart", 0.70, 0.98, 0.001)
        .name("Reveal start");

      folder
        .add(s, "revealEnd", 0.75, 1, 0.001)
        .name("Reveal end");

      folder
        .add(s, "edgeSoftness", 0.001, 0.1, 0.001)
        .name("Dissolve spread");

      folder
        .add(s, "shapeScale", 0.5, 14, 0.1)
        .name("Edge shape scale");

      folder
        .add(s, "irregularity", 0, 0.4, 0.005)
        .name("Edge irregularity");

      folder
        .add(s, "dotScale", 0.5, 6, 0.05)
        .name("Blue-noise dot scale");

      folder
        .add(s, "dustBand", 0.01, 0.35, 0.005)
        .name("Dust band width");

      folder
        .add(s, "distortion", 0, 0.05, 0.001)
        .name("Distortion");

      folder
        .add(s, "grain", 0, 0.12, 0.001)
        .name("Film grain");

      folder
        .add(s, "edgeOpacity", 0, 1.5, 0.01)
        .name("Edge opacity");

      folder
        .addColor(s, "edgeColor")
        .name("Edge color");

      folder
        .add(
          s,
          "direction",
          [
            "Top to bottom",
            "Bottom to top"
          ]
        )
        .name("Direction");

      folder.open();
    }
  }

  window.DottedTransitionReady =
    new Promise(resolve => {
      const initialize = () => {
        const canvas =
          document.querySelector(
            ".section-3-noise-ditter-trans"
          );

        const targetSection =
          document.querySelector(".section_4");

        const targetImage =
          targetSection?.querySelector(
            ".section-4_img"
          );

        const sourceElements = [
          document.querySelector(
            ".section-2-img-seq"
          ),
          document.querySelector(".section_3")
        ];

        if (
          !canvas ||
          !targetSection ||
          !targetImage
        ) {
          console.warn(
            "[dotted-reveal] Required elements are missing.",
            {
              canvas: Boolean(canvas),
              targetSection: Boolean(targetSection),
              targetImage: Boolean(targetImage)
            }
          );

          resolve(null);
          return;
        }

        const settings =
          window.EXPERIENCE_CONFIG
            ?.sectionThreeToFour;

        if (!settings) {
          console.warn(
            "[dotted-reveal] CONFIG.sectionThreeToFour is missing."
          );

          resolve(null);
          return;
        }

        const instance =
          new UnifiedDottedImageReveal({
            canvas,
            targetImage,
            targetSection,
            sourceElements,
            settings
          });

        window.DottedTransitionRegistry = {
          instance,
          settings,

          update(progress) {
            instance.update(progress);
          },

          resize() {
            instance.resize();
          },

          addGUI(gui) {
            instance.addGUI(gui);
          }
        };

        resolve(
          window.DottedTransitionRegistry
        );
      };

      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          initialize,
          { once: true }
        );
      } else {
        initialize();
      }
    });
})();
