
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useSales } from '../context/SalesContext';
import { useInventory } from '../context/InventoryContext';
import { useAccounting } from '../context/AccountingContext';
import { useContacts } from '../context/ContactContext';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { SalesStatus, ContactType } from '../types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const AIAssistantPage: React.FC = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { sales } = useSales();
  const { products, getTotalStock } = useInventory();
  const { getPLStatement, expenses, accounts } = useAccounting();
  const { contacts, getContactBalance } = useContacts();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello ${user?.name}, I am your Nexus Intelligence Assistant. How can I audit your data today?`,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, interimTranscript]);

  const systemContextString = useMemo(() => {
    const pl = getPLStatement();
    const activeProducts = products.map(p => ({
      name: p.name, stock: getTotalStock(p.id), price: p.salesPrice
    }));
    return `COMPANY: ${activeCompany?.name}, INCOME: ${pl.netIncome}, SALES: ${sales.length}`;
  }, [activeCompany, sales, products, getPLStatement, getTotalStock]);

  const handleSend = async (textOverride?: string) => {
    const query = textOverride || input;
    if (!query.trim() || isThinking) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || "" });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: query,
        config: {
          systemInstruction: `You are NexusAI for ${activeCompany?.name}. Audit-focused analyst. INR context. CONTEXT: ${systemContextString}`,
          temperature: 0.7,
        }
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.text || "Audit failed.",
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection issue.", timestamp: new Date().toLocaleTimeString() }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)] space-y-4 md:space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 shrink-0 px-1">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">Intelligence Center</h1>
          <p className="text-[10px] md:text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest">Live Data Auditor</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl md:rounded-[40px] border border-slate-200 shadow-xl overflow-hidden flex flex-col relative">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-8 scroll-smooth">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] md:max-w-[80%] p-4 md:p-6 rounded-2xl md:rounded-[32px] shadow-sm ${
                msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
              }`}>
                <p className="text-[11px] md:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[7px] md:text-[8px] font-black uppercase mt-2 opacity-50">{msg.timestamp}</p>
              </div>
            </div>
          ))}
          {isThinking && <div className="text-[10px] text-slate-400 font-black animate-pulse uppercase px-4">Analyzing Records...</div>}
        </div>

        <div className="p-3 md:p-8 bg-slate-50 border-t border-slate-100 shrink-0">
           <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-4">
              <div className="flex-1 relative">
                 <input 
                   type="text" 
                   value={input}
                   onChange={e => setInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSend()}
                   placeholder="Ask anything..."
                   className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none text-xs md:text-sm"
                 />
                 <button 
                   onClick={() => handleSend()}
                   disabled={!input.trim() || isThinking}
                   className="absolute right-1.5 top-1.5 p-2 bg-indigo-600 text-white rounded-xl shadow-md disabled:opacity-50"
                 >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;
