import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "@/constants/colors";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "main" | "gold" | "navy";
  style?: ViewStyle;
};

export function AppButton({ title, onPress, disabled, loading, tone = "main", style }: Props) {
  const palette = tone === "gold" ? gradients.gold : tone === "navy" ? gradients.navy : gradients.main;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={[styles.pressable, disabled && styles.disabled, style]}>
      <LinearGradient colors={palette} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.button}>
        {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.text}>{title}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: 18, overflow: "hidden" },
  disabled: { opacity: 0.45 },
  button: { height: 56, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  text: { color: colors.white, fontWeight: "900", fontSize: 15 }
});
