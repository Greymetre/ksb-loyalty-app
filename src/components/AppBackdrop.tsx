import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";

const ART_W = 941;
const ART_H = 1672;
const ART_CREAM = "#feefdc"; // the artwork's own top edge, so the sky above it carries on

/**
 * The painted scene the whole app sits on.
 *
 * Sized in points rather than by aspectRatio: with left, right and width all set, Yoga
 * was free to stretch the box to the full screen and the artwork came back blown up.
 * Here the width is the screen's and the height follows from the artwork's own
 * proportions, so it is drawn at the smallest scale that still reaches both edges - any
 * smaller and the dune would stop short of the sides.
 */
const { width: SCREEN_W } = Dimensions.get("window");
const ART_DRAWN_H = Math.round((SCREEN_W * ART_H) / ART_W);

/** How much of the scene shows through once someone is signed in. Full strength on the
 *  sign-in screens, where the artwork is the design; a wash behind the app itself, where
 *  cards and figures have to stay the thing being read. */
const FADED_OPACITY = 0.32;

export default function AppBackdrop({ faded = false }: { faded?: boolean }) {
  return (
    <View style={styles.screen} pointerEvents="none">
      <Image
        source={require("../../assets/login-backdrop.jpg")}
        style={[
          styles.art,
          { width: SCREEN_W, height: ART_DRAWN_H },
          faded && { opacity: FADED_OPACITY },
        ]}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ART_CREAM,
    overflow: "hidden",
  },

  // Pinned to the foot: the scene belongs at the bottom, and whatever the screen has
  // spare goes above it as plain sky.
  art: {
    position: "absolute",
    bottom: 0,
    left: 0,
  },
});
