import Navbar from "@/components/Navbar";
import BoardMessageWall from "@/components/BoardMessageWall";
import { fetchBoardMessages } from "@/lib/board-messages";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function BoardPage() {
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    messages,
  ] = await Promise.all([supabase.auth.getUser(), fetchBoardMessages()]);

  return (
    <main className="min-h-screen bg-[#F7F5F0]">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 pb-24 pt-32 md:px-8">
        <header className="mb-14 space-y-6">
          <p className="text-xs uppercase tracking-[0.38em] text-[#9A897E]">Board</p>
          <h1 className="font-youyou text-5xl tracking-[0.16em] text-[#2C2C2C] md:text-6xl">
            留言板
          </h1>
          <p className="max-w-3xl font-serif text-lg leading-loose text-[#645A54]">
            这里给每一个路过的人留一小块地方。可以打招呼，也可以认真说一句此刻想说的话。
          </p>
        </header>

        <BoardMessageWall initialMessages={messages} isLoggedIn={Boolean(user)} />
      </div>
    </main>
  );
}
