import { getSettings } from "@/lib/data";
import { whatsappLink } from "@/lib/format";
import { telHref } from "@/components/site/config";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import styles from "./layout.module.css";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const wa = whatsappLink(settings.whatsapp);

  return (
    <div className={styles.shell}>
      <a href="#contenido" className={styles.skip}>
        Saltar al contenido
      </a>
      <SiteHeader
        brand={settings.agency_name}
        whatsappHref={wa}
        telHref={telHref(settings.phone)}
        phone={settings.phone}
      />
      <main id="contenido" className={styles.main}>
        {children}
      </main>
      <SiteFooter settings={settings} />
      <WhatsAppFloat href={wa} />
    </div>
  );
}
