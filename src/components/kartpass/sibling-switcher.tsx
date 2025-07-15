
"use client";

import type { Driver } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SiblingSwitcherProps {
    siblings: Driver[];
}

export function SiblingSwitcher({ siblings }: SiblingSwitcherProps) {
    const router = useRouter();

    if (siblings.length === 0) {
        return null;
    }

    const handleSwitch = (driverId: string) => {
        router.push(`/driver/${driverId}`);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Bytt Fører
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Velg en annen fører</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {siblings.map(sibling => (
                     <DropdownMenuItem key={sibling.id} onClick={() => handleSwitch(sibling.id)}>
                        {sibling.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
