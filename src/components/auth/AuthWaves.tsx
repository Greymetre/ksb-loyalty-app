import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

export default function AuthWaves({ footer = true }: { footer?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="authTopBlue" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#123d6d" />
            <Stop offset="0.5" stopColor="#0877bd" />
            <Stop offset="1" stopColor="#1ca9e8" />
          </SvgLinearGradient>

          <SvgLinearGradient id="authTopWaveDark" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#075f9b" />
            <Stop offset="0.55" stopColor="#006dae" />
            <Stop offset="1" stopColor="#009fe0" />
          </SvgLinearGradient>

          <SvgLinearGradient id="authTopWaveLight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#54b7e9" stopOpacity="0.36" />
            <Stop offset="0.55" stopColor="#4dbdea" stopOpacity="0.42" />
            <Stop offset="1" stopColor="#78d5f8" stopOpacity="0.46" />
          </SvgLinearGradient>

          <SvgLinearGradient id="authBottomBlue" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0c9ee0" />
            <Stop offset="0.52" stopColor="#0878be" />
            <Stop offset="1" stopColor="#123d6d" />
          </SvgLinearGradient>

          <SvgLinearGradient id="authBottomWaveDark" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#075f9b" />
            <Stop offset="0.52" stopColor="#0a5b9b" />
            <Stop offset="1" stopColor="#123d6d" />
          </SvgLinearGradient>

          <SvgLinearGradient id="authBottomWaveLight" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#24ace9" stopOpacity="0.46" />
            <Stop offset="0.52" stopColor="#36b8ed" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#58c6f3" stopOpacity="0.24" />
          </SvgLinearGradient>

          <RadialGradient id="authSoftBodyGlow" cx="64%" cy="46%" rx="78%" ry="64%">
            <Stop offset="0" stopColor="#eef8ff" stopOpacity="0.95" />
            <Stop offset="0.54" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="1" stopColor="#f7fbff" stopOpacity="1" />
          </RadialGradient>
        </Defs>

        <Rect x="0" y="0" width="390" height="290" fill="url(#authTopBlue)" />
        <Path
          d="M0 184 C62 206 125 213 190 199 C256 185 315 178 390 211 L390 257 C318 236 248 235 190 250 C124 268 61 258 0 239 Z"
          fill="url(#authTopWaveLight)"
        />
        <Path
          d="M0 240 C67 220 140 221 208 236 C278 252 334 238 390 211 L390 261 C322 283 264 275 203 256 C132 234 62 240 0 263 Z"
          fill="url(#authTopWaveDark)"
          opacity={0.92}
        />
        <Path
          d="M0 260 C66 237 139 238 207 248 C278 258 333 243 390 218 L390 844 L0 844 Z"
          fill="url(#authSoftBodyGlow)"
        />

        {Array.from({ length: 14 }).map((_, row) =>
          Array.from({ length: 16 }).map((__, col) => (
            <Circle key={`${row}-${col}`} cx={16 + col * 24} cy={330 + row * 28} r={0.68} fill="#d8e8ef" opacity={0.44} />
          ))
        )}

        {footer ? (
          <>
            <Path
              d="M0 647 C70 665 140 674 212 662 C284 649 339 653 390 683 L390 844 H0 Z"
              fill="url(#authBottomBlue)"
            />
            <Path
              d="M0 675 C74 650 147 650 219 669 C287 686 336 680 390 654 L390 844 H0 Z"
              fill="url(#authBottomWaveDark)"
              opacity={0.78}
            />
            <Path
              d="M0 710 C77 690 145 692 216 708 C288 726 340 712 390 687 L390 844 H0 Z"
              fill="url(#authBottomWaveLight)"
            />
          </>
        ) : null}
      </Svg>
    </View>
  );
}
