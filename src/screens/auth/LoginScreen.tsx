import React, { useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import AuthScaffold from "@/components/auth/AuthScaffold";
import { authApi } from "@/services/authApi";
import { SessionDraft } from "@/navigation/routes";
import { styles } from "@/styles/appStyles";
import { isValidIndianMobile } from "@/utils/validation";

type Stage = "mobile" | "email" | "password" | "testing_notice" | "set_password";

export default function LoginScreen({
  onRegister,
  onDone
}: {
  onRegister: (draft: SessionDraft) => void;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>("mobile");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [testingCode, setTestingCode] = useState("");
  const [resetFlow, setResetFlow] = useState(false);
  const [loading, setLoading] = useState(false);

  const changeMobile = () => {
    Keyboard.dismiss();
    setStage("mobile");
    setMobile("");
    setEmail("");
    setMaskedEmail("");
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setTestingCode("");
    setResetFlow(false);
    setLoading(false);
  };

  const runLookup = async (lookupEmail?: string) => {
    const result = await authApi.lookup(mobile, lookupEmail);
    setEmail(result.email || lookupEmail || "");
    setMaskedEmail(result.maskedEmail || result.email || lookupEmail || "");
    if (result.nextAction === "register") {
      onRegister({ mobile, email: result.email || lookupEmail, customerExists: false, requestId: "", isRegistered: false });
      return;
    }
    if (result.nextAction === "set_password" && result.mailBypassed) {
      setTestingCode(result.testingCode || "");
      setResetFlow(false);
      setStage("testing_notice");
      return;
    }
    setStage(result.nextAction === "email_required" ? "email" : result.nextAction);
  };

  const submit = async () => {
    setLoading(true);
    try {
      if (stage === "mobile") await runLookup();
      if (stage === "email") await runLookup(email.trim());
      if (stage === "password") {
        await authApi.login(mobile, password);
        onDone();
      }
      if (stage === "set_password") {
        if (password.length < 6 || password !== confirmPassword) return;
        await authApi.setPassword(mobile, code, password);
        setPassword("");
        setConfirmPassword("");
        setCode("");
        setStage("password");
      }
    } catch {
      // The API interceptor displays the backend error.
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    setLoading(true);
    try {
      const result = await authApi.forgotPassword(mobile);
      setMaskedEmail(result.maskedEmail || email);
      setPassword("");
      if (result.mailBypassed) {
        setTestingCode(result.testingCode || "");
        setResetFlow(true);
        setStage("testing_notice");
      } else {
        setStage("set_password");
      }
    } catch {
      // The API interceptor displays the backend error.
    } finally {
      setLoading(false);
    }
  };

  const mobileValid = isValidIndianMobile(mobile);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid = password.length >= 6;
  const canSubmit = stage === "mobile"
    ? mobileValid
    : stage === "email"
      ? emailValid
      : stage === "password"
        ? passwordValid
        : stage === "testing_notice"
          ? testingCode.length === 6
          : code.length === 6 && passwordValid && password === confirmPassword;

  const title = stage === "mobile" ? "Login to your\nRetailer Account"
    : stage === "email" ? "Enter your email"
      : stage === "password" ? "Enter your password"
        : stage === "testing_notice" ? "Testing server notice"
        : "Create a new password";
  const description = stage === "mobile" ? "Enter your registered mobile number to continue."
    : stage === "email" ? "We need your email to locate or create your account."
      : stage === "password" ? `Account found${maskedEmail ? ` for ${maskedEmail}` : ""}.`
        : stage === "testing_notice" ? "Email delivery is currently unavailable on this testing server."
        : `Enter the 6-digit code sent to ${maskedEmail || "your email"}.`;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <AuthScaffold showBrand bodyStyle={styles.loginAuthBody} footerContent={<Text style={styles.authHelpText}>Need help? Call <Text style={styles.authHelpLink}>99102 11716</Text></Text>}>
        <View style={[styles.authCard, styles.loginAuthCard]}>
          {stage !== "mobile" ? (
            <Pressable
              onPressIn={changeMobile}
              accessibilityRole="button"
              accessibilityLabel="Change mobile number"
              hitSlop={12}
              style={styles.authChangeMobileButton}
            >
              <Text style={styles.authChangeMobileIcon}>‹</Text>
              <Text style={styles.authChangeMobileText}>Change mobile number</Text>
            </Pressable>
          ) : <View style={styles.authWelcomeBadge}><Text style={styles.authWelcomeText}>👋  WELCOME</Text></View>}
          <Text style={[styles.authCardTitle, styles.loginAuthCardTitle]}>{title}</Text>
          <Text style={[styles.authDescription, styles.loginAuthDescription]}>{description}</Text>

          <Text style={styles.authLabel}>MOBILE NUMBER</Text>
          <View style={[styles.authMobileInput, styles.loginAuthMobileInput, mobileValid && styles.authInputActive]}>
            <Text style={styles.authDialCode}>+91</Text>
            <TextInput value={mobile} editable={stage === "mobile"} onChangeText={(text) => setMobile(text.replace(/\D/g, "").slice(0, 10))} keyboardType="number-pad" maxLength={10} placeholder="98765 43210" placeholderTextColor="#78838f" style={styles.authMobileTextInput}/>
          </View>

          {stage === "email" ? <AuthField label="EMAIL" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /> : null}
          {stage === "password" ? <AuthField label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry /> : null}
          {stage === "set_password" ? (
            <>
              <AuthField label="EMAIL CODE" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" />
              <AuthField label="NEW PASSWORD" value={password} onChangeText={setPassword} secureTextEntry />
              <AuthField label="CONFIRM PASSWORD" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            </>
          ) : null}
          {stage === "testing_notice" ? (
            <View style={styles.authTestingNotice}>
              <Text style={styles.authTestingNoticeText}>
                This is only a testing environment. Email verification will be enabled on the live production server. Use the temporary link below to {resetFlow ? "reset" : "set"} your password.
              </Text>
              <Pressable
                onPress={() => {
                  setCode(testingCode);
                  setStage("set_password");
                }}
              >
                <Text style={styles.authTestingLink}>{resetFlow ? "RESET PASSWORD NOW →" : "SET PASSWORD NOW →"}</Text>
              </Pressable>
            </View>
          ) : null}

          {stage === "password" ? <Pressable onPress={forgotPassword} disabled={loading}><Text style={styles.authForgotLink}>Forgot password?</Text></Pressable> : null}
          {stage !== "testing_notice" ? (
            <Pressable onPress={submit} disabled={!canSubmit || loading} style={[styles.authButton, styles.loginAuthButton, (!canSubmit || loading) && styles.authButtonDisabled]}>
              <Text style={styles.authButtonText}>{loading ? "PLEASE WAIT..." : stage === "mobile" ? "CONTINUE  →" : stage === "email" ? "CONTINUE  →" : stage === "password" ? "LOGIN  →" : "SAVE PASSWORD  →"}</Text>
            </Pressable>
          ) : null}
          {stage === "set_password" ? (
            <Pressable
              onPress={changeMobile}
              accessibilityRole="button"
              accessibilityLabel="Cancel password setup and return to login"
              style={styles.authCancelButton}
            >
              <Text style={styles.authCancelButtonText}>CANCEL</Text>
            </Pressable>
          ) : null}
          <Text style={styles.authTerms}>By continuing, you agree to KSB's <Text style={styles.authTermsLink}>Terms</Text> & <Text style={styles.authTermsLink}>Privacy Policy</Text></Text>
        </View>
      </AuthScaffold>
    </KeyboardAvoidingView>
  );
}

function AuthField(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(inputProps.secureTextEntry);
  return (
    <>
      <Text style={styles.authLabel}>{label}</Text>
      {isPassword ? (
        <View style={styles.authPasswordInput}>
          <TextInput
            {...inputProps}
            secureTextEntry={!passwordVisible}
            placeholderTextColor="#78838f"
            style={styles.authPasswordTextInput}
          />
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
            hitSlop={10}
            style={styles.authPasswordEye}
          >
            <Text style={styles.authPasswordEyeText}>{passwordVisible ? "🙈" : "👁"}</Text>
          </Pressable>
        </View>
      ) : (
        <TextInput {...inputProps} placeholderTextColor="#78838f" style={styles.authTextInput}/>
      )}
    </>
  );
}
