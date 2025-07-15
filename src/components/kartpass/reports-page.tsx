
"use client";

import { useState, useMemo } from 'react';
import type { CheckinHistoryEntry, Driver } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface ReportsPageProps {
    allCheckins: CheckinHistoryEntry[];
    allDrivers: Driver[];
}

export function ReportsPage({ allCheckins, allDrivers }: ReportsPageProps) {
    const availableYears = useMemo(() => {
        const years = new Set(allCheckins.map(c => new Date(c.checkinDate).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [allCheckins]);

    const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] || new Date().getFullYear());

    const filteredCheckins = useMemo(() => {
        return allCheckins.filter(c => new Date(c.checkinDate).getFullYear() === selectedYear);
    }, [allCheckins, selectedYear]);

    const summaryStats = useMemo(() => {
        const trainingCheckins = filteredCheckins.filter(c => c.eventType === 'training').length;
        const raceCheckins = filteredCheckins.filter(c => c.eventType === 'race').length;
        const uniqueDrivers = new Set(filteredCheckins.map(c => c.driverId)).size;
        
        return { trainingCheckins, raceCheckins, uniqueDrivers };
    }, [filteredCheckins]);

    const driverStats = useMemo(() => {
        const stats: Record<string, { name: string; club: string; training: number; races: number; totalPaid: number; }> = {};

        allDrivers.forEach(driver => {
            stats[driver.id] = {
                name: driver.name,
                club: driver.club,
                training: 0,
                races: 0,
                totalPaid: 0,
            }
        });

        filteredCheckins.forEach(checkin => {
            if (stats[checkin.driverId]) {
                if (checkin.eventType === 'training') {
                    stats[checkin.driverId].training += 1;
                } else if (checkin.eventType === 'race') {
                    stats[checkin.driverId].races += 1;
                }
                stats[checkin.driverId].totalPaid += checkin.amountPaid || 0;

            } else if (checkin.driverId.startsWith('onetime_')) {
                // Handle one-time licenses if needed, for now they are ignored in driver-specific stats
            }
        });
        
        return Object.values(stats)
            .filter(s => s.training > 0 || s.races > 0 || s.totalPaid > 0)
            .sort((a,b) => (b.training + b.races) - (a.training + a.races));

    }, [filteredCheckins, allDrivers]);

    const handleExport = () => {
        const headers = ["Navn", "Klubb", "Antall Treninger", "Antall Løp", "Totalt Oppmøte", "Totalt Innbetalt (kr)"];
        const rows = driverStats.map(d => [
            `"${d.name}"`,
            `"${d.club}"`,
            d.training,
            d.races,
            d.training + d.races,
            d.totalPaid,
        ].join(','));
        
        const csvContent = [headers.join(','), ...rows].join('\n');
        
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `rapport-oppmøte-${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Årsrapporter</CardTitle>
                    <CardDescription>
                        Få en oversikt over innsjekkinger for trening og løp. Velg et år for å se statistikk.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-w-xs">
                        <Select
                            value={String(selectedYear)}
                            onValueChange={(val) => setSelectedYear(Number(val))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Velg år..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Treninger</CardTitle>
                        <CardDescription>Antall innsjekkede treningsøkter</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{summaryStats.trainingCheckins}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Løp</CardTitle>
                        <CardDescription>Antall innsjekkede løpsdeltakelser</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{summaryStats.raceCheckins}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Unike Førere</CardTitle>
                        <CardDescription>Antall unike førere med oppmøte</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{summaryStats.uniqueDrivers}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Oppmøtestatistikk per Fører</CardTitle>
                            <CardDescription>Antall treninger og løp for hver fører i {selectedYear}.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={handleExport} disabled={driverStats.length === 0}>
                            <Download className="mr-2 h-4 w-4" />
                            Eksporter til CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Navn</TableHead>
                                    <TableHead>Klubb</TableHead>
                                    <TableHead className="text-right">Treninger</TableHead>
                                    <TableHead className="text-right">Løp</TableHead>
                                    <TableHead className="text-right">Totalt</TableHead>
                                    <TableHead className="text-right">Innbetalt (kr)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {driverStats.length > 0 ? driverStats.map(stat => (
                                    <TableRow key={stat.name}>
                                        <TableCell className="font-medium">{stat.name}</TableCell>
                                        <TableCell>{stat.club}</TableCell>
                                        <TableCell className="text-right">{stat.training}</TableCell>
                                        <TableCell className="text-right">{stat.races}</TableCell>
                                        <TableCell className="text-right font-semibold">{stat.training + stat.races}</TableCell>
                                        <TableCell className="text-right font-semibold">{stat.totalPaid.toLocaleString('nb-NO')},-</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            Ingen data for valgt år.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

        </div>
    );
}
