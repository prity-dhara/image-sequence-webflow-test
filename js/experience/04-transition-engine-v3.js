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
        void main(){vUv=aUv;gl_Position=vec4(aPosition,0.0,1.0);}
      `;

      const fragment = `
        precision highp float;
        uniform sampler2D uFrom,uTo;
        uniform vec2 uResolution,uFromSize,uToSize;
        uniform float uProgress,uStartSize,uRadius,uSoftness,uNoiseScale,uNoiseAmount,uEdgeBand,uDistortion,uGrain,uCenterX,uCenterY;
        varying vec2 vUv;

        float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
        float blueNoise(vec2 p){return fract(52.9829189*fract(dot(p,vec2(0.06711056,0.00583715))));}

        vec2 coverUvCenter(vec2 uv,vec2 imageSize,vec2 canvasSize){
          float ir=imageSize.x/imageSize.y;
          float cr=canvasSize.x/canvasSize.y;
          vec2 s=vec2(1.0),o=vec2(0.0);

          if(ir>cr){
            s.x=cr/ir;
            o.x=(1.0-s.x)*0.5;
          } else {
            s.y=ir/cr;
            o.y=(1.0-s.y)*0.5;
          }

          return uv*s+o;
        }

        vec2 coverUvTop(vec2 uv,vec2 imageSize,vec2 canvasSize){
          float ir=imageSize.x/imageSize.y;
          float cr=canvasSize.x/canvasSize.y;
          vec2 s=vec2(1.0),o=vec2(0.0);

          if(ir>cr){
            s.x=cr/ir;
            o.x=(1.0-s.x)*0.5;
          } else {
            s.y=ir/cr;
            o.y=0.0;
          }

          return uv*s+o;
        }

        float roundedBoxSdf(vec2 p, vec2 b, float r){
          vec2 q=abs(p)-b+r;
          return min(max(q.x,q.y),0.0)+length(max(q,0.0))-r;
        }

        void main(){
          vec2 uv=vUv;
          vec2 center=vec2(uCenterX,uCenterY);
          vec2 aspect=vec2(uResolution.x/uResolution.y,1.0);
          vec2 p=(uv-center)*aspect;

          float maxHalfWidth=0.5*aspect.x;
          float maxHalfHeight=0.5;
          float startHalf=uStartSize;
          vec2 halfSize=mix(vec2(startHalf),vec2(maxHalfWidth,maxHalfHeight),uProgress);

          float pixelNoise=blueNoise(floor(gl_FragCoord.xy*max(0.1,uNoiseScale/700.0)));
          float clustered=0.65*pixelNoise+0.35*blueNoise(floor(gl_FragCoord.xy*0.17));
          float signedNoise=(clustered-0.5)*uNoiseAmount;

          float distance=roundedBoxSdf(p,halfSize,uRadius)+signedNoise;
          float reveal=1.0-smoothstep(-uSoftness,uSoftness,distance);

          vec2 warp=vec2((pixelNoise-0.5)*uDistortion);
          vec3 fromColor=texture2D(
            uFrom,
            coverUvCenter(uv-warp,uFromSize,uResolution)
          ).rgb;

          vec3 toColor=texture2D(
            uTo,
            coverUvTop(uv+warp,uToSize,uResolution)
          ).rgb;

          vec3 color=mix(fromColor,toColor,reveal);
          float edge=1.0-smoothstep(0.0,uEdgeBand,abs(distance));
          float binaryDots=step(0.42,clustered)*edge;
          color=mix(color,toColor,binaryDots);
          color+=(hash(gl_FragCoord.xy)-0.5)*uGrain;
          gl_FragColor=vec4(color,1.0);
        }
      `;

      const program = gl.createProgram();
      gl.attachShader(program, this.createShader(gl.VERTEX_SHADER, vertex));
      gl.attachShader(program, this.createShader(gl.FRAGMENT_SHADER, fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
      }

      this.program = program;
      this.locations = {};
      ["aPosition","aUv","uFrom","uTo","uResolution","uFromSize","uToSize","uProgress","uStartSize","uRadius","uSoftness","uNoiseScale","uNoiseAmount","uEdgeBand","uDistortion","uGrain","uCenterX","uCenterY"].forEach(name => {
        this.locations[name] = name.startsWith("a")
          ? gl.getAttribLocation(program, name)
          : gl.getUniformLocation(program, name);
      });

      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
        -1,-1,0,1, 1,-1,1,1, -1,1,0,0,
        -1,1,0,0, 1,-1,1,1, 1,1,1,0
      ]),gl.STATIC_DRAW);
    }

    createTexture(image, unit) {
      const gl = this.gl;
      const texture = gl.createTexture();
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      return texture;
    }

    setImages(fromImage, toImage) {
      this.fromImage = fromImage;
      this.toImage = toImage;
      if (this.fromTexture) this.gl.deleteTexture(this.fromTexture);
      if (this.toTexture) this.gl.deleteTexture(this.toTexture);
      this.fromTexture = this.createTexture(fromImage, this.gl.TEXTURE0);
      this.toTexture = this.createTexture(toImage, this.gl.TEXTURE1);
      this.ready = true;
      this.render();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const mobile = matchMedia("(max-width: 767px)").matches;
      const dpr = mobile ? CONFIG.performance.mobileDPR : Math.min(devicePixelRatio || 1, CONFIG.performance.desktopDPR);
      this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
      this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
      this.render();
    }

    render() {
      if (!this.ready) return;
      const gl = this.gl;
      const s = this.settings;
      const L = this.locations;

      gl.viewport(0,0,this.canvas.width,this.canvas.height);
      gl.useProgram(this.program);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
      gl.enableVertexAttribArray(L.aPosition);
      gl.vertexAttribPointer(L.aPosition,2,gl.FLOAT,false,16,0);
      gl.enableVertexAttribArray(L.aUv);
      gl.vertexAttribPointer(L.aUv,2,gl.FLOAT,false,16,8);

      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,this.fromTexture); gl.uniform1i(L.uFrom,0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,this.toTexture); gl.uniform1i(L.uTo,1);

      gl.uniform2f(L.uResolution,this.canvas.width,this.canvas.height);
      gl.uniform2f(L.uFromSize,this.fromImage.naturalWidth,this.fromImage.naturalHeight);
      gl.uniform2f(L.uToSize,this.toImage.naturalWidth,this.toImage.naturalHeight);
      gl.uniform1f(L.uProgress,this.progress);
      gl.uniform1f(L.uStartSize,s.startSize);
      gl.uniform1f(L.uRadius,s.cornerRadius);
      gl.uniform1f(L.uSoftness,s.edgeSoftness);
      gl.uniform1f(L.uNoiseScale,s.noiseScale);
      gl.uniform1f(L.uNoiseAmount,s.noiseAmount);
      gl.uniform1f(L.uEdgeBand,s.edgeBand);
      gl.uniform1f(L.uDistortion,s.distortion);
      gl.uniform1f(L.uGrain,s.grain);
      gl.uniform1f(L.uCenterX,s.centerX);
      gl.uniform1f(L.uCenterY,s.centerY);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
  }

  return { OrganicRectangleReveal };
})();
