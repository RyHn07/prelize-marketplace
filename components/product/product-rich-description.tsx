import { isRichTextHtml, sanitizeRichTextHtml } from "@/lib/rich-text";

type ProductRichDescriptionProps = {
  value: string;
};

export default function ProductRichDescription({ value }: ProductRichDescriptionProps) {
  if (!isRichTextHtml(value)) {
    return <p className="text-sm leading-8 text-slate-600 sm:text-base">{value}</p>;
  }

  return (
    <div
      className="space-y-4 text-sm leading-8 text-slate-600 sm:text-base [&_a]:font-medium [&_a]:text-[#615FFF] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-8 [&_h2]:text-slate-900 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-slate-900 [&_iframe]:my-6 [&_iframe]:block [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border [&_iframe]:border-slate-200 [&_img]:my-6 [&_img]:block [&_img]:max-h-[520px] [&_img]:w-auto [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-slate-200 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_p:has(img)]:my-6 [&_p:has(iframe)]:my-6 [&_strong]:font-semibold [&_strong]:text-slate-800 [&_ul]:list-disc [&_ul]:pl-6"
      dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(value) }}
    />
  );
}
