import { useState, useEffect } from 'react';

export function DebugSuppliersPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching from: http://localhost:3000/api/v1/suppliers');

      const response = await fetch('http://localhost:3000/api/v1/suppliers?page=1&limit=10', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const json = await response.json();
      console.log('Response data:', json);

      setData(json);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Suppliers Page</h1>

      <button
        onClick={fetchData}
        className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
      >
        Reload Data
      </button>

      {loading && <div>Loading...</div>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Raw Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>

          {data.success && data.data && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-2">Suppliers Count: {data.data.total}</h2>
              <h3 className="text-lg font-semibold mb-2">Suppliers List:</h3>
              {data.data.data && data.data.data.map((supplier: any) => (
                <div key={supplier.id} className="bg-white border p-4 mb-2 rounded">
                  <div><strong>Code:</strong> {supplier.code}</div>
                  <div><strong>Name:</strong> {supplier.name}</div>
                  <div><strong>Email:</strong> {supplier.email || 'N/A'}</div>
                  <div><strong>Status:</strong> {supplier.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
