document.addEventListener("DOMContentLoaded", async () => {
  "use strict";


  // ============================================================
  // REQUIREMENTS
  // ============================================================

  if (
    !window.gsap ||
    !window.ScrollTrigger
  ) {

    console.error(
      "[preview] GSAP and ScrollTrigger are required."
    );

    return;
  }



  const {
    gsap,
    ScrollTrigger
  } = window;


  const CONFIG =
    window.EXPERIENCE_CONFIG;



  if (!CONFIG) {

    console.error(
      "[preview] EXPERIENCE_CONFIG is missing."
    );

    return;
  }



  if (
    !window.ExperienceUtils
  ) {

    console.error(
      "[preview] ExperienceUtils missing."
    );

    return;
  }



  if (
    !window.SequenceEngine
  ) {

    console.error(
      "[preview] SequenceEngine missing."
    );

    return;
  }



  if (
    !window.TransitionEngine
  ) {

    console.error(
      "[preview] TransitionEngine missing."
    );

    return;
  }



  if (
    !window.BlueNoiseTransitionEngine
  ) {

    console.error(
      "[preview] Yellow transition engine missing."
    );

    return;
  }



  const {
    rangeProgress,
    loadImageFromHtmlElement
  } =
    window.ExperienceUtils;



  const {
    SequenceSource,
    CanvasRenderer
  } =
    window.SequenceEngine;



  const {
    OrganicRectangleReveal
  } =
    window.TransitionEngine;



  const {
    BlueNoiseDustTransition
  } =
    window.BlueNoiseTransitionEngine;



  gsap.registerPlugin(
    ScrollTrigger
  );


  ScrollTrigger.config({
    ignoreMobileResize: true
  });



  // ============================================================
  // DOM
  // ============================================================

  const stage =
    document.querySelector(
      ".section-stage"
    );


  const pin =
    document.querySelector(
      ".stage-pin"
    );



  const heroSection =
    document.querySelector(
      ".hero_section"
    );


  const heroCanvas =
    document.querySelector(
      ".hero_canvas-img-seq"
    );


  const heroInitialFrame =
    document.querySelector(
      ".hero_initial-frame"
    );


  const transitionOneCanvas =
    document.querySelector(
      ".transition_canvas-1"
    );



  const sectionTwo =
    document.querySelector(
      ".section_two"
    );


  const sectionTwoInner =
    document.querySelector(
      ".section_2-inner-tall"
    );


  const sectionTwoImage =
    document.querySelector(
      ".section_2_img"
    );


  const sectionTwoTexts =
    gsap.utils.toArray(
      ".section-2_text"
    );



  const transitionTwoCanvas =
    document.querySelector(
      ".transition_canvas-2-img"
    );


  const sectionTwoSequenceCanvas =
    document.querySelector(
      ".section-2-img-seq"
    );



  const sectionThree =
    document.querySelector(
      ".section_3"
    );



  const sectionThreeToFourCanvas =
    document.querySelector(
      ".section-3-noise-ditter-trans"
    );



  const sectionFour =
    document.querySelector(
      ".section_4"
    );



  // ============================================================
  // REQUIRED
  // ============================================================

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

    sectionThree
  };



  const missing =
    Object.entries(
      required
    )
    .filter(
      ([, element]) =>
        !element
    )
    .map(
      ([key]) =>
        key
    );



  if (
    missing.length
  ) {

    console.error(
      `[preview] Missing elements: ${missing.join(", ")}`
    );

    return;
  }



  // ============================================================
  // SEQUENCES
  // ============================================================

  const heroSource =
    new SequenceSource(
      CONFIG.hero
    );


  const heroRenderer =
    new CanvasRenderer(
      heroCanvas
    );



  const sectionTwoSource =
    new SequenceSource(
      CONFIG.sectionTwoSequence
    );


  const sectionTwoRenderer =
    new CanvasRenderer(
      sectionTwoSequenceCanvas
    );



  // ============================================================
  // TRANSITION 1
  // ORIGINAL ORGANIC RECTANGLE
  // ============================================================

  const transitionOneRenderer =
    new OrganicRectangleReveal(

      transitionOneCanvas,

      CONFIG.transitionOne
    );



  // ============================================================
  // TRANSITION 2
  // YELLOW ORGANIC REVEAL
  // ============================================================

  const transitionTwoRenderer =
    new BlueNoiseDustTransition(

      transitionTwoCanvas,

      {

        yellowStart:
          0.00,


        yellowEnd:
          0.28,


        revealStart:
          0.18,


        revealEnd:
          1.00,


        centerX:
          0.56,


        centerY:
          0.48,


        openingScale:
          1.10,


        softness:
          0.095,


        edgeIrregularity:
          0.12,


        shapeStretchX:
          1.18,


        shapeStretchY:
          0.88,


        paperNoise:
          0.035,


        vignette:
          0.18,


        yellowColor:
          "#efe7d1",


        yellowOpacity:
          0.72
      }
    );



  // ============================================================
  // FINAL TRANSITION SOURCE STATE
  // ============================================================

  let finalTransitionSourceCaptured =
    false;



  function captureFinalTransitionSource() {

    if (
      finalTransitionSourceCaptured
    ) {

      return;
    }



    if (
      !window
        .DottedTransitionRegistry
        ?.captureSource
    ) {

      return;
    }



    const captured =
      window
        .DottedTransitionRegistry
        .captureSource();



    if (
      captured !== false
    ) {

      finalTransitionSourceCaptured =
        true;
    }
  }



  // ============================================================
  // RESIZE
  // ============================================================

  function resizeAll() {

    heroRenderer
      .resize();


    sectionTwoRenderer
      .resize();


    transitionOneRenderer
      .resize();


    transitionTwoRenderer
      .resize();


    window
      .PerlinRevealRegistry
      ?.resize();


    window
      .DottedTransitionRegistry
      ?.resize();
  }



  resizeAll();



  // ============================================================
  // INITIAL VISIBILITY
  // ============================================================

  gsap.set(
    heroSection,
    {
      autoAlpha: 1
    }
  );



  if (
    heroInitialFrame
  ) {

    gsap.set(
      heroInitialFrame,
      {
        autoAlpha: 1
      }
    );
  }



  gsap.set(
    sectionTwo,
    {
      autoAlpha: 0
    }
  );



  gsap.set(
    sectionTwoInner,
    {
      y: 0
    }
  );



  gsap.set(
    sectionTwoTexts,
    {
      opacity: 0,

      xPercent:
        CONFIG
          .sectionTwo
          .textStartX
    }
  );



  gsap.set(
    transitionOneCanvas,
    {
      autoAlpha: 0
    }
  );



  gsap.set(
    transitionTwoCanvas,
    {
      autoAlpha: 0
    }
  );



  gsap.set(
    sectionTwoSequenceCanvas,
    {
      autoAlpha: 0
    }
  );



  gsap.set(
    sectionThree,
    {
      autoAlpha: 0
    }
  );



  if (
    sectionThreeToFourCanvas
  ) {

    gsap.set(
      sectionThreeToFourCanvas,
      {
        autoAlpha: 0
      }
    );
  }



  if (
    sectionFour
  ) {

    gsap.set(
      sectionFour,
      {
        autoAlpha: 0
      }
    );
  }



  // ============================================================
  // ASSETS
  // ============================================================

  let heroFirst;

  let heroLast;

  let tallImage;

  let sequenceFirst;

  let sequenceLast;

  let finalViewportCrop;



  // ============================================================
  // FINAL TALL IMAGE CROP
  // ============================================================

  function captureFinalViewportCrop() {

    const viewportWidth =
      pin.clientWidth ||
      innerWidth;


    const viewportHeight =
      pin.clientHeight ||
      innerHeight;



    const cropCanvas =
      document.createElement(
        "canvas"
      );



    const dpr =
      matchMedia(
        "(max-width: 767px)"
      ).matches

        ? 1

        : Math.min(

            devicePixelRatio ||
            1,

            CONFIG
              .performance
              .desktopDPR
          );



    cropCanvas.width =
      Math.max(

        1,

        Math.round(
          viewportWidth *
          dpr
        )
      );



    cropCanvas.height =
      Math.max(

        1,

        Math.round(
          viewportHeight *
          dpr
        )
      );



    const context =
      cropCanvas.getContext(
        "2d"
      );



    const naturalWidth =
      tallImage.naturalWidth;


    const naturalHeight =
      tallImage.naturalHeight;



    const renderedScale =
      viewportWidth /
      naturalWidth;



    const renderedHeight =
      naturalHeight *
      renderedScale;



    const visibleRenderedHeight =
      Math.min(

        viewportHeight,

        renderedHeight
      );



    const sourceVisibleHeight =
      visibleRenderedHeight /
      renderedScale;



    const sourceY =
      Math.max(

        0,

        naturalHeight -
        sourceVisibleHeight
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



  // ============================================================
  // INITIALIZE
  // ============================================================

  try {

    heroFirst =
      await heroSource
        .initialize();



    heroLast =
      await heroSource
        .request(

          CONFIG.hero.frameCount -
          1,

          3000000
        );



    tallImage =
      await loadImageFromHtmlElement(
        sectionTwoImage
      );



    sequenceFirst =
      await sectionTwoSource
        .initialize();



    sequenceLast =
      await sectionTwoSource
        .request(

          CONFIG
            .sectionTwoSequence
            .frameCount -
          1,

          3000000
        );



    heroRenderer.draw(
      heroFirst
    );



    if (
      heroInitialFrame
    ) {

      gsap.to(
        heroInitialFrame,
        {

          autoAlpha:
            0,

          duration:
            0.25,

          ease:
            "none"
        }
      );
    }



    sectionTwoRenderer.draw(
      sequenceFirst
    );



    transitionOneRenderer
      .setImages(

        heroLast,

        tallImage
      );



    finalViewportCrop =
      captureFinalViewportCrop();



    transitionTwoRenderer
      .setImages(

        finalViewportCrop,

        sequenceFirst
      );


  } catch (
    error
  ) {

    console.error(
      "[preview] Initialization failed:",
      error
    );

    return;
  }



  // ============================================================
  // EFFECT ENGINES
  // ============================================================

  if (
    window.PerlinRevealReady
  ) {

    await window
      .PerlinRevealReady;
  }



  if (
    window.DottedTransitionReady
  ) {

    await window
      .DottedTransitionReady;
  }



  // ============================================================
  // DRAW SEQUENCE
  // ============================================================

  function drawSequence(
    source,
    renderer,
    sourceConfig,
    progress
  ) {

    const frame =
      Math.round(

        progress

        *

        (
          sourceConfig.frameCount -
          1
        )
      );



    source.prioritize(
      frame
    );



    const nearest =
      source.get(
        frame
      );



    if (
      nearest
    ) {

      renderer.draw(
        nearest
      );
    }



    source
      .request(
        frame,
        500000
      )
      .then(
        exact => {

          if (
            exact

            &&

            source.currentFrame ===
              frame
          ) {

            renderer.draw(
              exact
            );
          }
        }
      );
  }



  // ============================================================
  // TALL SECTION
  // ============================================================

  function renderTallSection(
    progress
  ) {

    const contentHeight =
      Math.max(

        sectionTwoInner
          .scrollHeight,

        sectionTwoInner
          .getBoundingClientRect()
          .height
      );



    const viewportHeight =
      pin.clientHeight ||
      innerHeight;



    const maxTravel =
      Math.max(

        0,

        contentHeight -
        viewportHeight
      );



    gsap.set(
      sectionTwoInner,
      {

        y:
          -maxTravel *
          progress
      }
    );



    sectionTwoTexts
      .forEach(
        (
          text,
          index
        ) => {

          const count =
            sectionTwoTexts.length;



          const local =
            rangeProgress(

              progress,

              index /
              count,

              (
                index +
                1
              )
              /
              count
            );



          const enter =
            rangeProgress(

              local,

              0,

              CONFIG
                .sectionTwo
                .textEnterPortion
            );



          const exit =
            rangeProgress(

              local,

              CONFIG
                .sectionTwo
                .textExitStart,

              1
            );



          gsap.set(
            text,
            {

              opacity:
                enter *
                (
                  1 -
                  exit
                ),


              xPercent:

                gsap.utils
                  .interpolate(

                    CONFIG
                      .sectionTwo
                      .textStartX,

                    0,

                    enter
                  )

                +

                gsap.utils
                  .interpolate(

                    0,

                    CONFIG
                      .sectionTwo
                      .textExitX,

                    exit
                  )
            }
          );
        }
      );
  }



  // ============================================================
  // SECTION 2 LAYOUT
  // ============================================================

  function applySectionTwoLayout(
    totalProgress
  ) {

    const layout =
      CONFIG.sectionTwoLayout;



    const layoutProgress =
      rangeProgress(

        totalProgress,

        layout.start,

        layout.end
      );



    const left =
      gsap.utils.interpolate(

        0,

        layout.left,

        layoutProgress
      );



    const top =
      gsap.utils.interpolate(

        0,

        layout.top,

        layoutProgress
      );



    const width =
      gsap.utils.interpolate(

        100,

        layout.width,

        layoutProgress
      );



    const height =
      gsap.utils.interpolate(

        100,

        layout.height,

        layoutProgress
      );



    gsap.set(
      sectionTwoSequenceCanvas,
      {

        left:
          `${left}%`,

        top:
          `${top}%`,

        width:
          `${width}%`,

        height:
          `${height}%`
      }
    );



    sectionTwoRenderer.resize();
  }



  // ============================================================
  // MAIN SCROLL
  // ============================================================

  ScrollTrigger.create({

    trigger:
      stage,


    start:
      "top top",


    end:
      "bottom bottom",


    scrub:
      CONFIG.timeline.scrub,


    invalidateOnRefresh:
      true,



    onUpdate(
      self
    ) {

      const rawP =
        self.progress;


      const t =
        CONFIG.timeline;



      const p =
        Math.min(

          1,

          rawP

          /

          Math.max(

            0.001,

            t.mainExperienceEnd
          )
        );



      // ========================================================
      // SECTION 3 CONTENT
      // ========================================================

      window
        .PerlinRevealRegistry
        ?.update(
          p
        );



      // ========================================================
      // FINAL NOISE TRANSITION
      // ========================================================

      window
        .DottedTransitionRegistry
        ?.update(
          rawP
        );



      // ========================================================
      // FINAL TRANSITION RANGE
      // ========================================================

      if (

        rawP >=

        CONFIG
          .sectionThreeToFour
          .revealStart

      ) {

        /*
         * Make absolutely sure the sequence's
         * final frame is drawn before capturing it.
         */

        if (
          sequenceLast
        ) {

          sectionTwoRenderer
            .draw(
              sequenceLast
            );


          captureFinalTransitionSource();
        }



        return;
      }



      // ========================================================
      // HERO
      // ========================================================

      if (
        p <
        t.transitionOneStart
      ) {

        gsap.set(
          heroSection,
          {
            autoAlpha: 1
          }
        );


        gsap.set(
          transitionOneCanvas,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          sectionTwo,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          transitionTwoCanvas,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          sectionThree,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          sectionTwoSequenceCanvas,
          {

            autoAlpha:
              0,

            left:
              "0%",

            top:
              "0%",

            width:
              "100%",

            height:
              "100%"
          }
        );



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



      // ========================================================
      // TRANSITION 1
      // ========================================================

      if (
        p <
        t.transitionOneEnd
      ) {

        gsap.set(
          heroSection,
          {
            autoAlpha: 1
          }
        );


        gsap.set(
          sectionTwo,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          transitionOneCanvas,
          {
            autoAlpha: 1
          }
        );


        gsap.set(
          transitionTwoCanvas,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          sectionTwoSequenceCanvas,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          sectionThree,
          {
            autoAlpha: 0
          }
        );



        transitionOneRenderer
          .progress =
            rangeProgress(

              p,

              t.transitionOneStart,

              t.transitionOneEnd
            );



        transitionOneRenderer
          .render();


        return;
      }



      // ========================================================
      // TALL IMAGE
      // ========================================================

      if (
        p <
        t.transitionTwoStart
      ) {

        gsap.set(
          heroSection,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          transitionOneCanvas,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          sectionTwo,
          {
            autoAlpha: 1
          }
        );


        gsap.set(
          transitionTwoCanvas,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          sectionTwoSequenceCanvas,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          sectionThree,
          {
            autoAlpha: 0
          }
        );



        renderTallSection(

          rangeProgress(

            p,

            t.sectionTwoStart,

            t.sectionTwoEnd
          )
        );


        return;
      }



      // ========================================================
      // YELLOW ORGANIC TRANSITION
      // ========================================================

      if (
        p <
        t.transitionTwoEnd
      ) {

        gsap.set(
          heroSection,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          transitionOneCanvas,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          sectionTwo,
          {
            autoAlpha: 1
          }
        );


        renderTallSection(
          1
        );


        gsap.set(
          sectionTwoSequenceCanvas,
          {
            autoAlpha: 0
          }
        );


        gsap.set(
          transitionTwoCanvas,
          {
            autoAlpha: 1
          }
        );



        transitionTwoRenderer
          .progress =
            rangeProgress(

              p,

              t.transitionTwoStart,

              t.transitionTwoEnd
            );



        transitionTwoRenderer
          .render();


        return;
      }



      // ========================================================
      // SEQUENCE 2
      // ========================================================

      gsap.set(
        heroSection,
        {
          autoAlpha: 0
        }
      );


      gsap.set(
        transitionOneCanvas,
        {
          autoAlpha: 0
        }
      );


      gsap.set(
        sectionTwo,
        {
          autoAlpha: 0
        }
      );


      gsap.set(
        transitionTwoCanvas,
        {
          autoAlpha: 0
        }
      );


      gsap.set(
        sectionTwoSequenceCanvas,
        {
          autoAlpha: 1
        }
      );



      applySectionTwoLayout(
        p
      );



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



      // ========================================================
      // SECTION 3
      // ========================================================

      const sectionThreeFade =
        rangeProgress(

          p,

          CONFIG
            .sectionThree
            .fadeStart,

          CONFIG
            .sectionThree
            .fadeEnd
        );



      gsap.set(
        sectionThree,
        {

          opacity:
            sectionThreeFade,


          visibility:

            sectionThreeFade <=
            0.001

              ? "hidden"

              : "visible"
        }
      );



      // ========================================================
      // FINAL FRAME HOLD + SOURCE CAPTURE
      // ========================================================

      if (
        p >=
          t.finalHoldStart

        &&

        sequenceLast
      ) {

        sectionTwoRenderer
          .draw(
            sequenceLast
          );


        captureFinalTransitionSource();
      }
    }
  });



  // ============================================================
  // DAT.GUI
  // ============================================================

  if (
    window.dat?.GUI
  ) {

    const gui =
      new window.dat.GUI({

        name:
          "Experience Controls",

        width:
          340
      });



    // ==========================================================
    // TIMELINE
    // ==========================================================

    const timelineFolder =
      gui.addFolder(
        "Timeline"
      );



    timelineFolder
      .add(

        CONFIG.sectionTwoLayout,

        "start",

        0.72,

        0.95,

        0.001
      )
      .name(
        "layoutStart"
      );



    timelineFolder
      .add(

        CONFIG.sectionTwoLayout,

        "end",

        0.75,

        1,

        0.001
      )
      .name(
        "layoutEnd"
      );



    // ==========================================================
    // YELLOW ORGANIC TRANSITION
    // ==========================================================

    const transitionFolder =
      gui.addFolder(
        "Yellow Organic Reveal"
      );



    const s =
      transitionTwoRenderer
        .settings;



    transitionFolder
      .add(
        s,
        "yellowStart",
        0,
        0.8,
        0.005
      )
      .name(
        "Yellow start"
      );



    transitionFolder
      .add(
        s,
        "yellowEnd",
        0.05,
        0.9,
        0.005
      )
      .name(
        "Yellow end"
      );



    transitionFolder
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



    transitionFolder
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



    transitionFolder
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



    transitionFolder
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



    transitionFolder
      .add(
        s,
        "openingScale",
        0.6,
        1.8,
        0.01
      )
      .name(
        "Opening scale"
      );



    transitionFolder
      .add(
        s,
        "softness",
        0.01,
        0.25,
        0.005
      )
      .name(
        "Softness"
      );



    transitionFolder
      .add(
        s,
        "edgeIrregularity",
        0,
        0.35,
        0.005
      )
      .name(
        "Edge irregularity"
      );



    transitionFolder
      .add(
        s,
        "shapeStretchX",
        0.5,
        1.8,
        0.01
      )
      .name(
        "Shape stretch X"
      );



    transitionFolder
      .add(
        s,
        "shapeStretchY",
        0.5,
        1.8,
        0.01
      )
      .name(
        "Shape stretch Y"
      );



    transitionFolder
      .add(
        s,
        "paperNoise",
        0,
        0.12,
        0.005
      )
      .name(
        "Paper grain"
      );



    transitionFolder
      .add(
        s,
        "vignette",
        0,
        0.5,
        0.01
      )
      .name(
        "Vignette"
      );



    transitionFolder
      .addColor(
        s,
        "yellowColor"
      )
      .name(
        "Yellow color"
      )
      .onChange(
        () => {

          transitionTwoRenderer
            .render();
        }
      );



    transitionFolder
      .add(
        s,
        "yellowOpacity",
        0,
        1,
        0.01
      )
      .name(
        "Yellow opacity"
      );



    // ==========================================================
    // SECTION 2 LAYOUT
    // ==========================================================

    const layoutFolder =
      gui.addFolder(
        "Section 2 Layout"
      );



    const layout =
      CONFIG.sectionTwoLayout;



    layoutFolder
      .add(
        layout,
        "left",
        0,
        30,
        0.5
      )
      .name(
        "left"
      );



    layoutFolder
      .add(
        layout,
        "top",
        0,
        30,
        0.5
      )
      .name(
        "top"
      );



    layoutFolder
      .add(
        layout,
        "width",
        20,
        100,
        0.5
      )
      .name(
        "width"
      );



    layoutFolder
      .add(
        layout,
        "height",
        30,
        100,
        0.5
      )
      .name(
        "height"
      );



    timelineFolder.open();

    transitionFolder.open();

    layoutFolder.open();



    window
      .PerlinRevealRegistry
      ?.addGUI(
        gui
      );



    window
      .DottedTransitionRegistry
      ?.addGUI(
        gui
      );



    window.EXPERIENCE_GUI =
      gui;
  }



  // ============================================================
  // RESIZE
  // ============================================================

  let resizeTimer;



  addEventListener(

    "resize",

    () => {

      clearTimeout(
        resizeTimer
      );



      resizeTimer =
        setTimeout(
          () => {

            resizeAll();



            finalViewportCrop =
              captureFinalViewportCrop();



            transitionTwoRenderer
              .setImages(

                finalViewportCrop,

                sequenceFirst
              );



            /*
             * Canvas size changed.
             * Allow the final sequence frame
             * to be captured again.
             */

            finalTransitionSourceCaptured =
              false;



            ScrollTrigger
              .refresh();

          },

          180
        );
    },

    {
      passive: true
    }
  );



  // ============================================================
  // INITIAL SYNC
  // ============================================================

  requestAnimationFrame(
    () => {

      ScrollTrigger.refresh();

      ScrollTrigger.update();

    }
  );

});
