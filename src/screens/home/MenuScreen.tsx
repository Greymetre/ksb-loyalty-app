import React from "react";
import { View } from "react-native";
import { AppButton } from "@/components/AppButton";
import ChoiceCard from "@/components/common/ChoiceCard";
import { Header } from "@/components/Header";
import { Screen } from "@/components/Screen";
import { Route } from "@/navigation/routes";
import { clearToken } from "@/services/storage";
import { styles } from "@/styles/appStyles";

export default function MenuScreen({ go, back }: { go: (route: Route) => void; back: () => void }) {
  const logout = async () => {
    await clearToken();
    go("Login");
  };
  return (
    <Screen>
      <Header title="Menu" onBack={back} />
      <View style={styles.panel}>
        {(["Home", "Profile", "Slab", "Booster", "Invoices", "Redeem", "RedemptionHistory", "Scheme"] as Route[]).map((item) => <ChoiceCard key={item} label={item === "RedemptionHistory" ? "Redemption History" : item} selected={false} onPress={() => go(item)} emoji="›" />)}
        <AppButton title="Logout" onPress={logout} tone="navy" />
      </View>
    </Screen>
  );
}
