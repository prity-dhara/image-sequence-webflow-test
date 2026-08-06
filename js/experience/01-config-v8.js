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
    // Section 3 panel fades in while the image completes its left layout.
    fadeStart: 0.90,
    fadeEnd: 0.93,

    // Unified text reveal starts only after the image is fully placed left.
    contentRevealStart: 0.91,
    contentRevealEnd: 0.99,

    // Shader reveal starts partway through its internal dissolve range.
    shaderStart: 0.22,

    // Right-side content area width.
    contentWidth: 50
  },

  performance: {
    initialPreload: 30,
    preloadRadius: 18,
    maxConcurrent: 8,
    desktopDPR: 1.5,
    mobileDPR: 1
  }
};
