import React from "react";
import { Text, View } from "react-native";
import { styles } from "@/styles/appStyles";

export default function DetailStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.detailStat}>
      <Text style={styles.detailStatLabel}>{label}</Text>
      <Text style={[styles.detailStatValue, { color }]}>{value}</Text>
    </View>
  );
}
