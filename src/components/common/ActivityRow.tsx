import React from "react";
import { Text, View } from "react-native";
import { styles } from "@/styles/appStyles";

export default function ActivityRow({ text, accent }: { text: string; accent?: boolean }) {
  return <View style={[styles.activityRow, accent && styles.activityAccent]}><View style={styles.dot} /><Text style={styles.activityText}>{text}</Text></View>;
}
