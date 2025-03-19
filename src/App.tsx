import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Bot, Send, User, Loader2, Sparkles, Plus, MessageSquare, Trash2, Menu, Volume2, VolumeX, ChevronDown, Globe2, Mic, MicOff, Atom } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { twMerge } from 'tailwind-merge';
import { PLAYAI_AGENT_ID } from './lib/playai';
import { SpeechRecognitionService } from './lib/speech';

const genAI = new GoogleGenerativeAI('AIzaSyCuynAsF9les34Mj5Pqg0sD3yR9dlOjkCQ');
const speechService = new SpeechRecognitionService();

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface Voice {
  name: string;
  displayName: string;
  voice: SpeechSynthesisVoice;
  language: string;
}

const indianVoiceNames: Record<string, string> = {
  'hi-IN': 'Bhagwati',
  'hi-IN-2': 'AI',
  'hi-IN-3': 'AI',
  'hi-IN-4': 'AI',
  'en-IN': 'AI',
  'en-IN-2': 'AI',
};

function App() {
  const [chats, setChats] = useState<Chat[]>(() => {
    const savedChats = localStorage.getItem('chats');
    return savedChats ? JSON.parse(savedChats) : [];
  });
  const [currentChatId, setCurrentChatId] = useState<string>(() => {
    return chats.length > 0 ? chats[0].id : '';
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceDropdownRef = useRef<HTMLDivElement>(null);
  const synth = window.speechSynthesis;

  const currentChat = chats.find(chat => chat.id === currentChatId);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = synth.getVoices()
        .filter(voice => voice.lang.startsWith('hi-') || voice.lang.startsWith('en-'))
        .map(voice => {
          const isIndianVoice = voice.lang.startsWith('hi-') || voice.lang.startsWith('en-IN');
          const voiceKey = `${voice.lang}${isIndianVoice ? voice.name.includes('2') ? '-2' : 
                          voice.name.includes('3') ? '-3' : voice.name.includes('4') ? '-4' : '' : ''}`;
          
          return {
            name: voice.name,
            displayName: isIndianVoice ? indianVoiceNames[voiceKey] || voice.name : voice.name,
            voice: voice,
            language: voice.lang.startsWith('hi-') ? 'Hindi' : 'English'
          };
        })
        .sort((a, b) => {
          const aIsIndian = a.voice.lang.startsWith('hi-') || a.voice.lang.startsWith('en-IN');
          const bIsIndian = b.voice.lang.startsWith('hi-') || b.voice.lang.startsWith('en-IN');
          if (aIsIndian && !bIsIndian) return -1;
          if (!aIsIndian && bIsIndian) return 1;
          return a.displayName.localeCompare(b.displayName);
        });

      setVoices(availableVoices);
      
      if (availableVoices.length > 0 && !selectedVoice) {
        const defaultVoice = availableVoices.find(v => v.voice.lang.startsWith('hi-')) || 
                           availableVoices.find(v => v.voice.lang.startsWith('en-IN')) ||
                           availableVoices[0];
        setSelectedVoice(defaultVoice);
      }
    };

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target as Node)) {
        setIsVoiceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(chats[1]?.id || '');
    }
  };

  const speakText = (text: string) => {
    if (!isVoiceEnabled || !selectedVoice) return;
    
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice.voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synth.speak(utterance);
  };

  const toggleSpeechRecognition = () => {
    if (!speechService.isSupported()) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      speechService.stop();
      setIsListening(false);
      if (interimTranscript.trim()) {
        setInput(prev => prev + ' ' + interimTranscript);
      }
      setInterimTranscript('');
    } else {
      speechService.start(
        (text, isFinal) => {
          if (isFinal) {
            setInput(prev => prev + ' ' + text);
            setInterimTranscript('');
          } else {
            setInterimTranscript(text);
          }
        },
        (error) => {
          console.error('Speech recognition error:', error);
          setIsListening(false);
        }
      );
      setIsListening(true);
    }
  };

  const openPlayAI = () => {
    if (window.PlayAI) {
      window.PlayAI.open(PLAYAI_AGENT_ID);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    synth.cancel();
    setIsSpeaking(false);

    if (!currentChatId) {
      createNewChat();
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      id: Date.now().toString()
    };

    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        const updatedMessages = [...chat.messages, userMessage];
        return {
          ...chat,
          messages: updatedMessages,
          title: chat.messages.length === 0 ? input.slice(0, 30) + (input.length > 30 ? '...' : '') : chat.title
        };
      }
      return chat;
    }));

    setInput('');
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const chat = model.startChat({
        history: currentChat?.messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: msg.content,
        })) || []
      });
      
      const result = await chat.sendMessage(input);
      const response = await result.response;
      const text = response.text();

      setChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, {
              role: 'assistant',
              content: text,
              id: Date.now().toString()
            }]
          };
        }
        return chat;
      }));

      speakText(text);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = 'I apologize, but I encountered an error. Please try again.';
      setChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, {
              role: 'assistant',
              content: errorMessage,
              id: Date.now().toString()
            }]
          };
        }
        return chat;
      }));
      speakText(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const WaveAnimation = () => (
    <div className="wave">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="wave-bar" style={{
          animationDelay: `${i * 0.1}s`,
          height: `${Math.sin((i / 12) * Math.PI) * 100}%`
        }} />
      ))}
    </div>
  );

  return (
    <div className="h-screen flex bg-gradient-to-br from-[#0A0F1C] via-[#121A2D] to-[#0A0F1C]">
      <div className={twMerge(
        "fixed inset-y-0 left-0 w-80 glass-effect transform transition-transform duration-300 z-20",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4">
            <button
              onClick={createNewChat}
              className="sidebar-button group"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
              <span>New Chat</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
            {chats.map(chat => (
              <div key={chat.id} className="relative group">
                <button
                  onClick={() => setCurrentChatId(chat.id)}
                  className={twMerge(
                    "chat-item",
                    currentChatId === chat.id && "active"
                  )}
                >
                  <MessageSquare className="w-5 h-5 text-blue-400/70" />
                  <span className="flex-1 truncate text-left">{chat.title}</span>
                </button>
                <button
                  onClick={() => deleteChat(chat.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                           p-2 rounded-lg hover:bg-red-500/20 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={twMerge(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarOpen && "ml-80"
      )}>
        <header className="glass-effect border-b border-white/[0.05] relative z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/5 transition-all duration-200
                         hover:shadow-[0_4px_12px_-1px_rgba(59,130,246,0.2)]"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20
                            shadow-[0_4px_12px_-1px_rgba(59,130,246,0.3)]">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold header-gradient bg-clip-text text-transparent
                           drop-shadow-[0_2px_4px_rgba(59,130,246,0.4)]">
                Mentii
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative" ref={voiceDropdownRef}>
                <button
                  onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                  className={twMerge(
                    "flex items-center space-x-3 px-4 py-2 rounded-xl",
                    "bg-gradient-to-r from-blue-500/10 to-purple-500/10",
                    "hover:from-blue-500/20 hover:to-purple-500/20",
                    "border border-white/10 hover:border-white/20",
                    "transition-all duration-300",
                    "shadow-[0_4px_12px_-1px_rgba(59,130,246,0.2)]",
                    "hover:shadow-[0_4px_16px_-1px_rgba(59,130,246,0.3)]",
                    !isVoiceEnabled && "opacity-50"
                  )}
                  disabled={!isVoiceEnabled}
                >
                  <Globe2 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium truncate max-w-[150px]">
                    {selectedVoice?.displayName || "Select Voice"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-blue-400" />
                </button>
                {isVoiceDropdownOpen && isVoiceEnabled && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl glass-effect border border-white/10 
                                shadow-lg z-50 backdrop-blur-xl overflow-hidden">
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      <div className="p-2 sticky top-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                                  backdrop-blur-xl border-b border-white/10">
                        <h3 className="text-sm font-medium text-blue-400">Indian Voices</h3>
                      </div>
                      {voices
                        .filter(v => v.voice.lang.startsWith('hi-') || v.voice.lang.startsWith('en-IN'))
                        .map((voice, index) => (
                          <button
                            key={index}
                            className={twMerge(
                              "w-full px-4 py-3 text-sm text-left hover:bg-white/5 transition-all duration-200",
                              "flex items-center justify-between space-x-2",
                              selectedVoice?.name === voice.name && "bg-blue-500/10 text-blue-400"
                            )}
                            onClick={() => {
                              setSelectedVoice(voice);
                              setIsVoiceDropdownOpen(false);
                            }}
                          >
                            <div>
                              <div className="font-medium">{voice.displayName}</div>
                              <div className="text-xs text-gray-400">{voice.language}</div>
                            </div>
                            {selectedVoice?.name === voice.name && (
                              <div className="w-2 h-2 rounded-full bg-blue-400" />
                            )}
                          </button>
                        ))}
                      <div className="p-2 sticky top-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                                  backdrop-blur-xl border-b border-white/10">
                        <h3 className="text-sm font-medium text-blue-400">Other Voices</h3>
                      </div>
                      {voices
                        .filter(v => !v.voice.lang.startsWith('hi-') && !v.voice.lang.startsWith('en-IN'))
                        .map((voice, index) => (
                          <button
                            key={index}
                            className={twMerge(
                              "w-full px-4 py-3 text-sm text-left hover:bg-white/5 transition-all duration-200",
                              "flex items-center justify-between space-x-2",
                              selectedVoice?.name === voice.name && "bg-blue-500/10 text-blue-400"
                            )}
                            onClick={() => {
                              setSelectedVoice(voice);
                              setIsVoiceDropdownOpen(false);
                            }}
                          >
                            <div>
                              <div className="font-medium">{voice.displayName}</div>
                              <div className="text-xs text-gray-400">{voice.language}</div>
                            </div>
                            {selectedVoice?.name === voice.name && (
                              <div className="w-2 h-2 rounded-full bg-blue-400" />
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setIsVoiceEnabled(!isVoiceEnabled);
                  synth.cancel();
                  setIsSpeaking(false);
                }}
                className="voice-toggle"
                data-state={isVoiceEnabled ? "checked" : "unchecked"}
              >
                <span className="voice-toggle-thumb" data-state={isVoiceEnabled ? "checked" : "unchecked"}>
                  {isVoiceEnabled ? (
                    <Volume2 className="w-3 h-3 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  ) : (
                    <VolumeX className="w-3 h-3 text-gray-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </span>
              </button>

              <button
                onClick={toggleSpeechRecognition}
                className="voice-toggle"
                data-state={isListening ? "checked" : "unchecked"}
              >
                <span className="voice-toggle-thumb" data-state={isListening ? "checked" : "unchecked"}>
                  {isListening ? (
                    <Mic className="w-3 h-3 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  ) : (
                    <MicOff className="w-3 h-3 text-gray-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </span>
              </button>

              <button
                onClick={openPlayAI}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20
                         hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300
                         border border-white/10 hover:border-white/20 flex items-center space-x-2"
              >
                <Atom className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">Mirror </span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative z-10">
          <div className="h-full flex flex-col p-6">
            <div className="flex-1 rounded-2xl glass-effect futuristic-gradient p-6 mb-6 overflow-y-auto custom-scrollbar">
              {!currentChat || currentChat.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20
                                shadow-[0_4px_12px_-1px_rgba(59,130,246,0.3)] mb-6">
                    <Bot className="w-16 h-16 text-blue-400" />
                  </div>
                  <p className="text-2xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    How can I assist you today?
                  </p>
                  <p className="text-sm mt-2 text-gray-500">Ask me anything, I'm here to help!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentChat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-3 message-transition ${
                        message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse space-x-reverse'
                      }`}
                    >
                      <div className={`flex-shrink-0 p-2 rounded-full message-icon ${
                        message.role === 'assistant' 
                          ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20' 
                          : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                      }`}>
                        {message.role === 'assistant' ? (
                          <Bot className="w-5 h-5 text-blue-400" />
                        ) : (
                          <User className="w-5 h-5 text-purple-400" />
                        )}
                      </div>
                      <div className={`flex-1 message-bubble ${
                        message.role === 'assistant' ? 'assistant-message' : 'user-message'
                      }`}>
                        {message.role === 'assistant' && isVoiceEnabled ? (
                          <div className="flex items-center justify-center min-h-[40px]">
                            {isSpeaking && <WaveAnimation />}
                            {!isSpeaking && (
                              <button
                                onClick={() => speakText(message.content)}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <Volume2 className="w-6 h-6" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="prose prose-invert max-w-none">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isLoading && (
                <div className="flex items-center space-x-3 mt-6">
                  <div className="p-2 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 message-icon">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                  <div className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-gray-400 loading-gradient">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Type your message...'}
                className="w-full px-6 py-4 rounded-2xl glass-effect border border-white/[0.05] 
                         text-white placeholder-gray-400 focus:outline-none input-glow
                         transition-all duration-300"
              />
              {interimTranscript && (
                <div className="absolute left-6 bottom-full mb-2 px-4 py-2 rounded-xl bg-white/[0.05] 
                            border border-white/[0.05] text-gray-400 text-sm">
                  {interimTranscript}
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl 
                       bg-gradient-to-r from-blue-500 to-blue-600
                       hover:from-blue-400 hover:to-blue-500
                       disabled:opacity-50 disabled:hover:from-blue-500 disabled:hover:to-blue-600
                       transition-all duration-300 text-white
                       shadow-[0_4px_12px_-1px_rgba(59,130,246,0.3)]
                       hover:shadow-[0_4px_16px_-1px_rgba(59,130,246,0.4)]"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;