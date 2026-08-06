import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import EmptyScreen from "@/screens/common/EmptyScreen";
import LoadingScreen from "@/screens/common/LoadingScreen";
import { Route } from "@/navigation/routes";
import { KycDetails, kycApi } from "@/services/kycApi";
import { RedemptionMode, redemptionApi } from "@/services/redemptionApi";
import { walletApi } from "@/services/walletApi";
import { colors, gradients } from "@/constants/colors";
import { DashboardData, WalletSchemeBalance, WalletSummary } from "@/types/api";
import { money, moneyInLakh } from "@/utils/formatters";
import { jakarta } from "@/styles/appStyles";

type WalletChoice = "SLAB" | "BOOSTER";
type BadgeTone = "danger" | "success";

type RedeemWallet = {
  type: WalletChoice;
  title: string;
  subtitle: string;
  balance: number;
  balanceColor: string;
  surface: string;
  iconSurface: string;
  icon: string;
  detail: string;
  badge: string;
  badgeTone: BadgeTone;
  customerId?: number;
  loyaltySchemeId?: number;
  schemes: RedeemScheme[];
};

type RedeemScheme = {
  id: string;
  name: string;
  points: number;
  pointsDisplay: string;
  loyaltySchemeId?: number;
  redemptionEnabled: boolean;
};

type PreviewBankAccount = {
  account_holder_name?: string;
  account_number?: string;
  masked_account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  is_primary?: boolean;
};

const MIN_REDEMPTION = 500;
const pointsText = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
const fallbackBankAccount: PreviewBankAccount = {
  account_holder_name: "Bank account holder",
  account_number: "Account number unavailable",
  bank_name: "Registered Bank",
  ifsc_code: "IFSC unavailable",
  is_primary: false
};

