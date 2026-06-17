import { redirect } from "next/navigation";
import { WelcomeWizard } from "@/components/welcome-wizard";
import { getProfile } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  // already set up -> straight to the app
  if ((await getProfile()).onboarded) redirect("/");
  return <WelcomeWizard />;
}
