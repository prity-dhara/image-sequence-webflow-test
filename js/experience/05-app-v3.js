document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  if (!window.gsap || !window.ScrollTrigger) {
    console.error("[experience] GSAP and ScrollTrigger are required.");
    return;
  }

  const { gsap, ScrollTrigger } = window;
  const CONFIG = window.EXPERIENCE_CONFIG;

  const {
    rangeProgress,
    loadImageFromHtmlElement
  } = window.ExperienceUtils;

  const {
    SequenceSource,
    CanvasRenderer
  } = window.SequenceEngine;

  const {
    OrganicRectangleReveal
  } = window.TransitionEngine;

  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.config({
    ignoreMobileResize: true
  });

  /*
  =====================================================
  ELEMENTS
  =====================================================
  */

  const stage = document.querySelector(".section-stage");
  const pin = document.querySelector(".stage-pin");

  const heroSection = document.querySelector(".hero_section");
  const heroCanvas = document.querySelector(".hero_canvas-img-seq");

  const sectionTwo = document.querySelector(".section_two");
  const sectionTwoInner = document.querySelector(
    ".section_2-inner-tall"
  );

  const sectionTwoImage = document.querySelector(".section_2_img");

  const sectionTwoTexts = gsap.utils.toArray(
    ".section-2_text"
  );

  const sectionTwoSequenceCanvas = document.querySelector(
    ".section-2-img-seq"
  );

  const required = {
    stage,
    pin,
    heroSection,
    heroCanvas,
    sectionTwo,
    sectionTwoInner,
    sectionTwoImage,
    sectionTwoSequenceCanvas
  };

  const missing = Object.entries(required)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    console.error(
      `[experience] Missing elements: ${missing.join(", ")}`
    );

    return;
  }

  /*
  =====================================================
  TRANSITION CANVAS 1
  =====================================================
  */

  let transitionCanvas =
    document.querySelector(".transition_canvas-1");

  /*
    If the Webflow canvas does not exist,
    create one automatically.
  */

  if (!transitionCanvas) {
    transitionCanvas = document.createElement("canvas");
    transitionCanvas.className = "transition_canvas-1";
    pin.appendChild(transitionCanvas);
  }

  Object.assign(transitionCanvas.style, {
    position: "absolute",
    inset: "0",
    zIndex: "10",
    width: "100%",
    height: "100%",
    display: "block",
    opacity: "0",
    visibility: "hidden",
    pointerEvents: "none"
  });

  /*
  =====================================================
  SEQUENCE ENGINES
  =====================================================
  */

  const heroSource = new SequenceSource(CONFIG.hero);

  const heroRenderer = new CanvasRenderer(heroCanvas);

  const sectionTwoSequenceSource = new SequenceSource(
    CONFIG.sectionTwoSequence
  );

  const sectionTwoSequenceRenderer = new CanvasRenderer(
    sectionTwoSequenceCanvas
  );

  const transitionRenderer =
    new OrganicRectangleReveal(transitionCanvas);

  /*
  =====================================================
  INITIAL SIZE
  =====================================================
  */

  heroRenderer.resize();
  sectionTwoSequenceRenderer.resize();
  transitionRenderer.resize();

  /*
  =====================================================
  INITIAL VISIBILITY
  =====================================================
  */

  gsap.set(heroSection, {
    autoAlpha: 1
  });

  gsap.set(sectionTwo, {
    autoAlpha: 0
  });

  gsap.set(sectionTwoInner, {
    y: 0
  });

  gsap.set(sectionTwoTexts, {
    opacity: 0,
    xPercent: CONFIG.sectionTwo.textStartX
  });

  gsap.set(sectionTwoSequenceCanvas, {
    autoAlpha: 0
  });

  gsap.set(transitionCanvas, {
    autoAlpha: 0
  });

  /*
  =====================================================
  LOAD IMAGES
  =====================================================
  */

  let heroFirst;
  let heroLast;
  let destinationImage;
  let sectionTwoSequenceFirst;
  let sectionTwoSequenceLast;

  try {
    heroFirst = await heroSource.initialize();

    heroLast = await heroSource.request(
      CONFIG.hero.frameCount - 1,
      3000000
    );

    destinationImage = await loadImageFromHtmlElement(
      sectionTwoImage
    );

    sectionTwoSequenceFirst =
      await sectionTwoSequenceSource.initialize();

    sectionTwoSequenceLast =
      await sectionTwoSequenceSource.request(
        CONFIG.sectionTwoSequence.frameCount - 1,
        3000000
      );

    heroRenderer.draw(heroFirst);

    sectionTwoSequenceRenderer.draw(
      sectionTwoSequenceFirst
    );

    transitionRenderer.setImages(
      heroLast,
      destinationImage
    );
  } catch (error) {
    console.error(
      "[experience] Initialization failed:",
      error
    );

    return;
  }

  /*
  =====================================================
  HERO DRAW
  =====================================================
  */

  function drawHero(progress) {
    const frame = Math.round(
      progress * (CONFIG.hero.frameCount - 1)
    );

    heroSource.prioritize(frame);

    const nearest = heroSource.get(frame);

    if (nearest) {
      heroRenderer.draw(nearest);
    }

    heroSource.request(frame, 500000).then(exact => {
      if (
        exact &&
        heroSource.currentFrame === frame
      ) {
        heroRenderer.draw(exact);
      }
    });
  }

  /*
  =====================================================
  SECTION 2 SEQUENCE DRAW
  =====================================================
  */

  function drawSectionTwoSequence(progress) {
    const frame = Math.round(
      progress *
        (CONFIG.sectionTwoSequence.frameCount - 1)
    );

    sectionTwoSequenceSource.prioritize(frame);

    const nearest =
      sectionTwoSequenceSource.get(frame);

    if (nearest) {
      sectionTwoSequenceRenderer.draw(nearest);
    }

    sectionTwoSequenceSource
      .request(frame, 500000)
      .then(exact => {
        if (
          exact &&
          sectionTwoSequenceSource.currentFrame === frame
        ) {
          sectionTwoSequenceRenderer.draw(exact);
        }
      });
  }

  /*
  =====================================================
  MAIN SCROLL TIMELINE
  =====================================================
  */

  ScrollTrigger.create({
    trigger: stage,
    start: "top top",
    end: "bottom bottom",
    scrub: CONFIG.timeline.scrub,
    invalidateOnRefresh: true,

    onUpdate(self) {
      const progress = self.progress;
      const timeline = CONFIG.timeline;

      /*
      -----------------------------------------------
      1. HERO IMAGE SEQUENCE
      -----------------------------------------------
      */

      if (progress < timeline.transitionStart) {
        gsap.set(heroSection, {
          autoAlpha: 1
        });

        gsap.set(transitionCanvas, {
          autoAlpha: 0
        });

        gsap.set(sectionTwo, {
          autoAlpha: 0
        });

        gsap.set(sectionTwoSequenceCanvas, {
          autoAlpha: 0
        });

        drawHero(
          rangeProgress(
            progress,
            timeline.heroStart,
            timeline.heroEnd
          )
        );
      }

      /*
      -----------------------------------------------
      2. HERO → SECTION 2 WEBGL TRANSITION
      -----------------------------------------------
      */

      if (
        progress >= timeline.transitionStart &&
        progress < timeline.transitionEnd
      ) {
        gsap.set(heroSection, {
          autoAlpha: 1
        });

        gsap.set(sectionTwo, {
          autoAlpha: 0
        });

        gsap.set(sectionTwoSequenceCanvas, {
          autoAlpha: 0
        });

        gsap.set(transitionCanvas, {
          autoAlpha: 1
        });

        transitionRenderer.progress =
          rangeProgress(
            progress,
            timeline.transitionStart,
            timeline.transitionEnd
          );

        transitionRenderer.render();
      }

      /*
      -----------------------------------------------
      3. TALL SECTION 2 IMAGE
      -----------------------------------------------
      */

      if (
        progress >= timeline.sectionTwoStart &&
        progress < timeline.sectionTwoSequenceStart
      ) {
        gsap.set(heroSection, {
          autoAlpha: 0
        });

        gsap.set(transitionCanvas, {
          autoAlpha: 0
        });

        gsap.set(sectionTwo, {
          autoAlpha: 1
        });

        gsap.set(sectionTwoSequenceCanvas, {
          autoAlpha: 0
        });

        const sectionProgress =
          rangeProgress(
            progress,
            timeline.sectionTwoStart,
            timeline.sectionTwoEnd
          );

        /*
          Calculate movement from the actual image height.
        */

        const sectionTwoHeight = Math.max(
          sectionTwoInner.scrollHeight,
          sectionTwoInner.getBoundingClientRect().height
        );

        const viewportHeight =
          pin.clientHeight || innerHeight;

        const maxSectionTravel = Math.max(
          0,
          sectionTwoHeight - viewportHeight
        );

        gsap.set(sectionTwoInner, {
          y: -maxSectionTravel * sectionProgress
        });

        /*
          Section 2 text animations.
        */

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
        });
      }

      /*
      -----------------------------------------------
      4. SECTION 2 IMAGE SEQUENCE
      -----------------------------------------------
      */

      if (
        progress >= timeline.sectionTwoSequenceStart
      ) {
        gsap.set(heroSection, {
          autoAlpha: 0
        });

        gsap.set(transitionCanvas, {
          autoAlpha: 0
        });

        gsap.set(sectionTwo, {
          autoAlpha: 0
        });

        gsap.set(sectionTwoSequenceCanvas, {
          autoAlpha: 1
        });

        const sequenceProgress =
          rangeProgress(
            progress,
            timeline.sectionTwoSequenceStart,
            timeline.sectionTwoSequenceEnd
          );

        drawSectionTwoSequence(sequenceProgress);
      }

      /*
      -----------------------------------------------
      5. HOLD FINAL SECTION 2 FRAME
      -----------------------------------------------
      */

      if (progress >= timeline.finalHoldStart) {
        gsap.set(sectionTwoSequenceCanvas, {
          autoAlpha: 1
        });

        sectionTwoSequenceRenderer.draw(
          sectionTwoSequenceLast
        );
      }
    }
  });

  /*
  =====================================================
  RESIZE
  =====================================================
  */

  let resizeTimer;

  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        heroRenderer.resize();

        sectionTwoSequenceRenderer.resize();

        transitionRenderer.resize();

        ScrollTrigger.refresh();
      }, 180);
    },
    {
      passive: true
    }
  );

  ScrollTrigger.refresh();
});
