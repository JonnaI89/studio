"use client";

import type { Driver } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { Badge } from "../ui/badge";

interface DriversTableProps {
  drivers: Driver[];
  onEdit: (driver: Driver) => void;
}

export function DriversTable({ drivers, onEdit }: DriversTableProps) {

  const getLicenseVariant = (status: Driver['licenseStatus']) => {
    switch (status) {
      case 'Gyldig':
        return 'default';
      case 'Utløpt':
        return 'destructive';
      case 'Ingen':
        return 'secondary';
    }
  };

  return (
    <ScrollArea className="h-[60vh] md:h-[500px] border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Navn</TableHead>
            <TableHead>Klubb</TableHead>
            <TableHead>Lisensstatus</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((driver) => (
            <TableRow key={driver.id}>
              <TableCell className="font-medium">{driver.name}</TableCell>
              <TableCell>{driver.club}</TableCell>
              <TableCell>
                 <Badge variant={getLicenseVariant(driver.licenseStatus)}>{driver.licenseStatus}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => onEdit(driver)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rediger
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
