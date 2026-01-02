'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateClientConfig(clientId: string, formData: FormData) {
    const supabase = await createClient();

    let responsive = {};
    try {
        const responsiveStr = formData.get("responsive") as string;
        if (responsiveStr) {
            responsive = JSON.parse(responsiveStr);
        }
    } catch (e) {
        console.error("Failed to parse responsive config", e);
    }

    const theme = {
        primary_color: formData.get("primary_color") as string,
        header_color: formData.get("header_color") as string,
        background_color: formData.get("background_color") as string,
        text_color: formData.get("text_color") as string,
        title_color: formData.get("title_color") as string,
        bot_msg_color: formData.get("bot_msg_color") as string,
        bot_msg_text_color: formData.get("bot_msg_text_color") as string,
        position: formData.get("position") as string,
        responsive: responsive, // Add responsive data
        booking_link: formData.get("booking_link") as string,
        link_color: formData.get("link_color") as string,
    };

    const botName = formData.get("bot_name") as string;
    const welcomeMessage = formData.get("welcome_message") as string;
    const isActive = formData.get("is_active") === "on";

    const { error } = await supabase
        .from("widget_configs")
        .update({
            theme: theme,
            bot_name: botName,
            welcome_message: welcomeMessage,
            logo_url: formData.get("logo_url") as string, // Save logo URL
            is_active: isActive,
            ghl_inbound_webhook: formData.get("ghl_inbound_webhook") as string,
            updated_at: new Date().toISOString(),
        })
        .eq("client_id", clientId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/admin/client/${clientId}`);
    return { success: true };
}
