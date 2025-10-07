import { BrandHeader } from "@/components/nav/brand-header";
import { FriendsManager } from "@/components/community/friends";

export default function MeSocialFriendsPage() {
  return (
    <div className="space-y-6">
      <BrandHeader title="Friends" />
      <FriendsManager />
    </div>
  );
}


