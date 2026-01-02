'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { updateClientConfig } from '../../client-actions'
import { ChatWidget } from '@/components/chat-widget'
import { PremiumAlertModal } from '@/components/ui/premium-alert-modal'
import { Loader2, Save, Copy, Check, Trash2, FileText, Plus, Edit2, File, CloudUpload } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from 'react-dropzone'
import { getKbFilesWithStatus, type KbFileStatus } from './get-kb-status'
import { deleteKbEmbeddings } from './delete-kb-action'
import { Badge } from '@/components/ui/badge'

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
    ghl_inbound_webhook: string;
}

interface InitialConfigProps {
    theme?: Partial<ThemeConfig>;
    bot_name?: string;
    welcome_message?: string;
    logo_url?: string;
    is_active?: boolean;
    ghl_inbound_webhook?: string;
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
            ghl_inbound_webhook: initialConfig.ghl_inbound_webhook || '',

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
    const [kbFiles, setKbFiles] = useState<KbFileStatus[]>([])
    const [uploadingKb, setUploadingKb] = useState(false)
    const [training, setTraining] = useState(false)

    // Editor State
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [editingFile, setEditingFile] = useState<{ name: string; content: string; isNew: boolean }>({ name: '', content: '', isNew: true })
    const [savingFile, setSavingFile] = useState(false)

    // Premium Alert State
    const [alertState, setAlertState] = useState<{
        open: boolean;
        title: string;
        description: string;
        variant: 'default' | 'destructive' | 'success' | 'warning';
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
    }>({
        open: false,
        title: '',
        description: '',
        variant: 'default'
    })

    const showAlert = (title: string, description: string, variant: 'default' | 'destructive' | 'success' | 'warning' = 'default') => {
        setAlertState({
            open: true,
            title,
            description,
            variant,
            onConfirm: undefined,
            confirmText: 'Okay'
        })
    }

    const showConfirm = (title: string, description: string, onConfirm: () => void, variant: 'default' | 'destructive' | 'success' | 'warning' = 'default', confirmText = 'Continue') => {
        setAlertState({
            open: true,
            title,
            description,
            variant,
            onConfirm,
            confirmText,
            cancelText: 'Cancel'
        })
    }


    // Refetch helper
    const refreshFiles = useCallback(async () => {
        try {
            const files = await getKbFilesWithStatus(clientId)
            setKbFiles(files)
        } catch (error) {
            console.error('Error fetching KB files:', error)
        }
    }, [clientId])

    // Custom onDrop handler for Drag & Drop
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return
        setUploadingKb(true)
        const supabase = createClient()

        const errors: string[] = []

        for (const file of acceptedFiles) {
            try {
                const filePath = `${clientId}/${file.name}`
                const { error } = await supabase.storage.from('knowledge_base').upload(filePath, file, { upsert: true })
                if (error) throw error
            } catch (error: unknown) {
                console.error('Upload error:', error)
                errors.push(file.name)
            }
        }

        await refreshFiles()

        if (errors.length > 0) {
            if (errors.length > 0) {
                showAlert('Upload Failed', `Failed to upload: ${errors.join(', ')}`, 'destructive')
            }
        }

