'use client';

import { useRef, useEffect, useState } from 'react';

interface Message {
  id: string;
  role: string;
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      if (!response.ok) throw new Error("Network response failed");

      const botMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMessageId, role: 'assistant', content: '' }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      let botText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        botText += chunk;
        
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId ? { ...msg, content: botText } : msg
        ));
      }

    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "System Error: Unable to process request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, fontFamily: 'sans-serif' }}>

      {isOpen && (
        <div style={{
          width: '350px',
          height: '500px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '16px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ backgroundColor: '#2563eb', color: 'white', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>College Assistant</h3>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}
            >
              &times;
            </button>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', marginTop: '40%' }}>
                <p>System Ready. How can I assist you?</p>
              </div>
            )}
            
            {messages.map(m => (
              <div key={m.id} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: m.role === 'user' ? '#2563eb' : 'white',
                color: m.role === 'user' ? 'white' : '#1f2937',
                padding: '10px 14px',
                borderRadius: '10px',
                maxWidth: '80%',
                fontSize: '14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                border: m.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                wordWrap: 'break-word'
              }}>
                {m.content}
              </div>
            ))}
            
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', color: '#6b7280', fontSize: '12px', fontStyle: 'italic' }}>
                Processing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', backgroundColor: 'white' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your query..."
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                outline: 'none',
                fontSize: '14px',
                color: 'black'
              }}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                opacity: (isLoading || !input.trim()) ? 0.5 : 1
              }}
            >
              &rarr;
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: isOpen ? '#4b5563' : '#2563eb',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          transition: 'all 0.3s ease'
        }}
      >
        {isOpen ? '\u2715' : '\u2026'}
      </button>

    </div>
  );
}