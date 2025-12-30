'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearchParams } from 'next/navigation';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    type?: 'text' | 'lead_form';
}

interface ResponsiveConfig {
    position?: 'bottom-right' | 'bottom-left';
    bottom_px?: number;
    right_px?: number;
    launcher_size_px?: number;
    width_px?: number;
    height_px?: number;
}

interface ChatTheme {
    primary_color?: string;
    header_color?: string;
    background_color?: string;
    text_color?: string;
    title_color?: string;
    bot_msg_color?: string;
    bot_msg_text_color?: string;
    booking_link?: string;
    link_color?: string;
    responsive?: {
        mobile?: ResponsiveConfig;
        laptop?: ResponsiveConfig;
        desktop?: ResponsiveConfig;
    };
    // Legacy support
    position?: 'bottom-right' | 'bottom-left';
}

interface ChatWidgetProps {
    theme?: ChatTheme;
    botName?: string;
    welcomeMessage?: string;
    clientId?: string;
    forcedDevice?: 'mobile' | 'laptop' | 'desktop';
    logoUrl?: string;
}

function QuickActionButton({ label, onClick, color, disabled }: { label: string, onClick: () => void, color: string, disabled?: boolean }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-all duration-200 disabled:opacity-50"
            style={{
                borderColor: color,
                color: isHovered ? '#ffffff' : color,
                backgroundColor: isHovered ? color : 'transparent'
            }}
            disabled={disabled}
        >
            {label}
        </button>
    );
}

