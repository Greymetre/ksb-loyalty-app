import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/colors";
import { jakarta } from "../../styles/appStyles";

export default function InvoiceAttachmentViewer({
  uri,
  onClose,
}: {
  uri: string | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={Boolean(uri)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Invoice attachment</Text>
            <Pressable accessibilityLabel="Close attachment" onPress={onClose} style={styles.closeIcon}>
              <Text style={styles.closeIconText}>×</Text>
            </Pressable>
          </View>
          {uri ? <Image source={{ uri }} resizeMode="contain" style={styles.image} /> : null}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4, 15, 31, .82)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  dismissArea: StyleSheet.absoluteFillObject,
  card: {
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 15,
    maxHeight: "88%",
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 5,
    marginBottom: 10,
  },
  title: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 17 },
  closeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#edf3fb",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconText: { color: colors.navy, fontSize: 28, lineHeight: 30 },
  image: { width: "100%", height: 480, maxHeight: "72%", borderRadius: 16, backgroundColor: "#f3f6fa" },
  closeButton: {
    height: 50,
    borderRadius: 15,
    backgroundColor: "#edf3fb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },
  closeText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
});
