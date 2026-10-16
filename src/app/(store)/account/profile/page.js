import { getCurrentUser } from "@/lib/auth";
import ProfileForms from "@/components/account/ProfileForms";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  return <ProfileForms user={{ name: user.name, email: user.email, phone: user.phone }} />;
}
