import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DealerScheme, dealerSchemeApi } from "@/services/dealerSchemeApi";
import { colors, gradients } from "@/constants/colors";

const GAP = 12;
const SIDE = 20;
const CARD_WIDTH = Dimensions.get("window").width - SIDE * 2;

const EXPIRED_GRADIENT = ["#8b9bad", "#66748a"] as const;
// Same gold family as the Booster wallet hero, but weighted further towards orange.
// That hero is 372px tall so its gradient has room to travel from yellow into amber;
// this card is less than half that height, so it needs to start warmer and end deeper
// to read as the same orange rather than stopping at the yellow end.
const LIVE_GRADIENT = ["#ffc63d", colors.amber, "#e07d0c"] as const;

const formatDate = (value: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

// Live schemes get the gold treatment so they read as the loudest thing on the
// dashboard, well apart from the blue rewards hero directly below.
const gradientFor = (scheme: DealerScheme) =>
  scheme.status === "expired" ? EXPIRED_GRADIENT : scheme.status === "upcoming" ? gradients.navy : LIVE_GRADIENT;

const isDarkInk = (scheme: DealerScheme) => scheme.status === "live";

export default function SchemeSlider({ onOpen }: { onOpen?: (schemeId: number) => void }) {
  const [schemes, setSchemes] = useState<DealerScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const mounted = useRef(true);
  const listRef = useRef<FlatList<DealerScheme>>(null);
  const activeRef = useRef(0);
  // Paused while the user is dragging, so autoplay never fights a manual swipe.
  const pausedRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    dealerSchemeApi
      .list()
      .then(rows => {
        if (mounted.current) setSchemes(rows);
      })
      .catch(() => {
        if (mounted.current) setSchemes([]);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (schemes.length < 2) return;
    const timer = setInterval(() => {
      if (pausedRef.current) return;
      const next = (activeRef.current + 1) % schemes.length;
      activeRef.current = next;
      setActive(next);
      listRef.current?.scrollToOffset({ offset: next * (CARD_WIDTH + GAP), animated: true });
    }, 4000);
    return () => clearInterval(timer);
  }, [schemes.length]);

  if (loading) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Nothing to advertise: stay out of the way rather than showing an empty band.
  if (!schemes.length) return null;

  const liveCount = schemes.filter(scheme => scheme.isLive).length;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.accent} />
        <View style={styles.headCopy}>
          <Text style={styles.title}>Schemes</Text>
          <Text style={styles.subtitle}>
            {liveCount ? `${liveCount} running` : "None running"} · {schemes.length} total
          </Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{schemes.length}</Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={schemes}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => String(item.id)}
        snapToInterval={CARD_WIDTH + GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.track}
        onScrollBeginDrag={() => {
          pausedRef.current = true;
        }}
        onMomentumScrollEnd={event => {
          const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + GAP));
          activeRef.current = index;
          setActive(index);
          pausedRef.current = false;
        }}
        renderItem={({ item }) => {
          const dark = isDarkInk(item);
          const ink = dark ? styles.inkDark : styles.inkLight;
          const inkSoft = dark ? styles.inkDarkSoft : styles.inkLightSoft;
          return (
            <Pressable onPress={() => onOpen?.(item.id)} style={({ pressed }) => [styles.shadow, pressed && styles.pressed]}>
              <LinearGradient
                colors={gradientFor(item)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                <View style={[styles.ringOuter, dark ? styles.ringDark : styles.ringLight]} />
                <View style={[styles.ringInner, dark ? styles.ringDark : styles.ringLight]} />

                <View style={styles.cardHead}>
                  <Text style={[styles.eyebrow, inkSoft]}>{item.tag.toUpperCase()} SCHEME</Text>
                  <View style={[styles.pill, dark ? styles.pillDark : styles.pillLight]}>
                    <Text style={[styles.pillText, ink]}>{item.statusLabel}</Text>
                  </View>
                </View>

                <Text style={[styles.name, ink]} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.code ? <Text style={[styles.code, inkSoft]}>{item.code}</Text> : null}

                <View style={styles.footer}>
                  <View>
                    <Text style={[styles.metaLabel, inkSoft]}>VALIDITY</Text>
                    <Text style={[styles.meta, ink]}>
                      {formatDate(item.startDate)} — {formatDate(item.endDate)}
                    </Text>
                  </View>
                  {item.isLive && item.daysRemaining > 0 ? (
                    <View style={[styles.daysChip, dark ? styles.pillDark : styles.pillLight]}>
                      <Text style={[styles.daysText, ink]}>{item.daysRemaining} days left</Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.cta, dark ? styles.ctaDark : styles.ctaLight]}>
                  <Text style={[styles.ctaText, ink]}>View details  →</Text>
                </View>
              </LinearGradient>
            </Pressable>
          );
        }}
      />

      {schemes.length > 1 ? (
        <View style={styles.dots}>
          {schemes.map((item, index) => (
            <View key={item.id} style={[styles.dot, index === active && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  placeholder: { height: 150, alignItems: "center", justifyContent: "center", marginBottom: 20 },

  head: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  accent: { width: 4, height: 30, borderRadius: 2, backgroundColor: colors.amber, marginRight: 10 },
  headCopy: { flex: 1 },
  title: { fontWeight: "800", fontSize: 18, color: colors.navy, letterSpacing: 0.2 },
  subtitle: { fontSize: 11, color: colors.muted, marginTop: 2 },
  countPill: {
    minWidth: 26,
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  countText: { color: "#fff", fontWeight: "800", fontSize: 12 },

  track: { gap: GAP, paddingVertical: 2 },
  shadow: {
    borderRadius: 24,
    shadowColor: colors.navy,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  card: { width: CARD_WIDTH, borderRadius: 24, padding: 18, overflow: "hidden", minHeight: 178 },

  ringOuter: { position: "absolute", right: -30, top: -22, width: 128, height: 128, borderRadius: 64, borderWidth: 3 },
  ringInner: { position: "absolute", right: 26, top: 24, width: 54, height: 54, borderRadius: 27, borderWidth: 2 },
  ringDark: { borderColor: "rgba(17,50,91,0.16)" },
  ringLight: { borderColor: "rgba(255,255,255,0.18)" },

  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  pill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  pillDark: { backgroundColor: "rgba(17,50,91,0.14)" },
  pillLight: { backgroundColor: "rgba(255,255,255,0.20)" },
  pillText: { fontWeight: "800", fontSize: 10 },

  name: { fontWeight: "800", fontSize: 21, marginTop: 12, lineHeight: 27 },
  code: { fontSize: 11, fontWeight: "600", marginTop: 4 },

  footer: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 14 },
  metaLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  meta: { fontSize: 13, fontWeight: "700", marginTop: 3 },
  daysChip: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  daysText: { fontSize: 11, fontWeight: "800" },

  cta: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7, marginTop: 14 },
  ctaDark: { backgroundColor: "rgba(17,50,91,0.12)" },
  ctaLight: { backgroundColor: "rgba(255,255,255,0.18)" },
  ctaText: { fontSize: 12, fontWeight: "800" },

  inkDark: { color: colors.navy },
  inkDarkSoft: { color: "rgba(17,50,91,0.68)" },
  inkLight: { color: "#fff" },
  inkLightSoft: { color: "rgba(255,255,255,0.75)" },

  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#cbd9e6" },
  dotActive: { width: 20, backgroundColor: colors.amber },
});
