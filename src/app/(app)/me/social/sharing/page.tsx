import { BrandHeader } from "@/components/nav/brand-header";
import { ShareOffers } from "@/components/community/share-offers";
import { SharePacks } from "@/components/community/share-packs";

export default function MeSocialSharingPage() {
  return (
    <div className="space-y-6">
      <BrandHeader title="Sharing control" />
      <ShareOffers />
      <div>
        <h2 className="font-semibold mb-2">Shared packs</h2>
        <SharePacks />
      </div>
    </div>
  );
}


