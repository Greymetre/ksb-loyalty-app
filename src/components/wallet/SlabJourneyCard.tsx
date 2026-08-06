import React from "react";
import { Text, View } from "react-native";
import { WalletSummary } from "@/types/api";
import { money } from "@/utils/formatters";
import { formatRewardLabel, formatTierRange, getTierProgress } from "@/utils/rewards";
import { styles } from "@/styles/appStyles";

export default function SlabJourneyCard({ wallet, progress }: { wallet?: WalletSummary; progress: ReturnType<typeof getTierProgress> }) {
  const steps = [...(wallet?.progressSteps || [])].reverse();
  return (
    <View style={styles.slabJourneyCard}>
      <View style={styles.slabJourneyHeader}>
        <View style={styles.slabJourneyIcon}><Text style={styles.slabJourneyIconText}>🏆</Text></View>
        <View>
          <Text style={styles.slabJourneyTitle}>Your Slab Journey</Text>
          <Text style={styles.slabJourneySub}>Climb higher to earn more</Text>
        </View>
      </View>
      <View style={styles.ladderWrap}>
        {steps.map((tier, index) => {
          const active = Boolean(tier.current);
          const reached = Boolean(tier.achieved || tier.current);
          const next = progress.nextTier?.valueFrom === tier.valueFrom;
          return (
            <View key={`${tier.valueFrom}-${tier.rewardLabel}-${index}`} style={styles.ladderRow}>
              <View style={styles.ladderRail}>
                <View style={[styles.ladderCircle, reached && styles.ladderCircleReached, active && styles.ladderCircleActive]}>
                  <Text style={[styles.ladderCircleText, active && styles.ladderCircleActiveText]}>{steps.length - index}</Text>
                </View>
                {index !== steps.length - 1 ? <View style={[styles.ladderLine, reached && styles.ladderLineReached]} /> : null}
              </View>
              <View style={styles.ladderContent}>
                <View style={styles.ladderTitleRow}>
                  <Text style={[styles.ladderReward, reached && styles.ladderRewardActive]}>{formatRewardLabel(tier)}</Text>
                  {next ? <Text style={styles.nextPill}>NEXT · {money(progress.remainingAmount)} AWAY</Text> : null}
                </View>
                <Text style={styles.ladderRange}>{formatTierRange(tier)}</Text>
                {tier.tierName ? <Text style={styles.ladderTierName}>{tier.tierName}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
