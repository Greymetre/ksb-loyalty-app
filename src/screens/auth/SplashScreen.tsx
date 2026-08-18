import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import KsbLogoMark from "../../../assets/ksb-logo-data.svg";
import { colors } from "@/constants/colors";
import { getToken, getUser } from "@/services/storage";
import { Route } from "@/navigation/routes";
import { customerLandingRoute } from "@/services/customerRouting";
import { jakarta } from "@/styles/appStyles";

const SPLASH_DURATION_MS = 2500;

const { height } = Dimensions.get("window");

const rupeeRain = [
  { left: "16%", size: 34, delay: 0, rotate: "-28deg", opacity: 0.5, duration: 4200 },
  { left: "22%", size: 32, delay: 450, rotate: "22deg", opacity: 0.58, duration: 4600 },
  { left: "35%", size: 29, delay: 900, rotate: "-16deg", opacity: 0.44, duration: 3900 },
  { left: "51%", size: 31, delay: 1300, rotate: "18deg", opacity: 0.48, duration: 4400 },
  { left: "77%", size: 34, delay: 1700, rotate: "-24deg", opacity: 0.54, duration: 4100 },
  { left: "88%", size: 44, delay: 2100, rotate: "17deg", opacity: 0.5, duration: 5200 },
  { left: "18%", size: 35, delay: 2600, rotate: "-18deg", opacity: 0.48, duration: 4800 },
  { left: "43%", size: 40, delay: 3100, rotate: "19deg", opacity: 0.52, duration: 5000 },
  { left: "63%", size: 30, delay: 3500, rotate: "-12deg", opacity: 0.45, duration: 4300 },
  { left: "72%", size: 36, delay: 3900, rotate: "25deg", opacity: 0.5, duration: 4700 },
  { left: "8%", size: 28, delay: 4300, rotate: "-20deg", opacity: 0.42, duration: 4500 },
  { left: "94%", size: 31, delay: 4700, rotate: "16deg", opacity: 0.46, duration: 4900 },
] as const;

