import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { getToken, getUser } from "@/services/storage";
import { Route } from "@/navigation/routes";
import { customerLandingRoute } from "@/services/customerRouting";
import { jakarta } from "@/styles/appStyles";

const SPLASH_DURATION_MS = 3500; // 3.5 seconds

const { height, width } = Dimensions.get("window");

/** The artwork's own proportions and its top-edge cream, so the fill behind it is invisible. */
const ART_WIDTH = 740;
const ART_HEIGHT = 1600;
const ART_RATIO = ART_WIDTH / ART_HEIGHT;
const ART_CREAM = "#f7f1e2";
const GOLD = "#c8952f";
const DEEP_GREEN = "#14652f";

/* The painted loader has been taken out of the artwork so a real one can turn in its
   place. These are the pixels it occupied, measured from the foot of the 740x1600 file;
   scaling them by the same factor the image is drawn at puts the live one exactly where
   the design had it, on any screen. */
const ART_SCALE = width / ART_WIDTH;
const RING_CENTRE_FROM_BOTTOM = (ART_HEIGHT - 1502) * ART_SCALE;
const RING_DIAMETER = 40 * ART_SCALE;
const LABEL_BASELINE_FROM_BOTTOM = (ART_HEIGHT - 1553) * ART_SCALE;

/**
 * Notes drifting down over the artwork. Each keeps its own lane, size, tilt and speed,
 * and the delays are spread so they are already scattered down the screen rather than
 * all starting at the top together.
 */
const noteRain = [
  { left: "7%", size: 34, delay: 0, rotate: "-24deg", opacity: 0.34, duration: 5200 },
  { left: "19%", size: 28, delay: 620, rotate: "18deg", opacity: 0.26, duration: 5900 },
  { left: "31%", size: 37, delay: 1180, rotate: "-14deg", opacity: 0.3, duration: 4900 },
  { left: "45%", size: 25, delay: 1740, rotate: "26deg", opacity: 0.22, duration: 6300 },
  { left: "59%", size: 35, delay: 2300, rotate: "-20deg", opacity: 0.31, duration: 5100 },
  { left: "72%", size: 27, delay: 2860, rotate: "15deg", opacity: 0.25, duration: 5800 },
  { left: "85%", size: 38, delay: 3420, rotate: "-27deg", opacity: 0.29, duration: 4800 },
  { left: "13%", size: 24, delay: 3980, rotate: "21deg", opacity: 0.21, duration: 6400 },
  { left: "38%", size: 32, delay: 4540, rotate: "-17deg", opacity: 0.28, duration: 5400 },
  { left: "66%", size: 36, delay: 5100, rotate: "-22deg", opacity: 0.3, duration: 5000 },
] as const;

export default function SplashScreen({ onDone }: { onDone: (route: Route) => void }) {
  const noteAnimations = useRef(noteRain.map(() => new Animated.Value(0))).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinner = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinner.start();

    const rainLoops: Animated.CompositeAnimation[] = [];
    const rainTimers: ReturnType<typeof setTimeout>[] = [];

    noteAnimations.forEach((anim, index) => {
      const item = noteRain[index];
      const timer = setTimeout(() => {
        anim.setValue(0);
        const loop = Animated.loop(
          Animated.timing(anim, {
            toValue: 1,
            duration: item.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        rainLoops.push(loop);
        loop.start();
      }, item.delay);
      rainTimers.push(timer);
    });

    const timer = setTimeout(async () => {
      const token = await getToken();
      const user = token ? await getUser() : null;
      onDone(token ? customerLandingRoute(user) : "Login");
    }, SPLASH_DURATION_MS);

    return () => {
      spinner.stop();
      rainLoops.forEach((loop) => loop.stop());
      rainTimers.forEach(clearTimeout);
      clearTimeout(timer);
    };
  }, [onDone, noteAnimations, spin]);

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={splashStyles.screen}>
      <StatusBar style="dark" />

      {/* Pinned to the bottom rather than centred. Most phones are a little wider than
          the artwork, so something has to go; anchoring it here spends that on the empty
          sky at the top and never on the logos and the loader at the foot. On a screen
          taller than the artwork the gap above is the same cream as its top edge. */}
      <Image
        source={require("../../../assets/splash-screen.png")}
        style={splashStyles.art}
        resizeMode="contain"
      />

      {noteRain.map((item, index) => {
        const translateY = noteAnimations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [-140, height + 160],
        });
        return (
          <Animated.Image
            key={index}
            source={require("../../../assets/vriddhi-note.png")}
            resizeMode="contain"
            style={[
              splashStyles.note,
              {
                left: item.left,
                width: item.size,
                height: item.size * 0.74,
                opacity: item.opacity,
                transform: [{ translateY }, { rotate: item.rotate }],
              },
            ]}
          />
        );
      })}

      <Animated.View
        style={[
          splashStyles.loader,
          {
            width: RING_DIAMETER,
            height: RING_DIAMETER,
            borderRadius: RING_DIAMETER / 2,
            borderWidth: Math.max(2, RING_DIAMETER * 0.09),
            bottom: RING_CENTRE_FROM_BOTTOM - RING_DIAMETER / 2,
            transform: [{ rotate: spinDeg }],
          },
        ]}
      />
      <Text style={[splashStyles.loadingText, { bottom: LABEL_BASELINE_FROM_BOTTOM, fontSize: 13 * ART_SCALE }]}>
        Loading...
      </Text>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: ART_CREAM,
  },

  art: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "100%",
  },

  note: {
    position: "absolute",
    top: 0,
    zIndex: 3,
  },

  // Three quarters of a ring, turning: the open quarter is what shows it is moving.
  loader: {
    position: "absolute",
    alignSelf: "center",
    borderColor: GOLD,
    borderTopColor: "transparent",
    zIndex: 4,
  },

  loadingText: {
    position: "absolute",
    alignSelf: "center",
    fontFamily: jakarta.semiBold,
    color: DEEP_GREEN,
    letterSpacing: 0.3,
    zIndex: 4,
  },
});
