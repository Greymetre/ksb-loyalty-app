import React from "react";
import { Image, StyleSheet, View } from "react-native";

/**
 * The Vriddhi logo, in the two shapes the app needs.
 *
 * "full" is the whole lockup - money tree, wordmark and tagline - which belongs on the
 * splash and the sign-in screens where there is room to read it. "mark" is the tree
 * alone, for a header bar: at thirty pixels tall the wordmark under it would be a smudge,
 * and the screen has already said which app this is.
 */
const RATIO = { full: 864 / 900, mark: 520 / 454 } as const;

export default function VriddhiLogo({
  variant = "mark",
  height = 34,
  plated = false,
}: {
  variant?: "full" | "mark";
  height?: number;
  plated?: boolean;
}) {
  const image = (
    <Image
      source={
        variant === "full"
          ? require("../../assets/vriddhi-logo.png")
          : require("../../assets/vriddhi-mark.png")
      }
      style={{ width: height * RATIO[variant], height }}
      resizeMode="contain"
    />
  );

  if (!plated) return image;

  return <View style={[styles.plate, { borderRadius: height * 0.22 }]}>{image}</View>;
}

const styles = StyleSheet.create({
  plate: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#11325b",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
