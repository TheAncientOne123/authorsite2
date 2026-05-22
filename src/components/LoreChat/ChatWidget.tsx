import React, {useCallback, useEffect, useRef, useState} from 'react';
import Link from '@docusaurus/Link';
import {createChatAbortSignal, postChatMessage, useChatApiUrl} from './chatApi';
import type {ChatMessage} from './types';
import styles from './LoreChatSection.module.css';

const SUGGESTIONS = [
  '¿Quién es Anya Rudzki?',
  '¿Qué pasó en la Catedral de Santa Regina?',
  '¿De qué trata Necromancia a Medianoche?',
];

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function TypingIndicator() {
  return (
    <span className={styles.typing} aria-label="Escribiendo respuesta">
      <span className={styles.typingDot} />
      <span className={styles.typingDot} />
      <span className={styles.typingDot} />
    </span>
  );
}

type MessageBubbleProps = {
  message: ChatMessage;
  isError?: boolean;
};

function MessageBubble({message, isError}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}>
      <div
        className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant} ${
          isError ? styles.bubbleError : ''
        }`}>
        {message.content}
      </div>
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className={styles.sources}>
          {message.sources.map((source) => (
            <Link key={source.permalink} className={styles.sourceLink} to={source.permalink}>
              {source.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatWidget() {
  const chatApiUrl = useChatApiUrl();
  const apiConfigured = Boolean(chatApiUrl);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || loading) return;

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        content: text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setLoading(true);

      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const {signal, cancel} = createChatAbortSignal();

      try {
        const response = await postChatMessage(
          chatApiUrl,
          {message: text, history: history.slice(0, -1)},
          signal,
        );

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: 'assistant',
            content: response.reply,
            sources: response.sources,
          },
        ]);
      } catch (err) {
        const errorText =
          err && typeof err === 'object' && 'error' in err && typeof err.error === 'string'
            ? err.error
            : 'Ocurrió un error inesperado.';

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: 'assistant',
            content: errorText,
          },
        ]);
      } finally {
        cancel();
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [chatApiUrl, loading, messages],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
  };

  return (
    <div className={styles.panel}>
      {!apiConfigured && (
        <p className={styles.configNotice} role="status">
          El chat está listo en la interfaz, pero falta conectar la API. Configura{' '}
          <code>CHAT_API_URL</code> (GitHub Actions variable o <code>.env</code> local) con la URL
          de Vercel de este repo, p. ej. <code>/api/chat</code>.
        </p>
      )}

      <div className={styles.messages} aria-live="polite">
        {messages.length === 0 && !loading && (
          <p className={styles.emptyState}>
            Pregunta sobre personajes, lugares, eventos o libros de Crónicas de Sangre y Sombra.
          </p>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {loading && (
          <div className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
            <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 0 && (
        <div className={styles.suggestions}>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={styles.suggestionChip}
              disabled={loading || !apiConfigured}
              onClick={() => void sendMessage(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form className={styles.composer} onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          rows={1}
          value={input}
          placeholder="Escribe tu pregunta sobre el universo…"
          disabled={loading || !apiConfigured}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          aria-label="Mensaje para el chat de lore"
        />
        <button
          type="submit"
          className={`button button--primary ${styles.sendButton}`}
          disabled={loading || !input.trim() || !apiConfigured}>
          {loading ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