        setUploadingKb(false)
    }, [clientId, refreshFiles])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        }
    })

    // Fetch KB files on mount
    useEffect(() => {
        refreshFiles()
    }, [refreshFiles])

    // Original single file handler (kept for logo/legacy, but KB uses dropzone now)


    const handleKbDelete = (fileName: string) => {
        showConfirm(
            'Delete File?',
            'This will permanently delete the file and remove its training data from the AI memory. This action cannot be undone.',
            async () => {
                const supabase = createClient()
                try {
                    // 1. Delete text chunks (embeddings) for this file
                    await deleteKbEmbeddings(clientId, fileName)

                    // 2. Delete actual file from storage
                    const { error } = await supabase.storage.from('knowledge_base').remove([`${clientId}/${fileName}`])
                    if (error) throw error

                    await refreshFiles()
                    showAlert('Success', 'File deleted successfully', 'success')
                } catch (error) {
                    showAlert('Delete Failed', (error instanceof Error ? error.message : 'Unknown error'), 'destructive')
                }
            },
            'destructive',
            'Delete File'
        )
    }

    const handleTrainDocs = () => {
        // Smart Sync: Only train files that are NOT TRAINED
        const filesToTrain = kbFiles.filter(f => f.status === 'NOT TRAINED').map(f => f.name)

        if (filesToTrain.length === 0) {
            return showAlert('Up to Date', 'All files are already processed and trained!', 'success')
        }

        showConfirm(
            'Process & Train Knowledge Base',
            `You are about to process ${filesToTrain.length} new/updated file(s). This will update the AI's knowledge.`,
            async () => {
                setTraining(true)
                let successCount = 0;
                let failCount = 0;
                const errors: string[] = [];

                try {
                    // Process sequentially to avoid Vercel timeouts
                    for (let i = 0; i < filesToTrain.length; i++) {
                        const fileName = filesToTrain[i];
                        const progressMsg = `Processing file ${i + 1} of ${filesToTrain.length}: ${fileName}...`;

                        // Optional: You could add a toast or local state here to show specific file progress
                        console.log(progressMsg);

                        try {
                            const res = await fetch('/api/train', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    clientId,
                                    fileNames: [fileName] // Send one by one
                                })
                            })

                            const textResponse = await res.text();
                            let data;
                            try {
                                data = JSON.parse(textResponse);
                            } catch (e) {
                                throw new Error(`Server returned invalid response for ${fileName}: ${textResponse.substring(0, 50)}...`);
                            }

                            if (!res.ok) throw new Error(data.error || 'Training failed')
                            successCount++;
                        } catch (err) {
                            console.error(`Failed to train ${fileName}:`, err);
                            failCount++;
                            errors.push(`${fileName}: ${err instanceof Error ? err.message : String(err)}`);
                        }
                    }

                    await refreshFiles()

                    if (failCount === 0) {
                        showAlert('Training Complete', `Successfully processed all ${successCount} files.`, 'success')
                    } else if (successCount > 0) {
                        showAlert('Partial Success', `Processed ${successCount} files. Failed: ${failCount}. \nErrors: ${errors.join('; ')}`, 'warning')
                    } else {
                        showAlert('Training Failed', `Failed to process any files. \nErrors: ${errors.join('; ')}`, 'destructive')
                    }

                } catch (error) {
                    console.error("Training Exception:", error);
                    showAlert('Training Error', (error instanceof Error ? error.message : 'Unknown error'), 'destructive')
                } finally {
                    setTraining(false)
                }
            },
            'default',
            'Start Processing'
        )
    }

    const openNewNote = () => {
        setEditingFile({ name: '', content: '', isNew: true })
        setIsEditorOpen(true)
    }

    const openEditNote = async (fileName: string) => {
        const supabase = createClient()
        try {
            const { data, error } = await supabase.storage.from('knowledge_base').download(`${clientId}/${fileName}`)
            if (error) throw error
            const text = await data.text()
            setEditingFile({ name: fileName.replace('.txt', ''), content: text, isNew: false })
            setIsEditorOpen(true)
        } catch (error) {

            showAlert('Error', 'Error reading file: ' + (error instanceof Error ? error.message : 'Unknown error'), 'destructive')
        }
    }


    const handleSaveNote = async () => {
        if (!editingFile.name || !editingFile.content) return showAlert('Validation Error', 'File name and content are required.', 'warning')

        setSavingFile(true)
        const supabase = createClient()

        let fileName = editingFile.name
        if (!fileName.endsWith('.txt')) fileName += '.txt'

        try {
            const blob = new Blob([editingFile.content], { type: 'text/plain' })
            const { error } = await supabase.storage.from('knowledge_base').upload(`${clientId}/${fileName}`, blob, { upsert: true })
            if (error) throw error

            // Refresh list
            await refreshFiles()

            setIsEditorOpen(false)
            showAlert('Saved', 'Note saved successfully!', 'success')
        } catch (error) {
            showAlert('Save Failed', (error instanceof Error ? error.message : 'Unknown error'), 'destructive')
        } finally {
            setSavingFile(false)
        }
    }

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
            showAlert('Upload Failed', 'Error uploading logo: ' + msg + ". Make sure you have created the 'brand_assets' bucket in Supabase.", 'destructive')
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
        formData.append('ghl_inbound_webhook', config.ghl_inbound_webhook)

        if (config.is_active) formData.append('is_active', 'on')

        const result = await updateClientConfig(clientId, formData)
        setLoading(false)

        if (result.error) {
            showAlert('Update Failed', result.error, 'destructive')
        } else {
            setPreviewConfig(config)
            showAlert('Success', 'Configuration updated successfully!', 'success')
        }
    }

    const handleReset = () => {
        showConfirm(
            'Reset Colors?',
            'Are you sure you want to reset all colors to their default values? This cannot be undone.',
            () => {
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
                    ghl_inbound_webhook: '',
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
                showAlert('Reset Complete', 'Colors have been reset to default values.', 'success')
            },
            'warning',
            'Reset Colors'
        )
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

    const [settingsTab, setSettingsTab] = useState('general');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Settings Column */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs value={settingsTab} onValueChange={setSettingsTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="positioning">Positioning</TabsTrigger>
                        <TabsTrigger value="credentials">Credentials</TabsTrigger>
                        <TabsTrigger value="knowledge">KB</TabsTrigger>
                        <TabsTrigger value="snippet">Snippet</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6">
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
                                        suppressHydrationWarning
                                        value={config.bot_name}
                                        onChange={(e) => handleChange('bot_name', e.target.value)}
                                        className="transition-all focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    />
                                </div>

                                {/* Logo Upload */}
                                <div className="space-y-2">
                                    <Label>Brand Logo</Label>
                                    <div className="flex items-center space-x-4">
                                        {config.logo_url && (
                                            <div className="relative h-12 w-12 overflow-hidden rounded-full border shadow-sm">
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
                                        suppressHydrationWarning
                                        value={config.welcome_message}
                                        onChange={(e) => handleChange('welcome_message', e.target.value)}
                                    />
                                </div>

                                {/* Colors Section */}
                                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                                    <div className="space-y-2">
                                        <Label>Primary Color</Label>
                                        <div className="flex items-center space-x-2">
                                            <input type="color" suppressHydrationWarning value={config.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)} className="h-9 w-9 cursor-pointer rounded border p-0 overflow-hidden" />
                                            <Input suppressHydrationWarning value={config.primary_color} onChange={(e) => handleChange('primary_color', e.target.value)} className="font-mono text-xs" />
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
                    </TabsContent>

                    <TabsContent value="positioning" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Positioning & Responsiveness</CardTitle>
                                <CardDescription>Adjust widget size and position for different devices.</CardDescription>
                            </CardHeader>
                            <CardContent>
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
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="credentials" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Client Credentials</CardTitle>
                                <CardDescription>Manage secret links, webhooks, and third-party keys.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="booking_link">Booking Calendar Link (e.g. Cal.com)</Label>
                                    <Input
                                        id="booking_link"
                                        value={config.booking_link}
                                        onChange={(e) => handleChange('booking_link', e.target.value)}
                                        placeholder="https://cal.com/..."
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">Used for the booking integration in the chat.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ghl_inbound_webhook">GoHighLevel Inbound Webhook</Label>
                                    <Input
                                        id="ghl_inbound_webhook"
                                        value={config.ghl_inbound_webhook}
                                        onChange={(e) => handleChange('ghl_inbound_webhook', e.target.value)}
                                        placeholder="https://services.leadconnectorhq.com/hooks/..."
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">If provided, all leads will be forwarded here directly.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="knowledge" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Knowledge Base</CardTitle>
                                <CardDescription>Upload documents for the AI to reference.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Drag & Drop Zone */}
                                <div
                                    {...getRootProps()}
                                    className={`
                                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                                        ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-800 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-900/50'}
                                    `}
                                >
                                    <input {...getInputProps()} />
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                                            {uploadingKb ? <Loader2 className="h-8 w-8 animate-spin" /> : <CloudUpload className="h-8 w-8" />}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">Click to upload or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">PDF, DOC, TXT, MD (max 10MB)</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Text Entry Button */}
                                <div className="flex justify-between items-center pb-2 border-b">
                                    <Label className="text-base">Knowledge Assets</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={openNewNote}
                                        className="transition-all active:scale-95 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/20"
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> Create Text Entry
                                    </Button>
                                </div>

                                {/* File List */}
                                <div className="grid gap-3">
                                    {kbFiles.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-dashed">
                                            <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                                            <p>No knowledge assets yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {kbFiles.map((file) => (
                                                <div key={file.name} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-sm transition-all group">
                                                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                        <div className={`p-2 rounded-md ${file.name.endsWith('.txt') ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-500'}`}>
                                                            {file.name.endsWith('.txt') ? <FileText className="h-4 w-4" /> : <File className="h-4 w-4" />}
                                                        </div>
                                                        <div className="truncate flex flex-col items-start gap-1">
                                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] text-muted-foreground uppercase">{file.name.split('.').pop()} File</p>
                                                                <Badge
                                                                    variant={file.status === 'TRAINED' ? 'default' : 'secondary'}
                                                                    className={`text-[10px] h-5 ${file.status === 'TRAINED'
                                                                        ? 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                                                        : 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                                                        }`}
                                                                >
                                                                    {file.status}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {file.name.endsWith('.txt') && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                type="button"
                                                                onClick={() => openEditNote(file.name)}
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            type="button"
                                                            onClick={() => handleKbDelete(file.name)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {kbFiles.length > 0 && (
                                    <div className="pt-4 border-t">
                                        <Button
                                            type="button"
                                            onClick={handleTrainDocs}
                                            disabled={training}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all active:scale-95"
                                        >
                                            {training ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
                                            {training ? 'Processing & Training Brain...' : 'Process & Train Knowledge Base'}
                                        </Button>
                                        <p className="text-xs text-center text-muted-foreground mt-3">
                                            This extracts text from all your files and updates the AI&apos;s long-term memory.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Editor Dialog */}
                    <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{editingFile.isNew ? 'New Knowledge Note' : 'Edit Note'}</DialogTitle>
                                <DialogDescription>Create text content for the AI to learn from.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="filename">File Name</Label>
                                    <Input
                                        id="filename"
                                        value={editingFile.name}
                                        onChange={(e) => setEditingFile({ ...editingFile, name: e.target.value })}
                                        placeholder="e.g. pricing-2024"
                                        disabled={!editingFile.isNew} // Lock name for editing to avoid duplicates/confusion
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="content">Content</Label>
                                    <Textarea
                                        id="content"
                                        value={editingFile.content}
                                        onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
                                        className="h-[300px] font-mono text-sm"
                                        placeholder="Type your knowledge base content here..."
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
                                <Button onClick={handleSaveNote} disabled={savingFile}>
                                    {savingFile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Note
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <TabsContent value="snippet" className="space-y-6">
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
                                    className="w-full flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                                    onClick={copyToClipboard}
                                >
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copied ? "Copied!" : "Copy Snippet"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>



                <div className="flex space-x-4">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleReset}
                        className="flex-1 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                    >
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
            {/* Premium Alert Modal */}
            <PremiumAlertModal
                open={alertState.open}
                onOpenChange={(open) => setAlertState(prev => ({ ...prev, open }))}
                title={alertState.title}
                description={alertState.description}
                variant={alertState.variant}
                onConfirm={alertState.onConfirm}
                confirmText={alertState.confirmText}
                cancelText={alertState.cancelText}
            />
        </div>
    )
}
