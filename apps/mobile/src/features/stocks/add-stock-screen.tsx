import { useState } from "react";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DividendPreference, TokenizedStock } from "@tradetoken/domain";
import {
  pairedRepresentations,
  tokenizedStocks,
  wallet,
} from "@tradetoken/domain/fixtures";

import { BackButton } from "@/components/ui/back-button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Body, Display, Num } from "@/components/ui/text";
import {
  fill,
  ink,
  palette,
  radius,
  shadow,
  space,
  stroke,
} from "@/theme/tokens";

import { addStockHolding } from "./stock-holdings-store";
import { useAddLiveStockPair } from "./use-add-live-stock-pair";

type Step = 1 | 2 | 3;

export function AddStockScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState<TokenizedStock | null>(null);
  const [amount, setAmount] = useState("500");
  const [preference, setPreference] = useState<DividendPreference>("drip");
  const normalized = query.trim().toLowerCase();
  const rows = tokenizedStocks.filter(
    (item) =>
      item.issuer === "dinari" &&
      (!normalized ||
        `${item.name} ${item.ticker}`.toLowerCase().includes(normalized)),
  );
  const amountUsd = Number(amount) || 0;
  const live = useAddLiveStockPair();

  const goBack = () => {
    if (step === 1) router.back();
    else setStep((step - 1) as 1 | 2);
  };

  const confirm = async () => {
    if (!stock || amountUsd <= 0) return;
    if (live.deploymentReady) {
      const [tokenA, tokenB] = pairedRepresentations(stock.ticker);
      if (!tokenA || !tokenB) return;
      try {
        await live.addPair({
          tokenAId: tokenA.id,
          tokenBId: tokenB.id,
          amountUsd: amount,
          priceUsd: stock.priceUsd,
        });
      } catch {
        return;
      }
    }
    addStockHolding(stock.ticker, amountUsd, preference);
    router.replace("/");
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={goBack} />
        <View style={styles.headerCopy}>
          <Body size={15} weight="semibold">
            Add stock
          </Body>
          <Body size={11} color={ink.quaternary}>
            {step === 1
              ? "Choose the company"
              : step === 2
                ? "Set amount and dividends"
                : "Review tokenization"}
          </Body>
        </View>
        <Num size={10.5} color={ink.faint}>
          {step} / 3
        </Num>
      </View>

      <View style={styles.progress}>
        {[1, 2, 3].map((item) => (
          <View
            key={item}
            style={[styles.progressBar, item <= step && styles.progressActive]}
          />
        ))}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 112 },
        ]}
      >
        {step === 1 ? (
          <>
            <Display size={30}>What do you want to add?</Display>
            <Body size={12.5} color={ink.tertiary} style={styles.intro}>
              Choose a company. The sandbox prepares both Dinari and xStock
              representations for the strategy demo.
            </Body>
            <View style={styles.search}>
              <Body size={16} color={ink.faint}>
                ⌕
              </Body>
              <TextInput
                value={query}
                onChangeText={setQuery}
                inputMode="search"
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="Search stocks"
                placeholderTextColor={ink.faint}
                selectionColor={palette.cobalt}
                underlineColorAndroid="transparent"
                style={styles.searchInput}
              />
            </View>
            <View style={styles.catalog}>
              {rows.map((item, index) => (
                <Pressable
                  key={item.ticker}
                  onPress={() => {
                    setStock(item);
                    setStep(2);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${item.name}, ${item.ticker}`}
                  style={({ pressed }) => [
                    styles.stockRow,
                    index > 0 && styles.divided,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.stockMark}>
                    <Body size={10.5} weight="semibold">
                      {item.ticker.slice(0, 2)}
                    </Body>
                  </View>
                  <View style={styles.flex}>
                    <Body size={14} weight="semibold">
                      {item.name}
                    </Body>
                    <Num size={10.5} color={ink.faint} style={styles.sub}>
                      {item.ticker} · dividend{" "}
                      {item.dividendYieldPct.toFixed(2)}%
                    </Num>
                  </View>
                  <View style={styles.trailing}>
                    <Num size={12.5}>${item.priceUsd.toFixed(2)}</Num>
                    <Body size={10} color={ink.faint} style={styles.sub}>
                      Dinari + xStock
                    </Body>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {step === 2 && stock ? (
          <>
            <Display size={30}>Set up {stock.ticker}</Display>
            <View style={[styles.panel, styles.selectedStock]}>
              <View style={styles.stockMark}>
                <Body size={10.5} weight="semibold">
                  {stock.ticker.slice(0, 2)}
                </Body>
              </View>
              <View style={styles.flex}>
                <Body size={14} weight="semibold">
                  {stock.name}
                </Body>
                <Num size={10.5} color={ink.faint}>
                  {stock.ticker} · ${stock.priceUsd.toFixed(2)}
                </Num>
              </View>
              <Pressable onPress={() => setStep(1)}>
                <Body size={11.5} weight="semibold" color={palette.cobaltText}>
                  Change
                </Body>
              </Pressable>
            </View>

            <Body
              size={10.5}
              weight="semibold"
              color={ink.faint}
              style={styles.label}
            >
              Allocation
            </Body>
            <View style={styles.amountBox}>
              <Body size={24} color={ink.faint}>
                $
              </Body>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                inputMode="decimal"
                autoCorrect={false}
                selectionColor={palette.cobalt}
                underlineColorAndroid="transparent"
                style={styles.amountInput}
              />
              <Num size={11} color={ink.faint}>
                USD
              </Num>
            </View>
            <View style={styles.quickAmounts}>
              {["100", "500", "1000", "5000"].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setAmount(value)}
                  style={[
                    styles.quickAmount,
                    amount === value && styles.quickAmountActive,
                  ]}
                >
                  <Num
                    size={10.5}
                    weight="medium"
                    color={
                      amount === value ? palette.cobaltText : ink.quaternary
                    }
                  >
                    ${Number(value).toLocaleString()}
                  </Num>
                </Pressable>
              ))}
            </View>

            <Body
              size={10.5}
              weight="semibold"
              color={ink.faint}
              style={styles.label}
            >
              Dividend payout
            </Body>
            <PreferenceCard
              title="Auto-reinvest (DRIP)"
              copy="Compounds share-equivalents through the onchain multiplier."
              icon="↻"
              active={preference === "drip"}
              onPress={() => setPreference("drip")}
            />
            <PreferenceCard
              title="Stablecoin (USDC)"
              copy={`Sends cash distributions to ${wallet.short}.`}
              icon="$"
              active={preference === "usdc"}
              tone="positive"
              onPress={() => setPreference("usdc")}
            />
          </>
        ) : null}

        {step === 3 && stock ? (
          <>
            <View style={styles.reviewHero}>
              <View style={styles.check}>
                <Body size={20} weight="bold" color={palette.cobaltText}>
                  ✓
                </Body>
              </View>
              <Display size={25} style={styles.reviewTitle}>
                ${amountUsd.toLocaleString()} of {stock.ticker}
              </Display>
              <Body size={12} color={ink.quaternary}>
                Ready for your embedded wallet
              </Body>
            </View>
            <View style={styles.panel}>
              <Fact label="Stock" value={`${stock.name} (${stock.ticker})`} />
              <Fact label="Representations" value="Dinari + xStock" />
              <Fact
                label="Dividends"
                value={
                  preference === "drip"
                    ? "DRIP · multiplier"
                    : "USDC wallet payout"
                }
              />
              <Fact
                label="Network"
                value={
                  live.deploymentReady
                    ? "Robinhood Testnet"
                    : "Deployment pending"
                }
              />
              <Fact label="Allocation" value="50% per issuer" />
              <Fact label="Recipient" value={wallet.short} last />
            </View>
            <Body
              size={11}
              color={live.error ? palette.amberBright : ink.faint}
              style={styles.disclaimer}
            >
              {live.error ??
                (live.deploymentReady
                  ? "Live testnet mint. Official tokens without a public mint are balance-checked instead."
                  : "Sandbox confirmation until the deployment manifest is connected.")}
            </Body>
          </>
        ) : null}
      </ScrollView>

      {step > 1 ? (
        <View style={[styles.cta, { paddingBottom: insets.bottom + 18 }]}>
          <PrimaryButton
            label={
              step === 2
                ? "Review stock"
                : live.deploymentReady
                  ? live.label
                  : "Confirm & tokenize stock"
            }
            disabled={amountUsd <= 0 || live.busy}
            onPress={() => (step === 2 ? setStep(3) : void confirm())}
          />
        </View>
      ) : null}
    </View>
  );
}

function PreferenceCard({
  title,
  copy,
  icon,
  active,
  onPress,
  tone = "cobalt",
}: {
  title: string;
  copy: string;
  icon: string;
  active: boolean;
  onPress: () => void;
  tone?: "cobalt" | "positive";
}) {
  const accent = tone === "positive" ? palette.positive : palette.cobaltText;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      style={({ pressed }) => [
        styles.preference,
        active && { borderColor: accent, backgroundColor: `${accent}0D` },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.preferenceIcon, { backgroundColor: `${accent}16` }]}>
        <Body size={18} weight="semibold" color={accent}>
          {icon}
        </Body>
      </View>
      <View style={styles.flex}>
        <Body size={13} weight="semibold">
          {title}
        </Body>
        <Body size={11} color={ink.quaternary} style={styles.preferenceCopy}>
          {copy}
        </Body>
      </View>
      {active ? (
        <Body size={16} weight="bold" color={accent}>
          ✓
        </Body>
      ) : null}
    </Pressable>
  );
}

function Fact({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.fact, !last && styles.divided]}>
      <Body size={11.5} color={ink.tertiary}>
        {label}
      </Body>
      <Num size={11.5} weight="medium" style={styles.factValue}>
        {value}
      </Num>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: {
    paddingHorizontal: space.gutter,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerCopy: { flex: 1, gap: 1 },
  progress: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: space.gutter,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: fill.active,
  },
  progressActive: { backgroundColor: palette.cobalt },
  content: { paddingHorizontal: space.gutter, paddingTop: 28 },
  intro: { marginTop: 7, lineHeight: 19 },
  search: {
    height: 48,
    marginTop: 22,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: stroke.raised,
    backgroundColor: fill.muted,
  },
  searchInput: {
    flex: 1,
    color: ink.primary,
    fontFamily: "InstrumentSans_400Regular",
    fontSize: 13,
    paddingVertical: 0,
  },
  catalog: {
    marginTop: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: palette.surface,
    paddingHorizontal: 10,
    ...shadow.card,
  },
  stockRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 7,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  divided: { borderTopWidth: 1, borderTopColor: stroke.hairline },
  stockMark: {
    width: 39,
    height: 39,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fill.muted,
    borderWidth: 1,
    borderColor: stroke.raised,
  },
  flex: { flex: 1 },
  trailing: { alignItems: "flex-end" },
  sub: { marginTop: 2 },
  pressed: { opacity: 0.7 },
  panel: {
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: palette.surface,
    ...shadow.card,
  },
  selectedStock: {
    minHeight: 72,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    marginTop: 24,
    marginBottom: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  amountBox: {
    height: 68,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: stroke.raised,
    backgroundColor: fill.muted,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 0,
    color: ink.primary,
    fontFamily: "GeistMono_500Medium",
    fontSize: 28,
  },
  quickAmounts: { flexDirection: "row", gap: 7, marginTop: 8 },
  quickAmount: {
    flex: 1,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
  quickAmountActive: {
    borderColor: "rgba(94,124,255,.5)",
    backgroundColor: "rgba(94,124,255,.1)",
  },
  preference: {
    minHeight: 82,
    marginBottom: 9,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
  preferenceIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  preferenceCopy: { marginTop: 4, lineHeight: 16 },
  reviewHero: {
    alignItems: "center",
    paddingVertical: 22,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(94,124,255,.3)",
    backgroundColor: "rgba(94,124,255,.07)",
  },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94,124,255,.14)",
  },
  reviewTitle: { marginTop: 13, marginBottom: 4 },
  fact: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  factValue: { flex: 1, textAlign: "right" },
  disclaimer: { marginTop: 14, textAlign: "center", lineHeight: 16 },
  cta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.gutter,
    paddingTop: 26,
    backgroundColor: palette.bg,
  },
});
