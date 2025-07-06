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
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

interface DriversTableProps {
  drivers: Driver[];
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
}

export function DriversTable({ drivers, onEdit, onDelete }: DriversTableProps) {
  return (
    <ScrollArea className="h-full border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Navn</TableHead>
            <TableHead>Klubb</TableHead>
            <TableHead>Førerlisens</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((driver) => (
            <TableRow key={driver.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/driver/${driver.id}`} className="hover:underline text-primary">
                  {driver.name}
                </Link>
              </TableCell>
              <TableCell>{driver.club}</TableCell>
              <TableCell>
                 {driver.driverLicense || "Mangler"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(driver)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Rediger
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(driver)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Slett
                    </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
