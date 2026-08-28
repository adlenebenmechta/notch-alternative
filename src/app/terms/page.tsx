import { redirect } from "next/navigation";

/** Legacy /terms URL → canonical /terms-of-service. */
export default function TermsRedirect() {
  redirect("/terms-of-service");
}
