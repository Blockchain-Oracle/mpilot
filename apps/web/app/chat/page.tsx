'use client';

import { useChat } from '@ai-sdk/react';
import { usePrivy } from '@privy-io/react-auth';
import { DefaultChatTransport, getToolName, isToolUIPart } from 'ai';
import { useMemo, useRef, useState } from 'react';
import { ToolCard } from './_cards/ToolCard';
import './chat.css';

const EXAMPLES = [
  "What's my MNT balance?",
  'Send 5 USDC to 0x0000000000000000000000000000000000000001',
  'Quote 1 MNT to USDC',
  'Wrap 0.1 MNT into WMNT',
];

export default function ChatPage() {
  const { ready, authenticated, login, getAccessToken } = usePrivy();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
          const token = await getAccessToken();
          const headers = new Headers(init?.headers);
          if (token) headers.set('Authorization', `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        }) as typeof fetch,
      }),
    [getAccessToken],
  );

  const { messages, sendMessage, status } = useChat({ transport });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || status === 'streaming' || status === 'submitted') return;
    setInput('');
    void sendMessage({ text: t });
  };

  if (!ready) {
    return (
      <div className="chat">
        <div className="empty">
          <div className="typing">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="chat">
        <div className="empty">
          <h1 className="ds-h-sec">Talk to mPilot</h1>
          <p className="ds-lede">
            Connect your wallet to chat. You sign every transaction yourself.
          </p>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => login()}>
            Connect wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat">
      <header className="chat-head">
        <span className="title">mPilot</span>
        <span className="badge">
          <span className="dot" style={{ background: 'var(--signal)' }} />
          you hold the keys
        </span>
      </header>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty">
            <h2 className="ds-h-card">What do you want to do on Mantle?</h2>
            <div className="chips">
              {EXAMPLES.map((ex) => (
                <button key={ex} type="button" className="chip" onClick={() => submit(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            {m.parts.map((part, i) => {
              if (part.type === 'text') {
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: message parts are append-only during streaming; index is stable
                  <div key={`${m.id}-t${i}`} className="bubble">
                    {part.text}
                  </div>
                );
              }
              if (isToolUIPart(part)) {
                return (
                  <ToolCard
                    // biome-ignore lint/suspicious/noArrayIndexKey: message parts are append-only during streaming; index is stable
                    key={`${m.id}-tool${i}`}
                    part={{
                      toolName: getToolName(part),
                      state: part.state,
                      output: part.output,
                      errorText: part.errorText,
                    }}
                  />
                );
              }
              return null;
            })}
          </div>
        ))}

        {status === 'streaming' && (
          <div className="msg assistant">
            <div className="typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <textarea
          value={input}
          placeholder="Ask anything — balances, transfers, swaps…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={1}
        />
        <button
          type="submit"
          className="btn btn-primary btn-md"
          disabled={!input.trim() || status === 'streaming'}
        >
          Send
        </button>
      </form>
    </div>
  );
}
