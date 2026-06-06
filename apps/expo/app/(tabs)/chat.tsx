import { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable } from '@sams/ui';
import { chatApi, teamsApi } from '@sams/api';
import type { Team, ChatMessage } from '@sams/api';
import { useAuthStore } from '@sams/store';
import { ROLE_COLOR } from '@sams/ui';

export default function ChatTab() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'Player';
  const color = ROLE_COLOR[role as keyof typeof ROLE_COLOR] ?? '#6366F1';

  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');

  useEffect(() => {
    teamsApi.getTeams().then((t) => { setTeams(t); if (t[0]) setActiveTeam(t[0].id); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeTeam) return;
    chatApi.getMessages(activeTeam).then(setMessages).catch(() => {});
    const id = setInterval(() => chatApi.getMessages(activeTeam).then(setMessages).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, [activeTeam]);

  async function send() {
    if (!activeTeam || !body.trim()) return;
    const text = body.trim();
    setBody('');
    const opt: ChatMessage = { id: Date.now().toString(), team_id: activeTeam, sender_id: user?.id ?? '', body: text, created_at: new Date().toISOString() };
    setMessages((p) => [...p, opt]);
    try { await chatApi.sendMessage(activeTeam, text); } catch (_) {}
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Team selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 8, flexDirection: 'row' }}>
        {teams.map((t) => (
          <Pressable key={t.id} onPress={() => setActiveTeam(t.id)}
            style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99, backgroundColor: activeTeam === t.id ? color : '#F1F5F9' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: activeTeam === t.id ? '#FFFFFF' : '#64748B' }}>
              # {t.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Messages */}
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ gap: 10, paddingBottom: 16 }}>
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <View key={msg.id} style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <View style={{ maxWidth: '78%', padding: 12, borderRadius: isMe ? 16 : 16, backgroundColor: isMe ? color : '#FFFFFF', borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4 }}>
                <Text style={{ fontSize: 14, color: isMe ? '#FFFFFF' : '#0F172A', lineHeight: 20 }}>{msg.body}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input */}
      <View className="flex-row items-center gap-2 px-4 pb-6 pt-2 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Message…"
          placeholderTextColor="#94A3B8"
          returnKeyType="send"
          onSubmitEditing={send}
          className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-2xl px-4 py-3 text-slate-900 dark:text-white text-sm"
          style={{ fontSize: 14 }}
        />
        <Pressable onPress={send} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFF', fontSize: 18 }}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}
