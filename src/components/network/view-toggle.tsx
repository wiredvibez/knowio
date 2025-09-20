"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ViewToggle({ view, onChange }: { view: "table" | "cards"; onChange: (v: "table" | "cards") => void }) {
  return (
    <Tabs value={view} onValueChange={(v) => onChange(v as any)}>
      <TabsList>
        <TabsTrigger value="table">טבלה</TabsTrigger>
        <TabsTrigger value="cards">כרטיסים</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}


