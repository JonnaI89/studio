"use client";

import type { Race } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface RacesTableProps {
  races: Race[];
  onEdit: (race: Race) => void;
  onDelete: (race: Race) => void;
  onViewSignups: (race: Race) => void;
}

export function RacesTable({ races, onEdit, onDelete, onViewSignups }: RacesTableProps) {
  if (races.length === 0) {
    return (
        <div className="text-center p-8 border rounded-md">
            <p className="font-semibold">Ingen løp funnet</p>
            <p className="text-muted-foreground text-sm">Trykk på "Opprett nytt løp" for å legge til et.</p>
        </div>
    );
  }

  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = format(parseISO(startDate), "dd.MM.yyyy");
    if (endDate && endDate !== startDate) {
      const end = format(parseISO(endDate), "dd.MM.yyyy");
      return `${start} - ${end}`;
    }
    return start;
  };

  return (
    <ScrollArea className="h-[60vh] border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Navn på løp</TableHead>
            <TableHead>Dato</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {races.map((race) => (
            <TableRow key={race.id}>
              <TableCell className="font-medium">{race.name}</TableCell>
              <TableCell>{formatDateRange(race.date, race.endDate)}</TableCell>
              <TableCell>
                <Badge variant={race.status === 'upcoming' ? 'default' : 'secondary'}>
                  {race.status === 'upcoming' ? 'Kommende' : race.status === 'ongoing' ? 'Pågående' : 'Fullført'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Åpne meny</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewSignups(race)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Se Påmeldte
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(race)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Rediger
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(race)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Slett
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
