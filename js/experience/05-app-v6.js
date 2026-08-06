document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  if (!window.gsap || !window.ScrollTrigger) {
    console.error("[preview] GSAP and ScrollTrigger are required.");
    return;
  }

  const { gsap, ScrollTrigger } = window;
  const CONFIG = window.EXPERIENCE_CONFIG;
  const { rangeProgress, loadImageFromHtmlElement } = window.ExperienceUtils;
  const { SequenceSource, CanvasRenderer } = window.SequenceEngine;
  const { OrganicRectangleReveal } = window.TransitionEngine;
  const { BlueNoiseDustTransition } = window.BlueNoiseTransitionEngine;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const stage = document.querySelector(".section-stage");
  const pin = document.querySelector(".stage-pin");

  const heroSection = document.querySelector(".hero_section");
  const heroCanvas = document.querySelector(".hero_canvas-img-seq");
  const transitionOneCanvas = document.querySelector(".transition_canvas-1");

  const sectionTwo = document.querySelector(".section_two");
  const sectionTwoInner = document.querySelector(".section_2-inner-tall");
  const sectionTwoImage = document.querySelector(".section_2_img");
  const sectionTwoTexts = gsap.utils.toArray(".section-2_text");

  const transitionTwoCanvas = document.querySelector(".transition_canvas-2-img");
  const sectionTwoSequenceCanvas = document.querySelector(".section-2-img-seq");

  const sectionThree = document.querySelector(".section_3");
  const sectionThreeContent = document.querySelector(".section_3-content-wrap");
  const sectionThreeRevealCanvas = document.querySelector(
    ".section-3-content-reveal"
  );

  const required = {
    stage,
    pin,
    heroSection,
    heroCanvas,
    transitionOneCanvas,
    sectionTwo,
    sectionTwoInner,
    sectionTwoImage,
    transitionTwoCanvas,
    sectionTwoSequenceCanvas,
    sectionThree,
    sectionThreeContent,
    sectionThreeRevealCanvas
  };

  const missing = Object.entries(required)
    .filter(([, element]) => !element)
    .map(([key]) => key);

  if (missing.length) {
    console.error(`[preview] Missing elements: ${missing.join(", ")}`);
    return;
  }

  const heroSource = new SequenceSource(CONFIG.hero);
  const heroRenderer = new CanvasRenderer(heroCanvas);

  const sectionTwoSource =
    new SequenceSource(CONFIG.sectionTwoSequence);

  const sectionTwoRenderer =
    new CanvasRenderer(sectionTwoSequenceCanvas);

  const transitionOneRenderer =
    new OrganicRectangleReveal(
      transitionOneCanvas,
      CONFIG.transitionOne
    );

  /*
   * Only transition_canvas-2-img uses the new blue-noise dust renderer.
   */
  const transitionTwoRenderer =
    new BlueNoiseDustTransition(
      transitionTwoCanvas,
      {
        softness: 0.005,
        noiseScale: 6.5,
        noiseAmount: 0.09,
        dotScale: 2.6,
        distortion: 0.006,
        grain: 0.03,
        edgeWidth: 0.15,
        edgeOpacity: 0.72,
        edgeColor: [0.91, 0.87, 0.78]
      }
    );

  const sectionThreeContentRenderer =
    new window.SectionThreeContentRevealEngine.ContentDustReveal(
      sectionThreeRevealCanvas,
      {
        softness: 0.035,
        noiseScale: 7.2,
        noiseAmount: 0.18,
        dotScale: 2.2,
        grain: 0.024,
        edgeWidth: 0.16,
        edgeOpacity: 0.75,
        edgeColor: [0.91, 0.87, 0.78]
      }
    );

  function resizeAll() {
    heroRenderer.resize();
    sectionTwoRenderer.resize();
    transitionOneRenderer.resize();
    transitionTwoRenderer.resize();
    sectionThreeContentRenderer.resize();
  }

  resizeAll();

  gsap.set(heroSection, { autoAlpha: 1 });
  gsap.set(sectionTwo, { autoAlpha: 0 });
  gsap.set(sectionTwoInner, { y: 0 });
  gsap.set(sectionTwoTexts, {
    opacity: 0,
    xPercent: CONFIG.sectionTwo.textStartX
  });
  gsap.set(transitionOneCanvas, { autoAlpha: 0 });
  gsap.set(transitionTwoCanvas, { autoAlpha: 0 });
  gsap.set(sectionTwoSequenceCanvas, { autoAlpha: 0 });
  gsap.set(sectionThree, { autoAlpha: 0 });
  gsap.set(sectionThreeContent, { autoAlpha: 0 });
  gsap.set(sectionThreeRevealCanvas, { autoAlpha: 0 });

  let heroFirst;
  let heroLast;
  let tallImage;
  let sequenceFirst;
  let sequenceLast;
  let finalViewportCrop;

  function captureFinalViewportCrop() {
    const viewportWidth =
      pin.clientWidth || innerWidth;

    const viewportHeight =
      pin.clientHeight || innerHeight;

    const cropCanvas =
      document.createElement("canvas");

    const dpr = matchMedia(
      "(max-width: 767px)"
    ).matches
      ? 1
      : Math.min(
          devicePixelRatio || 1,
          CONFIG.performance.desktopDPR
        );

    cropCanvas.width = Math.max(
      1,
      Math.round(viewportWidth * dpr)
    );

    cropCanvas.height = Math.max(
      1,
      Math.round(viewportHeight * dpr)
    );

    const context = cropCanvas.getContext("2d");

    const naturalWidth =
      tallImage.naturalWidth;

    const naturalHeight =
      tallImage.naturalHeight;

    const renderedScale =
      viewportWidth / naturalWidth;

    const renderedHeight =
      naturalHeight * renderedScale;

    /*
     * The image ends at the bottom of the pinned viewport.
     * Capture exactly that final visible area.
     */
    const visibleRenderedHeight =
      Math.min(viewportHeight, renderedHeight);

    const sourceVisibleHeight =
      visibleRenderedHeight / renderedScale;

    const sourceY = Math.max(
      0,
      naturalHeight - sourceVisibleHeight
    );

    context.drawImage(
      tallImage,
      0,
      sourceY,
      naturalWidth,
      sourceVisibleHeight,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    return cropCanvas;
  }


  function syncSectionThreeRevealBounds() {
    const stageRect = pin.getBoundingClientRect();
    const contentRect =
      sectionThreeContent.getBoundingClientRect();

    Object.assign(
      sectionThreeRevealCanvas.style,
      {
        left: `${contentRect.left - stageRect.left}px`,
        top: `${contentRect.top - stageRect.top}px`,
        width: `${contentRect.width}px`,
        height: `${contentRect.height}px`
      }
    );

    sectionThreeContentRenderer.resize();
  }

  async function captureSectionThreeContent() {
    /*
     * Temporarily reveal the real DOM only for html2canvas capture.
     */
    const previousOpacity =
      sectionThreeContent.style.opacity;

    const previousVisibility =
      sectionThreeContent.style.visibility;

    gsap.set(sectionThree, {
      autoAlpha: 1
    });

    gsap.set(sectionThreeContent, {
      opacity: 1,
      visibility: "visible"
    });

    await document.fonts.ready;

    syncSectionThreeRevealBounds();

    const capture = await html2canvas(
      sectionThreeContent,
      {
        backgroundColor: null,
        scale: Math.min(
          devicePixelRatio || 1,
          1.5
        ),
        useCORS: true,
        logging: false
      }
    );

    gsap.set(sectionThreeContent, {
      opacity: 0,
      visibility: "hidden"
    });

    gsap.set(sectionThree, {
      autoAlpha: 0
    });

    return capture;
  }

  try {
    heroFirst = await heroSource.initialize();

    heroLast = await heroSource.request(
      CONFIG.hero.frameCount - 1,
      3000000
    );

    tallImage =
      await loadImageFromHtmlElement(
        sectionTwoImage
      );

    sequenceFirst =
      await sectionTwoSource.initialize();

    sequenceLast =
      await sectionTwoSource.request(
        CONFIG.sectionTwoSequence.frameCount - 1,
        3000000
      );

    heroRenderer.draw(heroFirst);
    sectionTwoRenderer.draw(sequenceFirst);

    transitionOneRenderer.setImages(
      heroLast,
      tallImage
    );

    finalViewportCrop =
      captureFinalViewportCrop();

    transitionTwoRenderer.setImages(
      finalViewportCrop,
      sequenceFirst
    );

    const sectionThreeCapture =
      await captureSectionThreeContent();

    sectionThreeContentRenderer.setImage(
      sectionThreeCapture
    );
  } catch (error) {
    console.error(
      "[preview] Initialization failed:",
      error
    );
    return;
  }

  function drawSequence(
    source,
    renderer,
    sourceConfig,
    progress
  ) {
    const frame = Math.round(
      progress *
      (sourceConfig.frameCount - 1)
    );

    source.prioritize(frame);

    const nearest = source.get(frame);

    if (nearest) {
      renderer.draw(nearest);
    }

    source.request(frame, 500000)
      .then(exact => {
        if (
          exact &&
          source.currentFrame === frame
        ) {
          renderer.draw(exact);
        }
      });
  }

  function renderTallSection(progress) {
    const contentHeight = Math.max(
      sectionTwoInner.scrollHeight,
      sectionTwoInner.getBoundingClientRect().height
    );

    const viewportHeight =
      pin.clientHeight || innerHeight;

    const maxTravel = Math.max(
      0,
      contentHeight - viewportHeight
    );

    gsap.set(sectionTwoInner, {
      y: -maxTravel * progress
    });

    sectionTwoTexts.forEach(
      (text, index) => {
        const count =
          sectionTwoTexts.length;

        const local = rangeProgress(
          progress,
          index / count,
          (index + 1) / count
        );

        const enter = rangeProgress(
          local,
          0,
          CONFIG.sectionTwo.textEnterPortion
        );

        const exit = rangeProgress(
          local,
          CONFIG.sectionTwo.textExitStart,
          1
        );

        gsap.set(text, {
          opacity: enter * (1 - exit),
          xPercent:
            gsap.utils.interpolate(
              CONFIG.sectionTwo.textStartX,
              0,
              enter
            ) +
            gsap.utils.interpolate(
              0,
              CONFIG.sectionTwo.textExitX,
              exit
            )
        });
      }
    );
  }

  function applySectionTwoLayout(totalProgress) {
    const layout = CONFIG.sectionTwoLayout;

    const layoutProgress = rangeProgress(
      totalProgress,
      layout.start,
      layout.end
    );

    const left = gsap.utils.interpolate(
      0,
      layout.left,
      layoutProgress
    );

    const top = gsap.utils.interpolate(
      0,
      layout.top,
      layoutProgress
    );

    const width = gsap.utils.interpolate(
      100,
      layout.width,
      layoutProgress
    );

    const height = gsap.utils.interpolate(
      100,
      layout.height,
      layoutProgress
    );

    gsap.set(sectionTwoSequenceCanvas, {
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`
    });

    sectionTwoRenderer.resize();
  }

  ScrollTrigger.create({
    trigger: stage,
    start: "top top",
    end: "bottom bottom",
    scrub: CONFIG.timeline.scrub,
    invalidateOnRefresh: true,

    onUpdate(self) {
      const p = self.progress;
      const t = CONFIG.timeline;

      if (p < t.transitionOneStart) {
        gsap.set(heroSection, { autoAlpha: 1 });
        gsap.set(transitionOneCanvas, { autoAlpha: 0 });
        gsap.set(sectionTwo, { autoAlpha: 0 });
        gsap.set(transitionTwoCanvas, { autoAlpha: 0 });
        gsap.set(sectionThree, { autoAlpha: 0 });
        gsap.set(sectionThreeContent, { autoAlpha: 0 });
        gsap.set(sectionThreeRevealCanvas, { autoAlpha: 0 });

        gsap.set(sectionTwoSequenceCanvas, {
          autoAlpha: 0,
          left: "0%",
          top: "0%",
          width: "100%",
          height: "100%"
        });

        drawSequence(
          heroSource,
          heroRenderer,
          CONFIG.hero,
          rangeProgress(
            p,
            t.heroStart,
            t.heroEnd
          )
        );

        return;
      }

      if (p < t.transitionOneEnd) {
        gsap.set(heroSection, { autoAlpha: 1 });
        gsap.set(sectionTwo, { autoAlpha: 0 });
        gsap.set(transitionOneCanvas, { autoAlpha: 1 });
        gsap.set(transitionTwoCanvas, { autoAlpha: 0 });
        gsap.set(sectionTwoSequenceCanvas, { autoAlpha: 0 });
  gsap.set(sectionThree, { autoAlpha: 0 });
  gsap.set(sectionThreeContent, { autoAlpha: 0 });
  gsap.set(sectionThreeRevealCanvas, { autoAlpha: 0 });

        transitionOneRenderer.progress =
          rangeProgress(
            p,
            t.transitionOneStart,
            t.transitionOneEnd
          );

        transitionOneRenderer.render();
        return;
      }

      if (p < t.transitionTwoStart) {
        gsap.set(heroSection, { autoAlpha: 0 });
        gsap.set(transitionOneCanvas, { autoAlpha: 0 });
        gsap.set(sectionTwo, { autoAlpha: 1 });
        gsap.set(transitionTwoCanvas, { autoAlpha: 0 });
        gsap.set(sectionTwoSequenceCanvas, { autoAlpha: 0 });
  gsap.set(sectionThree, { autoAlpha: 0 });
  gsap.set(sectionThreeContent, { autoAlpha: 0 });
  gsap.set(sectionThreeRevealCanvas, { autoAlpha: 0 });

        renderTallSection(
          rangeProgress(
            p,
            t.sectionTwoStart,
            t.sectionTwoEnd
          )
        );

        return;
      }

      if (p < t.transitionTwoEnd) {
        gsap.set(heroSection, { autoAlpha: 0 });
        gsap.set(transitionOneCanvas, { autoAlpha: 0 });

        /*
         * Keep the actual tall image frozen at its final position.
         */
        gsap.set(sectionTwo, { autoAlpha: 1 });
        renderTallSection(1);

        gsap.set(
          sectionTwoSequenceCanvas,
          { autoAlpha: 0 }
        );

        gsap.set(
          transitionTwoCanvas,
          { autoAlpha: 1 }
        );

        transitionTwoRenderer.progress =
          rangeProgress(
            p,
            t.transitionTwoStart,
            t.transitionTwoEnd
          );

        transitionTwoRenderer.render();
        return;
      }

      gsap.set(heroSection, { autoAlpha: 0 });
      gsap.set(transitionOneCanvas, { autoAlpha: 0 });
      gsap.set(sectionTwo, { autoAlpha: 0 });
      gsap.set(transitionTwoCanvas, { autoAlpha: 0 });
      gsap.set(sectionTwoSequenceCanvas, { autoAlpha: 1 });

      applySectionTwoLayout(p);

      drawSequence(
        sectionTwoSource,
        sectionTwoRenderer,
        CONFIG.sectionTwoSequence,
        rangeProgress(
          p,
          t.sectionTwoSequenceStart,
          t.sectionTwoSequenceEnd
        )
      );

      const sectionThreeFade =
        rangeProgress(
          p,
          0.90,
          0.95
        );

      gsap.set(sectionThree, {
        opacity: sectionThreeFade,
        visibility:
          sectionThreeFade <= 0.001
            ? "hidden"
            : "visible"
      });

      const contentReveal =
        rangeProgress(
          p,
          0.925,
          0.995
        );

      /*
       * During the reveal, show only the WebGL capture.
       * When complete, switch to the real DOM content.
       */
      if (contentReveal < 0.999) {
        gsap.set(sectionThreeContent, {
          autoAlpha: 0
        });

        gsap.set(sectionThreeRevealCanvas, {
          autoAlpha:
            contentReveal <= 0.001
              ? 0
              : 1
        });

        sectionThreeContentRenderer.progress =
          contentReveal;

        sectionThreeContentRenderer.render();
      } else {
        gsap.set(sectionThreeRevealCanvas, {
          autoAlpha: 0
        });

        gsap.set(sectionThreeContent, {
          autoAlpha: 1
        });
      }

      if (
        p >= t.finalHoldStart &&
        sequenceLast
      ) {
        sectionTwoRenderer.draw(
          sequenceLast
        );
      }
    }
  });

  if (window.dat?.GUI) {
    const gui = new window.dat.GUI({
      name: "Experience Controls",
      width: 340
    });

    const timelineFolder = gui.addFolder("Timeline");

    timelineFolder
      .add(CONFIG.sectionTwoLayout, "start", 0.72, 0.95, 0.001)
      .name("layoutStart");

    timelineFolder
      .add(CONFIG.sectionTwoLayout, "end", 0.75, 1, 0.001)
      .name("layoutEnd");

    const transitionFolder = gui.addFolder("Transition");
    const s = transitionTwoRenderer.settings;

    transitionFolder
      .add(s, "softness", 0.001, 0.25, 0.001)
      .name("Dissolve spread");

    transitionFolder
      .add(s, "noiseScale", 0.5, 14, 0.1)
      .name("Edge shape scale");

    transitionFolder
      .add(s, "noiseAmount", 0, 0.5, 0.005)
      .name("Edge irregularity");

    transitionFolder
      .add(s, "dotScale", 0.5, 5, 0.05)
      .name("Blue-noise dot scale");

    transitionFolder
      .add(s, "distortion", 0, 0.08, 0.001)
      .name("Distortion");

    transitionFolder
      .add(s, "grain", 0, 0.12, 0.001)
      .name("Film grain");

    transitionFolder
      .add(s, "edgeWidth", 0.01, 0.35, 0.005)
      .name("Dust band width");

    transitionFolder
      .add(s, "edgeOpacity", 0, 1.5, 0.01)
      .name("Edge opacity");

    const edgeColorProxy = {
      color: "#e8dec7"
    };

    transitionFolder
      .addColor(edgeColorProxy, "color")
      .name("Edge color")
      .onChange(value => {
        const hex = value.replace("#", "");
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;

        s.edgeColor = [r, g, b];
        transitionTwoRenderer.render();
      });

    const layoutFolder = gui.addFolder("Section 2 Layout");
    const layout = CONFIG.sectionTwoLayout;

    layoutFolder
      .add(layout, "left", 0, 30, 0.5)
      .name("left");

    layoutFolder
      .add(layout, "top", 0, 30, 0.5)
      .name("top");

    layoutFolder
      .add(layout, "width", 20, 100, 0.5)
      .name("width");

    layoutFolder
      .add(layout, "height", 30, 100, 0.5)
      .name("height");

    timelineFolder.open();
    transitionFolder.open();
    layoutFolder.open();

    const sectionThreeFolder =
      gui.addFolder("Section 3 Content Reveal");

    const contentSettings =
      sectionThreeContentRenderer.settings;

    sectionThreeFolder
      .add(contentSettings, "softness", 0.005, 0.2, 0.005)
      .name("Dissolve spread");

    sectionThreeFolder
      .add(contentSettings, "noiseScale", 0.5, 14, 0.1)
      .name("Edge shape scale");

    sectionThreeFolder
      .add(contentSettings, "noiseAmount", 0, 0.5, 0.005)
      .name("Edge irregularity");

    sectionThreeFolder
      .add(contentSettings, "dotScale", 0.5, 5, 0.05)
      .name("Blue-noise dot scale");

    sectionThreeFolder
      .add(contentSettings, "grain", 0, 0.12, 0.001)
      .name("Film grain");

    sectionThreeFolder
      .add(contentSettings, "edgeWidth", 0.01, 0.35, 0.005)
      .name("Dust band width");

    sectionThreeFolder
      .add(contentSettings, "edgeOpacity", 0, 1.5, 0.01)
      .name("Edge opacity");

    sectionThreeFolder.open();

  }

  let resizeTimer;

  addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        resizeAll();

        syncSectionThreeRevealBounds();

        finalViewportCrop =
          captureFinalViewportCrop();

        transitionTwoRenderer.setImages(
          finalViewportCrop,
          sequenceFirst
        );

        ScrollTrigger.refresh();
      }, 180);
    },
    { passive: true }
  );

  ScrollTrigger.refresh();
});
