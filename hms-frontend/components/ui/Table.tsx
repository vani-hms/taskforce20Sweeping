import React from "react";

export function Table({
  headers,
  rows,
  emptyLabel = "No records found"
}: {
  headers: string[];
  rows: React.ReactNode[][];
  emptyLabel?: string;
}) {
  if (!rows.length) {
    return <div className="card">{emptyLabel}</div>;
  }
  return (
    <table className="table">
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}>{row.map((cell, cidx) => <td key={cidx}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}
