import React from "react";
import { Text, View } from "react-native";
import { styles } from "@/styles/appStyles";

export default function DetailSectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.detailDividerRow}>
      <Text style={styles.detailDividerTitle}>{title}</Text>
      <View style={styles.detailDividerLine} />
    </View>
  );
}
