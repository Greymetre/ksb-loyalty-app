import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppButton } from "@/components/AppButton";
import { KsbLogo } from "@/components/KsbLogo";
import { colors, gradients } from "@/constants/colors";
import { jakarta } from "@/styles/appStyles";
import { INSTALLED_APP_VERSION, STORE_URL } from "@/services/appVersion";

/**
 * The end of the road for an app that is too old. There is deliberately no way
 * past this screen - no back, no skip - because the versions behind it are the
 * ones the API no longer supports.
 */
export default function ForceUpdateScreen() {
  const openStore = () => {
    if (STORE_URL) void Linking.openURL(STORE_URL);
  };

  return (
    <LinearGradient colors={gradients.main} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.screen}>
      <View style={s.card}>
        <View style={s.logo}><KsbLogo size={58} /></View>
        <Text style={s.title}>Update required</Text>
        <Text style={s.text}>
          A newer version of Vriddhi KSB is available. Please update to continue - this version is no longer supported.
        </Text>
        {INSTALLED_APP_VERSION ? <Text style={s.version}>Installed version {INSTALLED_APP_VERSION}</Text> : null}
        <View style={s.action}><AppButton title="Update now" onPress={openStore} tone="navy" /></View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 26 },
  card: { width: "100%", backgroundColor: colors.white, borderRadius: 26, padding: 28, alignItems: "center" },
  logo: { marginBottom: 18 },
  title: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 21 },
  text: { fontFamily: jakarta.medium, color: colors.muted, fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 10 },
  version: { fontFamily: jakarta.semiBold, color: "#98a6ba", fontSize: 11, marginTop: 14 },
  action: { width: "100%", marginTop: 22 }
});
