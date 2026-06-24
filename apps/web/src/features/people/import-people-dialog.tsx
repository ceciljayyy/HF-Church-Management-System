'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast, showWarningToast } from '@/lib/toast';
import type { ImportPreviewResult, ImportResult } from './people-types';

const fields = [
  { key: '', label: 'Do not import' },
  { key: 'firstName', label: 'First Name' },
  { key: 'middleName', label: 'Middle Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'fullName', label: 'Full Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'familyName', label: 'Family Name' },
  { key: 'classification', label: 'Classification' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'membershipDate', label: 'Membership Date' },
  { key: 'notes', label: 'Notes' },
];

const sampleCsv = [
  'First Name,Last Name,Gender,Phone,Email,Address,Classification,Membership Date,Date of Birth,Department,Notes',
  'Ama,Boateng,Female,0240000001,ama@example.com,Dansoman,Member,2026-06-13,1995-04-02,Choir,Choir member',
].join('\n');

type CsvRow = Record<string, string>;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);

  const headers = rows[0] ?? [];
  const data = rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
  );
  return { headers, data };
}

function defaultMapping(headers: string[]) {
  const aliases: Record<string, string> = {
    'first name': 'firstName',
    firstname: 'firstName',
    'middle name': 'middleName',
    middlename: 'middleName',
    'last name': 'lastName',
    lastname: 'lastName',
    'full name': 'fullName',
    name: 'fullName',
    gender: 'gender',
    'date of birth': 'dateOfBirth',
    dob: 'dateOfBirth',
    phone: 'phone',
    'mobile phone': 'phone',
    'whatsapp number': 'phone',
    'email address': 'email',
    email: 'email',
    'home address': 'address',
    address: 'address',
    'family name': 'familyName',
    'membership status': 'classification',
    'are you a member?': 'classification',
    occupation: 'occupation',
    'membership date': 'membershipDate',
    department: 'department',
    notes: 'notes',
  };

  return Object.fromEntries(headers.map((header) => [header, aliases[header.trim().toLowerCase()] ?? '']));
}

