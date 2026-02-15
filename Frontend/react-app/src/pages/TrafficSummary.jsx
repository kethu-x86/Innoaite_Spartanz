import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { ENDPOINTS } from '../config';

const TrafficSummary = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const response = await fetch(ENDPOINTS.SUMMARY);
                if (!response.ok) throw new Error('Failed to fetch summary');
                const result = await response.json();
                setSummary(result);
            } catch (error) {
                console.error('Error fetching summary:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
        const interval = setInterval(fetchSummary, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="summary-container">
            <header className="page-header">
                <h2><FileText className="icon" /> Traffic Summary</h2>
            </header>

            <div className="card">
                {loading ? (
                    <div className="status-message info">Loading summary data...</div>
                ) : summary ? (
                    <table className="summary-table">
                        <thead>
                            <tr>
                                <th>Metric</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="cam-id-cell" style={{ color: 'var(--text-muted)' }}>Description</td>
                                <td style={{ whiteSpace: 'pre-wrap' }}>{summary.summary || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td className="cam-id-cell" style={{ color: 'var(--text-muted)' }}>Congestion Index</td>
                                <td className="count-cell" style={{ color: summary.predicted_congestion_index > 5 ? 'var(--danger)' : 'var(--success)' }}>
                                    {summary.predicted_congestion_index !== undefined ? summary.predicted_congestion_index.toFixed(2) : 'N/A'}
                                </td>
                            </tr>
                            <tr>
                                <td className="cam-id-cell" style={{ color: 'var(--text-muted)' }}>SUMO Data</td>
                                <td>
                                    <pre style={{ margin: 0, fontSize: '0.8rem', color: 'var(--accent)' }}>
                                        {JSON.stringify(summary.sumo, null, 2)}
                                    </pre>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <div className="status-message error">
                        No traffic data available.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrafficSummary;