export default function RedemptionScreen({ go, initialWallet }: { go: (route: Route) => void; initialWallet?: WalletChoice }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHandleInitialWalletRef = useRef(false);
  const [step, setStep] = useState(1);
  const [walletType, setWalletType] = useState<WalletChoice | null>(initialWallet ?? null);
  const [schemeKey, setSchemeKey] = useState<string | null>(null);
  const [schemeSectionY, setSchemeSectionY] = useState(0);
  const [shouldScrollToScheme, setShouldScrollToScheme] = useState(false);
  const [schemeHighlighted, setSchemeHighlighted] = useState(false);
  const [amount, setAmount] = useState("");
  const [transferMethod, setTransferMethod] = useState<RedemptionMode>("NEFT");
  const [bankConfirmed, setBankConfirmed] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [redemptionResult, setRedemptionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [kycChecking, setKycChecking] = useState(false);
  const [kycGate, setKycGate] = useState<{ visible: boolean; uploaded: number; approved: number }>({ visible: false, uploaded: 0, approved: 0 });
  const [redemptionClosed, setRedemptionClosed] = useState<{ visible: boolean; schemeName: string }>({ visible: false, schemeName: "" });
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    walletApi.dashboard()
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setDashboardLoading(false));
  }, []);

  useEffect(() => {
    if (!shouldScrollToScheme || !schemeSectionY) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(schemeSectionY - 18, 0), animated: true });
      setShouldScrollToScheme(false);
    }, 80);
    return () => clearTimeout(timer);
  }, [schemeSectionY, shouldScrollToScheme]);

  useEffect(() => {
    if (!initialWallet || dashboardLoading || didHandleInitialWalletRef.current) return;
    didHandleInitialWalletRef.current = true;
    setShouldScrollToScheme(true);
    setSchemeHighlighted(true);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setSchemeHighlighted(false), 1800);
  }, [dashboardLoading, initialWallet]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const wallets = useMemo(() => dashboard ? buildWallets(dashboard) : [], [dashboard]);
  const selectedWallet = wallets.find((wallet) => wallet.type === walletType) || wallets[0];
  const selectedScheme = selectedWallet?.schemes.find((scheme) => scheme.id === schemeKey) || null;
  const redeemableBalance = selectedScheme?.points ?? selectedWallet?.balance ?? 0;
  const amountNumber = Number(amount || 0);
  const tds = Number(preview?.tds ?? preview?.tds_amount ?? preview?.deduction ?? 0);
  const payable = Number(preview?.payable ?? preview?.payable_amount ?? preview?.net_amount ?? Math.max(amountNumber - tds, 0));
  const bankAccount = normalizeBankAccount(preview?.bank_account ?? preview?.bankAccount);
  const resultData = redemptionResult?.data || redemptionResult || {};
  const requestId = resultData?.redemption_id ?? resultData?.redemptionId ?? resultData?.request_id ?? resultData?.requestId ?? resultData?.id ?? "KSB-R75245";
  const canContinue = step === 1
    ? Boolean(walletType && selectedScheme)
    : step === 2
      ? amountNumber >= MIN_REDEMPTION && amountNumber <= redeemableBalance
      : step === 3
        ? amountNumber >= MIN_REDEMPTION && bankConfirmed
        : true;

  if (dashboardLoading) return <LoadingScreen message="Loading redemption wallets" />;
  if (!dashboard) return <EmptyScreen title="Redemption unavailable" message="No wallet balance returned from API." onBack={() => go("Home")} />;

  const goBack = () => {
    if (initialWallet && step === 1) {
      go(initialWallet === "SLAB" ? "Slab" : "Booster");
      return;
    }
    if (step === 1) {
      go("Home");
      return;
    }
    setStep((current) => current - 1);
  };

  const highlightSchemeSection = () => {
    setSchemeHighlighted(true);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setSchemeHighlighted(false), 1800);
  };

  const handleWalletSelect = (nextWalletType: WalletChoice) => {
    setWalletType(nextWalletType);
    setSchemeKey(null);
    setAmount("");
    setShouldScrollToScheme(true);
    highlightSchemeSection();
  };

  const handleContinue = async () => {
    if (!selectedWallet || !canContinue || loading || kycChecking) return;
    if (step === 1) {
      setKycChecking(true);
      try {
        const kyc = await kycApi.get();
        if (!isKycApproved(kyc)) {
          setKycGate({ visible: true, uploaded: kyc.summary.uploaded, approved: kyc.summary.approved });
          return;
        }
      } catch {
        setKycGate({ visible: true, uploaded: 0, approved: 0 });
        return;
      } finally {
        setKycChecking(false);
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setLoading(true);
      try {
        setBankConfirmed(false);
        setPreview(await redemptionApi.preview(selectedWallet.type, amountNumber, { loyaltySchemeId: selectedScheme?.loyaltySchemeId }));
        setStep(3);
      } catch {
        // Toasts are handled by the API interceptor.
      } finally {
        setLoading(false);
      }
      return;
    }
    if (step === 3) {
      setLoading(true);
      try {
        setRedemptionResult(await redemptionApi.create(selectedWallet.type, amountNumber, transferMethod, bankConfirmed, {
          customerId: selectedWallet.customerId,
          loyaltySchemeId: selectedScheme?.loyaltySchemeId ?? selectedWallet.loyaltySchemeId
        }));
        setStep(4);
      } catch {
        // Toasts are handled by the API interceptor.
      } finally {
        setLoading(false);
      }
    }
  };

  if (step === 4) {
    return (
      <SuccessStep
        amount={payable || amountNumber}
        wallet={selectedWallet}
        bankAccount={bankAccount}
        transferMethod={transferMethod}
        requestId={String(requestId)}
        onClose={() => go("Home")}
        onHome={() => go("Home")}
      />
    );
  }

  return (
    <SafeAreaView edges={["left", "right"]} style={screenStyles.safe}>
      <StatusBar style="light" />
      <View style={[screenStyles.phone, { paddingTop: Math.max(insets.top - 8, 0), paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
        <RedeemHeader
          title={step === 3 ? "CONFIRM REDEMPTION" : "REDEEM REWARDS"}
          step={step}
          onBack={goBack}
        />
        <ScrollView ref={scrollRef} style={screenStyles.scroll} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[screenStyles.content, step === 3 && screenStyles.confirmContent]}>
          {step === 1 ? (
            <WalletStep
              wallets={wallets}
              walletType={walletType}
              schemeKey={schemeKey}
              highlightSchemeSection={schemeHighlighted}
              onSelect={handleWalletSelect}
              onSchemeSelect={(nextSchemeKey) => {
                const nextScheme = selectedWallet?.schemes.find((scheme) => scheme.id === nextSchemeKey);
                if (nextScheme?.redemptionEnabled === false) {
                  setSchemeKey(null);
                  setAmount("");
                  setRedemptionClosed({ visible: true, schemeName: nextScheme.name });
                  return;
                }
                setSchemeKey(nextSchemeKey);
                setAmount("");
              }}
              onSchemeSectionLayout={(event) => setSchemeSectionY(event.nativeEvent.layout.y)}
            />
          ) : null}

          {step === 2 && selectedWallet ? (
            <AmountStep
              wallet={selectedWallet}
              scheme={selectedScheme}
              amount={amount}
              onAmountChange={setAmount}
            />
          ) : null}

          {step === 3 && selectedWallet ? (
            <ConfirmStep
              wallet={selectedWallet}
              scheme={selectedScheme}
              amount={amountNumber}
              tds={tds}
              payable={payable}
              bankAccount={bankAccount}
              transferMethod={transferMethod}
              bankConfirmed={bankConfirmed}
              onTransferMethodChange={setTransferMethod}
              onBankConfirmedChange={setBankConfirmed}
              onEdit={() => setStep(2)}
            />
          ) : null}
        </ScrollView>

        <View style={[screenStyles.footer, step === 3 && screenStyles.confirmFooter]}>
          <Pressable disabled={!canContinue || loading || kycChecking} onPress={handleContinue} style={screenStyles.footerButtonWrap}>
            <LinearGradient
              colors={canContinue ? gradients.main : ["#cbd5df", "#cbd5df"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={screenStyles.footerButton}
            >
              {loading || kycChecking ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={screenStyles.footerText}>
                  {step === 3 ? `SUBMIT · GET ${money(payable || amountNumber)}  →` : "CONTINUE  →"}
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
        <KycGateModal
          visible={kycGate.visible}
          uploaded={kycGate.uploaded}
          approved={kycGate.approved}
          onClose={() => setKycGate((current) => ({ ...current, visible: false }))}
          onGoKyc={() => {
            setKycGate((current) => ({ ...current, visible: false }));
            go("Kyc");
          }}
        />
        <RedemptionClosedModal
          visible={redemptionClosed.visible}
          schemeName={redemptionClosed.schemeName}
          onClose={() => setRedemptionClosed({ visible: false, schemeName: "" })}
        />
      </View>
    </SafeAreaView>
  );
}

function RedemptionClosedModal({ visible, schemeName, onClose }: { visible: boolean; schemeName: string; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={screenStyles.modalOverlay}>
        <View style={screenStyles.kycModalCard}>
          <LinearGradient colors={["#163d72", "#238fd1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={screenStyles.closedModalHero}>
            <Pressable onPress={onClose} style={screenStyles.kycModalClose}><Text style={screenStyles.kycModalCloseText}>×</Text></Pressable>
            <View style={screenStyles.closedModalIcon}><Text style={screenStyles.closedModalIconText}>⏳</Text></View>
            <Text style={screenStyles.kycModalKicker}>REDEMPTION UNAVAILABLE</Text>
            <Text style={screenStyles.kycModalTitle}>Redemption window is closed</Text>
          </LinearGradient>
          <View style={screenStyles.kycModalBody}>
            <Text style={screenStyles.closedModalScheme}>{schemeName}</Text>
            <Text style={screenStyles.kycModalMessage}>
              For more information, please contact our support team.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function KycGateModal({
  visible,
  uploaded,
  approved,
  onClose,
  onGoKyc
}: {
  visible: boolean;
  uploaded: number;
  approved: number;
  onClose: () => void;
  onGoKyc: () => void;
}) {
  const missing = Math.max(4 - uploaded, 0);
  const message = uploaded <= 0
    ? "Please upload and submit your KYC documents before redeeming rewards."
    : "Your KYC documents are still pending approval. Redemption will unlock after all documents are approved.";

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={screenStyles.modalOverlay}>
        <View style={screenStyles.kycModalCard}>
          <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={screenStyles.kycModalHero}>
            <Pressable onPress={onClose} style={screenStyles.kycModalClose}><Text style={screenStyles.kycModalCloseText}>×</Text></Pressable>
            <View style={screenStyles.kycModalIcon}><Text style={screenStyles.kycModalIconText}>✓</Text></View>
            <Text style={screenStyles.kycModalKicker}>KYC REQUIRED</Text>
            <Text style={screenStyles.kycModalTitle}>Complete KYC to redeem</Text>
          </LinearGradient>
          <View style={screenStyles.kycModalBody}>
            <Text style={screenStyles.kycModalMessage}>{message}</Text>
            <View style={screenStyles.kycModalStats}>
              <View style={screenStyles.kycModalStat}>
                <Text style={screenStyles.kycModalStatValue}>{uploaded}</Text>
                <Text style={screenStyles.kycModalStatLabel}>Uploaded</Text>
              </View>
              <View style={screenStyles.kycModalStat}>
                <Text style={screenStyles.kycModalStatValue}>{approved}</Text>
                <Text style={screenStyles.kycModalStatLabel}>Approved</Text>
              </View>
              <View style={screenStyles.kycModalStat}>
                <Text style={screenStyles.kycModalStatValue}>{missing}</Text>
                <Text style={screenStyles.kycModalStatLabel}>Missing</Text>
              </View>
            </View>
            <Pressable onPress={onGoKyc} style={screenStyles.kycModalButtonWrap}>
              <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={screenStyles.kycModalButton}>
                <Text style={screenStyles.kycModalButtonText}>GO TO KYC  →</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={onClose} style={screenStyles.kycModalLater}>
              <Text style={screenStyles.kycModalLaterText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RedeemHeader({ title, step, onBack }: { title: string; step: number; onBack: () => void }) {
  return (
    <View style={screenStyles.header}>
      <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={screenStyles.headerGradient} />
      <Svg width="100%" height={72} viewBox="0 0 390 72" preserveAspectRatio="none" style={screenStyles.headerWave}>
        <Path d="M0 28 C68 12 138 8 214 25 C284 42 336 37 390 8 L390 72 L0 72 Z" fill="#f8fafc" />
        <Path d="M0 31 C70 15 140 11 216 28 C286 45 338 40 390 11 L390 72 L0 72 Z" fill="#ffffff" opacity={0.98} />
      </Svg>
      <Pressable onPress={onBack} style={screenStyles.backButton}>
        <Text style={screenStyles.backText}>←</Text>
      </Pressable>
      <Text style={screenStyles.headerTitle}>{title}</Text>
      <View style={screenStyles.stepBadge}>
        <View style={screenStyles.stepBadgeDot} />
        <Text style={screenStyles.stepBadgeText}>STEP <Text style={screenStyles.stepBadgeNumber}>{step}</Text> OF 3</Text>
      </View>
    </View>
  );
}

function WalletStep({
  wallets,
  walletType,
  schemeKey,
  highlightSchemeSection,
  onSelect,
  onSchemeSelect,
  onSchemeSectionLayout
}: {
  wallets: RedeemWallet[];
  walletType: WalletChoice | null;
  schemeKey: string | null;
  highlightSchemeSection: boolean;
  onSelect: (type: WalletChoice) => void;
  onSchemeSelect: (schemeKey: string) => void;
  onSchemeSectionLayout: (event: LayoutChangeEvent) => void;
}) {
  const selectedWallet = wallets.find((wallet) => wallet.type === walletType);
  return (
    <>
      <Text style={screenStyles.title}>Which <Text style={screenStyles.titleAccent}>wallet</Text> to redeem from?</Text>
      <Text style={screenStyles.subtitle}>Each wallet has its own redemption cycle</Text>
      <View style={screenStyles.walletList}>
        {wallets.map((wallet) => (
          <WalletCard
            key={wallet.type}
            wallet={wallet}
            selected={walletType === wallet.type}
            onPress={() => onSelect(wallet.type)}
          />
        ))}
      </View>
      {selectedWallet ? (
        <View onLayout={onSchemeSectionLayout} style={[screenStyles.schemeSection, highlightSchemeSection && screenStyles.schemeSectionHighlighted]}>
          <Text style={screenStyles.schemeSectionTitle}>Select Scheme</Text>
          <View style={screenStyles.schemeList}>
            {selectedWallet.schemes.map((scheme) => (
              <Pressable
                key={scheme.id}
                onPress={() => onSchemeSelect(scheme.id)}
                style={[screenStyles.schemeCard, schemeKey === scheme.id && screenStyles.schemeCardActive]}
              >
                <View style={screenStyles.schemeCopy}>
                  <Text style={screenStyles.schemeName}>{scheme.name}</Text>
                  <Text style={screenStyles.schemeSub}>{selectedWallet.title}</Text>
                </View>
                <Text style={screenStyles.schemePoints}>{scheme.pointsDisplay}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <View style={screenStyles.tipBox}>
        <Text style={screenStyles.tipIcon}>💡</Text>
        <Text style={screenStyles.tipText}>
          Minimum redemption <Text style={screenStyles.tipStrong}>₹500</Text> per request. Each wallet is redeemed independently via NEFT or IMPS to your registered bank.
        </Text>
      </View>
    </>
  );
}

function WalletCard({ wallet, selected, onPress }: { wallet: RedeemWallet; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[screenStyles.walletCard, { backgroundColor: wallet.surface }, selected && screenStyles.walletCardSelected]}>
      <View style={screenStyles.walletTop}>
        <View style={[screenStyles.walletIconBox, { backgroundColor: wallet.iconSurface }]}>
          <Text style={screenStyles.walletIcon}>{wallet.icon}</Text>
        </View>
        <View style={screenStyles.walletCopy}>
          <Text style={screenStyles.walletTitle}>{wallet.title}</Text>
          <Text style={screenStyles.walletSubtitle}>{wallet.subtitle}</Text>
        </View>
        <View style={[screenStyles.radio, selected && screenStyles.radioActive]}>{selected ? <View style={screenStyles.radioDot} /> : null}</View>
      </View>
      <Text style={screenStyles.available}>AVAILABLE</Text>
      <Text style={[screenStyles.balance, { color: wallet.balanceColor }]}>{money(wallet.balance)}</Text>
      <Text style={screenStyles.walletDetail}>{wallet.detail}</Text>
      <View style={[screenStyles.statusPill, wallet.badgeTone === "success" ? screenStyles.statusPillSuccess : screenStyles.statusPillDanger]}>
        <Text style={[screenStyles.statusText, wallet.badgeTone === "success" ? screenStyles.statusTextSuccess : screenStyles.statusTextDanger]}>
          {wallet.badge}
        </Text>
      </View>
    </Pressable>
  );
}

function AmountStep({ wallet, scheme, amount, onAmountChange }: { wallet: RedeemWallet; scheme: RedeemScheme | null; amount: string; onAmountChange: (value: string) => void }) {
  const amountNumber = Number(amount || 0);
  const maxPoints = scheme?.points ?? wallet.balance;
  const presets = [
    { label: "₹500", value: Math.min(MIN_REDEMPTION, maxPoints) },
    { label: "25%", value: Math.floor(maxPoints * 0.25) },
    { label: "50%", value: Math.floor(maxPoints * 0.5) },
    { label: "Max", value: maxPoints }
  ];

  return (
    <>
      <View style={screenStyles.walletPill}>
        <Text style={screenStyles.walletPillIcon}>{wallet.icon}</Text>
        <Text numberOfLines={1} style={screenStyles.walletPillText}>{scheme?.name || wallet.title} · {money(maxPoints)} available</Text>
      </View>
      <Text style={screenStyles.title}>How much to <Text style={screenStyles.titleAccent}>redeem?</Text></Text>
      <Text style={screenStyles.subtitle}>Min ₹500 · Max {money(maxPoints)}</Text>
      <View style={screenStyles.amountBox}>
        <Text style={screenStyles.amountLabel}>REDEMPTION AMOUNT</Text>
        <View style={screenStyles.amountInputRow}>
          <Text style={screenStyles.amountCurrency}>₹</Text>
          <TextInput
            value={amount}
            onChangeText={(value) => onAmountChange(value.replace(/\D/g, "").slice(0, 7))}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#777"
            style={screenStyles.amountInput}
          />
        </View>
      </View>
      <View style={screenStyles.presetRow}>
        {presets.map((preset) => (
          <Pressable key={preset.label} onPress={() => onAmountChange(String(preset.value || ""))} style={screenStyles.presetCard}>
            <Text style={screenStyles.presetTitle}>{preset.label}</Text>
            <Text style={screenStyles.presetValue}>{money(preset.value || 0)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={screenStyles.balanceRow}>
        <Text style={screenStyles.balanceRowLabel}>{wallet.icon}  {scheme?.name || wallet.title} Balance</Text>
        <Text style={screenStyles.balanceRowValue}>{money(maxPoints - amountNumber >= 0 ? maxPoints : maxPoints)}</Text>
      </View>
    </>
  );
}

function ConfirmStep({
  wallet,
  scheme,
  amount,
  tds,
  payable,
  bankAccount,
  transferMethod,
  bankConfirmed,
  onTransferMethodChange,
  onBankConfirmedChange,
  onEdit
}: {
  wallet: RedeemWallet;
  scheme: RedeemScheme | null;
  amount: number;
  tds: number;
  payable: number;
  bankAccount: PreviewBankAccount;
  transferMethod: RedemptionMode;
  bankConfirmed: boolean;
  onTransferMethodChange: (method: RedemptionMode) => void;
  onBankConfirmedChange: (confirmed: boolean) => void;
  onEdit: () => void;
}) {
  return (
    <>
      <Text style={screenStyles.title}>Review & <Text style={screenStyles.titleAccent}>confirm</Text></Text>
      <Text style={screenStyles.subtitle}>Double-check the details before submitting</Text>
      <LinearGradient colors={[colors.deepGreen, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={screenStyles.confirmHero}>
        <View style={screenStyles.heroOrbLarge} />
        <View style={screenStyles.heroOrbSmall} />
        <View style={screenStyles.confirmHeroHeader}>
          <Text style={screenStyles.confirmLabel}>REDEEMING FROM</Text>
          <Pressable onPress={onEdit} style={screenStyles.editPill}><Text style={screenStyles.editText}>Edit</Text></Pressable>
        </View>
        <Text style={screenStyles.confirmWallet}>{wallet.icon}  {scheme?.name || wallet.title}</Text>
        <Text style={screenStyles.confirmAmount}>{money(amount)}</Text>
        <Text style={screenStyles.confirmSub}>After this · {money(Math.max((scheme?.points ?? wallet.balance) - amount, 0))} left in scheme</Text>
      </LinearGradient>

      <View style={screenStyles.bankCard}>
        <View style={screenStyles.cardHeaderRow}>
          <Text style={screenStyles.cardKicker}>DEPOSIT TO</Text>
          <View style={screenStyles.verifiedBadge}><View style={screenStyles.verifiedDot} /><Text style={screenStyles.verifiedText}>VERIFIED</Text></View>
        </View>
        <View style={screenStyles.bankMain}>
          <View style={screenStyles.bankIconBox}><Text style={screenStyles.bankIcon}>🏦</Text></View>
          <View style={screenStyles.bankCopy}>
            <Text style={screenStyles.bankName}>{bankAccount.bank_name}</Text>
            <Text style={screenStyles.bankMeta}>{bankAccount.account_holder_name}</Text>
          </View>
        </View>
        <View style={screenStyles.dashedDivider} />
        <BankDetailRow label="Account number" value={bankAccount.account_number} />
        <BankDetailRow label="IFSC code" value={bankAccount.ifsc_code} />
        <BankDetailRow label="Primary account" value={bankAccount.is_primary ? "Yes" : "No"} />
        <View style={screenStyles.dashedDivider} />
        <Pressable onPress={() => onBankConfirmedChange(!bankConfirmed)} style={[screenStyles.bankConfirmBox, bankConfirmed && screenStyles.bankConfirmBoxActive]}>
          <View style={[screenStyles.checkbox, bankConfirmed && screenStyles.checkboxActive]}>
            {bankConfirmed ? <Text style={screenStyles.checkboxTick}>✓</Text> : null}
          </View>
          <Text style={[screenStyles.bankConfirmText, bankConfirmed && screenStyles.bankConfirmTextActive]}>
            I confirm that the bank details shown above are correct.
          </Text>
        </Pressable>
        <View style={screenStyles.dashedDivider} />
        <View style={screenStyles.transferRow}>
          <Text style={screenStyles.transferLabel}>Transfer method</Text>
          <View style={screenStyles.transferOptions}>
            {(["NEFT", "IMPS"] as RedemptionMode[]).map((method) => {
              const selected = transferMethod === method;
              return (
                <Pressable
                  key={method}
                  onPress={() => onTransferMethodChange(method)}
                  style={[screenStyles.transferOption, selected && screenStyles.transferOptionActive]}
                >
                  <Text style={[screenStyles.transferOptionText, selected && screenStyles.transferOptionTextActive]}>
                    {method}{method === "IMPS" ? " ⚡" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={screenStyles.breakdownCard}>
        <Text style={screenStyles.cardKicker}>PAYMENT BREAKDOWN</Text>
        <PaymentRow label="Redemption amount" value={money(amount)} />
        <PaymentRow label="TDS (Sec 194R)" value={`- ${money(tds)}`} pill="NOT APPLIED" muted={tds <= 0} />
        <View style={screenStyles.solidDivider} />
        <View style={screenStyles.receiveBox}>
          <Text style={screenStyles.receiveLabel}>You'll receive</Text>
          <Text style={screenStyles.receiveValue}>{money(payable || amount)}</Text>
        </View>
      </View>
    </>
  );
}

function BankDetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={screenStyles.bankDetailRow}>
      <Text style={screenStyles.bankDetailLabel}>{label}</Text>
      <Text selectable style={screenStyles.bankDetailValue}>{value || "-"}</Text>
    </View>
  );
}

function PaymentRow({ label, value, pill, muted }: { label: string; value: string; pill?: string; muted?: boolean }) {
  return (
    <View style={screenStyles.paymentRow}>
      <View style={screenStyles.paymentLabelRow}>
        <Text style={screenStyles.paymentLabel}>{label}</Text>
        {pill ? <Text style={screenStyles.paymentPill}>{pill}</Text> : null}
      </View>
      <Text style={[screenStyles.paymentValue, muted && screenStyles.paymentValueMuted]}>{value}</Text>
    </View>
  );
}

function SuccessStep({
  amount,
  wallet,
  bankAccount,
  transferMethod,
  requestId,
  onClose,
  onHome
}: {
  amount: number;
  wallet: RedeemWallet;
  bankAccount: PreviewBankAccount;
  transferMethod: RedemptionMode;
  requestId: string;
  onClose: () => void;
  onHome: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={["left", "right"]} style={screenStyles.safe}>
      <StatusBar style="light" />
      <View style={[screenStyles.phone, { paddingTop: Math.max(insets.top - 8, 0), paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
        <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={screenStyles.successTop} />
        <Svg width="100%" height={92} viewBox="0 0 390 92" preserveAspectRatio="none" style={screenStyles.successWave}>
          <Path d="M0 40 C66 22 142 18 212 39 C284 60 336 51 390 20 L390 92 L0 92 Z" fill="#f8fafc" />
          <Path d="M0 43 C68 25 145 21 214 42 C286 63 338 54 390 23 L390 92 L0 92 Z" fill="#ffffff" opacity={0.98} />
        </Svg>
        <Pressable onPress={onClose} style={screenStyles.closeButton}><Text style={screenStyles.closeText}>×</Text></Pressable>
        <ScrollView style={screenStyles.scroll} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={screenStyles.successContent}>
          <View style={screenStyles.checkGlow}>
            <LinearGradient colors={gradients.main} style={screenStyles.checkCircle}>
              <Text style={screenStyles.checkText}>✓</Text>
            </LinearGradient>
          </View>
          <Text style={screenStyles.successTitle}>Request Submitted!</Text>
          <Text style={screenStyles.successSubtitle}>Your redemption will be credited to your bank within{"\n"}24 hours</Text>
          <View style={screenStyles.creditCard}>
            <View style={screenStyles.creditHeader}>
              <View>
                <Text style={screenStyles.cardKicker}>AMOUNT CREDITED TO BANK</Text>
                <Text style={screenStyles.creditAmount}>{money(amount)}</Text>
              </View>
              <View style={screenStyles.bankIconBox}><Text style={screenStyles.bankIcon}>🏦</Text></View>
            </View>
            <View style={screenStyles.dashedDivider} />
            <ReceiptRow label="Request ID" value={requestId} />
            <ReceiptRow label="From wallet" value={`${wallet.icon} ${wallet.title}`} />
            <ReceiptRow label="Bank name" value={bankAccount.bank_name || "-"} />
            <ReceiptRow label="Account holder" value={bankAccount.account_holder_name || "-"} />
            <ReceiptRow label="Account number" value={bankAccount.account_number || "-"} />
            <ReceiptRow label="IFSC code" value={bankAccount.ifsc_code || "-"} />
            <ReceiptRow label="Primary account" value={bankAccount.is_primary ? "Yes" : "No"} />
            <ReceiptRow label="Transfer method" value={transferMethod} />
            <ReceiptRow label="Submitted on" value="Today, 9:41 AM" />
          </View>
          <View style={screenStyles.trackerCard}>
            <Text style={screenStyles.cardKicker}>STATUS TRACKER</Text>
            <TrackerStep active done title="Request submitted" sub="Today, 9:41 AM" />
            <TrackerStep active title="Approval by KSB finance" sub="Within a few hours" />
            <TrackerStep title="Bank transfer initiated" sub={transferMethod} />
            <TrackerStep last title="Credited to your account" sub="Within 24 hours" />
          </View>
        </ScrollView>
        <LinearGradient colors={gradients.main} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={screenStyles.successBottom} />
        <View style={screenStyles.successFooter}>
          <Pressable style={screenStyles.trackButton}><Text style={screenStyles.trackText}>TRACK STATUS</Text></Pressable>
          <Pressable onPress={onHome} style={screenStyles.homeButton}><Text style={screenStyles.homeText}>BACK TO HOME  →</Text></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={screenStyles.receiptRow}>
      <Text style={screenStyles.receiptLabel}>{label}</Text>
      <Text style={screenStyles.receiptValue}>{value}</Text>
    </View>
  );
}

function TrackerStep({ title, sub, active, done, last }: { title: string; sub: string; active?: boolean; done?: boolean; last?: boolean }) {
  return (
    <View style={screenStyles.trackerRow}>
      <View style={screenStyles.trackerIconWrap}>
        <View style={[screenStyles.trackerLine, last && screenStyles.trackerLineHidden, active && screenStyles.trackerLineActive]} />
        <View style={[screenStyles.trackerDot, active && screenStyles.trackerDotActive]}>
          <Text style={[screenStyles.trackerDotText, active && screenStyles.trackerDotTextActive]}>{done ? "✓" : "•"}</Text>
        </View>
      </View>
      <View style={screenStyles.trackerCopy}>
        <Text style={[screenStyles.trackerTitle, active && screenStyles.trackerTitleActive]}>{title}</Text>
        <Text style={screenStyles.trackerSub}>{sub}</Text>
      </View>
    </View>
  );
}

function buildWallets(dashboard: DashboardData): RedeemWallet[] {
  return [
    {
      type: "SLAB",
      title: dashboard.slabWallet?.title || "Slab Wallet",
      subtitle: walletSubtitle(dashboard.slabWallet, "Wallet A · Quarterly"),
      balance: dashboard.slabWallet?.balance ?? 0,
      balanceColor: colors.primary,
      surface: "#fbfffe",
      iconSurface: "#dff1ef",
      icon: "📊",
      detail: slabDetail(dashboard.slabWallet),
      badge: slabBadge(dashboard.slabWallet),
      badgeTone: "danger",
      customerId: dashboard.customerId,
      loyaltySchemeId: dashboard.slabWallet?.loyaltySchemeId ?? dashboard.slabWallet?.schemeId,
      schemes: buildSchemeOptions(dashboard.slabWallet, "Slab Scheme")
    },
    {
      type: "BOOSTER",
      title: dashboard.boosterWallet?.title || "Booster Wallet",
      subtitle: walletSubtitle(dashboard.boosterWallet, "Wallet B · Permanent"),
      balance: dashboard.boosterWallet?.balance ?? 0,
      balanceColor: "#c99000",
      surface: "#fffdf5",
      iconSurface: "#fff2c9",
      icon: "🎁",
      detail: boosterDetail(dashboard),
      badge: "∞ NEVER EXPIRES",
      badgeTone: "success",
      customerId: dashboard.customerId,
      loyaltySchemeId: dashboard.boosterWallet?.loyaltySchemeId ?? dashboard.boosterWallet?.schemeId,
      schemes: buildSchemeOptions(dashboard.boosterWallet, "Booster Scheme")
    }
  ];
}

function buildSchemeOptions(wallet: WalletSummary | undefined, fallbackName: string): RedeemScheme[] {
  const sourceSchemes = wallet?.schemes?.length
    ? wallet.schemes
    : [{
      name: wallet?.schemeName || fallbackName,
      points: wallet?.balance ?? 0,
      pointsDisplay: pointsText(wallet?.balance ?? 0),
      loyaltySchemeId: wallet?.loyaltySchemeId ?? wallet?.schemeId,
      redemptionEnabled: wallet?.redemptionEnabled
    } as WalletSchemeBalance];

  return sourceSchemes.map((scheme, index) => {
    const loyaltySchemeId = scheme.loyaltySchemeId ?? scheme.schemeId ?? scheme.id;
    const points = scheme.points ?? 0;
    return {
      id: `${loyaltySchemeId ?? "scheme"}-${index}`,
      name: scheme.name || fallbackName,
      points,
      pointsDisplay: scheme.pointsDisplay || pointsText(points),
      loyaltySchemeId,
      redemptionEnabled: scheme.redemptionEnabled ?? wallet?.redemptionEnabled ?? true
    };
  });
}

function walletSubtitle(wallet: WalletSummary | undefined, fallback: string) {
  if (!wallet?.subtitle) return fallback;
  if (wallet.subtitle.toLowerCase().includes("wallet")) return wallet.subtitle;
  return fallback;
}

function slabDetail(wallet: WalletSummary | undefined) {
  const rewardLabel = wallet?.achievedLabel || (wallet?.rate ? `${wallet.rate}%` : "2.0%");
  const turnover = wallet?.invoiceValueShort || (wallet?.invoiceValue ? moneyInLakh(wallet.invoiceValue) : "₹7.2L");
  return `@ ${rewardLabel} on ${turnover} turnover`;
}

function slabBadge(wallet: WalletSummary | undefined) {
  const expiry = wallet?.expiresOn || wallet?.endDate || wallet?.daysLeftMessage;
  if (expiry) return `⏱ USE OR LOSE · WIPES ${expiry.toUpperCase()}`;
  if (wallet?.expiryDays) return `⏱ USE OR LOSE · ${wallet.expiryDays} DAYS LEFT`;
  return "⏱ USE OR LOSE · WIPES 30 JUN";
}

function boosterDetail(dashboard: DashboardData) {
  const activeBoosters = dashboard.boosterWallet?.activeBoosters ?? (dashboard.boosterWallet?.isActive ? 1 : 0);
  const units = dashboard.approvedInvoices || dashboard.invoiceCount || dashboard.totalInvoices || 0;
  return `From ${units} boosted units · ${activeBoosters} active boosters`;
}

function normalizeBankAccount(raw: any): PreviewBankAccount {
  return {
    account_holder_name: String(raw?.account_holder_name ?? raw?.accountHolderName ?? fallbackBankAccount.account_holder_name),
    account_number: String(raw?.account_number ?? raw?.accountNumber ?? raw?.masked_account_number ?? raw?.maskedAccountNumber ?? fallbackBankAccount.account_number),
    masked_account_number: raw?.masked_account_number ?? raw?.maskedAccountNumber,
    bank_name: String(raw?.bank_name ?? raw?.bankName ?? fallbackBankAccount.bank_name),
    ifsc_code: String(raw?.ifsc_code ?? raw?.ifscCode ?? fallbackBankAccount.ifsc_code),
    is_primary: Boolean(raw?.is_primary ?? raw?.isPrimary ?? fallbackBankAccount.is_primary)
  };
}

function isKycApproved(kyc: KycDetails) {
  if (String(kyc.summary.status || "").toLowerCase().includes("approve") && kyc.summary.approved >= 4) return true;
  const approvedCount = kyc.documents.filter((doc) => String(doc.statusLabel || doc.status || "").toLowerCase().includes("approve")).length;
  return kyc.documents.length >= 4 && approvedCount >= 4;
}

const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#e8edf3" },
  phone: { flex: 1, overflow: "hidden", backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },
  header: { height: 170, position: "relative", zIndex: 2 },
  headerGradient: { ...StyleSheet.absoluteFillObject },
  headerWave: { position: "absolute", left: 0, right: 0, bottom: -1 },
  backButton: { position: "absolute", left: 34, top: 34, width: 50, height: 50, borderRadius: 16, borderWidth: 1.4, borderColor: "rgba(255,255,255,0.42)", backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center" },
  backText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 22, marginTop: -2 },
  headerTitle: { position: "absolute", left: 92, right: 34, top: 50, textAlign: "center", fontFamily: jakarta.extraBold, color: colors.white, fontSize: 18, letterSpacing: 3 },
  stepBadge: { position: "absolute", bottom: 5, alignSelf: "center", height: 34, minWidth: 168, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1.2, borderColor: "rgba(255, 255, 255, 0.82)", backgroundColor: "rgba(62, 131, 215, 0.6)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  stepBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  stepBadgeText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13, letterSpacing: 3 },
  stepBadgeNumber: { color: colors.gold },
  content: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 22, paddingBottom: 132 },
  confirmContent: { paddingBottom: 160 },
  title: { fontFamily: jakarta.extraBold, color: "#071323", fontSize: 30, lineHeight: 38, letterSpacing: 0 },
  titleAccent: { color: colors.primary },
  subtitle: { marginTop: 4, fontFamily: jakarta.medium, color: colors.muted, fontSize: 17, lineHeight: 24 },
  walletList: { marginTop: 32, gap: 18 },
  walletCard: { minHeight: 184, borderRadius: 22, borderWidth: 1.2, borderColor: "#dfe6ee", paddingHorizontal: 22, paddingTop: 22, paddingBottom: 20, shadowColor: colors.navy, shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  walletCardSelected: { borderColor: "#a7d4f2", shadowColor: colors.primary, shadowOpacity: 0.12 },
  walletTop: { flexDirection: "row", alignItems: "center" },
  walletIconBox: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  walletIcon: { fontSize: 30 },
  walletCopy: { flex: 1, paddingHorizontal: 16 },
  walletTitle: { fontFamily: jakarta.extraBold, color: "#071323", fontSize: 20 },
  walletSubtitle: { marginTop: 2, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 14 },
  radio: { width: 39, height: 39, borderRadius: 20, borderWidth: 2, borderColor: "#e2e8f0", backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 19, height: 19, borderRadius: 10, backgroundColor: colors.primary },
  available: { marginTop: 22, fontFamily: jakarta.extraBold, color: "#a3afbd", fontSize: 14, letterSpacing: 2.5 },
  balance: { marginTop: 2, fontFamily: jakarta.extraBold, fontSize: 42, lineHeight: 50, letterSpacing: 0 },
  walletDetail: { marginTop: 4, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 14.5, lineHeight: 20 },
  statusPill: { marginTop: 16, alignSelf: "flex-start", minHeight: 30, borderRadius: 999, borderWidth: 1.2, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  statusPillDanger: { borderColor: "#ffc3c3", backgroundColor: "#fff4f2" },
  statusPillSuccess: { borderColor: "#a7d4f2", backgroundColor: "#e8f4ff" },
  statusText: { fontFamily: jakarta.extraBold, fontSize: 12.5, letterSpacing: 0.8 },
  statusTextDanger: { color: "#e53434" },
  statusTextSuccess: { color: colors.primary },
  schemeSection: { marginTop: 26, marginHorizontal: -12, padding: 12, borderRadius: 22, borderWidth: 1.2, borderColor: "transparent" },
  schemeSectionHighlighted: { borderColor: "#a7d4f2", backgroundColor: "#f2f8ff", shadowColor: colors.primary, shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  schemeSectionTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 20 },
  schemeList: { marginTop: 14, gap: 12 },
  schemeCard: { minHeight: 68, borderRadius: 17, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: colors.white, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  schemeCardActive: { borderColor: colors.primary, backgroundColor: "#e8f4ff" },
  schemeCopy: { flex: 1, minWidth: 0 },
  schemeName: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 16 },
  schemeSub: { marginTop: 3, fontFamily: jakarta.bold, color: colors.muted, fontSize: 11 },
  schemePoints: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 17 },
  tipBox: { marginTop: 30, borderRadius: 16, borderWidth: 1.2, borderStyle: "dashed", borderColor: "#a7d4f2", backgroundColor: "#f2f8ff", paddingHorizontal: 18, paddingVertical: 18, flexDirection: "row", gap: 14, alignItems: "flex-start" },
  tipIcon: { marginTop: 1, fontSize: 22 },
  tipText: { flex: 1, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 14, lineHeight: 22 },
  tipStrong: { color: colors.navy },
  walletPill: { marginBottom: 34, alignSelf: "flex-start", maxWidth: "100%", minHeight: 38, borderRadius: 999, borderWidth: 1.2, borderColor: "#bddbf2", backgroundColor: "#e8f4ff", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  walletPillIcon: { fontSize: 19 },
  walletPillText: { flexShrink: 1, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 14 },
  amountBox: { marginTop: 34, height: 164, borderRadius: 22, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: "#fbfffe", alignItems: "center", justifyContent: "center", shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  amountLabel: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 13, letterSpacing: 3.2 },
  amountInputRow: { marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  amountCurrency: { fontFamily: jakarta.extraBold, color: "#8c939b", fontSize: 54, lineHeight: 62 },
  amountInput: { minWidth: 132, height: 76, padding: 0, textAlign: "center", fontFamily: jakarta.extraBold, color: "#777", fontSize: 54, lineHeight: 62 },
  presetRow: { marginTop: 24, flexDirection: "row", gap: 10 },
  presetCard: { flex: 1, minHeight: 74, borderRadius: 15, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  presetTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 16 },
  presetValue: { marginTop: 4, fontFamily: jakarta.extraBold, color: "#9aa6b3", fontSize: 12 },
  balanceRow: { marginTop: 28, minHeight: 58, borderRadius: 18, backgroundColor: "#f9fbfd", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  balanceRowLabel: { flex: 1, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 15 },
  balanceRowValue: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 20 },
  confirmHero: { marginTop: 30, minHeight: 242, borderRadius: 22, padding: 26, overflow: "hidden" },
  confirmHeroHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  confirmLabel: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13, letterSpacing: 3 },
  editPill: { minWidth: 70, height: 34, borderRadius: 999, borderWidth: 1.2, borderColor: "rgba(255,255,255,0.55)", backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  editText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 14 },
  confirmWallet: { marginTop: 14, fontFamily: jakarta.extraBold, color: colors.white, fontSize: 20 },
  confirmAmount: { marginTop: 20, fontFamily: jakarta.extraBold, color: colors.white, fontSize: 56, lineHeight: 64 },
  confirmSub: { marginTop: 10, fontFamily: jakarta.extraBold, color: colors.white, fontSize: 14.5 },
  heroOrbLarge: { position: "absolute", right: -36, top: -24, width: 142, height: 142, borderRadius: 71, backgroundColor: "rgba(255,255,255,0.14)" },
  heroOrbSmall: { position: "absolute", right: 58, bottom: -46, width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.12)" },
  bankCard: { marginTop: 22, borderRadius: 22, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: colors.white, padding: 22 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  cardKicker: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 13, letterSpacing: 3 },
  verifiedBadge: { height: 26, borderRadius: 999, borderWidth: 1.2, borderColor: "#a7d4f2", backgroundColor: "#e8f4ff", paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 7 },
  verifiedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  verifiedText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 11 },
  bankMain: { marginTop: 22, flexDirection: "row", alignItems: "center", gap: 16 },
  bankIconBox: { width: 58, height: 58, borderRadius: 16, backgroundColor: "#cfeeff", alignItems: "center", justifyContent: "center" },
  bankIcon: { fontSize: 30 },
  bankCopy: { flex: 1 },
  bankName: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 20 },
  bankMeta: { marginTop: 4, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 14 },
  dashedDivider: { marginVertical: 18, borderStyle: "dashed", borderTopWidth: 1.2, borderTopColor: "#dfe6ee" },
  bankDetailRow: { minHeight: 28, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14 },
  bankDetailLabel: { flex: 0.78, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 13 },
  bankDetailValue: { flex: 1.2, textAlign: "right", fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 13, lineHeight: 18 },
  bankConfirmBox: { minHeight: 58, borderRadius: 15, borderWidth: 1.2, borderColor: "#ffe2ce", backgroundColor: "#fff7ef", paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  bankConfirmBoxActive: { borderColor: "#a7d4f2", backgroundColor: "#e8f4ff" },
  checkbox: { width: 23, height: 23, borderRadius: 6, borderWidth: 1.8, borderColor: "#9aa6b3", backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  checkboxActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkboxTick: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 14, lineHeight: 18 },
  bankConfirmText: { flex: 1, fontFamily: jakarta.extraBold, color: "#a23a12", fontSize: 13, lineHeight: 19 },
  bankConfirmTextActive: { color: colors.primary },
  transferRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  transferLabel: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 14 },
  transferOptions: { flexDirection: "row", gap: 8 },
  transferOption: { minWidth: 70, height: 34, borderRadius: 999, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: "#f9fbfd", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  transferOptionActive: { borderColor: "#a7d4f2", backgroundColor: "#e8f4ff" },
  transferOptionText: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 12 },
  transferOptionTextActive: { color: colors.primary },
  breakdownCard: { marginTop: 22, borderRadius: 22, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: colors.white, padding: 22 },
  paymentRow: { marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  paymentLabelRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  paymentLabel: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 16 },
  paymentPill: { overflow: "hidden", borderRadius: 999, borderWidth: 1, borderColor: "#a7d4f2", backgroundColor: "#e8f4ff", paddingHorizontal: 10, paddingVertical: 2, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 10 },
  paymentValue: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 18 },
  paymentValueMuted: { color: "#9aa6b3" },
  solidDivider: { height: 1, backgroundColor: "#dfe6ee", marginTop: 22 },
  receiveBox: { marginTop: 22, minHeight: 72, borderRadius: 16, borderWidth: 1.2, borderColor: "#bddbf2", backgroundColor: "#f2f8ff", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  receiveLabel: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 16 },
  receiveValue: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 30 },
  footer: { position: "absolute", left: 26, right: 26, bottom: 22, zIndex: 6 },
  confirmFooter: { bottom: 18 },
  footerButtonWrap: { borderRadius: 18, overflow: "hidden", shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  footerButton: { height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  footerText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 15, letterSpacing: 2.2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(7,19,35,0.54)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  kycModalCard: { width: "100%", maxWidth: 360, borderRadius: 28, overflow: "hidden", backgroundColor: colors.white, shadowColor: colors.navy, shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
  kycModalHero: { minHeight: 178, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 22, alignItems: "center" },
  closedModalHero: { minHeight: 190, paddingHorizontal: 24, paddingTop: 26, paddingBottom: 24, alignItems: "center" },
  closedModalIcon: { width: 72, height: 72, borderRadius: 24, borderWidth: 1.4, borderColor: "rgba(255,255,255,0.42)", backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  closedModalIconText: { fontSize: 34 },
  closedModalScheme: { marginBottom: 10, textAlign: "center", fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 17, lineHeight: 23 },
  kycModalClose: { position: "absolute", right: 18, top: 16, width: 36, height: 36, borderRadius: 13, borderWidth: 1.2, borderColor: "rgba(255,255,255,0.38)", backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  kycModalCloseText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 24, marginTop: -2 },
  kycModalIcon: { width: 72, height: 72, borderRadius: 24, borderWidth: 1.4, borderColor: "rgba(255,255,255,0.42)", backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  kycModalIconText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 38 },
  kycModalKicker: { marginTop: 18, fontFamily: jakarta.extraBold, color: "rgba(255,255,255,0.78)", fontSize: 11, letterSpacing: 3 },
  kycModalTitle: { marginTop: 7, textAlign: "center", fontFamily: jakarta.extraBold, color: colors.white, fontSize: 24, lineHeight: 31 },
  kycModalBody: { padding: 22 },
  kycModalMessage: { textAlign: "center", fontFamily: jakarta.bold, color: colors.muted, fontSize: 14, lineHeight: 21 },
  kycModalStats: { marginTop: 18, flexDirection: "row", gap: 10 },
  kycModalStat: { flex: 1, minHeight: 70, borderRadius: 17, borderWidth: 1, borderColor: "#dfe6ee", backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  kycModalStatValue: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 24 },
  kycModalStatLabel: { marginTop: 2, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 9 },
  kycModalButtonWrap: { marginTop: 20, borderRadius: 18, overflow: "hidden" },
  kycModalButton: { height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  kycModalButtonText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 13, letterSpacing: 2 },
  kycModalLater: { height: 42, alignItems: "center", justifyContent: "center" },
  kycModalLaterText: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 13 },
  successTop: { position: "absolute", top: 0, left: 0, right: 0, height: 196 },
  successWave: { position: "absolute", top: 150, left: 0, right: 0 },
  closeButton: { position: "absolute", right: 34, top: 34, zIndex: 4, width: 50, height: 50, borderRadius: 16, borderWidth: 1.4, borderColor: "rgba(255,255,255,0.42)", backgroundColor: "rgba(255,255,255,0.17)", alignItems: "center", justifyContent: "center" },
  closeText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 30, marginTop: -3 },
  successContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 132, paddingBottom: 178, alignItems: "center" },
  checkGlow: { width: 136, height: 136, borderRadius: 68, backgroundColor: "rgba(21,89,154,0.12)", alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOpacity: 0.22, shadowRadius: 34, shadowOffset: { width: 0, height: 12 }, elevation: 9 },
  checkCircle: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center" },
  checkText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 46 },
  successTitle: { marginTop: 34, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 33, lineHeight: 40, textAlign: "center", letterSpacing: 0 },
  successSubtitle: { marginTop: 12, fontFamily: jakarta.medium, color: colors.muted, fontSize: 17, lineHeight: 26, textAlign: "center" },
  creditCard: { width: "100%", marginTop: 34, borderRadius: 22, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: colors.white, padding: 22, shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  creditHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  creditAmount: { marginTop: 6, fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 36, lineHeight: 44 },
  receiptRow: { marginTop: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  receiptLabel: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 14 },
  receiptValue: { flex: 1, textAlign: "right", fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14 },
  trackerCard: { width: "100%", marginTop: 22, borderRadius: 22, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: colors.white, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18, shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  trackerRow: { minHeight: 56, flexDirection: "row" },
  trackerIconWrap: { width: 48, alignItems: "center" },
  trackerLine: { position: "absolute", top: 28, bottom: -28, width: 2, backgroundColor: "#dfe6ee" },
  trackerLineActive: { backgroundColor: colors.primary },
  trackerLineHidden: { display: "none" },
  trackerDot: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: "#f9fbfd", alignItems: "center", justifyContent: "center" },
  trackerDotActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  trackerDotText: { fontFamily: jakarta.extraBold, color: "#9aa6b3", fontSize: 18 },
  trackerDotTextActive: { color: colors.white },
  trackerCopy: { flex: 1, paddingLeft: 8, paddingBottom: 16 },
  trackerTitle: { fontFamily: jakarta.extraBold, color: "#9aa6b3", fontSize: 16 },
  trackerTitleActive: { color: colors.navy },
  trackerSub: { marginTop: 4, fontFamily: jakarta.extraBold, color: "#9aa6b3", fontSize: 12 },
  successBottom: { position: "absolute", left: 0, right: 0, bottom: 0, height: 130 },
  successFooter: { position: "absolute", left: 26, right: 26, bottom: 22, flexDirection: "row", gap: 12 },
  trackButton: { flex: 1, height: 58, borderRadius: 18, borderWidth: 1.2, borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  trackText: { fontFamily: jakarta.extraBold, color: colors.white, fontSize: 14, letterSpacing: 2 },
  homeButton: { flex: 1.18, height: 58, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  homeText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 14, letterSpacing: 2 }
});