export default function SplashScreen({ onDone }: { onDone: (route: Route) => void }) {
  const pulse = useRef(new Animated.Value(0)).current;

  const rupeeAnimations = useRef(
    rupeeRain.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    const rainLoops: Animated.CompositeAnimation[] = [];
    const rainTimers: ReturnType<typeof setTimeout>[] = [];

    rupeeAnimations.forEach((anim, index) => {
      const item = rupeeRain[index];

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
      pulseAnimation.stop();
      rainLoops.forEach((loop) => loop.stop());
      rainTimers.forEach(clearTimeout);
      clearTimeout(timer);
    };
  }, [onDone, pulse, rupeeAnimations]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });

  return (
    <View style={splashStyles.screen}>
      <StatusBar style="light" />

      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="none"
        style={[StyleSheet.absoluteFill, splashStyles.backgroundArtwork]}
      >
        <Defs>
          <SvgLinearGradient id="topBlue" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#123d6d" />
            <Stop offset="0.5" stopColor="#0877bd" />
            <Stop offset="1" stopColor="#1ca9e8" />
          </SvgLinearGradient>

          <SvgLinearGradient id="topWaveDark" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#075f9b" />
            <Stop offset="0.55" stopColor="#006dae" />
            <Stop offset="1" stopColor="#009fe0" />
          </SvgLinearGradient>

          <SvgLinearGradient id="topWaveLight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#54b7e9" stopOpacity="0.36" />
            <Stop offset="0.55" stopColor="#4dbdea" stopOpacity="0.42" />
            <Stop offset="1" stopColor="#78d5f8" stopOpacity="0.46" />
          </SvgLinearGradient>

          <SvgLinearGradient id="bottomBlue" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0c9ee0" />
            <Stop offset="0.52" stopColor="#0878be" />
            <Stop offset="1" stopColor="#123d6d" />
          </SvgLinearGradient>

          <SvgLinearGradient id="bottomWaveDark" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#075f9b" />
            <Stop offset="0.52" stopColor="#0a5b9b" />
            <Stop offset="1" stopColor="#123d6d" />
          </SvgLinearGradient>

          <SvgLinearGradient id="bottomWaveLight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#24ace9" stopOpacity="0.46" />
            <Stop offset="0.52" stopColor="#36b8ed" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#58c6f3" stopOpacity="0.24" />
          </SvgLinearGradient>

          <RadialGradient id="softBodyGlow" cx="64%" cy="46%" rx="78%" ry="64%">
            <Stop offset="0" stopColor="#eef8ff" stopOpacity="0.95" />
            <Stop offset="0.54" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="1" stopColor="#f7fbff" stopOpacity="1" />
          </RadialGradient>
        </Defs>

        {/* Top blue background */}
        <Rect x="0" y="0" width="390" height="290" fill="url(#topBlue)" />

        {/* Top soft light wave */}
        <Path
          d="M0 184 C62 206 125 213 190 199 C256 185 315 178 390 211 L390 257 C318 236 248 235 190 250 C124 268 61 258 0 239 Z"
          fill="url(#topWaveLight)"
        />

        {/* Top main dark blue wave */}
        <Path
          d="M0 240 C67 220 140 221 208 236 C278 252 334 238 390 211 L390 261 C322 283 264 275 203 256 C132 234 62 240 0 263 Z"
          fill="url(#topWaveDark)"
          opacity={0.92}
        />

        {/* White body curved cut */}
        <Path
          d="M0 260 C66 237 139 238 207 248 C278 258 333 243 390 218 L390 844 L0 844 Z"
          fill="url(#softBodyGlow)"
        />

        {/* Dotted body pattern */}
        {Array.from({ length: 15 }).map((_, row) =>
          Array.from({ length: 16 }).map((__, col) => (
            <Circle
              key={`${row}-${col}`}
              cx={16 + col * 24}
              cy={330 + row * 28}
              r={0.65}
              fill="#d7e7f2"
              opacity={0.52}
            />
          ))
        )}

        {/* Bottom main blue base wave */}
        <Path
          d="M0 647 C70 665 140 674 212 662 C284 649 339 653 390 683 L390 844 H0 Z"
          fill="url(#bottomBlue)"
        />

        {/* Bottom dark wave layer */}
        <Path
          d="M0 675 C74 650 147 650 219 669 C287 686 336 680 390 654 L390 844 H0 Z"
          fill="url(#bottomWaveDark)"
          opacity={0.78}
        />

        {/* Bottom light wave layer */}
        <Path
          d="M0 710 C77 690 145 692 216 708 C288 726 340 712 390 687 L390 844 H0 Z"
          fill="url(#bottomWaveLight)"
        />
      </Svg>

      {rupeeRain.map((item, index) => {
        const translateY = rupeeAnimations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [-120, height + 140],
        });

        return (
          <Animated.Text
            key={index}
            style={[
              splashStyles.rupee,
              {
                left: item.left,
                fontSize: item.size,
                opacity: item.opacity,
                transform: [
                  { translateY },
                  { rotate: item.rotate },
                ],
              },
            ]}
          >
            ₹
          </Animated.Text>
        );
      })}

      <Animated.View style={[splashStyles.logoMedallion, { transform: [{ scale }] }]}>
        <View style={splashStyles.logoMarkWrap}>
          <KsbLogoMark width={96} height={44} />
        </View>
      </Animated.View>

      <View style={splashStyles.brandBlock}>
        <Text style={splashStyles.hindiTitle}>धनवर्षा</Text>
        <View style={splashStyles.titleUnderline} />

        <Text style={splashStyles.rewards}>REWARDS</Text>
        <Text style={splashStyles.loyalty}>RETAILER LOYALTY</Text>
        <Text style={splashStyles.productLine}>FOR DOMESTIC GROUP OF PRODUCTS</Text>

        <View style={splashStyles.schemePill}>
          <Text style={splashStyles.schemeText}>धन धना धन Scheme</Text>
        </View>

        <Text style={splashStyles.toKsb}>TO : KSB LIMITED</Text>
      </View>

      <View style={splashStyles.poweredBlock}>
        <Text style={splashStyles.poweredBy}>POWERED BY</Text>
        <Text style={splashStyles.poweredNames}>Fieldkonnect   ·   Greymetre</Text>
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: colors.white,
    alignItems: "center",
  },

  backgroundArtwork: {
    zIndex: 0,
  },

  logoMedallion: {
    position: "absolute",
    top: 175,
    width: 146,
    height: 146,
    borderRadius: 73,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(217,244,237,0.78)",
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 12,
    overflow: "visible",
    zIndex: 12,
  },

  logoMarkWrap: {
    width: 108,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 13,
  },

  brandBlock: {
    position: "absolute",
    top: 365,
    left: 28,
    right: 28,
    alignItems: "center",
    zIndex: 6,
  },

  hindiTitle: {
    fontFamily: jakarta.extraBold,
    color: colors.primary,
    fontSize: 48,
    lineHeight: 57,
    letterSpacing: 0,
    textAlign: "center",
    textShadowColor: "rgba(21,89,154,0.12)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 4 },
  },

  titleUnderline: {
    width: 72,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginTop: 1,
    marginBottom: 13,
  },

  rewards: {
    fontFamily: jakarta.extraBold,
    color: colors.blue,
    fontSize: 15,
    letterSpacing: 8,
    textAlign: "center",
    marginLeft: 8,
  },

  loyalty: {
    marginTop: 16,
    fontFamily: jakarta.extraBold,
    color: "#5d6572",
    fontSize: 12,
    letterSpacing: 7,
    textAlign: "center",
    marginLeft: 7,
  },

  productLine: {
    marginTop: 9,
    fontFamily: jakarta.bold,
    color: "#bdc5ce",
    fontSize: 10,
    letterSpacing: 3.2,
    textAlign: "center",
  },

  schemePill: {
    marginTop: 31,
    minWidth: 226,
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: "#0e82c9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },

  schemeText: {
    fontFamily: jakarta.extraBold,
    color: colors.white,
    fontSize: 13,
    letterSpacing: 1.6,
  },

  toKsb: {
    marginTop: 28,
    fontFamily: jakarta.extraBold,
    color: "rgba(164,174,186,0.42)",
    fontSize: 9,
    letterSpacing: 3,
  },

  rupee: {
    position: "absolute",
    top: 0,
    zIndex: 3,
    color: colors.gold,
    fontFamily: jakarta.extraBold,
    textShadowColor: "rgba(255,213,74,0.72)",
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 6 },
  },

  poweredBlock: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 34,
    alignItems: "center",
    zIndex: 6,
  },

  poweredBy: {
    fontFamily: jakarta.extraBold,
    color: "rgba(255,255,255,0.58)",
    fontSize: 8,
    letterSpacing: 4,
  },

  poweredNames: {
    marginTop: 8,
    fontFamily: jakarta.extraBold,
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
  },
});
