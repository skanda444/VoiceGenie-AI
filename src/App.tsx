import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Volume2, VolumeX, MessageCircle, Sparkles } from 'lucide-react';

// Define the Message interface for type safety
interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

function App() {
  // State variables for managing application UI and data
  const [input, setInput] = useState(''); // Stores the current user input
  const [messages, setMessages] = useState<Message[]>([]); // Stores the chat messages
  const [isLoading, setIsLoading] = useState(false); // Indicates if an AI response is being generated
  const [isSpeaking, setIsSpeaking] = useState(false); // Indicates if the app is currently speaking
  const [speechEnabled, setSpeechEnabled] = useState(true); // Controls text-to-speech
  const [error, setError] = useState(''); // Stores any error messages to display
  
  // Ref for scrolling messages into view
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effect to scroll to the bottom of the messages area whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to scroll the chat window to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to speak the given text using the Web Speech API
  const speakText = (text: string) => {
    // Check if speech is enabled and if the SpeechSynthesis API is supported
    if (!speechEnabled || !('speechSynthesis' in window)) return;

    // Cancel any ongoing speech to prevent overlap
    window.speechSynthesis.cancel();

    // Create a new SpeechSynthesisUtterance object
    const utterance = new SpeechSynthesisUtterance(text); // Corrected typo here!
    utterance.rate = 0.9; // Adjust speech rate
    utterance.pitch = 1; // Adjust speech pitch
    utterance.volume = 0.8; // Adjust speech volume

    // Set event handlers for speech start, end, and error
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Speak the utterance
    window.speechSynthesis.speak(utterance);
  };

  // Function to stop any ongoing speech
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Function to generate an AI response using the Groq API
  const generateAIResponse = async (userInput: string): Promise<string> => {
    // Retrieve the API key from environment variables.
    // In Vite, client-side env variables are exposed via import.meta.env and must be prefixed with VITE_.
    const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

    // Check if the API key is available
    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY is not set in environment variables.");
      return "I'm sorry, I cannot connect to the AI service. Please ensure the API key is configured correctly.";
    }

    try {
      // Make a POST request to the Groq API endpoint
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}` // Use the API key for authorization
        },
        body: JSON.stringify({
          model: 'gemma2-9b-it', // Specify the Groq model you want to use
          messages: [{ role: 'user', content: userInput }], // Send user input as a user message
          max_tokens: 500, // Maximum tokens in the AI response
          temperature: 0.7, // Controls the creativity/randomness of the response
          stream: false, // Set to false for non-streaming response (Canvas environment only supports non-streaming)
        })
      });

      // Check if the API response was successful
      if (!response.ok) {
        const errorData = await response.json(); // Parse error details from response
        console.error("Groq API error response:", errorData);
        // Throw an error with details for better debugging
        throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorData.message || JSON.stringify(errorData)}`);
      }

      // Parse the JSON response from the API
      const data = await response.json();
      
      // Extract and return the AI's message content
      return data.choices[0].message.content;

    } catch (error: any) {
      // Catch and log any errors during the API call
      console.error('Error calling Groq API:', error);
      // Provide a user-friendly error message
      return `I apologize, but I encountered an issue fetching a response. Please try again. (${error.message})`;
    }
  };

  // Handler for form submission (when user sends a message)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior

    // Validate if the input is not empty
    if (!input.trim()) {
      setError('Please enter a question or command');
      setTimeout(() => setError(''), 3000); // Clear error after 3 seconds
      return;
    }

    // Create a new user message object
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // Add the user message to the chat and clear the input field
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true); // Set loading state to true
    setError(''); // Clear any previous errors

    try {
      // Get AI response using the dedicated function
      const aiResponse = await generateAIResponse(input.trim());
      
      // Create a new AI message object
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      // Add the AI message to the chat
      setMessages(prev => [...prev, aiMessage]);
      
      // Automatically speak the AI response if speech is enabled
      if (speechEnabled) {
        setTimeout(() => speakText(aiResponse), 500); // Small delay for better UX
      }
    } catch (error) {
      // Log and display error if AI response fails
      console.error('Error getting AI response:', error);
      setError('Failed to get response. Please try again.');
      setTimeout(() => setError(''), 5000); // Clear error after 5 seconds
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  // Helper function to format message timestamps
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    // Main container with a gradient background
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      
      <div className="relative min-h-screen flex flex-col">
        {/* Header Section */}
        <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-center space-x-3">
              <div className="relative">
                <Sparkles className="w-8 h-8 text-yellow-300" />
                <div className="absolute inset-0 animate-pulse">
                  <Sparkles className="w-8 h-8 text-yellow-300 opacity-50" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white">VoiceGenie Lite</h1>
              <div className="relative">
                <Mic className="w-8 h-8 text-indigo-300" />
                <div className="absolute inset-0 animate-pulse">
                  <Mic className="w-8 h-8 text-indigo-300 opacity-50" />
                </div>
              </div>
            </div>
            <p className="text-center text-indigo-200 mt-2">Your AI-powered voice assistant</p>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6">
          {/* Messages Display Area */}
          <div className="flex-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 mb-6 overflow-hidden">
            <div className="h-full flex flex-col">
              {messages.length === 0 ? (
                // Welcome message if no messages yet
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-4">
                    <MessageCircle className="w-16 h-16 text-indigo-300 mx-auto opacity-50" />
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Welcome to VoiceGenie Lite!</h3>
                      <p className="text-indigo-200 text-sm max-w-md">
                        Ask me anything and I'll provide intelligent responses with voice output. 
                        Try questions like "What is a black hole?" or "Tell me about dolphins."
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Display messages if available, with scroll functionality
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-lg ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                            : 'bg-white/90 text-gray-800 backdrop-blur-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <p 
                          className={`text-xs mt-2 ${
                            message.type === 'user' ? 'text-indigo-100' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Loading indicator when AI is thinking */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-gray-600 text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} /> {/* Reference for auto-scrolling */}
                </div>
              )}
            </div>
          </div>

          {/* Input Area with Form and Controls */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4">
            {/* Error message display */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}
            
            {/* Input form */}
            <form onSubmit={handleSubmit} className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-200"
                  disabled={isLoading} // Disable input when loading
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !input.trim()} // Disable button when loading or input is empty
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Ask</span>
              </button>
            </form>

            {/* Speech and Message Count Controls */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center space-x-4">
                {/* Toggle Speech Button */}
                <button
                  onClick={() => setSpeechEnabled(!speechEnabled)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    speechEnabled 
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
                      : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                  }`}
                >
                  {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span className="text-sm">Speech {speechEnabled ? 'On' : 'Off'}</span>
                </button>

                {/* Stop Speaking Button (only visible when speaking) */}
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg transition-all duration-200"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span className="text-sm">Stop Speaking</span>
                  </button>
                )}
              </div>

              {/* Message Count Display */}
              <div className="text-xs text-indigo-300">
                {messages.length > 0 && `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
