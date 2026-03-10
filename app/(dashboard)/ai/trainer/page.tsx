'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadChatHistory, loadChatSessions, clearChat } from './actions';
import Link from 'next/link';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
  timestamp?: string;
}

interface ChatSession {
  sessionId: string;
  firstMessage: string;
  createdAt: Date;
  messageCount: number;
}

function generateSessionId() {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function formatTime(d?: Date | string): string {
  if (!d) return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function TrainerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isStreaming) return;

    setInput('');
    setError('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const now = formatTime();
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: now }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: '' }]);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId }),
      });

      if (!res.ok) throw new Error(`Ошибка: ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.error) {
            setError(data.error);
            break;
          }

          if (data.text) {
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: last.content + data.text };
              }
              return updated;
            });
          }
        }
      }

      // Set timestamp when streaming finishes
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant') {
          updated[updated.length - 1] = { ...last, timestamp: formatTime() };
        }
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(generateSessionId());
    setShowSessions(false);
    setError('');
  };

  const openSessions = async () => {
    const list = await loadChatSessions();
    setSessions(list);
    setShowSessions(true);
  };

  const loadSession = async (sid: string) => {
    const history = await loadChatHistory(sid);
    setMessages(history.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: m.createdAt,
      timestamp: formatTime(m.createdAt),
    })));
    setSessionId(sid);
    setShowSessions(false);
  };

  const deleteSession = async (sid: string) => {
    await clearChat(sid);
    setSessions(prev => prev.filter(s => s.sessionId !== sid));
    if (sid === sessionId) startNewChat();
  };

  const formatDate = (d: Date) => {
    return new Date(d).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-1rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#38383A]/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/ai"
            className="text-[#8E8E93] hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          {/* AI avatar in header */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0A84FF] to-[#5E5CE6] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">DENCO Тренер</h1>
            <p className="text-xs text-[#8E8E93]">
              {isStreaming ? 'печатает...' : 'онлайн'}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={openSessions}
            className="p-2 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] transition-colors"
            title="История чатов"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#8E8E93]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </button>
          <button
            onClick={startNewChat}
            className="p-2 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] transition-colors"
            title="Новый чат"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#8E8E93]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sessions modal */}
      {showSessions && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 px-4" onClick={() => setShowSessions(false)}>
          <div className="bg-[#1C1C1E] rounded-2xl p-4 w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">История чатов</h2>
              <button onClick={() => setShowSessions(false)} className="text-[#8E8E93] hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-[#8E8E93] text-sm py-4 text-center">Нет сохранённых чатов</p>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.sessionId} className="flex items-center gap-2 p-3 rounded-xl bg-black/30 hover:bg-[#2C2C2E] transition-colors">
                    <button
                      onClick={() => loadSession(s.sessionId)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium truncate">{s.firstMessage}</p>
                      <p className="text-xs text-[#8E8E93]">
                        {formatDate(s.createdAt)} · {s.messageCount} сообщ.
                      </p>
                    </button>
                    <button
                      onClick={() => deleteSession(s.sessionId)}
                      className="p-1.5 rounded-lg text-[#8E8E93] hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0A84FF] to-[#5E5CE6] flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-1">DENCO Тренер</h2>
            <p className="text-[#8E8E93] text-sm mb-6 max-w-xs">
              Персональный AI-тренер с доступом к твоим данным
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {[
                'Начинаю тренировку, что делать сегодня?',
                'Что съесть после тренировки?',
                'Оцени мой прогресс за неделю',
                'Составь программу на месяц',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  disabled={isStreaming}
                  className="text-left text-sm p-3 rounded-2xl bg-[#1C1C1E] hover:bg-[#2C2C2E] active:scale-[0.98] transition-all border border-[#38383A]/50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spacer pushes messages to bottom when few messages */}
        <div className="flex-1" />

        {/* Messages list */}
        <div className="space-y-1 py-4">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const isLastAssistant = !isUser && i === messages.length - 1;
            const isEmptyStreaming = isLastAssistant && isStreaming && !msg.content;

            return (
              <div
                key={i}
                className={`flex items-end gap-2 animate-[fadeSlideIn_0.3s_ease-out] ${isUser ? 'justify-end' : 'justify-start'}`}
                style={{ animationFillMode: 'both', animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
                {/* AI avatar */}
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0A84FF] to-[#5E5CE6] flex items-center justify-center flex-shrink-0 mb-5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                )}

                <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 ${
                      isUser
                        ? 'bg-[#0A84FF] text-white rounded-br-md'
                        : 'bg-[#1C1C1E] rounded-bl-md'
                    }`}
                  >
                    {isEmptyStreaming ? (
                      <TypingIndicator />
                    ) : isUser ? (
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="text-[15px] leading-relaxed">
                        <FormattedText text={msg.content} />
                        {isStreaming && isLastAssistant && msg.content && (
                          <span className="inline-block w-[3px] h-[18px] bg-[#0A84FF] animate-pulse ml-0.5 align-middle rounded-full" />
                        )}
                      </div>
                    )}
                  </div>
                  {/* Timestamp */}
                  {msg.timestamp && !(isEmptyStreaming) && (
                    <span className={`text-[10px] text-[#636366] mt-1 px-1 ${isUser ? 'self-end' : 'self-start'}`}>
                      {msg.timestamp}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-[#FF453A] text-xs text-center py-1.5 px-3 bg-[#FF453A]/10 rounded-lg mx-4 mb-1">{error}</div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 pt-2 pb-1">
        <div className="flex items-end gap-2 bg-[#1C1C1E] rounded-2xl px-3 py-1.5 border border-[#38383A]/50 focus-within:border-[#0A84FF]/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-[#636366] disabled:opacity-50 max-h-[120px]"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-full bg-[#0A84FF] text-white disabled:opacity-30 hover:bg-[#0A84FF]/90 active:scale-95 transition-all flex-shrink-0 mb-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      <span className="w-2 h-2 rounded-full bg-[#8E8E93] animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
      <span className="w-2 h-2 rounded-full bg-[#8E8E93] animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.2s' }} />
      <span className="w-2 h-2 rounded-full bg-[#8E8E93] animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.2s' }} />
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, i) => {
        let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

        if (!line.trim()) {
          return <br key={i} />;
        }

        if (line.startsWith('### ')) {
          return <p key={i} className="font-bold text-sm mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formatted.slice(4) }} />;
        }
        if (line.startsWith('## ')) {
          return <p key={i} className="font-bold mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formatted.slice(3) }} />;
        }

        if (line.match(/^[-•]\s/)) {
          return <p key={i} className="pl-3 before:content-['•'] before:mr-2 before:text-[#0A84FF]" dangerouslySetInnerHTML={{ __html: formatted.slice(2) }} />;
        }
        if (line.match(/^\d+\.\s/)) {
          const match = line.match(/^(\d+\.)\s(.*)/);
          if (match) {
            return <p key={i} className="pl-3"><span className="text-[#0A84FF] mr-1">{match[1]}</span><span dangerouslySetInnerHTML={{ __html: match[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} /></p>;
          }
        }

        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </>
  );
}
