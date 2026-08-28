import { redirect } from "next/navigation";

/** Legacy /privacy URL → canonical /privacy-policy. */
export default function PrivacyRedirect() {
  redirect("/privacy-policy");
}
