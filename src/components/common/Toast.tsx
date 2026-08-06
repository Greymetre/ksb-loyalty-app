import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { ToastPayload } from "@/services/toast";
import { styles } from "@/styles/appStyles";

export default function Toast({ payload, onClose }: { payload: ToastPayload; onClose: () => void }) {
  const backgroundColor = payload.type === "success" ? colors.primary : payload.type === "info" ? colors.navy : colors.danger;
  return (
    <Pressable onPress={onClose} style={styles.toastWrap}>
      <View style={[styles.toast, { backgroundColor }]}>
        <Text style={styles.toastText}>{payload.message}</Text>
      </View>
    </Pressable>
  );
}
