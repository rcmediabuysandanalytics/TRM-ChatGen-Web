'use client'

import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertCircle, Trash2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PremiumAlertModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'destructive' | 'success' | 'warning'
    onConfirm?: () => void
}

export function PremiumAlertModal({
    open,
    onOpenChange,
    title,
    description,
    confirmText = 'Continue',
    cancelText = 'Cancel',
    variant = 'default',
    onConfirm
}: PremiumAlertModalProps) {
    const isAlert = !onConfirm

    const getIcon = () => {
        switch (variant) {
            case 'destructive': return <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            case 'success': return <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            case 'warning': return <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            default: return <Info className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        }
    }

    const getBgColor = () => {
        switch (variant) {
            case 'destructive': return 'bg-red-100 dark:bg-red-900/30'
            case 'success': return 'bg-green-100 dark:bg-green-900/30'
            case 'warning': return 'bg-amber-100 dark:bg-amber-900/30'
            default: return 'bg-indigo-100 dark:bg-indigo-900/30'
        }
    }

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <AnimatePresence>
                {open && (
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
                                    className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-slate-950 dark:border-slate-800"
                                >
                                    <div className="p-6">
                                        <div className="flex flex-col items-center gap-4 text-center">
                                            <div className={cn("rounded-full p-3", getBgColor())}>
                                                {getIcon()}
                                            </div>
                                            <div className="space-y-2">
                                                <Dialog.Title className="text-xl font-semibold tracking-tight">
                                                    {title}
                                                </Dialog.Title>
                                                <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
                                                    {description}
                                                </Dialog.Description>
                                            </div>
                                        </div>
                                        <div className="mt-8 flex gap-3 justify-center">
                                            {!isAlert && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => onOpenChange(false)}
                                                    className="flex-1 rounded-xl transition-transform active:scale-95"
                                                >
                                                    {cancelText}
                                                </Button>
                                            )}
                                            <Button
                                                variant={variant === 'destructive' ? 'destructive' : 'default'}
                                                onClick={() => {
                                                    onConfirm?.()
                                                    onOpenChange(false)
                                                }}
                                                className={cn(
                                                    "flex-1 rounded-xl shadow-md transition-all active:scale-95",
                                                    variant === 'default' && "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                                                )}
                                            >
                                                {confirmText}
                                            </Button>
                                        </div>
                                    </div>
                                    <Dialog.Close asChild>
                                        <button
                                            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-500 dark:ring-offset-slate-950 dark:focus:ring-slate-300 dark:data-[state=open]:bg-slate-800 dark:data-[state=open]:text-slate-400"
                                        >
                                            <X className="h-4 w-4" />
                                            <span className="sr-only">Close</span>
                                        </button>
                                    </Dialog.Close>
                                </motion.div>
                            </Dialog.Content>
                        </div>
                    </Dialog.Portal>
                )}
            </AnimatePresence>
        </Dialog.Root>
    )
}
