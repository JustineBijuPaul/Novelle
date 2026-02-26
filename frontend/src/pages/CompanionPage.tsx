import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, AlertTriangle, Bot, User, Heart, Lightbulb } from 'lucide-react';
import { companionService } from '../services/endpoints';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sentiment?: string;
  crisis_flag?: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "I'm feeling anxious about my pregnancy",
  "What should I eat in my trimester?",
  "How can I sleep better?",
  "My baby isn't moving as much",
  "I feel overwhelmed and sad",
  "Can you suggest relaxation techniques?",
];

export default function CompanionPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi there! 💕 I'm Novelle, your pregnancy companion. I'm here to listen, support, and share helpful information with you. How are you feeling today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const res = await companionService.chat({
        message: msg,
        context: {
          recent_messages: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
        },
      });

      const data = res.data;
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        sentiment: data.sentiment,
        crisis_flag: data.crisis_flag,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment. If you're in crisis, please call emergency services or a helpline immediately.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] animate-fade-in">
      <div className="disclaimer-banner mb-4">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>This AI companion provides emotional support, not medical advice. In emergencies, contact your healthcare provider.</span>
      </div>

      {/* Chat Header */}
      <div className="bg-gradient-to-r from-primary-500 to-lavender-500 rounded-t-2xl px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold">Novelle Companion</h2>
            <p className="text-xs text-primary-100">Empathetic AI support — always here for you</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-6 space-y-4 rounded-b-0">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-primary-100' : 'bg-lavender-100'
                }`}>
                  {msg.role === 'user' 
                    ? <User className="w-4 h-4 text-primary-500" />
                    : <Bot className="w-4 h-4 text-lavender-500" />
                  }
                </div>
                <div>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white rounded-tr-sm'
                      : 'bg-white text-gray-700 shadow-sm rounded-tl-sm border'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.crisis_flag && msg.crisis_flag !== 'SAFE' && (
                    <div className="mt-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Crisis support resources available — please reach out to a professional
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1 px-2">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border rounded-tl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="bg-gray-50 px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> Try asking:
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map(p => (
              <button key={p} onClick={() => sendMessage(p)}
                className="text-xs px-3 py-1.5 bg-white border rounded-full text-gray-600 hover:bg-primary-50 hover:border-primary-300 transition-all">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t px-4 py-3 rounded-b-2xl">
        <div className="flex items-center gap-3">
          <input ref={inputRef} type="text" className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 transition-all">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
