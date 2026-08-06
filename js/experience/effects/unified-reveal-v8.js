/**
 * UNIFIED REVEAL EFFECT
 *
 * Combines:
 * - Perlin noise: large cloudy organic reveal shapes
 * - Blue-noise breakup: fine particles around the edge
 * - Organic edge: controls dissolve-band width/irregularity
 * - Blur halo: soft materialisation before sharp content
 * - Film grain: subtle surface texture
 * - Distortion: small texture warp around the reveal front
 *
 * Current use:
 * - Section 3 content reveal on the right 50%
 *
 * Important:
 * - The reveal canvas must stay inside .section_3-content-wrap
 * - The real DOM content stays hidden while the canvas renders
 * - After reveal completes, canvas hides and real HTML becomes visible
 */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js/+esm";

  const stage = document.querySelector(".section-stage");
  const image = document.querySelector(".section-2-img-seq");
  const sectionThree = document.querySelector(".section_3");
  const contentWrap = document.querySelector(".section_3-content-wrap");
  const realContent = document.querySelector(".section_3-content-real");
  const canvas = document.querySelector(".section-3-content-reveal");

  const clamp = (value, min = 0, max = 1) =>
    Math.min(max, Math.max(min, value));

  const rangeProgress = (value, start, end) =>
    clamp((value - start) / Math.max(0.0001, end - start));

  const lerp = (a, b, t) =>
    a + (b - a) * t;

  /* =========================================================
     CONTENT TEXTURE CREATION
     Converts the real HTML content into a transparent canvas
     texture so the unified reveal shader can process it.
     ========================================================= */

  function createContentTexture() {
    const rect = contentWrap.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);

    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = Math.max(1, Math.round(rect.width * scale));
    textureCanvas.height = Math.max(1, Math.round(rect.height * scale));

    const ctx = textureCanvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.textBaseline = "top";

    const eyebrow = document.querySelector(".section_3-eyebrow");
    const heading = document.querySelector(".h3-text");
    const copy = document.querySelector(".section_3-copy");

    const eyebrowStyle = getComputedStyle(eyebrow);
    const headingStyle = getComputedStyle(heading);
    const copyStyle = getComputedStyle(copy);

    function drawWrappedText(
      text,
      x,
      y,
      maxWidth,
      lineHeight
    ) {
      const words = text.trim().split(/\s+/);
      let line = "";
      let cursorY = y;

      for (const word of words) {
        const testLine = line
          ? `${line} ${word}`
          : word;

        if (
          ctx.measureText(testLine).width > maxWidth &&
          line
        ) {
          ctx.fillText(line, x, cursorY);
          line = word;
          cursorY += lineHeight;
        } else {
          line = testLine;
        }
      }

      if (line) {
        ctx.fillText(line, x, cursorY);
      }

      return cursorY;
    }

    ctx.fillStyle = eyebrowStyle.color;
    ctx.font = `${eyebrowStyle.fontWeight} ${eyebrowStyle.fontSize} ${eyebrowStyle.fontFamily}`;
    ctx.fillText(eyebrow.textContent.trim(), 0, 0);

    const headingTop = 40;
    const headingLineHeight =
      parseFloat(headingStyle.lineHeight) ||
      parseFloat(headingStyle.fontSize) * 0.93;

    ctx.fillStyle = headingStyle.color;
    ctx.font = `${headingStyle.fontWeight} ${headingStyle.fontSize} ${headingStyle.fontFamily}`;

    const headingBottom = drawWrappedText(
      heading.textContent,
      0,
      headingTop,
      rect.width,
      headingLineHeight
    );

    const copyTop =
      headingBottom +
      headingLineHeight +
      26;

    const copyLineHeight =
      parseFloat(copyStyle.lineHeight) ||
      parseFloat(copyStyle.fontSize) * 1.48;

    ctx.fillStyle = copyStyle.color;
    ctx.font = `${copyStyle.fontWeight} ${copyStyle.fontSize} ${copyStyle.fontFamily}`;

    drawWrappedText(
      copy.textContent,
      0,
      copyTop,
      Math.min(rect.width, 520),
      copyLineHeight
    );

    return textureCanvas;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.5)
  );

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();

  const camera =
    new THREE.OrthographicCamera(
      -1,
      1,
      1,
      -1,
      0,
      1
    );

  const transparentTexture =
    new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 0]),
      1,
      1,
      THREE.RGBAFormat
    );

  transparentTexture.needsUpdate = true;

  const contentTexture =
    new THREE.CanvasTexture(
      createContentTexture()
    );

  contentTexture.colorSpace =
    THREE.SRGBColorSpace;

  contentTexture.needsUpdate = true;

  /* =========================================================
     UNIFIED EFFECT SETTINGS
     This one shader combines all reveal styles.

     perlinStrength:
       Controls the large cloudy organic noise pattern.

     blueNoiseStrength:
       Adds smaller static breakup around the reveal edge.

     grainStrength:
       Adds fine photographic grain to the revealed content.

     organicEdge:
       Controls how irregular and wide the reveal boundary feels.

     blurStrength:
       Creates the soft cloudy materialisation before sharp text appears.

     distortionStrength:
       Warps the texture slightly near the transition front.
     ========================================================= */

  const effect = {
    perlinStrength: 0.85,
    blueNoiseStrength: 0.18,
    grainStrength: 0.025,
    organicEdge: 0.075,
    blurStrength: 1.0,
    distortionStrength: 0.006,
    noiseX: 8.0,
    noiseY: 6.0,
    noiseZ: 4.0,
    revealStart: 0.22
  };

  const uniforms = {
    time: {
      value: effect.revealStart
    },

    resolution: {
      value: new THREE.Vector2(1, 1)
    },

    imageResolution: {
      value: new THREE.Vector2(
        contentTexture.image.width,
        contentTexture.image.height
      )
    },

    texPrev: {
      value: transparentTexture
    },

    texNext: {
      value: contentTexture
    },

    /* Perlin / organic noise controls */
    noiseX: {
      value: effect.noiseX
    },

    noiseY: {
      value: effect.noiseY
    },

    noiseZ: {
      value: effect.noiseZ
    },

    perlinStrength: {
      value: effect.perlinStrength
    },

    /* Blue-noise breakup */
    blueNoiseStrength: {
      value: effect.blueNoiseStrength
    },

    /* Film grain */
    grainStrength: {
      value: effect.grainStrength
    },

    /* Organic edge width */
    organicEdge: {
      value: effect.organicEdge
    },

    /* Soft blur halo */
    blurStrength: {
      value: effect.blurStrength
    },

    /* Texture distortion */
    distortionStrength: {
      value: effect.distortionStrength
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
    uniform sampler2D texPrev;
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

    /* =======================================================
       PERLIN NOISE
       Large organic cloudy shapes.
       ======================================================= */

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

      float n000 =
        dot(g000, Pf0);

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

      float n111 =
        dot(g111, Pf1);

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

    /* =======================================================
       BLUE-NOISE STYLE HASH
       Fine breakup and dust at the edge.
       ======================================================= */

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
        (cnoise(
          vec3(
            uv.x * noiseX,
            uv.y * noiseY,
            noiseZ
          )
        ) + 1.0) / 2.0;

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
        (1.0 - abs(revealMask * 2.0 - 1.0));

      vec4 sharp =
        texture2D(
          texNext,
          uv + distortion
        );

      /* =====================================================
         BLUR HALO
         Soft materialisation before the sharp content appears.
         ===================================================== */

      vec2 texel =
        1.0 /
        imageResolution;

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

      /* =====================================================
         FILM GRAIN
         Fine static surface texture.
         ===================================================== */

      float grain =
        hash12(
          gl_FragCoord.xy +
          vec2(19.0, 53.0)
        ) - 0.5;

      color +=
        vec3(grain) *
        grainStrength;

      gl_FragColor =
        vec4(
          color,
          alpha
        );
    }
  `;

  const material =
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false
    });

  scene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      material
    )
  );

  function resize() {
    const rect =
      canvas.getBoundingClientRect();

    const width =
      Math.max(1, rect.width);

    const height =
      Math.max(1, rect.height);

    renderer.setSize(
      width,
      height,
      false
    );

    uniforms.resolution.value.set(
      width,
      height
    );
  }

  function update() {
    const stageRect =
      stage.getBoundingClientRect();

    const totalDistance =
      stage.offsetHeight -
      window.innerHeight;

    const progress =
      clamp(
        -stageRect.top /
        Math.max(1, totalDistance)
      );

    /* =======================================================
       IMAGE LAYOUT MOVEMENT
       Fullscreen → center-left.
       ======================================================= */

    const layoutProgress =
      rangeProgress(
        progress,
        0.48,
        0.70
      );

    image.style.left =
      `${lerp(0, 4, layoutProgress)}%`;

    image.style.top =
      `${lerp(0, 12, layoutProgress)}%`;

    image.style.width =
      `${lerp(100, 42, layoutProgress)}%`;

    image.style.height =
      `${lerp(100, 76, layoutProgress)}%`;

    /* =======================================================
       SECTION 3 FADE
       Starts as the image reaches the left-side layout.
       ======================================================= */

    const sectionFade =
      rangeProgress(
        progress,
        0.66,
        0.73
      );

    sectionThree.style.opacity =
      sectionFade;

    sectionThree.style.visibility =
      sectionFade <= 0.001
        ? "hidden"
        : "visible";

    /* =======================================================
       UNIFIED CONTENT REVEAL
       Starts only after the image is placed on the left.
       ======================================================= */

    const revealProgress =
      rangeProgress(
        progress,
        0.70,
        0.92
      );

    uniforms.time.value =
      lerp(
        effect.revealStart,
        1,
        revealProgress
      );

    if (revealProgress <= 0.001) {
      canvas.style.opacity = "0";
      canvas.style.visibility = "hidden";

      realContent.style.opacity = "0";
      realContent.style.visibility = "hidden";
    } else if (revealProgress < 0.999) {
      canvas.style.opacity = "1";
      canvas.style.visibility = "visible";

      realContent.style.opacity = "0";
      realContent.style.visibility = "hidden";
    } else {
      canvas.style.opacity = "0";
      canvas.style.visibility = "hidden";

      realContent.style.opacity = "1";
      realContent.style.visibility = "visible";
    }

    renderer.render(
      scene,
      camera
    );
  }

  function refreshTexture() {
    const textureCanvas =
      createContentTexture();

    contentTexture.image =
      textureCanvas;

    contentTexture.needsUpdate =
      true;

    uniforms.imageResolution.value.set(
      textureCanvas.width,
      textureCanvas.height
    );

    resize();
    update();
  }

  let resizeTimer;

  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);

      resizeTimer =
        setTimeout(
          refreshTexture,
          180
        );
    }
  );

  window.addEventListener(
    "scroll",
    update,
    { passive: true }
  );

  document.fonts.ready.then(
    refreshTexture
  );

  resize();
  update();
