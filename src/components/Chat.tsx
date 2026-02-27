import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ChatProps {
  otherUserId: string;
  otherUserName: string;
}

export const Chat: React.FC<ChatProps> = ({ otherUserId, otherUserName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const subscription = supabase
      .channel(`messages:${user?.id}:${otherUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMessage = payload.new as Message;
        if (
          (newMessage.sender_id === user?.id && newMessage.receiver_id === otherUserId) ||
          (newMessage.sender_id === otherUserId && newMessage.receiver_id === user?.id)
        ) {
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [otherUserId, user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`(sender_id.eq.${user.id},and(receiver_id.eq.${otherUserId})),(sender_id.eq.${otherUserId},and(receiver_id.eq.${user.id}))`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', otherUserId);

    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('messages').insert([
        { sender_id: user.id, receiver_id: otherUserId, content: newMessage },
      ]);

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-octopus-accent text-white rounded-tr-none'
                    : 'bg-white/10 text-zinc-300 rounded-tl-none'
                }`}
              >
                {msg.content}
                <div className={`text-[10px] mt-1 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-center py-8 text-zinc-500 italic text-sm">
            No messages yet. Start the conversation!
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message ${otherUserName}...`}
          className="octopus-input flex-1"
        />
        <button
          type="submit"
          disabled={isLoading || !newMessage.trim()}
          className="p-3 rounded-xl bg-octopus-accent text-white hover:bg-octopus-accent/80 transition-colors disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};
