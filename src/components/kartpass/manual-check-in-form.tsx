
"use client";

import { useState } from 'react';
import type { Driver } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Check } from 'lucide-react';

interface ManualCheckInFormProps {
  drivers: Driver[];
  onDriverSelect: (driver: Driver) => void;
  closeDialog: () => void;
}

export function ManualCheckInForm({ drivers, onDriverSelect, closeDialog }: ManualCheckInFormProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDrivers = searchQuery
    ? drivers.filter(driver => 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (driver.rfid && driver.rfid.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSelect = (driver: Driver) => {
    onDriverSelect(driver);
    closeDialog();
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Søk etter navn, eller RFID..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
      />
      <ScrollArea className="h-[40vh] border rounded-md">
        {filteredDrivers.length > 0 ? (
          <div className="p-2">
            {filteredDrivers.map(driver => (
              <div key={driver.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-sm text-muted-foreground">{driver.club}</p>
                    </div>
                </div>
                <Button size="sm" onClick={() => handleSelect(driver)}>
                  <Check className="mr-2 h-4 w-4" />
                  Velg
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-center text-muted-foreground">
            {searchQuery ? 'Ingen førere funnet.' : 'Skriv i søkefeltet for å finne førere.'}
          </p>
        )}
      </ScrollArea>
    </div>
  );
}
