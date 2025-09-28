
import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '@google/genai';
import { createChatSession } from './services/geminiService';
import { ChatMessage, MessageAuthor } from './types';
import ChatInput from './components/ChatInput';
import ChatMessageComponent from './components/ChatMessage';

const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const session = createChatSession();
      setChat(session);
      setMessages([
        {
          author: MessageAuthor.BOT,
          content: "Hello! I'm your Gemini-powered code assistant. How can I help you today?",
        },
      ]);
    } catch (e) {
        if (e instanceof Error) {
            setError(e.message);
        } else {
            setError("An unknown error occurred during initialization.");
        }
    }
  }, []);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  const handleSendMessage = async (userInput: string) => {
    if (!chat) return;

    const userMessage: ChatMessage = { author: MessageAuthor.USER, content: userInput };
    const botMessagePlaceholder: ChatMessage = { author: MessageAuthor.BOT, content: '' };

    setMessages((prev) => [...prev, userMessage, botMessagePlaceholder]);
    setIsLoading(true);
    setError(null);

    try {
      const stream = await chat.sendMessageStream({ message: userInput });
      let botResponse = '';
      for await (const chunk of stream) {
        botResponse += chunk.text;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], content: botResponse };
          return newMessages;
        });
      }
    } catch (e) {
      const errorMessage = "Sorry, I encountered an error. Please try again.";
      setError(errorMessage);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.author === MessageAuthor.BOT && lastMsg.content === '') {
          newMessages[newMessages.length - 1] = { ...lastMsg, content: errorMessage };
        }
        return newMessages;
      });
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
      <header className="p-4 border-b border-gray-700 shadow-lg bg-gray-900/80 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-3">
            <span className="text-teal-400">Gemini</span>
            <span className="text-gray-400">Code Assistant</span>
        </h1>
      </header>
      
      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg, index) => (
            <ChatMessageComponent
                key={index}
                message={msg}
                isLoading={isLoading && index === messages.length - 1}
            />
        ))}
        {error && !isLoading && (
            <div className="flex justify-center">
                <div className="text-red-400 bg-red-900/30 border border-red-700 p-3 rounded-lg text-sm">
                    {error}
                </div>
            </div>
        )}
      </main>

      <footer className="w-full">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
};

export default App;