export function ImportPeopleDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  const mappedRows = useMemo(
    () =>
      rows.map((row) => {
        const output: CsvRow = {};
        headers.forEach((header) => {
          const field = mapping[header];
          if (field) output[field] = row[header] ?? '';
        });
        return output;
      }),
    [headers, mapping, rows],
  );

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError('');
    setResult(null);
    setPreview(null);
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      const message = 'Only CSV import is available right now. Export Google Forms responses from Google Sheets as CSV.';
      setError(message);
      showErrorToast(message);
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    if (!parsed.headers.length || !parsed.data.length) {
      const message = 'The CSV file is empty or missing a header row.';
      setError(message);
      showErrorToast(message);
      return;
    }
    setHeaders(parsed.headers);
    setRows(parsed.data);
    setMapping(defaultMapping(parsed.headers));
  }

  async function downloadSample() {
    let content = sampleCsv;
    try {
      const template = await apiClient.request<{ content: string; fileName: string }>('/people/import/template');
      content = template.content;
    } catch {
      showWarningToast('Using local import template because the server template could not be downloaded.');
    }
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'people-import-sample.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function previewRows() {
    setError('');
    setResult(null);
    if (!mappedRows.length) {
      const message = 'Upload a CSV file before importing.';
      setError(message);
      showErrorToast(message);
      return;
    }
    const hasNameMapping = Object.values(mapping).includes('fullName') || (Object.values(mapping).includes('firstName') && Object.values(mapping).includes('lastName'));
    if (!hasNameMapping) {
      const message = 'Map either Full Name or both First Name and Last Name before importing.';
      setError(message);
      showErrorToast(message);
      return;
    }
    setImporting(true);
    try {
      const data = await apiClient.request<ImportPreviewResult>('/people/import/preview', {
        method: 'POST',
        body: JSON.stringify({ rows: mappedRows, fileName }),
      });
      setPreview(data);
      if (data.warnings?.length) data.warnings.forEach(showWarningToast);
      if (data.duplicateRows) showWarningToast('Duplicate records detected. Review actions before confirming.');
      showSuccessToast('Import preview completed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import people.');
      showErrorToast(err, 'Unable to preview import.');
    } finally {
      setImporting(false);
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setImporting(true);
    setResult(null);
    try {
      const data = await apiClient.request<ImportResult>('/people/import/confirm', {
        method: 'POST',
        body: JSON.stringify({ rows: preview.rows }),
      });
      setResult(data);
      showSuccessToast(`Import completed: ${data.created ?? data.imported ?? 0} created, ${data.skipped} skipped, ${data.updated ?? 0} updated.`);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import people.');
      showErrorToast(err, 'Unable to confirm import.');
    } finally {
      setImporting(false);
    }
  }

  function setRowAction(rowNumber: number, selectedAction: 'skip' | 'create' | 'update' | 'importAnyway') {
    setPreview((current) =>
      current
        ? {
            ...current,
            rows: current.rows.map((row) => (row.rowNumber === rowNumber ? { ...row, selectedAction } : row)),
          }
        : current,
    );
  }

  return (
    <Modal
      open={open}
      title="Import Data"
      subtitle="Upload a Google Forms CSV export, preview rows, map columns, and import valid people."
      onClose={onClose}
      className="max-w-5xl"
    >
      <div className="space-y-5">
        {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
        {result ? <p className="text-sm text-green">Import completed: {result.created ?? result.imported ?? 0} created, {result.skipped} skipped, {result.updated ?? 0} updated.</p> : null}

        <div className="rounded-lg border border-dashed border-border bg-surface/60 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Upload CSV</p>
              <p className="mt-1 text-xs text-secondary">Use CSV exported from Google Sheets or Google Forms responses.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void downloadSample()} className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-primary transition hover:bg-hover">
                Download Sample CSV
              </button>
              <label className="cursor-pointer rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90">
                Choose File
                <input className="hidden" type="file" accept=".csv,.xlsx" onChange={onFileChange} />
              </label>
            </div>
          </div>
        </div>

        {headers.length ? (
          <section className="rounded-lg border border-border bg-surface/60 p-4">
            <h4 className="mb-4 text-sm font-semibold text-primary">Column Mapping</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {headers.map((header) => (
                <label key={header} className="grid gap-2 text-sm text-secondary">
                  <span>{header}</span>
                  <select
                    className="rounded-lg border border-border bg-card px-3 py-2.5 text-primary outline-none focus:border-lime"
                    value={mapping[header] ?? ''}
                    onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))}
                  >
                    {fields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </section>
        ) : null}

        {rows.length ? (
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-primary">Preview first 10 rows</h4>
            <DataTable
              columns={headers.slice(0, 6)}
              rows={rows.slice(0, 10).map((row) => headers.slice(0, 6).map((header) => row[header] || '-'))}
            />
          </section>
        ) : null}

        {preview ? (
          <section className="space-y-3">
            <div className="grid gap-3 text-sm sm:grid-cols-5">
              <SummaryItem label="Total rows" value={preview.totalRows} />
              <SummaryItem label="Valid rows" value={preview.validRows} />
              <SummaryItem label="Duplicates" value={preview.duplicateRows} />
              <SummaryItem label="Errors" value={preview.errorRows} />
              <SummaryItem label="Ready" value={preview.readyRows} />
            </div>
            <h4 className="text-sm font-semibold text-primary">Import Review</h4>
            <DataTable
              columns={['Row', 'Incoming name', 'Status', 'Reason', 'Match', 'Field', 'Action']}
              rows={preview.rows.slice(0, 25).map((row) => [
                row.rowNumber,
                row.data ? [row.data.firstName, row.data.lastName].filter(Boolean).join(' ') : '-',
                row.status,
                row.errorMessage ?? row.duplicateReason ?? 'Ready to import',
                row.matchingPersonName ?? '-',
                row.matchingField ?? '-',
                <select
                  key={`action-${row.rowNumber}`}
                  className="rounded-lg border border-border bg-card px-2 py-2 text-sm text-primary outline-none focus:border-lime"
                  value={row.selectedAction}
                  disabled={row.status === 'error'}
                  onChange={(event) => setRowAction(row.rowNumber, event.target.value as any)}
                >
                  <option value="skip">Skip row</option>
                  <option value="update" disabled={!row.matchingPersonId}>Update existing person</option>
                  <option value="importAnyway">Import anyway</option>
                  {row.status === 'ready' ? <option value="create">Create</option> : null}
                </select>,
              ])}
              minWidthClass="min-w-[1050px]"
            />
          </section>
        ) : null}

        {result?.errors?.length ? (
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-primary">Import messages</h4>
            <DataTable
              columns={['Row', 'Message']}
              rows={result.errors.slice(0, 10).map((item) => [item.row, item.message])}
            />
          </section>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">Cancel</button>
          <button type="button" onClick={preview ? confirmImport : previewRows} disabled={importing || !rows.length} className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90 disabled:opacity-60">
            {importing ? 'Working...' : preview ? 'Confirm Import' : 'Preview Import'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-lg font-semibold text-primary">{value}</p>
    </div>
  );
}
