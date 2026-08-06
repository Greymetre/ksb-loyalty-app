export const colors = {
  primary: "#15599a",
  deepGreen: "#123d6d",
  blue: "#2f8ed4",
  cyan: "#5aa8df",
  gold: "#ffd54a",
  amber: "#f5a623",
  navy: "#11325b",
  navy2: "#173c68",
  text: "#1a2b3a",
  muted: "#566477",
  background: "#f2f7fc",
  border: "#e3e9ef",
  white: "#ffffff",
  danger: "#d64545",
  successSoft: "#e8f4ff",
  goldSoft: "#fff7d6"
};

export const gradients = {
  main: [colors.deepGreen, colors.primary, colors.blue, colors.cyan] as const,
  green: [colors.deepGreen, colors.primary] as const,
  gold: [colors.gold, colors.amber] as const,
  navy: [colors.navy, colors.navy2] as const
};
