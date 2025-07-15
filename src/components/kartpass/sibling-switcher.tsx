
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, User, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DriverProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SiblingSwitcherProps {
  profile: DriverProfile;
  currentDriverId: string;
  isAdminView?: boolean;
}

export function SiblingSwitcher({ profile, currentDriverId, isAdminView = false }: SiblingSwitcherProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!profile || !profile.drivers || profile.drivers.length <= 1) {
    return null;
  }

  const currentDriver = profile.drivers.find(d => d.id === currentDriverId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <User className="mr-2 h-4 w-4" />
          {currentDriver ? currentDriver.name : "Velg fører"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>Ingen andre førere funnet.</CommandEmpty>
            <CommandGroup>
              {profile.drivers.map((driver) => (
                <CommandItem
                  key={driver.id}
                  value={driver.name}
                  onSelect={() => {
                    const path = isAdminView ? `/admin/driver/${driver.id}` : `/driver/${driver.id}`;
                    router.push(path);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentDriverId === driver.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {driver.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
