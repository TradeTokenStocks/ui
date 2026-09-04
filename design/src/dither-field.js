// <dither-field> — ordered-dither (Bayer 8×8) halftone of a slow domain-warped flow field.
// Chunky quantized cells, hard tone steps, no blur. Attributes:
//   ramp="#hex,#hex,#hex"  tones layered over bg (dark → light)
//   bg="#hex"              base surface
//   speed="0.05"           field drift
//   levels="5"             tone steps before dithering
//   cell="3"               dither cell size in CSS px
//   intensity="1"          overall field strength (0 = flat bg)
//   contour="0"            0..1 amount of thin contour lines at level edges
(function () {
  if (window.customElements && customElements.get('dither-field')) return;

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';

  const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_t, u_cell, u_levels, u_int, u_contour;
uniform vec3 r1, r2, r3, cbg;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 5; k++){ v += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

// recursive Bayer thresholds
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main(){
  // snap to chunky cells so the dither pattern is visible, not pixel noise
  vec2 cellCo = floor(gl_FragCoord.xy / u_cell);
  vec2 snapped = cellCo * u_cell;
  vec2 uv = snapped / u_res;
  vec2 q = vec2(uv.x * (u_res.x / max(u_res.y, 1.0)), uv.y) * 2.1;

  float t = u_t;
  // domain warp — two octaves of offset before the main field
  vec2 w = vec2(fbm(q * 0.9 + vec2(0.0, t * 0.8)), fbm(q * 0.9 + vec2(4.3, -t * 0.6)));
  float f = fbm(q + w * 1.25 + vec2(t * 0.35, t * 0.12));

  // radial falloff so the field reads as light entering the frame, not wallpaper
  float fall = smoothstep(1.05, 0.05, length((uv - vec2(0.72, 0.88)) * vec2(0.85, 1.0)) * 1.05);
  float v = clamp((f - 0.24) * 2.5, 0.0, 1.0) * fall * u_int;

  float thr = bayer8(cellCo) - 0.5;
  float steps = max(u_levels, 1.0);
  float qv = floor(v * steps + thr + 0.5) / steps;   // ordered-dither quantize
  qv = clamp(qv, 0.0, 1.0);

  // 3-stop ramp over the base surface
  vec3 col = mix(cbg, r1, clamp(qv * 3.0, 0.0, 1.0));
  col = mix(col, r2, clamp(qv * 3.0 - 1.0, 0.0, 1.0));
  col = mix(col, r3, clamp(qv * 3.0 - 2.0, 0.0, 1.0));

  // optional hairline contours where the continuous field crosses a level edge
  if (u_contour > 0.001){
    float e = fract(v * steps);
    float line = 1.0 - smoothstep(0.0, 0.16, min(e, 1.0 - e));
    col += line * u_contour * 0.14 * fall;
  }

  gl_FragColor = vec4(col, 1.0);
}`;
  // (host element / WebGL plumbing omitted — the RN port uses Skia's RuntimeEffect
  //  and does not need the custom-element wrapper. Shader body above is verbatim.)
})();
