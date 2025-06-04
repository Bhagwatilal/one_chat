import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Bot, Send, User, Loader2, Sparkles, Plus, MessageSquare, Trash2, Menu, Volume2, VolumeX, ChevronDown, Globe2, Mic, MicOff, Atom, Sun, Moon, Music, Music2, Music4, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { twMerge } from 'tailwind-merge';
import { PLAYAI_AGENT_ID, PLAYAI_API_KEY, PLAYAI_USER_ID, switchPersona } from './lib/playai';
import { SpeechRecognitionService } from './lib/speech';
import SpaceBackground from './SpaceBackground';

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

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
}

const indianVoiceNames: Record<string, string> = {
  'hi-IN': 'AI',
  'hi-IN-2': 'AI',
  'hi-IN-3': 'AI',
  'hi-IN-4': 'AI',
  'en-IN': 'AI',
  'en-IN-2': 'AI',
};

const defaultSongs: Song[] = [
  {
    id: '1',
    title: 'Calm Meditation',
    artist: 'Nature Sounds',
    url: '/songs/Song1.mp3'
  },
  {
    id: '2',
    title: 'Peaceful Piano',
    artist: 'Classical',
    url: '/songs/Song2.mp3'
  },
  {
    id: '3',
    title: 'Ambient Space',
    artist: 'Electronic',
    url: '/songs/Song3.mp3'
  },
  {
    id: '4',
    title: 'Relaxing Melody',
    artist: 'Ambient',
    url: '/songs/Song4.mp3'
  },
  {
    id: '5',
    title: 'Serene Atmosphere',
    artist: 'Meditation',
    url: '/songs/Song5.mp3'
  },
  {
    id: '6',
    title: 'Tranquil Tunes',
    artist: 'Relaxation',
    url: '/songs/Song6.mp3'
  }
];

interface VoiceDropdownProps {
  voices: Voice[];
  selectedVoice: Voice | null;
  isVoiceEnabled: boolean;
  onVoiceSelect: (voice: Voice) => void;
}

const VoiceSelectionDropdown: React.FC<VoiceDropdownProps> = ({
  voices,
  selectedVoice,
  isVoiceEnabled,
  onVoiceSelect
}) => (
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
              selectedVoice?.voice.name === voice.voice.name && 
              selectedVoice?.voice.lang === voice.voice.lang && 
              "bg-blue-500/10 text-blue-400"
            )}
            onClick={() => onVoiceSelect(voice)}
          >
            <div>
              <div className="font-medium">{voice.displayName}</div>
              <div className="text-xs text-gray-400">{voice.language}</div>
            </div>
            {selectedVoice?.voice.name === voice.voice.name && 
             selectedVoice?.voice.lang === voice.voice.lang && (
              <div className="w-2 h-2 rounded-full bg-blue-400" />
            )}
          </button>
        ))}
    </div>
  </div>
);

