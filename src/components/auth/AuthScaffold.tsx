import React from "react";
import { Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/styles/appStyles";
import AuthLogoCircle from "./AuthLogoCircle";
import AuthWaves from "./AuthWaves";

export default function AuthScaffold({
  children,
  title,
  showBrand = false,
  hideHero = false,
  onBack,
  footerContent,
  bodyStyle
}: {
  children: React.ReactNode;
  title?: string;
  showBrand?: boolean;
  hideHero?: boolean;
  onBack?: () => void;
  footerContent?: React.ReactNode;
  bodyStyle?: any;
}) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={["left", "right"]} style={styles.authSafe}>
      <StatusBar style="light" />
      <AuthWaves />
      <View style={[styles.authPhone, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 10) + 18 }]}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.authBackButton}>
            <Text style={styles.authBackText}>←</Text>
          </Pressable>
        ) : null}
        {!hideHero ? (
          <View style={[styles.authHeroBlock, showBrand ? styles.authHeroBrand : styles.authHeroVerify]}>
            <AuthLogoCircle size={showBrand ? 70 : 60} />
            {showBrand ? (
              <>
                <Text style={styles.authHindiTitle}>धनवर्षा</Text>
                <Text style={styles.authRewards}>REWARDS</Text>
              </>
            ) : title ? (
              <Text style={styles.authHeroTitle}>{title}</Text>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.authBody, bodyStyle]}>{children}</View>
        {footerContent ? <View style={styles.authFooterContent}>{footerContent}</View> : null}
      </View>
    </SafeAreaView>
  );
}
