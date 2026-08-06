window.EXPERIENCE_CONFIG = {
  hero: {
    folder: "https://cdn.jsdelivr.net/gh/prity-dhara/image-sequence-webflow-test@main/frames/hero/desktop/",
    fallbackFolder: "https://raw.githubusercontent.com/prity-dhara/image-sequence-webflow-test/main/frames/hero/desktop/",
    frameCount: 362,
    prefix: "f_",
    extension: "webp",
    padding: 3
  },

  sectionTwoSequence: {
    folder: "https://cdn.jsdelivr.net/gh/prity-dhara/image-sequence-webflow-test@main/frames/Section%202/Desktop/",
    fallbackFolder: "https://raw.githubusercontent.com/prity-dhara/image-sequence-webflow-test/main/frames/Section%202/Desktop/",

    /*
      IMPORTANT:
      Change this to the real number of files in:
      frames/Section 2/Desktop/

      Example:
      final file f_180.webp => frameCount: 180
    */
    frameCount: 120,

    prefix: "f_",
    extension: "webp",
    padding: 3
  },

  timeline: {
    /*
     * Raw ScrollTrigger progress allocated to the existing experience.
     * 0.84 means Hero → Section 3 completes in the first 84%.
     * The remaining progress is reserved for Section 3 → Section 4.
     */
    mainExperienceEnd: 0.84,

    heroStart: 0.00,
    heroEnd: 0.28,

    transitionOneStart: 0.28,
    transitionOneEnd: 0.39,

    sectionTwoStart: 0.39,
    sectionTwoEnd: 0.64,

    transitionTwoStart: 0.64,
    transitionTwoEnd: 0.73,

    sectionTwoSequenceStart: 0.73,
    sectionTwoSequenceEnd: 0.96,

    finalHoldStart: 0.96,
    finalHoldEnd: 1.00,

    scrub: 0.12
  },

  transitionOne: {
    startSize: 0.035,
    cornerRadius: 0.055,
    edgeSoftness: 0.012,
    noiseScale: 760,
    noiseAmount: 0.055,
    edgeBand: 0.035,
    distortion: 0.008,
    grain: 0.015,
    centerX: 0.5,
    centerY: 0.5
  },

  transitionTwo: {
    startSize: 0.025,
    cornerRadius: 0.04,
    edgeSoftness: 0.018,
    noiseScale: 900,
    noiseAmount: 0.085,
    edgeBand: 0.075,
    distortion: 0.012,
    grain: 0.025,
    centerX: 0.5,
    centerY: 0.5
  },

  sectionTwo: {
    textEnterPortion: 0.24,
    textExitStart: 0.72,
    textStartX: 75,
    textExitX: -30
  },

  sectionTwoLayout: {
    start: 0.80,
    end: 0.91,
    left: 4,
    top: 12,
    width: 42,
    height: 76
  },


  sectionThree: {
    /*
     * SECTION 3 PANEL FADE
     * The right-side panel begins appearing while the image finishes
     * its center-left layout movement.
     */
    fadeStart: 0.90,
    fadeEnd: 0.93
  },

  perlinReveal: {
    /*
     * TIMELINE
     * Reveal starts after the Section 2 image reaches its left layout.
     */
    revealStart: 0.91,
    revealEnd: 0.99,
    shaderStart: 0.22,

    /*
     * PERLIN NOISE
     * Large cloudy organic reveal shapes.
     */
    noiseX: 8,
    noiseY: 6,
    noiseZ: 4,
    perlinStrength: 0.85,

    /*
     * BLUE-NOISE BREAKUP
     * Smaller particles and texture around the reveal edge.
     */
    blueNoiseStrength: 0.18,

    /*
     * ORGANIC EDGE
     * Controls the softness and width of the dissolve boundary.
     */
    edgeWidth: 0.075,

    /*
     * BLUR HALO
     * Soft cloudy materialisation before the text becomes sharp.
     */
    blurStrength: 1,

    /*
     * FILM GRAIN
     * Fine texture applied during the reveal.
     */
    grain: 0.025,

    /*
     * DISTORTION
     * Subtle texture movement around the reveal front.
     */
    distortion: 0.006,

    /*
     * RENDERING
     */
    maxDPR: 1.5
  },


  sectionThreeToFour: {
    /*
     * RAW SCROLL TIMELINE
     * This transition begins only after Section 3 is fully visible.
     */
    revealStart: 0.84,
    revealEnd: 0.99,

    /*
     * DOTTED / BLUE-NOISE EDGE
     * Same visual family used by transition_canvas-2-img.
     */
    edgeSoftness: 0.012,
    shapeScale: 6.5,
    irregularity: 0.09,
    dotScale: 2.6,
    dustBand: 0.15,
    distortion: 0.006,
    grain: 0.03,
    edgeOpacity: 0.72,
    edgeColor: "#e8dec7",

    /*
     * Accepted direction:
     * scrolling down reveals Section 4 from top to bottom.
     */
    direction: "Top to bottom",

    maxDPR: 1.5
  },

  performance: {
    initialPreload: 30,
    preloadRadius: 18,
    maxConcurrent: 8,
    desktopDPR: 1.5,
    mobileDPR: 1
  }
};
