import React from "react";
import { Pressable, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "@/constants/colors";
import { styles } from "@/styles/appStyles";

export default function ChoiceCard({ label, selected, onPress, emoji }: { label: string; selected: boolean; onPress: () => void; emoji: string }) {
  const body = (
    <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceActive]}>
      <Text style={styles.choiceEmoji}>{emoji}</Text>
      <Text style={[styles.choiceText, selected && { color: colors.white }]}>{label}</Text>
      {selected ? <Text style={styles.choiceTick}>✓</Text> : null}
    </Pressable>
  );
  return selected ? <LinearGradient colors={gradients.main} style={styles.choiceGradient}>{body}</LinearGradient> : body;
}