export function ChatWidget({
    theme = {},
    botName = 'Support Bot',
    welcomeMessage = 'Hello! How can I help you today?',
    clientId: _clientId,
    forcedDevice,
    logoUrl,
}: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeFlow, setActiveFlow] = useState<'lead' | 'booking' | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Handle handling device-specific config
    const searchParams = useSearchParams();
    const [activeDevice, setActiveDevice] = useState<'mobile' | 'laptop' | 'desktop'>(
        forcedDevice || (searchParams?.get('device') as 'mobile' | 'laptop' | 'desktop') || 'desktop'
    );

    useEffect(() => {
        if (forcedDevice) {
            setActiveDevice(forcedDevice);
        }
    }, [forcedDevice]);

    // Listen for resize events from parent
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'TRM_HOST_RESIZE') {
                setActiveDevice(event.data.device);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Handle Modal signaling
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (activeFlow === 'booking') {
            window.parent.postMessage({ type: 'TRM_CHAT_MODAL_OPEN' }, '*');
        } else {
            window.parent.postMessage({ type: 'TRM_CHAT_MODAL_CLOSE' }, '*');
        }
    }, [activeFlow]);

    const getResponsiveConfig = () => {
        if (theme?.responsive?.[activeDevice]) {
            return theme.responsive[activeDevice];
        }
        return theme?.responsive?.desktop || {};
    };

    const config = getResponsiveConfig();

    // Style defaults
    const primary_color = theme.primary_color || '#000000';
    const header_color = theme.header_color || '#000000';
    const background_color = theme.background_color || '#ffffff';
    const text_color = theme.text_color || '#000000';
    const title_color = theme.title_color || '#ffffff';
    const bot_msg_color = theme.bot_msg_color || '#f3f4f6';
    const bot_msg_text_color = theme.bot_msg_text_color || '#000000';
    const booking_link = theme.booking_link || '';
    const link_color = theme.link_color || theme.primary_color || '#000000';

    const position = config.position || theme.position || 'bottom-right';
    const bottom_px = config.bottom_px ?? 20;
    const right_px = config.right_px ?? 20;
    const launcher_size = config.launcher_size_px ?? 60;
    const width_px = config.width_px ?? 350;
    const height_px = config.height_px ?? 500;

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Simulate network delay or AI response
        setTimeout(() => {
            const botMsg: Message = { role: 'assistant', content: 'Thank you for your message. We will get back to you shortly.' };
            setMessages((prev) => [...prev, botMsg]);
            setIsLoading(false);
        }, 1000);
    };

    const handleLeadFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate backend call
        setTimeout(() => {
            setIsLoading(false);
            setActiveFlow(null);
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: 'Thanks! We have received your message and will follow up shortly.' }
            ]);
        }, 1500);
    };

    const styles = {
        container: {
            position: forcedDevice ? 'absolute' as const : 'fixed' as const,
            bottom: `${bottom_px}px`,
            right: position === 'bottom-right' ? `${right_px}px` : undefined,
            left: position === 'bottom-left' ? `${right_px}px` : undefined,
            zIndex: 50,
        },
        window: {
            width: `${width_px}px`,
            height: `${height_px}px`,
            backgroundColor: background_color,
            color: text_color,
            marginBottom: '16px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            borderRadius: '1rem',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column' as const,
        },
        header: {
            backgroundColor: header_color,
            color: title_color,
        },
        primary: {
            backgroundColor: primary_color,
            width: `${launcher_size}px`,
            height: `${launcher_size}px`,
        },
        bubbleUser: {
            backgroundColor: primary_color,
            color: '#ffffff',
        },
        bubbleHost: {
            backgroundColor: bot_msg_color,
            color: bot_msg_text_color,
        }
    };

    // Default to open in preview, but allow toggling
    useEffect(() => {
        if (forcedDevice) {
            setIsOpen(true);
        }
    }, [forcedDevice]);

    // Notify parent iframe about size changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const message = {
            type: 'TRM_CHAT_RESIZE',
            isOpen,
            config: {
                width: width_px,
                height: height_px,
                launcherSize: launcher_size,
                bottom: bottom_px,
                right: right_px
            }
        };

        window.parent.postMessage(message, '*');
    }, [isOpen, width_px, height_px, launcher_size, bottom_px, right_px]);

    return (
        <div style={styles.container}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={styles.window}
                        className="absolute bottom-full right-0 origin-bottom-right"
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between p-4 shrink-0"
                            style={styles.header}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/20 flex items-center justify-center font-bold" style={{ color: title_color }}>
                                    {logoUrl ? (
                                        <div className="relative h-full w-full overflow-hidden rounded-full border border-border/50">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={logoUrl} alt={botName} className="h-full w-full object-cover" />
                                        </div>
                                    ) : (
                                        botName.charAt(0)
                                    )}
                                </div>
                                <div style={{ color: title_color }}>
                                    <h3 className="font-semibold text-sm">{botName}</h3>
                                    <div className="flex items-center space-x-1">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        <p className="text-xs opacity-90">Online</p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white hover:bg-white/20"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: background_color }}>
                            {/* Welcome Message */}
                            <div className="flex justify-start flex-col space-y-2">
                                <div className="max-w-[85%] rounded-2xl rounded-tl-none px-4 py-3 text-sm shadow-sm" style={styles.bubbleHost}>
                                    {welcomeMessage}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {booking_link && (
                                        <QuickActionButton
                                            label="Book Appointment"
                                            onClick={() => setActiveFlow('booking')}
                                            color={link_color}
                                            disabled={!!activeFlow}
                                        />
                                    )}
                                    <QuickActionButton
                                        label="Leave a message"
                                        onClick={() => {
                                            setActiveFlow('lead');
                                            setMessages(prev => [...prev, { role: 'assistant', content: '', type: 'lead_form' }]);
                                        }}
                                        color={link_color}
                                        disabled={!!activeFlow}
                                    />
                                </div>
                            </div>

                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                                    {msg.type === 'lead_form' ? (
                                        <div className="w-[90%] bg-white border rounded-xl p-4 shadow-sm" style={{ borderTopLeftRadius: 0 }}>
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-semibold text-sm">Leave a message</h4>
                                                <button
                                                    onClick={() => {
                                                        setActiveFlow(null);
                                                        setMessages(prev => prev.filter((_, idx) => idx !== i));
                                                    }}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <form onSubmit={handleLeadFormSubmit} className="space-y-3">
                                                <Input name="name" placeholder="Name *" required className="text-sm" />
                                                <Input name="email" type="email" placeholder="Email" className="text-sm" />
                                                <Input name="phone" type="tel" placeholder="Phone Number" className="text-sm" />
                                                <textarea
                                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                    placeholder="How can we help? *"
                                                    rows={3}
                                                    required
                                                />
                                                <Button type="submit" className="w-full h-9 text-xs" style={{ backgroundColor: primary_color }}>
                                                    Send Message
                                                </Button>
                                            </form>
                                        </div>
                                    ) : (
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                                            style={msg.role === 'user' ? styles.bubbleUser : styles.bubbleHost}
                                        >
                                            {msg.content}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-gray-100 dark:bg-gray-800">
                                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="border-t bg-white p-4 dark:bg-slate-900 shrink-0">
                            <form
                                className="flex space-x-2"
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            >
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 rounded-full border-gray-200 dark:border-gray-700 focus-visible:ring-1"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="rounded-full h-10 w-10 shrink-0 transition-transform active:scale-95 hover:opacity-90"
                                    style={{ backgroundColor: primary_color }}
                                    disabled={isLoading || !input.trim()}
                                >
                                    <Send className="h-4 w-4 text-white" />
                                </Button>
                            </form>
                        </div>
                        {/* Booking Modal Overlay */}
                        {activeFlow === 'booking' && booking_link && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                <div className="bg-white w-full h-full max-h-[90%] rounded-xl shadow-2xl relative flex flex-col overflow-hidden">
                                    <button
                                        onClick={() => setActiveFlow(null)}
                                        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-gray-100 z-10 transition-colors"
                                    >
                                        <X className="h-4 w-4 text-gray-600" />
                                    </button>
                                    <iframe
                                        src={booking_link}
                                        className="w-full h-full border-0"
                                        title="Booking Calendar"
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Launcher Button */}
            <div className="relative">
                {/* Pulse Animation */}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3 z-50 pointer-events-none">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                )}

                <motion.button
                    className="flex items-center justify-center rounded-full shadow-lg hover:opacity-90"
                    style={styles.primary}
                    onClick={() => setIsOpen(!isOpen)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <AnimatePresence mode="wait">
                        {isOpen ? (
                            <motion.div
                                key="close"
                                initial={{ opacity: 0, rotate: -90 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 90 }}
                                transition={{ duration: 0.2 }}
                            >
                                <X className="h-7 w-7 text-white" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="open"
                                initial={{ opacity: 0, rotate: 90 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: -90 }}
                                transition={{ duration: 0.2 }}
                            >
                                <MessageCircle className="h-7 w-7 text-white" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </div>
    );
}
