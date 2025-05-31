export interface Voice {
  id: string;
  name: string;
  language: string;
  accent: string;
  gender: 'male' | 'female';
  preview: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}