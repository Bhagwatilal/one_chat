export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;

  constructor() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
    }
  }

  start(onResult: (text: string, isFinal: boolean) => void, onError?: (error: Error) => void) {
    if (!this.recognition) {
      if (onError) onError(new Error('Speech recognition not supported'));
      return;
    }

    if (this.isListening) return;

    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      onResult(text, result.isFinal);
    };

    this.recognition.onerror = (event) => {
      if (onError) onError(new Error(event.error));
    };

    this.recognition.start();
    this.isListening = true;
  }

  stop() {
    if (!this.recognition || !this.isListening) return;
    this.recognition.stop();
    this.isListening = false;
  }

  isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }
}