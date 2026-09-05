import { useMemo } from 'react';
import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ditherRamp, palette } from '@/theme/tokens';

/**
 * Ordered-dither (Bayer 8x8) halftone of a slow domain-warped flow field.
 *
 * Ported from `design/src/dither-field.js`, which is WebGL/GLSL. The field
 * math below is verbatim from that shader; only the things GLSL and SkSL
 * genuinely disagree about were changed:
 *
 *  - Entry point. GLSL writes `gl_FragColor`; SkSL returns a `half4` from
 *    `main(float2 fragCoord)`.
 *  - Fragcoord origin. GLSL's is bottom-left, SkSL's is top-left. The original
 *    puts its radial falloff at (0.72, 0.88) so the field reads as light
 *    entering from the top-right. Ported literally that lands bottom-right, so
 *    `uv.y` is flipped once, immediately, and every line after it is unchanged.
 *  - Types. `vec2`/`vec3` -> `float2`/`float3`, and the `precision` qualifier
 *    has no SkSL equivalent.
 *  - Parameter mutation. `fbm` advances its own argument across octaves, which
 *    SkSL will not allow on a parameter, so it copies to a local first.
 */
const SKSL = `
uniform float2 u_res;
uniform float u_t;
uniform float u_cell;
uniform float u_levels;
uniform float u_int;
uniform float u_contour;
uniform float3 r1;
uniform float3 r2;
uniform float3 r3;
uniform float3 cbg;

float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123); }

float vnoise(float2 p) {
  float2 i = floor(p), f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x),
             mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}

float fbm(float2 p) {
  float2 sp = p;
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 5; k++) { v += a * vnoise(sp); sp = sp * 2.03 + float2(1.7, 9.2); a *= 0.5; }
  return v;
}

// recursive Bayer thresholds
float bayer2(float2 a) { float2 b = floor(a); return fract(b.x / 2.0 + b.y * b.y * 0.75); }
float bayer4(float2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(float2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

half4 main(float2 fragCoord) {
  // snap to chunky cells so the dither pattern is visible, not pixel noise
  float2 cellCo = floor(fragCoord / u_cell);
  float2 snapped = cellCo * u_cell;
  float2 uv = snapped / u_res;
  uv.y = 1.0 - uv.y;               // SkSL origin is top-left; GLSL's was bottom-left
  float2 q = float2(uv.x * (u_res.x / max(u_res.y, 1.0)), uv.y) * 2.1;

  float t = u_t;
  // domain warp - two octaves of offset before the main field
  float2 w = float2(fbm(q * 0.9 + float2(0.0, t * 0.8)), fbm(q * 0.9 + float2(4.3, -t * 0.6)));
  float f = fbm(q + w * 1.25 + float2(t * 0.35, t * 0.12));

  // radial falloff so the field reads as light entering the frame, not wallpaper
  float fall = smoothstep(1.05, 0.05, length((uv - float2(0.72, 0.88)) * float2(0.85, 1.0)) * 1.05);
  float v = clamp((f - 0.24) * 2.5, 0.0, 1.0) * fall * u_int;

  float thr = bayer8(cellCo) - 0.5;
  float steps = max(u_levels, 1.0);
  float qv = floor(v * steps + thr + 0.5) / steps;   // ordered-dither quantize
  qv = clamp(qv, 0.0, 1.0);

  // 3-stop ramp over the base surface
  float3 col = mix(cbg, r1, clamp(qv * 3.0, 0.0, 1.0));
  col = mix(col, r2, clamp(qv * 3.0 - 1.0, 0.0, 1.0));
  col = mix(col, r3, clamp(qv * 3.0 - 2.0, 0.0, 1.0));

  // optional hairline contours where the continuous field crosses a level edge
  if (u_contour > 0.001) {
    float e = fract(v * steps);
    float line = 1.0 - smoothstep(0.0, 0.16, min(e, 1.0 - e));
    col += line * u_contour * 0.14 * fall;
  }

  return half4(col.r, col.g, col.b, 1.0);
}
`;

/**
 * Compiled once, lazily.
 *
 * Not at module scope: that would run before the Skia native module is
 * guaranteed loaded, and on web before CanvasKit is fetched. `Make` returns
 * null on a compile error rather than throwing, so a shader that fails to
 * build degrades to a flat background — which is what the original WebGL
 * version does when it cannot get a context.
 */
let compiled: ReturnType<typeof Skia.RuntimeEffect.Make> | undefined;
function effect() {
  if (compiled === undefined) {
    compiled = Skia.RuntimeEffect.Make(SKSL);
    if (compiled === null) console.warn('dither-field: shader failed to compile');
  }
  return compiled;
}

/** '#RRGGBB' -> [r, g, b] in 0..1, which is what the shader's float3 uniforms want. */
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

type Props = {
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
  /** Tones layered over `bg`, dark -> light. */
  ramp?: readonly [string, string, string];
  bg?: string;
  /** Field drift. The design uses 0.05 — slow enough to read as ambient. */
  speed?: number;
  /** Tone steps before dithering. */
  levels?: number;
  /** Dither cell size in px. Below ~3 the pattern reads as noise, not halftone. */
  cell?: number;
  /** Overall field strength. 0 renders a flat `bg`. */
  intensity?: number;
  /** 0..1 amount of hairline contour at level edges. */
  contour?: number;
};

export function DitherField({
  width,
  height,
  style,
  ramp = ditherRamp,
  bg = palette.bg,
  speed = 0.05,
  levels = 6,
  cell = 4,
  intensity = 0.85,
  contour = 0.55,
}: Props) {
  const clock = useClock();
  const source = useMemo(() => effect(), []);
  // Colour parsing uses String/Array helpers that live on the JS runtime.
  // Precompute these values here rather than synchronously calling `rgb`
  // from Reanimated's UI worklet below.
  const colors = useMemo(
    () => ({ r1: rgb(ramp[0]), r2: rgb(ramp[1]), r3: rgb(ramp[2]), cbg: rgb(bg) }),
    [bg, ramp],
  );

  const uniforms = useDerivedValue(() => ({
    u_res: [width, height],
    u_t: (clock.value / 1000) * speed,
    u_cell: cell,
    u_levels: levels,
    u_int: intensity,
    u_contour: contour,
    r1: colors.r1,
    r2: colors.r2,
    r3: colors.r3,
    cbg: colors.cbg,
  }));

  if (!source) {
    return <View style={[{ width, height, backgroundColor: bg }, style]} />;
  }

  return (
    <Canvas style={[{ width, height }, style]}>
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}

/**
 * The field is drawn behind content that has to stay readable, so the design
 * lays a bottom-anchored fade over it. Kept next to the shader because the two
 * are never used apart.
 */
export const ditherFadeStyle = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
