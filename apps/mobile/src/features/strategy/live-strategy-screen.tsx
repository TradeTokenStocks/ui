import { ScrollView, StyleSheet, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";
import { formatUnits } from "viem";

import { BackButton } from "@/components/ui/back-button";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { Body, Display, Num } from "@/components/ui/text";
import type { LiveStrategyRecord } from "@/lib/live-strategy-store";
import {
  fill,
  ink,
  palette,
  radius,
  shadow,
  space,
  stroke,
} from "@/theme/tokens";
import { formatUsd } from "@tradetoken/domain";

import { useLiveStrategy, type LiveStrategyStage } from "./use-live-strategy";

const tradeLabel: Record<LiveStrategyStage, string> = {
  idle: "Run demo trade",
  quoting: "Checking guarded quote…",
  approving: "Approving input token…",
  swapping: "Submitting demo trade…",
  confirming: "Confirming trade…",
  complete: "Run opposite trade",
  rejected: "Retry guarded quote",
  "updating-multiplier": "Run demo trade",
  docking: "Run demo trade",
  docked: "Run demo trade",
  error: "Retry demo trade",
};

const BUSY_STAGES: readonly LiveStrategyStage[] = [
  "quoting",
  "approving",
  "swapping",
  "confirming",
  "updating-multiplier",
  "docking",
];

function tokenAmount(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function multiplierLabel(value: bigint) {
  return `${Number(formatUnits(value, 18)).toFixed(4)}×`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function LiveStrategyScreen({
  record,
  insets,
  onBack,
}: {
  record: LiveStrategyRecord;
  insets: EdgeInsets;
  onBack: () => void;
}) {
  const live = useLiveStrategy(record);
  const busy = BUSY_STAGES.includes(live.stage);
  const closed = record.status === "closed";
  const balanceA = live.position?.strategy.a ?? BigInt(record.tokenA.reserve);
  const balanceB = live.position?.strategy.b ?? BigInt(record.tokenB.reserve);
  const signedA = BigInt(record.tokenA.multiplier);
  const signedB = BigInt(record.tokenB.multiplier);
  const currentA = live.position?.multipliers.a ?? signedA;
  const currentB = live.position?.multipliers.b ?? signedB;
  const multiplierMoved = currentB !== signedB;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 140 },
        ]}
      >
        <View style={styles.header}>
          <BackButton onPress={onBack} />
          <View style={styles.headerCopy}>
            <Body size={15} weight="semibold">
              {record.tokenA.symbol} / {record.tokenB.symbol}
            </Body>
            <Num size={11.5} color={ink.quaternary} style={styles.sub}>
              Same-stock pegged · Aqua
            </Num>
          </View>
          <View style={[styles.liveChip, closed && styles.closedChip]}>
            <Body
              size={10.5}
              weight="semibold"
              color={closed ? ink.tertiary : palette.positive}
            >
              {closed ? "Closed" : "● Live"}
            </Body>
          </View>
        </View>

        <View style={styles.summary}>
          <Body size={12} color={ink.tertiary}>
            Original allocation
          </Body>
          <Display size={42} style={styles.value}>
            {formatUsd(record.allocationUsd, { digits: 2 })}
          </Display>
          <Num size={11.5} color={ink.quaternary} style={styles.sub}>
            Robinhood Testnet · confirmed onchain
          </Num>
        </View>

        <View style={styles.balanceGrid}>
          <BalanceCard
            issuer="Dinari"
            symbol={record.tokenA.symbol}
            amount={tokenAmount(balanceA, record.tokenA.decimals)}
            accent={palette.cobaltText}
          />
          <BalanceCard
            issuer="xStock"
            symbol={record.tokenB.symbol}
            amount={tokenAmount(balanceB, record.tokenB.decimals)}
            accent={palette.violet}
          />
        </View>
        <Body size={10.5} color={ink.faint} style={styles.walletNote}>
          {live.position
            ? `Aqua strategy balances · wallet holds ${tokenAmount(live.position.wallet.a, record.tokenA.decimals)} ${record.tokenA.symbol} and ${tokenAmount(live.position.wallet.b, record.tokenB.decimals)} ${record.tokenB.symbol} without escrow`
            : "Balances signed at creation · Aqua accounts for liquidity without escrow"}
        </Body>

        <View style={styles.guardCard}>
          <View style={styles.guardHeader}>
            <View>
              <Body size={10.5} weight="semibold" color={palette.positive}>
                MULTIPLIER CIRCUIT BREAKER
              </Body>
              <Display size={21} style={styles.guardTitle}>
                Both representations guarded
              </Display>
            </View>
            <View style={styles.guardBadge}>
              <Num size={11} weight="medium" color={palette.positive}>
                ±{record.guardToleranceBps / 100}%
              </Num>
            </View>
          </View>
          <View style={styles.multiplierRows}>
            <Metric
              label={record.tokenA.symbol}
              value={
                currentA === signedA
                  ? multiplierLabel(signedA)
                  : `${multiplierLabel(signedA)} → ${multiplierLabel(currentA)}`
              }
            />
            <Metric
              label={record.tokenB.symbol}
              value={
                currentB === signedB
                  ? multiplierLabel(signedB)
                  : `${multiplierLabel(signedB)} → ${multiplierLabel(currentB)}`
              }
            />
            <Metric
              label="Swap fee"
              value={`${(record.feeBps / 100).toFixed(2)}%`}
            />
          </View>
          <Body size={11.5} color={ink.quaternary} style={styles.guardCopy}>
            Every quote executes both multiplier checks before the PeggedSwap
            curve. Move either mock multiplier outside its signed range and the
            next demo quote is rejected before a wallet transaction is sent.
          </Body>
          {live.canUpdateMultiplier && !closed ? (
            <SecondaryButton
              label={
                multiplierMoved
                  ? `Restore signed ${record.tokenB.symbol} multiplier`
                  : `Simulate ${record.tokenB.symbol} corporate action`
              }
              disabled={busy}
              onPress={() =>
                void live.updateDemoMultiplier(
                  multiplierMoved ? "restore" : "break",
                )
              }
              style={styles.guardAction}
            />
          ) : null}
        </View>

        {closed ? null : (
          <View style={styles.tradeCard}>
            <View style={styles.tradeHeader}>
              <View>
                <Body size={13.5} weight="semibold">
                  Demo the strategy
                </Body>
                <Num size={11} color={ink.faint} style={styles.sub}>
                  {live.direction} · 5% of the original leg
                </Num>
              </View>
              <View style={styles.quoteChip}>
                <Body
                  size={10.5}
                  weight="semibold"
                  color={
                    live.stage === "rejected"
                      ? palette.amberBright
                      : palette.cobaltText
                  }
                >
                  {live.stage === "rejected" ? "Protected" : "Live quote"}
                </Body>
              </View>
            </View>
            <PrimaryButton
              label={tradeLabel[live.stage]}
              disabled={busy}
              onPress={() => void live.trade()}
            />
            <SecondaryButton
              label={
                live.stage === "docking"
                  ? "Closing strategy…"
                  : "Close strategy · dock liquidity"
              }
              disabled={busy}
              onPress={() => void live.dock()}
            />
          </View>
        )}

        {live.error ? (
          <Body size={11} color={palette.amberBright} style={styles.status}>
            {live.error}
          </Body>
        ) : null}
        {live.lastHash ? (
          <Num size={10.5} color={ink.faint} style={styles.status}>
            Confirmed · {shortHash(live.lastHash)}
          </Num>
        ) : null}

        <View style={styles.receipt}>
          <Metric label="Strategy hash" value={shortHash(record.strategyHash)} />
          <Metric
            label="Open transaction"
            value={shortHash(record.shipTransactionHash)}
          />
          <Metric
            label="Created"
            value={new Date(record.createdAt).toLocaleString()}
          />
          {record.dockTransactionHash ? (
            <Metric
              label="Close transaction"
              value={shortHash(record.dockTransactionHash)}
            />
          ) : null}
          {record.closedAt ? (
            <Metric
              label="Closed"
              value={new Date(record.closedAt).toLocaleString()}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function BalanceCard({
  issuer,
  symbol,
  amount,
  accent,
}: {
  issuer: string;
  symbol: string;
  amount: string;
  accent: string;
}) {
  return (
    <View style={styles.balanceCard}>
      <View style={[styles.tokenMark, { backgroundColor: `${accent}20` }]}>
        <Body size={12} weight="bold" color={accent}>
          {issuer[0]}
        </Body>
      </View>
      <Body size={10.5} color={ink.faint} style={styles.balanceIssuer}>
        {issuer}
      </Body>
      <Num size={19} weight="medium">
        {amount}
      </Num>
      <Body size={11} color={ink.quaternary}>
        {symbol}
      </Body>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Body size={11.5} color={ink.tertiary}>
        {label}
      </Body>
      <Num size={11.5} weight="medium" style={styles.metricValue}>
        {value}
      </Num>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: space.gutter },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1 },
  sub: { marginTop: 2 },
  liveChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(74,222,139,.22)",
    backgroundColor: "rgba(74,222,139,.1)",
  },
  closedChip: { borderColor: stroke.hairline, backgroundColor: fill.subtle },
  summary: { marginTop: 30 },
  value: { marginTop: 3 },
  balanceGrid: { flexDirection: "row", gap: 10, marginTop: 22 },
  balanceCard: {
    flex: 1,
    minHeight: 135,
    padding: 15,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: palette.surface,
    ...shadow.card,
  },
  tokenMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  balanceIssuer: { marginBottom: 3 },
  walletNote: { textAlign: "center", marginTop: 10, lineHeight: 15 },
  guardCard: {
    marginTop: 20,
    padding: 17,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(74,222,139,.2)",
    backgroundColor: "rgba(74,222,139,.045)",
  },
  guardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  guardTitle: { marginTop: 4 },
  guardBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(74,222,139,.1)",
  },
  multiplierRows: {
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: stroke.hairline,
  },
  guardCopy: { marginTop: 14, lineHeight: 17 },
  guardAction: { marginTop: 14 },
  tradeCard: {
    gap: 15,
    marginTop: 12,
    padding: 17,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(94,124,255,.26)",
    backgroundColor: "rgba(94,124,255,.055)",
  },
  tradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  quoteChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: fill.subtle,
  },
  status: { textAlign: "center", lineHeight: 16, marginTop: 12 },
  receipt: {
    gap: 9,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: stroke.hairline,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  metricValue: { flex: 1, textAlign: "right" },
});
