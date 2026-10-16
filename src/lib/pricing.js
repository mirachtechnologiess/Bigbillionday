// Pure pricing maths shared by the cart UI and the server-side order API.
// The server always recomputes with DB prices; the client copy is only for display.

export function couponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (subtotal < (coupon.minOrder || 0)) return 0;
  let d = coupon.type === "FLAT" ? coupon.value : Math.floor((subtotal * coupon.value) / 100);
  if (coupon.maxDiscount) d = Math.min(d, coupon.maxDiscount);
  return Math.max(0, Math.min(d, subtotal));
}

export function computeTotals({ items, coupon, shipping, payment, method = "COD" }) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const mrpTotal = items.reduce((s, i) => s + (i.mrp || i.price) * i.quantity, 0);
  const discount = couponDiscount(coupon, subtotal);
  const afterDiscount = subtotal - discount;
  const shippingFee =
    items.length === 0 ? 0 : afterDiscount >= (shipping?.freeShippingAbove ?? 999) ? 0 : shipping?.flatFee ?? 0;
  const codFee = method === "COD" ? payment?.codFee ?? 0 : 0;
  const total = afterDiscount + shippingFee + codFee;
  return { subtotal, mrpTotal, savings: mrpTotal - subtotal + discount, discount, shippingFee, codFee, total };
}
