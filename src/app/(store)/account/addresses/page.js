import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import AddressBook from "@/components/account/AddressBook";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true, phone: true, line1: true, line2: true, landmark: true, city: true, state: true, pincode: true, isDefault: true },
  });
  return <AddressBook initial={addresses} defaults={{ name: user.name, phone: user.phone || "" }} />;
}
