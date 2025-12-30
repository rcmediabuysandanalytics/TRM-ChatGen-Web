import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ClientConfigForm } from "./client-config-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ClientPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { id } = await params;

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Fetch Client & Config
    const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("*, widget_configs(*)")
        .eq("id", id)
        .single();

    if (clientError || !client) {
        return notFound();
    }

    // If config doesn't exist (edge case), use defaults
    const config = client.widget_configs || {
        primary_color: "#000000",
        bot_name: client.name + " Bot",
        welcome_message: "Hello!",
        is_active: true
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Link href="/admin">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                    <p className="text-muted-foreground">
                        Configuration & Preview
                    </p>
                </div>
            </div>

            <ClientConfigForm clientId={client.id} initialConfig={config} />
        </div>
    );
}
