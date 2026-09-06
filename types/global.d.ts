interface Window {
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  webkitSpeechRecognition: typeof SpeechRecognition;
  SpeechRecognition: typeof SpeechRecognition;
}

interface Performance {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}

/*
 * react-dom ships this file at runtime (it's the Web Streams / edge build used
 * so SSR works under plain Node, e.g. Netlify Functions), but it has no
 * bundled type declarations and isn't covered by @types/react-dom.
 */
declare module 'react-dom/server.browser' {
  export * from 'react-dom/server';
}
