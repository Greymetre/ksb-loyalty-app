export type WalletSchemeBalance = {
  id?: number;
  loyaltySchemeId?: number;
  schemeId?: number;
  name: string;
  points: number;
  pointsDisplay?: string;
  walletType?: "regular" | "booster";
  redemptionEnabled?: boolean;
};

export type WalletSummary = {
  balance: number;
  earned: number;
  redeemed: number;
  title?: string;
  walletType?: "regular" | "booster";
  expiryDays?: number;
  currentTier?: number;
  nextMilestone?: number;
  activeBoosters?: number;
  rate?: number;
  subtitle?: string;
  nextRate?: number;
  nextAmount?: number;
  achievedPercentage?: number;
  invoiceValue?: number;
  invoiceValueShort?: string;
  achievedLabel?: string;
  achievedTierName?: string;
  nextRewardLabel?: string;
  nextTierName?: string;
  daysLeftMessage?: string;
  badgeText?: string;
  schemeName?: string;
  loyaltySchemeId?: number;
  schemeId?: number;
  schemeCode?: string;
  schemeTag?: string;
  basedOn?: string;
  startDate?: string;
  endDate?: string;
  expiresOn?: string;
  isActive?: boolean;
  redemptionEnabled?: boolean;
  progressPercent?: number;
  progressSteps?: SchemeTier[];
  message?: string;
  nextMessage?: string;
  schemes?: WalletSchemeBalance[];
};

export type SchemeTier = {
  amount: number;
  label: string;
  rewardLabel?: string;
  walletType?: "regular" | "booster";
  rate?: number;
  valueFrom?: number;
  valueTo?: number | null;
  achieved?: boolean;
  current?: boolean;
  tierName?: string;
};

export type DashboardData = {
  customerId?: number;
  userName?: string;
  totalRedeemable: number;
  slabWallet: WalletSummary;
  boosterWallet: WalletSummary;
  currentSchemeTiers?: SchemeTier[];
  totalInvoices?: number;
  approvedInvoices?: number;
  pendingInvoices?: number;
  activeWallets?: number;
  invoiceCount: number;
  recentInvoices?: DashboardInvoice[];
  recentActivities: string[];
  activeSchemes: SchemeInfo[];
};

export type DashboardInvoice = {
  id: string;
  invoiceNumber: string;
  date?: string;
  amount: number;
  points: number;
  schemeTag?: string;
  schemeName?: string;
  tierName?: string;
  rewardLabel?: string;
  statusLabel?: string;
};

export type WalletDetail = {
  type: "SLAB" | "BOOSTER";
  title: string;
  balance: number;
  earned: number;
  redeemed: number;
  expiryDays: number;
  formula: string;
  timeline: string[];
};

export type Invoice = {
  id: string;
  month: string;
  dealer: string;
  amount: number;
  reward: number;
  status: "Credited" | "Pending" | "Reversed";
  date: string;
};

export type SchemeInfo = {
  id: number;
  name: string;
  period: string;
  daysLeft: number;
  code?: string;
  description?: string;
  tag?: string;
  basedOn?: string;
  startDate?: string;
  endDate?: string;
  brochurePath?: string;
  achievementValue: number;
  pendingInvoiceValue: number;
  expectedPendingReward: number;
  currentSlab?: string;
  nextSlab?: string;
  additionalValueRequired: number;
  tiers: SchemeTier[];
};
