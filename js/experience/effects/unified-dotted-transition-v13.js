(() => {
  "use strict";

  // ============================================================
  // FINAL SECTION 3 → SECTION 4
  //
  // FROM:
  // .section-2-img-seq
  //
  // TRANSITION:
  // .section-3-noise-ditter-trans
  //
  // TO:
  // .section-4_img
  //
  // Public API intentionally stays:
  //
  // window.DottedTransitionRegistry.update()
  // window.DottedTransitionRegistry.resize()
  // window.DottedTransitionRegistry.captureSource()
  // window.DottedTransitionRegistry.addGUI()
  // ============================================================


  const CONFIG =
    window.EXPERIENCE_CONFIG || {};


  const finalConfig =
    CONFIG.sectionThreeToFour || {};



  // ============================================================
  // DOM
  // ============================================================

  const canvas =
    document.querySelector(
      ".section-3-noise-ditter-trans"
    );


  const sourceCanvas =
    document.querySelector(
      ".section-2-img-seq"
    );


  const sectionThree =
    document.querySelector(
      ".section_3"
    );


  const sectionFour =
    document.querySelector(
      ".section_4"
    );


  const targetImage =
    document.querySelector(
      ".section-4_img"
    );



  // ============================================================
  // EMPTY FALLBACK
  // ============================================================

  function createEmptyRegistry() {

    window.DottedTransitionRegistry = {

      update() {},

      resize() {},

      render() {},

      captureSource() {},

      setImages() {},

      addGUI() {},

      settings: {},

      get ready() {
        return false;
      }
    };


    window.DottedTransitionReady =
      Promise.resolve();
  }



  if (!canvas) {

    console.warn(
      "[FinalNoiseTransition] .section-3-noise-ditter-trans not found."
    );


    createEmptyRegistry();

    return;
  }



  if (!sourceCanvas) {

    console.warn(
      "[FinalNoiseTransition] .section-2-img-seq not found."
    );


    createEmptyRegistry();

    return;
  }



  if (!targetImage) {

    console.warn(
      "[FinalNoiseTransition] .section-4_img not found."
    );


    createEmptyRegistry();

    return;
  }



  // ============================================================
  // SETTINGS
  // ============================================================

  const settings = {

    revealStart: 0.00,

    revealEnd: 1.00,


    dissolveSpread: 0.048,


    edgeShapeScale: 6.5,

    edgeIrregularity: 0.195,


    blueNoiseDotScale: 2.5,


    distortion: 0.013,


    filmGrain: 0.03,


    dustBandWidth: 0.155,


    edgeOpacity: 0.75,


    edgeColor: "#e8dec7"
  };



  // ============================================================
  // WEBGL
  // ============================================================

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



  // ============================================================
  // STATE
  // ============================================================

  let progress =
    0;


  let fromSource =
    null;


  let toSource =
    null;


  let fromTexture =
    null;


  let toTexture =
    null;


  let targetReady =
    false;


  let sourceReady =
    false;


  let ready =
    false;



  // ============================================================
  // SHADER COMPILER
  // ============================================================

  function compileShader(
    type,
    source
  ) {

    const shader =
      gl.createShader(type);


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



  // ============================================================
  // VERTEX
  // ============================================================

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



  // ============================================================
  // FRAGMENT
  // ============================================================

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



    // ==========================================================
    // HASH
    // ==========================================================

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



    // ==========================================================
    // VALUE NOISE
    // ==========================================================

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


      return mix(

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



    // ==========================================================
    // COVER UV
    // ==========================================================

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



    // ==========================================================
    // MAIN
    // ==========================================================

    void main() {

      vec2 uv =
        v_uv;



      // --------------------------------------------------------
      // LOCAL PROGRESS
      // --------------------------------------------------------

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



      // --------------------------------------------------------
      // BLUE NOISE GRID
      // --------------------------------------------------------

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



      // --------------------------------------------------------
      // LARGE EDGE SHAPE
      // --------------------------------------------------------

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



      // --------------------------------------------------------
      // FINE EDGE SHAPE
      // --------------------------------------------------------

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



      // --------------------------------------------------------
      // DISTORTION
      // --------------------------------------------------------

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



      // --------------------------------------------------------
      // VERTICAL REVEAL FRONT
      // --------------------------------------------------------

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



      float displacedAxis =

        uv.y

        +

        shapedNoise

        +

        distortionNoise;



      // --------------------------------------------------------
      // DISSOLVE
      // --------------------------------------------------------

      float dissolve =
        smoothstep(

          threshold -
          u_dissolveSpread,

          threshold +
          u_dissolveSpread,

          displacedAxis
        );



      // --------------------------------------------------------
      // FROM
      // --------------------------------------------------------

      vec4 fromColor =
        texture2D(

          u_from,

          coverUV(
            uv,
            u_fromSize
          )
        );



      // --------------------------------------------------------
      // TO
      // --------------------------------------------------------

      vec4 toColor =
        texture2D(

          u_to,

          coverUV(
            uv,
            u_toSize
          )
        );



      // --------------------------------------------------------
      // MAIN COLOR
      // --------------------------------------------------------

      vec3 color =
        mix(

          toColor.rgb,

          fromColor.rgb,

          dissolve
        );



      // --------------------------------------------------------
      // EDGE DISTANCE
      // --------------------------------------------------------

      float boundary =
        abs(

          displacedAxis

          -

          threshold
        );



      // --------------------------------------------------------
      // DUST BAND
      // --------------------------------------------------------

      float dustBand =

        1.0

        -

        smoothstep(

          0.0,

          u_dustBandWidth,

          boundary
        );



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



      // --------------------------------------------------------
      // DUST COLOR
      // --------------------------------------------------------

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



      // --------------------------------------------------------
      // CLEAN START
      // --------------------------------------------------------

      float startVisibility =
        smoothstep(

          0.015,

          0.065,

          localProgress
        );



      // --------------------------------------------------------
      // CLEAN END
      // --------------------------------------------------------

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



      color =
        mix(

          color,

          dustColor,

          dots *
          u_edgeOpacity
        );



      // --------------------------------------------------------
      // FORCE CLEAN ORIGINAL
      // --------------------------------------------------------

      color =
        mix(

          fromColor.rgb,

          color,

          startVisibility
        );



      // --------------------------------------------------------
      // FORCE CLEAN TARGET
      // --------------------------------------------------------

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



      // --------------------------------------------------------
      // FILM GRAIN
      // --------------------------------------------------------

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



  // ============================================================
  // PROGRAM
  // ============================================================

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



  // ============================================================
  // BUFFER
  // ============================================================

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



  // ============================================================
  // UNIFORMS
  // ============================================================

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



  // ============================================================
  // HELPERS
  // ============================================================

  function clamp01(
    value
  ) {

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



  function hexToRGB(
    hex
  ) {

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
              char =>
                char +
                char
            )
            .join("")

        : clean;


    const value =
      parseInt(
        normalized,
        16
      );


    if (
      !Number.isFinite(
        value
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
          value >>
          16
        )
        &
        255
      )
      /
      255,


      (
        (
          value >>
          8
        )
        &
        255
      )
      /
      255,


      (
        value &
        255
      )
      /
      255
    ];
  }



  // ============================================================
  // CREATE TEXTURE
  // ============================================================

  function createTexture(
    source,
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

      source
    );


    return texture;
  }



  // ============================================================
  // TARGET IMAGE
  // ============================================================

  function waitForImage(
    image
  ) {

    if (
      image.complete &&
      image.naturalWidth >
      0
    ) {

      return Promise.resolve(
        image
      );
    }


    return new Promise(
      (
        resolve,
        reject
      ) => {

        image.addEventListener(
          "load",
          () => {
            resolve(
              image
            );
          },
          {
            once: true
          }
        );


        image.addEventListener(
          "error",
          () => {

            reject(
              new Error(
                "[FinalNoiseTransition] Section 4 image failed to load."
              )
            );
          },
          {
            once: true
          }
        );
      }
    );
  }



  // ============================================================
  // CAPTURE FINAL SEQUENCE FRAME
  // ============================================================

  function captureSource() {

    if (
      !sourceCanvas.width ||
      !sourceCanvas.height
    ) {

      console.warn(
        "[FinalNoiseTransition] Sequence canvas has no size."
      );

      return false;
    }



    if (
      fromTexture
    ) {

      gl.deleteTexture(
        fromTexture
      );
    }



    fromSource =
      sourceCanvas;



    fromTexture =
      createTexture(

        sourceCanvas,

        gl.TEXTURE0
      );



    sourceReady =
      true;



    ready =
      sourceReady &&
      targetReady;



    if (ready) {

      render();
    }



    return true;
  }



  // ============================================================
  // SET TARGET
  // ============================================================

  function setTarget(
    image
  ) {

    toSource =
      image;



    if (
      toTexture
    ) {

      gl.deleteTexture(
        toTexture
      );
    }



    toTexture =
      createTexture(

        image,

        gl.TEXTURE1
      );



    targetReady =
      true;



    ready =
      sourceReady &&
      targetReady;
  }



  // ============================================================
  // SET BOTH SOURCES
  // OPTIONAL PUBLIC METHOD
  // ============================================================

  function setImages(
    from,
    to
  ) {

    if (
      from
    ) {

      if (
        fromTexture
      ) {

        gl.deleteTexture(
          fromTexture
        );
      }


      fromSource =
        from;


      fromTexture =
        createTexture(
          from,
          gl.TEXTURE0
        );


      sourceReady =
        true;
    }



    if (
      to
    ) {

      setTarget(
        to
      );
    }



    ready =
      sourceReady &&
      targetReady;



    resize();

    render();
  }



  // ============================================================
  // RESIZE
  // ============================================================

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

            window.devicePixelRatio ||
            1,

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



  // ============================================================
  // RENDER
  // ============================================================

  function render() {

    if (
      !ready

      ||

      !fromTexture

      ||

      !toTexture

      ||

      !fromSource

      ||

      !toSource
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


    gl.bindBuffer(
      gl.ARRAY_BUFFER,
      buffer
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



    // ----------------------------------------------------------
    // FROM
    // ----------------------------------------------------------

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



    // ----------------------------------------------------------
    // TO
    // ----------------------------------------------------------

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



    gl.uniform2f(

      uniforms.u_resolution,

      canvas.width,

      canvas.height
    );



    gl.uniform2f(

      uniforms.u_fromSize,

      fromSource.naturalWidth ||
      fromSource.width,

      fromSource.naturalHeight ||
      fromSource.height
    );



    gl.uniform2f(

      uniforms.u_toSize,

      toSource.naturalWidth ||
      toSource.width,

      toSource.naturalHeight ||
      toSource.height
    );



    gl.uniform1f(

      uniforms.u_progress,

      progress
    );



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



  // ============================================================
  // VISIBILITY
  // ============================================================

  function updateVisibility(
    localProgress
  ) {

    if (
      localProgress <=
      0.0001
    ) {

      canvas.style.opacity =
        "0";


      canvas.style.visibility =
        "hidden";


      if (
        sectionFour
      ) {

        sectionFour.style.opacity =
          "0";


        sectionFour.style.visibility =
          "hidden";
      }


      return;
    }



    if (
      localProgress >=
      0.999
    ) {

      canvas.style.opacity =
        "0";


      canvas.style.visibility =
        "hidden";


      if (
        sectionThree
      ) {

        sectionThree.style.opacity =
          "0";


        sectionThree.style.visibility =
          "hidden";
      }


      if (
        sectionFour
      ) {

        sectionFour.style.opacity =
          "1";


        sectionFour.style.visibility =
          "visible";
      }


      return;
    }



    canvas.style.opacity =
      "1";


    canvas.style.visibility =
      "visible";



    if (
      sectionFour
    ) {

      sectionFour.style.opacity =
        "0";


      sectionFour.style.visibility =
        "hidden";
    }



    /*
     * Fade Section 3 content away
     * while the shader progresses.
     */

    if (
      sectionThree
    ) {

      const sectionThreeAlpha =
        Math.max(
          0,

          1 -
          localProgress *
          2.3
        );


      sectionThree.style.opacity =
        String(
          sectionThreeAlpha
        );


      sectionThree.style.visibility =
        sectionThreeAlpha >
        0.001

          ? "visible"

          : "hidden";
    }
  }



  // ============================================================
  // UPDATE
  // app.js supplies RAW ScrollTrigger progress
  // ============================================================

  function update(
    rawProgress
  ) {

    const start =
      finalConfig.revealStart ??
      0.92;


    const end =
      finalConfig.revealEnd ??
      1.0;



    progress =
      rangeProgress(

        rawProgress,

        start,

        end
      );



    updateVisibility(
      progress
    );



    if (
      progress >
      0.0001

      &&

      progress <
      0.999
    ) {

      render();
    }
  }



  // ============================================================
  // GUI
  // ============================================================

  function addGUI(
    gui
  ) {

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



  // ============================================================
  // INITIALIZE TARGET
  // ============================================================

  async function initialize() {

    try {

      const image =
        await waitForImage(
          targetImage
        );


      setTarget(
        image
      );


      resize();



      console.log(
        "[FinalNoiseTransition] Target ready: .section-4_img"
      );


    } catch (error) {

      console.error(
        "[FinalNoiseTransition] Initialization failed:",
        error
      );
    }
  }



  // ============================================================
  // PUBLIC REGISTRY
  // ============================================================

  window.DottedTransitionRegistry = {

    update,

    resize,

    render,

    captureSource,

    setImages,

    addGUI,

    settings,


    get ready() {
      return ready;
    },


    get sourceReady() {
      return sourceReady;
    },


    get targetReady() {
      return targetReady;
    },


    get progress() {
      return progress;
    }
  };



  // ============================================================
  // READY
  // ============================================================

  window.DottedTransitionReady =
    initialize();



  // ============================================================
  // RESIZE
  // ============================================================

  let resizeTimer;


  window.addEventListener(

    "resize",

    () => {

      clearTimeout(
        resizeTimer
      );


      resizeTimer =
        setTimeout(
          () => {

            resize();

          },
          120
        );
    },

    {
      passive: true
    }
  );

})();
