/**
 * SECTION 3 UNIFIED REVEAL INTEGRATION NOTES
 *
 * Use this file as the integration reference for your existing scroll engine.
 *
 * Required HTML:
 *
 * <div class="section_3">
 *   <div class="section-3-content">
 *     <div class="section_3-content-inner">
 *       <div class="section_3-content-wrap">
 *         <div class="section_3-content-real">
 *           ...your real heading/content...
 *         </div>
 *         <canvas class="section-3-content-reveal"></canvas>
 *       </div>
 *     </div>
 *   </div>
 * </div>
 *
 * Required layout:
 * - .section_3 is right: 0; width: 50%; height: 100%
 * - .section-3-content-reveal is absolute; inset: 0
 * - Section 2 image remains left: 4%; top: 12%; width: 42%; height: 76%
 *
 * Trigger order:
 * 1. Section 2 sequence reaches final frames.
 * 2. Image moves to left layout.
 * 3. Section 3 fades in.
 * 4. Unified reveal runs only after image layout progress reaches 1.
 * 5. Reveal canvas hides.
 * 6. Real DOM content becomes visible.
 *
 * Timing:
 *
 * const revealProgress = rangeProgress(
 *   p,
 *   CONFIG.sectionThree.contentRevealStart,
 *   CONFIG.sectionThree.contentRevealEnd
 * );
 *
 * uniforms.time.value = gsap.utils.interpolate(
 *   CONFIG.sectionThree.shaderStart,
 *   1,
 *   revealProgress
 * );
 */
