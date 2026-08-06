import React from "react";
import { Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { KsbLogo } from "@/components/KsbLogo";
import { Screen } from "@/components/Screen";
import { styles } from "@/styles/appStyles";

export default function EmptyScreen({ title, message, onBack }: { title: string; message: string; onBack: () => void }) {
  return (
    <Screen>
      <View style={styles.emptyState}>
        <KsbLogo size={58} />
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyText}>{message}</Text>
        <AppButton title="Go back" onPress={onBack} tone="navy" />
      </View>
    </Screen>
  );
}
