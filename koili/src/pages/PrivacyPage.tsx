import { LegalLayout } from "../components/ui/LegalLayout";
import { PageMeta } from "../components/seo/PageMeta";
import { SECTIONS, PRIVACY_LAST_UPDATED } from "../assets/data/Privacy.data.tsx";

export default function PrivacyPage() {
  return (
    <>
      <PageMeta
        title="Politique de confidentialité"
        description="Comment Skignas collecte, utilise et protège vos données personnelles. Prestataires, cookies, durées de conservation et vos droits (loi ivoirienne 2013-450)."
        path="/privacy"
      />
      <LegalLayout
        badge="Confidentialité"
        accentColor="#7c3aed"
        title="Politique de confidentialité"
        subtitle="Nous prenons la protection de vos données très au sérieux. Cette politique vous explique quelles données nous collectons, pourquoi, comment nous les utilisons et vos droits à leur égard."
        lastUpdated={PRIVACY_LAST_UPDATED}
        readTime="10 min"
        sections={SECTIONS}
      />
    </>
  );
}