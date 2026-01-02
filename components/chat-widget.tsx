'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Toast, ToastProvider, ToastViewport, ToastTitle, ToastDescription, ToastClose } from '@/components/ui/toast';

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
    const [sessionId, setSessionId] = useState('');
    const [activeFlow, setActiveFlow] = useState<'lead' | 'booking' | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { toast, toasts } = useToast();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Initialize Session ID
    useEffect(() => {
        if (typeof window !== 'undefined' && !sessionId) {
            setSessionId(crypto.randomUUID());
        }
    }, [sessionId]);

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

        const handleMsg = (e: MessageEvent) => {
            if (e.data?.type === 'TRM_HOST_FADE_OUT_REQUEST') {
                // Determine what to close based on priority
                if (activeFlow === 'booking') {
                    setActiveFlow(null);
                } else if (isOpen) {
                    setIsOpen(false);
                }
            }
        };

        window.addEventListener('message', handleMsg);

        if (activeFlow === 'booking') {
            window.parent.postMessage({ type: 'TRM_CHAT_MODAL_OPEN' }, '*');
        }

        return () => window.removeEventListener('message', handleMsg);
    }, [activeFlow, isOpen]);

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

    const handleBookingClick = () => {
        setActiveFlow('booking');

        // Log booking intent
        fetch('/api/booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: _clientId,
                sessionId: sessionId
            })
        }).catch(err => console.error('Failed to log booking:', err));
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    clientId: _clientId,
                    sessionId: sessionId
                })
            });

            if (!response.ok) throw new Error('Failed to send message');

            const data = await response.json();
            const botMsg: Message = {
                role: 'assistant',
                content: data.reply || data.message || 'Sorry, I am having trouble connecting right now.'
            };

            setMessages((prev) => [...prev, botMsg]);
        } catch (error) {
            console.error('Chat Error:', error);
            toast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive",
            });
            // Optional: Remove user message or show error state
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeadFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: _clientId,
                    ...data
                })
            });

            if (!response.ok) throw new Error('Failed to submit lead');

            setActiveFlow(null);
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: 'Thanks! We have received your message and will follow up shortly.' }
            ]);
            toast({
                title: "Success",
                description: "Message sent successfully!",
                duration: 3000,
            });
        } catch (error) {
            console.error('Lead Submit Error:', error);
            toast({
                title: "Error",
                description: "Failed to submit form. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const isBooking = activeFlow === 'booking';
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [highlightClose, setHighlightClose] = useState(false);

    // Track interactions with the iframe
    useEffect(() => {
        if (!isBooking) {
            setHasInteracted(false);
            return;
        }

        const handleBlur = () => {
            // If focus shifts to the iframe, mark as interacted
            if (document.activeElement === iframeRef.current) {
                setHasInteracted(true);
            }
        };

        window.addEventListener('blur', handleBlur);
        return () => window.removeEventListener('blur', handleBlur);
    }, [isBooking]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target !== e.currentTarget) return;

        if (hasInteracted) {
            // Visual cue that it's blocked
            setHighlightClose(true);
            setTimeout(() => setHighlightClose(false), 500);
        } else {
            // Close if no interaction
            setActiveFlow(null);
        }
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

        if (activeFlow === 'booking') {
            window.parent.postMessage({ type: 'TRM_CHAT_MODAL_OPEN' }, '*');
        } else {
            // 1. Send normal resize update (safely ignored by widget.js if currently fullscreen)
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

            // 2. Synchronization:
            // We do NOT send TRM_CHAT_MODAL_CLOSE here. 
            // We rely on AnimatePresence's onExitComplete callback to trigger the close signal 
            // ONLY after the fade-out animation has physically finished and unmounted.
            // This guarantees zero visual overlap ("remnant" glitch).
        }
    }, [activeFlow, isOpen, width_px, height_px, launcher_size, bottom_px, right_px]);

    return (
        <ToastProvider>
            <div style={styles.container}>
                {/* Modal Overlay Layer */}
                <AnimatePresence
                    onExitComplete={() => {
                        // Handshake Step 3: Tell host we are invisible. Safe to resize now.
                        window.parent.postMessage({ type: 'TRM_IFRAME_FADE_OUT_DONE' }, '*');
                    }}
                >
                    {isBooking && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
                            onClick={handleBackdropClick}
                        >
                            {booking_link && (
                                <div
                                    className="relative bg-white w-[500px] h-[600px] max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => {
                                            if (forcedDevice) setActiveFlow(null);
                                            window.parent.postMessage({ type: 'TRM_CHAT_MODAL_CLOSE' }, '*');
                                        }}
                                        className={`absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-gray-100 z-10 transition-all duration-300 ${highlightClose ? 'ring-2 ring-red-500 scale-110 bg-red-50' : ''}`}
                                    >
                                        <X className={`h-4 w-4 ${highlightClose ? 'text-red-500' : 'text-gray-600'}`} />
                                    </button>
                                    <iframe
                                        ref={iframeRef}
                                        src={booking_link}
                                        className="w-full h-full border-0"
                                        title="Booking Calendar"
                                    />
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Chat Window Layer */}
                <AnimatePresence
                    onExitComplete={() => {
                        // Handshake Step 3: Tell host we are invisible. Safe to resize now.
                        window.parent.postMessage({ type: 'TRM_IFRAME_FADE_OUT_DONE' }, '*');
                    }}
                >
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            style={styles.window}
                            className="absolute bottom-full right-0 origin-bottom-right"
                        >
                            {/* Inline Premium Toast */}
                            <ToastViewport className="absolute top-16 left-1/2 -translate-x-1/2 w-[90%] flex flex-col gap-2 z-50 focus:outline-none pointer-events-none p-0 m-0" />
                            {toasts.map(function ({ id, title, description, ...props }) {
                                return (
                                    <Toast
                                        key={id}
                                        {...props}
                                        className="bg-red-500 text-white border-0 shadow-lg rounded-xl py-2 px-4 shadow-red-500/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full pointer-events-auto"
                                    >
                                        <div className="grid gap-1">
                                            {title && <ToastTitle className="text-xs font-bold">{title}</ToastTitle>}
                                            {description && (
                                                <ToastDescription className="text-xs opacity-90">{description}</ToastDescription>
                                            )}
                                        </div>
                                        <ToastClose className="text-white hover:text-white/80" />
                                    </Toast>
                                )
                            })}
                            {/* Header */}
                            <div
                                className="flex items-center justify-between p-4 shrink-0"
                                style={styles.header}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white/20 flex items-center justify-center font-bold" style={{ color: title_color }}>
                                        {logoUrl ? (
                                            <div className="relative h-full w-full overflow-hidden rounded-full border border-border/50">
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
                                    onClick={() => {
                                        if (forcedDevice) setIsOpen(false);
                                        window.parent.postMessage({ type: 'TRM_CHAT_MODAL_CLOSE' }, '*');
                                    }}
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
                                                onClick={handleBookingClick}
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
                            <div className="border-t bg-white p-4 dark:bg-slate-900 shrink-0 relative">
                                {activeFlow === 'lead' && (
                                    <div
                                        className="absolute inset-0 z-10 bg-white/50 cursor-not-allowed"
                                        onClick={() => {
                                            toast({
                                                title: "Please complete the form",
                                                description: "You must submit or close the form before sending a new message.",
                                                variant: "destructive",
                                                duration: 2000,
                                            });
                                        }}
                                    />
                                )}
                                <form
                                    className="flex space-x-2"
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                >
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 rounded-full border-gray-200 dark:border-gray-700 focus-visible:ring-1"
                                        disabled={activeFlow === 'lead'}
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="rounded-full h-10 w-10 shrink-0 transition-transform active:scale-95 hover:opacity-90"
                                        style={{ backgroundColor: primary_color }}
                                        disabled={isLoading || !input.trim() || activeFlow === 'lead'}
                                    >
                                        <Send className="h-4 w-4 text-white" />
                                    </Button>
                                </form>
                            </div>
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
                        onClick={() => {
                            if (isOpen) {
                                // Start Close Handshake
                                if (forcedDevice) setIsOpen(false);
                                window.parent.postMessage({ type: 'TRM_CHAT_MODAL_CLOSE' }, '*');
                            } else {
                                setIsOpen(true);
                            }
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <AnimatePresence mode="wait">
                            {isOpen ? (
                                <motion.div
                                    key="close"
                                    initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                    exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <X className="h-7 w-7 text-white" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="open"
                                    initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                    exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <MessageCircle className="h-7 w-7 text-white" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </div>
        </ToastProvider >
    );
}
