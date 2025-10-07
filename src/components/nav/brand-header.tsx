import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function BrandHeader({ title, avatarUrl }: { title: string; avatarUrl?: string | null }) {
  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-center gap-3">
        <span className="font-extrabold bg-gradient-to-r from-purple-600 via-fuchsia-500 to-blue-600 bg-clip-text text-transparent">peepz</span>
        <span className="text-black">|</span>
        <span className="font-extrabold text-black">{title}</span>
        {avatarUrl && avatarUrl.trim() !== "" && (
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={avatarUrl}
              alt="profile"
              referrerPolicy="no-referrer"
            />
            <AvatarFallback>אני</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}


