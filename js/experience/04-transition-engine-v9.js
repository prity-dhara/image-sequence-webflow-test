window.TransitionEngine = (() => {
  const CONFIG = window.EXPERIENCE_CONFIG;

  class OrganicRectangleReveal {
    constructor(canvas, settings = null) {
      this.settings = settings || CONFIG.transition || CONFIG.transitionOne;
      this.canvas = canvas;
      this.progress = 0;
      this.ready = false;

      this.gl = canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        powerPreference: "high-performance"
      }) || canvas.getContext("webgl");

      if (!this.gl) throw new Error("WebGL is unavailable.");

      this.setup();
      this.resize();
    }

    createShader(type, source) {
      const shader = this.gl.createShader(type);

      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);

      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        throw new Error(this.gl.getShaderInfoLog(shader));
      }

      return shader;
    }

    setup() {
      const gl = this.gl;

      const vertex = `
        attribute vec2 aPosition;
        attribute vec2 aUv;

        varying vec2 vUv;

        void main() {
          vUv = aUv;
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `;

      const fragment = `
        precision highp float;

        uniform sampler2D uFrom;
        uniform sampler2D uTo;

        uniform vec2 uResolution;
        uniform vec2 uFromSize;
        uniform vec2 uToSize;

        uniform float uProgress;
        uniform float uStartSize;
        uniform float uRadius;
        uniform float uSoftness;
        uniform float uNoiseScale;
        uniform float uNoiseAmount;
        uniform float uEdgeBand;
        uniform float uDistortion;
        uniform float uGrain;
        uniform float uCenterX;
        uniform float uCenterY;

        varying vec2 vUv;


        float hash(vec2 p) {
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
            p.x *
            p.y
          );
        }


        float blueNoise(vec2 p) {
          return fract(
            52.9829189 *
            fract(
              dot(
                p,
                vec2(
                  0.06711056,
                  0.00583715
                )
              )
            )
          );
        }


        vec2 coverUvCenter(
          vec2 uv,
          vec2 imageSize,
          vec2 canvasSize
        ) {
          float ir =
            imageSize.x /
            imageSize.y;

          float cr =
            canvasSize.x /
            canvasSize.y;

          vec2 s =
            vec2(1.0);

          vec2 o =
            vec2(0.0);


          if (ir > cr) {
            s.x =
              cr /
              ir;

            o.x =
              (
                1.0 -
                s.x
              ) *
              0.5;

          } else {
            s.y =
              ir /
              cr;

            o.y =
              (
                1.0 -
                s.y
              ) *
              0.5;
          }


          return
            uv *
            s +
            o;
        }


        vec2 coverUvTop(
          vec2 uv,
          vec2 imageSize,
          vec2 canvasSize
        ) {
          float ir =
            imageSize.x /
            imageSize.y;

          float cr =
            canvasSize.x /
            canvasSize.y;

          vec2 s =
            vec2(1.0);

          vec2 o =
            vec2(0.0);


          if (ir > cr) {
            s.x =
              cr /
              ir;

            o.x =
              (
                1.0 -
                s.x
              ) *
              0.5;

          } else {
            s.y =
              ir /
              cr;

            o.y =
              0.0;
          }


          return
            uv *
            s +
            o;
        }


        float roundedBoxSdf(
          vec2 p,
          vec2 b,
          float r
        ) {
          vec2 q =
            abs(p) -
            b +
            r;

          return
            min(
              max(
                q.x,
                q.y
              ),
              0.0
            )
            +
            length(
              max(
                q,
                0.0
              )
            )
            -
            r;
        }


        void main() {
          vec2 uv =
            vUv;


          vec2 center =
            vec2(
              uCenterX,
              uCenterY
            );


          vec2 aspect =
            vec2(
              uResolution.x /
              uResolution.y,
              1.0
            );


          vec2 p =
            (
              uv -
              center
            )
            *
            aspect;


          float maxHalfWidth =
            0.5 *
            aspect.x;


          float maxHalfHeight =
            0.5;


          float startHalf =
            uStartSize;


          vec2 halfSize =
            mix(
              vec2(
                startHalf
              ),
              vec2(
                maxHalfWidth,
                maxHalfHeight
              ),
              uProgress
            );


          float pixelNoise =
            blueNoise(
              floor(
                gl_FragCoord.xy *
                max(
                  0.1,
                  uNoiseScale /
                  700.0
                )
              )
            );


          float clustered =
            0.65 *
            pixelNoise
            +
            0.35 *
            blueNoise(
              floor(
                gl_FragCoord.xy *
                0.17
              )
            );


          float signedNoise =
            (
              clustered -
              0.5
            )
            *
            uNoiseAmount;


          float distance =
            roundedBoxSdf(
              p,
              halfSize,
              uRadius
            )
            +
            signedNoise;


          float reveal =
            1.0
            -
            smoothstep(
              -uSoftness,
              uSoftness,
              distance
            );


          vec2 warp =
            vec2(
              (
                pixelNoise -
                0.5
              )
              *
              uDistortion
            );


          vec3 fromColor =
            texture2D(
              uFrom,

              coverUvCenter(
                uv -
                warp,
                uFromSize,
                uResolution
              )
            ).rgb;


          vec3 toColor =
            texture2D(
              uTo,

              coverUvTop(
                uv +
                warp,
                uToSize,
                uResolution
              )
            ).rgb;


          vec3 color =
            mix(
              fromColor,
              toColor,
              reveal
            );


          float edge =
            1.0
            -
            smoothstep(
              0.0,
              uEdgeBand,
              abs(
                distance
              )
            );


          float binaryDots =
            step(
              0.42,
              clustered
            )
            *
            edge;


          color =
            mix(
              color,
              toColor,
              binaryDots
            );


          color +=
            (
              hash(
                gl_FragCoord.xy
              )
              -
              0.5
            )
            *
            uGrain;


          gl_FragColor =
            vec4(
              color,
              1.0
            );
        }
      `;


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


      this.locations =
        {};


      [
        "aPosition",
        "aUv",
        "uFrom",
        "uTo",
        "uResolution",
        "uFromSize",
        "uToSize",
        "uProgress",
        "uStartSize",
        "uRadius",
        "uSoftness",
        "uNoiseScale",
        "uNoiseAmount",
        "uEdgeBand",
        "uDistortion",
        "uGrain",
        "uCenterX",
        "uCenterY"
      ].forEach(name => {

        this.locations[name] =
          name.startsWith("a")
            ? gl.getAttribLocation(
                program,
                name
              )
            : gl.getUniformLocation(
                program,
                name
              );
      });


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


      const dpr =
        mobile
          ? CONFIG.performance.mobileDPR
          : Math.min(
              devicePixelRatio || 1,
              CONFIG.performance.desktopDPR
            );


      this.canvas.width =
        Math.max(
          1,
          Math.round(
            rect.width *
            dpr
          )
        );


      this.canvas.height =
        Math.max(
          1,
          Math.round(
            rect.height *
            dpr
          )
        );


      this.render();
    }


    render() {
      if (
        !this.ready
      ) {
        return;
      }


      const gl =
        this.gl;


      const s =
        this.settings;


      const L =
        this.locations;


      gl.viewport(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );


      gl.useProgram(
        this.program
      );


      gl.bindBuffer(
        gl.ARRAY_BUFFER,
        this.buffer
      );


      gl.enableVertexAttribArray(
        L.aPosition
      );


      gl.vertexAttribPointer(
        L.aPosition,
        2,
        gl.FLOAT,
        false,
        16,
        0
      );


      gl.enableVertexAttribArray(
        L.aUv
      );


      gl.vertexAttribPointer(
        L.aUv,
        2,
        gl.FLOAT,
        false,
        16,
        8
      );


      gl.activeTexture(
        gl.TEXTURE0
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        this.fromTexture
      );


      gl.uniform1i(
        L.uFrom,
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
        L.uTo,
        1
      );


      gl.uniform2f(
        L.uResolution,
        this.canvas.width,
        this.canvas.height
      );


      gl.uniform2f(
        L.uFromSize,
        this.fromImage.naturalWidth,
        this.fromImage.naturalHeight
      );


      gl.uniform2f(
        L.uToSize,
        this.toImage.naturalWidth,
        this.toImage.naturalHeight
      );


      gl.uniform1f(
        L.uProgress,
        this.progress
      );


      gl.uniform1f(
        L.uStartSize,
        s.startSize
      );


      gl.uniform1f(
        L.uRadius,
        s.cornerRadius
      );


      gl.uniform1f(
        L.uSoftness,
        s.edgeSoftness
      );


      gl.uniform1f(
        L.uNoiseScale,
        s.noiseScale
      );


      gl.uniform1f(
        L.uNoiseAmount,
        s.noiseAmount
      );


      gl.uniform1f(
        L.uEdgeBand,
        s.edgeBand
      );


      gl.uniform1f(
        L.uDistortion,
        s.distortion
      );


      gl.uniform1f(
        L.uGrain,
        s.grain
      );


      gl.uniform1f(
        L.uCenterX,
        s.centerX
      );


      gl.uniform1f(
        L.uCenterY,
        s.centerY
      );


      gl.drawArrays(
        gl.TRIANGLES,
        0,
        6
      );
    }
  }


  return {
    OrganicRectangleReveal
  };
})();




