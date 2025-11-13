import React, { useState, useRef, useEffect } from 'react';
import { aiAssistantAPI } from '../services/api';

const AIAssistant = () => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMessage = { role: 'user', content: inputMessage };
        const updatedMessages = [...messages, userMessage];
        
        setMessages(updatedMessages);
        setInputMessage('');
        setIsLoading(true);

        try {
            // Prepare history for API (only the actual messages, not system messages)
            const history = messages.slice(-6).map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const response = await aiAssistantAPI.chat(inputMessage, history);
            
            if (response.data.success) {
                setMessages([...updatedMessages, { 
                    role: 'assistant', 
                    content: response.data.response 
                }]);
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('AI Assistant error:', error);
            setMessages([...updatedMessages, { 
                role: 'assistant', 
                content: 'Sorry, I encountered an error. Please try again.' 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const suggestedQuestions = [
        "How to treat fungal infections in tomatoes?",
        "Best practices for dairy cattle nutrition",
        "Weather impact on wheat cultivation this season",
        "Organic pest control methods for vegetables",
        "How to improve soil health naturally?",
        "Symptoms of foot and mouth disease in cattle"
    ];

    const clearChat = () => {
        setMessages([]);
    };

    return (
        <div className="ai-assistant">
            <div className="chat-header">
                <h3>KrishiGuard AI Assistant</h3>
                <p>Ask me about crops, livestock, or farming practices</p>
                <button className="clear-chat-btn" onClick={clearChat}>
                    Clear Chat
                </button>
            </div>

            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="suggestions">
                        <p>Try asking me:</p>
                        {suggestedQuestions.map((question, index) => (
                            <button 
                                key={index}
                                className="suggestion-btn"
                                onClick={() => setInputMessage(question)}
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                )}
                
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.role}`}>
                        <div className="message-avatar">
                            {message.role === 'user' ? '👤' : '🌿'}
                        </div>
                        <div className="message-content">
                            {message.content}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="message assistant">
                        <div className="message-avatar">🌿</div>
                        <div className="message-content loading">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input">
                <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about crop diseases, livestock care, weather impact..."
                    rows="2"
                    disabled={isLoading}
                />
                <button 
                    onClick={sendMessage} 
                    disabled={isLoading || !inputMessage.trim()}
                    className="send-btn"
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default AIAssistant;