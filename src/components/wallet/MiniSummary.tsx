import React from "react";
import { Text, View } from "react-native";
import { styles } from "@/styles/appStyles";

export default function MiniSummary({ title, value, tone }: { title: string; value: string; tone: "gold" | "blue" }) {
  return (
    <View style={[styles.miniSummary, tone === "blue" && styles.miniSummaryBlue]}>
      <Text style={[styles.miniSummaryTitle, tone === "blue" && styles.miniSummaryBlueText]}>{title}</Text>
      <Text style={[styles.miniSummaryValue, tone === "blue" && styles.miniSummaryBlueText]}>{value}</Text>
    </View>
  );
}
