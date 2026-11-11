import { db } from "@/db";
import { userStats } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const topUsers = await db.query.userStats.findMany({
    orderBy: [desc(userStats.messageCount)],
    limit: 10,
  });

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-zinc-50">
      <h1 className="text-4xl font-bold mb-8 text-yellow-500">Community Server Bot Dashboard</h1>
      
      <div className="w-full max-w-4xl bg-zinc-900 rounded-xl p-8 border border-zinc-800 shadow-2xl">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          🏆 Топ участников по сообщениям
        </h2>
        
        <div className="space-y-4">
          {topUsers.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">Пока нет данных о статистике...</p>
          ) : (
            topUsers.map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-zinc-500 w-8">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-lg">User ID: {user.userId}</p>
                    <p className="text-sm text-zinc-400">Минут в войсе: {user.voiceMinutes}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-500">{user.messageCount}</p>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">сообщений</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-12 text-center text-zinc-500 max-w-2xl">
        <p>Этот бот управляет вашим Discord сервером, создаёт приватные комнаты, ведёт логи и отслеживает статистику.</p>
        <p className="mt-4">
          Для запуска бота убедитесь, что <code className="bg-zinc-800 px-2 py-1 rounded">DISCORD_TOKEN</code> и <code className="bg-zinc-800 px-2 py-1 rounded">DISCORD_CLIENT_ID</code> заданы в окружении.
        </p>
      </div>
    </main>
  );
}
