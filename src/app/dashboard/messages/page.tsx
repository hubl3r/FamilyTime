// Redirect old /dashboard/messages to /dashboard/comms
import { redirect } from "next/navigation";
export default function MessagesRedirect() {
  redirect("/dashboard/comms");
}
