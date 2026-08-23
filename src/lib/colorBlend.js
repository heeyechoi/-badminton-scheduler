function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

/** Mixes a hex color toward white — used to derive a light card-background tint from a custom base color. */
export function lightenHex(hex, amount = 0.85) {
  const { r, g, b } = hexToRgb(hex)
  const mix = (c) => c + (255 - c) * amount
  return rgbToHex(mix(r), mix(g), mix(b))
}
