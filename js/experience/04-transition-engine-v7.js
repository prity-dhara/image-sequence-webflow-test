window.TransitionEngine = (() => {
  const CONFIG = window.EXPERIENCE_CONFIG;

  /*
   * NOTE:
   * Keeping the original class name so 05-app-v11.js
   * does NOT need to change.
   *
   * OrganicRectangleReveal now uses the new:
   * CENTER IRREGULAR DUST REVEAL.
   */
  class OrganicRectangleReveal {
    constructor(canvas, settings = null) {
      this.canvas = canvas;
      this.progress = 0;
      this.ready = false;

      // New Center Reveal defaults.
      // Existing config may override any of these.
      this.settings = Object.assign(
        {
          revealStart: 0.0,
          revealEnd: 1.0,

          centerX: 0.5,
          centerY: 0.5,

          shapeScale: 4.8,
          shapeIrregularity: 0.24,
          vShapeAmount: 0.16,

          distortion: 0.035,
          dissolveSpread: 0.045,

          dustBandWidth: 0.12,
          dotScale: 2.2,
          edgeOpacity: 0.82,

          colorMix: 0.85,
          grain: 0.025
        },
        settings || CONFIG.transition || CONFIG.transitionOne || {}
      );

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
          "[CenterReveal] WebGL is unavailable."
        );
      }

      this.setup();
      this.resize();
    }


    // ============================================================
    // SHADER COMPILER
    // ============================================================

    createShader(type, source) {
      const shader = this.gl.createShader(type);

      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);

      if (
        !this.gl.getShaderParameter(
          shader,
          this.gl.COMPILE_STATUS
        )
      ) {
        throw new Error(
          this.gl.getShaderInfoLog(shader)
        );
      }

      return shader;
    }


    // ============================================================
    // SETUP
    // ============================================================

    setup() {
      const gl = this.gl;


      // ----------------------------------------------------------
      // VERTEX SHADER
      // ----------------------------------------------------------

      const vertex = `
        attribute vec2 aPosition;
        attribute vec2 aUv;

        varying vec2 vUv;

        void main() {
          vUv = aUv;

          gl_Position = vec4(
            aPosition,
            0.0,
            1.0
          );
        }
      `;


      // ----------------------------------------------------------
      // FRAGMENT SHADER
      // ----------------------------------------------------------

      const fragment = `
        precision highp float;

        varying vec2 vUv;


        uniform sampler2D uFrom;
        uniform sampler2D uTo;


        uniform vec2 uResolution;

        uniform vec2 uFromSize;
        uniform vec2 uToSize;

        uniform vec2 uCenter;


        uniform float uProgress;

        uniform float uRevealStart;
        uniform float uRevealEnd;

        uniform float uShapeScale;
        uniform float uShapeIrregularity;

        uniform float uVShapeAmount;

        uniform float uDistortion;

        uniform float uDissolveSpread;

        uniform float uDustBandWidth;

        uniform float uDotScale;

        uniform float uEdgeOpacity;

        uniform float uColorMix;

        uniform float uGrain;



        // ========================================================
        // HASH
        // ========================================================

        float hash21(vec2 p) {

          p = fract(
            p *
            vec2(
              123.34,
              456.21
            )
          );

          p += dot(
            p,
            p + 45.32
          );

          return fract(
            p.x * p.y
          );
        }



        // ========================================================
        // VALUE NOISE
        // ========================================================

        float valueNoise(vec2 p) {

          vec2 i = floor(p);
          vec2 f = fract(p);


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

          float value = 0.0;

          float amplitude = 0.5;


          for (
            int i = 0;
            i < 5;
            i++
          ) {

            value +=
              valueNoise(p) *
              amplitude;


            p =
              p * 2.03 +
              vec2(
                13.7,
                7.3
              );


            amplitude *= 0.5;
          }


          return value;
        }



        // ========================================================
        // COVER UV
        // ========================================================

        vec2 coverUv(
          vec2 uv,
          vec2 imageSize,
          vec2 canvasSize
        ) {

          float imageRatio =
            imageSize.x /
            imageSize.y;


          float canvasRatio =
            canvasSize.x /
            canvasSize.y;


          vec2 scale =
            vec2(1.0);


          vec2 offset =
            vec2(0.0);


          if (
            imageRatio >
            canvasRatio
          ) {

            scale.x =
              canvasRatio /
              imageRatio;


            offset.x =
              (
                1.0 -
                scale.x
              ) *
              0.5;

          } else {

            scale.y =
              imageRatio /
              canvasRatio;


            offset.y =
              (
                1.0 -
                scale.y
              ) *
              0.5;
          }


          return
            uv * scale +
            offset;
        }



        // ========================================================
        // DUST COLOR PALETTE
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
              1.0,
              1.0,
              1.0
            );


          vec3 d =
            vec3(
              0.0,
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
            vUv;



          // ------------------------------------------------------
          // LOCAL PROGRESS
          // ------------------------------------------------------

          float localProgress =
            clamp(

              (
                uProgress -
                uRevealStart
              )

              /

              max(
                0.0001,
                uRevealEnd -
                uRevealStart
              ),

              0.0,

              1.0
            );



          // ------------------------------------------------------
          // CENTER SPACE
          // ------------------------------------------------------

          vec2 centered =
            uv -
            uCenter;


          centered.x *=
            uResolution.x /
            uResolution.y;



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
          // V-SHAPE
          // ------------------------------------------------------

          float vShape =

            abs(
              centered.x
            )

            *

            uVShapeAmount

            *

            (
              0.6 +

              0.4 *

              sin(
                angle *
                3.0
              )
            );



          // ------------------------------------------------------
          // ORGANIC SHAPE NOISE
          // ------------------------------------------------------

          float edgeNoise =

            (
              fbm(
                centered *
                uShapeScale +
                2.0
              )

              -

              0.5
            )

            *

            uShapeIrregularity;



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

            uDistortion;



          // ------------------------------------------------------
          // FINAL SHAPE FIELD
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
          // REVEAL EXPANSION
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
              uDissolveSpread,

              threshold +
              uDissolveSpread,

              shapeDistance
            );



          // ------------------------------------------------------
          // TEXTURES
          // ------------------------------------------------------

          vec4 fromColor =
            texture2D(

              uFrom,

              coverUv(
                uv,
                uFromSize,
                uResolution
              )
            );



          vec4 toColor =
            texture2D(

              uTo,

              coverUv(
                uv,
                uToSize,
                uResolution
              )
            );



          // ------------------------------------------------------
          // MAIN TRANSITION
          // ------------------------------------------------------

          vec3 color =
            mix(

              fromColor.rgb,

              toColor.rgb,

              dissolve
            );



          // ======================================================
          // DUST EDGE
          // ======================================================

          float boundary =
            abs(
              shapeDistance -
              threshold
            );



          float dustBand =

            1.0

            -

            smoothstep(

              0.0,

              uDustBandWidth,

              boundary
            );



          // ------------------------------------------------------
          // STATIC PIXEL GRID
          // ------------------------------------------------------

          vec2 grid =
            floor(

              gl_FragCoord.xy

              /

              max(
                1.0,
                uDotScale
              )
            );



          float blueNoise =
            hash21(

              grid +

              vec2(
                17.0,
                93.0
              )
            );



          // ------------------------------------------------------
          // DUST PARTICLES
          // ------------------------------------------------------

          float dots =

            step(

              0.26 +

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
          // COLORED DUST
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

              uColorMix
            );



          // ======================================================
          // CLEAN START / CLEAN END
          // ======================================================

          /*
           * At progress 0:
           * show ONLY the original from image.
           */

          float startVisibility =
            smoothstep(

              0.015,

              0.06,

              localProgress
            );



          /*
           * Near progress 1:
           * completely remove dust.
           */

          float endVisibility =

            1.0

            -

            smoothstep(

              0.94,

              1.0,

              localProgress
            );



          dots *=
            startVisibility *
            endVisibility;



          // ------------------------------------------------------
          // APPLY DUST
          // ------------------------------------------------------

          color =
            mix(

              color,

              dustColor,

              dots *
              uEdgeOpacity
            );



          // ------------------------------------------------------
          // ABSOLUTELY CLEAN FIRST FRAME
          // ------------------------------------------------------

          color =
            mix(

              fromColor.rgb,

              color,

              startVisibility
            );



          // ------------------------------------------------------
          // FORCE CLEAN FINAL FRAME
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



          // ======================================================
          // FILM GRAIN
          // ======================================================

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

            uGrain

            *

            startVisibility

            *

            endVisibility;



          color += grain;



          gl_FragColor =
            vec4(
              color,
              1.0
            );
        }
      `;



      // ============================================================
      // CREATE PROGRAM
      // ============================================================

      const program =
        gl.createProgram();


      gl.attachShader(
        program,
        this.createShader(
          gl.VERTEX_SHADER,
          vertex
        )
      );


      gl.attachShader(
        program,
        this.createShader(
          gl.FRAGMENT_SHADER,
          fragment
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



      this.program =
        program;



      // ============================================================
      // UNIFORMS / ATTRIBUTES
      // ============================================================

      const uniform = name =>
        gl.getUniformLocation(
          program,
          name
        );


      this.locations = {

        position:
          gl.getAttribLocation(
            program,
            "aPosition"
          ),

        uv:
          gl.getAttribLocation(
            program,
            "aUv"
          ),


        from:
          uniform(
            "uFrom"
          ),

        to:
          uniform(
            "uTo"
          ),


        resolution:
          uniform(
            "uResolution"
          ),

        fromSize:
          uniform(
            "uFromSize"
          ),

        toSize:
          uniform(
            "uToSize"
          ),


        center:
          uniform(
            "uCenter"
          ),


        progress:
          uniform(
            "uProgress"
          ),

        revealStart:
          uniform(
            "uRevealStart"
          ),

        revealEnd:
          uniform(
            "uRevealEnd"
          ),


        shapeScale:
          uniform(
            "uShapeScale"
          ),

        shapeIrregularity:
          uniform(
            "uShapeIrregularity"
          ),

        vShapeAmount:
          uniform(
            "uVShapeAmount"
          ),


        distortion:
          uniform(
            "uDistortion"
          ),

        dissolveSpread:
          uniform(
            "uDissolveSpread"
          ),


        dustBandWidth:
          uniform(
            "uDustBandWidth"
          ),

        dotScale:
          uniform(
            "uDotScale"
          ),


        edgeOpacity:
          uniform(
            "uEdgeOpacity"
          ),

        colorMix:
          uniform(
            "uColorMix"
          ),

        grain:
          uniform(
            "uGrain"
          )
      };



      // ============================================================
      // FULLSCREEN QUAD
      // ============================================================

      this.buffer =
        gl.createBuffer();


      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        this.buffer
      );


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



    // ============================================================
    // CREATE TEXTURE
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


      /*
       * Keep false because our fullscreen quad's UV
       * already uses the correct WebGL orientation.
       */
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



    // ============================================================
    // SET IMAGES
    // ============================================================

    setImages(
      fromImage,
      toImage
    ) {

      this.fromImage =
        fromImage;


      this.toImage =
        toImage;



      if (
        this.fromTexture
      ) {

        this.gl.deleteTexture(
          this.fromTexture
        );
      }



      if (
        this.toTexture
      ) {

        this.gl.deleteTexture(
          this.toTexture
        );
      }



      this.fromTexture =
        this.createTexture(
          fromImage,
          this.gl.TEXTURE0
        );


      this.toTexture =
        this.createTexture(
          toImage,
          this.gl.TEXTURE1
        );



      this.ready =
        true;


      this.render();
    }



    // ============================================================
    // RESIZE
    // ============================================================

    resize() {

      const rect =
        this.canvas.getBoundingClientRect();


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



      const mobileDPR =
        CONFIG?.performance?.mobileDPR ??
        1;


      const desktopDPR =
        CONFIG?.performance?.desktopDPR ??
        1.5;



      const dpr =
        mobile

          ? mobileDPR

          : Math.min(
              devicePixelRatio || 1,
              desktopDPR
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



      this.render();
    }



    // ============================================================
    // RENDER
    // ============================================================

    render() {

      if (
        !this.ready
      ) {
        return;
      }



      const gl =
        this.gl;


      const L =
        this.locations;


      const s =
        this.settings;



      // ----------------------------------------------------------
      // VIEWPORT
      // ----------------------------------------------------------

      gl.viewport(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );


      gl.useProgram(
        this.program
      );


      // ----------------------------------------------------------
      // BUFFER
      // ----------------------------------------------------------

      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        this.buffer
      );



      gl.enableVertexAttribArray(
        L.position
      );


      gl.vertexAttribPointer(
        L.position,
        2,
        gl.FLOAT,
        false,
        16,
        0
      );



      gl.enableVertexAttribArray(
        L.uv
      );


      gl.vertexAttribPointer(
        L.uv,
        2,
        gl.FLOAT,
        false,
        16,
        8
      );



      // ----------------------------------------------------------
      // FROM TEXTURE
      // ----------------------------------------------------------

      gl.activeTexture(
        gl.TEXTURE0
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        this.fromTexture
      );


      gl.uniform1i(
        L.from,
        0
      );



      // ----------------------------------------------------------
      // TO TEXTURE
      // ----------------------------------------------------------

      gl.activeTexture(
        gl.TEXTURE1
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        this.toTexture
      );


      gl.uniform1i(
        L.to,
        1
      );



      // ----------------------------------------------------------
      // RESOLUTION
      // ----------------------------------------------------------

      gl.uniform2f(
        L.resolution,

        this.canvas.width,

        this.canvas.height
      );



      // ----------------------------------------------------------
      // IMAGE SIZE
      // ----------------------------------------------------------

      gl.uniform2f(
        L.fromSize,

        this.fromImage.naturalWidth ||
          this.fromImage.width,

        this.fromImage.naturalHeight ||
          this.fromImage.height
      );



      gl.uniform2f(
        L.toSize,

        this.toImage.naturalWidth ||
          this.toImage.width,

        this.toImage.naturalHeight ||
          this.toImage.height
      );



      // ----------------------------------------------------------
      // CENTER
      // ----------------------------------------------------------

      gl.uniform2f(
        L.center,

        s.centerX,

        s.centerY
      );



      // ----------------------------------------------------------
      // PROGRESS
      // ----------------------------------------------------------

      gl.uniform1f(
        L.progress,

        Math.max(
          0,
          Math.min(
            1,
            this.progress
          )
        )
      );



      // ----------------------------------------------------------
      // SETTINGS
      // ----------------------------------------------------------

      gl.uniform1f(
        L.revealStart,
        s.revealStart
      );


      gl.uniform1f(
        L.revealEnd,
        s.revealEnd
      );


      gl.uniform1f(
        L.shapeScale,
        s.shapeScale
      );


      gl.uniform1f(
        L.shapeIrregularity,
        s.shapeIrregularity
      );


      gl.uniform1f(
        L.vShapeAmount,
        s.vShapeAmount
      );


      gl.uniform1f(
        L.distortion,
        s.distortion
      );


      gl.uniform1f(
        L.dissolveSpread,
        s.dissolveSpread
      );


      gl.uniform1f(
        L.dustBandWidth,
        s.dustBandWidth
      );


      gl.uniform1f(
        L.dotScale,
        s.dotScale
      );


      gl.uniform1f(
        L.edgeOpacity,
        s.edgeOpacity
      );


      gl.uniform1f(
        L.colorMix,
        s.colorMix
      );


      gl.uniform1f(
        L.grain,
        s.grain
      );



      // ----------------------------------------------------------
      // DRAW
      // ----------------------------------------------------------

      gl.drawArrays(
        gl.TRIANGLES,
        0,
        6
      );
    }
  }



  // Keep same export name for the existing app.
  return {
    OrganicRectangleReveal
  };
})();
