export function MapSkeleton() {
  return (
    <div className="grid h-full min-h-[280px] place-items-center bg-teal-50 dark:bg-stone-950 lg:min-h-[420px]">
      <div
        aria-hidden="true"
        className="size-10 animate-pulse rounded-full border-4 border-teal-200 border-t-teal-700"
      />
    </div>
  );
}
