// DONE: sorting buttons
// TODO: filtering input, searching through name and summary
// TODO: link to source ELPA
// TODO: link to package URL
// TODO: pagination
// TODO: enable/disable archives, keep melpa stable disabled by default

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  sortingFns,
  type Header,
  type SortDirection,
  type PaginationState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import useLocalStorageState from "use-local-storage-state";
import type { Pkg } from "$data/schema.ts";
import { versionListEqual, versionListLessThan } from "$data/versionList.ts";
import { useState, useMemo, useEffect } from "react";

const columnHelper = createColumnHelper<Pkg>();
const columns = [
  columnHelper.accessor("name", {
    cell: (info) => info.getValue(),
    // Put numbers on top, like the MELPA list
    sortingFn: sortingFns.basic,
  }),
  columnHelper.accessor("summary", {
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("ver", {
    cell: (info) => info.getValue().join("."),
    header: () => "version",
    enableGlobalFilter: false,
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.ver;
      const b = rowB.original.ver;
      return versionListLessThan(a, b) ? -1 : versionListEqual(a, b) ? 0 : 1;
    },
  }),
  columnHelper.accessor("archive", {
    enableGlobalFilter: false,
    cell: (info) => info.getValue(),
  }),
];

function SortIndicator({ status }: { status: SortDirection | false }) {
  if (status === "asc") {
    return <i className="bi bi-chevron-up"></i>;
  } else if (status === "desc") {
    return <i className="bi bi-chevron-down"></i>;
  } else {
    return null;
  }
}

function Header<TData, TValue>({ header }: { header: Header<TData, TValue> }) {
  if (header.isPlaceholder) return null;
  const canSort = header.column.getCanSort();
  return (
    <div
      className={canSort ? "cursor-pointer select-none" : ""}
      onClick={header.column.getToggleSortingHandler()}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <SortIndicator status={header.column.getIsSorted()} />
    </div>
  );
}

function getCellClass(colid: string) {
  if (colid === "archive") {
    // 12ch to accomodate the longest archive id, "melpa-stable". Ideally
    // would be done automatically.
    return "pr-2 w-[12ch]";
  }
  if (colid === "ver") {
    // 13ch to accomodate the longest version number strings: the MELPA style
    // "20230102.1234" strings
    return "pr-2 w-[13ch]";
  }

  return "pr-2";
}

export default function PaginatedTable({
  data,
  pageSize,
}: {
  data: Pkg[];
  pageSize: number;
}) {
  const archives = useMemo(() => {
    const archiveSet = new Set<string>();
    for (const row of data) {
      archiveSet.add(row.archive);
    }
    return [...archiveSet];
  }, [data]);

  const [
    archiveFiltering,
    setArchiveFiltering,
    { removeItem: resetArchiveFiltering },
  ] = useLocalStorageState("archiveFiltering", {
    defaultValue: Object.fromEntries(
      archives.map((archive) => [archive, archive !== "melpa-stable"]),
    ),
  });
  useEffect(() => {
    if (Object.keys(archiveFiltering).length !== archives.length) {
      console.log(
        "localStorage archiveFiltering length mismatch, resetting filtering preferences",
      );
      resetArchiveFiltering();
    }
  }, [archiveFiltering, archives]);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: pageSize,
  } as PaginationState);
  const table = useReactTable({
    data: data,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),

    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableSortingRemoval: false,
    initialState: {
      sorting: [{ id: "name", desc: false }],
    },

    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: { pagination: pagination },

    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
  });
  return (
    <div>
      {import.meta.env.DEV && (import.meta.env.SSR ? "server" : "client")}
      <div>
        <input
          className="w-full border px-2 py-1"
          placeholder="Filter packages by name or summary..."
          onChange={(e) => table.setGlobalFilter(`${e.target.value}`)}
        ></input>
        <div>
          {true ? (
            <div className="flex animate-pulse space-x-2">
              <div className="h-2 w-2 rounded bg-gray-400"></div>
              <div className="h-2 w-8 rounded bg-gray-400"></div>
            </div>
          ) : (
            archives.map((archive) => (
              <label key={archive} className="select-none">
                <input
                  type="checkbox"
                  checked={archiveFiltering[archive]}
                  onChange={(e) => {
                    setArchiveFiltering({
                      ...archiveFiltering,
                      [archive]: e.target.checked,
                    });
                  }}
                  className=""
                ></input>
                {archive}
              </label>
            ))
          )}
        </div>
      </div>
      <table className="mt-2 text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="text-left">
                  <Header header={header} />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={getCellClass(cell.column.id)}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {table.getFooterGroups().map((footerGroup) => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.footer,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </tfoot>
      </table>
    </div>
  );
}
