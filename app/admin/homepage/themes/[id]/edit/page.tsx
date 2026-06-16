import ThemeEditorForm from "@/components/admin/homepage/theme-editor-form";
import { getHomepageThemeEditorRecord, listHomepageContentBlocks } from "@/lib/homepage/admin";
import { getDatabaseServiceClient } from "@/lib/auth/request";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditHomepageThemePage({ params }: PageProps) {
  const { id } = await params;
  const dataClient = getDatabaseServiceClient();
  const [{ data }, { data: contentBlocks }] = await Promise.all([
    getHomepageThemeEditorRecord(dataClient, id),
    listHomepageContentBlocks(dataClient),
  ]);
  const heroContent = contentBlocks.find((block) => block.content_key === "hero") ?? null;

  return <ThemeEditorForm mode="edit" initialRecord={data} initialHeroContent={heroContent} />;
}
