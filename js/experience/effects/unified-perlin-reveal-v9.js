/**
 * ATTRIBUTE-BASED UNIFIED PERLIN REVEAL
 *
 * Activate the effect using only:
 *
 *   <div data-perlin-reveal>
 *     <h3>Section 3 will show here</h3>
 *     <canvas data-perlin-reveal-canvas></canvas>
 *   </div>
 *
 * All timing and visual settings are controlled through dat.GUI.
 *
 * Combined visual layers:
 * - Perlin noise: large cloudy organic shapes
 * - Blue-noise breakup: smaller particles around the edge
 * - Organic edge: soft irregular dissolve boundary
 * - Blur halo: cloudy materialisation before sharp text
 * - Film grain: fine surface texture
 * - Distortion: subtle movement at the reveal front
 */

(() => {
  "use strict";

  const THREE_URL =
    "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js/+esm";

  const clamp = (value, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));

  const rangeProgress = (value, start, end) =>
    clamp(
      (value - start) /
      Math.max(0.0001, end - start)
    );

  const lerp = (a, b, amount) =>
    a + (b - a) * amount;

  function getTextElements(wrapper, canvas) {
    const elements = Array.from(
      wrapper.querySelectorAll("*")
    ).filter(element => {
      if (element === canvas) {
        return false;
      }

      if (
        element.contains(canvas) &&
        element !== wrapper
      ) {
        return false;
      }

      const text =
        element.textContent?.trim();

      if (!text) {
        return false;
      }

      /*
       * Render leaf-level text elements only.
       * This prevents parent and child text from being drawn twice.
       */
      const hasTextChild =
        Array.from(element.children)
          .some(child =>
            child !== canvas &&
            child.textContent?.trim()
          );

      return !hasTextChild;
    });

    /*
     * Support a wrapper containing direct text without a child element.
     */
    if (!elements.length && wrapper.textContent?.trim()) {
      return [wrapper];
    }

    return elements;
  }

  function drawWrappedText(
    context,
    text,
    x,
    y,
    maxWidth,
    lineHeight
  ) {
    const explicitLines =
      String(text).split(/\n+/);

    let cursorY = y;

    explicitLines.forEach((explicitLine, lineIndex) => {
      const words =
        explicitLine.trim().split(/\s+/);

      let line = "";

      words.forEach(word => {
        const candidate =
          line ? `${line} ${word}` : word;

        if (
          context.measureText(candidate).width >
            maxWidth &&
          line
        ) {
          context.fillText(line, x, cursorY);
          line = word;
          cursorY += lineHeight;
        } else {
          line = candidate;
        }
      });

      if (line) {
        context.fillText(line, x, cursorY);
        cursorY += lineHeight;
      }

      if (
        lineIndex < explicitLines.length - 1 &&
        !line
      ) {
        cursorY += lineHeight;
      }
    });
  }

  class PerlinRevealInstance {
    constructor({
      THREE,
      wrapper,
      canvas,
      settings
    }) {
      this.THREE = THREE;
      this.wrapper = wrapper;
      this.canvas = canvas;
      this.settings = settings;

      this.contentElements =
        Array.from(wrapper.children)
          .filter(child => child !== canvas);

      this.renderer =
        new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          premultipliedAlpha: false,
          powerPreference: "high-performance"
        });

      this.renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          settings.maxDPR
        )
      );

      this.renderer.outputColorSpace =
        THREE.SRGBColorSpace;

      this.renderer.setClearColor(
        0x000000,
        0
      );

      this.scene = new THREE.Scene();

      this.camera =
        new THREE.OrthographicCamera(
          -1,
          1,
          1,
          -1,
          0,
          1
        );

      this.transparentTexture =
        new THREE.DataTexture(
          new Uint8Array([255, 255, 255, 0]),
          1,
          1,
          THREE.RGBAFormat
        );

      this.transparentTexture.needsUpdate = true;

      this.contentTexture =
        new THREE.CanvasTexture(
          this.createContentTexture()
        );

      this.contentTexture.colorSpace =
        THREE.SRGBColorSpace;

      this.contentTexture.needsUpdate = true;

      this.uniforms = {
        time: {
          value: settings.shaderStart
        },

        resolution: {
          value: new THREE.Vector2(1, 1)
        },

        imageResolution: {
          value: new THREE.Vector2(
            this.contentTexture.image.width,
            this.contentTexture.image.height
          )
        },

        texNext: {
          value: this.contentTexture
        },

        noiseX: {
          value: settings.noiseX
        },

        noiseY: {
          value: settings.noiseY
        },

        noiseZ: {
          value: settings.noiseZ
        },

        perlinStrength: {
          value: settings.perlinStrength
        },

        blueNoiseStrength: {
          value: settings.blueNoiseStrength
        },

        grainStrength: {
          value: settings.grain
        },

        organicEdge: {
          value: settings.edgeWidth
        },

        blurStrength: {
          value: settings.blurStrength
        },

        distortionStrength: {
          value: settings.distortion
        }
      };

      const vertexShader = `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `;

      const fragmentShader = `
        precision highp float;

        uniform float time;
        uniform vec2 resolution;
        uniform vec2 imageResolution;
        uniform sampler2D texNext;

        uniform float noiseX;
        uniform float noiseY;
        uniform float noiseZ;
        uniform float perlinStrength;
        uniform float blueNoiseStrength;
        uniform float grainStrength;
        uniform float organicEdge;
        uniform float blurStrength;
        uniform float distortionStrength;

        varying vec2 vUv;

        /* =====================================================
           PERLIN NOISE
           Large cloudy organic shapes.
           ===================================================== */

        vec3 mod289(vec3 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 mod289(vec4 x) {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }

        vec4 permute(vec4 x) {
          return mod289(((x * 34.0) + 1.0) * x);
        }

        vec4 taylorInvSqrt(vec4 r) {
          return 1.79284291400159 -
            0.85373472095314 * r;
        }

        vec3 fade(vec3 t) {
          return t * t * t *
            (t * (t * 6.0 - 15.0) + 10.0);
        }

        float cnoise(vec3 P) {
          vec3 Pi0 = floor(P);
          vec3 Pi1 = Pi0 + vec3(1.0);

          Pi0 = mod289(Pi0);
          Pi1 = mod289(Pi1);

          vec3 Pf0 = fract(P);
          vec3 Pf1 = Pf0 - vec3(1.0);

          vec4 ix =
            vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);

          vec4 iy =
            vec4(Pi0.yy, Pi1.yy);

          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;

          vec4 ixy =
            permute(permute(ix) + iy);

          vec4 ixy0 =
            permute(ixy + iz0);

          vec4 ixy1 =
            permute(ixy + iz1);

          vec4 gx0 = ixy0 * (1.0 / 7.0);

          vec4 gy0 =
            fract(floor(gx0) * (1.0 / 7.0)) -
            0.5;

          gx0 = fract(gx0);

          vec4 gz0 =
            vec4(0.5) -
            abs(gx0) -
            abs(gy0);

          vec4 sz0 =
            step(gz0, vec4(0.0));

          gx0 -=
            sz0 *
            (step(0.0, gx0) - 0.5);

          gy0 -=
            sz0 *
            (step(0.0, gy0) - 0.5);

          vec4 gx1 = ixy1 * (1.0 / 7.0);

          vec4 gy1 =
            fract(floor(gx1) * (1.0 / 7.0)) -
            0.5;

          gx1 = fract(gx1);

          vec4 gz1 =
            vec4(0.5) -
            abs(gx1) -
            abs(gy1);

          vec4 sz1 =
            step(gz1, vec4(0.0));

          gx1 -=
            sz1 *
            (step(0.0, gx1) - 0.5);

          gy1 -=
            sz1 *
            (step(0.0, gy1) - 0.5);

          vec3 g000 =
            vec3(gx0.x, gy0.x, gz0.x);

          vec3 g100 =
            vec3(gx0.y, gy0.y, gz0.y);

          vec3 g010 =
            vec3(gx0.z, gy0.z, gz0.z);

          vec3 g110 =
            vec3(gx0.w, gy0.w, gz0.w);

          vec3 g001 =
            vec3(gx1.x, gy1.x, gz1.x);

          vec3 g101 =
            vec3(gx1.y, gy1.y, gz1.y);

          vec3 g011 =
            vec3(gx1.z, gy1.z, gz1.z);

          vec3 g111 =
            vec3(gx1.w, gy1.w, gz1.w);

          vec4 norm0 =
            taylorInvSqrt(
              vec4(
                dot(g000, g000),
                dot(g010, g010),
                dot(g100, g100),
                dot(g110, g110)
              )
            );

          g000 *= norm0.x;
          g010 *= norm0.y;
          g100 *= norm0.z;
          g110 *= norm0.w;

          vec4 norm1 =
            taylorInvSqrt(
              vec4(
                dot(g001, g001),
                dot(g011, g011),
                dot(g101, g101),
                dot(g111, g111)
              )
            );

          g001 *= norm1.x;
          g011 *= norm1.y;
          g101 *= norm1.z;
          g111 *= norm1.w;

          float n000 = dot(g000, Pf0);

          float n100 =
            dot(
              g100,
              vec3(Pf1.x, Pf0.yz)
            );

          float n010 =
            dot(
              g010,
              vec3(Pf0.x, Pf1.y, Pf0.z)
            );

          float n110 =
            dot(
              g110,
              vec3(Pf1.xy, Pf0.z)
            );

          float n001 =
            dot(
              g001,
              vec3(Pf0.xy, Pf1.z)
            );

          float n101 =
            dot(
              g101,
              vec3(Pf1.x, Pf0.y, Pf1.z)
            );

          float n011 =
            dot(
              g011,
              vec3(Pf0.x, Pf1.yz)
            );

          float n111 = dot(g111, Pf1);

          vec3 fade_xyz = fade(Pf0);

          vec4 n_z =
            mix(
              vec4(n000, n100, n010, n110),
              vec4(n001, n101, n011, n111),
              fade_xyz.z
            );

          vec2 n_yz =
            mix(
              n_z.xy,
              n_z.zw,
              fade_xyz.y
            );

          return 2.2 *
            mix(
              n_yz.x,
              n_yz.y,
              fade_xyz.x
            );
        }

        /* =====================================================
           BLUE-NOISE STYLE HASH
           Fine breakup and grain.
           ===================================================== */

        float hash12(vec2 p) {
          vec3 p3 =
            fract(vec3(p.xyx) * 0.1031);

          p3 +=
            dot(
              p3,
              p3.yzx + 33.33
            );

          return fract(
            (p3.x + p3.y) * p3.z
          );
        }

        float quadraticInOut(float t) {
          float p = 2.0 * t * t;

          return t < 0.5
            ? p
            : -p + (4.0 * t) - 1.0;
        }

        void main() {
          vec2 ratio = vec2(
            min(
              (resolution.x / resolution.y) /
              (imageResolution.x / imageResolution.y),
              1.0
            ),
            min(
              (resolution.y / resolution.x) /
              (imageResolution.y / imageResolution.x),
              1.0
            )
          );

          vec2 uv = vec2(
            vUv.x * ratio.x +
            (1.0 - ratio.x) * 0.5,

            vUv.y * ratio.y +
            (1.0 - ratio.y) * 0.5
          );

          float perlin =
            (
              cnoise(
                vec3(
                  uv.x * noiseX,
                  uv.y * noiseY,
                  noiseZ
                )
              ) + 1.0
            ) / 2.0;

          float blueNoise =
            hash12(
              floor(
                gl_FragCoord.xy * 0.82
              )
            );

          float combinedNoise =
            mix(
              perlin,
              blueNoise,
              blueNoiseStrength
            );

          combinedNoise =
            mix(
              0.5,
              combinedNoise,
              perlinStrength
            );

          float stepValue =
            quadraticInOut(
              min(time, 1.0)
            );

          float threshold =
            1.0 - stepValue;

          float revealMask =
            smoothstep(
              threshold - organicEdge,
              threshold + organicEdge,
              combinedNoise
            );

          vec2 distortion =
            vec2(
              blueNoise - 0.5,
              perlin - 0.5
            )
            *
            distortionStrength
            *
            (
              1.0 -
              abs(revealMask * 2.0 - 1.0)
            );

          vec4 sharp =
            texture2D(
              texNext,
              uv + distortion
            );

          /* ===================================================
             BLUR HALO
             Soft text materialisation around the edge.
             =================================================== */

          vec2 texel =
            1.0 / imageResolution;

          vec4 blurred = vec4(0.0);

          blurred +=
            texture2D(
              texNext,
              uv + texel * vec2(-4.0, 0.0)
            ) * 0.10;

          blurred +=
            texture2D(
              texNext,
              uv + texel * vec2(4.0, 0.0)
            ) * 0.10;

          blurred +=
            texture2D(
              texNext,
              uv + texel * vec2(0.0, -4.0)
            ) * 0.10;

          blurred +=
            texture2D(
              texNext,
              uv + texel * vec2(0.0, 4.0)
            ) * 0.10;

          blurred +=
            texture2D(
              texNext,
              uv + texel * vec2(-2.0, -2.0)
            ) * 0.12;

          blurred +=
            texture2D(
              texNext,
              uv + texel * vec2(2.0, -2.0)
            ) * 0.12;

          blurred +=
            texture2D(
              texNext,
              uv + texel * vec2(-2.0, 2.0)
            ) * 0.12;

          blurred +=
            texture2D(
              texNext,
              uv + texel * vec2(2.0, 2.0)
            ) * 0.12;

          blurred += sharp * 0.12;

          float edgeDistance =
            abs(
              combinedNoise - threshold
            );

          float edgeMask =
            1.0 -
            smoothstep(
              0.0,
              organicEdge * 2.2,
              edgeDistance
            );

          vec3 color =
            mix(
              blurred.rgb,
              sharp.rgb,
              revealMask
            );

          float alpha =
            mix(
              blurred.a *
              edgeMask *
              blurStrength,
              sharp.a,
              revealMask
            );

          /* ===================================================
             FILM GRAIN
             =================================================== */

          float grain =
            hash12(
              gl_FragCoord.xy +
              vec2(19.0, 53.0)
            ) - 0.5;

          color +=
            vec3(grain) *
            grainStrength;

          gl_FragColor =
            vec4(color, alpha);
        }
      `;

      this.material =
        new THREE.ShaderMaterial({
          uniforms: this.uniforms,
          vertexShader,
          fragmentShader,
          transparent: true,
          depthWrite: false
        });

      this.mesh =
        new THREE.Mesh(
          new THREE.PlaneGeometry(2, 2),
          this.material
        );

      this.scene.add(this.mesh);

      Object.assign(canvas.style, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        pointerEvents: "none"
      });

      this.resize();
      this.update(0);
    }

    createContentTexture() {
      const rect =
        this.wrapper.getBoundingClientRect();

      const scale =
        Math.min(
          window.devicePixelRatio || 1,
          this.settings.maxDPR
        );

      const textureCanvas =
        document.createElement("canvas");

      textureCanvas.width =
        Math.max(
          1,
          Math.round(rect.width * scale)
        );

      textureCanvas.height =
        Math.max(
          1,
          Math.round(rect.height * scale)
        );

      const context =
        textureCanvas.getContext("2d");

      context.scale(scale, scale);
      context.clearRect(
        0,
        0,
        rect.width,
        rect.height
      );

      context.textBaseline = "top";

      const textElements =
        getTextElements(
          this.wrapper,
          this.canvas
        );

      textElements.forEach(element => {
        const style =
          window.getComputedStyle(element);

        const elementRect =
          element.getBoundingClientRect();

        const x =
          elementRect.left - rect.left;

        const y =
          elementRect.top - rect.top;

        const width =
          Math.max(1, elementRect.width);

        const fontSize =
          parseFloat(style.fontSize) || 16;

        const lineHeight =
          parseFloat(style.lineHeight) ||
          fontSize * 1.2;

        context.fillStyle =
          style.color;

        context.font =
          `${style.fontStyle} ` +
          `${style.fontWeight} ` +
          `${style.fontSize} ` +
          `${style.fontFamily}`;

        if ("letterSpacing" in context) {
          context.letterSpacing =
            style.letterSpacing;
        }

        context.textAlign =
          style.textAlign === "center"
            ? "center"
            : style.textAlign === "right"
              ? "right"
              : "left";

        const textX =
          context.textAlign === "center"
            ? x + width / 2
            : context.textAlign === "right"
              ? x + width
              : x;

        drawWrappedText(
          context,
          element.textContent,
          textX,
          y,
          width,
          lineHeight
        );
      });

      return textureCanvas;
    }

    hideRealContent() {
      this.contentElements.forEach(element => {
        element.style.opacity = "0";
        element.style.visibility = "hidden";
      });
    }

    showRealContent() {
      this.contentElements.forEach(element => {
        element.style.opacity = "1";
        element.style.visibility = "visible";
      });
    }

    refreshTexture() {
      const textureCanvas =
        this.createContentTexture();

      this.contentTexture.image =
        textureCanvas;

      this.contentTexture.needsUpdate =
        true;

      this.uniforms.imageResolution.value.set(
        textureCanvas.width,
        textureCanvas.height
      );

      this.resize();
    }

    syncUniforms() {
      const s = this.settings;

      this.uniforms.noiseX.value =
        s.noiseX;

      this.uniforms.noiseY.value =
        s.noiseY;

      this.uniforms.noiseZ.value =
        s.noiseZ;

      this.uniforms.perlinStrength.value =
        s.perlinStrength;

      this.uniforms.blueNoiseStrength.value =
        s.blueNoiseStrength;

      this.uniforms.grainStrength.value =
        s.grain;

      this.uniforms.organicEdge.value =
        s.edgeWidth;

      this.uniforms.blurStrength.value =
        s.blurStrength;

      this.uniforms.distortionStrength.value =
        s.distortion;
    }

    resize() {
      const rect =
        this.canvas.getBoundingClientRect();

      const width =
        Math.max(1, rect.width);

      const height =
        Math.max(1, rect.height);

      this.renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          this.settings.maxDPR
        )
      );

      this.renderer.setSize(
        width,
        height,
        false
      );

      this.uniforms.resolution.value.set(
        width,
        height
      );
    }

    update(totalProgress) {
      this.syncUniforms();

      const revealProgress =
        rangeProgress(
          totalProgress,
          this.settings.revealStart,
          this.settings.revealEnd
        );

      this.uniforms.time.value =
        lerp(
          this.settings.shaderStart,
          1,
          revealProgress
        );

      if (revealProgress <= 0.001) {
        this.canvas.style.opacity = "0";
        this.canvas.style.visibility = "hidden";
        this.hideRealContent();
      } else if (revealProgress < 0.999) {
        this.canvas.style.opacity = "1";
        this.canvas.style.visibility = "visible";
        this.hideRealContent();
      } else {
        this.canvas.style.opacity = "0";
        this.canvas.style.visibility = "hidden";
        this.showRealContent();
      }

      this.renderer.render(
        this.scene,
        this.camera
      );
    }
  }

  window.PerlinRevealReady =
    (async () => {
      const THREE =
        await import(THREE_URL);

      await document.fonts.ready;

      const config =
        window.EXPERIENCE_CONFIG || {};

      const sharedSettings =
        config.perlinReveal || {
          revealStart: 0.91,
          revealEnd: 0.99,
          shaderStart: 0.22,
          noiseX: 8,
          noiseY: 6,
          noiseZ: 4,
          perlinStrength: 0.85,
          blueNoiseStrength: 0.18,
          edgeWidth: 0.075,
          blurStrength: 1,
          grain: 0.025,
          distortion: 0.006,
          maxDPR: 1.5
        };

      const instances = [];

      document
        .querySelectorAll(
          "[data-perlin-reveal]"
        )
        .forEach((wrapper, index) => {
          const canvas =
            wrapper.querySelector(
              "[data-perlin-reveal-canvas]"
            ) ||
            wrapper.querySelector(
              ".section-3-content-reveal"
            );

          if (!canvas) {
            console.warn(
              `[perlin-reveal] Reveal ${index + 1} is missing its canvas.`
            );
            return;
          }

          /*
           * Required so the canvas stays local to the text area.
           */
          if (
            window.getComputedStyle(wrapper).position ===
            "static"
          ) {
            wrapper.style.position = "relative";
          }

          instances.push(
            new PerlinRevealInstance({
              THREE,
              wrapper,
              canvas,
              settings: sharedSettings
            })
          );
        });

      const registry = {
        settings: sharedSettings,
        instances,

        update(progress) {
          instances.forEach(instance =>
            instance.update(progress)
          );
        },

        resize() {
          instances.forEach(instance => {
            instance.resize();
            instance.refreshTexture();
          });
        },

        refreshTextures() {
          instances.forEach(instance =>
            instance.refreshTexture()
          );
        },

        addGUI(gui) {
          if (!gui || !instances.length) {
            return;
          }

          const folder =
            gui.addFolder(
              "Section 3 Content Reveal"
            );

          /*
           * TIMELINE CONTROLS
           */
          folder
            .add(
              sharedSettings,
              "revealStart",
              0.70,
              0.99,
              0.001
            )
            .name("Reveal start");

          folder
            .add(
              sharedSettings,
              "revealEnd",
              0.75,
              1,
              0.001
            )
            .name("Reveal end");

          folder
            .add(
              sharedSettings,
              "shaderStart",
              0,
              0.8,
              0.001
            )
            .name("Shader start");

          /*
           * PERLIN NOISE CONTROLS
           */
          folder
            .add(
              sharedSettings,
              "noiseX",
              1,
              20,
              0.1
            )
            .name("Perlin noise X");

          folder
            .add(
              sharedSettings,
              "noiseY",
              1,
              20,
              0.1
            )
            .name("Perlin noise Y");

          folder
            .add(
              sharedSettings,
              "noiseZ",
              0,
              12,
              0.1
            )
            .name("Perlin noise Z");

          folder
            .add(
              sharedSettings,
              "perlinStrength",
              0,
              1,
              0.01
            )
            .name("Perlin strength");

          /*
           * BLUE-NOISE BREAKUP
           */
          folder
            .add(
              sharedSettings,
              "blueNoiseStrength",
              0,
              1,
              0.01
            )
            .name("Blue-noise strength");

          /*
           * ORGANIC EDGE
           */
          folder
            .add(
              sharedSettings,
              "edgeWidth",
              0.001,
              0.3,
              0.001
            )
            .name("Edge width");

          /*
           * BLUR HALO
           */
          folder
            .add(
              sharedSettings,
              "blurStrength",
              0,
              2,
              0.01
            )
            .name("Blur strength");

          /*
           * FILM GRAIN
           */
          folder
            .add(
              sharedSettings,
              "grain",
              0,
              0.15,
              0.001
            )
            .name("Film grain");

          /*
           * DISTORTION
           */
          folder
            .add(
              sharedSettings,
              "distortion",
              0,
              0.05,
              0.001
            )
            .name("Distortion");

          folder.open();
        }
      };

      window.PerlinRevealRegistry =
        registry;

      return registry;
    })().catch(error => {
      console.error(
        "[perlin-reveal] Initialization failed:",
        error
      );

      return null;
    });
})();
