export function DupeBanner({ visible, onMerge }: { visible: boolean; onMerge: () => void }) {
  if (!visible) return null;
  return (
    <div className="rounded-lg border bg-yellow-50 text-yellow-900 p-3 text-sm">
      נמצאו כפילויות אפשריות. מומלץ למזג.
      <button className="ml-2 underline" onClick={onMerge}>מזג</button>
    </div>
  );
}


