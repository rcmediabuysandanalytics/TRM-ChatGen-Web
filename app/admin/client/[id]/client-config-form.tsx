'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateClientConfig } from '../../client-actions'
import { ChatWidget } from '@/components/chat-widget'
import { Loader2, Save, Copy, Check } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'

// Define strict types for the configuration
interface ResponsiveDeviceConfig {
    position: 'bottom-right' | 'bottom-left';
    bottom_px: number;
    right_px: number;
    launcher_size_px: number;
    width_px: number;
    height_px: number;
}

interface ResponsiveConfigSchema {
    mobile: ResponsiveDeviceConfig;
    laptop: ResponsiveDeviceConfig;
    desktop: ResponsiveDeviceConfig;
}

interface ThemeConfig {
    primary_color: string;
    header_color: string;
    background_color: string;
    text_color: string;
    title_color: string;
    bot_msg_color: string;
    bot_msg_text_color: string;
    booking_link: string;
    link_color: string;
    responsive: ResponsiveConfigSchema;
}

interface ClientConfigState extends ThemeConfig {
    bot_name: string;
    welcome_message: string;
    logo_url: string;
    is_active: boolean;
}

interface InitialConfigProps {
    theme?: Partial<ThemeConfig>;
    bot_name?: string;
    welcome_message?: string;
    logo_url?: string;
    is_active?: boolean;
    // Fallback top-level properties from legacy data
    primary_color?: string;
    header_color?: string;
    background_color?: string;
    text_color?: string;
    title_color?: string;
    bot_msg_color?: string;
    bot_msg_text_color?: string;
    booking_link?: string;
    link_color?: string;
}

