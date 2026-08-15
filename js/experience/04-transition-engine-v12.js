/* ================================================================
   EXPERIENCE TRANSITION ENGINES

   TRANSITION 1
   Center Irregular + Multicolor Dust Reveal
   NOTE:
   Class name remains OrganicRectangleReveal for app.js compatibility.

   TRANSITION 2
   Yellow Organic Reveal

   SECTION 3
   Perlin / Content Reveal
================================================================ */


/* ================================================================
   TRANSITION 1
   CENTER IRREGULAR + MULTICOLOR DUST REVEAL
================================================================ */

window.TransitionEngine = (() => {
  "use strict";


  // ==============================================================
  // HELPERS
  // ==============================================================

  function clamp01(value) {
    return Math.max(
      0,
      Math.min(1, value)
    );
  }


  function hexToRgb01(hex) {
    const clean = String(hex || "#ffffff")
      .replace("#", "");

    const normalized =
      clean.length === 3
        ? clean
            .split("")
            .map(c => c + c)
            .join("")
        : clean;

    const value = parseInt(normalized, 16);

    if (!Number.isFinite(value)) {
      return [1, 1, 1];
    }

    return [
      ((value >> 16) & 255) / 255,
      ((value >> 8) & 255) / 255,
      (value & 255) / 255
    ];
  }


  // ==============================================================
  // SHADER COMPILER
  // ==============================================================

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);

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
        gl.getShaderInfoLog(shader);

      gl.deleteShader(shader);

      throw new Error(
        `[Transition 1] Shader error:\n${error}`
      );
    }

    return shader;
  }


  // ==============================================================
  // PROGRAM
  // ==============================================================

  function createProgram(
    gl,
    vertexSource,
    fragmentSource
  ) {
    const program =
      gl.createProgram();

    const vertexShader =
      compileShader(
        gl,
        gl.VERTEX_SHADER,
        vertexSource
      );

    const fragmentShader =
      compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        fragmentSource
      );

    gl.attachShader(
      program,
      vertexShader
    );

    gl.attachShader(
      program,
      fragmentShader
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
        `[Transition 1] Program error:\n${gl.getProgramInfoLog(program)}`
      );
    }

    return program;
  }


  // ==============================================================
  // CLASS
  //
  // Name intentionally kept as OrganicRectangleReveal.
  // app.js does NOT need to change.
  // ==============================================================

  class OrganicRectangleReveal {

    constructor(canvas, options = {}) {
      this.canvas = canvas;

      this.gl =
        canvas.getContext(
          "webgl",
          {
            alpha: false,
            antialias: false,
            premultipliedAlpha: false,
            powerPreference: "high-performance"
          }
        );

      if (!this.gl) {
        throw new Error(
          "[Transition 1] WebGL not supported."
        );
      }


      // ==========================================================
      // SETTINGS
      // These are the settings from the Center Reveal shader.
      // ==========================================================

      this.settings = {

        revealStart:
          options.revealStart ??
          0.00,

        revealEnd:
          options.revealEnd ??
          1.00,


        centerX:
          options.centerX ??
          0.50,

        centerY:
          options.centerY ??
          0.50,


        shapeScale:
          options.shapeScale ??
          4.8,

        shapeIrregularity:
          options.shapeIrregularity ??
          0.24,


        vShapeAmount:
          options.vShapeAmount ??
          0.16,


        distortion:
          options.distortion ??
          0.035,


        dissolveSpread:
          options.dissolveSpread ??
          0.045,


        dustBandWidth:
          options.dustBandWidth ??
          0.12,


        dotScale:
          options.dotScale ??
          2.2,


        edgeOpacity:
          options.edgeOpacity ??
          0.82,


        colorMix:
          options.colorMix ??
          0.85,


        grain:
          options.grain ??
          0.025
      };


      this._progress = 0;

      this.fromImage = null;
      this.toImage = null;

      this.fromTexture = null;
      this.toTexture = null;

      this.ready = false;


      this.init();
    }


    // ============================================================
    // INIT
    // ============================================================

    init() {
      const gl =
        this.gl;


      // ==========================================================
      // VERTEX SHADER
      // ==========================================================

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


      // ==========================================================
      // FRAGMENT SHADER
      // ==========================================================

      const fragmentSource = `
        precision highp float;


        varying vec2 v_uv;


        uniform sampler2D u_from;
        uniform sampler2D u_to;


        uniform vec2 u_resolution;

        uniform vec2 u_fromSize;

        uniform vec2 u_toSize;


        uniform vec2 u_center;


        uniform float u_progress;

        uniform float u_revealStart;

        uniform float u_revealEnd;


        uniform float u_shapeScale;

        uniform float u_shapeIrregularity;

        uniform float u_vShapeAmount;


        uniform float u_distortion;


        uniform float u_dissolveSpread;


        uniform float u_dustBandWidth;


        uniform float u_dotScale;


        uniform float u_edgeOpacity;


        uniform float u_colorMix;


        uniform float u_grain;



        // ========================================================
        // HASH
        // ========================================================

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



        // ========================================================
        // VALUE NOISE
        // ========================================================

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



        // ========================================================
        // FBM
        // ========================================================

        float fbm(vec2 p) {

          float value =
            0.0;


          float amp =
            0.5;


          for (
            int i = 0;
            i < 5;
            i++
          ) {

            value +=
              valueNoise(p) *
              amp;


            p =
              p *
              2.03 +
              vec2(
                13.7,
                7.3
              );


            amp *=
              0.5;
          }


          return value;
        }



        // ========================================================
        // COVER UV
        // ========================================================

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



        // ========================================================
        // MULTICOLOR PALETTE
        // ========================================================

        vec3 palette(float t) {

          vec3 a =
            vec3(
              0.46,
              0.48,
              0.52
            );


          vec3 b =
            vec3(
              0.48,
              0.42,
              0.36
            );


          vec3 c =
            vec3(
              1.00,
              1.00,
              1.00
            );


          vec3 d =
            vec3(
              0.00,
              0.17,
              0.33
            );


          return
            a +
            b *
            cos(
              6.28318 *
              (
                c * t +
                d
              )
            );
        }



        // ========================================================
        // MAIN
        // ========================================================

        void main() {

          vec2 uv =
            v_uv;



          // ------------------------------------------------------
          // LOCAL PROGRESS
          // ------------------------------------------------------

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



          // ------------------------------------------------------
          // CENTER
          // ------------------------------------------------------

          vec2 centered =
            uv -
            u_center;


          centered.x *=
            u_resolution.x /
            u_resolution.y;



          float angle =
            atan(
              centered.y,
              centered.x
            );


          float radius =
            length(
              centered
            );



          // ------------------------------------------------------
          // V SHAPE
          // ------------------------------------------------------

          float vShape =

            abs(
              centered.x
            )

            *

            u_vShapeAmount

            *

            (
              0.6

              +

              0.4 *
              sin(
                angle *
                3.0
              )
            );



          // ------------------------------------------------------
          // ORGANIC EDGE NOISE
          // ------------------------------------------------------

          float edgeNoise =

            (
              fbm(

                centered *
                u_shapeScale

                +

                2.0
              )

              -

              0.5
            )

            *

            u_shapeIrregularity;



          // ------------------------------------------------------
          // ANGULAR WARP
          // ------------------------------------------------------

          float angularWarp =

            sin(

              angle *
              5.0

              +

              fbm(
                centered *
                4.0
              )

              *

              3.0
            )

            *

            u_distortion;



          // ------------------------------------------------------
          // FINAL SHAPE
          // ------------------------------------------------------

          float shapeDistance =

            radius

            +

            vShape

            +

            edgeNoise

            +

            angularWarp;



          // ------------------------------------------------------
          // REVEAL
          // ------------------------------------------------------

          float maxRadius =
            1.15;


          float threshold =
            localProgress *
            maxRadius;



          float dissolve =

            1.0

            -

            smoothstep(

              threshold -
              u_dissolveSpread,

              threshold +
              u_dissolveSpread,

              shapeDistance
            );



          // ------------------------------------------------------
          // TEXTURES
          // ------------------------------------------------------

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



          // ------------------------------------------------------
          // MAIN MIX
          // ------------------------------------------------------

          vec3 color =
            mix(

              fromColor.rgb,

              toColor.rgb,

              dissolve
            );



          // ------------------------------------------------------
          // EDGE DISTANCE
          // ------------------------------------------------------

          float boundary =
            abs(

              shapeDistance

              -

              threshold
            );



          // ------------------------------------------------------
          // DUST BAND
          // ------------------------------------------------------

          float dustBand =

            1.0

            -

            smoothstep(

              0.0,

              u_dustBandWidth,

              boundary
            );



          // ------------------------------------------------------
          // BLUE-NOISE STYLE DOT GRID
          // ------------------------------------------------------

          vec2 grid =
            floor(

              gl_FragCoord.xy

              /

              max(
                1.0,
                u_dotScale
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



          float dots =

            step(

              0.26

              +

              (
                1.0 -
                dustBand
              )

              *

              0.58,

              blueNoise
            )

            *

            dustBand;



          // ------------------------------------------------------
          // MULTICOLOR DUST
          // ------------------------------------------------------

          float colorSeed =
            hash21(

              grid *
              0.73

              +

              vec2(
                11.0,
                29.0
              )
            );



          vec3 multiColor =
            palette(
              colorSeed
            );



          vec3 sampledColor =
            mix(

              fromColor.rgb,

              toColor.rgb,

              0.5
            );



          vec3 dustColor =
            mix(

              sampledColor,

              multiColor,

              u_colorMix
            );



          // ------------------------------------------------------
          // CLEAN START
          // ------------------------------------------------------

          float startVisibility =
            smoothstep(

              0.015,

              0.06,

              localProgress
            );



          // ------------------------------------------------------
          // CLEAN END
          // ------------------------------------------------------

          float endVisibility =

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

            endVisibility;



          // ------------------------------------------------------
          // APPLY DUST
          // ------------------------------------------------------

          color =
            mix(

              color,

              dustColor,

              dots *
              u_edgeOpacity
            );



          // ------------------------------------------------------
          // PERFECT FIRST FRAME
          // ------------------------------------------------------

          color =
            mix(

              fromColor.rgb,

              color,

              startVisibility
            );



          // ------------------------------------------------------
          // PERFECT LAST FRAME
          // ------------------------------------------------------

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



          // ------------------------------------------------------
          // FILM GRAIN
          // ------------------------------------------------------

          float grain =

            (
              hash21(

                gl_FragCoord.xy

                +

                localProgress *
                173.0
              )

              -

              0.5
            )

            *

            u_grain

            *

            startVisibility

            *

            endVisibility;



          color +=
            grain;



          gl_FragColor =
            vec4(
              color,
              1.0
            );
        }
      `;


      // ==========================================================
      // PROGRAM
      // ==========================================================

      this.program =
        createProgram(
          gl,
          vertexSource,
          fragmentSource
        );


      gl.useProgram(
        this.program
      );


      // ==========================================================
      // FULLSCREEN BUFFER
      // ==========================================================

      this.buffer =
        gl.createBuffer();


      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        this.buffer
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


      this.position =
        gl.getAttribLocation(
          this.program,
          "a_position"
        );


      gl.enableVertexAttribArray(
        this.position
      );


      gl.vertexAttribPointer(

        this.position,

        2,

        gl.FLOAT,

        false,

        0,

        0
      );


      // ==========================================================
      // UNIFORMS
      // ==========================================================

      const names = [

        "u_from",
        "u_to",

        "u_resolution",

        "u_fromSize",
        "u_toSize",

        "u_center",

        "u_progress",

        "u_revealStart",
        "u_revealEnd",

        "u_shapeScale",

        "u_shapeIrregularity",

        "u_vShapeAmount",

        "u_distortion",

        "u_dissolveSpread",

        "u_dustBandWidth",

        "u_dotScale",

        "u_edgeOpacity",

        "u_colorMix",

        "u_grain"
      ];


      this.uniforms = {};


      names.forEach(name => {

        this.uniforms[name] =
          gl.getUniformLocation(
            this.program,
            name
          );
      });
    }


    // ============================================================
    // TEXTURE
    // ============================================================

    createTexture(
      image,
      unit
    ) {
      const gl =
        this.gl;


      const texture =
        gl.createTexture();


      gl.activeTexture(
        unit
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        texture
      );


      /*
       * Keep this TRUE because the original Center Reveal shader
       * used flipped WebGL image textures.
       */
      gl.pixelStorei(
        gl.UNPACK_FLIP_Y_WEBGL,
        true
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


    // ============================================================
    // SET IMAGES
    // ============================================================

    setImages(
      fromImage,
      toImage
    ) {
      const gl =
        this.gl;


      if (
        !fromImage ||
        !toImage
      ) {
        console.warn(
          "[Transition 1] setImages() requires FROM and TO."
        );

        return;
      }


      this.fromImage =
        fromImage;


      this.toImage =
        toImage;


      if (
        this.fromTexture
      ) {
        gl.deleteTexture(
          this.fromTexture
        );
      }


      if (
        this.toTexture
      ) {
        gl.deleteTexture(
          this.toTexture
        );
      }


      this.fromTexture =
        this.createTexture(
          fromImage,
          gl.TEXTURE0
        );


      this.toTexture =
        this.createTexture(
          toImage,
          gl.TEXTURE1
        );


      this.ready =
        true;


      this.resize();

      this.render();
    }


    // ============================================================
    // PROGRESS
    // ============================================================

    set progress(value) {
      this._progress =
        clamp01(value);
    }


    get progress() {
      return this._progress;
    }


    // ============================================================
    // RESIZE
    // ============================================================

    resize() {
      const gl =
        this.gl;


      const rect =
        this.canvas
          .getBoundingClientRect();


      const cssWidth =
        rect.width ||
        window.innerWidth;


      const cssHeight =
        rect.height ||
        window.innerHeight;


      const mobile =
        matchMedia(
          "(max-width: 767px)"
        ).matches;


      const dpr =
        mobile
          ? 1
          : Math.min(
              window.devicePixelRatio || 1,
              1.75
            );


      const width =
        Math.max(
          1,
          Math.round(
            cssWidth *
            dpr
          )
        );


      const height =
        Math.max(
          1,
          Math.round(
            cssHeight *
            dpr
          )
        );


      if (
        this.canvas.width !== width ||
        this.canvas.height !== height
      ) {
        this.canvas.width =
          width;

        this.canvas.height =
          height;
      }


      gl.viewport(
        0,
        0,
        width,
        height
      );
    }


    // ============================================================
    // RENDER
    // ============================================================

    render() {
      if (
        !this.ready ||
        !this.fromTexture ||
        !this.toTexture
      ) {
        return;
      }


      const gl =
        this.gl;


      this.resize();


      gl.useProgram(
        this.program
      );


      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        this.buffer
      );


      gl.enableVertexAttribArray(
        this.position
      );


      gl.vertexAttribPointer(
        this.position,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );


      // ==========================================================
      // FROM
      // ==========================================================

      gl.activeTexture(
        gl.TEXTURE0
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        this.fromTexture
      );


      gl.uniform1i(
        this.uniforms.u_from,
        0
      );


      // ==========================================================
      // TO
      // ==========================================================

      gl.activeTexture(
        gl.TEXTURE1
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        this.toTexture
      );


      gl.uniform1i(
        this.uniforms.u_to,
        1
      );


      // ==========================================================
      // SIZES
      // ==========================================================

      gl.uniform2f(
        this.uniforms.u_resolution,
        this.canvas.width,
        this.canvas.height
      );


      gl.uniform2f(
        this.uniforms.u_fromSize,

        this.fromImage.naturalWidth ||
          this.fromImage.width,

        this.fromImage.naturalHeight ||
          this.fromImage.height
      );


      gl.uniform2f(
        this.uniforms.u_toSize,

        this.toImage.naturalWidth ||
          this.toImage.width,

        this.toImage.naturalHeight ||
          this.toImage.height
      );


      // ==========================================================
      // CENTER
      // ==========================================================

      gl.uniform2f(
        this.uniforms.u_center,

        this.settings.centerX,

        this.settings.centerY
      );


      // ==========================================================
      // SETTINGS
      // ==========================================================

      gl.uniform1f(
        this.uniforms.u_progress,
        this._progress
      );


      gl.uniform1f(
        this.uniforms.u_revealStart,
        this.settings.revealStart
      );


      gl.uniform1f(
        this.uniforms.u_revealEnd,
        this.settings.revealEnd
      );


      gl.uniform1f(
        this.uniforms.u_shapeScale,
        this.settings.shapeScale
      );


      gl.uniform1f(
        this.uniforms.u_shapeIrregularity,
        this.settings.shapeIrregularity
      );


      gl.uniform1f(
        this.uniforms.u_vShapeAmount,
        this.settings.vShapeAmount
      );


      gl.uniform1f(
        this.uniforms.u_distortion,
        this.settings.distortion
      );


      gl.uniform1f(
        this.uniforms.u_dissolveSpread,
        this.settings.dissolveSpread
      );


      gl.uniform1f(
        this.uniforms.u_dustBandWidth,
        this.settings.dustBandWidth
      );


      gl.uniform1f(
        this.uniforms.u_dotScale,
        this.settings.dotScale
      );


      gl.uniform1f(
        this.uniforms.u_edgeOpacity,
        this.settings.edgeOpacity
      );


      gl.uniform1f(
        this.uniforms.u_colorMix,
        this.settings.colorMix
      );


      gl.uniform1f(
        this.uniforms.u_grain,
        this.settings.grain
      );


      // ==========================================================
      // DRAW
      // ==========================================================

      gl.drawArrays(
        gl.TRIANGLES,
        0,
        6
      );
    }


    // ============================================================
    // GUI
    // ============================================================

    addGUI(gui) {
      if (!gui) {
        return;
      }


      const folder =
        gui.addFolder(
          "Transition 1 - Center Dust Reveal"
        );


      const s =
        this.settings;


      folder
        .add(
          s,
          "revealStart",
          0,
          0.9,
          0.005
        )
        .name(
          "Reveal start"
        );


      folder
        .add(
          s,
          "revealEnd",
          0.1,
          1,
          0.005
        )
        .name(
          "Reveal end"
        );


      folder
        .add(
          s,
          "centerX",
          0,
          1,
          0.005
        )
        .name(
          "Center X"
        );


      folder
        .add(
          s,
          "centerY",
          0,
          1,
          0.005
        )
        .name(
          "Center Y"
        );


      folder
        .add(
          s,
          "shapeScale",
          1,
          12,
          0.1
        )
        .name(
          "Shape scale"
        );


      folder
        .add(
          s,
          "shapeIrregularity",
          0,
          0.5,
          0.005
        )
        .name(
          "Shape irregularity"
        );


      folder
        .add(
          s,
          "vShapeAmount",
          0,
          0.5,
          0.005
        )
        .name(
          "V-shape amount"
        );


      folder
        .add(
          s,
          "distortion",
          0,
          0.15,
          0.001
        )
        .name(
          "Distortion"
        );


      folder
        .add(
          s,
          "dissolveSpread",
          0.005,
          0.2,
          0.005
        )
        .name(
          "Dissolve spread"
        );


      folder
        .add(
          s,
          "dustBandWidth",
          0.01,
          0.35,
          0.005
        )
        .name(
          "Dust band width"
        );


      folder
        .add(
          s,
          "dotScale",
          1,
          6,
          0.1
        )
        .name(
          "Dot scale"
        );


      folder
        .add(
          s,
          "edgeOpacity",
          0,
          1,
          0.01
        )
        .name(
          "Edge opacity"
        );


      folder
        .add(
          s,
          "colorMix",
          0,
          1,
          0.01
        )
        .name(
          "Color variety"
        );


      folder
        .add(
          s,
          "grain",
          0,
          0.12,
          0.005
        )
        .name(
          "Film grain"
        );


      folder.open();
    }
  }


  // ==============================================================
  // EXPORT
  // ==============================================================

  return {
    OrganicRectangleReveal
  };

})();



