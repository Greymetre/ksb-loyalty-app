import React from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/styles/appStyles";

export default function AuthScaffold({
  children,
  title,
  showBrand = false,
  hideHero = false,
  compactHero = false,
  onBack,
  footerContent,
  bodyStyle
}: {
  children: React.ReactNode;
  title?: string;
  showBrand?: boolean;
  hideHero?: boolean;
  /** Smaller marks, for the steps whose form is too tall to spare the room. */
  compactHero?: boolean;
  onBack?: () => void;
  footerContent?: React.ReactNode;
  bodyStyle?: any;
}) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={["left", "right"]} style={styles.authSafe}>
      <StatusBar style="dark" />
      <View style={[styles.authPhone, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 10) + 18 }]}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.authBackButton}>
            <Text style={styles.authBackText}>←</Text>
          </Pressable>
        ) : null}

        {/* The longest form - set a password - is taller than a phone, so the form scrolls
            rather than spilling out under the header and the footer. Short forms still sit
            centred, because the content box only grows to fill what is there. */}
        <ScrollView
          style={styles.authScroll}
          contentContainerStyle={[styles.authBody, bodyStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {/* Both of these sit over the form, so neither may take a tap - the header was
            swallowing "Change mobile number" and the footer was swallowing CANCEL. */}
        {!hideHero ? (
          <View
            pointerEvents="none"
            style={[styles.authHeroBlock, compactHero ? styles.authHeroCompact : showBrand ? styles.authHeroBrand : styles.authHeroVerify]}
          >
            <View style={styles.authBrandRow}>
              <Image
                source={require("../../../assets/ksb-lockup.png")}
                style={[styles.authKsbLogo, compactHero && styles.authKsbLogoCompact]}
                resizeMode="contain"
              />
              <View style={[styles.authBrandDivider, compactHero && styles.authBrandDividerCompact]} />
              <Image
                source={require("../../../assets/vriddhi-logo.png")}
                style={[styles.authVriddhiLogo, compactHero && styles.authVriddhiLogoCompact]}
                resizeMode="contain"
              />
            </View>
            {!showBrand && title ? <Text style={styles.authHeroTitle}>{title}</Text> : null}
          </View>
        ) : null}

        {/* box-none, not none: the block itself must not swallow taps meant for the form
            behind it, but the helpline inside it has to stay tappable. */}
        {footerContent ? (
          <View pointerEvents="box-none" style={styles.authFooter}>{footerContent}</View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
