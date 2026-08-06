import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/constants/colors";
import KsbLogoMark from "../../assets/ksb-logo-data.svg";

export function KsbLogo({ size = 72 }: { size?: number }) {
  const width = size * 2.45;
  return (
    <View style={[styles.shell, { width, height: size, borderRadius: size / 2 }]}>
      <KsbLogoMark width={width * 0.72} height={size * 0.56} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  }
});
