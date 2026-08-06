import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";

export function StatusBadge({ label, tone = "green" }: { label: string; tone?: "green" | "gold" | "red" | "navy" }) {
  const bg = tone === "gold" ? colors.goldSoft : tone === "red" ? "#ffe8e8" : tone === "navy" ? "#e8edf4" : colors.successSoft;
  const fg = tone === "gold" ? "#9b6b00" : tone === "red" ? colors.danger : tone === "navy" ? colors.navy : colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  text: { fontWeight: "900", fontSize: 10 }
});
