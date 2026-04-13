import React, { useState, useEffect } from 'react';
import { IconButton } from './components/IconButton'; // Assuming IconButton exists

interface Counter {
  id: string;
  name: string;
  value: number;
}

export const CounterList: React.FC = () => {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCounters = async () => {
      try {
        // Replace with your actual API endpoint
        const response = await fetch('/api/counters');
        if (!response.ok) throw new Error('Failed to fetch counters');
        const data = await response.json();
        setCounters(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadCounters();
  }, []);

  if (loading) return <div className="p-4">Loading counters...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Existing Counters</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="py-2 px-4 text-left">Name</th>
              <th className="py-2 px-4 text-left">Value</th>
              <th className="py-2 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {counters.map((counter) => (
              <tr key={counter.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-4">{counter.name}</td>
                <td className="py-2 px-4">{counter.value}</td>
                <td className="py-2 px-4 text-center">
                  <IconButton
                    label="View"
                    onClick={() => console.log(`Viewing ${counter.id}`)}
                  />
                  <IconButton
                    label="Delete"
                    onClick={() => console.log(`Deleting ${counter.id}`)}
                    variant="danger"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {counters.length === 0 && (
          <p className="p-4 text-center text-gray-500">No counters found.</p>
        )}
      </div>
    </div>
  );
};
