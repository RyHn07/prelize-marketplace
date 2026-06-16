import AdminPageHeader from "@/components/admin/admin-page-header";
import ThemeRenderer from "@/components/homepage/theme-renderer";
import { getHomepageRenderData } from "@/lib/homepage/queries";
import { getDatabaseServiceClient } from "@/lib/auth/request";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HomepageThemePreviewPage({ params }: PageProps) {
  const { id } = await params;
  const dataClient = getDatabaseServiceClient();
  const { data } = await getHomepageRenderData({
    previewThemeId: id,
    client: dataClient,
  });

  return (
    <section className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Homepage"
        title={data.theme ? `Preview: ${data.theme.name}` : "Theme Preview"}
        description="This preview renders the selected theme without changing the active storefront theme."
      />
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <ThemeRenderer data={data} />
      </div>
    </section>
  );
}
