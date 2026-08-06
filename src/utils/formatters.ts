export const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export const moneyInLakh = (value: number) => {
  const lakhValue = value / 100000;
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: lakhValue >= 10 ? 1 : 2,
    minimumFractionDigits: 0
  }).format(lakhValue);
  return `₹${formatted}L`;
};
