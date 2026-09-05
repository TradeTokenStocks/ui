/** Scoped permissions a delegated session may be granted. Never transfers out. */
export const delegationPermissions = [
  {
    id: 'rescale',
    title: 'Rescale bands after corporate actions',
    meta: 'Splits and symbol changes',
    defaultOn: true,
  },
  {
    id: 'claim',
    title: 'Claim accrued fees weekly',
    meta: 'Returns proceeds to your wallet',
    defaultOn: false,
  },
  {
    id: 'close-on-break',
    title: 'Close if the peg breaks',
    meta: 'Emergency exit only',
    defaultOn: false,
  },
] as const;

/** The ceiling on a delegated session. These are the limits, not suggestions. */
export const delegationLimits = [
  { label: 'Spend ceiling', value: '$2,500' },
  { label: 'Network', value: 'Base only' },
  { label: 'Expires', value: '30 days' },
  { label: 'Transfers out', value: 'Never permitted' },
] as const;

/** Passkey re-authentication threshold. Fills never interrupt the user. */
export const approvalThresholdUsd = 5000;

export const fundingPresetsUsd = [500, 2500, 5000, 10000] as const;

export const fundingMethods = [
  { id: 'card', icon: '▱', title: 'Debit card', meta: 'Fastest · provider fees may apply' },
  { id: 'exchange', icon: '↗', title: 'From exchange', meta: 'Send USDC over Base' },
  { id: 'wallet', icon: '◇', title: 'From another wallet', meta: 'Copy your Base address' },
] as const;

export type FundingMethodId = (typeof fundingMethods)[number]['id'];
