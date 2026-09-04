import React, { useEffect, useState } from "react";
import { AppState, Keyboard, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { PlusJakartaSans_400Regular } from "@expo-google-fonts/plus-jakarta-sans/400Regular";
import { PlusJakartaSans_500Medium } from "@expo-google-fonts/plus-jakarta-sans/500Medium";
import { PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans/600SemiBold";
import { PlusJakartaSans_700Bold } from "@expo-google-fonts/plus-jakarta-sans/700Bold";
import { PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans/800ExtraBold";
// Imported one weight at a time. The package roots re-export every weight and italic,
// and Metro then ships all forty-odd files whether or not anything uses them.
import { Montserrat_400Regular } from "@expo-google-fonts/montserrat/400Regular";
import { Montserrat_500Medium } from "@expo-google-fonts/montserrat/500Medium";
import { Montserrat_600SemiBold } from "@expo-google-fonts/montserrat/600SemiBold";
import { PlayfairDisplay_500Medium } from "@expo-google-fonts/playfair-display/500Medium";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppBackdrop from "@/components/AppBackdrop";
import Toast from "@/components/common/Toast";
import HomeBottomTabs from "@/components/home/HomeBottomTabs";
import { Route, SessionDraft } from "@/navigation/routes";
import { resetSessionExpiry, setSessionExpiredHandler } from "@/services/session";
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
import { setToastHandler, showToast, ToastPayload } from "@/services/toast";
import { isUpdateRequired, reportInstalledVersion } from "@/services/appVersion";
import { styles } from "@/styles/appStyles";
import { SchemeInfo } from "@/types/api";

const textDefaults = Text as unknown as { defaultProps?: { allowFontScaling?: boolean } };
textDefaults.defaultProps = {
  ...(textDefaults.defaultProps || {}),
  allowFontScaling: false
};

/** The screens that show the artwork at full strength - the design has it that way. */
const authRoutes: Route[] = ["Login", "Register"];

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
    PlusJakartaSans_800ExtraBold,
    // The sign-in screens are set in Montserrat, with Playfair Display for their heading.
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    PlayfairDisplay_500Medium
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

  // The token can stop working while the app is open - a force logout or a device reset
  // from the CRM. The API client has already cleared the stored session by the time this
  // runs; all that is left is to put the person on the login screen and say why, instead
  // of leaving them on a screen where nothing loads. The update wall still outranks it.
  useEffect(() => {
    setSessionExpiredHandler((reason) => {
      showToast(reason, "error");
      setRoute((current) => (current === "ForceUpdate" ? current : "Login"));
    });
    return () => setSessionExpiredHandler(null);
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

    // The CRM's Customer App Details screen should show what is installed now, not what
    // was sent at the last sign-in, so the same two moments report it.
    const report = () => void reportInstalledVersion();

    check(true);
    report();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      check(true);
      report();
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
        {/* One backdrop for the whole app. Every screen root is transparent, so the same
            scene carries from the sign-in screens through to everything behind them -
            at full strength while signing in, and as a wash once inside, where the
            content on top has to stay the thing being read. */}
        {route !== "Splash" ? <AppBackdrop faded={!authRoutes.includes(route)} /> : null}
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
