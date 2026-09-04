export const colors = {
  /* The brown of the logo's rising arrow, dark at its foot and light at the tip. These
     four are the app's primary ramp: gradients are built from them and the solid fills,
     icons and links use `primary`, so the whole app moves together rather than leaving
     blue buttons under brown headers.

     `primary` is a shade darker than the arrow's own base (#9c6307) because it also sets
     text on white; this holds 6.2:1 there, and white on the ramp's dark end holds
     7.7:1. */
  primary: "#8a5a08",
  deepGreen: "#744a07",
  blue: "#b1780f",
  cyan: "#c99518",
  gold: "#ffd54a",
  amber: "#f5a623",
  navy: "#11325b",
  navy2: "#173c68",
  text: "#1a2b3a",
  muted: "#566477",
  // Screens are transparent: the app paints one backdrop behind everything (AppBackdrop).
  background: "transparent",
  border: "#e3e9ef",
  white: "#ffffff",
  danger: "#d64545",
  successSoft: "#faf0dd",
  goldSoft: "#fff7d6"
};

export const gradients = {
  main: [colors.deepGreen, colors.primary, colors.blue, colors.cyan] as const,
  green: [colors.deepGreen, colors.primary] as const,
  gold: [colors.gold, colors.amber] as const,
  navy: [colors.navy, colors.navy2] as const
};