export function ClientConfigForm({ clientId, initialConfig }: { clientId: string, initialConfig: InitialConfigProps }) {
    // Flatten theme if it exists, otherwise use top-level or defaults
    const [config, setConfig] = useState<ClientConfigState>(() => {
        const theme = initialConfig.theme || {}
        const responsive = theme.responsive || {} as Partial<ResponsiveConfigSchema>

        // Helper to safely get responsive defaults
        const getResponsiveDefault = (device: 'mobile' | 'laptop' | 'desktop', key: keyof ResponsiveDeviceConfig, fallback: number | string) => {
            const deviceConfig = responsive[device] as Partial<ResponsiveDeviceConfig> | undefined;
            return deviceConfig?.[key] ?? fallback;
        }

        return {
            bot_name: initialConfig.bot_name || 'Support Bot',
            welcome_message: initialConfig.welcome_message || 'Hello! How can I help you?',
            logo_url: initialConfig.logo_url || '',
            is_active: initialConfig.is_active ?? true,

            primary_color: theme.primary_color || initialConfig.primary_color || '#000000',
            header_color: theme.header_color || initialConfig.header_color || '#000000',
            background_color: theme.background_color || initialConfig.background_color || '#ffffff',
            text_color: theme.text_color || initialConfig.text_color || '#000000',
            title_color: theme.title_color || initialConfig.title_color || '#ffffff',
            bot_msg_color: theme.bot_msg_color || initialConfig.bot_msg_color || '#f3f4f6',
            bot_msg_text_color: theme.bot_msg_text_color || initialConfig.bot_msg_text_color || '#000000',
            booking_link: theme.booking_link || initialConfig.booking_link || '',
            link_color: theme.link_color || initialConfig.link_color || '#000000',

            // Responsive defaults
            responsive: {
                mobile: {
                    position: (getResponsiveDefault('mobile', 'position', 'bottom-right') as 'bottom-right' | 'bottom-left'),
                    bottom_px: Number(getResponsiveDefault('mobile', 'bottom_px', 20)),
                    right_px: Number(getResponsiveDefault('mobile', 'right_px', 20)),
                    launcher_size_px: Number(getResponsiveDefault('mobile', 'launcher_size_px', 50)),
                    width_px: Number(getResponsiveDefault('mobile', 'width_px', 260)),
                    height_px: Number(getResponsiveDefault('mobile', 'height_px', 450)),
                },
                laptop: {
                    position: (getResponsiveDefault('laptop', 'position', 'bottom-right') as 'bottom-right' | 'bottom-left'),
                    bottom_px: Number(getResponsiveDefault('laptop', 'bottom_px', 30)),
                    right_px: Number(getResponsiveDefault('laptop', 'right_px', 30)),
                    launcher_size_px: Number(getResponsiveDefault('laptop', 'launcher_size_px', 60)),
                    width_px: Number(getResponsiveDefault('laptop', 'width_px', 350)),
                    height_px: Number(getResponsiveDefault('laptop', 'height_px', 500)),
                },
                desktop: {
                    position: (getResponsiveDefault('desktop', 'position', 'bottom-right') as 'bottom-right' | 'bottom-left'),
                    bottom_px: Number(getResponsiveDefault('desktop', 'bottom_px', 40)),
                    right_px: Number(getResponsiveDefault('desktop', 'right_px', 40)),
                    launcher_size_px: Number(getResponsiveDefault('desktop', 'launcher_size_px', 70)),
                    width_px: Number(getResponsiveDefault('desktop', 'width_px', 350)),
                    height_px: Number(getResponsiveDefault('desktop', 'height_px', 500)),
                }
            }
        }
    })

    // Separate state for the preview
    const [previewConfig, setPreviewConfig] = useState<ClientConfigState>(config)
    const [loading, setLoading] = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [activeTab, setActiveTab] = useState<'mobile' | 'laptop' | 'desktop'>('desktop')
    const [copied, setCopied] = useState(false)

    // Helper for updating nested responsive config
    const handleResponsiveChange = (device: 'mobile' | 'laptop' | 'desktop', key: keyof ResponsiveDeviceConfig, value: number | string) => {
        setConfig((prev) => ({
            ...prev,
            responsive: {
                ...prev.responsive,
                [device]: {
                    ...prev.responsive[device],
                    [key]: value
                }
            }
        }))
    }

    const handleChange = <K extends keyof ClientConfigState>(key: K, value: ClientConfigState[K]) => {
        setConfig((prev) => ({ ...prev, [key]: value }))
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return
        }
        const file = e.target.files[0]
        setUploadingLogo(true)

        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `${clientId}-${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            // Ensure bucket exists or handled via SQL policy
            const { error: uploadError } = await supabase.storage
                .from('brand_assets')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            const { data } = supabase.storage.from('brand_assets').getPublicUrl(filePath)

            handleChange('logo_url', data.publicUrl)
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            alert('Error uploading logo: ' + msg + ". Make sure you have created the 'brand_assets' bucket in Supabase.")
        } finally {
            setUploadingLogo(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData()
        // Top level colors
        formData.append('primary_color', config.primary_color)
        formData.append('header_color', config.header_color)
        formData.append('background_color', config.background_color)
        formData.append('text_color', config.text_color)
        formData.append('title_color', config.title_color)
        formData.append('bot_msg_color', config.bot_msg_color)
        formData.append('bot_msg_text_color', config.bot_msg_text_color)
        formData.append('booking_link', config.booking_link)
        formData.append('link_color', config.link_color)

        // Serialize responsive config
        formData.append('responsive', JSON.stringify(config.responsive))

        formData.append('bot_name', config.bot_name)
        formData.append('welcome_message', config.welcome_message)
        formData.append('logo_url', config.logo_url)

        if (config.is_active) formData.append('is_active', 'on')

        const result = await updateClientConfig(clientId, formData)
        setLoading(false)
        if (result.error) {
            alert('Error updating: ' + result.error)
        } else {
            setPreviewConfig(config)
        }
    }

    const handleReset = () => {
        if (!confirm('Are you sure you want to reset all colors to default?')) return

        setConfig((prev) => ({
            ...prev,
            primary_color: '#000000',
            header_color: '#000000',
            background_color: '#ffffff',
            text_color: '#000000',
            title_color: '#ffffff',
            bot_msg_color: '#f3f4f6',
            bot_msg_text_color: '#000000',
            booking_link: '',
            link_color: '#000000',
            responsive: {
                mobile: {
                    position: 'bottom-right',
                    bottom_px: 20,
                    right_px: 20,
                    launcher_size_px: 50,
                    width_px: 260,
                    height_px: 450,
                },
                laptop: {
                    position: 'bottom-right',
                    bottom_px: 30,
                    right_px: 30,
                    launcher_size_px: 60,
                    width_px: 350,
                    height_px: 500,
                },
                desktop: {
                    position: 'bottom-right',
                    bottom_px: 40,
                    right_px: 40,
                    launcher_size_px: 70,
                    width_px: 350,
                    height_px: 500,
                }
            }
        }))
    }

    const [origin, setOrigin] = useState('')

    useEffect(() => {
        setOrigin(window.location.origin)
    }, [])

    const snippet = `<script src="${origin || 'https://your-domain.com'}/widget.js?id=${clientId}"></script>`

    const copyToClipboard = () => {
        navigator.clipboard.writeText(snippet)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Settings Column */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance & Settings</CardTitle>
                        <CardDescription>Customize how the widget looks for this client.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bot_name">Bot Name</Label>
                            <Input
                                id="bot_name"
                                value={config.bot_name}
                                onChange={(e) => handleChange('bot_name', e.target.value)}
                            />
                        </div>

                        {/* Logo Upload */}
                        <div className="space-y-2">
                            <Label>Brand Logo</Label>
                            <div className="flex items-center space-x-4">
                                {config.logo_url && (
                                    <div className="relative h-12 w-12 overflow-hidden rounded-full border">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={config.logo_url} alt="Logo" className="h-full w-full object-cover" />
                                    </div>
                                )}
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Input id="logo" type="file" onChange={handleLogoUpload} disabled={uploadingLogo} accept="image/*" />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">Upload a square image for best results.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="welcome_message">Welcome Message</Label>
                            <Input
                                id="welcome_message"
                                value={config.welcome_message}
                                onChange={(e) => handleChange('welcome_message', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="booking_link">Booking Calendar Link</Label>
                            <Input
                                id="booking_link"
                                value={config.booking_link}
                                onChange={(e) => handleChange('booking_link', e.target.value)}
                                placeholder="https://cal.com/..."
                            />
                        </div>

                        {/* Colors Section */}
                        <div className="grid grid-cols-2 gap-4 border-b pb-4">
                            <div className="space-y-2">
                                <Label>Primary Color</Label>
                                <div className="flex items-center space-x-2">
                                    <input type="color" value={config.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)} className="h-9 w-9 cursor-pointer rounded border p-0 overflow-hidden" />
                                    <Input value={config.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)} className="font-mono text-xs" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Header Color</Label>
                                <div className="flex items-center space-x-2">
                                    <input type="color" value={config.header_color} onChange={(e) => handleChange('header_color', e.target.value)} className="h-9 w-9 cursor-pointer rounded border p-0 overflow-hidden" />
                                    <Input value={config.header_color} onChange={(e) => handleChange('header_color', e.target.value)} className="font-mono text-xs" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Background Color</Label>
                                <div className="flex items-center space-x-2">
                                    <input type="color" value={config.background_color} onChange={(e) => handleChange('background_color', e.target.value)} className="h-9 w-9 cursor-pointer rounded border p-0 overflow-hidden" />
                                    <Input value={config.background_color} onChange={(e) => handleChange('background_color', e.target.value)} className="font-mono text-xs" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Bot Message Background</Label>
                                <div className="flex items-center space-x-2">
                                    <input type="color" value={config.bot_msg_color} onChange={(e) => handleChange('bot_msg_color', e.target.value)} className="h-9 w-9 cursor-pointer rounded border p-0 overflow-hidden" />
                                    <Input value={config.bot_msg_color} onChange={(e) => handleChange('bot_msg_color', e.target.value)} className="font-mono text-xs" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Bot Message Text</Label>
                                <div className="flex items-center space-x-2">
                                    <input type="color" value={config.bot_msg_text_color} onChange={(e) => handleChange('bot_msg_text_color', e.target.value)} className="h-9 w-9 cursor-pointer rounded border p-0 overflow-hidden" />
                                    <Input value={config.bot_msg_text_color} onChange={(e) => handleChange('bot_msg_text_color', e.target.value)} className="font-mono text-xs" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Text Color</Label>
                                <div className="flex items-center space-x-2">
                                    <input type="color" value={config.text_color} onChange={(e) => handleChange('text_color', e.target.value)} className="h-9 w-9 cursor-pointer rounded border p-0 overflow-hidden" />
                                    <Input value={config.text_color} onChange={(e) => handleChange('text_color', e.target.value)} className="font-mono text-xs" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Link Color</Label>
                                <div className="flex items-center space-x-2">
                                    <input type="color" value={config.link_color} onChange={(e) => handleChange('link_color', e.target.value)} className="h-9 w-9 cursor-pointer rounded border p-0 overflow-hidden" />
                                    <Input value={config.link_color} onChange={(e) => handleChange('link_color', e.target.value)} className="font-mono text-xs" />
                                </div>
                            </div>
                        </div>

                        {/* Responsive Settings Tabs */}
                        <div className="space-y-2 pt-2">
                            <Label>Responsive Configuration</Label>
                            <Tabs
                                defaultValue="desktop"
                                className="w-full"
                                value={activeTab}
                                onValueChange={(value) => setActiveTab(value as 'mobile' | 'laptop' | 'desktop')}
                            >
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="mobile">Mobile</TabsTrigger>
                                    <TabsTrigger value="laptop">Laptop</TabsTrigger>
                                    <TabsTrigger value="desktop">Desktop</TabsTrigger>
                                </TabsList>

                                {(['mobile', 'laptop', 'desktop'] as const).map((device) => (
                                    <TabsContent key={device} value={device} className="space-y-4 pt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Bottom Spacing (px)</Label>
                                                <Input type="number" value={config.responsive[device].bottom_px} onChange={(e) => handleResponsiveChange(device, 'bottom_px', parseInt(e.target.value))} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Right Spacing (px)</Label>
                                                <Input type="number" value={config.responsive[device].right_px} onChange={(e) => handleResponsiveChange(device, 'right_px', parseInt(e.target.value))} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Widget Width (px)</Label>
                                                <Input type="number" value={config.responsive[device].width_px} onChange={(e) => handleResponsiveChange(device, 'width_px', parseInt(e.target.value))} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Widget Height (px)</Label>
                                                <Input type="number" value={config.responsive[device].height_px} onChange={(e) => handleResponsiveChange(device, 'height_px', parseInt(e.target.value))} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Launcher Icon Size (px)</Label>
                                            <Input type="number" value={config.responsive[device].launcher_size_px} onChange={(e) => handleResponsiveChange(device, 'launcher_size_px', parseInt(e.target.value))} />
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={config.is_active}
                                onChange={(e) => handleChange('is_active', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="is_active">Widget Active</Label>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Installation Snippet</CardTitle>
                        <CardDescription>Paste this code into the body of the client&apos;s website.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="relative">
                            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-50">
                                <code>{snippet}</code>
                            </pre>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full flex items-center justify-center gap-2"
                            onClick={copyToClipboard}
                        >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            {copied ? "Copied!" : "Copy Snippet"}
                        </Button>
                    </CardContent>
                </Card>

                <div className="flex space-x-4">
                    <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleReset} className="flex-1">
                        Reset Defaults
                    </Button>
                </div>
            </form>

            {/* Preview Column */}
            <div className="relative min-h-[600px] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50">

                {/* Simulated Website Content */}
                <div className="absolute inset-0 p-8 opacity-10 pointer-events-none select-none flex flex-col gap-4">
                    <div className="h-8 w-1/3 bg-gray-400 rounded"></div>
                    <div className="h-4 w-full bg-gray-400 rounded"></div>
                    <div className="h-4 w-full bg-gray-400 rounded"></div>
                    <div className="h-4 w-2/3 bg-gray-400 rounded"></div>
                    <div className="mt-8 h-32 w-full bg-gray-300 rounded-lg"></div>
                </div>

                {/* Visual Cue for Preview Area */}
                <div className="absolute top-0 right-0 p-2 text-xs text-gray-400 font-mono">
                    Preview: {activeTab}
                </div>

                {/* The Widget Preview */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                    <div className="absolute inset-0 pointer-events-auto">
                        <ChatWidget
                            clientId={clientId}
                            forcedDevice={activeTab} // Force the preview to use the currently selected tab configuration
                            theme={{
                                primary_color: previewConfig.primary_color,
                                header_color: previewConfig.header_color,
                                background_color: previewConfig.background_color,
                                text_color: previewConfig.text_color,
                                title_color: previewConfig.title_color,
                                bot_msg_color: previewConfig.bot_msg_color,
                                bot_msg_text_color: previewConfig.bot_msg_text_color,
                                booking_link: previewConfig.booking_link,
                                link_color: previewConfig.link_color,
                                responsive: previewConfig.responsive,
                            }}
                            botName={previewConfig.bot_name}
                            welcomeMessage={previewConfig.welcome_message}
                            logoUrl={previewConfig.logo_url} // Pass logo URL
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
