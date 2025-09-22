import { FriendsManager } from "@/components/community/friends";
import { SharePacks } from "@/components/community/share-packs";
import { ShareOffers } from "@/components/community/share-offers";

export default function CommunityPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">קהילה</h1>
      <FriendsManager />
      <ShareOffers />
      <div>
        <h2 className="font-semibold mb-2">שיתופים</h2>
        <SharePacks />
      </div>
    </div>
  );
}


