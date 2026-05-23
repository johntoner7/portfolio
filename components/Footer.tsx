import { siteData } from "@/lib/data";

export function Footer() {
  return (
    <footer className="border-t border-divider/80">
      <div className="mx-auto flex w-full max-w-site flex-col gap-3 px-4 py-8 text-sm text-muted sm:px-6 lg:px-8 sm:flex-row sm:items-center sm:justify-between">
        <p>{siteData.footer.copy}</p>
      </div>
    </footer>
  );
}
