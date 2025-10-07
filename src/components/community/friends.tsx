"use client";
import { useFriends } from "@/hooks/useFriends";
import { useEffect, useState } from "react";
import { fetchUserNames } from "@/lib/names";

export function FriendsManager() {
  const { friends, requestsIn, requestsOut, sendRequestBy, acceptRequest, removeFriend } = useFriends();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = [
      ...friends,
      ...requestsIn.map((r) => r.from),
      ...requestsOut.map((r) => r.to),
    ];
    if (ids.length === 0) { setNameMap({}); return; }
    const t0 = performance.now();
    fetchUserNames(ids).then((m) => {
      setNameMap(m);
    });
  }, [friends, requestsIn, requestsOut]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold mb-2">הוספת חבר</h2>
        <div className="flex gap-2 mb-1">
          <button className={`text-xs rounded-full px-2 py-0.5 border ${mode==='email'?'bg-foreground text-background':''}`} onClick={()=>setMode('email')}>Email</button>
          <button className={`text-xs rounded-full px-2 py-0.5 border ${mode==='phone'?'bg-foreground text-background':''}`} onClick={()=>setMode('phone')}>Phone</button>
        </div>
        <div className="flex gap-2 items-center relative">
          <input
            className="border rounded px-2 py-1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === 'email' ? 'אימייל' : 'טלפון +972...'}
          />
          <button
            className="px-3 py-1 rounded bg-foreground text-background"
            onClick={async () => {
              if (mode === 'email') {
                // basic email regex
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
                await sendRequestBy({ email: value });
              } else {
                // simple E.164 check
                if (!/^\+\d{8,15}$/.test(value)) return;
                await sendRequestBy({ phone: value });
              }
              setValue("");
              setSent(true);
              setTimeout(()=>setSent(false), 5000);
            }}
          >
            שלח בקשה
          </button>
          {sent && (
            <span className="absolute -bottom-5 right-0 text-xs text-green-600">הזמנה נשלחה!</span>
          )}
        </div>
      </div>

      {requestsIn.length > 0 && (
      <div>
        <h2 className="font-semibold mb-2">בקשות נכנסות</h2>
        <div className="space-y-2">
          {requestsIn.map((r) => (
            <div key={r.id} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
              <span>מאת: {nameMap[r.from] ?? r.from}</span>
              <div className="flex gap-2">
                <button className="underline" onClick={() => acceptRequest(r.id, r.from)}>אשר</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {friends.length > 0 && (
      <div>
        <h2 className="font-semibold mb-2">חברים</h2>
        <div className="space-y-2">
          {friends.map((id) => (
            <div key={id} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
              <span>{nameMap[id] ?? id}</span>
              <button className="underline" onClick={() => removeFriend(id)}>הסר</button>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}


