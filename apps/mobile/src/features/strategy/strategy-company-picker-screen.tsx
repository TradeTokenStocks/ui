import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { Body, Display, Num } from '@/components/ui/text';
import { executableTotalUsd, formatUsd } from '@tradetoken/domain';
import { companies, companyDetails } from '@tradetoken/domain/fixtures';
import { fill, ink, palette, radius, space, stroke } from '@/theme/tokens';
import { goBackOrHome } from '@/navigation/go-back';

/**
 * Step 1 of opening a strategy: which company. A strategy is always about a
 * specific holding, so this is what the dock's + and the Strategies tab's
 * empty state land on — the company is chosen before the strategy type,
 * matching the product's real ordering (see strategy/type.tsx next).
 *
 * Only companies with executable (onchain) balance are eligible: a strategy
 * can only ever settle against wallet inventory, never brokerage-observed
 * shares.
 */
export function StrategyCompanyPickerScreen() {
  const insets = useSafeAreaInsets();
  const eligible = companies.reduce<{ company: (typeof companies)[number]; executableUsd: number }[]>(
    (acc, company) => {
      const detail = companyDetails[company.ticker];
      // Guards fixture drift (a `companies` entry with no matching
      // `companyDetails` row) rather than crashing the whole screen over it.
      const executableUsd = detail ? executableTotalUsd(detail) : 0;
      if (executableUsd > 0) acc.push({ company, executableUsd });
      return acc;
    },
    [],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={goBackOrHome} />
          <Display size={22}>New strategy</Display>
          <View style={styles.headerSpacer} />
        </View>
        <Body size={12.5} color={ink.tertiary} style={styles.subtitle}>
          Choose a company. Only onchain, allocatable balances are eligible.
        </Body>

        {eligible.length === 0 ? (
          <View style={styles.empty}>
            <Body size={13.5} weight="semibold">
              Nothing eligible yet
            </Body>
            <Body size={12.5} color={ink.tertiary} style={styles.emptyBody}>
              A strategy can only draw on onchain balances. Add funds or bring a holding onchain
              first.
            </Body>
          </View>
        ) : (
          <View style={styles.list}>
            {eligible.map(({ company, executableUsd }, index) => (
              <Pressable
                key={company.ticker}
                onPress={() => router.push({ pathname: '/strategy/type', params: { ticker: company.ticker } })}
                style={({ pressed }) => [
                  styles.row,
                  index !== eligible.length - 1 && styles.rowBorder,
                  pressed && { backgroundColor: fill.press },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${company.name}. ${formatUsd(executableUsd)} onchain and allocatable.`}>
                <View style={styles.tile}>
                  <Body size={11.5} weight="semibold" color="rgba(242,243,245,0.8)">
                    {company.initials}
                  </Body>
                </View>
                <View style={styles.rowBody}>
                  <Body size={14} weight="semibold">
                    {company.name}
                  </Body>
                  <Num size={11.5} color={ink.quaternary} style={styles.rowSub}>
                    {company.ticker} · onchain and allocatable
                  </Num>
                </View>
                <Num size={14} weight="medium">
                  {formatUsd(executableUsd)}
                </Num>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: space.gutter, paddingBottom: 42 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 32 },
  subtitle: { marginTop: 10, lineHeight: 18 },

  empty: {
    marginTop: 22,
    padding: 18,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
  emptyBody: { marginTop: 7, lineHeight: 19 },

  list: {
    marginTop: 20,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: stroke.hairline,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: stroke.hairline },
  tile: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: stroke.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowSub: { marginTop: 2 },
});
