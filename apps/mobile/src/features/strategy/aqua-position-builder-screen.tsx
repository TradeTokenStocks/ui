import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Body, Display, Num } from "@/components/ui/text";
import {
  fill,
  font,
  ink,
  palette,
  radius,
  shadow,
  space,
  stroke,
} from "@/theme/tokens";
import {
  pairedRepresentations,
  tokenizedStocks,
} from "@tradetoken/domain/fixtures";

import { useLivePairBalances } from "./use-live-pair-balances";

const QUICK_PAIRS = ["NVDA", "AAPL", "TSLA", "MSFT"];
const FEES = [5, 30, 100];

export function AquaPositionBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { ticker: tickerParam } = useLocalSearchParams<{ ticker?: string }>();
  const [ticker, setTicker] = useState(tickerParam?.toUpperCase() ?? "NVDA");
  const [amountA, setAmountA] = useState("20");
  const [amountB, setAmountB] = useState("20");
  const [curve, setCurve] = useState<"straight" | "curved">("curved");
  const [feeBps, setFeeBps] = useState(30);
  const [guard, setGuard] = useState(5);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tokenA, tokenB] = pairedRepresentations(ticker);
  const total = (Number(amountA) || 0) + (Number(amountB) || 0);
  const liveBalances = useLivePairBalances(tokenA?.id ?? "", tokenB?.id ?? "");

  if (!tokenA || !tokenB) return null;

  const reset = () => {
    setTicker("NVDA");
    setAmountA("20");
    setAmountB("20");
    setCurve("curved");
    setFeeBps(30);
    setGuard(5);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 116 },
        ]}
      >
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerCopy}>
            <Body size={15} weight="semibold">
              Create a position
            </Body>
            <Num size={11.5} color={ink.quaternary} style={styles.subline}>
              Same-stock pegged · 1inch Aqua
            </Num>
          </View>
          <Pressable onPress={reset} accessibilityRole="button">
            <Body size={11.5} weight="semibold" color={ink.tertiary}>
              Reset
            </Body>
          </Pressable>
        </View>

        <SectionLabel>Provide liquidity for</SectionLabel>
        <Pressable
          onPress={() => setSelectorOpen(true)}
          style={({ pressed }) => [styles.pairCard, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Change ${tokenA.symbol} and ${tokenB.symbol} pair`}
        >
          <TokenStack />
          <View style={styles.flex}>
            <Body size={14.5} weight="semibold">
              {tokenA.symbol} / {tokenB.symbol}
            </Body>
            <Body size={11} color={ink.quaternary} style={styles.subline}>
              {tokenA.name} · Dinari + xStock
            </Body>
          </View>
          <Body size={20} color={ink.faint}>
            ⌄
          </Body>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPairs}
        >
          {QUICK_PAIRS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setTicker(item)}
              style={[
                styles.quickPair,
                ticker === item && styles.quickPairActive,
              ]}
            >
              <Num
                size={11}
                weight="medium"
                color={ticker === item ? palette.cobaltText : ink.tertiary}
              >
                {item}
              </Num>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.strategyCard}>
          <View style={styles.strategyIcon}>
            <Body size={14} weight="bold" color={palette.cobaltText}>
              ✓
            </Body>
          </View>
          <View style={styles.flex}>
            <Body size={13.5} weight="semibold">
              Same-stock pegged
            </Body>
            <Body
              size={11.5}
              color={ink.quaternary}
              style={styles.strategyCopy}
            >
              Keeps both issuer representations trading around their fair
              multiplier ratio.
            </Body>
          </View>
        </View>

        <View style={styles.previewPanel}>
          <View style={styles.previewTop}>
            <View>
              <Body size={10.5} weight="semibold" color={ink.faint}>
                POSITION PREVIEW
              </Body>
              <Display size={21} style={styles.previewTitle}>
                {ticker} issuer spread
              </Display>
            </View>
            <View style={styles.compatible}>
              <Body size={10.5} weight="semibold" color={palette.positive}>
                ● {liveBalances ? "Live balances" : "Guard ready"}
              </Body>
            </View>
          </View>
          <View
            style={styles.chart}
            accessible
            accessibilityLabel={`Fair issuer ratio, protected within plus or minus ${guard} percent`}
          >
            <View style={styles.guardRange} />
            <View style={styles.curveLine} />
            <View style={styles.fairLine} />
            <View style={styles.fairTag}>
              <Num size={10.5} weight="medium" color={palette.bg}>
                fair 1.00×
              </Num>
            </View>
            <Num size={10} color={ink.faint} style={styles.chartLeft}>
              {(1 - guard / 100).toFixed(2)}×
            </Num>
            <Num size={10} color={ink.faint} style={styles.chartRight}>
              {(1 + guard / 100).toFixed(2)}×
            </Num>
          </View>
          <View style={styles.amounts}>
            <AmountInput
              symbol={tokenA.symbol}
              issuer="Dinari"
              balance={liveBalances?.a ?? String(tokenA.walletBalance)}
              value={amountA}
              onChange={setAmountA}
            />
            <AmountInput
              symbol={tokenB.symbol}
              issuer="xStock"
              balance={liveBalances?.b ?? String(tokenB.walletBalance)}
              value={amountB}
              onChange={setAmountB}
            />
          </View>
        </View>

        <SectionLabel>Price curve</SectionLabel>
        <View style={styles.twoColumns}>
          {(["straight", "curved"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setCurve(item)}
              style={[styles.choice, curve === item && styles.choiceActive]}
            >
              <Body size={12.5} weight="semibold" style={styles.capitalize}>
                {item}
              </Body>
              <Body size={10.5} color={ink.faint} style={styles.choiceCopy}>
                {item === "curved"
                  ? "Deeper near fair value"
                  : "Even liquidity depth"}
              </Body>
            </Pressable>
          ))}
        </View>

        <SectionLabel>Swap fee</SectionLabel>
        <View style={styles.threeColumns}>
          {FEES.map((item) => (
            <Pill
              key={item}
              active={feeBps === item}
              onPress={() => setFeeBps(item)}
              label={`${(item / 100).toFixed(2)}%`}
            />
          ))}
        </View>

        <View style={styles.guardCard}>
          <View style={styles.guardHeading}>
            <Body size={13} weight="semibold" color={palette.positive}>
              ◇ Multiplier guard
            </Body>
            <Body size={10.5} color={ink.faint}>
              Both legs
            </Body>
          </View>
          <Body size={11.5} color={ink.quaternary} style={styles.guardCopy}>
            Fills stop if either issuer multiplier leaves its approved range,
            blocking stale-price arbitrage.
          </Body>
          <View style={styles.guardOptions}>
            {[2, 5, 10].map((item) => (
              <Pill
                key={item}
                active={guard === item}
                positive
                onPress={() => setGuard(item)}
                label={`±${item}%`}
              />
            ))}
          </View>
        </View>

        <View style={styles.totalRow}>
          <Body size={11} color={ink.faint}>
            Total position
          </Body>
          <Num size={19} weight="medium">
            ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Num>
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Review position"
          disabled={total <= 0}
          onPress={() =>
            router.push({
              pathname: "/strategy/review",
              params: {
                mode: "pegged",
                ticker,
                tokenA: tokenA.id,
                tokenB: tokenB.id,
                amountA,
                amountB,
                feeBps,
                guard,
                curve,
              },
            })
          }
        />
      </View>

      <PairSelector
        open={selectorOpen}
        query={query}
        onQuery={setQuery}
        onClose={() => setSelectorOpen(false)}
        onSelect={(nextTicker) => {
          setTicker(nextTicker);
          setSelectorOpen(false);
          setQuery("");
        }}
      />
    </View>
  );
}

function PairSelector({
  open,
  query,
  onQuery,
  onClose,
  onSelect,
}: {
  open: boolean;
  query: string;
  onQuery: (value: string) => void;
  onClose: () => void;
  onSelect: (ticker: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const stocks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const unique = tokenizedStocks.filter((stock) => stock.issuer === "dinari");
    return normalized
      ? unique.filter((stock) =>
          `${stock.ticker} ${stock.name}`.toLowerCase().includes(normalized),
        )
      : unique;
  }, [query]);

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modal, { paddingTop: insets.top + 14 }]}>
        <View style={styles.modalHeader}>
          <View>
            <Display size={22}>Select stock pair</Display>
            <Body size={11.5} color={ink.quaternary} style={styles.subline}>
              Dinari ↔ xStock representations
            </Body>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close token selector"
            style={styles.close}
          >
            <Body size={18} color={ink.secondary}>
              ×
            </Body>
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder="Search by name or ticker"
          placeholderTextColor={ink.faint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
        <View style={styles.categories}>
          <Body size={10.5} weight="semibold" color={palette.cobaltText}>
            TOKENIZED STOCKS
          </Body>
          <Body size={10.5} color={ink.faint}>
            All issuers
          </Body>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {stocks.map((stock, index) => {
            const pair = pairedRepresentations(stock.ticker);
            return (
              <Pressable
                key={stock.ticker}
                onPress={() => onSelect(stock.ticker)}
                style={[styles.pairRow, index > 0 && styles.rowDivided]}
              >
                <TokenStack />
                <View style={styles.flex}>
                  <Body size={13.5} weight="semibold">
                    {stock.name}
                  </Body>
                  <Num size={10.5} color={ink.faint} style={styles.subline}>
                    {pair.map((item) => item.symbol).join(" / ")}
                  </Num>
                </View>
                <Num size={11.5} color={ink.tertiary}>
                  ${stock.priceUsd.toFixed(2)}
                </Num>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function TokenStack() {
  return (
    <View style={styles.tokenStack}>
      <TokenMark issuer="D" />
      <TokenMark issuer="X" overlap />
    </View>
  );
}

function TokenMark({
  issuer,
  overlap = false,
}: {
  issuer: "D" | "X";
  overlap?: boolean;
}) {
  return (
    <View
      style={[
        styles.tokenMark,
        overlap && styles.tokenOverlap,
        issuer === "X" && styles.tokenMarkAlt,
      ]}
    >
      <Body size={11} weight="bold" color="#fff">
        {issuer}
      </Body>
    </View>
  );
}

function AmountInput({
  symbol,
  issuer,
  balance,
  value,
  onChange,
}: {
  symbol: string;
  issuer: string;
  balance: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.amountCard}>
      <View style={styles.amountMeta}>
        <Body size={10.5} color={ink.faint}>
          {issuer}
        </Body>
        <Num size={10} color={ink.faint}>
          Bal {balance}
        </Num>
      </View>
      <View style={styles.amountInputRow}>
        <View style={styles.miniMark}>
          <Body size={9} weight="bold" color={palette.cobaltText}>
            {issuer[0]}
          </Body>
        </View>
        <Body size={11.5} weight="semibold">
          {symbol}
        </Body>
        <Body size={16} color={ink.faint} style={styles.dollar}>
          $
        </Body>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={styles.amountInput}
          accessibilityLabel={`${symbol} allocation in dollars`}
        />
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Body
      size={10.5}
      weight="semibold"
      color={ink.faint}
      style={styles.sectionLabel}
    >
      {children.toUpperCase()}
    </Body>
  );
}

function Pill({
  active,
  positive = false,
  label,
  onPress,
}: {
  active: boolean;
  positive?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        active && (positive ? styles.pillPositive : styles.pillActive),
      ]}
    >
      <Num
        size={11}
        weight="medium"
        color={
          active
            ? positive
              ? palette.positive
              : palette.cobaltText
            : ink.tertiary
        }
      >
        {label}
      </Num>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: space.gutter },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1 },
  subline: { marginTop: 2 },
  sectionLabel: { marginTop: 24, marginBottom: 9, letterSpacing: 1 },
  pairCard: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: stroke.raised,
    backgroundColor: fill.muted,
  },
  pressed: { opacity: 0.76 },
  flex: { flex: 1 },
  tokenStack: { flexDirection: "row", alignItems: "center", paddingRight: 5 },
  tokenMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: palette.surface,
    backgroundColor: palette.cobalt,
  },
  tokenMarkAlt: { backgroundColor: palette.violet },
  tokenOverlap: { marginLeft: -10 },
  quickPairs: { gap: 7, paddingTop: 10, paddingRight: space.gutter },
  quickPair: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
  quickPairActive: {
    borderColor: "rgba(94,124,255,.38)",
    backgroundColor: "rgba(94,124,255,.1)",
  },
  strategyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginTop: 20,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(94,124,255,.3)",
    backgroundColor: "rgba(94,124,255,.06)",
  },
  strategyIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94,124,255,.14)",
  },
  strategyCopy: { marginTop: 4, lineHeight: 17 },
  previewPanel: {
    marginTop: 12,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: palette.surface,
    ...shadow.card,
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  previewTitle: { marginTop: 4 },
  compatible: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(57,198,137,.08)",
    borderWidth: 1,
    borderColor: "rgba(57,198,137,.18)",
  },
  chart: {
    height: 116,
    marginTop: 16,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: palette.surfaceSunken,
  },
  guardRange: {
    position: "absolute",
    left: "18%",
    right: "18%",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(57,198,137,.06)",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(57,198,137,.32)",
  },
  curveLine: {
    position: "absolute",
    left: "10%",
    right: "10%",
    top: "49%",
    height: 2,
    borderRadius: 1,
    backgroundColor: palette.cobalt,
    transform: [{ rotate: "-8deg" }],
  },
  fairLine: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,.72)",
  },
  fairTag: {
    position: "absolute",
    left: "50%",
    top: 12,
    transform: [{ translateX: -34 }],
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: ink.primary,
  },
  chartLeft: { position: "absolute", left: 10, bottom: 9 },
  chartRight: { position: "absolute", right: 10, bottom: 9 },
  amounts: { gap: 8, marginTop: 12 },
  amountCard: {
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
  amountMeta: { flexDirection: "row", justifyContent: "space-between" },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 9,
  },
  miniMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94,124,255,.13)",
  },
  dollar: { marginLeft: "auto" },
  amountInput: {
    minWidth: 76,
    padding: 0,
    color: ink.primary,
    fontFamily: font.monoMedium,
    fontSize: 18,
    textAlign: "right",
  },
  twoColumns: { flexDirection: "row", gap: 8 },
  threeColumns: { flexDirection: "row", gap: 8 },
  choice: {
    flex: 1,
    minHeight: 64,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
  choiceActive: {
    borderColor: "rgba(94,124,255,.4)",
    backgroundColor: "rgba(94,124,255,.07)",
  },
  capitalize: { textTransform: "capitalize" },
  choiceCopy: { marginTop: 4 },
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
  pillActive: {
    borderColor: "rgba(94,124,255,.4)",
    backgroundColor: "rgba(94,124,255,.08)",
  },
  pillPositive: {
    borderColor: "rgba(57,198,137,.3)",
    backgroundColor: "rgba(57,198,137,.09)",
  },
  guardCard: {
    marginTop: 22,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(57,198,137,.2)",
    backgroundColor: "rgba(57,198,137,.045)",
  },
  guardHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guardCopy: { marginTop: 7, lineHeight: 17 },
  guardOptions: { flexDirection: "row", gap: 7, marginTop: 12 },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: stroke.hairline,
  },
  cta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.gutter,
    paddingTop: 14,
    backgroundColor: "rgba(10,11,13,.97)",
    borderTopWidth: 1,
    borderTopColor: stroke.hairline,
  },
  modal: {
    flex: 1,
    paddingHorizontal: space.gutter,
    backgroundColor: palette.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fill.muted,
  },
  search: {
    height: 50,
    marginTop: 20,
    paddingHorizontal: 15,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: stroke.raised,
    backgroundColor: fill.subtle,
    color: ink.primary,
    fontFamily: font.sans,
    fontSize: 14,
  },
  categories: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: stroke.hairline,
  },
  pairRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: stroke.hairline },
});
