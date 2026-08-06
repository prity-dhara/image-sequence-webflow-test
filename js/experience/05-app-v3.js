document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  if (!window.gsap || !window.ScrollTrigger) {
    console.error("[experience-v3] GSAP and ScrollTrigger are required.");
    return;
  }

  const { gsap, ScrollTrigger } = window;
  const CONFIG = window.EXPERIENCE_CONFIG;
  const { rangeProgress, loadImageFromHtmlElement } = window.ExperienceUtils;
  const { SequenceSource, CanvasRenderer } = window.SequenceEngine;
  const { OrganicRectangleReveal } = window.TransitionEngine;

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
    sectionTwoSequenceCanvas
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    console.error(`[experience-v3] Missing elements: ${missing.join(", ")}`);
    return;
  }

  [transitionOneCanvas, transitionTwoCanvas].forEach((canvas, index) => {
    Object.assign(canvas.style, {
      position: "absolute",
      inset: "0",
      zIndex: index === 0 ? "10" : "11",
      width: "100%",
      height: "100%",
      display: "block",
      opacity: "0",
      visibility: "hidden",
      pointerEvents: "none"
    });
  });

  Object.assign(sectionTwoSequenceCanvas.style, {
    position: "absolute",
    inset: "0",
    zIndex: "7",
    width: "100%",
    height: "100%",
    display: "block",
    opacity: "0",
    visibility: "hidden",
    pointerEvents: "none"
  });

  const heroSource = new SequenceSource(CONFIG.hero);
  const heroRenderer = new CanvasRenderer(heroCanvas);

  const sectionTwoSequenceSource = new SequenceSource(CONFIG.sectionTwoSequence);
  const sectionTwoSequenceRenderer = new CanvasRenderer(sectionTwoSequenceCanvas);

  const transitionOneRenderer = new OrganicRectangleReveal(
    transitionOneCanvas,
    CONFIG.transitionOne
  );

  const transitionTwoRenderer = new OrganicRectangleReveal(
    transitionTwoCanvas,
    CONFIG.transitionTwo
  );

  function resizeAll() {
    heroRenderer.resize();
    sectionTwoSequenceRenderer.resize();
    transitionOneRenderer.resize();
    transitionTwoRenderer.resize();
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

  let heroFirst;
  let heroLast;
  let sectionTwoHtmlImage;
  let sectionTwoFirst;
  let sectionTwoLast;

  try {
    heroFirst = await heroSource.initialize();
    heroLast = await heroSource.request(CONFIG.hero.frameCount - 1, 3000000);

    sectionTwoHtmlImage = await loadImageFromHtmlElement(sectionTwoImage);

    sectionTwoFirst = await sectionTwoSequenceSource.initialize();
    sectionTwoLast = await sectionTwoSequenceSource.request(
      CONFIG.sectionTwoSequence.frameCount - 1,
      3000000
    );

    heroRenderer.draw(heroFirst);
    sectionTwoSequenceRenderer.draw(sectionTwoFirst);

    transitionOneRenderer.setImages(heroLast, sectionTwoHtmlImage);

    /*
      Transition 2 uses:
      FROM = the natural-height Section 2 HTML image
      TO   = first frame of the Section 2 image sequence

      Both are top-aligned by the v3 transition shader.
    */
    transitionTwoRenderer.setImages(sectionTwoHtmlImage, sectionTwoFirst);
  } catch (error) {
    console.error("[experience-v3] Initialization failed:", error);
    return;
  }

  function drawSequence(source, renderer, config, progress) {
    const frame = Math.round(progress * (config.frameCount - 1));

    source.prioritize(frame);

    const nearest = source.get(frame);
    if (nearest) renderer.draw(nearest);

    source.request(frame, 500000).then(exact => {
      if (exact && source.currentFrame === frame) {
        renderer.draw(exact);
      }
    });
  }

  function drawHero(progress) {
    drawSequence(heroSource, heroRenderer, CONFIG.hero, progress);
  }

  function drawSectionTwoSequence(progress) {
    drawSequence(
      sectionTwoSequenceSource,
      sectionTwoSequenceRenderer,
      CONFIG.sectionTwoSequence,
      progress
    );
  }

  function renderSectionTwoContent(sectionProgress) {
    const sectionTwoHeight = Math.max(
      sectionTwoInner.scrollHeight,
      sectionTwoInner.getBoundingClientRect().height
    );

    const viewportHeight = pin.clientHeight || innerHeight;
    const maxTravel = Math.max(0, sectionTwoHeight - viewportHeight);

    gsap.set(sectionTwoInner, {
      y: -maxTravel * sectionProgress
    });

    sectionTwoTexts.forEach((text, index) => {
      const count = sectionTwoTexts.length;
      const local = rangeProgress(
        sectionProgress,
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
          gsap.utils.interpolate(CONFIG.sectionTwo.textStartX, 0, enter) +
          gsap.utils.interpolate(0, CONFIG.sectionTwo.textExitX, exit)
      });
    });
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
        gsap.set(sectionTwoSequenceCanvas, { autoAlpha: 0 });

        drawHero(rangeProgress(p, t.heroStart, t.heroEnd));
        return;
      }

      if (p < t.transitionOneEnd) {
        gsap.set(heroSection, { autoAlpha: 1 });
        gsap.set(sectionTwo, { autoAlpha: 0 });
        gsap.set(transitionOneCanvas, { autoAlpha: 1 });
        gsap.set(transitionTwoCanvas, { autoAlpha: 0 });
        gsap.set(sectionTwoSequenceCanvas, { autoAlpha: 0 });

        transitionOneRenderer.progress = rangeProgress(
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

        renderSectionTwoContent(
          rangeProgress(p, t.sectionTwoStart, t.sectionTwoEnd)
        );
        return;
      }

      if (p < t.transitionTwoEnd) {
        /*
          Keep Section 2 behind the WebGL layer so the handoff has no flash.
        */
        gsap.set(heroSection, { autoAlpha: 0 });
        gsap.set(transitionOneCanvas, { autoAlpha: 0 });
        gsap.set(sectionTwo, { autoAlpha: 1 });
        gsap.set(sectionTwoSequenceCanvas, { autoAlpha: 0 });
        gsap.set(transitionTwoCanvas, { autoAlpha: 1 });

        renderSectionTwoContent(1);

        transitionTwoRenderer.progress = rangeProgress(
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

      const sequenceProgress = rangeProgress(
        p,
        t.sectionTwoSequenceStart,
        t.sectionTwoSequenceEnd
      );

      drawSectionTwoSequence(sequenceProgress);

      if (p >= t.finalHoldStart && sectionTwoLast) {
        sectionTwoSequenceRenderer.draw(sectionTwoLast);
      }
    }
  });

  if (window.dat?.GUI) {
    const gui = new window.dat.GUI({
      name: "Experience v3 Controls",
      width: 350
    });

    const timelineFolder = gui.addFolder("Timeline");
    [
      "heroEnd",
      "transitionOneStart",
      "transitionOneEnd",
      "sectionTwoStart",
      "sectionTwoEnd",
      "transitionTwoStart",
      "transitionTwoEnd",
      "sectionTwoSequenceStart",
      "sectionTwoSequenceEnd"
    ].forEach(key => {
      timelineFolder
        .add(CONFIG.timeline, key, 0, 1, 0.001)
        .name(key)
        .onChange(() => ScrollTrigger.refresh());
    });

    function addTransitionFolder(label, settings, renderer) {
      const folder = gui.addFolder(label);

      [
        ["startSize", 0.005, 0.15, 0.001],
        ["cornerRadius", 0, 0.2, 0.001],
        ["edgeSoftness", 0.001, 0.08, 0.001],
        ["noiseScale", 100, 1600, 1],
        ["noiseAmount", 0, 0.2, 0.001],
        ["edgeBand", 0.001, 0.2, 0.001],
        ["distortion", 0, 0.05, 0.001],
        ["grain", 0, 0.08, 0.001],
        ["centerX", 0.2, 0.8, 0.001],
        ["centerY", 0.2, 0.8, 0.001]
      ].forEach(([key, min, max, step]) => {
        folder
          .add(settings, key, min, max, step)
          .name(key)
          .onChange(() => renderer.render());
      });

      return folder;
    }

    addTransitionFolder(
      "Transition 1",
      CONFIG.transitionOne,
      transitionOneRenderer
    );

    const transitionTwoFolder = addTransitionFolder(
      "Transition 2 → Sequence",
      CONFIG.transitionTwo,
      transitionTwoRenderer
    );

    timelineFolder.open();
    transitionTwoFolder.open();
  }

  let resizeTimer;

  addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeAll();
        ScrollTrigger.refresh();
      }, 180);
    },
    { passive: true }
  );

  ScrollTrigger.refresh();
});
