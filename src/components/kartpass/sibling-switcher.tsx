
"use client";

import type { DriverProfile } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Users, User, Check } from "lucide-react";
import Link from "next/link";

interface SiblingSwitcherProps {
  profile: DriverProfile;
  currentDriverId: string;
}

export function SiblingSwitcher({ profile, currentDriverId }: SiblingSwitcherProps) {
  const currentDriver = profile.drivers.find(d => d.id === currentDriverId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Bytt Fører
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Bytt til profil</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profile.drivers.map((driver) => (
          <Link href={`/driver/${driver.id}`} key={driver.id} passHref>
             <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>{driver.name}</span>
                {driver.id === currentDriverId && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          </Link>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
