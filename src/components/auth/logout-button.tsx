"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { signOut } from "@/services/auth-service";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ variant = 'ghost', ...props }: ButtonProps) {
    const router = useRouter();

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };
    
    return (
        <Button variant={variant} onClick={handleLogout} {...props}>
            <LogOut className="mr-2 h-4 w-4" />
            Logg ut
        </Button>
    )
}
