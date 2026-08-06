window.EXPERIENCE_CONFIG = {
  hero: {
    folder:
      "https://cdn.jsdelivr.net/gh/prity-dhara/image-sequence-webflow-test@main/frames/hero/desktop/",

    fallbackFolder:
      "https://raw.githubusercontent.com/prity-dhara/image-sequence-webflow-test/main/frames/hero/desktop/",

    frameCount: 362,
    prefix: "f_",
    extension: "webp",
    padding: 3
  },

  sectionTwoSequence: {
    folder:
      "https://cdn.jsdelivr.net/gh/prity-dhara/image-sequence-webflow-test@main/frames/Section%202/Desktop/",

    fallbackFolder:
      "https://raw.githubusercontent.com/prity-dhara/image-sequence-webflow-test/main/frames/Section%202/Desktop/",

    /*
      Change this to your actual total frame count.
      Example: if the final frame is f_180.webp, use 180.
    */
    frameCount: 100,

    prefix: "f_",
    extension: "webp",
    padding: 3
  },

  timeline: {
    heroStart: 0,
    heroEnd: 0.27,

    transitionStart: 0.27,
    transitionEnd: 0.37,

    sectionTwoStart: 0.37,
    sectionTwoEnd: 0.67,

    sectionTwoSequenceStart: 0.67,
    sectionTwoSequenceEnd: 0.96,

    finalHoldStart: 0.96,
    finalHoldEnd: 1,

    scrub: 0.12
  },

  transition: {
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

  sectionTwo: {
    textEnterPortion: 0.24,
    textExitStart: 0.72,
    textStartX: 75,
    textExitX: -30
  },

  performance: {
    initialPreload: 30,
    preloadRadius: 18,
    maxConcurrent: 8,
    desktopDPR: 1.5,
    mobileDPR: 1
  }
};
