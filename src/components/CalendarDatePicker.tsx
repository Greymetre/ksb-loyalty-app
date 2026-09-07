import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";
import { jakarta } from "@/styles/appStyles";

type CalendarDatePickerProps = {
  visible: boolean;
  title: string;
  value: string;
  minDate?: string;
  maxDate?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /**
   * Lift the calendar into a bottom sheet instead of laying it out in place.
   *
   * Inline is right inside a filter panel that scrolls. A screen that renders the
   * calendar as a plain sibling of its ScrollView has no room left to give it: the
   * grid runs off the bottom of the window and the floating tab bar covers what is
   * left, so the last two weeks of the month cannot be reached at all.
   */
  asSheet?: boolean;
};

export function CalendarDateField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={onPress} style={styles.fieldButton}>
        <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]}>{value || "Select date"}</Text>
        <Text style={styles.fieldIcon}>▦</Text>
      </Pressable>
    </View>
  );
}

export function CalendarDatePicker({ visible, title, value, minDate, maxDate, onSelect, onClose, asSheet }: CalendarDatePickerProps) {
  const insets = useSafeAreaInsets();
  const initialDate = parseIsoDate(value) || new Date();
  const [monthDate, setMonthDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

  useEffect(() => {
    if (!visible) return;
    const next = parseIsoDate(value) || new Date();
    setMonthDate(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [value, visible]);

  const days = useMemo(() => calendarDays(monthDate), [monthDate]);
  if (!visible) return null;

  const selectedDate = parseIsoDate(value);
  const min = parseIsoDate(minDate || "");
  const max = parseIsoDate(maxDate || "");

  const body = (
    <View style={[styles.calendar, asSheet && styles.calendarSheet]}>
      <View style={styles.calendarTop}>
        <Text style={styles.calendarTitle}>{title}</Text>
        <Pressable onPress={onClose} style={styles.closeButton}><Text style={styles.closeText}>x</Text></Pressable>
      </View>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonthDate(addMonths(monthDate, -1))} style={styles.monthButton}><Text style={styles.monthButtonText}>{"<"}</Text></Pressable>
        <Text style={styles.monthTitle}>{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(monthDate)}</Text>
        <Pressable onPress={() => setMonthDate(addMonths(monthDate, 1))} style={styles.monthButton}><Text style={styles.monthButtonText}>{">"}</Text></Pressable>
      </View>
      <View style={styles.weekRow}>
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>)}
      </View>
      <View style={styles.dayGrid}>
        {days.map((day, index) => {
          if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
          const iso = toIsoDate(day);
          const selected = selectedDate ? toIsoDate(selectedDate) === iso : false;
          const disabled = Boolean((min && day < min) || (max && day > max));
          return (
            <Pressable
              key={iso}
              disabled={disabled}
              onPress={() => onSelect(iso)}
              style={[styles.dayCell, selected && styles.daySelected, disabled && styles.dayDisabled]}
            >
              <Text style={[styles.dayText, selected && styles.dayTextSelected, disabled && styles.dayTextDisabled]}>{day.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  if (!asSheet) return body;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* Tapping the dim area closes; the inner Pressable swallows taps so a tap on
          the calendar itself never reaches the backdrop. */}
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable onPress={() => {}} style={[styles.sheetWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {body}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function calendarDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Array<Date | null> = [];
  for (let index = 0; index < firstDay; index += 1) days.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) days.push(new Date(year, month, day));
  return days;
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

const styles = StyleSheet.create({
  fieldWrap: { flex: 1 },
  fieldLabel: { marginBottom: 7, fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 10, letterSpacing: 1.4 },
  fieldButton: { height: 46, borderRadius: 14, borderWidth: 1.2, borderColor: "#dfe6ee", backgroundColor: "#fdf9f1", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  fieldText: { flex: 1, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 12 },
  fieldPlaceholder: { color: "#9aa6b3" },
  fieldIcon: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 16 },
  calendar: { marginTop: 12, borderRadius: 18, borderWidth: 1.2, borderColor: "#d6e8f6", backgroundColor: "#fdf8ee", padding: 14 },
  // As a sheet it is already the full width of the window, so it loses the outer
  // gap and squares off the bottom corners against the edge of the screen.
  calendarSheet: { marginTop: 0, borderWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 6 },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(7,24,45,.5)", justifyContent: "flex-end" },
  sheetWrap: { backgroundColor: "#fdf8ee", borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" },
  calendarTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  calendarTitle: { flex: 1, fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 14 },
  closeButton: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#edf2f6", alignItems: "center", justifyContent: "center" },
  closeText: { fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 13 },
  monthRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthButton: { width: 36, height: 34, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: "#dfe6ee", alignItems: "center", justifyContent: "center" },
  monthButtonText: { fontFamily: jakarta.extraBold, color: colors.primary, fontSize: 16 },
  monthTitle: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 13 },
  weekRow: { marginTop: 12, flexDirection: "row" },
  weekDay: { width: `${100 / 7}%`, textAlign: "center", fontFamily: jakarta.extraBold, color: colors.muted, fontSize: 10 },
  dayGrid: { marginTop: 8, flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  daySelected: { backgroundColor: colors.primary },
  dayDisabled: { opacity: 0.32 },
  dayText: { fontFamily: jakarta.extraBold, color: colors.navy, fontSize: 12 },
  dayTextSelected: { color: colors.white },
  dayTextDisabled: { color: colors.muted }
});
