import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { jakarta, styles } from "@/styles/appStyles";

export default function LoadingScreen({ message }: { message: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1350,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 780,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 780,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ])
    );

    shimmerLoop.start();
    pulseLoop.start();

    return () => {
      shimmerLoop.stop();
      pulseLoop.stop();
    };
  }, [pulse, spin]);

  const translateX = spin.interpolate({ inputRange: [0, 1], outputRange: [-92, 212] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <SafeAreaView style={styles.loadingSafe}>
      <View style={loaderStyles.panel}>
        <View style={loaderStyles.headerRow}>
          <SkeletonBlock style={loaderStyles.avatar} translateX={translateX} opacity={opacity} />
          <View style={loaderStyles.headerText}>
            <SkeletonBlock style={loaderStyles.titleLine} translateX={translateX} opacity={opacity} />
            <SkeletonBlock style={loaderStyles.shortLine} translateX={translateX} opacity={opacity} />
          </View>
        </View>
        <SkeletonBlock style={loaderStyles.heroBlock} translateX={translateX} opacity={opacity} />
        <View style={loaderStyles.grid}>
          <SkeletonBlock style={loaderStyles.tile} translateX={translateX} opacity={opacity} />
          <SkeletonBlock style={loaderStyles.tile} translateX={translateX} opacity={opacity} />
        </View>
        <SkeletonBlock style={loaderStyles.footerLine} translateX={translateX} opacity={opacity} />
        <Text style={loaderStyles.message}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

function SkeletonBlock({
  style,
  translateX,
  opacity
}: {
  style: any;
  translateX: Animated.AnimatedInterpolation<string | number>;
  opacity: Animated.AnimatedInterpolation<string | number>;
}) {
  return (
    <Animated.View style={[loaderStyles.skeleton, style, { opacity }]}>
      <Animated.View style={[loaderStyles.shimmer, { transform: [{ translateX }, { rotate: "12deg" }] }]} />
    </Animated.View>
  );
}

const loaderStyles = StyleSheet.create({
  panel: {
    width: "100%",
    maxWidth: 318,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#dce9f4",
    shadowColor: colors.navy,
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 7
  },
  skeleton: {
    overflow: "hidden",
    backgroundColor: "#e9f2fa"
  },
  shimmer: {
    position: "absolute",
    top: -18,
    bottom: -18,
    width: 54,
    backgroundColor: "rgba(255,255,255,0.62)"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 17
  },
  headerText: {
    flex: 1,
    gap: 10
  },
  titleLine: {
    width: "76%",
    height: 15,
    borderRadius: 999
  },
  shortLine: {
    width: "48%",
    height: 11,
    borderRadius: 999
  },
  heroBlock: {
    height: 92,
    borderRadius: 20,
    marginTop: 22
  },
  grid: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12
  },
  tile: {
    flex: 1,
    height: 58,
    borderRadius: 16
  },
  footerLine: {
    width: "64%",
    height: 12,
    borderRadius: 999,
    marginTop: 18
  },
  message: {
    marginTop: 18,
    fontFamily: jakarta.extraBold,
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 0.4,
    textAlign: "center"
  }
});
