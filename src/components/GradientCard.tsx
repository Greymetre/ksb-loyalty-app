import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "@/constants/colors";

export function GradientCard({
  children,
  tone = "main",
  style
}: {
  children: React.ReactNode;
  tone?: "main" | "green" | "gold" | "navy";
  style?: ViewStyle;
}) {
  const palette = tone === "green" ? gradients.green : tone === "gold" ? gradients.gold : tone === "navy" ? gradients.navy : gradients.main;
  return (
    <LinearGradient colors={palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 20, overflow: "hidden" }
});
