import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

/**
 * The little gold fleuron the design sets above WELCOME and in the footer rule.
 *
 * Drawn rather than typed: the character it looks like (U+2766) is missing from
 * Montserrat, so the text version came out as an empty box on the device.
 */
export function AuthOrnament({ size = 18, color = "#d08830" }: { size?: number; color?: string }) {
  return (
    <Svg width={size * 2.6} height={size} viewBox="0 0 52 20">
      <Path
        d="M26 3 C22 8 18 10 13 10 C18 10 22 12 26 17 C30 12 34 10 39 10 C34 10 30 8 26 3 Z"
        fill={color}
      />
      <Circle cx="6" cy="10" r="2" fill={color} />
      <Circle cx="46" cy="10" r="2" fill={color} />
    </Svg>
  );
}

/** The handset in its ring, beside the help line. */
export function AuthPhoneIcon({ size = 31, color = "#d08830" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx="16" cy="16" r="15.4" stroke={color} strokeWidth="1.2" fill="none" />
      <Path
        d="M12.1 9.2 C11.4 9.2 10.7 9.6 10.3 10.2 L9.6 11.3 C9.1 12.1 9.1 13.1 9.5 13.9
           C10.4 15.8 11.7 17.6 13.3 19.1 C14.8 20.6 16.6 21.8 18.5 22.7
           C19.3 23.1 20.3 23 21.1 22.5 L22.2 21.8 C22.8 21.4 23.2 20.7 23.2 20
           C23.2 19.5 23 19.1 22.6 18.8 L20.9 17.5 C20.3 17 19.4 17 18.8 17.5
           L18 18.1 C16.4 17.2 15.1 15.9 14.2 14.3 L14.8 13.5
           C15.3 12.9 15.3 12 14.8 11.4 L13.5 9.8 C13.2 9.4 12.7 9.2 12.1 9.2 Z"
        fill={color}
      />
    </Svg>
  );
}
