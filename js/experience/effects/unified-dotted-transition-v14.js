/* ================================================================
   FINAL SECTION 3 → SECTION 4 TRANSITION
   Noise / Dust Vertical Dissolve

   Replaces the old dotted transition.

   IMPORTANT:
   The public API stays the same:

   window.DottedTransitionRegistry.update(progress)
   window.DottedTransitionRegistry.resize()
   window.DottedTransitionRegistry.addGUI(gui)

   So app.js does NOT need to change.
================================================================ */

(() => {
  "use strict";


  // ================================================================
  // CONFIG
  // ================================================================

  const CONFIG =
    window.EXPERIENCE_CONFIG || {};


  const transitionConfig =
    CONFIG.sectionThreeToFour || {};



  // ================================================================
  // CANVAS
  // ================================================================

  const canvas =
    document.querySelector(
      ".section-3-noise-ditter-trans"
    );


  if (!canvas) {
    console.warn(
      "[FinalNoiseTransition] .section-3-noise-ditter-trans not found."
    );

    createEmptyRegistry();

    return;
  }



  // ================================================================
  // SETTINGS
  // ================================================================

  const settings = {

    revealStart:
      transitionConfig.effectStart ??
      0.00,


    revealEnd:
      transitionConfig.effectEnd ??
      1.00,


    dissolveSpread:
      0.048,


    edgeShapeScale:
      6.5,


    edgeIrregularity:
      0.195,


    blueNoiseDotScale:
      2.5,


    distortion:
      0.013,


    filmGrain:
      0.03,


    dustBandWidth:
      0.155,


    edgeOpacity:
      0.75,


    edgeColor:
      "#e8dec7"
  };



  // ================================================================
  // WEBGL
  // ================================================================

  const gl =
    canvas.getContext(
      "webgl2",
      {
        alpha: true,

        antialias: false,

        depth: false,

        stencil: false,

        premultipliedAlpha: false,

        powerPreference:
          "high-performance"
      }
    )

    ||

    canvas.getContext(
      "webgl",
      {
        alpha: true,

        antialias: false,

        depth: false,

        stencil: false,

        premultipliedAlpha: false,

        powerPreference:
          "high-performance"
      }
    );


  if (!gl) {
    console.warn(
      "[FinalNoiseTransition] WebGL unavailable."
    );

    createEmptyRegistry();

    return;
  }



  // ================================================================
  // STATE
  // ================================================================

  let progress =
    0;


  let fromImage =
    null;


  let toImage =
    null;


  let fromTexture =
    null;


  let toTexture =
    null;


  let ready =
    false;



  // ================================================================
  // VERTEX SHADER
  // ================================================================

  const vertexSource = `

    attribute vec2 a_position;

    varying vec2 v_uv;


    void main() {

      v_uv =
        a_position *
        0.5 +
        0.5;


      gl_Position =
        vec4(
          a_position,
          0.0,
          1.0
        );
    }

  `;



  // ================================================================
  // FRAGMENT SHADER
  // ================================================================

  const fragmentSource = `

    precision highp float;


    varying vec2 v_uv;


    uniform sampler2D u_from;

    uniform sampler2D u_to;


    uniform vec2 u_resolution;

    uniform vec2 u_fromSize;

    uniform vec2 u_toSize;


    uniform float u_progress;


    uniform float u_revealStart;

    uniform float u_revealEnd;


    uniform float u_dissolveSpread;


    uniform float u_edgeShapeScale;

    uniform float u_edgeIrregularity;


    uniform float u_blueNoiseDotScale;


    uniform float u_distortion;


    uniform float u_filmGrain;


    uniform float u_dustBandWidth;


    uniform float u_edgeOpacity;


    uniform vec3 u_edgeColor;



    // ============================================================
    // HASH
    // ============================================================

    float hash21(vec2 p) {

      p =
        fract(
          p *
          vec2(
            123.34,
            456.21
          )
        );


      p +=
        dot(
          p,
          p + 45.32
        );


      return
        fract(
          p.x *
          p.y
        );
    }



    // ============================================================
    // VALUE NOISE
    // ============================================================

    float valueNoise(vec2 p) {

      vec2 i =
        floor(p);


      vec2 f =
        fract(p);


      f =
        f *
        f *
        (
          3.0 -
          2.0 * f
        );


      float a =
        hash21(i);


      float b =
        hash21(
          i +
          vec2(
            1.0,
            0.0
          )
        );


      float c =
        hash21(
          i +
          vec2(
            0.0,
            1.0
          )
        );


      float d =
        hash21(
          i +
          vec2(
            1.0,
            1.0
          )
        );


      return
        mix(

          mix(
            a,
            b,
            f.x
          ),

          mix(
            c,
            d,
            f.x
          ),

          f.y
        );
    }



    // ============================================================
    // COVER UV
    // ============================================================

    vec2 coverUV(
      vec2 uv,
      vec2 imageSize
    ) {

      float screenRatio =
        u_resolution.x /
        u_resolution.y;


      float imageRatio =
        imageSize.x /
        imageSize.y;


      vec2 scale =
        vec2(1.0);


      if (
        imageRatio >
        screenRatio
      ) {

        scale.x =
          screenRatio /
          imageRatio;

      } else {

        scale.y =
          imageRatio /
          screenRatio;
      }


      return
        (
          uv -
          0.5
        )
        *
        scale
        +
        0.5;
    }



    // ============================================================
    // MAIN
    // ============================================================

    void main() {

      vec2 uv =
        v_uv;



      // ----------------------------------------------------------
      // LOCAL TRANSITION PROGRESS
      // ----------------------------------------------------------

      float localProgress =
        clamp(

          (
            u_progress -
            u_revealStart
          )

          /

          max(
            0.0001,

            u_revealEnd -
            u_revealStart
          ),

          0.0,

          1.0
        );



      // ----------------------------------------------------------
      // BLUE NOISE GRID
      // ----------------------------------------------------------

      vec2 grid =
        floor(

          gl_FragCoord.xy

          /

          max(
            1.0,
            u_blueNoiseDotScale
          )
        );



      float blueNoise =
        hash21(

          grid

          +

          vec2(
            17.0,
            93.0
          )
        );



      // ----------------------------------------------------------
      // LARGE ORGANIC EDGE
      // ----------------------------------------------------------

      float edgeShape =
        valueNoise(

          vec2(

            uv.x *
            u_edgeShapeScale,

            uv.y *
            u_edgeShapeScale *
            0.55
          )
        );



      // ----------------------------------------------------------
      // SMALLER EDGE DETAILS
      // ----------------------------------------------------------

      float fineShape =
        valueNoise(

          vec2(

            uv.x *
            u_edgeShapeScale *
            3.1,

            uv.y *
            u_edgeShapeScale *
            2.2
          )
        );



      float shapedNoise =

        (
          edgeShape *
          0.72

          +

          fineShape *
          0.28

          -

          0.5
        )

        *

        u_edgeIrregularity;



      // ----------------------------------------------------------
      // SUBTLE DISTORTION
      // ----------------------------------------------------------

      float distortionNoise =

        (
          valueNoise(

            uv *
            23.0

            +

            localProgress *
            3.0
          )

          -

          0.5
        )

        *

        u_distortion;



      // ----------------------------------------------------------
      // VERTICAL THRESHOLD
      // ----------------------------------------------------------

      float threshold =

        localProgress

        *

        (
          1.0

          +

          2.0 *
          u_dissolveSpread
        )

        -

        u_dissolveSpread;



      // ----------------------------------------------------------
      // ORGANIC VERTICAL AXIS
      // ----------------------------------------------------------

      float displacedAxis =

        uv.y

        +

        shapedNoise

        +

        distortionNoise;



      // ----------------------------------------------------------
      // DISSOLVE
      // ----------------------------------------------------------

      float dissolve =
        smoothstep(

          threshold -
          u_dissolveSpread,

          threshold +
          u_dissolveSpread,

          displacedAxis
        );



      // ----------------------------------------------------------
      // TEXTURES
      // ----------------------------------------------------------

      vec4 fromColor =
        texture2D(

          u_from,

          coverUV(
            uv,
            u_fromSize
          )
        );



      vec4 toColor =
        texture2D(

          u_to,

          coverUV(
            uv,
            u_toSize
          )
        );



      // ----------------------------------------------------------
      // MAIN MIX
      // ----------------------------------------------------------

      vec3 color =
        mix(

          toColor.rgb,

          fromColor.rgb,

          dissolve
        );



      // ----------------------------------------------------------
      // EDGE DISTANCE
      // ----------------------------------------------------------

      float boundary =
        abs(

          displacedAxis

          -

          threshold
        );



      // ----------------------------------------------------------
      // DUST BAND
      // ----------------------------------------------------------

      float dustBand =

        1.0

        -

        smoothstep(

          0.0,

          u_dustBandWidth,

          boundary
        );



      // ----------------------------------------------------------
      // DOT THRESHOLD
      // ----------------------------------------------------------

      float dotThreshold =

        0.22

        +

        (
          1.0 -
          dustBand
        )

        *

        0.56;



      float dots =

        step(
          dotThreshold,
          blueNoise
        )

        *

        dustBand;



      // ----------------------------------------------------------
      // DUST COLOR
      // ----------------------------------------------------------

      vec3 sampledDust =
        mix(

          fromColor.rgb,

          toColor.rgb,

          0.5
        );



      vec3 dustColor =
        mix(

          sampledDust,

          u_edgeColor,

          0.72
        );



      // ----------------------------------------------------------
      // CLEAN START
      //
      // No dust visible at progress 0.
      // ----------------------------------------------------------

      float startVisibility =
        smoothstep(

          0.015,

          0.065,

          localProgress
        );



      // ----------------------------------------------------------
      // CLEAN FINISH
      // ----------------------------------------------------------

      float topCleanup =

        1.0

        -

        smoothstep(

          0.94,

          1.0,

          localProgress
        );



      dots *=

        startVisibility

        *

        topCleanup;



      // ----------------------------------------------------------
      // ADD DUST
      // ----------------------------------------------------------

      color =
        mix(

          color,

          dustColor,

          dots *
          u_edgeOpacity
        );



      // ----------------------------------------------------------
      // FORCE CLEAN FIRST FRAME
      // ----------------------------------------------------------

      color =
        mix(

          fromColor.rgb,

          color,

          startVisibility
        );



      // ----------------------------------------------------------
      // FORCE CLEAN FINAL FRAME
      // ----------------------------------------------------------

      float finish =
        smoothstep(

          0.965,

          1.0,

          localProgress
        );



      color =
        mix(

          color,

          toColor.rgb,

          finish
        );



      // ----------------------------------------------------------
      // FILM GRAIN
      // ----------------------------------------------------------

      float grain =

        (
          hash21(

            gl_FragCoord.xy

            +

            localProgress *
            137.0
          )

          -

          0.5
        )

        *

        u_filmGrain

        *

        startVisibility

        *

        topCleanup;



      color +=
        grain;



      gl_FragColor =
        vec4(
          color,
          1.0
        );
    }

  `;



  // ================================================================
  // SHADER COMPILATION
  // ================================================================

  function compileShader(
    type,
    source
  ) {

    const shader =
      gl.createShader(
        type
      );


    gl.shaderSource(
      shader,
      source
    );


    gl.compileShader(
      shader
    );


    if (
      !gl.getShaderParameter(
        shader,
        gl.COMPILE_STATUS
      )
    ) {

      const error =
        gl.getShaderInfoLog(
          shader
        );


      gl.deleteShader(
        shader
      );


      throw new Error(
        `[FinalNoiseTransition] Shader error:\n${error}`
      );
    }


    return shader;
  }



  // ================================================================
  // PROGRAM
  // ================================================================

  const program =
    gl.createProgram();


  gl.attachShader(
    program,

    compileShader(
      gl.VERTEX_SHADER,
      vertexSource
    )
  );


  gl.attachShader(
    program,

    compileShader(
      gl.FRAGMENT_SHADER,
      fragmentSource
    )
  );


  gl.linkProgram(
    program
  );


  if (
    !gl.getProgramParameter(
      program,
      gl.LINK_STATUS
    )
  ) {

    throw new Error(
      gl.getProgramInfoLog(
        program
      )
    );
  }


  gl.useProgram(
    program
  );



  // ================================================================
  // FULL SCREEN TRIANGLE BUFFER
  // ================================================================

  const buffer =
    gl.createBuffer();


  gl.bindBuffer(
    gl.ARRAY_BUFFER,
    buffer
  );


  gl.bufferData(
    gl.ARRAY_BUFFER,

    new Float32Array([

      -1, -1,

       1, -1,

      -1,  1,


      -1,  1,

       1, -1,

       1,  1

    ]),

    gl.STATIC_DRAW
  );



  const position =
    gl.getAttribLocation(
      program,
      "a_position"
    );


  gl.enableVertexAttribArray(
    position
  );


  gl.vertexAttribPointer(
    position,

    2,

    gl.FLOAT,

    false,

    0,

    0
  );



  // ================================================================
  // UNIFORMS
  // ================================================================

  const uniformNames = [

    "u_from",

    "u_to",

    "u_resolution",

    "u_fromSize",

    "u_toSize",

    "u_progress",

    "u_revealStart",

    "u_revealEnd",

    "u_dissolveSpread",

    "u_edgeShapeScale",

    "u_edgeIrregularity",

    "u_blueNoiseDotScale",

    "u_distortion",

    "u_filmGrain",

    "u_dustBandWidth",

    "u_edgeOpacity",

    "u_edgeColor"
  ];



  const uniforms =
    {};


  uniformNames.forEach(
    name => {

      uniforms[name] =
        gl.getUniformLocation(
          program,
          name
        );
    }
  );



  // ================================================================
  // HELPERS
  // ================================================================

  function clamp01(value) {

    return Math.max(
      0,

      Math.min(
        1,
        value
      )
    );
  }



  function rangeProgress(
    value,
    start,
    end
  ) {

    return clamp01(

      (
        value -
        start
      )

      /

      Math.max(
        0.000001,

        end -
        start
      )
    );
  }



  function hexToRGB(hex) {

    const clean =
      String(
        hex ||
        "#e8dec7"
      )
      .replace(
        "#",
        ""
      );


    const normalized =

      clean.length === 3

        ? clean
            .split("")
            .map(
              character =>
                character +
                character
            )
            .join("")

        : clean;



    const number =
      parseInt(
        normalized,
        16
      );


    if (
      !Number.isFinite(
        number
      )
    ) {

      return [
        0.91,
        0.87,
        0.78
      ];
    }


    return [

      (
        (
          number >>
          16
        )
        &
        255
      )
      /
      255,


      (
        (
          number >>
          8
        )
        &
        255
      )
      /
      255,


      (
        number &
        255
      )
      /
      255
    ];
  }



  // ================================================================
  // IMAGE LOADING
  // ================================================================

  function loadImage(src) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const image =
          new Image();


        image.crossOrigin =
          "anonymous";


        image.onload =
          () =>
            resolve(
              image
            );


        image.onerror =
          () =>
            reject(
              new Error(
                `[FinalNoiseTransition] Failed loading ${src}`
              )
            );


        image.src =
          src;
      }
    );
  }



  // ================================================================
  // TEXTURE
  // ================================================================

  function createTexture(
    image,
    unit
  ) {

    const texture =
      gl.createTexture();


    gl.activeTexture(
      unit
    );


    gl.bindTexture(
      gl.TEXTURE_2D,
      texture
    );


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


    return texture;
  }



  // ================================================================
  // FIND SOURCE IMAGES
  // ================================================================

  function getImageFromElement(
    element
  ) {

    if (!element) {
      return null;
    }


    if (
      element.tagName ===
      "IMG"
    ) {

      return element;
    }


    return (
      element.querySelector(
        "img"
      )

      ||

      element.querySelector(
        "[data-canvas-texture]"
      )
    );
  }



  function findPreviousImage() {

    /*
     * First preference:
     * explicitly configured transition source.
     */

    const explicit =
      document.querySelector(
        "[data-final-transition-from]"
      );


    if (explicit) {
      return getImageFromElement(
        explicit
      );
    }



    /*
     * Section 3 image/content.
     */

    const sectionThree =
      document.querySelector(
        ".section_3"
      );


    const image =
      sectionThree?.querySelector(
        "[data-canvas-texture]"
      )

      ||

      sectionThree?.querySelector(
        "img"
      );


    return image || null;
  }



  function findNextImage() {

    /*
     * First preference:
     * explicitly configured destination.
     */

    const explicit =
      document.querySelector(
        "[data-final-transition-to]"
      );


    if (explicit) {

      return getImageFromElement(
        explicit
      );
    }



    /*
     * Section 4 image.
     */

    const sectionFour =
      document.querySelector(
        ".section_4"
      );


    const image =
      sectionFour?.querySelector(
        "[data-canvas-texture]"
      )

      ||

      sectionFour?.querySelector(
        "img"
      );


    return image || null;
  }



  // ================================================================
  // RESIZE
  // ================================================================

  function resize() {

    const rect =
      canvas.getBoundingClientRect();


    if (
      !rect.width ||
      !rect.height
    ) {
      return;
    }


    const mobile =
      matchMedia(
        "(max-width: 767px)"
      ).matches;


    const dpr =

      mobile

        ? 1

        : Math.min(
            window.devicePixelRatio || 1,

            1.5
          );



    const width =
      Math.max(

        1,

        Math.round(
          rect.width *
          dpr
        )
      );


    const height =
      Math.max(

        1,

        Math.round(
          rect.height *
          dpr
        )
      );



    if (
      canvas.width !== width

      ||

      canvas.height !== height
    ) {

      canvas.width =
        width;


      canvas.height =
        height;
    }



    gl.viewport(
      0,
      0,
      canvas.width,
      canvas.height
    );


    render();
  }



  // ================================================================
  // RENDER
  // ================================================================

  function render() {

    if (
      !ready

      ||

      !fromImage

      ||

      !toImage

      ||

      !fromTexture

      ||

      !toTexture
    ) {

      return;
    }



    gl.viewport(
      0,
      0,
      canvas.width,
      canvas.height
    );


    gl.useProgram(
      program
    );



    // ------------------------------------------------------------
    // FROM TEXTURE
    // ------------------------------------------------------------

    gl.activeTexture(
      gl.TEXTURE0
    );


    gl.bindTexture(
      gl.TEXTURE_2D,
      fromTexture
    );


    gl.uniform1i(
      uniforms.u_from,
      0
    );



    // ------------------------------------------------------------
    // TO TEXTURE
    // ------------------------------------------------------------

    gl.activeTexture(
      gl.TEXTURE1
    );


    gl.bindTexture(
      gl.TEXTURE_2D,
      toTexture
    );


    gl.uniform1i(
      uniforms.u_to,
      1
    );



    // ------------------------------------------------------------
    // SIZES
    // ------------------------------------------------------------

    gl.uniform2f(

      uniforms.u_resolution,

      canvas.width,

      canvas.height
    );



    gl.uniform2f(

      uniforms.u_fromSize,

      fromImage.naturalWidth ||
      fromImage.width,

      fromImage.naturalHeight ||
      fromImage.height
    );



    gl.uniform2f(

      uniforms.u_toSize,

      toImage.naturalWidth ||
      toImage.width,

      toImage.naturalHeight ||
      toImage.height
    );



    // ------------------------------------------------------------
    // PROGRESS
    // ------------------------------------------------------------

    gl.uniform1f(

      uniforms.u_progress,

      progress
    );



    // ------------------------------------------------------------
    // SETTINGS
    // ------------------------------------------------------------

    gl.uniform1f(

      uniforms.u_revealStart,

      settings.revealStart
    );


    gl.uniform1f(

      uniforms.u_revealEnd,

      settings.revealEnd
    );


    gl.uniform1f(

      uniforms.u_dissolveSpread,

      settings.dissolveSpread
    );


    gl.uniform1f(

      uniforms.u_edgeShapeScale,

      settings.edgeShapeScale
    );


    gl.uniform1f(

      uniforms.u_edgeIrregularity,

      settings.edgeIrregularity
    );


    gl.uniform1f(

      uniforms.u_blueNoiseDotScale,

      settings.blueNoiseDotScale
    );


    gl.uniform1f(

      uniforms.u_distortion,

      settings.distortion
    );


    gl.uniform1f(

      uniforms.u_filmGrain,

      settings.filmGrain
    );


    gl.uniform1f(

      uniforms.u_dustBandWidth,

      settings.dustBandWidth
    );


    gl.uniform1f(

      uniforms.u_edgeOpacity,

      settings.edgeOpacity
    );



    const edgeColor =
      hexToRGB(
        settings.edgeColor
      );


    gl.uniform3f(

      uniforms.u_edgeColor,

      edgeColor[0],

      edgeColor[1],

      edgeColor[2]
    );



    gl.drawArrays(
      gl.TRIANGLES,
      0,
      6
    );
  }



  // ================================================================
  // GLOBAL PROGRESS
  // ================================================================

  function update(
    globalProgress
  ) {

    /*
     * app.js sends raw ScrollTrigger progress.
     *
     * Convert that into local Section 3 → 4 transition progress.
     */

    const start =
      transitionConfig.revealStart ??
      0.92;


    const end =
      transitionConfig.revealEnd ??
      1.0;



    progress =
      rangeProgress(

        globalProgress,

        start,

        end
      );



    // ------------------------------------------------------------
    // VISIBILITY
    // ------------------------------------------------------------

    if (
      progress <=
      0.0001
    ) {

      canvas.style.opacity =
        "0";


      canvas.style.visibility =
        "hidden";


      return;
    }



    canvas.style.opacity =
      "1";


    canvas.style.visibility =
      "visible";



    render();
  }



  // ================================================================
  // SET IMAGES
  // ================================================================

  function setImages(
    from,
    to
  ) {

    if (
      !from ||
      !to
    ) {

      console.warn(
        "[FinalNoiseTransition] Missing from/to image."
      );

      return;
    }



    fromImage =
      from;


    toImage =
      to;



    if (
      fromTexture
    ) {

      gl.deleteTexture(
        fromTexture
      );
    }



    if (
      toTexture
    ) {

      gl.deleteTexture(
        toTexture
      );
    }



    fromTexture =
      createTexture(
        fromImage,
        gl.TEXTURE0
      );



    toTexture =
      createTexture(
        toImage,
        gl.TEXTURE1
      );



    ready =
      true;



    resize();

    render();
  }



  // ================================================================
  // INITIAL IMAGE DISCOVERY
  // ================================================================

  async function initialize() {

    try {

      const fromElement =
        findPreviousImage();


      const toElement =
        findNextImage();



      if (
        !fromElement

        ||

        !toElement
      ) {

        console.warn(
          "[FinalNoiseTransition] Could not automatically find Section 3 / Section 4 images."
        );


        console.warn(
          "[FinalNoiseTransition] Add data-final-transition-from and data-final-transition-to if needed."
        );


        return;
      }



      const fromSrc =

        fromElement.currentSrc

        ||

        fromElement.src;



      const toSrc =

        toElement.currentSrc

        ||

        toElement.src;



      if (
        !fromSrc ||
        !toSrc
      ) {

        console.warn(
          "[FinalNoiseTransition] Source URLs are missing."
        );

        return;
      }



      const [
        loadedFrom,
        loadedTo
      ] =

        await Promise.all([

          loadImage(
            fromSrc
          ),

          loadImage(
            toSrc
          )
        ]);



      setImages(
        loadedFrom,
        loadedTo
      );



      console.log(
        "[FinalNoiseTransition] Ready."
      );


    } catch (error) {

      console.error(
        "[FinalNoiseTransition] Initialization failed:",
        error
      );
    }
  }



  // ================================================================
  // DAT.GUI
  // ================================================================

  function addGUI(gui) {

    if (!gui) {
      return;
    }



    const folder =
      gui.addFolder(
        "Final Noise Transition"
      );



    folder
      .add(

        settings,

        "revealStart",

        0,

        0.95,

        0.005
      )
      .name(
        "Reveal start"
      );



    folder
      .add(

        settings,

        "revealEnd",

        0.05,

        1,

        0.005
      )
      .name(
        "Reveal end"
      );



    folder
      .add(

        settings,

        "dissolveSpread",

        0.001,

        0.15,

        0.001
      )
      .name(
        "Dissolve spread"
      );



    folder
      .add(

        settings,

        "edgeShapeScale",

        1,

        14,

        0.1
      )
      .name(
        "Edge shape scale"
      );



    folder
      .add(

        settings,

        "edgeIrregularity",

        0,

        0.35,

        0.005
      )
      .name(
        "Edge irregularity"
      );



    folder
      .add(

        settings,

        "blueNoiseDotScale",

        1,

        6,

        0.1
      )
      .name(
        "Blue-noise dot scale"
      );



    folder
      .add(

        settings,

        "distortion",

        0,

        0.08,

        0.001
      )
      .name(
        "Distortion"
      );



    folder
      .add(

        settings,

        "filmGrain",

        0,

        0.12,

        0.005
      )
      .name(
        "Film grain"
      );



    folder
      .add(

        settings,

        "dustBandWidth",

        0.01,

        0.4,

        0.005
      )
      .name(
        "Dust band width"
      );



    folder
      .add(

        settings,

        "edgeOpacity",

        0,

        1,

        0.01
      )
      .name(
        "Edge opacity"
      );



    folder
      .addColor(

        settings,

        "edgeColor"
      )
      .name(
        "Edge color"
      );



    folder.open();
  }



  // ================================================================
  // PUBLIC REGISTRY
  // ================================================================

  window.DottedTransitionRegistry = {

    update,

    resize,

    render,

    setImages,

    addGUI,

    settings,


    get progress() {

      return progress;
    },


    get ready() {

      return ready;
    }
  };



  // ================================================================
  // READY PROMISE
  // ================================================================

  window.DottedTransitionReady =
    initialize();



  // ================================================================
  // RESIZE
  // ================================================================

  let resizeTimer;


  window.addEventListener(

    "resize",

    () => {

      clearTimeout(
        resizeTimer
      );


      resizeTimer =
        setTimeout(
          resize,
          120
        );
    },

    {
      passive: true
    }
  );



  // ================================================================
  // EMPTY REGISTRY FALLBACK
  // ================================================================

  function createEmptyRegistry() {

    window.DottedTransitionRegistry = {

      update() {},

      resize() {},

      render() {},

      setImages() {},

      addGUI() {},

      settings: {},

      ready: false
    };


    window.DottedTransitionReady =
      Promise.resolve();
  }

})();
