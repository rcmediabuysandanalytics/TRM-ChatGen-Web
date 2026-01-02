'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Settings, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { deleteClient } from '@/app/admin/delete-client-action'
import { useToast } from '@/hooks/use-toast'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

interface ClientRowActionsProps {
    client: {
        id: string
        name: string
    }
}

export function ClientRowActions({ client }: ClientRowActionsProps) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const handleDelete = async () => {
        if (confirmText !== 'DELETE') return

        setIsDeleting(true)
        try {
            const result = await deleteClient(client.id)
            if (result.error) {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive"
                })
            } else {
                toast({
                    title: "Success",
                    description: "Client deleted successfully",
                    className: "bg-green-600 text-white border-green-700 rounded-xl"
                })
                setIsDeleteOpen(false)
                setConfirmText('')
                // Force a refresh if needed, though server action revalidates
                router.refresh()
            }
        } catch {
            toast({
                title: "Error",
                description: "Failed to process request",
                variant: "destructive"
            })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex justify-end gap-2">
            <Link href={`/admin/client/${client.id}`}>
                <Button variant="ghost" size="sm" className="transition-all duration-300 hover:scale-105 active:scale-95 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage
                </Button>
            </Link>

            <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-300 hover:scale-105 active:scale-95"
                onClick={() => setIsDeleteOpen(true)}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </Button>

            {/* Delete Modal */}
            <Dialog.Root open={isDeleteOpen} onOpenChange={(open) => {
                if (!isDeleting) {
                    setIsDeleteOpen(open)
                    if (!open) setConfirmText('')
                }
            }}>
                <AnimatePresence>
                    {isDeleteOpen && (
                        <Dialog.Portal forceMount>
                            <Dialog.Overlay asChild>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                                />
                            </Dialog.Overlay>
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <Dialog.Content asChild>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
                                        className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-slate-950 dark:border-slate-800"
                                    >
                                        <div className="p-6">
                                            <div className="flex flex-col items-center gap-4 text-center">
                                                <div className="rounded-full p-3 bg-red-100 dark:bg-red-900/30">
                                                    <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Dialog.Title className="text-xl font-semibold tracking-tight">
                                                        Delete Client?
                                                    </Dialog.Title>
                                                    <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
                                                        This action cannot be undone. This will permanently delete <strong>{client.name}</strong> and remove all associated data including chats, leads, and configuration.
                                                    </Dialog.Description>
                                                </div>
                                            </div>

                                            <div className="mt-6 space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-slate-500 uppercase">
                                                        Type &quot;DELETE&quot; to confirm
                                                    </label>
                                                    <Input
                                                        value={confirmText}
                                                        onChange={(e) => setConfirmText(e.target.value)}
                                                        placeholder="DELETE"
                                                        className="text-center font-mono tracking-widest border-red-200 focus-visible:ring-red-500"
                                                    />
                                                </div>

                                                <div className="flex gap-3">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setIsDeleteOpen(false)}
                                                        disabled={isDeleting}
                                                        className="flex-1 rounded-xl"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={handleDelete}
                                                        disabled={confirmText !== 'DELETE' || isDeleting}
                                                        className="flex-1 rounded-xl shadow-md shadow-red-500/20"
                                                    >
                                                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete Client'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Dialog.Content>
                            </div>
                        </Dialog.Portal>
                    )}
                </AnimatePresence>
            </Dialog.Root>
        </div>
    )
}
