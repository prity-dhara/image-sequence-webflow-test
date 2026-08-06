document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  if (!window.gsap || !window.ScrollTrigger) {
    console.error("[experience] GSAP and ScrollTrigger are required.");
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
  const sectionTwo = document.querySelector(".section_two");
  const sectionTwoInner = document.querySelector(".section_2-inner-tall");
  const sectionTwoImage = document.querySelector(".section_2_img");
  const sectionTwoTexts = gsap.utils.toArray(".section-2_text");

  const required = { stage, pin, heroSection, heroCanvas, sectionTwo, sectionTwoInner, sectionTwoImage };
  const missing = Object.entries(required).filter(([,value]) => !value).map(([name]) => name);
  if (missing.length) {
    console.error(`[experience] Missing elements: ${missing.join(", ")}`);
    return;
  }

  const transitionCanvas = document.createElement("canvas");
  transitionCanvas.className = "scene-transition-canvas";
  pin.appendChild(transitionCanvas);
  Object.assign(transitionCanvas.style, {
    position: "absolute", inset: "0", zIndex: "10",
    width: "100%", height: "100%", display: "block",
    opacity: "0", visibility: "hidden", pointerEvents: "none"
  });

  const heroSource = new SequenceSource(CONFIG.hero);
  const heroRenderer = new CanvasRenderer(heroCanvas);
  const transitionRenderer = new OrganicRectangleReveal(transitionCanvas);

  heroRenderer.resize();
  transitionRenderer.resize();

  gsap.set(sectionTwo, { autoAlpha: 0 });
  gsap.set(transitionCanvas, { autoAlpha: 0 });
  gsap.set(sectionTwoInner, { y: 0 });
  gsap.set(sectionTwoTexts, { opacity: 0, xPercent: CONFIG.sectionTwo.textStartX });

  let heroFirst;
  let heroLast;
  let destinationImage;

  try {
    heroFirst = await heroSource.initialize();
    heroLast = await heroSource.request(CONFIG.hero.frameCount - 1, 3000000);

    // Important: destination comes from the existing HTML image.
    // There is no hardcoded Section 2 image URL in JavaScript.
    destinationImage = await loadImageFromHtmlElement(sectionTwoImage);

    heroRenderer.draw(heroFirst);
    transitionRenderer.setImages(heroLast, destinationImage);
  } catch (error) {
    console.error("[experience] Initialization failed:", error);
    return;
  }

  function drawHero(progress) {
    const frame = Math.round(progress * (CONFIG.hero.frameCount - 1));
    heroSource.prioritize(frame);
    const nearest = heroSource.get(frame);
    if (nearest) heroRenderer.draw(nearest);
    heroSource.request(frame, 500000).then(exact => {
      if (exact && heroSource.currentFrame === frame) heroRenderer.draw(exact);
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

      if (p < t.transitionStart) {
        gsap.set(heroSection, { autoAlpha: 1 });
        gsap.set(transitionCanvas, { autoAlpha: 0 });
        gsap.set(sectionTwo, { autoAlpha: 0 });
        drawHero(rangeProgress(p, t.heroStart, t.heroEnd));
      }

      if (p >= t.transitionStart && p < t.transitionEnd) {
        gsap.set(heroSection, { autoAlpha: 1 });
        gsap.set(sectionTwo, { autoAlpha: 0 });
        gsap.set(transitionCanvas, { autoAlpha: 1 });
        transitionRenderer.progress = rangeProgress(p, t.transitionStart, t.transitionEnd);
        transitionRenderer.render();
      }

      if (p >= t.sectionTwoStart) {
        gsap.set(heroSection, { autoAlpha: 0 });
        gsap.set(transitionCanvas, { autoAlpha: 0 });

        const sectionProgress = rangeProgress(p, t.sectionTwoStart, t.sectionTwoEnd);
        const fadeProgress = rangeProgress(p, t.sectionTwoFadeStart, t.sectionTwoFadeEnd);

        gsap.set(sectionTwo, {
          opacity: 1 - fadeProgress,
          visibility: fadeProgress >= 0.999 ? "hidden" : "visible"
        });

        const sectionTwoHeight = Math.max(
          sectionTwoInner.scrollHeight,
          sectionTwoInner.getBoundingClientRect().height
        );

        const viewportHeight = pin.clientHeight || innerHeight;
        const maxSectionTravel = Math.max(0, sectionTwoHeight - viewportHeight);

        gsap.set(sectionTwoInner, {
          y: -maxSectionTravel * sectionProgress
        });

        sectionTwoTexts.forEach((text, index) => {
          const count = sectionTwoTexts.length;
          const local = rangeProgress(sectionProgress, index / count, (index + 1) / count);
          const enter = rangeProgress(local, 0, CONFIG.sectionTwo.textEnterPortion);
          const exit = rangeProgress(local, CONFIG.sectionTwo.textExitStart, 1);

          gsap.set(text, {
            opacity: enter * (1 - exit),
            xPercent:
              gsap.utils.interpolate(CONFIG.sectionTwo.textStartX, 0, enter) +
              gsap.utils.interpolate(0, CONFIG.sectionTwo.textExitX, exit)
          });
        });
      }
    }
  });

  if (window.dat?.GUI) {
    const gui = new window.dat.GUI({ name: "Experience Controls", width: 340 });
    const transitionFolder = gui.addFolder("Organic Rectangle Reveal");
    [
      ["startSize",0.005,0.15,0.001,"Start size"],
      ["cornerRadius",0,0.2,0.001,"Corner roundness"],
      ["edgeSoftness",0.001,0.08,0.001,"Edge softness"],
      ["noiseScale",100,1400,1,"Dot density"],
      ["noiseAmount",0,0.2,0.001,"Edge irregularity"],
      ["edgeBand",0.001,0.15,0.001,"Dot band width"],
      ["distortion",0,0.05,0.001,"Distortion"],
      ["grain",0,0.08,0.001,"Film grain"],
      ["centerX",0.2,0.8,0.001,"Center X"],
      ["centerY",0.2,0.8,0.001,"Center Y"]
    ].forEach(([key,min,max,step,label]) => {
      transitionFolder.add(CONFIG.transition,key,min,max,step).name(label).onChange(() => transitionRenderer.render());
    });

    const sectionFolder = gui.addFolder("Section 2");
    sectionFolder.add(CONFIG.sectionTwo,"travelVH",50,400,1).name("Inner travel VH");
    sectionFolder.add(CONFIG.sectionTwo,"textEnterPortion",0.05,0.5,0.01).name("Text enter length");
    sectionFolder.add(CONFIG.sectionTwo,"textExitStart",0.5,0.95,0.01).name("Text exit start");
    sectionFolder.add(CONFIG.sectionTwo,"textStartX",0,150,1).name("Text start X");
    sectionFolder.add(CONFIG.sectionTwo,"textExitX",-100,0,1).name("Text exit X");

    transitionFolder.open();
    sectionFolder.open();
  }

  let resizeTimer;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      heroRenderer.resize();
      transitionRenderer.resize();
      ScrollTrigger.refresh();
    }, 180);
  }, { passive: true });

  ScrollTrigger.refresh();
});
