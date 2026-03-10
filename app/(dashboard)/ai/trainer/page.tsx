'use client';

import { useEffect, useRef, useState } from 'react';
import { loadChatHistory, loadChatSessions, clearChat } from './actions';
import Link from 'next/link';

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
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

  // Initialize session
  useEffect(() => {
    const id = generateSessionId();
    setSessionId(id);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    setError('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      });

      if (!res.ok) {
        throw new Error(`Ошибка: ${res.status}`);
      }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      // Remove empty assistant message on error
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
  };

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
    })));
    setSessionId(sid);
    setShowSessions(false);
  };

  const deleteSession = async (sid: string) => {
    await clearChat(sid);
    setSessions(prev => prev.filter(s => s.sessionId !== sid));
    if (sid === sessionId) {
      startNewChat();
    }
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
    <div className="flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100dvh-1rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/ai"
            className="text-secondary hover:text-primary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold">DENCO Тренер</h1>
            <p className="text-xs text-secondary">Персональный AI-тренер</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openSessions}
            className="p-2 rounded-lg bg-card hover:bg-card-hover transition-colors"
            title="История чатов"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
          </button>
          <button
            onClick={startNewChat}
            className="p-2 rounded-lg bg-card hover:bg-card-hover transition-colors"
            title="Новый чат"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sessions panel */}
      {showSessions && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-start justify-center pt-16 px-4" onClick={() => setShowSessions(false)}>
          <div className="bg-card rounded-2xl p-4 w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">История чатов</h2>
              <button onClick={() => setShowSessions(false)} className="text-secondary hover:text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-secondary text-sm py-4 text-center">Нет сохранённых чатов</p>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.sessionId} className="flex items-center gap-2 p-3 rounded-xl bg-background hover:bg-card-hover transition-colors">
                    <button
                      onClick={() => loadSession(s.sessionId)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium truncate">{s.firstMessage}</p>
                      <p className="text-xs text-secondary">
                        {formatDate(s.createdAt)} · {s.messageCount} сообщ.
                      </p>
                    </button>
                    <button
                      onClick={() => deleteSession(s.sessionId)}
                      className="p-1.5 rounded-lg text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
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
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-accent">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2">DENCO Тренер</h2>
            <p className="text-secondary text-sm mb-6 max-w-xs">
              Персональный AI-тренер с доступом к твоим данным. Спроси о тренировках, питании или восстановлении.
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
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="text-left text-sm p-3 rounded-xl bg-card hover:bg-card-hover transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-accent text-white rounded-br-md'
                  : 'bg-card rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="text-sm whitespace-pre-wrap prose-sm">
                  <FormattedText text={msg.content} />
                  {isStreaming && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-accent/70 animate-pulse ml-0.5 align-middle" />
                  )}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="text-danger text-sm text-center py-1 px-3">{error}</div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 pt-2 border-t border-border">
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Напиши сообщение..."
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none bg-card rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-secondary disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
          className="p-3 rounded-xl bg-accent text-white disabled:opacity-50 hover:bg-accent/90 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  // Simple markdown-like formatting
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, i) => {
        // Bold
        let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Inline code
        formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-background px-1 py-0.5 rounded text-xs">$1</code>');

        if (!line.trim()) {
          return <br key={i} />;
        }

        // Headers
        if (line.startsWith('### ')) {
          return <p key={i} className="font-bold text-sm mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formatted.slice(4) }} />;
        }
        if (line.startsWith('## ')) {
          return <p key={i} className="font-bold mt-2 mb-1" dangerouslySetInnerHTML={{ __html: formatted.slice(3) }} />;
        }

        // List items
        if (line.match(/^[-•]\s/)) {
          return <p key={i} className="pl-3 before:content-['•'] before:mr-2 before:text-accent" dangerouslySetInnerHTML={{ __html: formatted.slice(2) }} />;
        }
        if (line.match(/^\d+\.\s/)) {
          const match = line.match(/^(\d+\.)\s(.*)/);
          if (match) {
            return <p key={i} className="pl-3"><span className="text-accent mr-1">{match[1]}</span><span dangerouslySetInnerHTML={{ __html: match[2].replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} /></p>;
          }
        }

        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </>
  );
}