export default function App() {
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
  const [isMirrorLoading, setIsMirrorLoading] = useState(false);
  const [isMirrorDropdownOpen, setIsMirrorDropdownOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<'srk' | 'ratanTata' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceDropdownRef = useRef<HTMLDivElement>(null);
  const mirrorDropdownRef = useRef<HTMLDivElement>(null);
  const synth = window.speechSynthesis;
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  });
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);
  const [isMusicDropdownOpen, setIsMusicDropdownOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicDropdownRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentChat = chats.find(chat => chat.id === currentChatId);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = synth.getVoices()
        .filter(voice => voice.lang.startsWith('hi-') || voice.lang.startsWith('en-'))
        .reduce((unique, voice) => {
          // Create a unique key for each voice based on name and language
          const key = `${voice.name}-${voice.lang}`;
          // Only add if we haven't seen this voice before
          if (!unique.some(v => `${v.voice.name}-${v.voice.lang}` === key)) {
            const isIndianVoice = voice.lang.startsWith('hi-') || voice.lang.startsWith('en-IN');
            const voiceKey = `${voice.lang}${isIndianVoice ? voice.name.includes('2') ? '-2' : 
                            voice.name.includes('3') ? '-3' : voice.name.includes('4') ? '-4' : '' : ''}`;
            
            unique.push({
              name: voice.name,
              displayName: isIndianVoice ? indianVoiceNames[voiceKey] || voice.name : voice.name,
              voice: voice,
              language: voice.lang.startsWith('hi-') ? 'Hindi' : 'English'
            });
          }
          return unique;
        }, [] as Voice[])
        .sort((a, b) => {
          const aIsIndian = a.voice.lang.startsWith('hi-') || a.voice.lang.startsWith('en-IN');
          const bIsIndian = b.voice.lang.startsWith('hi-') || b.voice.lang.startsWith('en-IN');
          if (aIsIndian && !bIsIndian) return -1;
          if (!aIsIndian && bIsIndian) return 1;
          return a.displayName.localeCompare(b.displayName);
        });

      setVoices(availableVoices);
      
      // Set default voice if none is selected
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mirrorDropdownRef.current && !mirrorDropdownRef.current.contains(event.target as Node)) {
        setIsMirrorDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (musicDropdownRef.current && !musicDropdownRef.current.contains(event.target as Node)) {
        setIsMusicDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (isMusicEnabled && selectedSong) {
        // Stop any current playback
        audioRef.current.pause();
        
        // Update source if needed
        if (audioRef.current.src !== selectedSong.url) {
          audioRef.current.src = selectedSong.url;
          audioRef.current.load();
        }
        
        // Play the audio
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            setIsMusicEnabled(false);
            setIsPlaying(false);
          });
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isMusicEnabled, selectedSong]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

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
    utterance.onerror = () => {
      console.error('Speech synthesis error');
      setIsSpeaking(false);
    };
    
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

  const openPlayAI = async (persona: 'srk' | 'ratanTata') => {
    setIsMirrorLoading(true);
    try {
      if (!window.PlayAI) {
        alert('PlayAI is not available. Please refresh the page and try again.');
        return;
      }

      setSelectedPersona(persona);
      switchPersona(persona);
      await window.PlayAI.open(PLAYAI_AGENT_ID);
    } catch (error) {
      console.error('Error opening PlayAI:', error);
      alert('Failed to open PlayAI. Please try again later.');
    } finally {
      setIsMirrorLoading(false);
      setIsMirrorDropdownOpen(false);
    }
  };

  const disposeAgent = async () => {
    try {
      if (window.PlayAI) {
        // First close any open window
        await window.PlayAI.close();
        // Then dispose the agent
        await window.PlayAI.dispose();
      }
    } catch (error) {
      console.error('Error disposing PlayAI:', error);
    } finally {
      setSelectedPersona(null);
      setIsMirrorDropdownOpen(false);
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
      const model = genAI.getGenerativeModel({ model: "tunedModels/cbt236-s6xu2hp80tx4" });
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

  const toggleMusic = () => {
    const newMusicEnabled = !isMusicEnabled;
    setIsMusicEnabled(newMusicEnabled);
    
    if (audioRef.current) {
      if (newMusicEnabled) {
        if (!selectedSong) {
          setSelectedSong(defaultSongs[0]);
        } else {
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(error => {
              console.error('Error playing audio:', error);
              setIsMusicEnabled(false);
              setIsPlaying(false);
            });
        }
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const selectSong = (song: Song) => {
    // Update the selected song state first
    setSelectedSong(song);
    setIsMusicDropdownOpen(false);
    
    // Handle audio playback
    if (audioRef.current) {
      // Stop current playback
      audioRef.current.pause();
      
      // Set new source
      audioRef.current.src = song.url;
      audioRef.current.load();
      
      // If music is enabled, play the new song
      if (isMusicEnabled) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            setIsMusicEnabled(false);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleVoiceSelection = (voice: Voice) => {
    if (isVoiceEnabled) {
      synth.cancel();
      setSelectedVoice(voice);
      setIsVoiceDropdownOpen(false);
      
      // Test the selected voice
      const utterance = new SpeechSynthesisUtterance("Voice selected");
      utterance.voice = voice.voice;
      synth.speak(utterance);
    }
  };

  // Shared voice dropdown trigger button content
  const VoiceDropdownButton = () => (
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
  );

  return (
    <>
      <audio ref={audioRef} loop />
      <SpaceBackground theme={theme} />
      <div className="h-screen flex bg-gradient-to-br from-[#0A0F1C] via-[#121A2D] to-[#0A0F1C] z-10">
        {/* Chat Sidebar Toggle Button - Only visible on mobile */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg hover:bg-white/5 transition-all duration-200"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Mobile Menu Button - Only visible on small screens */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-lg hover:bg-white/5 transition-all duration-200"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Mobile Menu Sidebar - Slides from right */}
        <div className={twMerge(
          "fixed inset-y-0 right-0 w-80 glass-effect transform transition-transform duration-300 z-20",
          "lg:hidden", // Hide on desktop
          !isMobileMenuOpen && "translate-x-full" // Slide out on mobile
        )}>
          <div className="flex flex-col h-full p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-blue-400">Settings</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                <span className="text-sm">Theme</span>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-gray-700" />}
                </button>
              </div>

              {/* Voice Settings */}
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1" ref={voiceDropdownRef}>
                    <VoiceDropdownButton />
                    {isVoiceDropdownOpen && isVoiceEnabled && (
                      <VoiceSelectionDropdown
                        voices={voices}
                        selectedVoice={selectedVoice}
                        isVoiceEnabled={isVoiceEnabled}
                        onVoiceSelect={handleVoiceSelection}
                      />
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
                </div>
              </div>

              {/* Music Settings */}
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm">Music</span>
                  <button
                    onClick={toggleMusic}
                    className="voice-toggle"
                    data-state={isMusicEnabled ? "checked" : "unchecked"}
                  >
                    <span className="voice-toggle-thumb" data-state={isMusicEnabled ? "checked" : "unchecked"}>
                      {isMusicEnabled ? (
                        <Music className="w-3 h-3 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      ) : (
                        <Music2 className="w-3 h-3 text-gray-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </span>
                  </button>
                </div>
                {isMusicEnabled && (
                  <div className="relative" ref={musicDropdownRef}>
                    <button
                      onClick={() => setIsMusicDropdownOpen(!isMusicDropdownOpen)}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-white/[0.03]"
                    >
                      <span className="text-sm truncate">{selectedSong?.title || "Select Music"}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {isMusicDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-72 rounded-xl glass-effect border border-white/10 
                                    shadow-lg z-50 backdrop-blur-xl overflow-hidden">
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                          <div className="p-2 sticky top-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                                      backdrop-blur-xl border-b border-white/10">
                            <h3 className="text-sm font-medium text-blue-400">Background Music</h3>
                          </div>
                          {defaultSongs.map((song) => (
                            <button
                              key={song.id}
                              className={twMerge(
                                "w-full px-4 py-3 text-sm text-left hover:bg-white/5 transition-all duration-200",
                                "flex items-center justify-between space-x-2",
                                selectedSong?.id === song.id && "bg-blue-500/10 text-blue-400"
                              )}
                              onClick={() => selectSong(song)}
                            >
                              <div>
                                <div className="font-medium">{song.title}</div>
                                <div className="text-xs text-gray-400">{song.artist}</div>
                              </div>
                              {selectedSong?.id === song.id && (
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mirror AI Settings */}
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mirror AI</span>
                  <div className="relative" ref={mirrorDropdownRef}>
                    <button
                      onClick={() => setIsMirrorDropdownOpen(!isMirrorDropdownOpen)}
                      className="flex items-center space-x-2 p-2 rounded-lg bg-white/[0.03]"
                    >
                      <span className="text-sm">
                        {selectedPersona === null ? 'Select' : selectedPersona === 'srk' ? 'SRK' : 'Ratan Tata'}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {isMirrorDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 rounded-xl glass-effect border border-white/10 
                                    shadow-lg z-50 backdrop-blur-xl overflow-hidden">
                        <div className="p-2">
                          <button
                            onClick={() => openPlayAI('srk')}
                            className={`
                              w-full px-4 py-3 text-sm text-left hover:bg-white/5 transition-all duration-200
                              flex items-center justify-between space-x-2
                              ${selectedPersona === 'srk' ? 'bg-purple-500/10 text-purple-400' : ''}
                            `}
                          >
                            <div>
                              <div className="font-medium">SRK</div>
                              <div className="text-xs text-gray-400">Bollywood Star</div>
                            </div>
                            {selectedPersona === 'srk' && (
                              <div className="w-2 h-2 rounded-full bg-purple-400" />
                            )}
                          </button>
                          <button
                            onClick={() => openPlayAI('ratanTata')}
                            className={`
                              w-full px-4 py-3 text-sm text-left hover:bg-white/5 transition-all duration-200
                              flex items-center justify-between space-x-2
                              ${selectedPersona === 'ratanTata' ? 'bg-purple-500/10 text-purple-400' : ''}
                            `}
                          >
                            <div>
                              <div className="font-medium">Ratan Tata</div>
                              <div className="text-xs text-gray-400">Business Leader</div>
                            </div>
                            {selectedPersona === 'ratanTata' && (
                              <div className="w-2 h-2 rounded-full bg-purple-400" />
                            )}
                          </button>
                          {selectedPersona !== null && (
                            <>
                              <div className="h-px bg-white/10 my-2" />
                              <button
                                onClick={disposeAgent}
                                className="w-full px-4 py-3 text-sm text-left hover:bg-red-500/10 transition-all duration-200
                                         flex items-center justify-between space-x-2 text-red-400"
                              >
                                <div>
                                  <div className="font-medium">Dispose Agent</div>
                                  <div className="text-xs text-red-400/70">Clear current selection</div>
                                </div>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Sidebar - Always on left, slides in on mobile */}
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
                    onClick={() => {
                      setCurrentChatId(chat.id);
                      // Close sidebar on mobile after selection
                      if (window.innerWidth < 1024) {
                        setIsSidebarOpen(false);
                      }
                    }}
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
            <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
              {/* On mobile, center the logo and title */}
              <div className="flex-1 lg:flex-none flex justify-center lg:justify-start items-center space-x-3">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="hidden lg:block p-2 rounded-lg hover:bg-white/5 transition-all duration-200
                           hover:shadow-[0_4px_12px_-1px_rgba(59,130,246,0.2)]"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className="p-2 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20
                              shadow-[0_4px_12px_-1px_rgba(59,130,246,0.3)]">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className="relative text-xl sm:text-2xl font-bold select-none" style={{ width: 'fit-content' }}>
                  <span className="mentii-gradient-animate header-gradient bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(59,130,246,0.4)]">Mentii</span>
                </h1>
              </div>
              {/* Hide navbar buttons on mobile */}
              <div className="hidden lg:flex items-center space-x-4">
                <div className="relative" ref={voiceDropdownRef}>
                  <VoiceDropdownButton />
                  {isVoiceDropdownOpen && isVoiceEnabled && (
                    <VoiceSelectionDropdown
                      voices={voices}
                      selectedVoice={selectedVoice}
                      isVoiceEnabled={isVoiceEnabled}
                      onVoiceSelect={handleVoiceSelection}
                    />
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

                <div className="relative" ref={mirrorDropdownRef}>
                  <button
                    onClick={() => setIsMirrorDropdownOpen(!isMirrorDropdownOpen)}
                    disabled={isMirrorLoading}
                    className={`
                      px-4 py-2 rounded-xl 
                      bg-gradient-to-r from-purple-500/20 to-pink-500/20
                      hover:from-purple-500/30 hover:to-pink-500/30 
                      active:scale-95
                      transition-all duration-300
                      border border-white/10 hover:border-white/20 
                      flex items-center space-x-2
                      relative overflow-hidden
                      shadow-[0_4px_12px_-1px_rgba(168,85,247,0.2)]
                      hover:shadow-[0_4px_16px_-1px_rgba(168,85,247,0.4)]
                      ${isMirrorLoading ? 'cursor-wait' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center space-x-2 relative z-10">
                      {isMirrorLoading ? (
                        <div className="animate-spin">
                          <Atom className="w-4 h-4 text-purple-400" />
                        </div>
                      ) : (
                        <Atom className="w-4 h-4 text-purple-400" />
                      )}
                      <span className="text-sm font-medium">
                        {selectedPersona === null ? 'Mirror AI' : selectedPersona === 'srk' ? 'SRK' : 'Ratan Tata'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-purple-400" />
                    </div>
                    {isMirrorLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 animate-pulse" />
                    )}
                  </button>
                  {isMirrorDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl glass-effect border border-white/10 
                                  shadow-lg z-50 backdrop-blur-xl overflow-hidden">
                      <div className="p-2">
                        <button
                          onClick={() => openPlayAI('srk')}
                          className={`
                            w-full px-4 py-3 text-sm text-left hover:bg-white/5 transition-all duration-200
                            flex items-center justify-between space-x-2
                            ${selectedPersona === 'srk' ? 'bg-purple-500/10 text-purple-400' : ''}
                          `}
                        >
                          <div>
                            <div className="font-medium">SRK</div>
                            <div className="text-xs text-gray-400">Bollywood Star</div>
                          </div>
                          {selectedPersona === 'srk' && (
                            <div className="w-2 h-2 rounded-full bg-purple-400" />
                          )}
                        </button>
                        <button
                          onClick={() => openPlayAI('ratanTata')}
                          className={`
                            w-full px-4 py-3 text-sm text-left hover:bg-white/5 transition-all duration-200
                            flex items-center justify-between space-x-2
                            ${selectedPersona === 'ratanTata' ? 'bg-purple-500/10 text-purple-400' : ''}
                          `}
                        >
                          <div>
                            <div className="font-medium">Ratan Tata</div>
                            <div className="text-xs text-gray-400">Business Leader</div>
                          </div>
                          {selectedPersona === 'ratanTata' && (
                            <div className="w-2 h-2 rounded-full bg-purple-400" />
                          )}
                        </button>
                        {selectedPersona !== null && (
                          <>
                            <div className="h-px bg-white/10 my-2" />
                            <button
                              onClick={disposeAgent}
                              className="w-full px-4 py-3 text-sm text-left hover:bg-red-500/10 transition-all duration-200
                                       flex items-center justify-between space-x-2 text-red-400"
                            >
                              <div>
                                <div className="font-medium">Dispose Agent</div>
                                <div className="text-xs text-red-400/70">Clear current selection</div>
                              </div>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative" ref={musicDropdownRef}>
                  <button
                    onClick={() => setIsMusicDropdownOpen(!isMusicDropdownOpen)}
                    className={twMerge(
                      "flex items-center space-x-3 px-4 py-2 rounded-xl",
                      "bg-gradient-to-r from-blue-500/10 to-purple-500/10",
                      "hover:from-blue-500/20 hover:to-purple-500/20",
                      "border border-white/10 hover:border-white/20",
                      "transition-all duration-300",
                      "shadow-[0_4px_12px_-1px_rgba(59,130,246,0.2)]",
                      "hover:shadow-[0_4px_16px_-1px_rgba(59,130,246,0.3)]",
                      !isMusicEnabled && "opacity-50"
                    )}
                  >
                    <Music4 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {selectedSong?.title || "Select Music"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-blue-400" />
                  </button>
                  {isMusicDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-72 rounded-xl glass-effect border border-white/10 
                                  shadow-lg z-50 backdrop-blur-xl overflow-hidden">
                      <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        <div className="p-2 sticky top-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                                    backdrop-blur-xl border-b border-white/10">
                          <h3 className="text-sm font-medium text-blue-400">Background Music</h3>
                        </div>
                        {defaultSongs.map((song) => (
                          <button
                            key={song.id}
                            className={twMerge(
                              "w-full px-4 py-3 text-sm text-left hover:bg-white/5 transition-all duration-200",
                              "flex items-center justify-between space-x-2",
                              selectedSong?.id === song.id && "bg-blue-500/10 text-blue-400"
                            )}
                            onClick={() => selectSong(song)}
                          >
                            <div>
                              <div className="font-medium">{song.title}</div>
                              <div className="text-xs text-gray-400">{song.artist}</div>
                            </div>
                            {selectedSong?.id === song.id && (
                              <div className="w-2 h-2 rounded-full bg-blue-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={toggleMusic}
                  className="voice-toggle"
                  data-state={isMusicEnabled ? "checked" : "unchecked"}
                >
                  <span className="voice-toggle-thumb" data-state={isMusicEnabled ? "checked" : "unchecked"}>
                    {isMusicEnabled ? (
                      <Music className="w-3 h-3 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    ) : (
                      <Music2 className="w-3 h-3 text-gray-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </span>
                </button>

                {/* Add Theme Toggle Button */}
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10
                           hover:from-blue-500/20 hover:to-purple-500/20
                           border border-white/10 hover:border-white/20
                           transition-all duration-300
                           shadow-[0_4px_12px_-1px_rgba(59,130,246,0.2)]
                           hover:shadow-[0_4px_16px_-1px_rgba(59,130,246,0.3)]"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-yellow-300" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-700" />
                  )}
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden relative z-10">
            <div className="h-full flex flex-col p-4 sm:p-6">
              <div className="flex-1 rounded-2xl glass-effect futuristic-gradient p-4 sm:p-6 mb-4 sm:mb-6 overflow-y-auto custom-scrollbar">
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
                          {message.role === 'assistant' ? (
                            <div className="flex items-center gap-4">
                              {isVoiceEnabled && (
                                <div className="flex items-center justify-center min-h-[40px]">
                                  {isSpeaking ? (
                                    <button
                                      onClick={() => {
                                        synth.cancel();
                                        setIsSpeaking(false);
                                      }}
                                      className="text-blue-400 hover:text-red-400 transition-colors"
                                    >
                                      <VolumeX className="w-6 h-6" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => speakText(message.content)}
                                      className="text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                      <Volume2 className="w-6 h-6" />
                                    </button>
                                  )}
                                  {isSpeaking && <WaveAnimation />}
                                </div>
                              )}
                              <div className="prose prose-invert max-w-none flex-1">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
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
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-2xl glass-effect border border-white/[0.05] 
                           text-white placeholder-gray-400 focus:outline-none input-glow
                           transition-all duration-300 text-sm sm:text-base"
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
    </>
  );
}