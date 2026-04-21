export default function Loading() {
  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <div className="fixed top-0 z-50 h-20 w-full border-b border-[#D7CCC8]/30 bg-[#F7F5F0]/80 backdrop-blur-sm" />

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-20 pt-28 md:px-8 md:pt-32">
        <div className="space-y-4">
          <div className="h-3 w-24 animate-pulse rounded-full bg-[#E8E4DF]" />
          <div className="h-12 w-2/3 animate-pulse rounded-full bg-[#E8E4DF]" />
          <div className="h-5 w-full max-w-3xl animate-pulse rounded-full bg-[#EFEAE4]" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[2rem] border border-[#E8E4DF] bg-white/80 p-6"
            >
              <div className="h-4 w-20 animate-pulse rounded-full bg-[#E8E4DF]" />
              <div className="mt-5 h-9 w-3/4 animate-pulse rounded-full bg-[#EFEAE4]" />
              <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-[#F3EEE8]" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-[#F3EEE8]" />
              <div className="mt-8 h-10 w-28 animate-pulse rounded-full bg-[#E8E4DF]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
