import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@/constants/colors";
import KsbLogoMark from "../../assets/ksb-logo-data.svg";

/**
 * The KSB mark.
 *
 * No plate behind it by default, the same as the Vriddhi mark it sits beside - on the
 * app's cream backdrop a white pill read as a card the logo had been dropped into rather
 * than as the logo itself. The mark carries its own blue and greys and needs no help.
 *
 * `plated` puts the white pill and its shadow back, for anywhere it has to sit on a dark
 * or busy background.
 */
export function KsbLogo({ size = 72, plated = false }: { size?: number; plated?: boolean }) {
  const width = size * 2.45;
  // Unplated, the mark fills its box - the old 0.72/0.56 inset was room for the pill.
  const markWidth = plated ? width * 0.72 : width;
  const markHeight = plated ? size * 0.56 : size;
  return (
    <View
      style={[
        styles.shell,
        { width, height: size },
        plated && [styles.plate, { borderRadius: size / 2 }],
      ]}>
      <KsbLogoMark width={markWidth} height={markHeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    justifyContent: "center"
  },
  plate: {
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  }
});
