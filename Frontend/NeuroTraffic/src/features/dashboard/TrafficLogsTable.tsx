import { useQuery } from '@tanstack/react-query';
import { logsApi } from '../../api/services/logs';
import { LogTable } from '../../components/ui/LogTable';
import { Card } from '../../components/ui/Card';
import type { TrafficLog } from '../../types/api';

export const TrafficLogsTable = () => {
    const { data: logs, isLoading } = useQuery<TrafficLog[]>({
        queryKey: ['api-logs-traffic-dashboard'],
        queryFn: async () => await logsApi.getTrafficLogs(10, 0),
        refetchInterval: 10000,
    });

    const columns: { header: string; accessorKey: keyof TrafficLog; cell?: (item: TrafficLog) => React.ReactNode }[] = [
        { header: 'ID', accessorKey: 'log_id', cell: (row) => row.log_id.substring(0, 8) },
        { header: 'TIME', accessorKey: 'created_at', cell: (row) => new Date(row.created_at + 'Z').toLocaleTimeString() },
        { header: 'N_D', accessorKey: 'north_density' },
        { header: 'S_D', accessorKey: 'south_density' },
        { header: 'E_D', accessorKey: 'east_density' },
        { header: 'W_D', accessorKey: 'west_density' },
    ];

    return (
        <Card title="Traffic Log History (Recent 10)">
            <LogTable data={logs || []} columns={columns} isLoading={isLoading} />
        </Card>
    );
};
