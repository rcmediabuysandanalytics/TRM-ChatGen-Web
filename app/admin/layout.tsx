import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserNav } from "@/components/admin/user-nav";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Optional: Check if user has admin role in profiles table
    // For now, assuming anyone who can login is an admin or we check in the page
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        // Allow them to exist if they are just a viewer? 
        // For now, strict admin only.
        // return redirect("/unauthorized"); 
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 flex">
                        <a className="mr-6 flex items-center space-x-2" href="/admin">
                            <img src="/trm-logo.png" alt="TRM Chat Generator" className="h-10 w-auto" />
                            <span className="font-bold sm:inline-block hidden">
                                TRM Chat Generator
                            </span>
                        </a>
                    </div>
                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                        <div className="w-full flex-1 md:w-auto md:flex-none">
                        </div>
                        <nav className="flex items-center">
                            <UserNav email={user.email || ''} />
                        </nav>
                    </div>
                </div>
            </header>
            <main className="flex-1 container py-6">{children}</main>
        </div>
    );
}
