import ThemeEditorForm from "@/components/admin/homepage/theme-editor-form";
import { getHomepageThemeEditorRecord, listHomepageContentBlocks } from "@/lib/homepage/admin";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditHomepageThemePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = getSupabaseServiceRoleClient();
  const [{ data }, { data: contentBlocks }] = await Promise.all([
    getHomepageThemeEditorRecord(supabase, id),
    listHomepageContentBlocks(supabase),
  ]);
  const heroContent = contentBlocks.find((block) => block.content_key === "hero") ?? null;

  return <ThemeEditorForm mode="edit" initialRecord={data} initialHeroContent={heroContent} />;
}