// ============================================================================
// TRANSITION 2
// YELLOW ORGANIC REVEAL
//
// Old BlueNoise names are intentionally kept so app.js stays compatible.
// ============================================================================

window.BlueNoiseTransitionEngine = (() => {
  "use strict";


  class BlueNoiseDustTransition {
    constructor(
      canvas,
      settings = {}
    ) {
      this.canvas =
        canvas;


      this.progress =
        0;


      this.ready =
        false;


      this.settings =
        Object.assign(
          {
            yellowStart: 0.00,

            yellowEnd: 0.28,

            revealStart: 0.18,

            revealEnd: 1.00,

            centerX: 0.56,

            centerY: 0.48,

            openingScale: 1.10,

            softness: 0.095,

            edgeIrregularity: 0.12,

            shapeStretchX: 1.18,

            shapeStretchY: 0.88,

            paperNoise: 0.035,

            vignette: 0.18,

            yellowColor: "#efe7d1",

            yellowOpacity: 0.72
          },

          settings
        );


      this.gl =
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


      if (
        !this.gl
      ) {
        throw new Error(
          "[YellowReveal] WebGL is unavailable."
        );
      }


      this.setup();

      this.resize();
    }


    shader(
      type,
      source
    ) {
      const shader =
        this.gl.createShader(
          type
        );


      this.gl.shaderSource(
        shader,
        source
      );


      this.gl.compileShader(
        shader
      );


      if (
        !this.gl.getShaderParameter(
          shader,
          this.gl.COMPILE_STATUS
        )
      ) {
        throw new Error(
          this.gl.getShaderInfoLog(
            shader
          )
        );
      }


      return shader;
    }


    hexToRgb01(hex) {
      const clean =
        String(
          hex ||
          "#efe7d1"
        ).replace(
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
          0.937,
          0.906,
          0.820
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


    setup() {
      const gl =
        this.gl;


      const vertex = `
        attribute vec2 aPosition;
        attribute vec2 aUv;

        varying vec2 vUv;

        void main() {
          vUv = aUv;

          gl_Position =
            vec4(
              aPosition,
              0.0,
              1.0
            );
        }
      `;


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


        uniform float uYellowStart;

        uniform float uYellowEnd;


        uniform float uRevealStart;

        uniform float uRevealEnd;


        uniform float uOpeningScale;

        uniform float uSoftness;

        uniform float uEdgeIrregularity;


        uniform float uShapeStretchX;

        uniform float uShapeStretchY;


        uniform float uPaperNoise;

        uniform float uVignette;


        uniform vec3 uYellowColor;

        uniform float uYellowOpacity;



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
              valueNoise(p)
              *
              amp;


            p =
              p *
              2.03
              +
              vec2(
                11.7,
                5.9
              );


            amp *=
              0.5;
          }


          return
            value;
        }



        vec2 coverUv(
          vec2 uv,
          vec2 imageSize,
          vec2 canvasSize
        ) {

          float screenRatio =
            canvasSize.x /
            canvasSize.y;


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
            vUv;



          // ======================================================
          // YELLOW PHASE
          // ======================================================

          float yellowProgress =
            clamp(

              (
                uProgress -
                uYellowStart
              )

              /

              max(
                0.0001,

                uYellowEnd -
                uYellowStart
              ),

              0.0,

              1.0
            );



          // ======================================================
          // REVEAL PHASE
          // ======================================================

          float revealProgress =
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



          // ======================================================
          // WASH CURRENT IMAGE YELLOW
          // ======================================================

          vec3 yellowMixed =
            mix(

              fromColor.rgb,

              uYellowColor,

              yellowProgress *
              uYellowOpacity
            );



          // ======================================================
          // ORGANIC OPENING POSITION
          // ======================================================

          vec2 p =
            uv -
            uCenter;


          p.x *=
            uResolution.x /
            uResolution.y;


          p.x /=
            max(
              0.001,
              uShapeStretchX
            );


          p.y /=
            max(
              0.001,
              uShapeStretchY
            );



          float radius =
            length(p);



          // ======================================================
          // IRREGULAR EDGE
          // ======================================================

          float edgeNoise =
            (
              fbm(
                p *
                6.0
                +
                2.0
              )

              -

              0.5
            )

            *

            uEdgeIrregularity;



          float directionalWarp =
            sin(

              atan(
                p.y,
                p.x
              )

              *

              3.0

              +

              fbm(
                p *
                4.0
              )

              *

              2.5
            )

            *

            uEdgeIrregularity

            *

            0.38;



          float organicDistance =
            radius

            +

            edgeNoise

            +

            directionalWarp;



          float threshold =
            revealProgress

            *

            uOpeningScale;



          float revealMask =
            1.0

            -

            smoothstep(

              threshold -
              uSoftness,

              threshold +
              uSoftness,

              organicDistance
            );



          // ======================================================
          // MAIN IMAGE MIX
          // ======================================================

          vec3 color =
            mix(

              yellowMixed,

              toColor.rgb,

              revealMask
            );



          // ======================================================
          // YELLOW EDGE HAZE
          // ======================================================

          float edgeDistance =
            abs(
              organicDistance -
              threshold
            );



          float edgeGlow =
            1.0

            -

            smoothstep(

              0.0,

              uSoftness *
              2.3,

              edgeDistance
            );



          float revealVisibility =
            smoothstep(

              0.015,

              0.07,

              revealProgress
            );



          edgeGlow *=
            revealVisibility;



          color =
            mix(

              color,

              uYellowColor,

              edgeGlow *
              0.16
            );



          // ======================================================
          // PAPER GRAIN
          // ======================================================

          float grain =
            (
              hash21(

                gl_FragCoord.xy

                +

                uProgress *
                127.0
              )

              -

              0.5
            )

            *

            uPaperNoise;



          color +=
            grain;



          // ======================================================
          // VIGNETTE
          // ======================================================

          float vignette =
            smoothstep(

              0.95,

              0.28,

              distance(
                uv,
                vec2(0.5)
              )
            );



          color *=
            mix(

              1.0 -
              uVignette,

              1.0,

              vignette
            );



          // ======================================================
          // CLEAN START
          // ======================================================

          float startVisibility =
            smoothstep(

              0.005,

              0.04,

              uProgress
            );



          color =
            mix(

              fromColor.rgb,

              color,

              startVisibility
            );



          // ======================================================
          // CLEAN END
          // ======================================================

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


      const program =
        gl.createProgram();


      gl.attachShader(
        program,

        this.shader(
          gl.VERTEX_SHADER,
          vertex
        )
      );


      gl.attachShader(
        program,

        this.shader(
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


      const uniform =
        name =>
          gl.getUniformLocation(
            program,
            name
          );


      this.program =
        program;


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


        yellowStart:
          uniform(
            "uYellowStart"
          ),


        yellowEnd:
          uniform(
            "uYellowEnd"
          ),


        revealStart:
          uniform(
            "uRevealStart"
          ),


        revealEnd:
          uniform(
            "uRevealEnd"
          ),


        openingScale:
          uniform(
            "uOpeningScale"
          ),


        softness:
          uniform(
            "uSoftness"
          ),


        edgeIrregularity:
          uniform(
            "uEdgeIrregularity"
          ),


        shapeStretchX:
          uniform(
            "uShapeStretchX"
          ),


        shapeStretchY:
          uniform(
            "uShapeStretchY"
          ),


        paperNoise:
          uniform(
            "uPaperNoise"
          ),


        vignette:
          uniform(
            "uVignette"
          ),


        yellowColor:
          uniform(
            "uYellowColor"
          ),


        yellowOpacity:
          uniform(
            "uYellowOpacity"
          )
      };


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


      const dpr =
        mobile

          ? 1

          : Math.min(
              devicePixelRatio || 1,
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


      this.render();
    }



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


      gl.viewport(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );


      gl.useProgram(
        this.program
      );


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


      gl.uniform2f(
        L.resolution,
        this.canvas.width,
        this.canvas.height
      );


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


      gl.uniform2f(
        L.center,
        s.centerX,
        s.centerY
      );


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


      gl.uniform1f(
        L.yellowStart,
        s.yellowStart
      );


      gl.uniform1f(
        L.yellowEnd,
        s.yellowEnd
      );


      gl.uniform1f(
        L.revealStart,
        s.revealStart
      );


      gl.uniform1f(
        L.revealEnd,
        s.revealEnd
      );


      gl.uniform1f(
        L.openingScale,
        s.openingScale
      );


      gl.uniform1f(
        L.softness,
        s.softness
      );


      gl.uniform1f(
        L.edgeIrregularity,
        s.edgeIrregularity
      );


      gl.uniform1f(
        L.shapeStretchX,
        s.shapeStretchX
      );


      gl.uniform1f(
        L.shapeStretchY,
        s.shapeStretchY
      );


      gl.uniform1f(
        L.paperNoise,
        s.paperNoise
      );


      gl.uniform1f(
        L.vignette,
        s.vignette
      );


      const yellow =
        this.hexToRgb01(
          s.yellowColor
        );


      gl.uniform3f(
        L.yellowColor,

        yellow[0],

        yellow[1],

        yellow[2]
      );


      gl.uniform1f(
        L.yellowOpacity,
        s.yellowOpacity
      );


      gl.drawArrays(
        gl.TRIANGLES,
        0,
        6
      );
    }
  }


  return {
    BlueNoiseDustTransition
  };
})();




// ============================================================================
// SECTION 3 CONTENT DUST REVEAL
// UNCHANGED
// ============================================================================

window.SectionThreeContentRevealEngine = (() => {
  "use strict";


  class ContentDustReveal {
    constructor(
      canvas,
      settings = {}
    ) {
      this.canvas =
        canvas;


      this.progress =
        0;


      this.ready =
        false;


      this.settings =
        Object.assign(
          {
            softness: 0.035,

            noiseScale: 7.2,

            noiseAmount: 0.18,

            dotScale: 2.2,

            grain: 0.024,

            edgeWidth: 0.16,

            edgeOpacity: 0.75,

            edgeColor: [
              0.91,
              0.87,
              0.78
            ]
          },

          settings
        );


      this.gl =
        canvas.getContext(
          "webgl2",
          {
            alpha: true,

            antialias: false,

            depth: false,

            stencil: false,

            premultipliedAlpha: true,

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

            premultipliedAlpha: true,

            powerPreference:
              "high-performance"
          }
        );


      if (
        !this.gl
      ) {
        throw new Error(
          "[section-3-content] WebGL unavailable."
        );
      }


      this.setup();

      this.resize();
    }



    shader(
      type,
      source
    ) {
      const shader =
        this.gl.createShader(
          type
        );


      this.gl.shaderSource(
        shader,
        source
      );


      this.gl.compileShader(
        shader
      );


      if (
        !this.gl.getShaderParameter(
          shader,
          this.gl.COMPILE_STATUS
        )
      ) {
        throw new Error(
          this.gl.getShaderInfoLog(
            shader
          )
        );
      }


      return shader;
    }



    setup() {
      const gl =
        this.gl;


      const vertex = `
        attribute vec2 aPosition;
        attribute vec2 aUv;

        varying vec2 vUv;

        void main() {
          vUv = aUv;

          gl_Position =
            vec4(
              aPosition,
              0.0,
              1.0
            );
        }
      `;


      const fragment = `
        precision highp float;


        uniform sampler2D uImage;

        uniform vec2 uResolution;

        uniform vec2 uImageSize;


        uniform float uProgress;

        uniform float uSoftness;

        uniform float uNoiseScale;

        uniform float uNoiseAmount;

        uniform float uDotScale;

        uniform float uGrain;

        uniform float uEdgeWidth;

        uniform float uEdgeOpacity;

        uniform vec3 uEdgeColor;


        varying vec2 vUv;



        float hash12(vec2 p) {

          vec3 p3 =
            fract(
              vec3(
                p.xyx
              )
              *
              0.1031
            );


          p3 +=
            dot(
              p3,

              p3.yzx +
              33.33
            );


          return
            fract(
              (
                p3.x +
                p3.y
              )
              *
              p3.z
            );
        }



        float blueNoise(
          vec2 pixel,
          float scale,
          vec2 offset
        ) {

          vec2 cell =
            floor(

              pixel /

              max(
                0.25,
                scale
              )

              +

              offset
            );


          float a =
            hash12(
              cell
            );


          float b =
            hash12(

              cell *
              0.754877666

              +

              19.19
            );


          return
            fract(
              a +
              b *
              0.61803398875
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
            hash12(i);


          float b =
            hash12(
              i +
              vec2(
                1.0,
                0.0
              )
            );


          float c =
            hash12(
              i +
              vec2(
                0.0,
                1.0
              )
            );


          float d =
            hash12(
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
              valueNoise(p)
              *
              amplitude;


            p =
              p *
              2.03
              +
              vec2(
                11.7,
                7.3
              );


            amplitude *=
              0.5;
          }


          return value;
        }



        vec2 containUv(
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

            scale.y =
              canvasRatio /
              imageRatio;


            offset.y =
              (
                1.0 -
                scale.y
              )
              *
              0.5;

          } else {

            scale.x =
              imageRatio /
              canvasRatio;


            offset.x =
              (
                1.0 -
                scale.x
              )
              *
              0.5;
          }


          return
            (
              uv -
              offset
            )
            /
            scale;
        }



        void main() {

          vec2 pixel =
            gl_FragCoord.xy;


          vec2 imageUv =
            containUv(
              vUv,
              uImageSize,
              uResolution
            );


          if (
            imageUv.x < 0.0

            ||

            imageUv.x > 1.0

            ||

            imageUv.y < 0.0

            ||

            imageUv.y > 1.0
          ) {

            gl_FragColor =
              vec4(0.0);

            return;
          }



          vec4 source =
            texture2D(
              uImage,
              imageUv
            );



          vec2 texel =
            1.0 /
            uImageSize;



          vec4 blurred =
            vec4(0.0);



          blurred +=
            texture2D(
              uImage,

              imageUv +
              texel *
              vec2(
                -4.0,
                0.0
              )
            )
            *
            0.08;



          blurred +=
            texture2D(
              uImage,

              imageUv +
              texel *
              vec2(
                4.0,
                0.0
              )
            )
            *
            0.08;



          blurred +=
            texture2D(
              uImage,

              imageUv +
              texel *
              vec2(
                0.0,
                -4.0
              )
            )
            *
            0.08;



          blurred +=
            texture2D(
              uImage,

              imageUv +
              texel *
              vec2(
                0.0,
                4.0
              )
            )
            *
            0.08;



          blurred +=
            texture2D(
              uImage,

              imageUv +
              texel *
              vec2(
                -2.0,
                -2.0
              )
            )
            *
            0.12;



          blurred +=
            texture2D(
              uImage,

              imageUv +
              texel *
              vec2(
                2.0,
                -2.0
              )
            )
            *
            0.12;



          blurred +=
            texture2D(
              uImage,

              imageUv +
              texel *
              vec2(
                -2.0,
                2.0
              )
            )
            *
            0.12;



          blurred +=
            texture2D(
              uImage,

              imageUv +
              texel *
              vec2(
                2.0,
                2.0
              )
            )
            *
            0.12;



          blurred +=
            source *
            0.20;



          float broad =
            fbm(

              imageUv *
              uNoiseScale

              +

              vec2(
                2.7,
                9.1
              )
            );



          float blueA =
            blueNoise(
              pixel,

              uDotScale,

              vec2(
                13.0,
                37.0
              )
            );



          float blueB =
            blueNoise(
              pixel,

              uDotScale *
              1.65,

              vec2(
                41.0,
                17.0
              )
            );



          float threshold =
            mix(
              -0.22,
              1.22,
              uProgress
            );



          float field =
            imageUv.x *
            0.66

            +

            imageUv.y *
            0.34

            +

            (
              broad -
              0.5
            )
            *
            uNoiseAmount

            +

            (
              blueA -
              0.5
            )
            *
            uNoiseAmount
            *
            0.48;



          float alphaMask =
            smoothstep(

              threshold -
              uSoftness,

              threshold +
              uSoftness,

              field
            );



          alphaMask =
            1.0 -
            alphaMask;



          float signedDistance =
            field -
            threshold;



          float edgeMask =
            1.0

            -

            smoothstep(

              uEdgeWidth *
              0.12,

              uEdgeWidth *
              1.22,

              abs(
                signedDistance
              )
            );



          float brightDust =
            step(
              0.86,
              blueB
            )

            *

            edgeMask;



          float darkDust =
            (
              1.0 -
              step(
                0.10,
                blueA
              )
            )

            *

            edgeMask;



          float blurHalo =
            edgeMask

            *

            (
              0.22 +
              0.78 *
              broad
            );



          vec3 color =
            mix(

              blurred.rgb,

              source.rgb,

              alphaMask
            );



          float contentAlpha =
            mix(

              blurred.a *
              blurHalo *
              0.72,

              source.a,

              alphaMask
            );



          color =
            mix(

              color,

              uEdgeColor,

              brightDust *
              uEdgeOpacity *
              0.42
            );



          color *=
            1.0

            -

            darkDust *
            uEdgeOpacity *
            0.13;



          float fineGrain =
            blueNoise(

              pixel,

              0.82,

              vec2(
                19.0,
                53.0
              )
            )

            -

            0.5;



          color +=
            vec3(
              fineGrain
            )
            *
            uGrain;



          gl_FragColor =
            vec4(

              color *
              contentAlpha,

              contentAlpha
            );
        }
      `;


      const program =
        gl.createProgram();


      gl.attachShader(
        program,

        this.shader(
          gl.VERTEX_SHADER,
          vertex
        )
      );


      gl.attachShader(
        program,

        this.shader(
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


      const uniform =
        name =>
          gl.getUniformLocation(
            program,
            name
          );


      this.program =
        program;


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


        image:
          uniform(
            "uImage"
          ),


        resolution:
          uniform(
            "uResolution"
          ),


        imageSize:
          uniform(
            "uImageSize"
          ),


        progress:
          uniform(
            "uProgress"
          ),


        softness:
          uniform(
            "uSoftness"
          ),


        noiseScale:
          uniform(
            "uNoiseScale"
          ),


        noiseAmount:
          uniform(
            "uNoiseAmount"
          ),


        dotScale:
          uniform(
            "uDotScale"
          ),


        grain:
          uniform(
            "uGrain"
          ),


        edgeWidth:
          uniform(
            "uEdgeWidth"
          ),


        edgeOpacity:
          uniform(
            "uEdgeOpacity"
          ),


        edgeColor:
          uniform(
            "uEdgeColor"
          )
      };


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



    setImage(image) {
      this.image =
        image;


      const gl =
        this.gl;


      if (
        this.texture
      ) {
        gl.deleteTexture(
          this.texture
        );
      }


      this.texture =
        gl.createTexture();


      gl.activeTexture(
        gl.TEXTURE0
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        this.texture
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


      this.ready =
        true;


      this.render();
    }



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


      const dpr =
        mobile
          ? 1
          : Math.min(
              devicePixelRatio || 1,
              1.5
            );


      this.canvas.width =
        Math.max(
          1,
          Math.round(
            rect.width *
            dpr
          )
        );


      this.canvas.height =
        Math.max(
          1,
          Math.round(
            rect.height *
            dpr
          )
        );


      this.render();
    }



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


      gl.viewport(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );


      gl.clearColor(
        0,
        0,
        0,
        0
      );


      gl.clear(
        gl.COLOR_BUFFER_BIT
      );


      gl.enable(
        gl.BLEND
      );


      gl.blendFunc(
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA
      );


      gl.useProgram(
        this.program
      );


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


      gl.activeTexture(
        gl.TEXTURE0
      );


      gl.bindTexture(
        gl.TEXTURE_2D,
        this.texture
      );


      gl.uniform1i(
        L.image,
        0
      );


      gl.uniform2f(
        L.resolution,
        this.canvas.width,
        this.canvas.height
      );


      gl.uniform2f(
        L.imageSize,
        this.image.width,
        this.image.height
      );


      gl.uniform1f(
        L.progress,
        this.progress
      );


      gl.uniform1f(
        L.softness,
        s.softness
      );


      gl.uniform1f(
        L.noiseScale,
        s.noiseScale
      );


      gl.uniform1f(
        L.noiseAmount,
        s.noiseAmount
      );


      gl.uniform1f(
        L.dotScale,
        s.dotScale
      );


      gl.uniform1f(
        L.grain,
        s.grain
      );


      gl.uniform1f(
        L.edgeWidth,
        s.edgeWidth
      );


      gl.uniform1f(
        L.edgeOpacity,
        s.edgeOpacity
      );


      gl.uniform3f(
        L.edgeColor,

        s.edgeColor[0],

        s.edgeColor[1],

        s.edgeColor[2]
      );


      gl.drawArrays(
        gl.TRIANGLES,
        0,
        6
      );
    }
  }


  return {
    ContentDustReveal
  };
})();
