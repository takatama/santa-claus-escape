// Complete paintings keep hat, face, collar, torso and boots in one image.
// Both expressions use the identical full-body destination rectangle.
export const WIZARD_PARTS={
  closed:{source:[0,0,642,760],target:[0,0,1,1]},
  smile:{source:[642,0,643,760],target:[0,0,1,1]},
  blink:{source:[0,0,642,760],target:[0,0,1,1]},
  // The upper-right corner still contains a small piece of the removed cuff.
  // Clip it in sprite-local pixels, preserving the wrist and user positioning.
  hand:{source:[166,912,204,215],target:[.142,.405,.188,.171],pivot:[.33,.485],
    clip:[[0,0],[184,0],[184,80],[204,80],[204,215],[0,215]]},
};
