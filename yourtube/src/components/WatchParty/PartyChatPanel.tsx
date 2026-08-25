"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export interface ChatMessage {
  id: string;
  senderName: string;
  senderAvatar?: string;
  senderSocketId?: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

interface PartyChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  localSocketId: string;
}

export default function PartyChatPanel({
  messages,
  onSendMessage,
  localSocketId,
}: PartyChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px]">
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-red-600" />
          <h3 className="font-semibold text-sm text-gray-900">Live Party Chat</h3>
        </div>
        <span className="text-xs text-gray-500 font-medium">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 max-h-[380px] min-h-[220px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 text-xs py-8">
            <MessageSquare className="w-8 h-8 stroke-1 mb-1 text-gray-300" />
            <p>No messages yet.</p>
            <p>Say hi to start the Watch Party chat!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center my-1.5">
                  <span className="inline-block bg-gray-100 text-gray-600 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMe = msg.senderSocketId === localSocketId;

            return (
              <div
                key={msg.id}
                className={`flex gap-2 text-xs ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar className="w-7 h-7 mt-0.5 border shrink-0">
                  <AvatarImage src={msg.senderAvatar} />
                  <AvatarFallback className="bg-red-100 text-red-700 font-semibold text-[10px]">
                    {msg.senderName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className={`flex flex-col max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-1.5 px-1 mb-0.5">
                    <span className="font-semibold text-gray-700 text-[11px]">{msg.senderName}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div
                    className={`px-3 py-1.5 rounded-2xl text-xs break-words shadow-xs ${
                      isMe
                        ? "bg-red-600 text-white rounded-tr-none"
                        : "bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <form onSubmit={handleSend} className="p-2 border-t bg-gray-50 flex items-center gap-2">
        <Input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message..."
          className="flex-1 text-xs h-9 bg-white focus-visible:ring-1 focus-visible:ring-red-500 rounded-full"
        />
        <Button
          type="submit"
          disabled={!inputText.trim()}
          size="icon"
          className="h-9 w-9 bg-red-600 hover:bg-red-700 text-white rounded-full shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
