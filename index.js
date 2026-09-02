// Expo SDK 54's native projects resolve the app entry as ./index. The old
// expo/AppEntry.js indirection is gone, so registration happens here.
import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
