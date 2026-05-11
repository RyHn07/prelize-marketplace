import ThemeRenderer from "@/components/homepage/theme-renderer";
import { getHomepageRenderData } from "@/lib/homepage/queries";

export default async function HomePage() {
  const { data } = await getHomepageRenderData();
  return <ThemeRenderer data={data} />;
}
