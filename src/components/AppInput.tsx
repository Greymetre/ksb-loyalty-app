import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors } from "@/constants/colors";

type Props = TextInputProps & { label: string; right?: React.ReactNode };

export function AppInput({ label, right, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <TextInput placeholderTextColor="#9aa6b3" style={[styles.input, style]} {...props} />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: colors.navy, fontWeight: "800", fontSize: 12 },
  box: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center"
  },
  input: { flex: 1, color: colors.text, fontWeight: "700", fontSize: 15, paddingVertical: 0 }
});
