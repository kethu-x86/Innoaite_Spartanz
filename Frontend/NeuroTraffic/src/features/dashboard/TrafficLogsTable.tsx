import { useQuery } from '@tanstack/react-query';
import { logsApi } from '../../api/services/logs';
import { LogTable } from '../../components/ui/LogTable';
import { Card } from '../../components/ui/Card';

export const TrafficLogsTable = () => {
    const { data: logs, isLoading } = useQuery<Record<string, unknown>[]>({
        queryKey: ['api-logs-traffic'],
        queryFn: async () => (await logsApi.getTrafficLogs(10, 0)) as Record<string, unknown>[],
        refetchInterval: 10000,
    });

    const columns = [
        { header: 'ID', accessorKey: 'id' },
        { header: 'TIMESTAMP', accessorKey: 'timestamp' },
        { header: 'N_Q', accessorKey: 'north_queue' },
        { header: 'S_Q', accessorKey: 'south_queue' },
        { header: 'E_Q', accessorKey: 'east_queue' },
        { header: 'W_Q', accessorKey: 'west_queue' },
    ];

    return (
        <Card title="Traffic Log History (Recent 10)">
            <LogTable data={logs || []} columns={columns} isLoading={isLoading} />
        </Card>
    );
};
