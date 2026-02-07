
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { useSales } from '../../context/SalesContext';
import { useInventory } from '../../context/InventoryContext';
import { useAccounting } from '../../context/AccountingContext';
import { usePayroll } from '../../context/PayrollContext';
import { useContacts } from '../../context/ContactContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const location = useLocation();
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { sales } = useSales();
  const { products, getTotalStock } = useInventory();
  const { getPLStatement } = useAccounting();
  const { employees, payrollHistory } = usePayroll();
  const { contacts, getContactBalance } = useContacts();

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking, interimTranscript]);

  // Context Awareness - Dynamic data gathering based on active route
  const currentContext = useMemo(() => {
    const path = location.pathname;
    let dataSummary = "";

    if (path.includes('/sales')) {
      dataSummary = `Current Module: Sales. Confirmed Orders: ${sales.length}. Active Revenue: ${sales.reduce((s, x) => s + x.grandTotal, 0)}.`;
    } else if (path.includes('/inventory')) {
      dataSummary = `Current Module: Inventory. Total SKUs: ${products.length}. Value: ${products.reduce((s, p) => s + (getTotalStock(p.id) * p.cost), 0)}.`;
    } else if (path.includes('/payroll')) {
      dataSummary = `Current Module: Payroll. Active Staff: ${employees.length}. Latest History Count: ${payrollHistory.length}.`;
    } else if (path.includes('/accounting')) {
      const pl = getPLStatement();
      dataSummary = `Current Module: Accounting. Net Income: ₹${pl.netIncome}. Cash Position: ₹${pl.grossSales - pl.costOfGoods}.`;
    } else if (path === '/') {
      dataSummary = `Current Module: Dashboard. High-level Overview of all entities.`;
    }

    return {
      module: path.split('/')[1] || 'Dashboard',
      userRole: user?.role,
      company: activeCompany?.name,
      summary: dataSummary
    };
  }, [location.pathname, user, activeCompany, sales, products, employees, payrollHistory, getPLStatement, getTotalStock]);

  const suggestions = useMemo(() => {
    const base = ["How is the business performing?", "Show me high-priority tasks."];
    if (location.pathname.includes('sales')) return ["Total sales this month?", "Who are the top customers?", "Unpaid invoice count?"];
    if (location.pathname.includes('inventory')) return ["Which items are out of stock?", "Total warehouse valuation?", "Show low stock alerts."];
    if (location.pathname.includes('payroll')) return ["Who was late today?", "Total salary budget?", "Any attendance issues?"];
    return base;
  }, [location.pathname]);

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text.trim() || isThinking) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsThinking(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: {
          systemInstruction: `
            You are NexusAI, a business intelligence auditor for ${currentContext.company}.
            USER ROLE: ${currentContext.userRole}
            PAGE CONTEXT: ${currentContext.summary}
            
            GUIDELINES:
            1. Use provided context to answer questions about the active screen.
            2. Be concise, professional, and read-only.
            3. You cannot modify data.
            4. Use currency ₹ (INR).
            5. If asked about data outside current snapshot, advise the user to navigate to the relevant module.
          `,
          temperature: 0.7,
        }
      });

      const aiText = response.text || "I'm sorry, I couldn't audit that record.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
      
      if (isVoiceEnabled) {
        const utterance = new SpeechSynthesisUtterance(aiText);
        utterance.lang = 'en-IN';
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connectivity issue with the intelligence engine." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("STT not supported.");

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      // Use final transcript to update the main input to avoid duplication
      if (finalTranscript) {
        setInput(finalTranscript);
      }
      setInterimTranscript(interimTranscript);
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
      {isOpen && (
        <div className="w-96 h-[500px] max-w-[calc(100vw-48px)] bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col mb-4 pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">NI</div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest">Nexus Intelligence</p>
                <p className="text-[8px] font-bold text-indigo-400 uppercase">Context: {currentContext.module}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className={`p-1.5 rounded-lg transition-colors ${isVoiceEnabled ? 'bg-indigo-600' : 'bg-slate-800'}`}
                title="Toggle Voice Response"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Suggested Audit Queries</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => handleSend(s)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-indigo-600 hover:border-indigo-600 transition-all shadow-sm mx-auto w-fit max-w-[90%]">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                  m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            {interimTranscript && <p className="text-[9px] text-indigo-500 font-bold italic mb-2 px-2 uppercase truncate">Dictating: {interimTranscript}</p>}
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleListening}
                className={`p-3 rounded-2xl transition-all ${isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:text-indigo-600'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </button>
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask NexusAI..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isThinking}
                className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all pointer-events-auto border-4 border-indigo-600 group"
      >
        <div className="absolute inset-0 rounded-full bg-indigo-600 animate-ping opacity-20 scale-75 group-hover:scale-100 transition-transform" />
        <svg className={`w-7 h-7 transition-transform duration-500 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          )}
        </svg>
      </button>
    </div>
  );
};

export default AIAssistantWidget;
