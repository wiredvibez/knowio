import { BrandHeader } from "@/components/nav/brand-header";
import Link from "next/link";

export default function CommunityPage() {
  return (
    <div className="p-6 space-y-6">
      <BrandHeader title="Community" />
      <div className="rounded border p-4 text-sm space-y-2">
        <p>
          Friends and sharing controls moved to your personal space.
        </p>
        <ul className="list-disc pr-5 space-y-1">
          <li>
            <Link className="underline" href="/me/social/friends">Go to Friends</Link>
          </li>
          <li>
            <Link className="underline" href="/me/social/sharing">Go to Sharing control</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}


