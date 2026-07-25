import { redirect } from "next/navigation";
import { getActiveLeague } from "@/lib/league";

export default async function HomePage() {
  const league = await getActiveLeague();
  if (!league) redirect("/leagues/new");
  redirect("/matches");
}
