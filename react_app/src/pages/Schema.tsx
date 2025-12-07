import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Table, CheckCircle2, XCircle, Share2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const schemas = {
  combined_newsletter: {
    projectId: "pulseai-team3-ba882-fall25",
    datasetId: "pulseai_main_db",
    tableId: "combined_newsletter",
    description: "Aggregated newsletter content across multiple categories",
    columns: [
      {
        name: "tag",
        type: "STRING",
        mode: "NULLABLE",
        description: "Category or topic of the newsletter (e.g., Finance, Tech, Marketing)"
      },
      {
        name: "window_start",
        type: "TIMESTAMP",
        mode: "NULLABLE",
        description: "Start timestamp of the newsletter time window"
      },
      {
        name: "window_end",
        type: "TIMESTAMP",
        mode: "NULLABLE",
        description: "End timestamp of the newsletter time window"
      },
      {
        name: "Newsletter Content",
        type: "STRING",
        mode: "NULLABLE",
        description: "Full text content of the newsletter"
      },
      {
        name: "created_at",
        type: "TIMESTAMP",
        mode: "NULLABLE",
        description: "Timestamp when the record was created"
      }
    ],
    estimatedRows: 18
  },
  arxiv_paper_embeddings: {
    projectId: "pulseai-team3-ba882-fall25",
    datasetId: "pulseai_main_db",
    tableId: "arxiv_paper_embeddings",
    description: "Research papers from arXiv with AI-generated embeddings for semantic search",
    columns: [
      {
        name: "title",
        type: "STRING",
        mode: "NULLABLE",
        description: "Title of the research paper"
      },
      {
        name: "summary",
        type: "STRING",
        mode: "NULLABLE",
        description: "Abstract or summary of the paper"
      },
      {
        name: "pdf_url",
        type: "STRING",
        mode: "NULLABLE",
        description: "URL to the PDF version of the paper"
      },
      {
        name: "published_date",
        type: "TIMESTAMP",
        mode: "NULLABLE",
        description: "Date when the paper was published"
      },
      {
        name: "title_embedding",
        type: "ARRAY<FLOAT64>",
        mode: "NULLABLE",
        description: "Vector embedding of the paper title for semantic search"
      }
    ],
    estimatedRows: 1000
  }
};

export default function Schema() {
  const [selectedTable, setSelectedTable] = useState<keyof typeof schemas>("combined_newsletter");
  
  const schemaInfo = schemas[selectedTable];

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `PulseAI Schema: ${schemaInfo.tableId}`,
        text: `View the database schema for ${schemaInfo.tableId}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 lg:px-8 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Page Header with Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl font-bold mb-2 text-gradient">
                📊 Database Schema
              </h1>
              <p className="text-muted-foreground text-lg">
                Explore the structure and metadata of our BigQuery tables
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>

          {/* Table Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Table</CardTitle>
              <CardDescription>Choose a table to view its schema</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTable} onValueChange={(value) => setSelectedTable(value as keyof typeof schemas)}>
                <SelectTrigger className="w-full md:w-[400px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combined_newsletter">
                    Combined Newsletter (Aggregated Content)
                  </SelectItem>
                  <SelectItem value="arxiv_paper_embeddings">
                    Arxiv Paper Embeddings (Research Papers)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                {schemaInfo.description}
              </p>
            </CardContent>
          </Card>

          {/* Table Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Project ID</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schemaInfo.projectId}</div>
                <p className="text-xs text-muted-foreground mt-1">BigQuery Project</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dataset</CardTitle>
                <Table className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schemaInfo.datasetId}</div>
                <p className="text-xs text-muted-foreground mt-1">Data Collection</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Table</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schemaInfo.tableId}</div>
                <p className="text-xs text-muted-foreground mt-1">Newsletter Data</p>
              </CardContent>
            </Card>
          </div>

          {/* Schema Details */}
          <Card>
            <CardHeader>
              <CardTitle>Schema Definition</CardTitle>
              <CardDescription>
                {schemaInfo.columns.length} columns • ~{schemaInfo.estimatedRows} rows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TableUI>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemaInfo.columns.map((column, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium font-mono text-sm">
                        {column.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{column.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {column.mode === "NULLABLE" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {column.mode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {column.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableUI>
            </CardContent>
          </Card>

          {/* SQL Example */}
          <Card>
            <CardHeader>
              <CardTitle>Example Query</CardTitle>
              <CardDescription>Sample SQL to query this table</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
                <code>{`SELECT 
  tag,
  window_start,
  window_end,
  \`Newsletter Content\` as content,
  created_at
FROM \`${schemaInfo.projectId}.${schemaInfo.datasetId}.${schemaInfo.tableId}\`
WHERE tag = 'Tech'
  AND window_end >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
ORDER BY window_end DESC
LIMIT 10;`}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Data Types Reference */}
          <Card>
            <CardHeader>
              <CardTitle>BigQuery Data Types</CardTitle>
              <CardDescription>Understanding the column types used in this schema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5">STRING</Badge>
                <div>
                  <p className="text-sm font-medium">Variable-length character data</p>
                  <p className="text-xs text-muted-foreground">Used for text content like tags and newsletter text</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5">TIMESTAMP</Badge>
                <div>
                  <p className="text-sm font-medium">Absolute point in time with microsecond precision</p>
                  <p className="text-xs text-muted-foreground">Used for date/time tracking (window_start, window_end, created_at)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
