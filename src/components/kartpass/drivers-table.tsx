
"use client";

import type { Driver, DriverProfile } from "@/lib/types";
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
import { Pencil, Trash2, UserPlus, MoreHorizontal, Users, User } from "lucide-react";
import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface DriversTableProps {
  profiles: DriverProfile[];
  onEdit: (driver: Driver, profile: DriverProfile) => void;
  onDelete: (profile: DriverProfile) => void;
  onAddSibling: (profile: DriverProfile) => void;
}

export function DriversTable({ profiles, onEdit, onDelete, onAddSibling }: DriversTableProps) {
  
  return (
    <ScrollArea className="h-full border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Familie / E-post</TableHead>
            <TableHead>Førere</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => (
            <TableRow key={profile.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.email}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                    {(profile.drivers || []).map(driver => (
                        <div key={driver.id} className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <Link href={`/admin/driver/${profile.id}/${driver.id}`} className="hover:underline text-primary">
                                {driver.name}
                            </Link>
                        </div>
                    ))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onAddSibling(profile)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Legg til søsken
                    </DropdownMenuItem>
                     <DropdownMenuSeparator />
                    {(profile.drivers || []).map(driver => (
                        <DropdownMenuItem key={driver.id} onClick={() => onEdit(driver, profile)}>
                            <Pencil className="mr-2 h-4 w-4" />
                           <span>Rediger {driver.name}</span>
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(profile)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Slett Familie
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
