'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/services/api/apiClient';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! 👋 I am the KSubZone AI Assistant. Ask me for K-Drama recommendations or anything else!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await apiClient.post('/api/ai/chat', {
        message: userMsg,
        history: messages
      });
      
      if (res.data && res.data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: res.data.reply }]);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Oops! I am having trouble connecting to my brain. Please check if the GEMINI_API_KEY is configured in the backend.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full bg-brand-primary text-white shadow-lg shadow-brand-primary/30 transition-transform hover:scale-110 flex items-center justify-center ${isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[350px] h-[500px] max-h-[80vh] flex flex-col bg-luxury-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-luxury-950/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">KSubZone AI</h3>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-luxury-950/30">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-brand-primary" />
                    </div>
                  )}
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-brand-primary text-white rounded-tr-sm' 
                        : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-sm'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-brand-primary" />
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center">
                    <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-luxury-950/50">
              <div className="flex items-center gap-2 bg-luxury-900 border border-white/10 rounded-xl p-1 pr-2 focus-within:border-brand-primary/50 transition">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for recommendations..."
                  className="flex-1 bg-transparent border-none px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-primary hover:text-white transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
