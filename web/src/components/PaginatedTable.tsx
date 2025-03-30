// DONE: sorting buttons
// DONE: filtering input, searching through name and summary
// TODO: link to source ELPA
// DONE: link to package URL
// TODO: pagination
// DONE: enable/disable archives, keep melpa stable disabled by default
// DONE: exact matches on top
// TODO: single package pages

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
import clsx from "clsx";

// HACK: a module-level variable that is visible to the sorting predicate. This
// might be the only way to sort better matches before others.
let globalFilterModuleVar = "";

const columnHelper = createColumnHelper<Pkg>();
const columns = [
  columnHelper.accessor("name", {
    cell: (info) => info.getValue(),
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.original.name;
      const b = rowB.original.name;
      if (a === b) {
        return 0;
      }
      // Exact match first
      if (globalFilterModuleVar === a) {
        return -1;
      } else if (globalFilterModuleVar === b) {
        return 1;
      }
      // Prefix match first
      const aStartsWith = a.startsWith(globalFilterModuleVar);
      const bStartsWith = b.startsWith(globalFilterModuleVar);
      if (aStartsWith && !bStartsWith) {
        return -1;
      } else if (bStartsWith && !aStartsWith) {
        return 1;
      }
      // Put numbers on top, like the MELPA list
      return sortingFns.basic(rowA, rowB, columnId);
    },
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
    meta: {
      // 13ch to accomodate the longest version number strings: the MELPA style
      // "20230102.1234" strings
      extraClass: "w-[13ch]",
    },
  }),
  columnHelper.accessor("archive", {
    enableGlobalFilter: false,
    cell: (info) => info.getValue(),
    filterFn: (row, columnId, filterValue) => {
      return filterValue?.includes(row.getValue(columnId));
    },
    meta: {
      extraClass: "w-[12ch]",
    },
  }),
  columnHelper.accessor("downloads", {
    enableGlobalFilter: false,
    cell: (info) => info.getValue() ?? "-",
    sortUndefined: "last",
    meta: {
      extraClass: "w-[14ch]",
      title: "Only available from Melpa",
    },
  }),
  columnHelper.accessor("url", {
    enableGlobalFilter: false,
    cell: (info) => {
      const url = info.getValue();
      if (url === undefined) {
        return "-";
      }
      return (
        <a
          href={info.getValue()}
          target="_blank"
          className={clsx(
            "text-blue-600 hover:underline",
            "block w-[20ch] truncate md:w-[50ch]",
          )}
        >
          {linkDisplay(url)}
        </a>
      );
    },
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
      title={(header.column.columnDef.meta as { title?: string })?.title}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <SortIndicator status={header.column.getIsSorted()} />
    </div>
  );
}

function linkDisplay(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function PaginatedTable({
  data,
  pageSize,
}: {
  data: Pkg[];
  pageSize: number;
}) {
  // Hook up archive filtering state
  const archives = useMemo(() => {
    // FIXME: use provided column faceting features instead of this
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
  // Hook up pagination
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: pageSize,
  } as PaginationState);

  const [globalFilterState, setGlobalFilterState] = useState("");

  // Create the table instance
  const table = useReactTable({
    data: data,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),

    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableSortingRemoval: false,
    initialState: {
      sorting: [{ id: "name", desc: false }],
      columnOrder: ["archive", "name", "summary", "version"],
    },

    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,

    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
    onGlobalFilterChange: setGlobalFilterState,

    state: { pagination, globalFilter: globalFilterState },
  });
  useEffect(() => {
    const archiveColumn = table.getColumn("archive");
    if (archiveColumn === undefined) {
      return;
    }
    archiveColumn.setFilterValue(
      // {a: true, b: false}
      // -> [["a", true], ["b", false]] (entries array for filtering)
      // -> [["a", true]] (only keep entries whose value is truthy)
      // -> ["a"] (only keep keys)
      Object.entries(archiveFiltering)
        .filter(([_k, v]) => v)
        .map(([k, _v]) => k),
    );
  }, [archiveFiltering]);

  return (
    <div>
      <div>
        <input
          className="w-full border px-2 py-1"
          placeholder="Filter packages by name or summary..."
          onChange={(e) => {
            // Synchronize with the external-to-react JS variable
            // This is to expose it to be used in the sorting predicate
            globalFilterModuleVar = `${e.target.value}`;
            setGlobalFilterState(globalFilterModuleVar);
          }}
        ></input>
        <div className="flex flex-wrap gap-2">
          {archives.map((archive) => (
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
          ))}
        </div>
      </div>
      <div className="my-2">
        {globalFilterState === ""
          ? `${table.getPrePaginationRowModel().rows.length} entries`
          : `${table.getPrePaginationRowModel().rows.length} matching entries`}
      </div>
      <table className="mt-2 text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="pr-4 text-left">
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
                <td
                  key={cell.id}
                  className={clsx(
                    "py-1 pr-4",
                    (cell.column.columnDef.meta as { extraClass?: string })
                      ?.extraClass,
                  )}
                >
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
