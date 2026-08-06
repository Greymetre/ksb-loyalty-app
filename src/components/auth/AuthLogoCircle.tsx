import React from "react";
import { View } from "react-native";
import KsbLogoMark from "../../../assets/ksb-logo-data.svg";
import { styles } from "@/styles/appStyles";

export default function AuthLogoCircle({ size = 72 }: { size?: number }) {
  return (
    <View style={[styles.authLogoCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <KsbLogoMark width={size * 0.54} height={size * 0.25} />
    </View>
  );
}
