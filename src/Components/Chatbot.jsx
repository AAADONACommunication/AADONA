import { useState, useRef, useEffect } from 'react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([
    '🤖 👋 Hi there! Welcome to AADONA. How may I help you today?',
    '🤖 📞 In case of any queries, you can reach us at our toll-free number: 1800 202 6599',
    '🤖 💬 Please leave your details so we can contact you even if you leave the site.'
  ]);
  
  // Ref to track the bottom of the chat log for auto-scrolling
  const messagesEndRef = useRef(null); 

  // Function to scroll to the bottom of the chat window
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to the bottom whenever chatLog updates
  useEffect(() => {
    scrollToBottom();
  }, [chatLog, isOpen]); // Scroll also when the chat window is opened

  const handleSend = () => {
    const userMessage = message.trim();
    if (userMessage) {
      // 1. Add user message
      setChatLog((prev) => [...prev, `🧑‍💻 ${userMessage}`]);
      setMessage('');

      // 2. Simulate an auto-response from the chatbot (after a short delay)
      setTimeout(() => {
        let botResponse = "Thank you for your message. Our team will be with you shortly";
        if (userMessage.toLowerCase().includes('partner')) {
            botResponse = "To discuss a potential tech partnership, please visit our 'Partners' page or share your email, and we'll connect you with an account manager.";
        } else if (userMessage.toLowerCase().includes('help')) {
            botResponse = "I can help with general information about AADONA's networking solutions and contact details.";
        } else if (userMessage.toLowerCase().includes('network')) {
            botResponse = "AADONA specializes in made-in-India networking solutions including switches, routers, and fiber optics. How can I assist you with a specific product?";
        }
        setChatLog((prev) => [...prev, `🤖 ${botResponse}`]);
      }, 1000);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Desktop-style Chat Button - Updated for smaller mobile size */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          // Smaller padding, font, and icon size for mobile (default)
          // Larger size applied starting from the 'md' breakpoint
           className="ml-5 relative inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-7 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-bold text-base shadow-md shadow-green-300 hover:shadow-lg hover:shadow-green-300 hover:-translate-y-0.5 active:translate-y-0">

          {/* Chat Icon (SVG) - Responsive sizing */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 md:h-6 md:w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 8h10M7 12h6m-6 4h4M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4.5-1.1L3 20l1.1-4.5A8.97 8.97 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="font-semibold">Chat With Us</span>
        </button>
      )}

      {/* Chat Window - Modernized Look (Now smaller for mobile) */}
      {isOpen && (
        <div className="w-72 h-[420px] md:w-80 md:h-[480px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300">
          {/* Header - Professional Emerald */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 font-bold flex justify-between items-center text-lg shadow-md">
            AADONA Support Team
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-1 rounded-full hover:bg-emerald-700 transition"
              aria-label="Close Chat"
            >
              {/* Modern Close Icon SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto text-sm text-gray-800 space-y-3">
            {chatLog.map((msg, idx) => {
                const isUser = msg.startsWith('🧑‍💻');
                // Extract content, removing the emoji prefix
                const content = msg.substring(3).trim(); 

                return (
                    <div 
                        key={idx} 
                        className={`max-w-[85%] p-3 rounded-xl shadow-sm leading-snug break-words ${
                            isUser 
                                ? 'ml-auto bg-emerald-500 text-white rounded-br-sm' // User: Emerald bubble, bottom right corner less rounded
                                : 'mr-auto bg-gray-100 text-gray-800 rounded-tl-sm' // Bot: Light gray bubble, top left corner less rounded
                        }`}
                    >
                        {content}
                    </div>
                );
            })}
            {/* Element to scroll to */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input + Send - Cleaned up and using rounded full for input/button */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 transition"
            />
            <button
              onClick={handleSend}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-semibold flex items-center justify-center shadow-md flex-shrink-0"
              aria-label="Send Message"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}