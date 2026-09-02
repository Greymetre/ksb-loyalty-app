import React, { useEffect, useState } from "react";
import { AppState, Keyboard, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold
} from "@expo-google-fonts/plus-jakarta-sans";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "@/components/common/Toast";
import HomeBottomTabs from "@/components/home/HomeBottomTabs";
import { Route, SessionDraft } from "@/navigation/routes";
import LoadingScreen from "@/screens/common/LoadingScreen";
import LoginScreen from "@/screens/auth/LoginScreen";
import RegisterScreen from "@/screens/auth/RegisterScreen";
import SplashScreen from "@/screens/auth/SplashScreen";
import ForceUpdateScreen from "@/screens/common/ForceUpdateScreen";
import HomeScreen from "@/screens/home/HomeScreen";
import InvoicesScreen from "@/screens/home/InvoicesScreen";
import InvoiceDetailScreen from "@/screens/home/InvoiceDetailScreen";
import KycScreen from "@/screens/home/KycScreen";
import MenuScreen from "@/screens/home/MenuScreen";
import ProfileScreen from "@/screens/home/ProfileScreen";
import RedemptionHistoryScreen from "@/screens/home/RedemptionHistoryScreen";
import RedemptionScreen from "@/screens/home/RedemptionScreen";
import SchemeScreen from "@/screens/home/SchemeScreen";
import WalletScreen from "@/screens/home/WalletScreen";
import DealerHomeScreen from "@/screens/dealer/DealerHomeScreen";
import { setToastHandler, ToastPayload } from "@/services/toast";
import { isUpdateRequired } from "@/services/appVersion";
import { styles } from "@/styles/appStyles";
import { SchemeInfo } from "@/types/api";

const textDefaults = Text as unknown as { defaultProps?: { allowFontScaling?: boolean } };
textDefaults.defaultProps = {
  ...(textDefaults.defaultProps || {}),
  allowFontScaling: false
};

const appRoutesWithTabs: Route[] = [
  "Home",
  "Slab",
  "Booster",
  "Invoices",
  "Redeem",
  "RedeemSlab",
  "RedeemBooster",
  "RedemptionHistory",
  "Scheme",
  "Menu",
  "Profile",
  "Kyc"
];

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold
  });
  const [route, setRoute] = useState<Route>("Splash");
  const [routeVisit, setRouteVisit] = useState(0);
  const [previous, setPrevious] = useState<Route>("Home");
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<SchemeInfo | null>(null);
  const [dashboardSchemes, setDashboardSchemes] = useState<SchemeInfo[]>([]);

  useEffect(() => {
    setToastHandler((payload) => {
      setToast(payload);
      setTimeout(() => setToast(null), 3400);
    });
    return () => setToastHandler(null);
  }, []);

  // A version can be published while somebody is halfway through the app, so the wall
  // has to be able to appear at any moment - not only at a cold start. It is checked at
  // launch, whenever the app returns from the background, and on every screen change
  // below. The check itself never blocks: if it cannot answer, the app carries on.
  useEffect(() => {
    let cancelled = false;
    const check = (force: boolean) => {
      void isUpdateRequired({ force }).then((required) => {
        if (required && !cancelled) setRoute("ForceUpdate");
      });
    };

    check(true);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check(true);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  // Every screen change asks again. The service throttles this to one request a minute,
  // so moving around the app does not turn into a request per tap.
  useEffect(() => {
    if (route === "ForceUpdate") return;
    let cancelled = false;
    void isUpdateRequired().then((required) => {
      if (required && !cancelled) setRoute("ForceUpdate");
    });
    return () => { cancelled = true; };
  }, [route]);

  // Once the update wall is up nothing may navigate away from it - not the splash
  // timer finishing, not a tab press.
  const navigate = (next: Route) => setRoute(current => (current === "ForceUpdate" ? current : next));

  const go = (next: Route) => {
    setPrevious(route);
    navigate(next);
    // A bottom-tab press can target the current route. Incrementing this
    // visit key remounts that data screen so its API is fetched again.
    setRouteVisit((visit) => visit + 1);
  };
  const showBottomTabs = route !== "ForceUpdate" && appRoutesWithTabs.includes(route);

  if (!fontsLoaded && !fontError) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LoadingScreen message="Loading app" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View
        style={{ flex: 1 }}
        onStartShouldSetResponderCapture={() => {
          Keyboard.dismiss();
          return false;
        }}
      >
        <View key={`${route}:${routeVisit}`} style={showBottomTabs ? styles.appContentWithTabs : styles.appContent}>
          {route === "ForceUpdate" && <ForceUpdateScreen />}
          {route === "Splash" && <SplashScreen onDone={navigate} />}
          {route === "Login" && <LoginScreen onRegister={(nextDraft) => { setDraft(nextDraft); setRoute("Register"); }} onDone={setRoute} />}
          {route === "Register" && draft && <RegisterScreen mobile={draft.mobile} email={draft.email || ""} onDone={() => setRoute("Home")} />}
          {route === "Home" && <HomeScreen go={go} onOpenScheme={(scheme, schemes) => { setSelectedScheme(scheme); setDashboardSchemes(schemes); go("Scheme"); }} />}
          {route === "DealerHome" && <DealerHomeScreen onLogout={() => setRoute("Login")} />}
          {route === "Slab" && <WalletScreen type="SLAB" go={go} />}
          {route === "Booster" && <WalletScreen type="BOOSTER" go={go} />}
          {route === "Invoices" && <InvoicesScreen go={go} onOpenInvoice={(id) => { setSelectedInvoiceId(id); go("InvoiceDetail"); }} />}
          {route === "InvoiceDetail" && selectedInvoiceId && <InvoiceDetailScreen invoiceId={selectedInvoiceId} onBack={() => setRoute("Invoices")} />}
          {route === "Redeem" && <RedemptionScreen go={go} />}
          {route === "RedeemSlab" && <RedemptionScreen go={go} initialWallet="SLAB" />}
          {route === "RedeemBooster" && <RedemptionScreen go={go} initialWallet="BOOSTER" />}
          {route === "RedemptionHistory" && <RedemptionHistoryScreen go={go} />}
          {route === "Scheme" && <SchemeScreen go={go} selectedScheme={selectedScheme} dashboardSchemes={dashboardSchemes} />}
          {route === "Menu" && <MenuScreen go={go} back={() => setRoute(previous === "Menu" ? "Home" : previous)} />}
          {route === "Profile" && <ProfileScreen go={go} />}
          {route === "Kyc" && <KycScreen go={go} />}
        </View>
          {showBottomTabs ? <HomeBottomTabs go={go} route={route} /> : null}
          {toast ? <Toast payload={toast} onClose={() => setToast(null)} /> : null}
      </View>
    </SafeAreaProvider>
  );
}
