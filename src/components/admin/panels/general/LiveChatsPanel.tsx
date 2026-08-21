import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { MetricCard } from "../shared";

export function LiveChatsPanel() {
  const { data: activeChats } = useSuspenseQuery(convexQuery(api.live_chats.getActiveChats, {})) as { data: any };
  const { data: chatStats } = useSuspenseQuery(convexQuery(api.live_chats.getChatStats, {})) as { data: any };
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const sendReply = useMutation(api.live_chats.sendReply);
  const resolveChat = useMutation(api.live_chats.resolveChat);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedChat) return;
    await sendReply({ chatId: selectedChat.id, message: replyText });
    setReplyText("");
  };

  const handleResolve = async () => {
    if (!selectedChat) return;
    if (!confirm("Resolve this chat?")) return;
    await resolveChat({ chatId: selectedChat.id });
    setSelectedChat(null);
  };

  return (
    <div className="space-y-10 ">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <MetricCard label="Active Chats" value={chatStats?.active || 0} icon="💬" color="emerald" />
        <MetricCard label="Escalated" value={chatStats?.escalated || 0} icon="⚠️" color="amber" />
        <MetricCard label="Resolved" value={chatStats?.resolved || 0} icon="✅" color="blue" />
        <MetricCard label="Resolution Rate" value={`${chatStats?.resolutionRate || 0}%`} icon="📈" color="indigo" />
      </div>

      {/* Chat Interface */}
      <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-12 shadow-2xl">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white mb-8">Live Chat Support</h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat List */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Conversations ({activeChats?.length || 0})</p>
            {activeChats?.map((chat: any) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedChat?.id === chat.id
                    ? "bg-orange-600/10 border-orange-500/20"
                    : "bg-slate-950 border-white/5 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-white">{chat.user_name || "Anonymous"}</p>
                    <p className="text-[9px] text-slate-500 line-clamp-1">{chat.last_message}</p>
                  </div>
                  {chat.unread_count > 0 && (
                    <span className="w-5 h-5 bg-orange-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 bg-slate-950 rounded-2xl border border-white/5 p-6">
            {selectedChat ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <p className="text-sm font-bold text-white">{selectedChat.user_name || "Anonymous"}</p>
                  <button onClick={handleResolve} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg">
                    ✅ Resolve
                  </button>
                </div>
                <div className="h-[300px] overflow-y-auto space-y-3">
                  <div className="p-3 bg-slate-900 rounded-xl max-w-[80%]">
                    <p className="text-sm text-white">{selectedChat.last_message}</p>
                    <p className="text-[8px] text-slate-500 mt-1">{new Date(selectedChat.last_message_time).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                    placeholder="Type your reply..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                  />
                  <button onClick={handleSendReply} className="px-6 py-3 bg-orange-600 text-white text-xs font-bold rounded-xl">
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-slate-500">
                Select a chat to start responding
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
