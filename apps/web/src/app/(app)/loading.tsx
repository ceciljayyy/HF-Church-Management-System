export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 animate-pulse rounded-2xl bg-card" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-card" />
    </div>
  );
}