/* ================================================================
   TRANSITION 2
   YELLOW ORGANIC REVEAL

   IMPORTANT:
   This is separate from Transition 1.
================================================================ */

window.BlueNoiseTransitionEngine = (() => {
  "use strict";


  // ==============================================================
  // HELPERS
  // ==============================================================

  function clamp01(value) {
    return Math.max(
      0,
      Math.min(1, value)
    );
  }


  function hexToRgb01(hex) {
    const clean =
      String(hex || "#efe7d1")
        .replace("#", "");


    const normalized =
      clean.length === 3
        ? clean
            .split("")
            .map(c => c + c)
            .join("")
        : clean;


    const value =
      parseInt(
        normalized,
        16
      );


    if (
      !Number.isFinite(value)
    ) {
      return [
        0.937,
        0.906,
        0.820
      ];
    }


    return [
      ((value >> 16) & 255) / 255,
      ((value >> 8) & 255) / 255,
      (value & 255) / 255
    ];
  }


  function compileShader(
    gl,
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
        gl.getShaderInfoLog(shader);


      gl.deleteShader(
        shader
      );


      throw new Error(
        `[YellowOrganicReveal] Shader error:\n${error}`
      );
    }


    return shader;
  }


  function createProgram(
    gl,
    vertexSource,
    fragmentSource
  ) {
    const program =
      gl.createProgram();


    gl.attachShader(
      program,
      compileShader(
        gl,
        gl.VERTEX_SHADER,
        vertexSource
      )
    );


    gl.attachShader(
      program,
      compileShader(
        gl,
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
        gl.getProgramInfoLog(program)
      );
    }


    return program;
  }


  // ==============================================================
  // CLASS
  // ==============================================================

  class BlueNoiseDustTransition {

    constructor(
      canvas,
      options = {}
    ) {
      this.canvas =
        canvas;


      this.gl =
        canvas.getContext(
          "webgl",
          {
            alpha: false,
            antialias: false,
            premultipliedAlpha: false,
            powerPreference: "high-performance"
          }
        );


      if (!this.gl) {
        throw new Error(
          "[YellowOrganicReveal] WebGL unavailable."
        );
      }


      this.settings = {

        yellowStart:
          options.yellowStart ??
          0.00,


        yellowEnd:
          options.yellowEnd ??
          0.28,


        revealStart:
          options.revealStart ??
          0.18,


        revealEnd:
          options.revealEnd ??
          1.00,


        centerX:
          options.centerX ??
          0.56,


        centerY:
          options.centerY ??
          0.48,


        openingScale:
          options.openingScale ??
          1.10,


        softness:
          options.softness ??
          0.095,


        edgeIrregularity:
          options.edgeIrregularity ??
          0.12,


        shapeStretchX:
          options.shapeStretchX ??
          1.18,


        shapeStretchY:
          options.shapeStretchY ??
          0.88,


        paperNoise:
          options.paperNoise ??
          0.035,


        vignette:
          options.vignette ??
          0.18,


        yellowColor:
          options.yellowColor ??
          "#efe7d1",


        yellowOpacity:
          options.yellowOpacity ??
          0.72
      };


      this._progress =
        0;


      this.fromImage =
        null;


      this.toImage =
        null;


      this.fromTexture =
        null;


      this.toTexture =
        null;


      this.ready =
        false;


      this.init();
    }


    // ============================================================
    // INIT
    // ============================================================

    init() {
      const gl =
        this.gl;


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


      const fragmentSource = `
        precision highp float;


        varying vec2 v_uv;


        uniform sampler2D u_from;

        uniform sampler2D u_to;


        uniform vec2 u_resolution;

        uniform vec2 u_fromSize;

        uniform vec2 u_toSize;


        uniform float u_progress;


        uniform float u_yellowStart;

        uniform float u_yellowEnd;


        uniform float u_revealStart;

        uniform float u_revealEnd;


        uniform vec2 u_center;


        uniform float u_openingScale;

        uniform float u_softness;

        uniform float u_edgeIrregularity;


        uniform float u_shapeStretchX;

        uniform float u_shapeStretchY;


        uniform float u_paperNoise;

        uniform float u_vignette;


        uniform vec3 u_yellowColor;

        uniform float u_yellowOpacity;



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



        float fbm(vec2 p) {

          float value =
            0.0;


          float amplitude =
            0.5;


          for (
            int i = 0;
            i < 5;
            i++
          ) {

            value +=
              valueNoise(p) *
              amplitude;


            p =
              p *
              2.03

              +

              vec2(
                17.1,
                9.2
              );


            amplitude *=
              0.5;
          }


          return value;
        }



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



        void main() {

          vec2 uv =
            v_uv;


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



          // ------------------------------------------------------
          // YELLOW PAPER PHASE
          // ------------------------------------------------------

          float yellowProgress =
            smoothstep(

              u_yellowStart,

              u_yellowEnd,

              u_progress
            );



          float paper =
            fbm(

              uv *
              8.0

              +

              vec2(
                3.2,
                7.7
              )
            );



          float finePaper =
            hash21(

              gl_FragCoord.xy *
              0.5
            );



          float paperVariation =

            (
              paper -
              0.5
            )

            *

            u_paperNoise

            +

            (
              finePaper -
              0.5
            )

            *

            u_paperNoise *
            0.35;



          vec3 yellowPaper =

            u_yellowColor

            +

            paperVariation;



          vec2 vignetteUV =
            uv -
            0.5;


          float vignette =
            dot(
              vignetteUV,
              vignetteUV
            );


          yellowPaper *=

            1.0

            -

            vignette *
            u_vignette;



          vec3 yellowMix =
            mix(

              fromColor.rgb,

              yellowPaper,

              yellowProgress *
              u_yellowOpacity
            );



          // ------------------------------------------------------
          // ORGANIC OPENING
          // ------------------------------------------------------

          float revealProgress =
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



          vec2 centered =
            uv -
            u_center;



          centered.x *=
            u_resolution.x /
            u_resolution.y;



          centered.x /=
            max(
              0.001,
              u_shapeStretchX
            );


          centered.y /=
            max(
              0.001,
              u_shapeStretchY
            );



          float radius =
            length(
              centered
            );



          float angle =
            atan(
              centered.y,
              centered.x
            );



          float organicNoise =

            (
              fbm(

                centered *
                5.2

                +

                vec2(
                  4.0,
                  2.0
                )
              )

              -

              0.5
            )

            *

            u_edgeIrregularity;



          organicNoise +=

            sin(
              angle *
              5.0
            )

            *

            u_edgeIrregularity *
            0.18;



          float maxRadius =
            1.15 *
            u_openingScale;



          float threshold =
            revealProgress *
            maxRadius;



          float reveal =

            1.0

            -

            smoothstep(

              threshold -
              u_softness,

              threshold +
              u_softness,

              radius +
              organicNoise
            );



          vec3 color =
            mix(

              yellowMix,

              toColor.rgb,

              reveal
            );



          // Perfect target at the end.
          float finish =
            smoothstep(

              0.965,

              1.0,

              revealProgress
            );


          color =
            mix(

              color,

              toColor.rgb,

              finish
            );



          gl_FragColor =
            vec4(
              color,
              1.0
            );
        }
      `;


      this.program =
        createProgram(
          gl,
          vertexSource,
          fragmentSource
        );


      gl.useProgram(
        this.program
      );


      this.buffer =
        gl.createBuffer();


      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        this.buffer
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


      this.position =
        gl.getAttribLocation(
          this.program,
          "a_position"
        );


      gl.enableVertexAttribArray(
        this.position
      );


      gl.vertexAttribPointer(
        this.position,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );


      const names = [

        "u_from",

        "u_to",

        "u_resolution",

        "u_fromSize",

        "u_toSize",

        "u_progress",

        "u_yellowStart",

        "u_yellowEnd",

        "u_revealStart",

        "u_revealEnd",

        "u_center",

        "u_openingScale",

        "u_softness",

        "u_edgeIrregularity",

        "u_shapeStretchX",

        "u_shapeStretchY",

        "u_paperNoise",

        "u_vignette",

        "u_yellowColor",

        "u_yellowOpacity"
      ];


      this.uniforms =
        {};


      names.forEach(
        name => {

          this.uniforms[name] =
            gl.getUniformLocation(
              this.program,
              name
            );
        }
      );
    }


    // ============================================================
    // TEXTURE
    // ============================================================

    createTexture(
      image,
      unit
    ) {
      const gl =
        this.gl;


      const texture =
        gl.createTexture();


      gl.activeTexture(
        unit
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        texture
      );


      gl.pixelStorei(
        gl.UNPACK_FLIP_Y_WEBGL,
        true
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


    // ============================================================
    // IMAGES
    // ============================================================

    setImages(
      fromImage,
      toImage
    ) {
      const gl =
        this.gl;


      this.fromImage =
        fromImage;


      this.toImage =
        toImage;


      if (
        this.fromTexture
      ) {
        gl.deleteTexture(
          this.fromTexture
        );
      }


      if (
        this.toTexture
      ) {
        gl.deleteTexture(
          this.toTexture
        );
      }


      this.fromTexture =
        this.createTexture(
          fromImage,
          gl.TEXTURE0
        );


      this.toTexture =
        this.createTexture(
          toImage,
          gl.TEXTURE1
        );


      this.ready =
        true;


      this.resize();

      this.render();
    }


    // ============================================================
    // PROGRESS
    // ============================================================

    set progress(value) {
      this._progress =
        clamp01(value);
    }


    get progress() {
      return this._progress;
    }


    // ============================================================
    // RESIZE
    // ============================================================

    resize() {
      const rect =
        this.canvas
          .getBoundingClientRect();


      const mobile =
        matchMedia(
          "(max-width: 767px)"
        ).matches;


      const dpr =
        mobile
          ? 1
          : Math.min(
              window.devicePixelRatio || 1,
              1.75
            );


      const width =
        Math.max(
          1,
          Math.round(
            (rect.width || innerWidth) *
            dpr
          )
        );


      const height =
        Math.max(
          1,
          Math.round(
            (rect.height || innerHeight) *
            dpr
          )
        );


      if (
        this.canvas.width !== width ||
        this.canvas.height !== height
      ) {
        this.canvas.width =
          width;

        this.canvas.height =
          height;
      }


      this.gl.viewport(
        0,
        0,
        width,
        height
      );
    }


    // ============================================================
    // RENDER
    // ============================================================

    render() {
      if (
        !this.ready ||
        !this.fromTexture ||
        !this.toTexture
      ) {
        return;
      }


      const gl =
        this.gl;


      this.resize();


      gl.useProgram(
        this.program
      );


      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        this.buffer
      );


      gl.enableVertexAttribArray(
        this.position
      );


      gl.vertexAttribPointer(
        this.position,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );


      gl.activeTexture(
        gl.TEXTURE0
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        this.fromTexture
      );


      gl.uniform1i(
        this.uniforms.u_from,
        0
      );


      gl.activeTexture(
        gl.TEXTURE1
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        this.toTexture
      );


      gl.uniform1i(
        this.uniforms.u_to,
        1
      );


      gl.uniform2f(
        this.uniforms.u_resolution,
        this.canvas.width,
        this.canvas.height
      );


      gl.uniform2f(
        this.uniforms.u_fromSize,

        this.fromImage.naturalWidth ||
          this.fromImage.width,

        this.fromImage.naturalHeight ||
          this.fromImage.height
      );


      gl.uniform2f(
        this.uniforms.u_toSize,

        this.toImage.naturalWidth ||
          this.toImage.width,

        this.toImage.naturalHeight ||
          this.toImage.height
      );


      gl.uniform1f(
        this.uniforms.u_progress,
        this._progress
      );


      gl.uniform1f(
        this.uniforms.u_yellowStart,
        this.settings.yellowStart
      );


      gl.uniform1f(
        this.uniforms.u_yellowEnd,
        this.settings.yellowEnd
      );


      gl.uniform1f(
        this.uniforms.u_revealStart,
        this.settings.revealStart
      );


      gl.uniform1f(
        this.uniforms.u_revealEnd,
        this.settings.revealEnd
      );


      gl.uniform2f(
        this.uniforms.u_center,
        this.settings.centerX,
        this.settings.centerY
      );


      gl.uniform1f(
        this.uniforms.u_openingScale,
        this.settings.openingScale
      );


      gl.uniform1f(
        this.uniforms.u_softness,
        this.settings.softness
      );


      gl.uniform1f(
        this.uniforms.u_edgeIrregularity,
        this.settings.edgeIrregularity
      );


      gl.uniform1f(
        this.uniforms.u_shapeStretchX,
        this.settings.shapeStretchX
      );


      gl.uniform1f(
        this.uniforms.u_shapeStretchY,
        this.settings.shapeStretchY
      );


      gl.uniform1f(
        this.uniforms.u_paperNoise,
        this.settings.paperNoise
      );


      gl.uniform1f(
        this.uniforms.u_vignette,
        this.settings.vignette
      );


      const yellow =
        hexToRgb01(
          this.settings.yellowColor
        );


      gl.uniform3f(
        this.uniforms.u_yellowColor,
        yellow[0],
        yellow[1],
        yellow[2]
      );


      gl.uniform1f(
        this.uniforms.u_yellowOpacity,
        this.settings.yellowOpacity
      );


      gl.drawArrays(
        gl.TRIANGLES,
        0,
        6
      );
    }
  }


  // ==============================================================
  // EXPORT
  // ==============================================================

  return {
    BlueNoiseDustTransition
  };

})();



/* ================================================================
   SECTION 3 CONTENT REVEAL ENGINE

   Keep this engine available for your existing
   SectionThreeContentReveal / Perlin integration.
================================================================ */

window.SectionThreeContentRevealEngine = (() => {
  "use strict";


  function clamp01(value) {
    return Math.max(
      0,
      Math.min(
        1,
        value
      )
    );
  }


  class SectionThreeContentReveal {

    constructor(
      canvas,
      options = {}
    ) {
      this.canvas =
        canvas;


      this.options =
        options;


      this.progress =
        0;
    }


    resize() {
      if (!this.canvas) {
        return;
      }


      const rect =
        this.canvas
          .getBoundingClientRect();


      const dpr =
        Math.min(
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
        this.canvas.width !== width ||
        this.canvas.height !== height
      ) {
        this.canvas.width =
          width;

        this.canvas.height =
          height;
      }
    }


    setProgress(value) {
      this.progress =
        clamp01(value);
    }
  }


  return {
    SectionThreeContentReveal
  };

})();
