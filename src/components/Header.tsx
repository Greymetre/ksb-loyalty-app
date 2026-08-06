import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { KsbLogo } from "@/components/KsbLogo";

export function Header({ title, onMenu, onBack }: { title: string; onMenu?: () => void; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack || onMenu} style={styles.iconBtn}>
        <Text style={styles.icon}>{onBack ? "‹" : "☰"}</Text>
      </Pressable>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>KSB Retailer Loyalty</Text>
      </View>
      <KsbLogo size={42} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10 },
  iconBtn: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  icon: { fontSize: 24, color: colors.navy, fontWeight: "900" },
  titleWrap: { flex: 1 },
  title: { color: colors.navy, fontWeight: "900", fontSize: 18 },
  sub: { color: colors.muted, fontWeight: "700", fontSize: 11, marginTop: 2 }
});
