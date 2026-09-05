import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Body } from '@/components/ui/text';
import { fill, ink, palette, radius, shadow } from '@/theme/tokens';

export type NavKey = 'portfolio' | 'strategies';

type Props = {
  value: NavKey;
  onChange: (key: NavKey) => void;
  onCreate: () => void;
};

/**
 * Two destinations plus the verb.
 *
 * The design arrived here by elimination: Events and Activity were never
 * places, they are ways of reading the holdings already on screen, so they
 * became segments and freed the bar. What is left is the only two places worth
 * going and the app's single write action — which sits outside the bar so it
 * never reads as a third destination, and is the only saturated element at the
 * bottom of the screen so the eye finds it without hunting.
 */
export function BottomNav({ value, onChange, onCreate }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.bar}>
        <NavTab
          label="Portfolio"
          active={value === 'portfolio'}
          onPress={() => onChange('portfolio')}
          icon={<PortfolioGlyph />}
        />
        <NavTab
          label="Strategies"
          active={value === 'strategies'}
          onPress={() => onChange('strategies')}
          icon={<StrategiesGlyph />}
        />
      </View>

      <Pressable
        onPress={onCreate}
        accessibilityRole="button"
        accessibilityLabel="Open a new strategy"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
        <LinearGradient
          colors={[palette.cobalt, palette.cobaltDeep]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.plusBarH} />
        <View style={styles.plusBarV} />
      </Pressable>
    </View>
  );
}

function NavTab({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tab, { backgroundColor: active ? fill.active : fill.subtle }]}>
      <View style={{ opacity: active ? 1 : 0.55 }}>{icon}</View>
      <Body size={12.5} weight="semibold" color={active ? ink.primary : ink.quaternary}>
        {label}
      </Body>
    </Pressable>
  );
}

/**
 * Both glyphs are built from plain views rather than an icon font or SVG.
 * They are four rectangles between them, and the design dims the internals
 * rather than swapping shapes for the inactive state — so an inactive icon
 * keeps its silhouette and only loses weight.
 */
function PortfolioGlyph() {
  return (
    <View style={styles.glyphGrid}>
      <View style={styles.gridCell} />
      <View style={[styles.gridCell, styles.gridCellDim]} />
      <View style={[styles.gridCell, styles.gridCellDim]} />
      <View style={styles.gridCell} />
    </View>
  );
}

function StrategiesGlyph() {
  return (
    <View style={styles.glyphBars}>
      <View style={styles.bar1} />
      <View style={styles.bar2} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(18,20,24,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.nav,
    padding: 5,
    ...shadow.nav,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.navTab,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...shadow.accent,
  },
  fabPressed: { transform: [{ scale: 0.94 }] },
  plusBarH: { position: 'absolute', width: 18, height: 3, borderRadius: 1.5, backgroundColor: '#fff' },
  plusBarV: { position: 'absolute', width: 3, height: 18, borderRadius: 1.5, backgroundColor: '#fff' },

  glyphGrid: { width: 15, height: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 2.5 },
  gridCell: {
    width: 6.25,
    height: 6.25,
    borderRadius: 2.5,
    backgroundColor: ink.primary,
  },
  gridCellDim: { opacity: 0.45 },
  glyphBars: { width: 15, height: 15, justifyContent: 'center', gap: 4 },
  bar1: { height: 3, width: '100%', borderRadius: 1.5, backgroundColor: ink.primary },
  bar2: { height: 3, width: '58%', borderRadius: 1.5, backgroundColor: ink.primary, opacity: 0.45 },
});
