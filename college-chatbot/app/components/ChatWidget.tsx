'use client';

import { useRef, useEffect, useState } from 'react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{id: string, role: string, content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setShowPopup(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      const isMobile = window.innerWidth < 480;

      if (isMobile) {
        document.body.style.overflow = 'hidden';
        
        if (viewportRef.current && window.visualViewport) {
          viewportRef.current.style.height = `${window.visualViewport.height}px`;
          viewportRef.current.style.position = 'fixed';
          viewportRef.current.style.top = `${window.visualViewport.offsetTop}px`;
          viewportRef.current.style.left = '0';
          viewportRef.current.style.width = '100%';
          viewportRef.current.style.margin = '0';
          viewportRef.current.style.borderRadius = '0';
        }
      } else {
        document.body.style.overflow = 'auto';
        if (viewportRef.current) {
          viewportRef.current.style.height = '';
          viewportRef.current.style.position = '';
          viewportRef.current.style.top = '';
          viewportRef.current.style.left = '';
          viewportRef.current.style.width = '';
          viewportRef.current.style.margin = '';
          viewportRef.current.style.borderRadius = '';
        }
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    window.addEventListener('resize', handleResize);
    
    handleResize();

    return () => {
      document.body.style.overflow = 'auto';
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        setMessages(prev => prev.map(msg => 
          msg.id === botMessageId ? { ...msg, content: msg.content + chunk } : msg
        ));
      }

    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Connection error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  const styles = `
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes dotBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .cw-widget-root {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .cw-window {
      width: 380px;
      height: 600px;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      border: 1px solid rgba(0,0,0,0.05);
      margin-bottom: 0;
    }

    .cw-header {
      background: #ffffff;
      padding: 16px 20px;
      color: #171717;
      position: relative;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      z-index: 10;
      flex-shrink: 0;
    }
    
    .cw-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 2;
    }
    
    .cw-header-title {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      line-height: 1.2;
      letter-spacing: -0.3px;
    }
    
    .cw-header-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #737373;
      margin-top: 4px;
      font-weight: 500;
    }
    
    .cw-status-dot {
      width: 8px;
      height: 8px;
      background-color: #22c55e;
      border-radius: 50%;
    }

    .cw-logo-container {
      width: 42px;
      height: 42px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      overflow: hidden;
      border: 1px solid #f0f0f0;
    }
    .cw-logo-img { width: 100%; height: 100%; object-fit: cover; }

    .cw-close-btn {
      background: #f5f5f5;
      border: none;
      color: #737373;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      width: 32px;
      height: 32px;
    }
    .cw-close-btn:hover { background: #e5e5e5; color: #171717; }

    .cw-messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 16px;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .cw-msg {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 15px;
      line-height: 1.5;
      animation: fadeIn 0.3s ease;
      position: relative;
      word-wrap: break-word;
    }

    .cw-msg-user {
      align-self: flex-end;
      background: #f3f4f6;
      color: #171717;
      border-bottom-right-radius: 4px;
    }

    .cw-msg-bot {
      align-self: flex-start;
      background: #ffffff;
      color: #171717;
      border: 1px solid #f0f0f0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      border-top-left-radius: 4px;
    }

    .cw-typing {
      display: flex;
      gap: 5px;
      padding: 14px 18px;
      background: #ffffff;
      border: 1px solid #f0f0f0;
      border-radius: 20px;
      align-self: flex-start;
      border-top-left-radius: 4px;
    }
    .cw-dot {
      width: 5px;
      height: 5px;
      background: #a3a3a3;
      border-radius: 50%;
      animation: dotBounce 1.4s infinite ease-in-out;
    }
    .cw-dot:nth-child(1) { animation-delay: -0.32s; }
    .cw-dot:nth-child(2) { animation-delay: -0.16s; }

    .cw-input-area {
      padding: 12px 16px;
      background: white;
      border-top: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .cw-input {
      flex: 1;
      border: 1px solid #e5e5e5;
      background: #ffffff;
      padding: 12px 16px;
      border-radius: 24px;
      font-size: 15px;
      outline: none;
      color: #171717;
    }
    .cw-input:focus { border-color: #d4d4d4; }

    .cw-send-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #171717;
      color: white;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .cw-fab {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #171717;
      color: white;
      border: none;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s;
    }
    .cw-fab:hover { transform: scale(1.05); }

    .cw-fab.cw-hidden { display: none; }

    .cw-popup {
      background: white;
      padding: 14px 18px;
      border-radius: 14px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      animation: slideIn 0.4s ease-out;
      border: 1px solid rgba(0,0,0,0.04);
      max-width: 260px;
    }
    .cw-popup-text h4 { margin: 0; font-size: 14px; color: #171717; font-weight: 600; }
    .cw-popup-text p { margin: 2px 0 0; font-size: 12px; color: #737373; }

    @media (max-width: 480px) {
      .cw-widget-root { 
        bottom: 0; 
        right: 0; 
        left: 0; 
        z-index: 999999;
        align-items: stretch; 
      }
      
      .cw-fab { 
        position: fixed; 
        bottom: 20px; 
        right: 20px; 
      }
      
      .cw-popup { 
        margin-bottom: 90px; 
        margin-right: 20px; 
        align-self: flex-end; 
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="cw-widget-root">

        {showPopup && !isOpen && (
          <div className="cw-popup" onClick={() => setIsOpen(true)}>
            <div className="cw-logo-container" style={{ width: '36px', height: '36px', marginRight: '0', border: 'none', boxShadow: 'none' }}>
               <img src="/gtbitlogo.jpeg" alt="Logo" className="cw-logo-img" />
            </div>
            <div className="cw-popup-text">
              <h4>Questions?</h4>
              <p>Ask about admissions.</p>
            </div>
            <button 
              className="cw-close-btn" 
              style={{ background: 'none', width: 'auto', height: 'auto', color: '#a3a3a3' }}
              onClick={(e) => { e.stopPropagation(); setShowPopup(false); }}
            >✕</button>
          </div>
        )}

        {isOpen && (
          <div className="cw-window" ref={viewportRef}>
            
            <div className="cw-header">
              <div className="cw-header-top">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="cw-logo-container">
                    <img src="/gtbitlogo.jpeg" alt="GTBIT" className="cw-logo-img" />
                  </div>
                  <div>
                    <h2 className="cw-header-title">AI Chat Support</h2>
                    <div className="cw-header-status">
                      <span className="cw-status-dot"></span>
                      <span>Active</span>
                    </div>
                  </div>
                </div>
                <button className="cw-close-btn" onClick={() => setIsOpen(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div className="cw-messages">
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: '50%', opacity: 0.5 }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>👋</div>
                  <p style={{ fontSize: '15px', color: '#171717', fontWeight: 600 }}>Welcome to GTBIT</p>
                  <p style={{ fontSize: '13px', color: '#737373', marginTop: '4px' }}>How can we help you today?</p>
                </div>
              )}
              
              {messages.map((m) => (
                <div key={m.id} className={`cw-msg ${m.role === 'user' ? 'cw-msg-user' : 'cw-msg-bot'}`}>
                  {m.content}
                </div>
              ))}
              
              {isLoading && (
                <div className="cw-typing">
                  <div className="cw-dot"></div>
                  <div className="cw-dot"></div>
                  <div className="cw-dot"></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="cw-input-area">
              <input
                className="cw-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                autoFocus={false} 
              />
              <button 
                className="cw-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>

          </div>
        )}

        <button 
          className={`cw-fab ${isOpen ? 'cw-hidden' : ''}`} 
          onClick={() => { setIsOpen(!isOpen); setShowPopup(false); }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>

      </div>
    </>
  );
}