window.EXPERIENCE_CONFIG = {
  hero: {
    folder: "https://cdn.jsdelivr.net/gh/prity-dhara/image-sequence-webflow-test@main/frames/hero/desktop/",
    fallbackFolder: "https://raw.githubusercontent.com/prity-dhara/image-sequence-webflow-test/main/frames/hero/desktop/",
    frameCount: 362,
    prefix: "f_",
    extension: "webp",
    padding: 3
  },

  timeline: {
    heroStart: 0.00,
    heroEnd: 0.34,
    transitionStart: 0.34,
    transitionEnd: 0.47,
    sectionTwoStart: 0.47,
    sectionTwoEnd: 0.96,
    sectionTwoFadeStart: 0.93,
    sectionTwoFadeEnd: 1.00,
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
    travelVH: 200,
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
