import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, MessageSquare, Send, X, Mic, MicOff, 
  VideoOff, PhoneOff, User, MoreHorizontal, Paperclip,
  Smile, ShieldCheck, Clock
} from 'lucide-react';
import { telemedicineService } from '../services/endpoints';
import { cn } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function TelemedicinePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const join = async () => {
      try {
        const res = await telemedicineService.joinSession(sessionId!);
        setSession(res.data);
        const chatRes = await telemedicineService.getChatHistory(res.data.doctor_id);
        setMessages(chatRes.data);
      } catch (err) {
        toast.error("Failed to join session. It may have expired.");
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    join();

    // Poll for messages (in production use WebSockets)
    const interval = setInterval(async () => {
      if (session) {
        const chatRes = await telemedicineService.getChatHistory(session.doctor_id);
        setMessages(chatRes.data);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await telemedicineService.sendMessage({
        receiver_id: session.doctor_id,
        content: newMessage
      });
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Connecting to secure clinical stream...</div>;

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold">Secure Consultation</h1>
            <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-green-500" /> HIPAA Compliant End-to-End
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-800 rounded-full text-[10px] font-bold text-gray-400">
            <Clock className="w-3 h-3" /> 14:22
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-800 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 relative bg-gray-900 flex items-center justify-center group">
          {isVideoOn ? (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
               <User className="w-32 h-32 text-gray-700" />
               <p className="absolute bottom-10 text-sm font-bold text-gray-400">Remote Participant (Doctor)</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
               <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
                  <VideoOff className="w-10 h-10 text-gray-500" />
               </div>
               <p className="text-gray-500 text-sm font-medium">Camera is off</p>
            </div>
          )}

          {/* Self View */}
          <div className="absolute top-6 right-6 w-48 h-32 rounded-2xl bg-gray-800 border-2 border-gray-700 shadow-2xl overflow-hidden">
             <div className="w-full h-full flex items-center justify-center bg-gray-700">
                <User className="w-12 h-12 text-gray-600" />
             </div>
             <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-bold">
                YOU
             </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all">
             <ControlBtn icon={isMicOn ? Mic : MicOff} active={isMicOn} onClick={() => setIsMicOn(!isMicOn)} />
             <ControlBtn icon={isVideoOn ? Video : VideoOff} active={isVideoOn} onClick={() => setIsVideoOn(!isVideoOn)} />
             <button 
               onClick={() => navigate(-1)}
               className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-xl shadow-red-500/20"
             >
                <PhoneOff className="w-6 h-6" />
             </button>
             <ControlBtn icon={MoreHorizontal} active={false} />
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-96 border-l border-gray-800 flex flex-col bg-gray-900/30 backdrop-blur-sm">
          <div className="p-4 border-b border-gray-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Chat</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
             {messages.map((msg, i) => (
               <div key={i} className={cn("flex flex-col", msg.sender_id === session.patient_id ? "items-end" : "items-start")}>
                 <div className={cn(
                   "max-w-[85%] p-3 rounded-2xl text-xs",
                   msg.sender_id === session.patient_id ? "bg-primary-600 text-white" : "bg-gray-800 text-gray-200"
                 )}>
                   {msg.content}
                 </div>
                 <span className="text-[8px] font-bold text-gray-600 mt-1 uppercase">
                   {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </span>
               </div>
             ))}
             <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-gray-800 bg-gray-950/50">
             <form onSubmit={handleSendMessage} className="relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-gray-800 border-none rounded-xl pl-4 pr-12 py-3 text-xs focus:ring-1 focus:ring-primary-500/50 outline-none"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all"
                >
                  <Send className="w-3 h-3" />
                </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlBtn({ icon: Icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center transition-all border",
        active 
          ? "bg-gray-800 border-gray-700 text-white hover:bg-gray-700" 
          : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
      )}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
