import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { MessageSquare, Send } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendChatMessage } from '../lib/marketplaceService';
import { Conversation, MessageItem } from '../types/marketplace';

interface MessagesPanelProps {
  uid: string;
  userName: string;
  role: 'customer' | 'provider';
}

export const MessagesPanel: React.FC<MessagesPanelProps> = ({ uid, userName, role }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const field = role === 'customer' ? 'customerId' : 'providerId';
    const q = query(collection(db, 'conversations'), where(field, '==', uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Conversation, 'id'>),
        }));
        setConversations(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
    );
    return () => unsub();
  }, [uid, role]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, 'conversations', selectedId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MessageItem, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `conversations/${selectedId}/messages`)
    );
    return () => unsub();
  }, [selectedId]);

  const activeConversation = conversations.find((c) => c.id === selectedId) || null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !draft.trim()) return;
    setSending(true);
    try {
      await sendChatMessage({
        conversation: activeConversation,
        senderId: uid,
        senderName: userName,
        text: draft.trim(),
      });
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
        <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#142B4A] mb-1">No conversations yet</h3>
        <p className="text-sm text-slate-500">
          Conversations appear automatically when you message a provider or discuss a quotation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[480px]">
      <div className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
        {conversations.map((conv) => {
          const otherName = role === 'customer' ? conv.providerName : conv.customerName;
          const unread = role === 'customer' ? conv.unreadByCustomer : conv.unreadByProvider;
          const active = conv.id === selectedId;
          return (
            <button
              key={conv.id}
              type="button"
              onClick={() => setSelectedId(conv.id)}
              className={`w-full text-left p-4 transition-colors ${
                active ? 'bg-[#EAF2FF]' : 'hover:bg-[#F5F8FD]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-sm text-[#142B4A] truncate">{otherName}</span>
                {unread && (
                  <span className="text-[11px] font-semibold text-[#2563EB]">New</span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{conv.contextTitle}</p>
              {conv.lastMessage && (
                <p className="text-xs text-slate-600 truncate mt-1">{conv.lastMessage}</p>
              )}
            </button>
          );
        })}
      </div>

      <div className="md:col-span-8 flex flex-col justify-between">
        {activeConversation ? (
          <>
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="font-bold text-sm text-[#142B4A]">
                {role === 'customer' ? activeConversation.providerName : activeConversation.customerName}
              </h3>
              <p className="text-xs text-slate-500">{activeConversation.contextTitle}</p>
            </div>

            <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[340px] bg-[#F5F8FD]/50">
              {messages.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  Start the conversation below.
                </p>
              ) : (
                messages.map((msg) => {
                  const mine = msg.senderId === uid;
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-white border border-slate-200 text-[#142B4A]'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            mine ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {msg.senderName}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSend} className="p-3.5 border-t border-slate-100 flex items-center gap-2 bg-white">
              <input
                type="text"
                value={draft}
                maxLength={2000}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
};
