import { redirect } from "next/navigation";

export default function QuotePageRedirect() {
  redirect("/cart");
}
