// The vexflow/bravura entry registers the fonts; wait until the browser has them.
export const fontsReady: Promise<unknown> = Promise.all([
  document.fonts.load('30px Bravura'),
  document.fonts.load('12px Academico'),
  document.fonts.load('15px "EB Garamond Variable"'),
])
