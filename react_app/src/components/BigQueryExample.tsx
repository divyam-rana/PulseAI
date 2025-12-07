import { useNewsletters, useTables } from '@/hooks/useBigQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export function BigQueryExample() {
  const { data: newsletters, isLoading: loadingNewsletters, error: newslettersError } = useNewsletters();
  const { data: tables, isLoading: loadingTables } = useTables();

  if (loadingNewsletters || loadingTables) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (newslettersError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error connecting to backend: {newslettersError.message}
          <br />
          Make sure the backend server is running on http://localhost:3001
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>BigQuery Tables</CardTitle>
          <CardDescription>Available tables in pulseai_main_db</CardDescription>
        </CardHeader>
        <CardContent>
          {tables?.tables && tables.tables.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {tables.tables.map((table) => (
                <li key={table} className="text-sm">{table}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No tables found</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Newsletters Data</CardTitle>
          <CardDescription>
            Showing {newsletters?.count || 0} records from BigQuery
          </CardDescription>
        </CardHeader>
        <CardContent>
          {newsletters?.data && newsletters.data.length > 0 ? (
            <div className="overflow-auto max-h-96">
              <pre className="text-xs bg-muted p-4 rounded">
                {JSON.stringify(newsletters.data.slice(0, 3), null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
